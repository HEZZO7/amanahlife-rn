-- Phase 2 (critical-audit-2026-07): server-side trial state.
--
-- The free trial is currently tracked ONLY in AsyncStorage
-- ('amanah-trial-start'), so uninstalling the app (or clearing app data)
-- resets it indefinitely - the same account can restart a "free" 7-day
-- trial as many times as the device allows a fresh install. This adds a
-- server-side flag so a trial can only ever be granted once per account,
-- regardless of what's on the device.
--
-- ============================================================================
-- ⚠️  TABLE NAME NOT CONFIRMED — READ BEFORE APPLYING
-- ============================================================================
-- This targets `public.subscriptions`, which is the table name
-- `src/contexts/SubscriptionContext.tsx` (this RN app) actually queries.
-- However, the web app's equivalent (AmanahLifeapp repo) queries
-- `app_11941c8fec_subscriptions` instead — a pre-existing discrepancy found
-- during a separate audit pass (2026-07-19) that's still unresolved. I do
-- not have Supabase access to confirm which of these is the real table (or
-- whether they're the same table via a view/alias). Before running this:
--   1. Confirm in the Supabase dashboard which table name actually exists.
--   2. If it's `app_11941c8fec_subscriptions` instead, change every
--      occurrence of `subscriptions` below to match before applying.
--   3. If BOTH tables genuinely exist as separate objects, that confirms
--      web and Android subscriptions are entirely unsynced — flag that to
--      Huzaifa before proceeding, it's a bigger problem than this migration.
-- ============================================================================

alter table public.subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_used boolean not null default false;

comment on column public.subscriptions.trial_started_at is
  'When the 7-day free trial was started for this user. Null if never started.';
comment on column public.subscriptions.trial_used is
  'True once a trial has ever been started for this user — prevents granting a second trial after reinstalling the app.';
