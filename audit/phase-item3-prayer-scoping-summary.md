# Item 3 Summary — Scope `prayer_completed_<date>` Per User

## Problem

`prayer_completed_<date>` (today's set of completed prayer names) was stored
under a raw, unscoped AsyncStorage key. Any account signed in on the same
device could see and silently overwrite another account's prayer record —
the same privacy gap Phase 1 fixed for 16 other keys, but this one was
missed at the time.

## Fix

**`app/(tabs)/prayer-times.tsx`** — the sole owner (only file that *writes*
this key):
- Removed the direct `AsyncStorage` import (confirmed via grep it was used
  nowhere else in the file) in favor of
  `getUserItem`/`setUserItem`/`migrateLegacyKeyIfNeeded` from
  `src/lib/userStorage.ts` — the same Phase 1 pattern.
- Load effect now keys on `[userId]`, migrates the legacy unscoped entry
  once, and explicitly resets in-memory `completed` state to an empty Set
  when nothing is found for the current user (so switching accounts on the
  same device doesn't show the previous account's checkmarks for a beat
  before the real load resolves).
- `toggleCompleted` now writes via `setUserItem`.

**`app/(tabs)/weekly-life-score.tsx`** — a read-only dependent. No change
needed: it already read scoped-first with a legacy-fallback
(`getUserItem` then raw `AsyncStorage.getItem` if null), a pattern written
during Phase 1 in anticipation of the owner eventually being scoped. That
anticipation was correct — it now correctly picks up what `prayer-times.tsx`
writes, with no code change required.

**`src/screens/DashboardScreen.tsx`** — a second read-only dependent, never
covered by Phase 1 at all. Had 4 raw, unscoped `AsyncStorage.getItem(prayer_completed_<date>)`
reads (`calcStreak`, `loadDailySummary`, `loadStreaks`'s prayer-streak loop,
`loadBriefing`'s streak loop). All 4 converted to the same scoped-first/
legacy-fallback read pattern as `weekly-life-score.tsx` (read-only — this
file doesn't own the key, so it doesn't call `migrateLegacyKeyIfNeeded`;
`prayer-times.tsx` already handles that migration once per user). Added
`userId` to each affected `useCallback`'s dependency array, and to the
top-level `useEffect`/`onRefresh` arrays that invoke them, so a re-render on
account switch actually re-fetches rather than serving stale closures.

## Typecheck

`npx tsc --noEmit` shows errors only in files untouched by this change
(`ai-life-coach.tsx`, `calendar.tsx`, `family-budget.tsx`,
`ramadan-planner.tsx`, `search.tsx`, `subscription.tsx`,
`weekly-life-score.tsx` — all pre-existing `cardTitle`/`sectionHeader`/
`sectionLabel`/`subHeader` style-typing errors, documented as baseline noise
in `audit/phase6-summary.md`). `git status` confirms only `prayer-times.tsx`
and `DashboardScreen.tsx` were modified. Zero new errors introduced.

## Not performed — the user's stated test

Could not run the actual test criterion (log a prayer as account A, sign
out, sign in as account B, confirm B sees nothing of A's prayer record) —
no on-device build available (EAS quota exhausted until Aug 1, same
limitation noted in every RN summary this session). Recommend running this
exact test once a build is available: mark 1-2 prayers done as account A,
sign out, sign in as account B, and confirm the Prayer Times screen,
Weekly Life Score, and Dashboard (streak, daily summary, briefing streak)
all show zero completed prayers for B, not A's data.

## Related, deliberately not touched here

- `DashboardScreen.tsx`'s `amanah-transactions`/`amanah-goals` reads are raw
  and unscoped too — same category of gap, out of scope for this item
  (only `prayer_completed_*` was in the user's list).
- `settings.tsx`'s Backup/Restore still doesn't export `prayer_completed_*`
  at all — that's Item 4's job, not this one.
