-- FamilyBudget server migration (Round 3 follow-up, 2026-07-25).
--
-- WHY THIS EXISTS
-- FamilyBudget is the Family plan's one complete, self-contained feature on
-- both platforms, but it stored everything in localStorage (web) /
-- AsyncStorage (RN) under the key 'amanah_family_budget'. A "family" budget
-- that never leaves one device is not a family feature - two members on two
-- devices could never see the same numbers. These tables make it genuinely
-- shared.
--
-- FamilyBudget was chosen over Family Dashboard deliberately: the dashboard
-- needs real per-user prayer/Quran/transaction data server-side before most
-- of its sections can be honest (see the 2026-07-25 Family Dashboard honesty
-- fix, which removed Math.random()-fabricated worship stats). FamilyBudget
-- depends on none of that.
--
--
-- ============================================================================
-- READ THIS BEFORE ASSUMING THE RLS HERE IS INCONSISTENT WITH THE REST OF
-- THE PROJECT. IT IS DELIBERATELY DIFFERENT, AND HERE IS WHY.
-- ============================================================================
--
-- Every pre-existing table in this project (app_11941c8fec_subscriptions,
-- _search_history, _email_digest, _notification_preferences,
-- _push_subscriptions) uses the simple, direct pattern:
--
--     using (auth.uid() = user_id)
--
-- That works because each of those rows is owned by exactly one user, and
-- ownership is a column on the row itself. Family data is not like that. A
-- row in app_11941c8fec_family_expenses belongs to a *family*, and whether
-- you may read it depends on whether you are a member of that family - which
-- is a fact stored in a *different* table (app_11941c8fec_family_members).
--
-- The obvious policy would be:
--
--     using (exists (select 1 from app_11941c8fec_family_members m
--                    where m.family_id = family_id and m.user_id = auth.uid()))
--
-- ...and on app_11941c8fec_family_members itself, that policy would query
-- app_11941c8fec_family_members, whose policy would query
-- app_11941c8fec_family_members, and so on. Postgres detects this and fails
-- the query outright with "infinite recursion detected in policy for
-- relation". This is a well-known RLS trap, not a hypothetical.
--
-- The standard fix, used here, is a SECURITY DEFINER helper function. Because
-- it runs as its owner rather than as the calling user, the membership lookup
-- inside it is not itself subject to RLS, so the cycle is broken. The policies
-- below therefore call app_11941c8fec_is_family_member(family_id) instead of
-- inlining the subquery.
--
-- THIS IS THE FIRST USE OF THE SECURITY DEFINER RLS PATTERN IN THIS PROJECT.
-- If you are reading this in a later session and it looks like it contradicts
-- the simpler auth.uid() = user_id policies elsewhere: it does not. Those
-- tables are single-owner and cannot recurse; these are group-owned and
-- would. Do not "simplify" these policies to match the others - doing so
-- reintroduces the recursion and breaks every family query.
--
-- Both helpers set an explicit search_path. That is not decoration: a
-- SECURITY DEFINER function without a pinned search_path can be hijacked by a
-- caller who puts a malicious schema earlier in their own search_path.
-- ============================================================================
--
--
-- DELIBERATELY NOT IN THIS MIGRATION
--   * Real email invites. No email-sending infrastructure exists in this
--     project yet (there is an app_11941c8fec_email_digest table, but nothing
--     that actually sends). Wiring a provider is its own phase. In the
--     meantime families carry a short join_code that a member types in
--     manually - enough to make a genuine two-account shared-budget test
--     possible, which is the whole point of the feature.
--   * Server-side currency conversion. app_11941c8fec_exchange_rates exists
--     and is unused by FamilyBudget, which still uses a hardcoded RATES map
--     client-side. Moving to real rates is a separate follow-up. Until then
--     the client writes both the original amount and a converted amount_base
--     (see the note on the income/expense tables below).


