# Item 4 Summary — Expand Backup/Restore for Dynamic Daily Keys

## Problem

`settings.tsx`'s "Export Data"/"Import Data" advertised exporting all app
data, but `BACKUP_KEYS` was a fixed list of static keys only. It silently
missed every date/preset-templated key: `fasting_today_<date>`,
`dhikr_count_<preset>_<date>`, `dhikr_total_<date>`,
`adhkar_progress_<date>`, `quran_pages_<date>`, `prayer_completed_<date>`.
A user restoring a backup would find their fasting history, dhikr counts,
adhkar progress, Quran daily-pages counter, and prayer record all reset to
empty, despite the export claiming to be a full backup.

## Fix (`app/(tabs)/settings.tsx`)

- Added `DYNAMIC_KEY_PREFIXES` (the 6 prefixes above) alongside the existing
  static `BACKUP_KEYS` list.
- `exportAllData` now also calls `AsyncStorage.getAllKeys()`, filters to
  keys scoped to the current user (`endsWith(':<userId|guest>')`) whose
  base name starts with one of the dynamic prefixes, and includes them in
  the export under their exact base name — so a key like
  `prayer_completed_Thu Jul 23 2026` is preserved with its date intact,
  landing back on the same date when restored.
- `importAllData` needed **no change** — it already restores every entry in
  `payload.data` generically via `getScopedKey(k, userId)`, so the newly
  included dynamic keys are picked up automatically by the existing loop.
- Added `schemaVersion: 2` and renamed `timestamp` → `exportedAt` in the
  export payload (kept `appVersion`, unchanged). `schemaVersion` lets a
  future import path branch on old-vs-new backup files if the format
  changes again; the current import loop doesn't need to read it since it
  already works generically on whatever keys are present.
- Confirmed via `getScopedKey(baseKey, userId)`'s exact
  `` `${baseKey}:${userId ?? 'guest'}` `` format (Item 3's owner change
  didn't alter this) that every one of the 6 prefixes above is written via
  `setUserItem`/scoped keys already, per each screen's own migration — so
  scoping the export/import to the current signed-in user's suffix is
  correct and matches what's actually on disk.

## Typecheck

`npx tsc --noEmit`: zero new errors anywhere, and specifically zero errors
in `settings.tsx`. `git status` confirms only `settings.tsx` was modified.

## 🚨 Web/Android backup format — NOT interchangeable, needs a decision

Checked the web repo's equivalent (`app/frontend/src/components/BackupRestore.tsx`)
before touching anything, per the standing instruction not to unify
cross-platform formats unilaterally. **This is not just a key-naming
mismatch like Item 2's tasks key — the two files have entirely different
shapes:**

- **Web's export**: `{ metadata: { version, exportedAt, userId, email }, supabaseData: {...}, localData: {...} }` — top-level `localData` object, plus a full dump of 5 Supabase tables (`push_subscriptions`, `notification_preferences`, `email_digest`, `search_history`, `subscriptions`) that the RN backup never touches at all.
- **RN's export** (this fix): `{ exportedAt, schemaVersion, appVersion, data: {...} }` — no Supabase data, local keys only.
- A file exported from one app **cannot be imported into the other today** — different top-level key names (`localData` vs `data`), different required fields (web's import throws if `metadata.version` is missing; RN's import throws if `data` is missing), and RN's file has nothing web's import loop expects.
- Web's own dynamic-key sweep (`Object.keys(localStorage)` filtered to `prayer_completed_`, `dhikr_`, `amanah-` prefixes) **also doesn't cover `fasting_today_*` or `quran_pages_*`** — so web's backup has a version of the same gap this item just fixed on RN, just a narrower one.
- Web's static list also backs up `amanah-adhkar-progress` as one single static key, not a per-day templated key — meaning **web and RN may not even model Adhkar progress as the same shape** (single running record vs. one entry per day). Not investigated further here — that's a data-model question, not a backup-format question, and out of scope for this item.

Per Huzaifa's own instruction on Item 2 (don't unify a cross-platform
format difference without asking first), **no attempt was made to change
either format to match the other.** This needs a decision:
1. Should the two platforms share one backup file format at all (useful
   for the "manual transfer before real sync exists" use case mentioned for
   Item 2), or are they allowed to diverge since accounts are already
   synced server-side apart from these local-only keys?
2. If unified: which shape wins — web's (`metadata`/`localData`/
   `supabaseData`) or RN's (`exportedAt`/`schemaVersion`/`data`)? RN has no
   way to touch Supabase tables from a local export/import cycle the way
   web's `supabaseData` block does, so a real unification would need to
   either drop that from web's side or add equivalent Supabase read/write
   to RN's.
3. Should web's dynamic sweep be widened to match RN's now (`fasting_today_*`,
   `quran_pages_*`), independent of the bigger format question?

Not fixed, not touched — flagged here for Huzaifa's decision, same as the
lemonsqueezy "true source of record" and `ai_life_coach` deployment items
still open from earlier in this session.

## Not performed — on-device manual test

Could not run an actual export → sign out → sign in as a different
account → import cycle on a device (EAS quota exhausted until Aug 1, same
limitation as every other RN item this session). Recommend once a build is
available: log some fasting/dhikr/adhkar/Quran-page/prayer data, export,
wipe app data (or use a second test account), import, and confirm every
dynamic key lands back on its original date, not just the static keys.
