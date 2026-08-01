-- Widen app_11941c8fec_subscriptions_status_check to permit 'expired' and
-- 'paused' (2026-08-01).
--
-- WHY
-- The constraint has only ever allowed status IN ('active', 'canceled',
-- 'past_due', 'trialing') since this table was created. But
-- app_11941c8fec_lemonsqueezy_webhook has always attempted to write
-- 'expired' for subscription_expired events, and as of today's
-- event-coverage widening also writes 'paused' for subscription_paused.
-- Every real subscription_expired webhook call has therefore been silently
-- failing its DB upsert (Postgres rejects the row, upsertError gets set,
-- the function logs an error and returns 500 to Lemon Squeezy) since day
-- one - discovered empirically today via a throwaway-account webhook
-- simulation, not from any bug report.
--
-- Both web's and RN's SubscriptionContext.tsx already declare 'expired' and
-- 'paused' as valid SubscriptionStatus values and already exclude them from
-- ENTITLING_STATUSES (only 'active'/'past_due' entitle) - the frontend type
-- and entitlement logic were already correct and ready for these statuses;
-- only the database constraint was stale.
--
-- WHAT
-- Purely additive (widening) - verified beforehand that no existing row in
-- this table uses a status outside the previous allowed set, so this cannot
-- fail on data. 'trialing' is kept: the separate Stripe webhook still writes
-- it for Stripe subscribers on a trial.

begin;

alter table public.app_11941c8fec_subscriptions
  drop constraint if exists app_11941c8fec_subscriptions_status_check;

alter table public.app_11941c8fec_subscriptions
  add constraint app_11941c8fec_subscriptions_status_check
  check (status = any (array['active', 'canceled', 'past_due', 'trialing', 'expired', 'paused']));

commit;
