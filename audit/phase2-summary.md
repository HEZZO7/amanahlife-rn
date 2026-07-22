# Phase 2 Summary — Server-Side Trial State

## Problem

The free trial was tracked only in AsyncStorage (`amanah-trial-start`). Uninstalling
the app, or clearing app data, reset it indefinitely — the same account could
restart a "free" 7-day trial as many times as the device allows a fresh install.

## Files modified

- `supabase/migrations/20260720000000_add_trial_columns.sql` (new) — adds
  `trial_started_at timestamptz` and `trial_used boolean not null default false`
  to `public.subscriptions`.
- `src/contexts/SubscriptionContext.tsx` — full rewrite of the trial logic.
- `app/(tabs)/subscription.tsx` — trial CTA now calls the server through a
  handler that surfaces an error toast, and hides itself once the trial is
  already used.

## How it works now

- **Source of truth**: `trial_started_at` / `trial_used` on the server
  (`public.subscriptions`), not AsyncStorage.
- **`amanah-trial-start`** (AsyncStorage) is kept only as an optimistic local
  cache — read once on mount via `checkLocalTrialCache()` so the UI has an
  instant value before the network call resolves, then immediately
  overwritten by whatever `fetchSubscription()` gets back from the server.
- **`startTrial()`** now:
  1. Queries `trial_used` fresh from the server (not local state, to close a
     race where stale state could grant a second trial).
  2. If already used, returns `{ error: 'trial_already_used' }` without
     writing anything.
  3. Otherwise upserts `{ user_id, trial_started_at: now, trial_used: true }`
     (`onConflict: 'user_id'`) and updates local state/cache.
  4. Returns `{ error: string | null }` instead of `void`, so the UI can react.
- **`subscription.tsx`**: the "Start 7-Day Free Trial" button now calls a
  `handleStartTrial` wrapper that shows a translated `toast.error(...)` for
  `trial_already_used` (and a generic one for any other failure). The CTA
  section itself is now also hidden once `trialUsed` is true (`isFreeTier &&
  !trialUsed`), so a returning user who already burned their trial normally
  never even sees the button — the error toast is a safety net for the race
  where local `trialUsed` hasn't caught up with the server yet.

## ✅ Applied 2026-07-22 — table name corrected first

The migration was run manually via the Supabase SQL editor on 2026-07-22
("Success. No rows returned"). Before running it, Huzaifa confirmed the
real table name by querying `information_schema.tables` — it turned out
`public.subscriptions` (what this migration and `SubscriptionContext.tsx`
originally targeted) **does not exist**; running the original migration
against it failed with `relation "public.subscriptions" does not exist`.

The real table is **`app_11941c8fec_subscriptions`**, matching the web
app's naming convention. This means every RN user's tier/status/trial data
had been silently unreadable since this app launched — `fetchSubscription`'s
query would have errored and fallen back to the free-tier default
regardless of what a user actually paid for. Fixed in commit `eb1f751`:
`SubscriptionContext.tsx`'s three query sites (`fetchSubscription`,
`startTrial`'s `trial_used` check, `startTrial`'s upsert) and this migration
file now all target `app_11941c8fec_subscriptions`. The two table names are
NOT both real — there's only ever been one table, just misnamed in the RN
client code.

`trial_started_at` and `trial_used` columns are now live on
`app_11941c8fec_subscriptions`.

## Typecheck

`audit/phase2-typecheck.txt` vs `audit/phase1-typecheck.txt`: identical error
set (same 27 pre-existing "missing StyleSheet key" errors, only
`subscription.tsx`'s line numbers shifted from the inserted code). No new
type errors introduced.

## Not performed — on-device manual test

The plan's actual acceptance test for this phase is: start a trial, verify
`trial_used` is set server-side, uninstall/clear app data, sign back in with
the same account, and confirm the trial CTA does not reappear and pressing it
(if forced) is rejected with the "already used" toast. I was not able to run
this — it requires a working `.aab`/dev build on a device and a live,
correctly-named `subscriptions` table, neither of which is available to me
right now (EAS build quota exhausted until Aug 1; no DB access). Recommend
this be manually verified once both are available, ideally in a Supabase
staging branch first if one exists.