-- NOTE ON ORDERING: the two SECURITY DEFINER RLS helpers described above are
-- defined further down, immediately before the policies that use them, not
-- here. They are `language sql`, and Postgres parses and validates a SQL
-- function's body at CREATE time - so defining them before the tables they
-- query fails with "relation ... does not exist". (The plpgsql trigger
-- functions below do not have this constraint: plpgsql bodies are opaque
-- until runtime.) Do not "tidy" the helpers back up here.


-- ---------------------------------------------------------------------------
-- Families
-- ---------------------------------------------------------------------------

create table if not exists public.app_11941c8fec_families (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'My Family',
  join_code     text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.app_11941c8fec_families is
  'A household. Root of all family budget data. Created by whoever first opens FamilyBudget with a Family-tier subscription.';
comment on column public.app_11941c8fec_families.owner_user_id is
  'The account that created the family. Only the owner may rename it, manage membership, or delete it.';
comment on column public.app_11941c8fec_families.join_code is
  'Short human-typeable code another account enters to join this family. A stopgap standing in for real email invites, which are deferred to a later phase - see the migration header.';

-- Join codes avoid I, L, O, 0 and 1 so they survive being read aloud or
-- copied off a screen by hand. 31^8 ~= 8.5e11, so collisions are negligible;
-- the trigger below still retries rather than trusting that.
create or replace function public.app_11941c8fec_generate_join_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result   text := '';
  i        int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.app_11941c8fec_set_join_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate text;
  attempts  int := 0;
begin
  if new.join_code is not null and new.join_code <> '' then
    return new;
  end if;

  loop
    candidate := public.app_11941c8fec_generate_join_code();
    exit when not exists (
      select 1 from public.app_11941c8fec_families where join_code = candidate
    );
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'could not generate a unique family join code after % attempts', attempts;
    end if;
  end loop;

  new.join_code := candidate;
  return new;
end;
$$;

-- Postgres has no CREATE TRIGGER IF NOT EXISTS, so drop-then-create keeps
-- this migration safely re-runnable.
drop trigger if exists app_11941c8fec_families_set_join_code on public.app_11941c8fec_families;
create trigger app_11941c8fec_families_set_join_code
  before insert on public.app_11941c8fec_families
  for each row execute function public.app_11941c8fec_set_join_code();


-- ---------------------------------------------------------------------------
-- Family members
-- ---------------------------------------------------------------------------
--
-- user_id is NULLABLE on purpose. Today's FamilyBudget "members" tab is a
-- household roster of plain labels - the user types a name and a free-text
-- role ("Father", "Mother", "Son") with no account behind it. Forcing every
-- member to be a real linked account would make all existing local data
-- unmigratable and break that tab until every family member signed up.
--
-- So a row is one of two things:
--   * user_id IS NULL  -> a label only. Appears in the roster, cannot sign in.
--   * user_id IS NOT NULL -> a real account with access to this family's data.
-- A label can later be upgraded to a linked account by setting user_id.
--
-- Note also that member_role and household_role are genuinely different
-- things and must not be merged: member_role is a permission (owner/member),
-- household_role is the pre-existing free-text relationship label. Collapsing
-- them would silently destroy the data users have already entered.

create table if not exists public.app_11941c8fec_family_members (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.app_11941c8fec_families(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  display_name   text not null,
  member_role    text not null default 'member' check (member_role in ('owner', 'member')),
  household_role text,
  joined_at      timestamptz not null default now(),
  unique (family_id, user_id)
);

comment on table public.app_11941c8fec_family_members is
  'Membership of a family. Rows with user_id set are real accounts; rows with user_id null are roster labels only, preserving the pre-migration local behaviour.';
comment on column public.app_11941c8fec_family_members.user_id is
  'The linked account, or NULL for a label-only roster entry. Nullable by design - see the migration header. Postgres allows multiple NULLs under the unique(family_id, user_id) constraint, so label rows never collide.';
comment on column public.app_11941c8fec_family_members.member_role is
  'Permission level: owner or member. NOT the same thing as household_role.';
comment on column public.app_11941c8fec_family_members.household_role is
  'Free-text relationship as entered by the user ("Father", "Mother", ...). This is the pre-existing FamilyMember.role field from the local data shape, kept separate from member_role so no user-entered data is lost.';

create index if not exists app_11941c8fec_family_members_family_idx
  on public.app_11941c8fec_family_members (family_id);
create index if not exists app_11941c8fec_family_members_user_idx
  on public.app_11941c8fec_family_members (user_id);

-- Bootstrap problem: a freshly created family has no members, so
-- app_11941c8fec_is_family_member() is false for its own creator, so the
-- owner could not insert their own membership row through RLS. This trigger
-- creates it as part of the same statement instead.
create or replace function public.app_11941c8fec_add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  select coalesce(nullif(split_part(u.email, '@', 1), ''), 'Owner')
    into v_name
  from auth.users u
  where u.id = new.owner_user_id;

  insert into public.app_11941c8fec_family_members
    (family_id, user_id, display_name, member_role)
  values
    (new.id, new.owner_user_id, coalesce(v_name, 'Owner'), 'owner');

  return new;
end;
$$;

drop trigger if exists app_11941c8fec_families_add_owner on public.app_11941c8fec_families;
create trigger app_11941c8fec_families_add_owner
  after insert on public.app_11941c8fec_families
  for each row execute function public.app_11941c8fec_add_owner_as_member();


-- ---------------------------------------------------------------------------
-- Budget settings (one row per family)
-- ---------------------------------------------------------------------------

create table if not exists public.app_11941c8fec_family_budget_settings (
  family_id      uuid primary key references public.app_11941c8fec_families(id) on delete cascade,
  monthly_budget numeric(14,2) not null default 6200,
  goal_hajj      numeric(14,2) not null default 20000,
  goal_education numeric(14,2) not null default 15000,
  goal_emergency numeric(14,2) not null default 10000,
  goal_savings   numeric(14,2) not null default 30000,
  updated_at     timestamptz not null default now()
);

comment on table public.app_11941c8fec_family_budget_settings is
  'Scalar budget settings per family. Mirrors the monthlyBudget and annualGoals fields of the pre-migration local FamilyBudgetData shape. Defaults match the previous client-side defaults exactly so a migrated family sees no change.';
comment on column public.app_11941c8fec_family_budget_settings.goal_hajj is
  'Annual Hajj savings goal. Fixed columns rather than a flexible key/value table because the client has exactly these four goals hardcoded; revisit if goals become user-definable.';


-- ---------------------------------------------------------------------------
-- Budget categories
-- ---------------------------------------------------------------------------
--
-- Note there is NO `actual` column here, unlike the local shape. Locally,
-- `actual` was a stored running total incremented on every addExpense. That
-- was already drifting from reality: nothing decremented it when an expense
-- was removed, and it accumulated converted (base-currency) values while the
-- expenses themselves kept their original currency. It is now derived from
-- the expense rows instead - see the app_11941c8fec_family_category_spend
-- view at the bottom of this file.

create table if not exists public.app_11941c8fec_family_budget_categories (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.app_11941c8fec_families(id) on delete cascade,
  name      text not null,
  name_ar   text,
  icon      text,
  budgeted  numeric(14,2) not null default 0,
  sort_order int not null default 0,
  unique (family_id, name)
);

comment on table public.app_11941c8fec_family_budget_categories is
  'Per-family spending categories. Seeded client-side from DEFAULT_CATEGORIES on first migration.';
comment on column public.app_11941c8fec_family_budget_categories.name is
  'Category name. Expense rows reference this by name (not by id) to match the pre-migration local shape, hence the unique(family_id, name) constraint that makes that join well-defined.';


-- ---------------------------------------------------------------------------
-- Income and expenses
-- ---------------------------------------------------------------------------
--
-- amount / currency hold exactly what the user entered. amount_base holds the
-- same value converted to the app's base currency (SAR) using the client's
-- hardcoded RATES map, written at insert time. Storing both is a deliberate
-- interim compromise: decision C for this phase was to leave currency
-- conversion client-side and hardcoded, but the derived-spend view still
-- needs a single comparable number to sum. When the real
-- app_11941c8fec_exchange_rates table is wired up (separate follow-up),
-- amount_base becomes server-computed and this comment should be revisited.

create table if not exists public.app_11941c8fec_family_income (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.app_11941c8fec_families(id) on delete cascade,
  source      text not null,
  amount      numeric(14,2) not null,
  currency    text not null default 'USD',
  amount_base numeric(14,2) not null,
  entry_date  date not null default current_date,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.app_11941c8fec_family_income is
  'Family income entries. created_by records which member logged the entry - not present in the pre-migration local shape, but once the budget is genuinely shared "who added this" is immediately useful and is far cheaper to capture now than to backfill.';
comment on column public.app_11941c8fec_family_income.amount_base is
  'amount converted to base currency (SAR) at insert time using the client-side hardcoded rates. See the note above this table.';

create table if not exists public.app_11941c8fec_family_expenses (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.app_11941c8fec_families(id) on delete cascade,
  category    text not null,
  description text not null default '',
  amount      numeric(14,2) not null,
  currency    text not null default 'USD',
  amount_base numeric(14,2) not null,
  entry_date  date not null default current_date,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.app_11941c8fec_family_expenses is
  'Family expense entries. category matches app_11941c8fec_family_budget_categories.name within the same family.';

create index if not exists app_11941c8fec_family_income_family_idx
  on public.app_11941c8fec_family_income (family_id, entry_date desc);
create index if not exists app_11941c8fec_family_expenses_family_idx
  on public.app_11941c8fec_family_expenses (family_id, entry_date desc);
create index if not exists app_11941c8fec_family_expenses_category_idx
  on public.app_11941c8fec_family_expenses (family_id, category);


-- ---------------------------------------------------------------------------
-- Derived per-category spend (replaces the stored `actual` column)
-- ---------------------------------------------------------------------------
--
-- security_invoker = on means this view is evaluated with the *caller's*
-- permissions, so the RLS policies on the underlying tables still apply.
-- Without it a view would run as its owner and quietly bypass RLS, which
-- would let any authenticated user read every family's spending. Requires
-- Postgres 15+; this project is on 17.6.

create or replace view public.app_11941c8fec_family_category_spend
with (security_invoker = on) as
select
  c.family_id,
  c.id                                  as category_id,
  c.name,
  c.name_ar,
  c.icon,
  c.budgeted,
  c.sort_order,
  coalesce(sum(e.amount_base), 0)::numeric(14,2) as actual
from public.app_11941c8fec_family_budget_categories c
left join public.app_11941c8fec_family_expenses e
  on e.family_id = c.family_id
 and e.category  = c.name
group by c.family_id, c.id, c.name, c.name_ar, c.icon, c.budgeted, c.sort_order;

comment on view public.app_11941c8fec_family_category_spend is
  'Categories with their actual spend derived live from expense rows, replacing the stored (and drifting) `actual` field from the pre-migration local shape.';


-- ---------------------------------------------------------------------------
-- Join-by-code
-- ---------------------------------------------------------------------------
--
-- A user joining a family is not yet a member of it, so RLS correctly forbids
-- them from reading the family row to find it by code, or from inserting
-- their own membership. This SECURITY DEFINER RPC performs the lookup and the
-- insert on their behalf after validating the code. It is the only supported
-- way to join, and it never exposes family rows to non-members.

create or replace function public.app_11941c8fec_join_family_with_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family_id uuid;
  v_name      text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select f.id into v_family_id
  from public.app_11941c8fec_families f
  where f.join_code = upper(btrim(p_code));

  if v_family_id is null then
    raise exception 'invalid join code';
  end if;

  -- Idempotent: joining a family you are already in is a no-op, not an error.
  if exists (
    select 1 from public.app_11941c8fec_family_members m
    where m.family_id = v_family_id and m.user_id = auth.uid()
  ) then
    return v_family_id;
  end if;

  select coalesce(nullif(split_part(u.email, '@', 1), ''), 'Member')
    into v_name
  from auth.users u
  where u.id = auth.uid();

  insert into public.app_11941c8fec_family_members
    (family_id, user_id, display_name, member_role)
  values
    (v_family_id, auth.uid(), coalesce(v_name, 'Member'), 'member');

  return v_family_id;
end;
$$;

comment on function public.app_11941c8fec_join_family_with_code(text) is
  'Join a family by its join_code. SECURITY DEFINER because a non-member cannot see the family row to find it. Idempotent. Stopgap until real email invites exist.';


-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
-- See the header of this file for the full explanation of why these exist
-- (self-referencing RLS recursion) and why this is the first use of the
-- SECURITY DEFINER pattern in the project. They live here, after the tables,
-- because `language sql` bodies are validated at CREATE time and cannot
-- reference tables that do not exist yet.

create or replace function public.app_11941c8fec_is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_11941c8fec_family_members m
    where m.family_id = p_family_id
      and m.user_id = auth.uid()
  );
$$;

comment on function public.app_11941c8fec_is_family_member(uuid) is
  'True if the calling user is a member of the given family. SECURITY DEFINER so that RLS policies on app_11941c8fec_family_members can call it without recursing into their own policy. See the header of migration 20260725000000.';

create or replace function public.app_11941c8fec_is_family_owner(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_11941c8fec_families f
    where f.id = p_family_id
      and f.owner_user_id = auth.uid()
  );
$$;

comment on function public.app_11941c8fec_is_family_owner(uuid) is
  'True if the calling user owns the given family. SECURITY DEFINER for the same reason as app_11941c8fec_is_family_member - it is called from policies on tables whose own RLS would otherwise recurse.';


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Every policy below is scoped to authenticated users. Membership checks go
-- through the SECURITY DEFINER helpers - see the header of this file for why
-- they are not inlined subqueries.

alter table public.app_11941c8fec_families                enable row level security;
alter table public.app_11941c8fec_family_members          enable row level security;
alter table public.app_11941c8fec_family_budget_settings  enable row level security;
alter table public.app_11941c8fec_family_budget_categories enable row level security;
alter table public.app_11941c8fec_family_income           enable row level security;
alter table public.app_11941c8fec_family_expenses         enable row level security;

-- Postgres has no CREATE POLICY IF NOT EXISTS either, so every policy is
-- dropped first. Keeps the whole migration re-runnable end to end.
drop policy if exists families_select_if_member              on public.app_11941c8fec_families;
drop policy if exists families_insert_own                    on public.app_11941c8fec_families;
drop policy if exists families_update_if_owner               on public.app_11941c8fec_families;
drop policy if exists families_delete_if_owner               on public.app_11941c8fec_families;
drop policy if exists family_members_select_if_member        on public.app_11941c8fec_family_members;
drop policy if exists family_members_insert_if_owner         on public.app_11941c8fec_family_members;
drop policy if exists family_members_update_if_owner         on public.app_11941c8fec_family_members;
drop policy if exists family_members_delete_if_owner_or_self on public.app_11941c8fec_family_members;
drop policy if exists family_budget_settings_all_if_member   on public.app_11941c8fec_family_budget_settings;
drop policy if exists family_budget_categories_all_if_member on public.app_11941c8fec_family_budget_categories;
drop policy if exists family_income_all_if_member            on public.app_11941c8fec_family_income;
drop policy if exists family_expenses_all_if_member          on public.app_11941c8fec_family_expenses;

-- families: members read; only the owner creates/renames/deletes.
--
-- The owner_user_id branch is not redundant with the membership check, and
-- removing it breaks family creation outright. An INSERT ... RETURNING (which
-- is what supabase-js does for .insert().select(), and what PostgREST does for
-- Prefer: return=representation) evaluates the SELECT policy on the new row as
-- part of the same statement - but the owner's membership row is created by an
-- AFTER INSERT trigger, which has not fired yet at that point. So
-- app_11941c8fec_is_family_member(id) is still false and the whole insert
-- fails with "new row violates row-level security policy". Checking
-- owner_user_id directly reads a column of the row being returned, needs no
-- other table, and is true immediately.
--
-- It is also correct independently of that timing detail: an owner should be
-- able to see their own family even if the membership row were ever removed.
create policy families_select_if_member on public.app_11941c8fec_families
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or public.app_11941c8fec_is_family_member(id)
  );

create policy families_insert_own on public.app_11941c8fec_families
  for insert to authenticated
  with check (auth.uid() = owner_user_id);

create policy families_update_if_owner on public.app_11941c8fec_families
  for update to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy families_delete_if_owner on public.app_11941c8fec_families
  for delete to authenticated
  using (auth.uid() = owner_user_id);

-- family_members: members see the roster; only the owner edits it, except
-- that any member may remove themselves (leave the family).
create policy family_members_select_if_member on public.app_11941c8fec_family_members
  for select to authenticated
  using (public.app_11941c8fec_is_family_member(family_id));

create policy family_members_insert_if_owner on public.app_11941c8fec_family_members
  for insert to authenticated
  with check (public.app_11941c8fec_is_family_owner(family_id));

create policy family_members_update_if_owner on public.app_11941c8fec_family_members
  for update to authenticated
  using (public.app_11941c8fec_is_family_owner(family_id))
  with check (public.app_11941c8fec_is_family_owner(family_id));

create policy family_members_delete_if_owner_or_self on public.app_11941c8fec_family_members
  for delete to authenticated
  using (
    public.app_11941c8fec_is_family_owner(family_id)
    or user_id = auth.uid()
  );

-- Budget data: any member of the family may read and write. A shared budget
-- that only the owner can edit would defeat the point of the feature.
create policy family_budget_settings_all_if_member on public.app_11941c8fec_family_budget_settings
  for all to authenticated
  using (public.app_11941c8fec_is_family_member(family_id))
  with check (public.app_11941c8fec_is_family_member(family_id));

create policy family_budget_categories_all_if_member on public.app_11941c8fec_family_budget_categories
  for all to authenticated
  using (public.app_11941c8fec_is_family_member(family_id))
  with check (public.app_11941c8fec_is_family_member(family_id));

create policy family_income_all_if_member on public.app_11941c8fec_family_income
  for all to authenticated
  using (public.app_11941c8fec_is_family_member(family_id))
  with check (public.app_11941c8fec_is_family_member(family_id));

create policy family_expenses_all_if_member on public.app_11941c8fec_family_expenses
  for all to authenticated
  using (public.app_11941c8fec_is_family_member(family_id))
  with check (public.app_11941c8fec_is_family_member(family_id));


-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  public.app_11941c8fec_families,
  public.app_11941c8fec_family_members,
  public.app_11941c8fec_family_budget_settings,
  public.app_11941c8fec_family_budget_categories,
  public.app_11941c8fec_family_income,
  public.app_11941c8fec_family_expenses
  to authenticated;

grant select on public.app_11941c8fec_family_category_spend to authenticated;

grant execute on function public.app_11941c8fec_join_family_with_code(text) to authenticated;
grant execute on function public.app_11941c8fec_is_family_member(uuid)      to authenticated;
grant execute on function public.app_11941c8fec_is_family_owner(uuid)       to authenticated;
