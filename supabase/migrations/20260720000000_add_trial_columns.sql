-- Phase 2 (critical-audit-2026-07): server-side trial state.
--
-- The free trial is currently tracked ONLY in AsyncStorage
-- ('amanah-trial-start'), so uninstalling the app (or clearing app data)
-- resets it indefinitely - the same account can restart a "free" 7-day
-- trial as many times as the device allows a fresh install. This adds a
-- server-side flag so a trial can only ever be granted once per account,
-- regardless of what's on the device.
--
-- Table name confirmed 2026-07-22 via the Supabase dashboard: this RN app's
-- SubscriptionContext.tsx was previously querying a nonexistent
-- `public.subscriptions` table (confirmed by running this migration and
-- getting `relation "public.subscriptions" does not exist`). The real
-- table is `app_11941c8fec_subscriptions`, matching the web app's naming
-- convention. src/contexts/SubscriptionContext.tsx has been corrected to
-- match.

alter table public.app_11941c8fec_subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_used boolean not null default false;

comment on column public.app_11941c8fec_subscriptions.trial_started_at is
  'When the 7-day free trial was started for this user. Null if never started.';
comment on column public.app_11941c8fec_subscriptions.trial_used is
  'True once a trial has ever been started for this user — prevents granting a second trial after reinstalling the app.';
