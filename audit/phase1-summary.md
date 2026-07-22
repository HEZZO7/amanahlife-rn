# Phase 1 Summary — Per-User Data Isolation

## Files modified

**New:**
- `src/lib/userStorage.ts` — `getScopedKey`, `getUserItem`, `setUserItem`, `removeUserItem`, `migrateLegacyKeyIfNeeded`

**Screens (all 16 named in the plan):**
`family-budget.tsx`, `ramadan-planner.tsx`, `weekly-life-score.tsx`, `finance.tsx`, `goals.tsx`,
`tasks.tsx`, `planner.tsx`, `wellness.tsx`, `fasting.tsx`, `dhikr.tsx`, `adhkar.tsx`, `duas.tsx`,
`quran.tsx`, `progress-analytics.tsx`, `ai-life-coach.tsx`, `settings.tsx`

**Context:**
- `src/contexts/AuthContext.tsx` — `signOut()` now sets `user`/`session` to `null` immediately rather than waiting on the async `onAuthStateChange` listener, closing the timing gap where a still-mounted screen could show a flash of the previous account's data.

Not touched (explicitly out of scope per the plan): `SubscriptionContext.tsx`'s `TRIAL_KEY`, `prayerNotifications.ts`'s reminder settings — both are device-level settings, not per-user content.

## How every screen changed

Each screen's read/write effect now derives `userId = user?.id ?? null` from `useAuth()` and:
1. Calls `migrateLegacyKeyIfNeeded(baseKey, userId)` once, so any data an existing user already has under the old unscoped key is copied to their new scoped key (and the legacy key removed) — no data lost on upgrade.
2. Reads/writes via `getUserItem`/`setUserItem` instead of raw `AsyncStorage.getItem`/`setItem`.
3. Every effect that fetches storage now has `userId` in its dependency array, so switching accounts on the same device re-triggers a fresh load scoped to the new user — even for screens Expo Router keeps mounted across tab switches.

12 of the 16 files needed the `useAuth` import added (`family-budget`, `ramadan-planner`, `weekly-life-score`, `finance`, `goals`, `tasks`, `planner`, `wellness`, `fasting`, `adhkar`, `progress-analytics`, `ai-life-coach`); `dhikr`, `duas`, `quran`, `settings` already had it.

## Migration risks and judgment calls

1. **Dash/underscore key-name mismatch — pre-existing, NOT fixed here.** `tasks.tsx` writes tasks under `amanah_tasks` (underscore), but `goals.tsx`, `planner.tsx`, `weekly-life-score.tsx`, and `progress-analytics.tsx` all read `amanah-tasks` (dash) — five files, two different literal strings. This bug already existed on `main` before this phase; I preserved the exact literal keys as-is rather than silently "fixing" the mismatch, since correcting it would be a behavior change outside this phase's scope (and could itself need its own manual-test pass). Flagging for a decision: pick one canonical key and fix all five call sites in a follow-up.

2. **Per-day dynamic keys (`fasting_today_<date>`, `dhikr_count_<preset>_<date>`, `dhikr_total_<date>`, `adhkar_progress_<date>`, `quran_pages_<date>`) needed the date baked into the string passed to `getUserItem`/`setUserItem` as `baseKey` — no changes were needed to `userStorage.ts` itself, since it just appends `:<userId>` to whatever string it's given.**

3. **Two read-only historical loops couldn't use straightforward migration:**
   - `fasting.tsx`'s 30-day grid and `weekly-life-score.tsx`'s 7-day prayer-completion loop both read many past dates' keys in one pass. Migrating all of them on every mount would be wasteful (and `prayer_completed_<date>` isn't even owned by any file in this phase's scope — it's written elsewhere, likely `DashboardScreen.tsx`/`prayer-times.tsx`, neither of which is in the 16-file list).
   - For these specific historical-read cases, I used a read-only fallback instead of migration: try the scoped key first, and if it's `null`, fall back to reading the raw legacy (pre-scoping) key directly. This preserves visibility of existing history without a bulk-migration step. "Today's" entry (which is both read and written) still gets the full migrate-then-scope treatment in `fasting.tsx`; the historical days do not migrate, they just remain readable.
   - **Recommendation:** if `prayer_completed_<date>` is written from a file outside this phase's list, that file should get the same `getUserItem`/`setUserItem`/`migrateLegacyKeyIfNeeded` treatment in a follow-up pass — it's the same class of bug this phase is fixing, just outside the 16 files explicitly named.

