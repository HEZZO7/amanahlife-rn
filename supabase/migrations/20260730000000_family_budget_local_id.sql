-- FamilyBudget dual-write idempotency (Phase B, 2026-07-30).
--
-- WHY
-- Phase B mirrors the client's local FamilyBudget blob to the server while
-- localStorage/AsyncStorage remains the read source. That mirror has to be
-- safely repeatable: it can run again after a failed request, a mid-sync
-- refresh, a reinstall, or simply a second tab. Settings are already
-- idempotent (primary key is family_id) and categories are too
-- (unique(family_id, name)), but income and expense rows had no stable
-- client-supplied identity, so re-running the mirror would insert duplicates.
--
-- Duplicated expense rows would not be visibly wrong during Phase B - reads
-- still come from local storage - but they would silently corrupt every
-- total the moment reads flip to the server in Phase B step 2, and they
-- would corrupt the derived app_11941c8fec_family_category_spend view
-- immediately. Better to make the write path idempotent than to hope the
-- mirror only ever runs once.
--
-- WHAT
-- local_id carries the id the client already generates locally
-- (Date.now().toString() in the existing FamilyBudgetData shape), so the
-- mirror can upsert on (family_id, local_id) instead of blind-inserting.
--
-- The alternative considered was tracking already-synced ids in local
-- storage. Rejected: that state is lost precisely when local storage is
-- cleared or the app is reinstalled, which is the exact scenario a
-- server-backed mirror exists to survive.
--
-- NULLABLE on purpose: rows created directly on the server (or by any future
-- non-mirroring client) have no local counterpart. Postgres permits multiple
-- NULLs under a unique constraint, so those rows never collide with each
-- other or with mirrored ones.

begin;

alter table public.app_11941c8fec_family_income
  add column if not exists local_id text;

alter table public.app_11941c8fec_family_expenses
  add column if not exists local_id text;

comment on column public.app_11941c8fec_family_income.local_id is
  'Client-generated id from the pre-migration local blob, used as the conflict target when mirroring so the dual-write is idempotent. NULL for rows that originated server-side.';
comment on column public.app_11941c8fec_family_expenses.local_id is
  'Client-generated id from the pre-migration local blob, used as the conflict target when mirroring so the dual-write is idempotent. NULL for rows that originated server-side.';

-- Named uniquely and created only if absent, so this migration stays
-- re-runnable like 20260725000000.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'app_11941c8fec_family_income_family_local_uniq'
  ) then
    alter table public.app_11941c8fec_family_income
      add constraint app_11941c8fec_family_income_family_local_uniq
      unique (family_id, local_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'app_11941c8fec_family_expenses_family_local_uniq'
  ) then
    alter table public.app_11941c8fec_family_expenses
      add constraint app_11941c8fec_family_expenses_family_local_uniq
      unique (family_id, local_id);
  end if;
end
$$;

commit;
