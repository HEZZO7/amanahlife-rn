# Phase 7 (partial) — 4 of 6 placeholder screens built for real

Per Huzaifa's decision: build the 4 cheap/honest screens now, hold Receipt
Scanner (needs real OCR, a separate project) and Family Dashboard (needs a
real invite/sync backend, not a quick port) for later.

## Built

- **Bill Reminders** (`app/(tabs)/bill-reminders.tsx`) — add/edit/delete
  bills (name, amount, due date, frequency, category), upcoming list sorted
  by due date with overdue/due-soon badges, collapsible payment history.
  `amanah-bills` key via `usePersistedState`. Straight port, no backend.

- **Financial Dashboard** (`app/(tabs)/financial-dashboard.tsx`) —
  read-only rollup: net worth, savings rate, expense-by-category bars,
  6-month income/expense trend, savings-goal progress. Computed from data
  already stored by `finance.tsx` (`amanah_finance`, **not** web's
  `amanah-transactions` — different key name, verified against the actual
  RN screen instead of copying web's key blindly) and `family-budget.tsx`
  (`amanah_family_budget`). Pure display, no writes. No premium gate added
  — matches the existing RN precedent of omitting web's `PremiumGate` for
  `balanced`-tier screens (already the case for `ai-life-coach.tsx` and
  `weekly-life-score.tsx`).

- **Halal Investment** (`app/(tabs)/halal-investment.tsx`) — 5 tabs:
  static Shariah-screening checklist, portfolio CRUD, Murabaha calculator
  (cost-plus financing), Ijara calculator (lease-to-own), home-ownership
  equity tracker. `amanah_investments` key via `usePersistedState`. Pure
  math + local storage, no backend.

- **Savings Challenges** (`app/(tabs)/savings-challenges.tsx`) — 5 fixed
  challenge templates, join/leave, progress bars, milestone celebrations
  (modal + optional push notification via `expo-notifications`, same
  library Phase 3's prayer reminders use), daily AI savings tip.
  `amanah-savings-challenges` key via `usePersistedState`.

## Bug found and fixed along the way

Web's `useDailySavingsTip` hook has always called
`supabase.functions.invoke('app_11941c8fec_savings_tips', ...)` — **that
function never existed anywhere in the repo.** Every call silently failed
(caught, no error surfaced), so the "Daily Savings Tip" card on web has
been stuck on "Loading tip..." indefinitely since this feature was built.

Created `supabase/functions/app_11941c8fec_savings_tips/index.ts` for real
(same Anthropic-backed pattern as `app_11941c8fec_ai_life_coach`), grounded
in the user's active challenges and progress. This fixes the daily tip on
**both** platforms once deployed — RN's new Savings Challenges screen calls
the same function.

⚠️ **Not deployed** — same constraint as the AI Life Coach function: needs
`supabase functions deploy app_11941c8fec_savings_tips` (or the dashboard
equivalent) run against the real project. It reuses the `ANTHROPIC_API_KEY`
secret already set for the AI Life Coach function — no new secret needed.

## Navigation

None of these 6 screens were reachable from anywhere in the app's UI before
this — they existed as routable files with zero links pointing to them.
Added the 4 built screens to `DashboardScreen.tsx`'s `NAV_ITEMS` ("All
Features" grid) so users can actually find them.

## Typecheck

No new errors — identical to the pre-existing baseline (`audit/phase6-typecheck.txt`), confirmed across all 4 new screens plus the nav-grid change.

## Not performed — on-device manual test

Didn't run the app on a device to confirm these screens render correctly,
persist across restarts, or that the milestone notification actually fires.
Recommend testing once a new build is available (EAS quota renews Aug 1)
and the `savings_tips` function is deployed.
