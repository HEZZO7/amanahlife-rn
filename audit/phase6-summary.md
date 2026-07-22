# Phase 6 Summary — usePersistedState Hook

## Problem

Every one of the 16 screens scoped in Phase 1 hand-wrote its own copy of the
same pattern for its owned storage key:

```ts
useEffect(() => {
  migrateLegacyKeyIfNeeded(key, userId).then(() => {
    getUserItem(key, userId).then((s) => { if (s) setState(JSON.parse(s)); });
  });
}, [userId]);
useEffect(() => { setUserItem(key, userId, JSON.stringify(state)); }, [state, userId]);
```

Two screens (`ramadan-planner.tsx`, `family-budget.tsx`) had independently
discovered a real bug in this pattern and fixed it locally with a `ready`
flag guarding the write effect; the other screens hadn't, meaning on first
load some screens briefly wrote their default/empty state back over
storage before the real load resolved (self-correcting a moment later once
the load's `setState` fired, but still a wasteful, racy write every single
screen would eventually need the same guard for).

## Fix

New `src/lib/usePersistedState.ts`:

```ts
usePersistedState<T>(baseKey, userId, defaultValue, { serialize?, deserialize? })
  => [value, setValue, ready]
```

Bakes in the `ready` guard as the default, correct behavior. Applied to the
5 screens where the pattern was a clean 1:1 fit — a single, static (not
templated), screen-owned key with a plain load-then-write-back lifecycle:

- `duas.tsx` (`dua_favorites`, `Set<string>` via custom serialize/deserialize)
- `wellness.tsx` (`amanah-wellness`)
- `goals.tsx` (`amanah-goals` only — its separate read-only cross-file read
  of `amanah-tasks`, used for linked-task counts, correctly stays a plain
  effect since `goals.tsx` doesn't own that key and must not write it back)
- `ramadan-planner.tsx` (`amanah_ramadan`) — now gets the `ready` guard via
  the hook instead of its own hand-written `ready` state
- `family-budget.tsx` (`amanah_family_budget`) — same

## Deliberately NOT touched

- **`finance.tsx`, `tasks.tsx`** — these write via an explicit function call
  (`saveTasks(updated)` etc.) triggered by user actions, not an effect
  reacting to state changes. Retrofitting them to the hook would change the
  write-trigger model itself (explicit call → automatic effect), touching
  every call site for marginal benefit. Left as-is.
- **`dhikr.tsx`, `adhkar.tsx`, `fasting.tsx`, `quran.tsx`'s page counter** —
  dynamic, date-templated keys (`` `dhikr_count_${preset}_${date}` `` etc.).
  The hook is built for one static key per screen; forcing a templated key
  through it would need the hook itself to re-run its load/migrate cycle on
  every date change, which is a different (and riskier) shape than what
  Phase 1 already verified for these screens.
- **`planner.tsx`, `progress-analytics.tsx`, `ai-life-coach.tsx`,
  `weekly-life-score.tsx`** — these only ever *read* other screens' keys
  (cross-file dependencies, matching the `goals.tsx`/`amanah-tasks` case
  above) or read multiple keys they don't own. None of them have a
  screen-owned key with the load+write pattern the hook targets.
- **`settings.tsx`** — bespoke backup/restore/delete-account logic across
  many keys at once; not a single-key load/write screen at all.

Consolidating the remaining cases wasn't attempted here — the ones handled
were the unambiguous, low-risk fits; the rest would need their own
case-by-case design, not a blanket application of one hook shape.

## Typecheck

`audit/phase6-typecheck.txt` vs `audit/phase3-typecheck.txt`: identical
line count (26) and identical error count in every touched file (10, same
`cardTitle` pre-existing errors in `family-budget.tsx`/`ramadan-planner.tsx`,
just shifted up a few lines from the removed boilerplate). `duas.tsx`,
`wellness.tsx`, and `goals.tsx` contribute zero errors in both the before
and after runs. No new errors anywhere.

## Not performed — on-device manual test

Didn't run the app on a device to confirm the 5 refactored screens still
load/persist correctly across app restarts and account switches. The hook
is a behavior-preserving (and in 3 cases behavior-*improving*, via the
`ready` guard) extraction of code that was already covered by Phase 1's
suggested manual test steps — recommend re-running that same test plan
(`audit/phase1-summary.md`, section "Suggested manual test steps") once a
device build is available, since it exercises exactly these code paths.