4. **`settings.tsx` needed bespoke handling beyond the simple wrapper for 5 call sites** (not mechanically convertible to `getUserItem`/`setUserItem` since they don't operate on one fixed key):
   - `exportFinanceCSV`/`exportGoalsCSV` — switched to `getUserItem` for the two specific keys they read.
   - `exportAllData` — now fetches the scoped variant of each `BACKUP_KEYS` entry via `AsyncStorage.multiGet`, but writes the *exported JSON* back out under the original base key names (not the scoped ones), so the backup file format stays stable/portable across accounts and matches older backups / the web app's export format.
   - `importAllData`'s restore step — now writes restored data into the *current* signed-in user's scoped keys (via `getScopedKey`) rather than the raw base keys from the file, so a restore can't create new unscoped legacy keys.
   - `handleDeleteAccount` — previously called `AsyncStorage.clear()`, wiping the entire device's storage (every other signed-in account on a shared device, too). Replaced with `AsyncStorage.getAllKeys()` filtered to keys ending in `:<userId>`, then `multiRemove` — deletes only the account being deleted, including all its per-day dynamic keys, without needing to enumerate them.
   - `BACKUP_KEYS` itself already contains both `amanah-tasks` and `amanah_tasks` as separate entries — direct evidence of finding #1 above. It also doesn't include any of the per-day dynamic keys (`fasting_today_*`, `dhikr_*`, `adhkar_progress_*`, `quran_pages_*`, `prayer_completed_*`) — the backup/restore feature was already lossy for those before this phase, unchanged by this pass.

5. **Family Budget is scoped per-account despite being a "shared family" feature.** Since there's no server-side storage at all yet (a separate, larger architectural gap — family members on different devices already don't share anything, regardless of this phase), scoping it per-user-per-device only closes the specific leak this phase targets (account A's family budget showing to account B signed in later on the *same* device) without making the pre-existing "family sharing doesn't actually sync across devices" problem any worse.

## Typecheck

`audit/phase1-typecheck.txt` vs `audit/baseline-typecheck.txt`: identical 27 errors (same messages, same files — only line numbers shifted from inserted code). No new type errors introduced.

## Suggested manual test steps

1. **Cross-account isolation (the core scenario this phase fixes):**
   Sign in as Account A → add a goal, a finance transaction, mark a prayer/fast, log a wellness entry → sign out → sign in as Account B (or a fresh test account) → confirm none of Account A's data appears anywhere, and Account B starts from a clean slate.
   Sign out of B, back into A → confirm A's data is still there (data isolation isn't data loss).

2. **Legacy migration (existing users upgrading):**
   Before installing this build, if possible seed AsyncStorage with an old unscoped key (e.g. `amanah-goals` with some JSON) using a pre-Phase-1 build or manually. Install this build, sign in, open Goals → confirm the old data appears (migrated to the scoped key) and the old unscoped key is gone afterward.

3. **Family Budget / backup-restore:**
   Add family budget data → Settings → Export All Data → confirm the JSON contains readable base-key names → sign out, sign in as a different account → Import that same file → confirm data restores into the *new* account's scoped storage, not the original account's.

4. **Delete account:**
   With two accounts signed in at different times on the same test device (A then B), delete account A from Settings → confirm B's data (still on device from a previous session) is untouched afterward — not just that A's own data is gone.

5. **Backgrounded-screen refresh:**
   Open Finance as Account A, navigate to another tab (don't close the app), sign out, sign in as Account B, navigate back to Finance → confirm it shows B's data, not a stale render of A's.
