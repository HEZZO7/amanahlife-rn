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

## ⚠️ Not executed — no Supabase access

The migration SQL was written but **not applied** to the real database. I do
not have Supabase MCP access to the production project
(`nyhsnvjdgifphwkqzwel`) in this session — confirmed via a permission-denied
`get_project` call earlier in this engagement. Before this phase does
anything, someone with dashboard/CLI access needs to:

1. Confirm the actual table name — this migration (and
   `SubscriptionContext.tsx`) targets `public.subscriptions`, but the **web
   app** queries `app_11941c8fec_subscriptions` instead (a pre-existing,
   still-unresolved discrepancy flagged in an earlier phase). If the RN app's
   table name is wrong, the trial check silently no-ops against a
   nonexistent/empty table and the old exploit (reinstall = new trial) is
   NOT actually fixed by this code.
2. Apply `supabase/migrations/20260720000000_add_trial_columns.sql`.
3. If both table names turn out to be real, separate tables — that means web
   and Android subscriptions are entirely unsynced, a bigger problem than this
   migration, and should be escalated to Huzaifa before proceeding further.

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
