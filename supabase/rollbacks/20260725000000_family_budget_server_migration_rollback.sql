-- ROLLBACK for migration 20260725000000_family_budget_server_migration.sql
--
-- ============================================================================
-- THIS FILE IS NOT A MIGRATION. DO NOT MOVE IT INTO supabase/migrations/.
-- Everything in that directory is applied automatically in filename order, so
-- a rollback living there would run straight after the migration and silently
-- undo it. It lives in supabase/rollbacks/ so it is version-controlled and
-- reviewable but never auto-applied. Run it by hand, deliberately, only.
-- ============================================================================
--
-- WHAT THIS DOES
-- Removes every object created by the FamilyBudget server migration, in
-- dependency order, returning the database to exactly its prior state.
--
-- WHAT IT DESTROYS
-- All family budget data: families, membership, settings, categories, income
-- and expenses. If the migration has been live long enough for real families
-- to have entered anything, running this deletes it permanently. It is safe
-- to run immediately after applying the migration (the tables are empty);
-- it is NOT safe to run casually afterwards.
--
-- WHAT IT DOES NOT TOUCH
-- Nothing outside these six tables and their functions. The pre-existing
-- tables (app_11941c8fec_subscriptions, _search_history, _email_digest,
-- _notification_preferences, _push_subscriptions, _exchange_rates) are not
-- referenced here at all.
--
-- Every statement uses IF EXISTS, so this is safe to run against a partially
-- applied migration, or twice.

begin;

-- View first: it depends on the categories and expenses tables.
drop view if exists public.app_11941c8fec_family_category_spend;

-- Tables. Policies and triggers attached to them are dropped automatically.
-- Child tables before parents so the foreign keys never block the drop.
drop table if exists public.app_11941c8fec_family_expenses;
drop table if exists public.app_11941c8fec_family_income;
drop table if exists public.app_11941c8fec_family_budget_categories;
drop table if exists public.app_11941c8fec_family_budget_settings;
drop table if exists public.app_11941c8fec_family_members;
drop table if exists public.app_11941c8fec_families;

-- Functions last. The RLS helpers cannot be dropped while any policy still
-- references them, which is why the tables (and therefore their policies)
-- have to go first.
drop function if exists public.app_11941c8fec_join_family_with_code(text);
drop function if exists public.app_11941c8fec_add_owner_as_member();
drop function if exists public.app_11941c8fec_set_join_code();
drop function if exists public.app_11941c8fec_generate_join_code();
drop function if exists public.app_11941c8fec_is_family_owner(uuid);
drop function if exists public.app_11941c8fec_is_family_member(uuid);

commit;

-- Verify afterwards - all three of these should return zero rows:
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_name like 'app_11941c8fec_family%';
--
--   select table_name from information_schema.views
--   where table_schema = 'public' and table_name like 'app_11941c8fec_family%';
--
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and proname like 'app_11941c8fec_%family%';
