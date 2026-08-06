# AmanahLife — Project Documentation

Handoff document for the full AmanahLife project (web + Android). Last updated 2026-08-01 (paid-feature parity sweep, bidirectional web↔Android re-audit, Coolify deploy-pipeline fix, and Android production build v1.0.2/versionCode 2).

---

## 0a. Project Overview

- **Name:** AmanahLife (أمانة لايف)
- **Description:** Personal life planning and daily log SaaS app — helps individuals and families plan goals, track habits, manage daily routines, and grow personally, with an Islamic-life-companion focus (prayer times, Quran, Zakat, Ramadan tools) alongside general productivity/finance features.
- **Operator:** LinkoraNet LLC, a Wyoming-registered US entity
- **Founder:** Huzaifa Al Ezzo — Founder & CEO, LinkoraNet LLC
- **Mission:** Help people organize their lives, track their progress, and grow with purpose.
- **Target markets:** Worldwide, including US, Canada, UK, Europe, Australia, and GCC/MENA (Saudi Arabia, UAE, Qatar, Egypt, Kuwait, Iraq)
- **Languages:** English (primary), Arabic — full RTL support
- **Pricing (USD):** Free / Balanced Life $6.99 mo (\$4.89/mo yearly) / Family Plan $12.99 mo (\$9.09/mo yearly)

---

## 0b. Tech Stack

| Layer | Technology |
|---|---|
| Android | React Native / Expo (SDK 54, Expo Router), package `com.linkoranet.amanahlife` |
| Web | Vite + React 18 (SPA), Tailwind/shadcn-ui |
| Database | Supabase (Postgres + Auth + Edge Functions) |
| Auth | Supabase Auth — email/password + Google OAuth (`signInWithOAuth` on web, native `@react-native-google-signin` on Android, both validated via Supabase) |
| Payments (web) | Lemon Squeezy (checkout + webhook edge functions); Paddle functions also present in repo but Lemon Squeezy is the active processor |
| Payments (Android) | **Not yet integrated with Google Play Billing** — currently opens the same Lemon Squeezy checkout via in-app browser. This is a hard blocker before Play Store Production release (see Pending Items). |
| Build system | EAS (Expo Application Services) — remote managed builds, no local `android/` folder |
| Web hosting | **Hostinger VPS (`72.60.186.183`) via Coolify** — same VPS as LinkoraNet's other services. `amanahlife.com` domain registered/DNS-managed on Hostinger; `app.amanahlife.com` A record points to the VPS. Migrated off Atoms Dev on 2026-07-04 (details were in `MIGRATION-COMPLETE.md`/`DEPLOYMENT.md` in the `AmanahLifeapp` repo — both removed 2026-07-31 as dead scaffolding; the migration is complete and fully summarized inline here, so nothing was lost). |
| Digital products site | `amanahlife.netlify.app` — separate Netlify site, out of scope for the Atoms Dev migration |
| Repos | `HEZZO7/amanahlife-rn` (Android), `HEZZO7/AmanahLifeapp` (web) — both on GitHub, owned by Huzaifa |

---

## 0c. Features — Current State

| Feature | Web | Android |
|---|---|---|
| Dashboard / Daily Briefing | ✅ | ✅ |
| Finance tracking | ✅ | ✅ |
| Family Budget planner | ✅ | ✅ |
| Planner / Task tracker | ✅ | ✅ |
| Goals (personal + financial) | ✅ | ✅ |
| Habit streaks | ✅ | ✅ |
| Life Score (weekly) | ✅ | ✅ |
| AI Life Coach | ✅ real (fixed 2026-07-22 — was random canned strings, no AI) | ✅ real (fixed 2026-07-22, same fix) |
| Prayer times + Qibla finder | ✅ | ✅ |
| Quran reader with bookmarks | ✅ | ✅ |
| Dhikr counter + daily duas | ✅ | ✅ |
| Islamic calendar + Hijri | ✅ | ✅ |
| Ramadan mode | ✅ | ✅ |
| Zakat & Giving tracker | ✅ | ✅ |
| Halal Investment tracker | ✅ | ✅ built 2026-07-23 (portfolio + Murabaha/Ijara calculators) |
| Bill reminders | ✅ | ✅ built 2026-07-23 |
| Financial Dashboard | ✅ | ✅ built 2026-07-23 (read-only rollup) |
| Receipt Scanner | ⚠️ fake OCR (mock data, no real scanning) | ❌ stub screen only — held, needs real OCR |
| Savings Challenges | ⚠️ daily tip silently broken (Edge Function never existed) until fixed 2026-07-23 | ✅ built 2026-07-23, daily tip fixed on both platforms |
| Progress analytics | ✅ | ✅ |
| Document vault | ✅ | ⚠️ not confirmed ported |
| Family dashboard + shared goals | ⚠️ real screen, but "invites" don't sync — fake local record with randomized stats | ❌ stub screen only |
| Data Backup & Restore | ✅ (Supabase-backed) | ✅ (AsyncStorage-backed, same UX) |
| Motivational Quotes (daily rotation) | ✅ | ✅ |
| Dark/Light auto-switch (sunrise/sunset) | ✅ | ✅ |
| Prayer-time push notifications | ✅ | ✅ (local notifications via expo-notifications) |
| Multi-currency support (USD default) | ✅ | ✅ |
| Bilingual EN/AR + RTL | ✅ | ✅ |
| Subscription management | ✅ (Lemon Squeezy — buy-links + skip_trial, see Known Issues) | ✅ same buy-link + skip_trial flow ported 2026-07-31, opened via in-app browser — still not Play Billing |
| PWA / offline mode | ✅ (web only, by design) | N/A — not applicable to native app |
| More/Info screen (footer sitemap) | N/A (web has footer) | ✅ new screen added |
| About/Founder page | ✅ | ✅ |

---

## 0c-2. Web vs Android Feature-Parity Audit (2026-07-31)

Full systematic comparison, triggered by Huzaifa noticing Android was missing entire web features (flagged: no Blog, incomplete task-reminders in Settings). Built from actual code — every route in web's `App.tsx` + every entry in `Index.tsx`'s feature grid + every Settings sub-section, cross-referenced against every file under RN's `app/(tabs)/` + RN's Settings screen — not from memory of what was assumed to exist.

| Feature | Web | Android | Status |
|---|---|---|---|
| ~~**Daily Routine**~~ | Real feature (`DailyRoutine.tsx`) — 5 fixed routine checklists (Morning, Weekly Review, Health Day, Deep Focus, Learning), per-item streak tracking, all local storage (plain unscoped `localStorage`) | **Closed 2026-08-01.** New `app/(tabs)/daily-routine.tsx`, same 5 routines, same toggle/streak logic, added to the dashboard's feature grid right after Dhikr (matching web's position). | **Ported.** Used the established per-user-scoped storage convention (`getUserItem`/`setUserItem` for the per-day routines list, `usePersistedState` for the streaks record) instead of copying web's unscoped-per-user pattern — same class of gap Phase 1's audit fixed elsewhere on web, just never applied here since the screen didn't exist on RN yet. Streaks consolidated into one record instead of web's 5 separate keys (same behavior, fewer keys). Toggle/streak logic (increment on complete, decrement floored at 0 on un-complete) verified via a standalone script against web's exact behavior - all 6 assertions passed. Typecheck and local `expo export` build both clean. |
| ~~**Blog**~~ | Native route `/blog/*`, full entry in main feature grid. Real content source is `app/frontend/seo/content/*.md` (+ `ar/` subfolder) via `src/lib/blog.ts`'s `import.meta.glob` — **not** `public/blog-content/*.md`, which was a stale duplicate correctly removed in the 2026-07-31 dead-scaffolding cleanup (confirmed safe by reading `blog.ts`'s actual glob path before assuming anything broke). | **Closed 2026-08-01.** New `app/(tabs)/blog/index.tsx` (list) + `app/(tabs)/blog/[slug].tsx` (reader), added to the dashboard's feature grid after Savings Challenges. `more-info.tsx`'s buried Blog link now navigates to the native screen instead of opening the web URL (its header comment updated to match). | **Ported**, sourcing the real 10 articles (5 EN + 5 AR) verbatim from `seo/content/`. Metro has no Vite-style `import.meta.glob` for raw `.md`, so a one-off codegen script (not committed — run against the web repo, output reviewed) converted the real markdown into `src/lib/blogContent.ts` as embedded data - same "hardcoded reference array" convention already used for other static content in this app (e.g. the Quran reader's Juz index). New `src/lib/simpleMarkdown.tsx` renders the narrow markdown subset the real articles actually use (headings, **bold**, one hero image per article — confirmed via grep before writing it; no lists/links needed). Caught and fixed one real bug before it shipped: a `**/*.md` reference inside a doc comment contains an embedded `*/` that closes the comment early, breaking the whole file's parse — found via typecheck, not by inspection. Verified: real-content classification (headings/image/paragraph line-by-line) and bold-span splitting both checked against actual article text via a standalone script - all assertions passed, including that splitting+rejoining a bold line reconstructs it with zero content loss. Typecheck and local `expo export` build both clean. |
| ~~**Notification preferences (Settings)**~~ | Two separate sections: general "Notifications" panel (`NotificationSettings.tsx` — push subscription + 6 category toggles: prayer/bill/habit-goal/fasting/savings/general activity) AND "Smart Prayer Reminders" (`PrayerReminderSettings.tsx` — per-prayer minutes-before config) | **Closed 2026-08-01.** New "🔔 Notifications" card in Settings with all 6 category toggles, above the existing Prayer Reminders card (matches web's ordering). | **Ported, and genuinely exceeds web** — verified web itself never triggers a real bill/habit/fasting/savings/general notification anywhere (`send_notification`/`sendLocalNotification` are only ever called from within the preference-panel component itself); RN instead wires *real* local `expo-notifications` scheduling against real per-item data for the 3 categories that have it: `scheduleBillReminders` (real due dates from `amanah-bills`), `scheduleGoalReminders` (real target dates from `amanah-goals`, 3-days-before + on-target), `scheduleFastingReminders` (real Fajr/Maghrib timings reused from `prayerNotifications.ts`'s own Aladhan fetch — Suhoor 30min before Fajr, Iftar at Maghrib, 7-day rolling window). `savings_reminders` now gates the milestone notification `savings-challenges.tsx` already fired live (that screen's private `NOTIFICATIONS_ENABLED_KEY` toggle was removed and replaced with the shared preference — one source of truth, not two). `general_activity` intentionally has no dedicated content on either platform (preference-only, matching web — not fabricated). New shared module: `src/lib/notificationPreferences.ts`. Preferences sync via the existing `app_11941c8fec_push_notify` `get_preferences`/`update_preferences` actions — **confirmed via re-download-and-diff the deployed function already matched committed source, no changes needed** (it's generic on `user_id` + a JSON blob), and the real round-trip was empirically tested end-to-end with a throwaway `@amanahlife-test.invalid` account (set `bill_reminders`/`fasting_reminders` to `false`, re-fetched, confirmed persisted). Typecheck: zero new errors (same 26 pre-existing, unrelated). Trigger-date math (bill/goal/fasting) verified via a standalone script against sample data - all 12 assertions passed (future/past filtering, correct offsets, 9am/10am/exact-time triggers). **Not verified: actual on-device notification firing** — no ADB/emulator/EAS build available in this environment to test on a real device; recommend a manual on-device pass once possible. |
| Family Dashboard | Real screen, but "invite a family member" is fabricated data — local-only fake record with randomized streak/Quran stats, no real invite or sync (already documented, unfixed) | File exists (`family-dashboard.tsx`) but **not linked from anywhere** in the app (not in the dashboard grid, not referenced by any other screen — confirmed via grep across the whole repo) — unreachable in practice even though the file exists | **Placeholder on both**, for different reasons — web's is fake-functional; Android's is a genuinely orphaned file. **Do not build a fake/placeholder Android version** — depends on the same unfinished real invite + shared-data backend (new Supabase table, cross-device sync) already flagged as bigger-scope work. |
| Receipt Scanner | 100% fake — `setTimeout` + random pick from 4 hardcoded mock receipts, UI claims "AI analyzing" | File exists (`receipt-scanner.tsx`) but **not linked from anywhere** — same orphaned-file situation as Family Dashboard | **Placeholder on both.** **Do not build a fake/placeholder Android version.** Needs real OCR (on-device library or a paid cloud API with ongoing per-call cost) — the most expensive gap here by a wide margin. |
| Google Play Billing | N/A (Lemon Squeezy) | Lemon Squeezy via in-app browser, not native Play Billing | Already-documented hard blocker (see Pending Items #1) — re-confirmed still open, nothing new. |
| The other 20 feature-grid screens (Prayer, Quran, Duas, Dhikr, Fasting, Tasks, Adhkar, Finance, Qibla, Zakat, Calendar, Goals, Wellness, Planner, Family Budget, Financial Dashboard, Halal Investment, Ramadan Planner, Progress Analytics, Bill Reminders, AI Life Coach, Life Score, Savings Challenges) | ✅ | ✅ | Matches. |
| Settings: Subscription, Profile, Theme, Language, Regional, Islamic toggles, Time Format, Backup/Restore, Export CSV, Delete Account, Sign Out | ✅ | ✅ | Matches. |
| About / Privacy / Refund | Native pages | Native pages | Matches. |
| Terms / Contact | Native pages | Opens the web page in-browser (deliberate, documented design choice in `more-info.tsx`) | Matches functionally, not a gap. |

**Reported to Huzaifa 2026-07-31; no implementation started pending his decision on scope/order** — same discipline as every other scope-affecting decision in this project (Family Dashboard, Receipt Scanner, tasks-key unification, backup-format unification all followed the same "report, don't silently build" pattern).

---

## 0c-3. Paid-Feature Audit (2026-08-01)

Full audit of entitlement gating, Lemon Squeezy configuration, and webhook lifecycle-event coverage across both platforms, ahead of fixing paid-feature parity.

### Entitlement gating

| Feature | Web | RN | Status |
|---|---|---|---|
| AI Life Coach | Gated via `PremiumGate requiredTier="balanced"` (`AILifeCoach.tsx:147`) | **Not gated.** Comment in `ai-life-coach.tsx` explicitly says "PremiumGate omitted — no RN equivalent" | **Gap — free access to a paid feature on Android.** |
| AI Planning / Smart Planning | Gated (`AIPlanning.tsx:62`), **but the `/ai-planning` route isn't linked from anywhere in web's own UI** — an orphaned gated feature on web itself, confirmed via grep across the whole repo | **No RN screen exists at all** | Web: orphaned but real. RN: doesn't exist. Neither is a live user-facing gap right now (unreachable either way), but worth a decision on whether to build the RN screen or quietly retire the whole feature. |
| AI Search / Smart Search | Gated (`AISearch.tsx:80`) | **Not gated** (`ai-search.tsx` has zero premium-check code) | **Gap.** |
| Financial Dashboard | Gated (`FinancialDashboard.tsx:75`) | **Not gated.** Same "PremiumGate omitted" comment pattern in `financial-dashboard.tsx` | **Gap.** |
| Receipt Scanner | Gated (`ReceiptScanner.tsx:174`) — but the feature itself is 100% fake (mock OCR) | Not gated, and the screen is orphaned/unreachable (see 0c-2) | Not a live gap (unreachable), but see the marketing-copy finding below. |
| Savings Challenges | Gated (`SmartSavingsChallenges.tsx:238`) | **Not gated at all** — fully reachable, fully functional, free on Android | **Gap — the most concrete real-money-impact one:** any free Android user gets full Savings Challenges access today. |
| Weekly Life Score | Gated (`WeeklyLifeScore.tsx:171`) | **Not gated.** Same comment pattern in `weekly-life-score.tsx` | **Gap.** |
| Family Budget | Bespoke check: `tier === 'family' \|\| isTrialActive` (`FamilyBudget.tsx:56`) | Same bespoke check, same logic (`family-budget.tsx:57,59`) | **Matches — the one screen RN gates correctly.** |
| Family Dashboard | Same bespoke `tier === 'family' \|\| isTrialActive` check, but the feature itself is fake data (see 0c-2) | Not gated, and the screen is orphaned/unreachable | Not a live gap (unreachable), but see the marketing-copy finding below. |

**Architectural gap underneath all of this**: web's `SubscriptionContext.tsx` exposes `tier` as `effectiveTier` — trial floors it to `'family'`, a non-entitled status (`canceled`/`expired`/`paused`) floors it to `'free'` — so *any* tier-level check (like `PremiumGate`'s `TIER_LEVELS[tier] >= TIER_LEVELS[requiredTier]`) automatically handles trial and lapsed subscriptions correctly. RN's `SubscriptionContext.tsx` sets `tier` straight from the DB row (status-checked, but **not** trial-elevated) — only the separate `isPremium` boolean reflects trial. Porting web's `PremiumGate` pattern to RN verbatim using tier-level comparison would silently deny access to trialing users. The fix (Phase 2) is to make RN's exposed `tier` compute the same trial floor web's does, so one comparison pattern works identically on both platforms.

**Displayed pricing mismatch, found while checking this**: RN's yearly prices are wrong — Balanced shows `$4.89`/mo (web: `$4.99`), Family shows `$9.09`/mo (web: `$9.99`) (`subscription.tsx:83,90` vs web `Subscription.tsx:80-91`). Looks like a copy error from the original port, not an intentional difference — the actual charge is whatever Lemon Squeezy's configured variant price is regardless of this display bug, but a user comparing prices across platforms would see a mismatch.

**Fixed 2026-08-01 (RN repo, commit `1f2a0eb`):**
- `SubscriptionContext.tsx` now exposes an `effectiveTier` (trial floors to `'family'`) as `tier`, mirroring web's `effectiveTier` exactly — the architectural gap above is closed.
- New `src/components/PremiumGate.tsx` (mirrors web's tier-level `TIER_LEVELS` comparison, using RN's existing `LockedFeatureModal` for the locked UI instead of web's blurred overlay) wired into AI Life Coach, AI Search, Financial Dashboard, Weekly Life Score, and Savings Challenges — all 5 are now gated `requiredTier="balanced"`, matching web.
- RN's yearly pricing display corrected to `$4.99`/`$9.99`, matching web.
- AI Planning (RN has no screen) and Receipt Scanner/Family Dashboard (orphaned on RN) intentionally left as-is — not live gaps, no gating to add to a screen that doesn't exist or isn't reachable.
- **Coolify deploy pipeline was broken — found and fixed 2026-08-01 (web repo, commit `e8a230c`).** The earlier "dead scaffolding cleanup" (`8e05dac`) mislabeled `app/frontend/Dockerfile` as "the old MGX Dockerfile" and deleted it along with `nginx.conf` and the entire `app/frontend/public/` directory (`index.html`'s actual favicon/og-image/manifest/`theme-init.js`, the `/landing` route's iframe target, and the blog markdown source files). Every deploy since had failed in ~13s with `open Dockerfile: no such file or directory` (confirmed directly from the Coolify build log via the dashboard) — production had been silently serving the pre-cleanup build (`a9418b7`) for ~20 hours. Restored all deleted files from git history, verified `npm run build` locally, pushed, and confirmed the next Coolify deploy succeeded (2m28s, `e8a230c`). Web-repo pushes are unblocked; resuming the rest of Phase 2 below.

### Lemon Squeezy variant IDs referenced by RN

**Already correct — no gap here.** `subscription.tsx`'s `BUY_LINKS` has all 4: Balanced monthly (`1959952`), Balanced yearly (`1959859`), Family monthly (`1959970`), Family yearly (`1959954`), and the Monthly/Yearly billing toggle is a real, working UI control (`subscription.tsx:318-326`) — this was completed in the 2026-07-31 RN Lemon Squeezy port session, verified still present now.

### Webhook lifecycle-event coverage

`app_11941c8fec_lemonsqueezy_webhook/index.ts`, re-read fresh (not from memory):
- **Signature verification: real.** Constant-time HMAC-SHA256 comparison (`verifySignature`, lines 8-32).
- **Registered for 8 events** (per the 2026-07-31 registration, webhook ID 123234) but **`handledEvents` only processes 4**: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired` (line 93). `subscription_resumed`, `subscription_paused`, `subscription_unpaused`, `subscription_payment_failed` are all silently acknowledged (`{received:true, message:"Event not handled"}`) without touching the database at all.
- Notably, the status-mapping logic just below (lines 140-151) **already has branches for `paused` and `past_due`** (`subscriptionData.status === "paused"` / `"past_due"`) — code that's currently unreachable because the event-name allowlist filters those events out before this logic ever runs. Widening `handledEvents` unlocks logic that's already written, not something needing new logic from scratch (aside from `resumed`, which needs an explicit `status = "active"` branch, and `payment_failed`, which should be covered by the existing `past_due` fallback if LS's payload reports that status).
- **`refunded` isn't a real Lemon Squeezy *subscription* lifecycle event** — refunds are an order-level concept (`order_refunded`) in LS's model, not a subscription-level one. Flagging this rather than fabricating a `subscription_refunded` handler for an event type that doesn't exist; if order-level refund handling is wanted, that's a separate event registration and a different code path (an order isn't a subscription row), worth a explicit decision rather than guessing at a mapping.
- Writes on match: `user_id, payment_provider, tier, billing_cycle, status, current_period_end, lemonsqueezy_customer_id, lemonsqueezy_subscription_id, updated_at` — `current_period_start` deliberately left null (no equivalent LS field, not fabricated).

### RN purchase/upgrade entry points (file:line)

- `subscription.tsx:136` — `handleUpgrade`, the actual checkout-initiation function (buy-link direct for fresh users, API+skip_trial for trial-used users)
- `subscription.tsx:397` — the "Upgrade" button calling it
- `family-budget.tsx:125` — `LockedFeatureModal`'s onClose navigates to `/subscription`
- `more-info.tsx:47` — "Pricing" menu item
- `settings.tsx:296` — "Manage" button (Subscription section)
- `GlobalHeader.tsx:156` — header menu item

### Family Dashboard / Receipt Scanner advertised as paid benefits

**Yes, on web — a real product-integrity finding.** `PricingPage.tsx` (separate from `Subscription.tsx`, the public marketing pricing page) explicitly lists both in its plan comparison table:
- Line 63: `{ name: 'Receipt Scanner', free: false, balanced: true, family: true }`
- Line 66: `{ name: 'Family Dashboard', free: false, balanced: false, family: true }` (family-exclusive)
- Line 48: the Family plan's own feature bullets include "Shared Family Dashboard"
- Line 38: the Balanced plan's feature bullets include "Receipt Scanner"

Both features are confirmed 100% fake (mock OCR with hardcoded receipts; randomized fake family-invite data — see 0c-2). **This means web is actively selling paying customers two features that don't work.** Not something to silently patch by building fake RN parity — flagging for Huzaifa's decision alongside the existing Family Dashboard/Receipt Scanner scoping question (Phase 5).

---

## 0c-4. Two Bug-Class Sweep: UI-Over-Dead-Backend + Unscoped Storage (2026-08-01)

Two targeted audits (report-only) across both repos, reconciling two independent passes — a fresh screen-by-screen parity diff and a dedicated two-bug-class sweep — into one list. Every finding below was independently re-verified by direct file/live-infrastructure reads before being written here (not transcribed from either report on trust); a couple of claims that didn't hold up under verification were dropped. **Report only — nothing in this section has been fixed yet**, except the two items marked "Fixed same day," which were pulled out for immediate action per Huzaifa's explicit instruction.

### CLASS 1 — UI over dead backend

Ranked by user-visible impact:

1. **RN "AI Smart Search" (`app/(tabs)/ai-search.tsx:22`) calls `ai_search`, which does not exist.** Verified directly against the live Supabase project (`nyhsnvjdgifphwkqzwel`) via `list_edge_functions`: no such function, under any name, is deployed — the 15 real functions all use the required `app_11941c8fec_` prefix; `ai_search` doesn't even follow that convention. Every real query 404s and silently falls through to a local keyword-matched FAQ bank (`KB` in the same file), contradicting the code's own comments framing that as an offline-only fallback. Gated `requiredTier="balanced"` — a paid feature that never once returns a real AI answer, only ever the canned fallback. Live and shipped.
2. **Web "Smart Search" (`src/pages/AISearch.tsx`) is 100% hardcoded regardless of query.** `handleSearch` only logs the query (`addSearch()`) and toggles `showResults` — the actual typed text never reaches any computation. Displayed results are a fixed 5-item array (`SAMPLE_RESULTS_EN/AR`) filtered only by category tab. No API call anywhere in the file. Same premium gate as RN's version. Live and shipped.
3. **RN `receipt-scanner.tsx` falsely claims to be wired up — fixed same day, see below.**
4. **"Enable Daily Reminders" (Dua of the Day) requests permission and sets a flag, schedules nothing — both platforms.** Web `components/DuaOfTheDay.tsx:56-69`: requests `Notification.requestPermission()`, on grant sets `localStorage['amanah-dua-notifications']='true'`, shows a success toast. No scheduling code anywhere references this key. RN `src/screens/DashboardScreen.tsx:391-404` (the Home tab): identical shape (`Notifications.requestPermissionsAsync()` → sets a flag → nothing schedules against it). Both are on the home screen, high-visibility.
5. **Family Budget (paid Family-tier flagship feature) doesn't actually share data between family members, either platform.** Web: `src/lib/familyBudgetSync.ts` does mirror local data to a real per-family Supabase table, but `FamilyBudget.tsx:66` still only reads `readLocal(userId)` — the shared server copy is written but never read back (explicitly commented in-code as an in-progress "Phase B step 1... reads flip in step 2" migration). RN's `family-budget.tsx` has no server call at all. Net effect on both: two family members on their own accounts never see each other's budget entries, despite this being the priciest plan's headline feature.
6. **`BackupRestore.tsx` (web) "Export/Restore All Data" silently drops tasks, family budget, and finance data.** `LOCAL_STORAGE_KEYS` lists dash-separated names (`amanah-tasks`, `amanah-family-budget`) but the app actually writes underscore-separated keys (`amanah_tasks`, `amanah_family_budget`, `amanah_finance`); the dynamic-key sweep only matches the `amanah-` (dash) prefix, missing every underscore-prefixed key too. A user who exports "all data" and restores it will find these three categories silently missing, despite the UI implying a complete export.
7. **`EmailDigestToggle.tsx` (web) shows a toggle state never re-verified against the server**, unlike `SubscriptionContext`'s self-correcting re-fetch pattern — compounds with the same key's Class 2 scoping gap below.

*(Not re-reported, already fixed/disclosed: Family Dashboard's fake invite stats, Receipt Scanner's mock OCR, the 5 disabled web notification categories, the VAPID demo key.)*

### CLASS 2 — unscoped per-user storage

Ranked by user-visible impact:

1. **Web: nearly the entire personal-data layer is unscoped raw `localStorage` — systemic, ~25+ files, highest impact of anything in this sweep.** RN uses `src/lib/userStorage.ts` (`getUserItem`/`setUserItem`) across nearly every screen; web's equivalent module exists but is essentially unused outside `familyBudgetSync.ts` (only `DailyRoutine.tsx` got scoped, in today's earlier fix). Every one of tasks, goals, transactions, prayer completion, dhikr counts/totals, Quran progress/bookmarks/last-read, wellness journal, fasting log, adhkar progress, dua favorites, bills, halal investments, ramadan planner, savings challenges, and receipts is read/written under a fixed global key. Confirmed directly: `contexts/AuthContext.tsx:74-81`'s sign-out only clears 2 of these keys — deliberately, per its own comment, to avoid destroying data that has no server backup. That's a real tradeoff the original author was managing, but it's solving the wrong half of the problem: per-user scoping (what RN already does, what `DailyRoutine.tsx` just got fixed to do) avoids the data-loss risk *and* the leak/overwrite risk at the same time, rather than trading one for the other. Net effect today: a second account on the same browser sees the first account's full personal history and silently overwrites it on save. Representative keys/sites (pattern repeats across each file list): `amanah_tasks` (`TaskManager.tsx:49,55` + Goals/Planner/ProgressAnalytics/WeeklyLifeScore/Index/SmartBriefing), `amanah-goals` (`Goals.tsx:26,35` + 6 more consumers), `amanah-transactions` (`ReceiptScanner.tsx:137,147` + 6 more consumers), `quran_pages_*`/`quran_bookmarks`/`quran_last_read` (`QuranReader.tsx:93,115,120,265`), `dhikr_count_*`/`dhikr_total_*` (`DhikrCounter.tsx:44,45,54,55`), `prayer_completed_*` (`PrayerTimes.tsx:140,147`), `fasting_today_*` (`FastingTracker.tsx:21,35,45`), `adhkar_progress_*` (`Adhkar.tsx:89,95`), `amanah-wellness` (`Wellness.tsx:19,33`), `dua_favorites` (`DuasCollection.tsx:163,169`), plus own-`STORAGE_KEY` patterns in `BillReminders.tsx`, `HalalInvestment.tsx`, `RamadanPlanner.tsx`, `SmartSavingsChallenges.tsx`. All reachable from the home page and primary nav — live and shipped.
2. **RN's Home-tab `DashboardScreen.tsx` still has unscoped raw reads — confirmed directly, this is the single highest-traffic screen in the app.** `AsyncStorage.getItem('amanah_tasks')` (215, 348), `'amanah-goals'` (217), `'amanah-transactions'` (218, 299, 346), `'amanah_family_budget'` (295, 347), `` `dhikr_total_${today}` `` (313). The dhikr one is a confirmed **stale-read bug on top of the scoping gap**: `dhikr.tsx` itself correctly writes via `setUserItem(`dhikr_total_${date}`, userId, ...)` (verified: `dhikr.tsx:73`), so Dashboard's raw unscoped read never sees what `dhikr.tsx` actually wrote — it reads a different, effectively-dead copy of the key.
3. **`BackupRestore.tsx` (web) import path is itself an unscoped cross-account data-transplant tool.** Its restore writes the same raw global keys with no scoping — if account A's exported backup is imported while account B is signed in on the same browser, B's data is silently replaced by A's.
4. **Partial family-budget scoping fix left 3 consumers reading the old legacy unscoped key (web).** `familyBudgetSync.ts`'s `` `amanah_family_budget:${user.id}` `` scoping is correct, but `components/Streaks.tsx:75`, `components/SmartBriefing.tsx:50`, and `pages/FinancialDashboard.tsx:19` still read the raw pre-scoping key directly. Before a user's data migrates: same leak as before the fix. After migration (which deletes the legacy key): these 3 widgets go permanently blank for budget-derived figures.
5. **`useDailySavingsTip.ts` (web) caches personalized, real AI-generated advisory text under a global key** (`CACHE_KEY = 'amanah-daily-savings-tip'`) — the cache-hit check only compares date/language, not user identity, so a second account on the same browser/day/language sees the first account's personalized tip. RN's equivalent (`savings-challenges.tsx`) already correctly scopes this via `getUserItem(TIP_CACHE_KEY, userId)`, confirming this is a real, fixable gap rather than an intentional difference.
6. **`SubscriptionContext.tsx` (both platforms) caches tier/trial state under global keys** (`amanahlife_subscription`, `amanah-trial-start`) — lower severity, self-correcting: `fetchSubscription()` re-queries per `user.id` on every mount, so this is only a brief flash of the wrong plan/trial banner before the real value loads, not a persistent leak.
7. **`EmailDigestToggle.tsx` (`amanah-email-digest-status`)** — unscoped and (per Class 1 #7) never re-verified from server, so a second account inherits the first account's toggle display indefinitely.
8. **Lower severity** — real per-user preferences, unscoped, but worst-case impact is a wrong reminder config or re-seeing onboarding/a promo, not a sensitive personal record: `PrayerReminderSettings.tsx` (`amanah-prayer-reminders`), `useSavingsNotifications.ts`, `Onboarding.tsx`, `PromoBanner.tsx`.

**Checked and excluded as plausible intentional device-level exceptions** (not flagged as bugs): `ThemeContext`/`LanguageContext`/`TimeFormatContext` on both platforms, and `useMetalPrices.ts`'s gold/silver price cache (genuinely global market data, not per-user).

**Not acted on yet, per explicit instruction** — the web-wide storage-scoping rollout, `BackupRestore.tsx` key-drift fix, and the AI Search decision (deploy a real backend vs. be honest about a scripted FAQ on both platforms) all await Huzaifa's scope decision on each. Only the two items below were pulled out for immediate action as confirmed, independent, low-ambiguity fixes.

### Fixed same day (pulled out of the report-only list per explicit instruction)

- **RN password reset was completely broken (user lockout) — fixed, commit `0b5890c`.** `(auth)/login.tsx` has always sent `resetPasswordForEmail`'s `redirectTo` as `amanahlife://reset-password`, but no such route existed anywhere under `app/`, and there was no `PASSWORD_RECOVERY` listener anywhere in `AuthContext.tsx` — every password-reset email led nowhere. Added `(auth)/reset-password.tsx` mirroring web's `ResetPassword.tsx` (new-password/confirm form, `updateUser` → `signOut` → redirect to login), registered in `(auth)/_layout.tsx`.
  - RN's Supabase client requires `detectSessionInUrl: false` (no browser URL bar to auto-parse the recovery link the way web gets for free), so this screen manually handles both link shapes Supabase can send for a recovery link, since which one this project's Auth settings actually produce isn't something inspectable from this session: PKCE (`?code=...` → `exchangeCodeForSession`) or the older implicit hash (`#access_token=...&type=recovery` → `setSession`). Also listens for `PASSWORD_RECOVERY` the same way web does, as a fallback.
  - **Verified**: route file exists and is registered in the `(auth)` stack; `app.json`'s `"scheme": "amanahlife"` is already configured (confirmed present — this is what lets Android route an `amanahlife://` link to the app at all); full-repo `tsc --noEmit` shows the same 26 pre-existing, unrelated errors as before this change (zero new); `expo export --platform android` produces a clean bundle.
  - **NOT verified, and cannot be without a device + real email account (neither available in this environment)**: the actual end-to-end round trip — requesting a reset, receiving the real email, tapping the link, Android resolving the intent and opening the app, the screen correctly capturing the incoming URL via `Linking.useURL()`, the code-exchange or hash-parse branch actually matching what this project's Auth settings really send, and successfully signing in with the new password afterward. This is a real, code-complete, typecheck-clean, bundle-clean fix — but it has not been exercised on a device. Recommend a real on-device test (or at minimum triggering a reset and inspecting the actual received link's format) before treating this as fully proven, and specifically before relying on it in place of another workaround.
- **RN `receipt-scanner.tsx` falsely claimed "Connected to Supabase ✓ / Real auth / Real data" — fixed, commit `e337f3b`.** Same honesty correction `family-dashboard.tsx` already received. Independent of any future OCR implementation decision.

### Device testing (preview APK) + production build, 2026-08-01

- **Preview APK for on-device testing of the reset-password fix**: build `0a70b814-f312-4ba6-8a0a-8686da957a16` (profile `preview`, distribution `internal`), commit `612d1f5` (includes the reset-password route, its expired/missing-token edge-case handling, and the receipt-scanner honesty fix). `.apk`: https://expo.dev/artifacts/eas/aJpzrS4jk-3Nx2WuzI987CNNv5mS20sTYvwIWBJZpeQ.apk. A first preview build (`fe2380f0`) was started, then cancelled and rebuilt from a newer commit after the edge-case fix landed one commit later — the version above is the correct, final one. Not yet confirmed working on-device by Huzaifa as of this writing (device testing was in progress).
- **Production `.aab`, versionCode 2 → 1.0.2**: Play Console confirmed the live release was still versionCode 1 (1.0.0), so versionCode 2 was free to use (the versionCode bump made earlier in this same session, to app.json, had never actually been submitted). Build `c8a46f29-16b0-430c-890d-10b2c9ebee36` (profile `production`, distribution `store`), commit `5644741` (version bump on top of `612d1f5` — includes everything in that commit plus every fix from this entire session's Phase 1-3 sweep: paid-feature entitlement/gating parity, the Coolify deploy-pipeline fix, the Lemon Squeezy webhook event-coverage widening + subscriptions status-check-constraint fix, Daily Routine storage scoping (web), the notification-honesty fix (web), the RN password-reset fix, and the receipt-scanner honesty fix). `.aab`: https://expo.dev/artifacts/eas/lWWmWL8Cl4fnJqHEwt8c4cSRyvBWGqda8CqwT7IztZs.aab. `tsc --noEmit` (26 pre-existing errors, zero new) and `expo export --platform android` both confirmed clean immediately before this build. Same signing keystore as the 1.0.1 build (`rZ4fXyj21G`). **`eas submit` was not run** — Huzaifa uploads to Play Console himself.

---

## 0c-5. Consolidated Work Order — Phase A: UI Parity Fixes (2026-08-02)

Found during real device testing of 1.0.2. Web is the reference; each fix required root-causing the Android-specific bug rather than just copying web's markup.

- **A1 — Dashboard Hijri date badge, commits `ebe81d9` (web+RN core fix) + `1bdcb81` (RN header-overlap follow-up, was left uncommitted the first time).** Root cause: same as web — `fetchHijri` called `api.aladhan.com/v1/gToH/...` on every load and hardcoded the English month name regardless of language, so on a slow/offline connection the badge was slow or simply never appeared, and Arabic mode still showed the month in English ("Safar" instead of "صفر"). Fixed on **both platforms** with a from-scratch local tabular-Islamic-calendar calculator (`src/lib/hijriDate.ts`, byte-identical on web and RN, independently verified against the standard reference date 1 Jan 2000 CE = 24 Ramadan 1420 AH before use) — renders instantly, works fully offline, and formats the month name and Arabic-Indic numerals correctly per the active UI language. Badge now always shows Hijri date first, Gregorian beneath, on both platforms. Also fixed on RN: the theme-toggle button overlapping the "Assalamu Alaikum" greeting row (`GlobalHeader.tsx`'s fixed `height: 56` had no overflow clipping, so larger font scaling or longer localized strings could bleed content past the header into whatever rendered below it — changed to `minHeight`), and the "Dua of the Day" card title truncating to "Dua of the" (RN's `flexShrink` defaults to 0, unlike web's CSS default of 1 — added explicit `flexShrink: 1` to the shared `cardTitle` style, which also fixed the Smart Briefing title sharing the same style).
- **A2 — Blog article links, commit `7f6291e`.** `src/lib/simpleMarkdown.tsx` only handled headings/bold/images, so every article's closing call-to-action link rendered as raw `[text](url)` syntax. Added link support: internal paths (`/subscription`, `/prayer-times`, etc.) navigate in-app via `router.push` on the equivalent `(tabs)` route; external links open via `expo-web-browser`'s `openBrowserAsync` (same pattern already used in `more-info.tsx`), falling back to `Linking.openURL` on failure. **Audited all 10 real article files (`seo/content/*.md` + `ar/`) for other unsupported markdown** per the explicit instruction — confirmed no lists, blockquotes, horizontal rules, inline code, or tables exist anywhere in real content, so none of that was built (would have been speculative, unused code). One pre-existing content issue found and reported, not silently fixed: `amanahlife-productivity-halal-finance.md` (EN) links to a stale placeholder domain `https://atoms.template.com/subscription` — needs a real decision on the correct destination, not a guess.
- **A3 — Blog list tag chips, commit `1b466c5`.** Android's blog cards showed no keyword chips; web's did. Root cause: the `keywords` frontmatter field from the source `.md` files was dropped entirely during the original web→RN content conversion into `blogContent.ts` — confirmed by reading the `BlogPost` interface (no such field existed) before assuming the data was merely unrendered. Restored the real `keywords` value for all 10 entries (5 EN + 5 AR), extracted directly from each source file's frontmatter, and added chip rendering to `app/(tabs)/blog/index.tsx` matching web's `BlogIndexPage.tsx`: first 3 keywords, comma-split, rounded-pill chips.
- **A4 — Dashboard feature grid, commit `344657a`.** Web's "Quick Actions" grid is 2 columns (`grid-cols-2`) with larger `p-4` cards showing icon + title + a short description line; RN's was 3 compact centered tiles with icon+title only and no description. Changed `DashboardScreen.tsx`'s grid to 2 columns (`gridItem` width 47%, gap 12, left-aligned instead of centered) and restored the description line using the exact same bilingual strings already present in web's `navItems` array (`Index.tsx`) — not invented copy. Settings has no web equivalent in that array so is left without a description rather than fabricating one.
- **Verification for A1–A4**: `tsc --noEmit` shows the same 26 pre-existing/unrelated errors as baseline throughout (zero new introduced by any of these changes — confirmed none of the 26 errors touch the files changed), `expo export --platform android` produces a clean bundle after each. **A4's layout was checked by hand at representative small-phone (~360dp) and tablet (~768dp+) widths using the percentage-based flex-wrap math (no overflow/wrapping breakage at either), not confirmed via an actual device or emulator screenshot** — this RN repo has no `react-native-web` target to preview in a browser, and no EAS build was triggered per the explicit instruction not to touch EAS this pass. None of A1–A4 has been exercised on a physical device by Huzaifa yet.

---

## 0c-6. Consolidated Work Order — Phase B: Offline Quran + Local Prayer-Time Calculation (2026-08-02)

Approved plan (tafsir explicitly excluded - no verified trustworthy English source exists for Ibn Kathir/As-Sa'di, skip entirely for now). All numbers below are real, measured this session, not estimated.

### B1 — Offline Quran, RN
- **B1a, commit `28c40ea`**: swapped `quran.tsx`'s translation from `en.asad` (Muhammad Asad) to `en.sahih` (Saheeh International) - matches the pre-launch doc's own "trusted, scholarly" bar. Web already had this fix (Task 8 Phase A); it had never been mirrored to Android.
- **B1b, commit `636412d`**: bundled the full Arabic Uthmani text, the Saheeh International translation, and all 114 surahs' metadata directly in the app - real data fetched once from the live `api.alquran.cloud` API and committed as 228 per-surah JSON asset files (`assets/quran/ar/{1-114}.json`, `assets/quran/en-sahih/{1-114}.json`) plus `src/data/quranSurahList.ts`. Loaded via a per-surah `switch` (not an eager object literal) in `quranArabicAssets.ts`/`quranTranslationAssets.ts` so only the surah actually opened gets parsed into memory, not all 114 at once. `quran.tsx` makes zero network calls now.
- **Measured app-size impact**: `entry.hbc` grew from 5.8 MB → 8.56 MB (**+2.76 MB**) in `expo export --platform android` - Metro inlines required `.json` as bundled JS rather than treating it as a lazily-downloaded binary asset, so the full dataset is present in the compiled bundle regardless of the lazy-`switch` design (that design's benefit is deferred parse time/memory at runtime, not APK size - documented in the B1b commit).
- **Measured load-time, before vs after** (real, not estimated):
  | | Before (network fetch) | After (local) |
  |---|---|---|
  | Al-Fatihah (7 ayahs) | ~0.66s (parallel Arabic+translation fetch, measured against the live API) | ~1.1 ms (file read + `JSON.parse`) |
  | Al-Baqarah (286 ayahs, largest surah) | ~1.0s | ~4.7 ms |

  ~200-600x faster, and works with zero network - the actual goal.

### B2 — Local prayer-time calculation (adhan-js), RN + web
- **B2a, commit `f0ec070`**: new `src/lib/prayerCalculation.ts` wraps `adhan` (batoulapps/adhan-js - verified via npm registry: zero runtime deps, 25k weekly downloads, actively maintained). Exposes all 13 calculation methods adhan-js supports, **Umm al-Qura as default** (was hardcoded ISNA/`method=2` - wrong for this app's actual Gulf/MENA target markets per the Play Billing pending item below). Also resolves each coordinate's real IANA time zone via the new `tz-lookup` dependency + `Intl.DateTimeFormat`, so a manually-picked city displays correctly even when it's in a different zone than the device.
- **B2b/B2c, commit `84ee982`**: `prayer-times.tsx` no longer fetches `api.aladhan.com` at all. Location is automatic (GPS, now wrapped in a 10s timeout - **there was none before**, so a stuck GPS fix could previously hang the screen indefinitely - falling back to `getLastKnownPositionAsync()` then Mecca) or manual: search + pick from `src/data/curatedCities.ts`, a new **68-city curated list** (Gulf/MENA first, then major world cities) with real coordinates fetched live from the free Open-Meteo geocoding API (open-meteo.com, no key required) on 2026-08-02 - not fabricated. A full geo-database (the `cities.json` npm package) is **19.5 MB unpacked**, confirmed too large to bundle, hence the curated subset.
- **B2d, commit `893c491`** (priority sub-item, its own commit per explicit instruction): `prayerNotifications.ts`'s old `fetchUpcomingTimings()` fetched Aladhan's `/calendar` endpoint and **swallowed any failure silently** - confirmed directly by reading the code, not assumed - leaving `schedulePrayerNotifications()` to see an empty timings map and just `return`, with **zero reminders scheduled and no error ever surfaced to the user**. `notificationPreferences.ts`'s Suhoor/Iftar scheduler shared this exact function, so it shared the exact same silent failure. New `src/lib/prayerLocation.ts` centralizes location/method resolution so both the screen and the schedulers always compute against the same persisted settings; the new `computeUpcomingTimings()` is local-only and **cannot come back empty**, structurally eliminating that failure mode. The one real failure mode left (notification permission denied) was **also** silent before - now surfaced via a bilingual `toast.error()` in both schedulers.
- **B2e, commit `1da44fa`** (web repo, `AmanahLifeapp`): mirrored B2a-c to `PrayerTimes.tsx` - same `adhan`/`tz-lookup` libs, same Umm al-Qura default, same 68-city curated list. Web's browser geolocation already had a timeout (`{ timeout: 5000, maximumAge: 300000 }`, bumped to 10s to match RN), so it didn't share RN's GPS-hang bug.
- **Measured load-time, before vs after** (real, not estimated): a single live `api.aladhan.com/v1/timings` fetch measured ~1.1s from this environment (mobile networks would typically be slower, not faster). A single local `calculatePrayerTimes()` call (coordinates → 6 formatted times, including the `tz-lookup` zone resolution and `Intl.DateTimeFormat` calls) measured **0.42ms average over 100 calls** - roughly **2,600x faster**, and works with zero network, directly fixing the confirmed silent-scheduling-failure bug above.

### Packaging note (informational, not a blocker)
`adhan@4.4.4`'s CJS build (`lib/cjs/Adhan.js`) is broken for plain Node.js `require()` - the package root declares `"type":"module"` but `lib/cjs` has no `package.json` override, so Node's strict ESM loader rejects it (reproduced directly, twice, via two different invocation methods). **Metro's bundler resolver does not have this problem** - confirmed via real `expo export --platform android` runs after wiring this into `prayer-times.tsx` (bundled clean, 2096 modules). Vite (web) also has no issue, since it resolves the package's proper ESM `exports` condition. Upstream `adhan-js` packaging defect worth knowing about if this dependency is ever touched again; not a defect in this integration.

### Not yet done
Mirroring the local-calculation fix to web's separate `PrayerReminderSettings.tsx` (its own same-day Aladhan-based scheduler, distinct from `PrayerTimes.tsx`) was **not** part of this approved plan - the approval named `PrayerTimes.tsx` specifically. Flagging in case Huzaifa wants that mirrored too in a future pass.

---

## 0c-7. Consolidated Work Order — Phase C: Excused Days (عذر شرعي) in Prayer/Fasting Trackers (2026-08-02)

Approved after a research pass that corrected several assumptions in the original plan - see below before the implementation summary, since these corrections shaped the actual scope.

### What the research found before any code was written
- **No existing missed/made-up (qada) distinction existed anywhere.** `fasting.tsx`'s "Missed vs made-up summary" was misleadingly named - it was just `missedDays = 30 - fastedDays`, no per-day excused/made-up flag anywhere in stored data. This phase built qada tracking from scratch, not extending something that already existed.
- **Prayer streaks were 5-6 independently duplicated implementations** (`DashboardScreen.tsx` ×3, web's `Streaks.tsx`/`Index.tsx`/`SmartBriefing.tsx` ×3) that didn't even agree with each other on what counts as "a miss" (`completed.length >= 1` in three places, `>= 5` in two). All 6 needed individual patches.
- **`progress-analytics.tsx`'s streak display is dead code on both platforms** - reads `amanah-streaks`, a key never written anywhere. Not touched.
- **Confirmed zero Supabase sync exists for prayer/fasting data on either platform today** - the device-local-only privacy requirement was easier to satisfy than expected, since it's already the norm for this whole data category, not a special case to carve out of a sync pipeline.
- **RN's Backup/Restore already sweeps `prayer_completed_`/`fasting_today_`; web's has a pre-existing, separate gap where fasting isn't covered at all.** New `excused_` keys match neither sweep by construction (verified), plus an explicit "do not add" comment was added at both sweep sites as insurance.
- **Web's whole prayer-streak ecosystem (`Streaks.tsx`, `Index.tsx`, `SmartBriefing.tsx`) reads `prayer_completed_<date>` as raw, unscoped `localStorage`** (a separate, pre-existing gap, not fixed here). The new excused-period exclusion checks still needed the *real* signed-in userId to find periods (which ARE written scoped, via `getUserItem`/`setUserItem`) - `useAuth` was added to `Streaks.tsx`/`SmartBriefing.tsx` (neither had it before) purely for this lookup, without touching the surrounding unscoped reads.
- **Family Dashboard (RN) is a fully unbuilt scaffold reading no data at all.** Web's `FamilySharedDashboard.tsx` was already fixed in an earlier audit to explicitly *not* render other members' prayer/fasting data. Nothing live needed excluding; documented as a constraint for whenever real family sharing is eventually built.

### Fiqh mapping (exact scope approved)
| Reason | Prayer | Fasting |
|---|---|---|
| Menstruation (حيض) / Nifas (نفاس) | Waived entirely, **never** made up (no qada mechanism exists for this - by design) | Excused, feeds qada owed |
| Illness (مرض), not incapacitated | Not excluded - still tracked/expected (shortening/combining is a fiqh allowance the app doesn't model, not a waiver) | Excused, feeds qada owed |
| Illness (مرض), `illnessIncapacitated` checked | Excluded from tracking/streaks/stats. **The app takes no fiqh position on qada-vs-waived** - shown a disclaimer (bilingual, IslamWeb/mainstream Ahlus Sunnah wal Jama'ah framing, "consult a knowledgeable source") and required to choose explicitly per period (`illnessPrayerChoice: 'qada' \| 'waived'`, no default) | Excused, feeds qada owed |
| Travel (سفر) | Not excluded - qasr/shortening is a fiqh allowance the app doesn't model, not a waiver | Excused, feeds qada owed |

### Implementation (RN commits)
- **C1 (`612bece`)**: `src/lib/excusedPeriods.ts` - the model above, plus qada-owed computation that's **recomputed live from real prayer/fasting records on every call, never independently incremented** (can't drift out of sync).
- **C2 (`bea6898`)**: `src/components/ExcusedPeriodsModal.tsx` - disclaimer (shown once, re-openable), add/list/end/delete periods, qada tick-off. No native date-picker dependency added (would need a fresh EAS build this pass wasn't allowed to trigger) - dates use "N days ago" steppers instead. Discreet entry point wired into `prayer-times.tsx` (small muted text link, no dashboard tile).
- **C3 (`389f79b`)**: all 3 RN streak sites in `DashboardScreen.tsx` skip excused-for-prayer dates instead of breaking the streak.
- **C4 (`4b51dc2`)**: `weekly-life-score.tsx`'s spiritual-score denominator excludes excused days (two-pass computation so a day's loop position can't skew the result).
- **C5 (`7728e96`)**: `fasting.tsx`'s missed count excludes excused days (`30 - fastedDays - excusedDays`), new 3rd summary stat + 3rd grid color (gold, distinct from the "missed" red), discreet entry point.
- **C6 (`5270294`)**: explicit "do not sweep" comment at `settings.tsx`'s `BACKUP_KEYS`/`DYNAMIC_KEY_PREFIXES`.

### Implementation (web mirror, `AmanahLifeapp` repo commits)
`66e1dcd` (lib + dialog), `8393f1b` (streaks ×3), `8e7c3ad` (Life Score), `f236fb0` (fasting + both entry points), `1eb306e` (BackupRestore.tsx exclusion note). Same fiqh logic, same storage key names, synchronous localStorage instead of async AsyncStorage.

### Verification
RN: `tsc --noEmit` 26 baseline throughout (zero new), `expo export --platform android` clean after every commit. Web: `tsc --noEmit` 0 errors throughout, `npm run build` (vite build) clean.

### Not built (explicitly out of scope this pass)
- Prayer qada for genuine incapacity is now a real, working feature (per the disclaimer-then-choice design above) - this was the one open question from the original plan, resolved by the disclaimer approach rather than left pending.
- Illness's *default* (non-incapacitated) case intentionally still tracks prayer normally - the app doesn't model qasr/combining, so there's nothing to change there.

---

## 0c-8. Phase F: Critical UX/Functional Fixes from Real Testing — Stage 1 (2026-08-02)

Stage 1 of 4 (ranks above Phase D - Family Dashboard/Receipt Scanner/AI Search/Play Billing stay untouched). RN only this stage (web parity noted where relevant, not built unless explicitly asked).

- **F1.1 — manual dark/light toggle didn't work, commit `2778098`.** Root cause: `ThemeContext.tsx` had no `themeMode` at all - only a resolved `theme` value plus an independent `autoSwitch` boolean, coordinated by nothing. Once auto-switch was ever turned on (via its own separate `settings.tsx` toggle row), its effect re-fired on every app mount and every 15 minutes, unconditionally overwriting `theme` with the sunrise/sunset-computed value - silently reverting any manual choice, most visibly on app restart. **Confirmed web's `ThemeContext.tsx` already had the correct `themeMode: 'manual'|'auto'` pattern** (properly gated) - this was an RN-only regression introduced when the port diverged from web's already-correct design, not a shared bug. Fixed by introducing `themeMode: 'auto'|'light'|'dark'` as RN's single source of truth too, gating the auto-switch effect on `themeMode === 'auto'`. `autoSwitch`/`setAutoSwitch` kept as backward-compat aliases - no other call site needed changes.
- **F1.2 — future days unselectable in planner calendar, commit `260f0e7`.** Root cause was NOT a `date !== today` disabled condition (none existed) - two separate gaps: (1) the monthly view's day cells were plain `<View>` with no press handler at all, so literally no day (past/today/future) was selectable; (2) the weekly view's day selection (`selectedDay` state, added in an earlier session) existed but was never wired into the add-event form - the FAB always opened with a blank/today date regardless of which day was tapped. Fixed: monthly cells are now `TouchableOpacity` (gold-outline selected state, distinct from today's teal fill); FAB pre-fills `newItem.date` from `selectedDay` when view is weekly/monthly. **Web's `Planner.tsx` has the same underlying gap** (no day-selection state in either view - it was an RN-only addition from a prior session) - not mirrored this pass since not explicitly requested; flagged for awareness.
- **F1.3 — lock icon overlapping "premium feature" label: audited, not reproducible in current code.** Checked every lock+label site on both platforms: `PremiumGate.tsx` (RN + web), `LockedFeatureModal.tsx` (RN + web), `family-budget.tsx`, and every screen wrapped in `PremiumGate` (ai-life-coach, ai-search, financial-dashboard, savings-challenges, weekly-life-score). Grepped both repos for every lock emoji variant and every `position: 'absolute'` usage app-wide. Every lock+label instance already uses plain vertical flexbox (`View` with `alignItems:'center'` containing stacked `Text` nodes) - no absolute positioning, no overlap mechanism present. Per Huzaifa: treat as checked-and-clear for now: not fixed (nothing to fix), not fabricated. If seen again on a real device, needs the exact screen name to re-investigate.

**Verification**: `tsc --noEmit` 26 baseline throughout (zero new), `expo export --platform android` clean after both fixes.

### F1.1 regression found post-completion (2026-08-05) — web header toggle no-op in auto mode, commit `c14945f` (`AmanahLifeapp` repo)

Found after F1.1 was marked complete above — not a fresh bug, a gap in that fix's own coverage. F1.1's investigation checked web's `ThemeContext.tsx` and confirmed its auto-switch *effect* was already correctly gated (`if (themeMode !== 'auto') return;`), so web was judged unaffected and left untouched. That check didn't cover `toggleTheme()` itself, which had a **separate, silent defect**: `if (themeMode === 'manual') { setTheme(...) }` with no `else` — meaning the header's light/dark toggle button called `toggleTheme()`, which no-opped completely (no flip, no revert, no error) whenever `themeMode === 'auto'`. Confirmed RN's `toggleTheme` (the actual F1.1 fix) was never affected by this — RN's version always resolves an explicit theme and calls `setThemeMode`, unconditionally exiting auto mode.

**Fixed**: web's `toggleTheme()` now always calls `setTheme(...)` and follows with `setThemeMode('manual')`, so tapping the header button while in auto mode explicitly overrides it — the header toggle and the Settings auto-switch control are confirmed to be two entry points into the exact same `themeMode` state (single `ThemeProvider` instance, one `ThemeContext.tsx` file, no drift). Before: tap did nothing while auto was on. After: tap immediately sets an explicit theme and takes the app out of auto mode, matching RN's behavior.

**Verification**: `npx tsc --noEmit` clean (0 errors), `npm run build` (vite build + prerender) clean. Live click-through in the browser preview hit a tab-permission gate that didn't resolve this session, so the fix was verified statically (typecheck + build) rather than by an actual click-test; flagging this rather than claiming a UI test that didn't happen.

### Blog Android-vs-web parity audit + fixes (2026-08-06), commits `b3334b7`, `0f8707d`, `a53e55b`, `332b607`

Audited RN's native blog reader (`app/(tabs)/blog/*`, built in an earlier session) against web's, item by item: list-card layout, article-detail markdown rendering, and full 10-article content inventory. All 10 real articles confirmed present on both platforms with matching titles/slugs/langs, no fewer, no placeholders. Heading levels, bold rendering, link routing, tag-chip logic, sort order all verified correct already. Found and fixed 4 real gaps, one commit each:

- **`b3334b7`** — list-card hero image was a fixed 160dp height (crops more than web); now a true 16:9 `aspectRatio` box matching web's `aspect-video`.
- **`0f8707d`** — detail-screen hero image was forced to 200dp height + 12px border-radius + cover-crop; web renders it unstyled (natural aspect ratio, square corners) since `markdown-to-jsx`'s `prose` output has no image override. New `ArticleHeroImage` component (`src/lib/simpleMarkdown.tsx`) resolves the real ratio via `Image.getSize` and renders uncropped, matching web.
- **`a53e55b`** — RN's custom markdown renderer (`simpleMarkdown.tsx`) had no single-asterisk italics support; `*amanah*`, `*deen*`, `*dunya*` (3 words across 2 of the 10 articles) rendered as literal asterisks instead of italic text. Added an italic branch to the inline-span regex, ordered after bold so `**bold**` still matches first.
- **`332b607`** — web's blog list page has a header-banner tagline ("Articles and tips to enhance your balanced lifestyle") that RN's shared `PageHeader` had no slot for, so it was silently dropped. Added an optional `subtitle` prop (backward-compatible - every other screen's header height is unchanged when unset) and wired it into the blog list screen. Audited all 32 other `PageHeader` call sites against their web counterparts - confirmed blog was the only screen with a real dropped tagline; every other screen either already mirrors what little header text web shows, or web's own shared header component has no subtitle to port in the first place.

**Left alone on purpose**: one broken internal link (typo'd slug `amanahlife-islamah-spiritual-companion`) exists in the shared markdown source content, breaking identically (404) on both platforms - not fixed here since it's a shared content issue, not an RN-vs-web parity gap; flagged for a separate content fix if wanted.

**Verification**: `tsc --noEmit` 26 baseline throughout (zero new), `expo export --platform android` clean after all 4 commits.

### Stage 2 — Color contrast + design-token audit, commit `56541c9`

Real WCAG 2.1 contrast calculation (no axe-core equivalent exists for RN views - this is the RN-appropriate automated check) across every text-token/background-token pairing actually used, both themes.

**Found**: light mode's `teal`/`gold`/`green` all failed 4.5:1 against `bg`/`card` (2.99-3.94:1) - `gold` was worst, failing even the 3:1 large-text minimum against `bg` (2.99:1); `red` borderline-failed (4.43:1). Dark mode's `red`/`blue` failed 4.5:1 against `surface`/`card` (4.12-4.28:1, passed the 3:1 large-text minimum but not normal text). **Confirmed root cause of both named examples in the ticket**: the "Enable Daily Reminders" button and the prayer-streak value text (`src/screens/DashboardScreen.tsx`) both use the failing light-mode `gold` token directly.

**Fix**: darkened light-mode teal/gold/red/green and brightened dark-mode red/blue (hue-preserving HSL adjustment) until every token clears 4.5:1 against the harder of its two real backgrounds, with a small safety margin. Re-audited after: zero failures in either theme. Named examples verified: gold-on-card now 5.06:1 light / 6.37:1 dark (was 3.25:1 / 6.37:1).

Also fixed 2 hardcoded hex text colors bypassing the theme system entirely (`giving-tracker.tsx`'s stale-price warning, `weekly-life-score.tsx`'s lowest-dimension callout) - neither adapted to dark/light mode; both now use `colors.gold`.

**Not done**: web uses a structurally different theming system (HSL CSS custom properties in `index.css`, not literal hex constants like RN's `ThemeContext.tsx`) - this was an RN-only audit/fix; web needs its own separate pass if requested, not a hex-for-hex mirror (the underlying value shapes don't correspond 1:1).

### Stage 3 — Quran back-navigation bug, commit `fad0c88`

Root cause: `quran.tsx`'s index/reader distinction is local component state (`selectedSurah`), not a real navigation-stack route - there's only one `quran` route total. The on-screen back arrow already worked correctly via `goBack()`. Android's hardware/gesture back button was never intercepted, so it fell through to expo-router's default stack pop - which only knows about the single route, not the internal state - sending it straight past the surah index to whatever was on the stack before Quran (Home), regardless of entry point. Fixed by wiring in the existing `useBackToClose` hook (already used elsewhere in the app for this exact "custom back button works, hardware back doesn't" pattern on sheet/modal screens) - active only while a surah is open, so hardware back now always returns to the index first.

**Confirmed web's `QuranReader.tsx` has the identical gap** (same single-route + local view-state architecture, only the on-screen button is wired, no `popstate` interception for the browser back button) - not fixed this pass since not explicitly requested; flagged for awareness.

**Verification**: `tsc --noEmit` 26 baseline (zero new), `expo export --platform android` clean.

### Stage 4 — Adhkar content completeness audit, commit `7dcf0bd`

Exported the app's current morning (8 items) + evening (6 items) `ADHKAR_DATA` from `app/(tabs)/adhkar.tsx` and compared item-by-item against Hisn al-Muslim (Fortress of the Muslim), cross-referencing two independent sources (`hisnmuslim.com`'s "Words of Remembrance for Morning and Evening" chapter and `ahadith.co.uk`'s numbered dua list, items 75-94) since the two sites use different item-numbering conventions for the same chapter — cross-checking both against each other and against well-established hadith wording (e.g. Sayyid al-Istighfar, Bukhari 6306) resolved the numbering discrepancy and gave confidence in the final list.

**(a) Missing items found: 21 total** (11 added to morning, 10 added to evening — one item, "Allahumma ma asbaha/amsa bi min ni'matin," already existed on the evening side only, so only its morning counterpart needed adding). Missing items included some of the most well-known duas in the chapter: **Sayyid al-Istighfar** ("Allahumma anta Rabbi la ilaha illa anta...", the specific dua the Prophet ﷺ called the best form of seeking forgiveness) was entirely absent from both categories, along with the ushhidu-witnessing dua, the health/refuge trio, "Alimal-ghaybi wash-shahadah," "Radeetu billahi rabban," "Ya Hayyu Ya Qayyum," the fitratil-Islam declaration, "Subhanallahi adada khalqihi," the 100x istighfar, and Surahs Al-Ikhlas/Al-Falaq/An-Nas (all three, recited together, part of the same chapter per both sources).

**(b) Wrong repetition counts found: 3** (present in both morning and evening, so 3 distinct errors × 2 categories = both `m`/`e` pairs fixed):
- "Subhanallahi wa bihamdihi" — app had **33x**, both sources agree on **100x**.
- "La ilaha illAllahu wahdahu la sharika lah" — app had **3x** with truncated text; both sources give the fuller "...lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir" wording at **10x** (Sahih Muslim 2692 — this exact fuller phrase recited 10 times in the morning carries the specific reward cited in the hadith; the app's shorter wording doesn't match what that count applies to, so text and count were corrected together).
- "Allahumma inni as'aluka al-'afwa wal-'afiyah" — app had **3x**, both sources agree on **1x**.

**Before/after item count**: morning 8 → 19, evening 6 → 16 (32 combined, up from 14).

**Sources cited**: `hisnmuslim.com` (dedicated Hisn al-Muslim site, English) and `ahadith.co.uk/hisnulmuslim-dua-27` (item-numbered English translation), cross-checked against standard hadith wording for high-confidence items. **Caveat**: both source fetches returned summarized/paraphrased text rather than raw HTML, so exact Arabic diacritics for the newly-added items were authored from well-established, widely-published canonical wording rather than copy-pasted verbatim from either fetch — transliteration and translation for every new item were verified consistent across both independent sources before being added. Given the sensitivity of scripture-adjacent text, a native-Arabic-reading review pass before next release would be a reasonable extra precaution, though not one Claude Code can perform itself.

**Not touched**: `afterPrayer` and `sleep` categories — the ticket named only "morning/evening adhkar," and those two categories weren't in scope. Web's `Adhkar.tsx` was not audited/mirrored this pass — not explicitly requested.

**Verification**: `tsc --noEmit` 26 baseline (zero new, zero in `adhkar.tsx`), `expo export --platform android` clean.

### Stage 4 addendum — Arabic sourcing re-verification, commits `f3d0cf2` + `0fd9647`

The Stage 4 caveat above (summarized/paraphrased fetches, not raw HTML) was flagged as a real gap. Huzaifa asked for a re-do using genuinely raw text, cross-checked between two sources. Re-sourced via the real browser's DOM extraction (`get_page_text`, not the summarizing `WebFetch` tool) against **hisnmuslim.com** and **sunnah.com/hisn** (item-by-item, hadith 75a-94 — independently confirms the same chapter boundary `ahadith.co.uk` used). **IslamWeb.net could not be used** — confirmed via their own library search (zero results for "حصن المسلم") and their one relevant fatwa page (279817, discusses the book's authenticity only, doesn't reproduce its text) that they don't host this content; substituted `sunnah.com` per the already-approved fallback list.

**Two-source-confirmed corrections, commit `f3d0cf2`**:
- Ushhidu-witnessing dua (m10/e8): "وَمَلَائِكَتَكَ" → "وَمَلاَئِكَتِكَ" (both sources use the kasra/idafa form).
- Three Quls (m19/e16): added the Basmalah before each surah (both sources have it, the app didn't), switched to the "*" ayah-separator both sources use, corrected the Al-Ikhlas closing word to match both sources and the Quran text itself.

**Pre-existing truncations found and fixed, commit `0fd9647`** (predate Stage 4, surfaced incidentally by the same raw-source comparison): `m1`/`e1`, `m5`, and `m6`/`e4` were each cut down to a first clause; restored to the full canonical text confirmed by both sources. Also added `m20`/`e17` — a distinct dua from the same chapter ("Asbahna/Amsayna wa asbahal-mulku lillahi Rabbil-'alameen... khayra hadha al-yawm/hadhihil-laylah") confirmed present in both sources, not previously in the app.

**Held per Huzaifa's explicit instruction — not changed, decision pending**:
1. `e14` ("Subhanallahi 'adada khalqihi" in the evening category) — both sources annotate this dhikr "إذا أصبح" (morning only); neither documents an evening version. Not removed; awaiting a decision on whether to keep it as a convenience duplicate or drop it.
2. Two genuine cross-source spelling disagreements, left as-is: "شِرْكِهِ" vs "شَرَكِهِ" in the Alimal-ghaybi dua (m13/e10), and "شَأْنِي" vs "شَأْنِيَ" in Ya Hayyu Ya Qayyum (m15/e12). Both sources are legitimate primary sources that disagree with each other — not resolved in either direction.
3. `m18`/`e15` (Astaghfirullah, 100x) — confirmed via hisnmuslim.com only; fell outside sunnah.com's numbered range for this chapter (75-94), so not independently re-confirmed via a second raw source this pass. Not removed.

**Verification**: `tsc --noEmit` 26 baseline (zero new, zero in `adhkar.tsx`) after both commits, `expo export --platform android` clean after both.

**Not done**: the shirkihi/sharakihi and sha'ni/sha'niya variants, the e14 scope question, and the single-sourced Astaghfirullah item all still need Huzaifa's decision before any further code change.

---

**Phase F: all 4 stages complete.** Phase D (Family Dashboard, Receipt Scanner, AI Search, Google Play Billing) remains untouched, pending a future decision.

---

## 0d. Pending / Deferred Items

1. **Google Play Billing integration — HARD BLOCKER before Production Play Store release.** GCC/MENA target markets (Saudi Arabia, UAE, Qatar, Egypt, Kuwait, Iraq) have no exception to Google's billing policy (unlike the post-Epic-v-Google US injunction). Play Billing is fully live in these markets, so the current Lemon Squeezy-via-in-app-browser flow is a real Play Store rejection risk. Requires: native billing library (e.g. `react-native-iap`), matching Play Console subscription products, and backend receipt validation. **Internal Testing does not require this fix — only Production does.**
2. Apple App Store / iOS build — not started.
3. Founder photo on About page — placeholder in place (`TODO(Huzaifa):` marker in code), Huzaifa to provide professional photo.
4. Play Store screenshots — captured from device by Huzaifa, committed to `assets/play-store/screenshots/`.
5. ~~Atoms Dev migration~~ — **done 2026-07-04.** Web app now runs on the Hostinger VPS via Coolify, fully independent of Atoms Dev. (`MIGRATION-COMPLETE.md`/`DEPLOYMENT.md` in the `AmanahLifeapp` repo documented this but were removed 2026-07-31 as dead scaffolding — the completed migration is summarized in the Web hosting row above.)
6. **6 Android placeholder screens — 4 built 2026-07-23, 2 held on purpose.** Per Huzaifa's decision, Bill Reminders, Financial Dashboard, Halal Investment, and Savings Challenges are now real (see `audit/phase7-screens-summary.md`). Still pending, deliberately:
   - **Family Dashboard** — needs a real decision, not just a port. The web version's "invite a family member" doesn't send any invite or sync anything — it creates a local fake record with a *randomly generated* prayer streak and Quran-pages count, and the "accountability score"/"streak comparison" are built on that fabricated data. A real version needs an actual invite flow + shared-data model (new Supabase table, cross-device sync) — meaningfully bigger scope than a port.
   - **Receipt Scanner** — the one to think hardest about. It's **100% fake on web right now**: "scanning" is a `setTimeout` + a random pick from 4 hardcoded mock receipts, while the UI says "AI analyzing receipt." Building it for real needs actual OCR (on-device library + native module work, or a cloud OCR API with ongoing per-call cost) — the most expensive of the six by a wide margin.
7. **Real web push notification infrastructure — needs building from scratch, same tier as Family Dashboard/Receipt Scanner.** Investigated 2026-08-01 while attempting to port RN's real bill/goal/fasting notification scheduling to web (Phase 3). Web-only; **Android's `prayerNotifications.ts`/`notificationPreferences.ts` scheduling is real and completely unaffected by any of this.**
   - **What's missing, confirmed directly (not assumed)**: `pg_cron` extension is **not installed** in the Supabase project (`installed_version: null`) — there is no scheduling mechanism at all. `app_11941c8fec_push_notify`'s `send_notification` action has **zero callers anywhere**, client or server. Its actual send implementation is also not real Web Push protocol — a raw unauthenticated `fetch()` to the subscription endpoint with a plaintext body, not the VAPID-JWT-signed + AES128GCM-encrypted payload real push services (FCM, Mozilla autopush) require (RFC 8291/8292).
   - **Found and fixed in the same pass, 2026-08-01 (commit `fab563d`)**: `useNotifications.ts`'s `subscribeToPush` used a **hardcoded placeholder VAPID public key** — the well-known public demo key from Web Push tutorials, not a real key paired with anything on our server. Every subscription it ever created was permanently unable to receive a push regardless of anything else being fixed. Removed entirely (no replacement key substituted — that's follow-up work, not a fix to make now).
   - **`app_11941c8fec_push_subscriptions` currently holds 4 rows, all bound to that dead demo key** — confirmed by direct query. They must be purged and their owners prompted to re-subscribe once real VAPID keys are generated and a real send path exists; purging now would just delete rows with nothing to replace them, so left in place for now.
   - **What is real and was preserved**: `PrayerReminderSettings.tsx`'s same-day reminder scheduler — real `setTimeout` calls against live Aladhan API prayer times (via geolocation), displayed through the service worker's `showNotification`. It was previously (accidentally) gated behind the fake subscription's `isSubscribed` flag; decoupled to gate on `Notification.permission` alone, which is genuinely all it needs. Added honest copy (EN/AR) that it only fires while the tab stays open and points users to the Android app for background reminders.
   - **UI honesty fix applied**: the other 5 categories (bill/habit/fasting/savings/general) in `NotificationSettings.tsx` do not schedule or send anything real on either the old or new code path — disabled with a "Coming soon — available on Android" badge instead of left live, preferences still save/load so nothing is lost once real infrastructure lands. The redundant `prayer_reminders` toggle in that same panel was removed outright (the real prayer control is the dedicated panel rendered directly below it on the Settings page).
   - **What real infrastructure would need** (not built, scoping only): a scheduling mechanism (enable `pg_cron`, or use Supabase's scheduled-function config, to run periodically); a rewritten `send_notification` implementing real VAPID-signed, encrypted Web Push; a new job that queries bills/goals/fasting-relevant timings due soon across all users with the relevant preference enabled and calls that real send path; generating real VAPID keys and wiring them through client + server; purging the 4 dead subscription rows and prompting re-subscription once the above exists.

---

## 0e. External Services

- **Supabase** — project ref `nyhsnvjdgifphwkqzwel` (URL: `https://nyhsnvjdgifphwkqzwel.supabase.co`). Used by both web and Android for auth, database, and edge functions.
- **Lemon Squeezy** — payment processor for web subscriptions (checkout + webhook edge functions under `app_11941c8fec_lemonsqueezy_*`). Paddle edge functions also exist in the repo (`app_11941c8fec_paddle_*`) but are not the active processor.
- **EAS / Expo** — account `linkoranet`, project `amanahlife`. All Android builds go through EAS's remote build service.
- **Google Play Console** — developer account LinkoraNet LLC.
- **Google Cloud Console** — project `amanahlife-497015` (web OAuth client, number `792822759216`) and a second project (number `405525965488`, used by the Android OAuth client and originally by web before consolidation — both client IDs are in Supabase's authorized list).
- **Hostinger** — domain registrar + DNS host for `amanahlife.com`. No actual website hosting product is provisioned there yet (confirmed via hPanel: "Create or migrate your website" step is incomplete).
- **Netlify** — hosts the separate digital products site `amanahlife.netlify.app` (unrelated to the main app migration).

### Supabase schema state (confirmed live via Supabase MCP, 2026-07-04)

Project `nyhsnvjdgifphwkqzwel` (region eu-west-1, Postgres 17.6). **No formal migration files are tracked** (`list_migrations` returns empty) — schema has been applied directly via the dashboard/SQL editor rather than versioned migrations. Six tables in `public` schema, all prefixed `app_11941c8fec_` (app instance ID), **RLS enabled on all of them**:

| Table | RLS | Rows |
|---|---|---|
| `subscriptions` | ✅ | 0 |
| `exchange_rates` | ✅ | 3 |
| `email_digest` | ✅ | 0 |
| `search_history` | ✅ | 0 |
| `push_subscriptions` | ✅ | 1 |
| `notification_preferences` | ✅ | 1 |

⚠️ **Table names above are shorthand — the actual physical table name always
carries the full `app_11941c8fec_` prefix** (e.g. `app_11941c8fec_subscriptions`,
not `subscriptions`). This bit us for real on 2026-07-22: the RN app's
`SubscriptionContext.tsx` was querying bare `subscriptions`, which doesn't
exist — every RN user's tier/status/trial data had been silently unreadable
since launch, falling back to the free-tier default every time. Fixed in
`amanahlife-rn` commit `eb1f751`; the `app_11941c8fec_subscriptions.trial_started_at`
/ `trial_used` migration was applied the same day. **When writing or
reviewing any `supabase.from(...)` call, always use the full prefixed name.**

**Security advisories (non-blocking, worth addressing):**
- `notification_preferences` and `push_subscriptions` each have a `service_role_all_*` policy with `USING (true)` / `WITH CHECK (true)` for `ALL` commands — likely an intentional service-role backend-access pattern (edge functions manage these tables), but worth double-checking it's scoped only to the service role and not exposed to anon/authenticated users.
- Leaked password protection (HaveIBeenPwned check) is disabled in Supabase Auth settings — free to enable, recommended.
- **Atoms Dev** (atoms.dev) — currently serves `app.amanahlife.com` via a custom DNS A record pointing to their infrastructure (UCloud, Hong Kong). This is being migrated away from — see Known Issues.

---

## 0f. StartFleet / Mercury Bank Requirements — Status

1. ✅ Footer: `© 2026 AmanahLife, a product of LinkoraNet LLC. All rights reserved.` (+ Arabic equivalent) — live on web footer/landing and Android Settings/More screens.
2. ✅ About/Founder section — Huzaifa Al Ezzo bio (EN + AR, exact text), real founder photo — present on web landing page, web `/about` page, and Android About screen. LinkedIn link intentionally removed from both platforms (web: commit eb47d2a, 2026-07-05; Android: commit fda615e, 2026-07-09) — **not yet reflected in the .aab currently in Play Store review**, which was built from an earlier commit (9c4e98f) that still has it. Requires a new build once EAS quota renews.
3. ✅ `/about` page accessible from navigation on both platforms.
4. ✅ Privacy Policy at a public URL (`https://app.amanahlife.com/privacy`), not behind login. Account deletion also has a public page at `/delete-account`.

---

## 0g. Known Issues

- **Android subscriptions still use Lemon Squeezy via in-app browser**, not native Google Play Billing — see Pending Items #1.
- ~~Auto-deploy on push is not yet configured for the web app~~ — **confirmed working, 2026-07** (verified repeatedly by inspecting the live production JS bundle immediately after pushing to `main`; Coolify auto-deploys with no manual step needed).
- Full auth flow and subscription checkout were not explicitly re-tested end-to-end immediately after the Coolify migration (structure/routing/SSL were verified) — worth a quick pass.
- Document Vault feature not confirmed ported to Android (web has it, Android status unclear as of this writing).
- Two Google Cloud project numbers are involved in OAuth (`792822759216` and `405525965488`) due to historical setup by a previous builder — both are correctly authorized in Supabase's Google provider config, but this dual-project setup is worth consolidating into one project eventually for cleanliness (not urgent, currently working correctly).
- ~~Lemon Squeezy checkout may still be broken on web~~ — **fully resolved and verified live, 2026-07-31.** See the dedicated Lemon Squeezy integration entry near the end of this section for the complete writeup (buy-links, skip_trial, webhook registration, stale-deploy bugs found and fixed, and the RN port).
- ~~6 Android placeholder screens still need a decision~~ — **decided 2026-07-23**: Bill Reminders, Financial Dashboard, Halal Investment, Savings Challenges built for real; Receipt Scanner and Family Dashboard deliberately held (need real OCR / a real invite+sync backend, not a quick port). See Pending Items #6.
- **Web's Receipt Scanner and Family Dashboard still ship fake functionality** (unchanged, held on purpose per the decision above) — Receipt Scanner's "AI scanning" is a hardcoded mock-data timeout with no real OCR; Family Dashboard's "invite a family member" creates a local-only fake record with randomized prayer-streak/Quran-pages stats, no real invite or cross-device sync.
- ~~RN's `SubscriptionContext.tsx` queried a nonexistent `subscriptions` table~~ — **fixed 2026-07-22**, see the Supabase schema section above. Every RN user's tier/trial data had been silently unreadable before this fix.
- ~~Web's Subscription.tsx testimonials and AI Life Coach were fake~~ — **fixed and confirmed live 2026-07-22/23** — verified directly against the production JS bundle (`app.amanahlife.com`): no testimonials/canned-response text present in the React SPA, real `app_11941c8fec_ai_life_coach` endpoint call confirmed in the deployed code. **Correction (2026-07-24): this only covered `Subscription.tsx`.** A completely separate static file, `app/frontend/public/landing.html` (the public marketing landing page, not part of the React SPA), still had its own hardcoded "Testimonials" section with 6 fabricated reviews (specific names, avatars, job titles, cities — e.g. "Ahmed K., Software Engineer, Dubai") presented as real customer quotes. Never audited before because it's a separate file from what Phase 4 checked. Fixed 2026-07-24 (commit `44b702f`): section removed entirely (not replaced with a disclaimer), along with its 3 nav links (desktop nav, mobile menu, footer) and all `en`/`ar` i18n strings. Also removed a dead "Testimonials" menu item in RN's `more-info.tsx` that deep-linked to the now-gone `/landing#testimonials` anchor. Checked `Subscription.tsx`, `About.tsx`, and the rest of the RN app for the same pattern — nothing else found.
- ~~`app_11941c8fec_ai_life_coach` was written but confirmed NOT deployed~~ — **deployed 2026-07-24**, via Supabase CLI (`supabase functions deploy`) with a genuinely authenticated MCP/CLI session (`SUPABASE_ACCESS_TOKEN`), reusing the already-set `ANTHROPIC_API_KEY` secret. **Also confirmed it already had real git history in the `amanahlife-rn` repo** (`d4c6fee` → ...) — an earlier claim in this doc that it had "no source, no history, nowhere" was wrong; it was just never in the `AmanahLifeapp` repo, which is what that audit checked. Verified the committed source is byte-identical to what's actually live via `supabase functions download`.
- ~~`app_11941c8fec_savings_tips` discrepancy~~ — **resolved 2026-07-23/24**. The real, deployed function lives in the **`AmanahLifeapp` repo** at `app/frontend/supabase/functions/app_11941c8fec_savings_tips/index.ts`. Switched from DeepSeek to Anthropic (commit `80caf97`), then two further real bugs found and fixed on 2026-07-24 after live user reports:
  1. **`requestId2` ReferenceError** — 4 references to an undeclared variable (only `requestId` was ever declared), including one on the success path right after "AI tip generated successfully" — every successful Anthropic call crashed with an uncaught exception before returning a response. Fixed by renaming all 4 to `requestId`, redeployed.
  2. **CORS preflight rejection** — `Access-Control-Allow-Headers` only listed `authorization, content-type`; the Supabase JS client's `functions.invoke()` automatically sends `x-client-info`/`apikey` on every call, so the browser's preflight rejected every request before it ever reached the function (explains why server-side logs showed nothing — the request never left the browser). This was the *actual* root cause of the live "stuck on Loading tip" bug, found via the user's own browser console, not server logs (the project's `edge_logs` analytics table turned out to have essentially zero data — unreliable for this project, don't rely on it for debugging). Fixed by adding `x-client-info, apikey` to the allow-list.
  Swept the same CORS gap across every function with a hand-written header allow-list: found and fixed the identical bug in `ai_life_coach` (RN repo) and `lemonsqueezy_checkout` (latent — not currently triggered since its one caller uses raw `fetch()` without those headers, but would break the same way if that ever changes). Functions using `Access-Control-Allow-Headers: '*'` (`exchange_rates`, `paddle_*`, `push_notify`, `stripe_*`, `weekly_digest`) are immune to this class of bug entirely.
  Also fixed: the AI prompt didn't forbid Markdown, so responses sometimes opened with a literal `# Daily Savings Tip` heading (card renders plain text, no Markdown parser) — prompt now explicitly requires plain text, no formatting, no repeated title.
  **Confirmed working end-to-end by the user**: real Anthropic-generated tip renders, clean plain text.
- ~~TWO separate `supabase/functions/` directories in the `AmanahLifeapp` repo~~ — **resolved 2026-07-24**. `app/frontend/src/supabase/functions/` (had the hardened Lemon Squeezy code from this session's earlier Phase 4 work) and `app/frontend/supabase/functions/` (the real deploy path, still running the original vulnerable code) were reconciled: `git mv`'d the hardened `lemonsqueezy_webhook`/`lemonsqueezy_checkout` into the real path (overwriting the stale versions), moved the 4 never-deployed Stripe functions there too as staged-but-not-live, and deployed the hardened webhook + checkout. Independently re-verified before deploying (not taken on faith): constant-time HMAC signature comparison and variant-id-derived tier (never trusting client `custom_data.tier`) both confirmed genuinely present in the code that got deployed. `src/supabase/functions/` now only contains the 2 Paddle functions (untouched, out of scope for this pass — same "true source of record" question could apply to Paddle too, not investigated).
- ~~Duplicate `app_11941c8fec_savings_tips` in `amanahlife-rn`~~ — **deleted 2026-07-23**. This session originally (mistakenly) built a second, parallel implementation in this repo (`supabase/functions/app_11941c8fec_savings_tips/`) believing the function didn't exist anywhere. It did — see above. Removed to avoid two competing implementations; the RN app's `savings-challenges.tsx` calls the real one (in `AmanahLifeapp`) via the shared Supabase project URL, no RN code changes needed.
- ~~Tasks storage key mismatch (`amanah-tasks` vs `amanah_tasks`)~~ — **fixed 2026-07-23 on both platforms.** `tasks.tsx`/`TaskManager.tsx` save under `amanah_tasks` (underscore); `goals.tsx`/`Goals.tsx`, `planner.tsx`/`Planner.tsx`, `progress-analytics.tsx`/`ProgressAnalytics.tsx`, and `weekly-life-score.tsx`/`WeeklyLifeScore.tsx` were all reading `amanah-tasks` (dash) instead — a different, permanently-empty key, so linked-task counts, today's task list, and growth scores were silently computed from zero tasks regardless of real data. Also found (not in the original 4-file list) and fixed in the same pass: RN's `DashboardScreen.tsx` and web's `Index.tsx` (dashboard daily summary) and web's `SmartBriefing.tsx`. Checked web vs Android before touching anything — identical mismatch, identical correct key on both platforms, so no cross-platform divergence to reconcile. `DashboardScreen.tsx`'s reads use raw `AsyncStorage.getItem`, not the scoped `getUserItem` — only the key name was corrected here; the missing per-user scoping there is a separate, related gap (same category as the `prayer_completed_` issue below).
- ~~Nav bar overlap: sheets/modals covered the bottom nav~~ — **fixed 2026-07-23** on both platforms. Web: the search sheet and Add Transaction/Add Task/Add Event dialogs used a `fixed inset-0` backdrop above the nav's z-index; now stop 4rem above it instead (commit `85fc61e`). RN needed a different fix — `<Modal>` blocks all touches behind it regardless of transparency (a real platform difference from web's CSS stacking), so all 5 equivalent RN sheets were rewritten as plain positioned Views instead of `<Modal>`, using a new `NavBarHeightContext` to size themselves correctly (commit `8da9c5d`).
- ~~Android back button exited the app from any tab~~ — **fixed 2026-07-23** (commit `94f0060`). `(tabs)/_layout.tsx` uses `<Slot />` with no navigator of its own, so tab switches didn't build a "go home, then exit" back-stack; back could exit straight from Finance/Planner/any tab. Added a hardware-back handler there that redirects to Dashboard first, only exiting once already there. None of this session's RN fixes (nav overlap, back button) have been verified on a device — EAS build quota is exhausted until Aug 1.
- ~~`prayer_completed_<date>` stored unscoped (per-device, not per-user)~~ — **fixed 2026-07-23**, see `audit/phase-item3-prayer-scoping-summary.md`. `prayer-times.tsx` (the sole writer) now uses `getUserItem`/`setUserItem`/`migrateLegacyKeyIfNeeded`, same Phase 1 pattern, with in-memory state reset on account switch. `weekly-life-score.tsx` needed no change (its existing scoped-first/legacy-fallback read was already correct once the owner became scoped). `DashboardScreen.tsx`'s 4 raw unscoped reads (streak calc, daily summary, achievements, smart briefing) — never covered by Phase 1 — converted to the same scoped-first/legacy-fallback read pattern. Not verified on-device (no build available); recommend the sign-in-as-A/sign-out/sign-in-as-B test once EAS quota renews.
- ~~RN Backup/Restore missed all dynamic daily keys~~ — **fixed 2026-07-23**, see `audit/phase-item4-backup-restore-summary.md`. `settings.tsx`'s `exportAllData` only ever covered the static `BACKUP_KEYS` list; fasting history, dhikr counts, adhkar progress, Quran daily-pages counter, and prayer completion record were silently excluded from every "export all data" backup. Now sweeps `AsyncStorage.getAllKeys()` for this user's scoped keys matching 6 known date/preset-templated prefixes and includes them under their exact (date-preserving) name; `importAllData` needed no change since it already restores generically. Added `schemaVersion: 2` and renamed `timestamp` → `exportedAt`.
- 🚨 **New discovery while fixing the above: web's and RN's backup-file formats are NOT interchangeable, and it's more than a key-name mismatch.** Web's export (`app/frontend/src/components/BackupRestore.tsx`, `AmanahLifeapp` repo) is shaped `{ metadata: {version, exportedAt, userId, email}, supabaseData: {...5 tables...}, localData: {...} }` and also dumps 5 Supabase tables RN's backup never touches; RN's is shaped `{ exportedAt, schemaVersion, appVersion, data: {...} }`, local-only. A file exported from one cannot be imported into the other today. Web's own dynamic-key sweep also misses `fasting_today_*`/`quran_pages_*` (a narrower version of the gap just fixed on RN), and web backs up Adhkar progress as one static key (`amanah-adhkar-progress`) rather than RN's per-day templated key — possibly a data-model difference, not just a format one. Per the same rule applied to the tasks-key mismatch (Item 2): not unified without Huzaifa's decision. See the "needs a decision" section of `audit/phase-item4-backup-restore-summary.md` for the three open questions.
- ~~5 RN sheets lost their slide/fade-in animation after the nav-overlap `<Modal>` fix~~ — **fixed 2026-07-23**, see `audit/phase-item5-sheet-animations-summary.md`. New shared `src/lib/useSheetAnimation.ts` (plain `Animated.timing`, `useNativeDriver: true`) restores an entrance fade+slide to the search sheet, Add Transaction, Add Task, Add Event, and Add Bill — wrapping only the panel itself so it can never block/slow taps on the nav bar underneath while it plays. No exit animation and no backdrop fade (deliberately out of scope — only the entrance was lost, so only the entrance was restored). Not verified on-device (EAS quota exhausted until Aug 1).
- ~~Web Dashboard rendered desktop layout after Google sign-in until manual refresh~~ — **fixed 2026-07-24** (`AmanahLifeapp` commit `5ed7aca`). `AuthCallback.tsx` used React Router's client-side `navigate('/')` after OAuth completed — a SPA transition trusts the browser's current layout state, but Tailwind's `md:` breakpoints are pure CSS media queries the browser evaluates on actual viewport width; no JS timing issue can make them misfire. The browser's real computed viewport was momentarily wrong right after the redirect chain through Google's OAuth pages (a known mobile-browser quirk). Fixed by replacing that one navigation with `window.location.replace('/')`, forcing a genuine full-page reflow — the same thing a manual refresh was doing.
- ~~Hijri date silently never rendered on Dashboard/Planner (web)~~ — **fixed 2026-07-24**. Both called `api.aladhan.com/v1/gpiToH/{date}` — a typo (should be `gToH`) that's presumably been 404ing since these pages were built, silently swallowed by a try/catch. Verified the correct endpoint live before fixing.
- ~~406 error on `app_11941c8fec_subscriptions` reads (web)~~ — **fixed 2026-07-24**. `SubscriptionContext.tsx` used `.single()`, which PostgREST errors on for zero matching rows — true for every brand-new sign-in, most visibly right after Google OAuth. Already handled gracefully (falls back to free tier) so not a functional bug, just noisy/wrong tool; switched to `.maybeSingle()`.
- 🚨 **Web's trial system was 100% client-side and unlimited-farmable — confirmed via a live database check, not just code reading.** `SubscriptionContext.tsx` (web) read/wrote trial state purely from `localStorage['amanah-trial-start']`, identical to the gap RN already closed via server-side `trial_started_at`/`trial_used` columns. Confirmed empirically: queried `app_11941c8fec_subscriptions` directly (read-only) and it had **zero rows total, across all 12 real registered users** — proving web's "Start Trial" had never once touched the database. **Fixed 2026-07-24** (commit `2541bd0`): ported RN's exact pattern — `startTrial()` now checks the server fresh before granting anything and upserts `trial_started_at`/`trial_used`; `fetchSubscription()` reads trial state from the server, localStorage is now only a same-day optimistic cache, never the source of truth. `Subscription.tsx` updated to the new async `startTrial()` signature, hides the CTA once `trialUsed` is true, shows the same "already used" message RN shows.
- **RLS audit run directly against the live database, 2026-07-24** (Management API `/database/query`, not just reading migration files). All 6 public tables have RLS enabled with ≥1 policy each: `email_digest`(3), `exchange_rates`(1), `notification_preferences`(4), `push_subscriptions`(4), `search_history`(4), `subscriptions`(3). `app_11941c8fec_subscriptions`'s exact 3 policies: `INSERT` (own row only), `SELECT` (own row only), and an `ALL` policy scoped to `service_role` — **there is no `UPDATE` policy for `authenticated` at all**. This closes the original question (a client cannot spoof `tier` — UPDATE is unconditionally denied for every row) but opens a different one: `startTrial()`'s `.upsert(..., {onConflict: 'user_id'})` compiles to `INSERT ... ON CONFLICT DO UPDATE`, and for any user who already has a row, that conflict path is a real UPDATE with no policy to permit it. Per documented Postgres RLS semantics this should silently affect 0 rows (no error surfaced, client believes success) rather than persist the trial — **not yet empirically proven** (a rolled-back-transaction test to verify this safely was blocked by the safety classifier before it could run). Needs testing with an account that already has a row (e.g. one that went through Lemon Squeezy checkout) attempting Start Trial, now that web's trial flow actually writes to this table at all. If confirmed, the fix is **not** a blanket "own row" UPDATE policy (that reopens the exact tier-spoofing gap this was protecting against) — it needs to be column-scoped (Postgres column-level `GRANT UPDATE (trial_started_at, trial_used)` combined with the row-level policy) so a client can only ever touch the trial columns, never `tier`/`status`/`billing_cycle`.
- ✅ **Lemon Squeezy integration completed and verified live end-to-end, 2026-07-31** (web first, then ported to Android same day). Full writeup:
  - **Buy-links + skip_trial (web, `AmanahLifeapp` commits `ee82441`, `a9418b7`):** `Subscription.tsx`'s `handleUpgrade` now branches on `trialUsed` — a fresh/trial-eligible user goes straight to one of 4 static Lemon Squeezy buy-links (`BUY_LINKS`, one per tier×billing), needing no API round-trip; a trial-used user instead calls the existing `app_11941c8fec_lemonsqueezy_checkout` Edge Function, which independently re-derives `trial_used` from the database (never trusted from the client) and sets `checkout_options.skip_trial: true` — genuinely suppressing Lemon Squeezy's own native per-variant trial offer, not just disclosing it. Verified live in a real browser: a trial-used checkout shows an immediate `$6.99` charge with no trial line; a fresh checkout still shows the normal `7-day trial FREE` offer.
    - **Real bug caught mid-session**: the first deploy computed `skipTrial` and logged it but never actually added it to the `checkout_options` payload sent to Lemon Squeezy — both checkout pages looked identical until this was caught via a live A/B browser check and fixed (`a9418b7`).
  - **Secrets configured**: all 4 variant-ID secrets (`APP_11941c8fec_LEMONSQUEEZY_{BALANCED,FAMILY}_{MONTHLY,YEARLY}_VARIANT_ID`) plus `APP_11941c8fec_LEMONSQUEEZY_STORE_ID` (`384541`) — set by Huzaifa via `supabase secrets set`, values never seen in chat.
  - **Webhook registered**: `POST /v1/webhooks` against the Lemon Squeezy API — webhook ID `123234`, pointed at the existing `app_11941c8fec_lemonsqueezy_webhook`, all 8 events (`subscription_created/updated/cancelled/resumed/expired/paused/unpaused/payment_failed`), live mode. Done via a one-shot temporary admin action added to the checkout function (reads `LEMONSQUEEZY_API_KEY`/`STORE_ID`/`WEBHOOK_SECRET` server-side via `Deno.env`, never exposed to chat), invoked once, then fully reverted — confirmed via `git diff` showing zero drift before redeploying the clean version.
  - **Self-test (Step 7)**: a fabricated, properly-HMAC-signed `subscription_created` payload sent to the real deployed webhook (same one-shot temp-action pattern) confirmed signature verification and the correct tier/billing/status DB write for a throwaway `@amanahlife-test.invalid` account.
  - **Three separate "fixed in code, never actually deployed" bugs found via a full audit** (comparing all 14 deployed Edge Functions' live source against committed `git` source, one by one):
    1. `app_11941c8fec_lemonsqueezy_webhook` — the `current_period_end` fix (originally committed as `364722a` in an earlier session) had never actually been deployed; every real LS subscriber's renewal date was silently `null` in production this whole time. Deployed 2026-07-31, re-verified via the same self-test (now returns a real date, e.g. `2026-08-30T...`).
    2. `app_11941c8fec_weekly_digest` — deployed version still said "Smart Life Companion" in the email footer tagline and subject line; committed source already said "AmanahLife." Deployed 2026-07-31, confirmed via re-download-and-diff (zero drift). No safe way to test-send exists (`send_digests` emails every real enabled subscriber, no dry-run/per-user filter) — confirmed via diff only.
    3. `app_11941c8fec_ai_life_coach` — deployed version was missing a doc comment (committed source explains the function is intentionally duplicated verbatim across both repos). Comment-only, zero behavior difference; synced 2026-07-31 anyway per Huzaifa's request.
    - **General lesson for future sessions**: `git push` alone does not mean an Edge Function change is live. Always verify with `supabase functions download <slug>` diffed against the committed source (`diff <(tr -d '\r' < downloaded) <(tr -d '\r' < committed)`) before assuming a fix has shipped — this cost real user-facing bugs twice in one day before the pattern was caught.
  - **Dead scaffolding actually shipped, `AmanahLifeapp` commit `8e05dac`**: ~294 files (`.atoms/` tooling docs, `uploads/`/`assets/` old design dumps, `MIGRATION-COMPLETE.md`, `DEPLOYMENT.md`, `.wiki.md`, the old MGX `Dockerfile`/config, etc.) had been deleted locally in an earlier session but the deletion was never staged/committed — confirmed via `git ls-tree` against `origin/main` that they were still live on the real remote. Actually committed and pushed this session. (This PROJECT.md's own references to `MIGRATION-COMPLETE.md`/`DEPLOYMENT.md` were updated in the same pass to stop pointing at now-deleted files.)
    - 🚨 **Correction, 2026-08-01: that same cleanup swept up 4 genuinely load-bearing files, mislabeling the real Coolify Dockerfile as "the old MGX Dockerfile."** Deleted along with it: `app/frontend/nginx.conf` and the entire `app/frontend/public/` directory — `index.html`'s actual favicon/apple-touch-icon/og:image (`/assets/amanah-logo.png`), `/manifest.json`, `/theme-init.js` (the pre-hydration theme script), the `/landing` route's iframe target (`landing.html`), and the blog markdown source files. Every deploy since (`8e05dac` itself, then `b4272d4`) **failed in the Coolify dashboard** with `ERROR: failed to build: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory` (confirmed directly from the build log) — production silently kept serving the pre-cleanup build (`a9418b7`) for ~20 hours. Found by checking the Coolify dashboard directly (Huzaifa provided the URL) after this PROJECT.md's own earlier stale-`Last-Modified`-header suspicion. **Fixed same day** (commit `e8a230c`): all deleted files restored via `git archive a9418b7 -- <paths> | tar -x`, verified with a clean local `npm run build` before committing, pushed, and the next Coolify deploy confirmed **Success** (2m28s) in the dashboard.
  - **Ported to Android, `amanahlife-rn` commit `35a59cf`**: RN's `subscription.tsx` previously always called the API-based checkout endpoint for every upgrade, regardless of trial history (a genuine structural difference from web's pre-Step-6 pattern, not a leftover buy-link setup) — now mirrors web exactly: added the same 4 `BUY_LINKS` + `buildCheckoutUrl`, `handleUpgrade` branches on `trialUsed` the same way, still opens whichever URL results via the existing `WebBrowser.openBrowserAsync` (unchanged mechanism — RN already opened both static and API-generated checkout URLs the same way, so this was a clean, low-risk port with no real structural mismatch). `SubscriptionContext.tsx` now also reads/exposes `current_period_end`, displayed in the Current Plan card the same way web's does. Typecheck confirmed zero new errors (26 pre-existing, unrelated `sectionLabel`/`cardTitle`-style prop-name errors scattered across several other screens, present before and after — not touched, out of scope). Local `expo export --platform android` bundle build passed clean. **Not yet verified on a real device or via a real EAS build** — quota was still exhausted at the time (see Pending Items).
- 🚨 **`app_11941c8fec_subscriptions_status_check` never allowed `expired` or `paused` — found via a live webhook E2E simulation, fixed 2026-08-01.**
  - **The bug**: the constraint (in place since this table was created) only permitted `status IN ('active', 'canceled', 'past_due', 'trialing')`. `app_11941c8fec_lemonsqueezy_webhook` has always attempted to write `'expired'` for `subscription_expired` events, and as of today's event-coverage widening (see Phase 2 above) also `'paused'` for `subscription_paused`. Every real `subscription_expired` webhook call has therefore been silently failing its DB write since day one — Postgres rejects the row, `upsertError` gets set, the function logs and returns 500 to Lemon Squeezy, and the subscription row is left however it was before.
  - **How it was found**: simulating each of the 8 webhook events end-to-end against a throwaway `@amanahlife-test.invalid` account (real DB writes, matching exactly what the deployed webhook code produces) — the `paused` write hit the constraint violation directly.
  - **Verified against Lemon Squeezy's real docs before fixing anything** (not assumed): `subscription_paused`/`subscription_unpaused`/`subscription_resumed`/`subscription_expired`/`subscription_payment_failed` and the `status: "paused"` value (with a nested `pause` object) are all real, documented, simulatable — nothing in the webhook's event/status vocabulary is invented.
  - **Entitlement resolver checked before touching anything, per explicit instruction not to assume**: both `SubscriptionContext.tsx` (web `:16,199-200`; RN `:18,104`) already use an **allow-list** — `ENTITLING_STATUSES = Set(['active','past_due'])`, `purchasedTier = ENTITLING_STATUSES.has(status) ? tier : 'free'` — not a deny-list that only excludes `canceled`. `expired` and `paused` were therefore already correctly non-entitled on both platforms; the constraint fix does not silently grant anything.
  - **Blast radius: zero.** Wrote a temporary, read-only reconciliation Edge Function (reused the already-configured `LEMONSQUEEZY_API_KEY`/`APP_11941c8fec_LEMONSQUEEZY_STORE_ID` secrets server-side, no new secret exposure, no writes to either system) that pulled every live Lemon Squeezy subscription for the store and diffed it against `app_11941c8fec_subscriptions`. Result: **Lemon Squeezy currently reports 0 real subscriptions for this store** — the only Lemon-Squeezy-provider row in our table was the throwaway test one. Zero mismatches, zero missing, zero orphaned real rows. No customer has ever had incorrect entitlement because of this bug. The reconciliation function was neutered immediately after (verify_jwt flipped to true, body replaced with a static 410) since no tool was available to actually delete it — safe to remove entirely from the dashboard.
  - **The fix**: migration `20260801000000_widen_subscriptions_status_check.sql` (transaction-wrapped, `DROP CONSTRAINT IF EXISTS`, purely additive — verified beforehand that 0 existing rows used a status outside the old allowed set) widens the constraint to `active, canceled, past_due, trialing, expired, paused`. `trialing` kept (the separate Stripe webhook still writes it).
  - **Alerting added**: a failed upsert previously only logged via `console.error` + a 500 response, with nothing surfacing it to a human — exactly how this constraint gap went unnoticed for as long as it did. Checked what's actually available first (`get_logs` for the `edge-function` service only returns generic request-line entries, no severity levels; no external log-drain/Sentry/Slack alerting integration found in this project) rather than assuming something existed. Added `alertOnFailure()` to the webhook, reusing the SMTP credentials `app_11941c8fec_weekly_digest` already has configured (no new secrets) to email `support@amanahlife.com` with the full failure context on any DB-write failure. Best-effort and fully isolated — cannot affect the webhook's actual response to Lemon Squeezy.
  - Test account (`phase2-e2e-test@amanahlife-test.invalid`) and its subscription row deleted after testing, deletion confirmed by count (1→0 for both).

---

## 0h. Deployment & Build Instructions

### Android (via EAS)
```bash
cd AmanahLifeRN
npx eas build --profile production --platform android --non-interactive --no-wait
# Check status:
npx eas build:view <build-id>
# Download once finished:
curl -skL -o assets/play-store/amanahlife-production.aab "<Application Archive URL>"
```
Preview/internal APK builds use `--profile preview` instead of `production`.

### Web (current state — via Atoms Dev)
Changes are made by messaging the Atoms Dev agent team in the chat at `atoms.dev/chat/<id>`, which edits their internal workspace directly and deploys on request. The GitHub repo does not auto-deploy; it must be manually synced after Atoms Dev changes.

### Web (target state — post-migration)
GitHub → Hostinger (via Coolify) auto-deploy on push to `main`, confirmed working. (`DEPLOYMENT.md`, which documented this setup, was removed 2026-07-31 as dead scaffolding — see the Web hosting row in section 0b for the current setup.)

### Supabase
Edge functions are deployed via the Supabase CLI or dashboard; no local migration tooling is set up in this repo as of this writing — schema changes have been applied directly.

---

## 0h. Priority Fixes from Real Device Testing (2026-08-06)

Five-item priority list from real-device testing, worked in strict order (each committed + verified before the next starts).

### Priority 1 — Adhan notification timing didn't match Settings location, commit `6a0125f`

Real bug confirmed in `app/(tabs)/prayer-times.tsx`: `applyLocationMode()` and `applyCalcMethod()` persisted the new city/calculation-method and refreshed the on-screen display, but never called `schedulePrayerNotifications()`. The single shared location-read function (`src/lib/prayerLocation.ts`'s `resolveActiveLocation()`) was never wrong or stale itself — it always reads current storage when invoked — the bug was that nothing re-invoked the scheduler after a location change. `schedulePrayerNotifications()` had exactly 2 call sites: app launch (`_layout.tsx`) and touching the reminder toggles in Settings (`settings.tsx`) — neither fires when you change city/method in Prayer Times itself, so already-scheduled notifications kept firing at the OLD location's absolute-time triggers indefinitely (or until one of those 2 other triggers happened to fire).

Also identified, not a code bug but worth noting: Settings has an unrelated "Country" picker (currency/locale display only, includes Qatar) that a user could easily mistake for a prayer-location control — the real location control lives entirely inside the Prayer Times screen's own manual-city search (Phase B2c). Not changed, since it's working as designed for its actual (currency) purpose — just flagging the naming/mental-model collision.

**Fixed**: both handlers now call `schedulePrayerNotifications()` (gated on reminders being enabled) immediately after persisting the new location/method, mirroring the exact pattern `settings.tsx`'s reminder-toggle handler already used.

**Platform scope**: RN-only. Web's reminder system (`PrayerReminderSettings.tsx`) re-reads live `navigator.geolocation` on every (re)schedule and has no persisted manual-city setting that could go stale in this way — structurally different (same-day-only, `setTimeout`-based), so this exact bug pattern doesn't apply there.

**How to verify without waiting for a natural prayer time**: open Prayer Times, switch to manual mode and pick a different city (or change calculation method), then check `Notifications.getAllScheduledNotificationsAsync()` (e.g. via a debug log) — the scheduled trigger times should immediately reflect the new city's prayer times, not the previous city's.

**Verification**: `tsc --noEmit` 26 baseline (zero new), `expo export --platform android` clean.

### Priority 2 — Suhoor/Iftar notifications firing outside Ramadan, commit `884321d`

Confirmed: `scheduleFastingReminders()` (`src/lib/notificationPreferences.ts`) scheduled Suhoor + Iftar alerts for the next 7 days unconditionally whenever the `fasting_reminders` preference was on — which it is by default (`DEFAULT_NOTIFICATION_PREFERENCES`). No date/month gate existed anywhere in the function. A "Ramadan Mode" toggle exists in Settings (`settings.tsx`, `settings.ramadanMode`) but is completely inert — defined in the interface and has a UI row, but is never read anywhere else in the codebase — so it wasn't gating this or anything.

**Fixed**: added `isRamadan(date)` to `src/lib/hijriDate.ts` (Ramadan = Hijri month 9, using the existing offline `gregorianToHijri()` calculator - same one powering the Hijri date badge). Gated per-day inside the 7-day scheduling loop, not once for the whole call, so the schedule self-corrects exactly at the Ramadan start/end boundary rather than an all-or-nothing decision made once at call time. Deliberately did not wire this to the existing `ramadanMode` toggle, per the explicit instruction that the real constraint is the calendar date, not a UI setting.

**"Already scheduled for a future Ramadan" case**: doesn't apply here structurally - `FASTING_DAYS_AHEAD` is 7, so this function can never look further than a week ahead at call time. The per-day gate is the only gate needed; there's no separate class of "distant future Ramadan" notifications that could have been scheduled prematurely.

**Verification**: `tsc --noEmit` 26 baseline (zero new), `expo export --platform android` clean.

### Priority 3 — Quran Basmalah merged into ayah 1, commit `e6c7a40` (RN) + `a8c186f` (`AmanahLifeapp` repo, web)

Root cause was in the render-layer comparison logic, not the bundled data - the data itself is correct real Uthmani-Mushaf orthography. `stripBasmalahPrefix()` (`app/(tabs)/quran.tsx`) compared each surah's ayah-1 text against a hardcoded Basmalah literal using plain alef (ا, U+0627), but the actual bundled data (`assets/quran/ar/*.json`, and the same true on web's live `api.alquran.cloud` fetch) uses **alef wasla** (ٱ, U+0671) for "Allah"/"ar-Rahman"/"ar-Raheem" - correct Mushaf convention - and its shadda+fatha combining marks are stored in the opposite order from the literal. Both differences are visually invisible (render identically in any font), but `text.startsWith()` never matched on either count, so the strip had been a silent no-op for the entire Quran since Phase B - confirmed directly against the bundled JSON for surahs 2, 3, 18, 36, 55 (early/middle/late Mushaf). The separately-rendered standalone Basmalah header above the ayah list was always correct; ayah 1 itself just still carried the un-stripped Basmalah underneath its own text.

**Fixed**: normalize alef wasla to plain alef and apply Unicode NFC normalization (which canonically reorders combining marks) before comparing - match and slice both happen in normalized space, returning the normalized remainder (renders identically, no visible effect beyond fixing the match). At-Tawbah (9, no Basmalah) and Al-Fatihah (1, Basmalah IS ayah 1) both verified still handled correctly - neither reaches the strip logic.

**Platform scope**: fixed on both. Web's `QuranReader.tsx` had the identical hardcoded-literal bug, sourced from the same Uthmani-script convention.

**Verification**: RN - `tsc --noEmit` 26 baseline (zero new), `expo export --platform android` clean. Web - `tsc --noEmit` 0 errors, `npm run build` clean (after an unrelated `npm install` to repair a corrupted nested `vite/node_modules/rollup` install found in this session's working copy - pre-existing environment issue, not caused by this change).

### Priority 4 — surah selection opened the reader at the wrong scroll position, commit `2d095a6` (RN) + `855503d` (`AmanahLifeapp` repo, web)

Not a page-index/surah-mapping bug (RN's reader has no page numbering at all - each surah renders as one continuous list from its own ayah 1; web's `findPageForBoundary()` page-lookup math checked out fine on inspection). Root cause on both platforms was a missing scroll-position reset: the scrollable view (RN's `<ScrollView>` instance, web's ordinary document/window scroll) is reused across surah/page switches - only the underlying content (ayahs/state) changes - and nothing ever explicitly reset the scroll offset back to the top. Tapping a new surah while scrolled partway into the previous one (or the index list) left the reader visually positioned at that same pixel offset inside the new content, looking like it opened on the wrong page.

**Fixed**: RN adds a `ScrollView` ref, resetting to `(0,0)` (deferred via `requestAnimationFrame` so it runs after the new content has laid out) on every surah open (`loadSurah` - covers direct selection and "Resume") and on every return to the index (on-screen back button + the hardware/gesture back handler). Web adds `window.scrollTo({top:0})` to `openPage()` and the reader-to-index back button. The fix is content-position-independent (always resets to a fixed offset, never a computed one), so it applies identically regardless of which surah or how long it is.

**Verification note**: this was fixed and reasoned through by reading the code (the fix's correctness doesn't depend on which surah is selected, since it's a fixed reset not a computed one, so it generalizes to every surah by construction) - not verified via an actual manual tap-through of 3 different surahs on a running device/emulator in this session, since none was available. Flagging this rather than claiming a device test that didn't happen; recommend a quick manual spot-check (e.g. Al-Baqarah, Al-Kahf, An-Nas) before considering this fully closed.

**Verification**: RN - `tsc --noEmit` 26 baseline (zero new), `expo export --platform android` clean. Web - `tsc --noEmit` 0 errors, `npm run build` clean.

### Priority 5 — Adhkar cross-reference vs IslamWeb, commit `50709b6`

Fetched islamweb.net article 178309 ("أذكار الصباح والمساء") raw via the real browser (not the summarizing `WebFetch` tool), item-by-item against the app's 37-item list. 32 of the article's ~41 items were already present (a few under phrasing that differs from IslamWeb's but was already two-source-verified against Hisn al-Muslim in the prior audit pass - not re-litigated here). Found and added 5 genuinely missing duas: Ayat al-Kursi (Quran 2:255, morning `m21` + evening `e18`), "As'aluka 'ilman nafi'an..." (morning-only `m22`, matches the earlier-confirmed "morning only" restriction), Bismillahil-ladhi la yadurru evening counterpart (`e19`, app only had the morning version as `m5`), Hasbiyallah evening counterpart (`e20`, app only had morning `m8`), and a combined Tasbih+Tahmid+Takbir+Tahlil formula (100x, `m23`/`e21`) not present under any existing item. Each new entry has a source citation as a code comment (not user-facing) for the audit trail.

**Specific question answered**: confirmed `e3` ("A'udhu bikalimatillah...") already correctly serves as evening's counterpart to `m17`'s "Subhanallahi 'adada khalqihi" - not a gap.

**Flagged, not fixed**: both IslamWeb and hisnmuslim.com mark "A'udhu bikalimatillah" as evening-only, yet the app also carries it in morning as `m4` - a pre-existing placement question outside this pass's "add what's missing" scope, noted for a future decision alongside the other held items.

**Held, untouched per instruction**: `e14`, the شِرْكِه/شَرَكِه and شَأْنِي/شَأْنِيَ cross-source variants, and `m18`/`e15`.

**Verification**: `tsc --noEmit` 26 baseline (zero new, zero in `adhkar.tsx`), `expo export --platform android` clean.

**Follow-up, commit `eecf37a`**: removed `m4` from morning per explicit instruction - both sources mark "A'udhu bikalimatillah" evening-only, and it was already correctly present as `e3` with identical text, so `m4` was a duplicate-in-the-wrong-place rather than distinct content. Morning: 23 → 22 items. Evening unchanged at 21. Verified clean (`tsc --noEmit` 26 baseline, `expo export` clean).

---

## 0h-2. Phase G: Dashboard Category Restructure — Category Selector + Landing Screens (2026-08-06)

Resumed from the previously-approved Phase G plan (4 categories: Worship/Finance/Planning/Growth, 24 items, drill-down navigation reusing A4's grid). This unit covers plan steps 2-3 (build the category landing screens, replace the flat grid with the category selector) on both platforms. Step 4 (trim/relocate the pre-grid widget stack) is explicitly out of scope for this unit and remains a separate future pass.

**Data layer** (already existed going into this unit, confirmed present): `src/lib/dashboardNav.ts` on both platforms - `getNavItems(language)` / `getCategories(language)`, single source shared by the home screen's category selector and each category's landing screen so they can't drift out of sync.

**RN, commit `542accb`**: `src/screens/DashboardScreen.tsx`'s inline `NAV_ITEMS`/`CATEGORIES` literals replaced with calls into the shared `dashboardNav.ts` functions; the old flat "ALL FEATURES" grid replaced with conditional rendering - a 4-card category grid when not searching, the flat filtered-results grid when searching (unchanged search behavior). New file `app/(tabs)/dashboard/[category].tsx` - one parameterized screen for all 4 categories, reusing A4's exact grid styles (`width:'47%'`, `gap:12`, etc.), with a small "Read the blog" link appended under Growth (Blog has no grid card in any category, matching the plan's "drop Blog from the grid" decision).

**Web, commit `588cca0`**: new `src/lib/dashboardNav.ts` mirrors RN's module (same categories/functions), using web's own paths and preserving web's existing item wording/icons verbatim rather than overwriting with RN's copies. `src/pages/Index.tsx`'s flat `grid grid-cols-2 md:grid-cols-4` "Quick Actions" section replaced with the same conditional pattern as RN (category selector when not searching, flat search-results grid when searching) - the existing `navItems`/`filteredNavItems` array (28 items, includes Family Dashboard/Receipt Scanner/Blog) was deliberately left untouched so search remains exactly as capable as before; only the *default* (non-searching) view changed. New file `src/pages/CategoryLanding.tsx` - React Router `useParams`-based equivalent of RN's screen, new route `/dashboard/:category` registered in `src/App.tsx`. Web's shared `PageHeader.tsx` has no subtitle prop (RN's does, added during the earlier blog-parity pass) - rather than extend the shared component for one new page, `CategoryLanding.tsx` renders the category description as a plain paragraph under the header instead.

**Family Dashboard / Receipt Scanner**: excluded from the category grouping on both platforms, per the plan's explicit call-out - both are still-undecided Phase D items (see `0d`/queued decision-brief work). Not a new exclusion; already reachable via web's search field and via their existing (unlinked-from-grid) routes.

**Deep-link safety verified**: `amanahlife://reset-password` and `amanahlife://subscription` target their own route files (`app/(auth)/reset-password.tsx`, `app/(tabs)/subscription.tsx`) directly and are untouched; no route file was renamed or moved by this unit - the only new route is `dashboard/[category]`, which nothing pre-existing points at, so there's no collision risk. No RN notification-tap handler currently targets any dashboard path (grepped for it, no matches), so there was nothing to re-target.

**Verification**: RN - `tsc --noEmit` 26 baseline (zero new, none in the touched files), `expo export --platform android` clean. Web - `tsc --noEmit` 0 errors, `npm run build` clean (including prerender). **Live browser verification not completed this session**: the Browser pane could not reach `localhost:3000` for a click-through/screenshot pass (navigation was denied on repeated attempts - an environment/tooling limitation, not a code signal) - so the "3 screen sizes, EN/AR" check for this unit rests on static reasoning rather than a live screenshot: both new grids reuse CSS/style rules (`grid grid-cols-2 md:grid-cols-4` on web, the A4 flex-wrap grid on RN) that are already shipped and visually verified elsewhere in the app (the pre-existing Daily Summary 4-cell grid on web, A4's own grid on RN), and RTL is handled via the same `isRTL` conditional pattern used throughout both codebases. Recommend a quick manual check (phone width, tablet/desktop width, both languages) before considering this fully closed - flagging honestly per the same standard applied to Priority 4's scroll-reset fix above.

---

## 0h-3. Phase I: Receipt Scanner — Real Claude Vision Backend (2026-08-06)

Follow-up to the Phase D decision brief (see `0d`/Phase D report): approved option was Claude vision via a new edge function mirroring `ai_life_coach`'s pattern.

**Prior state**: web's `ReceiptScanner.tsx` ignored the uploaded photo entirely - it showed "AI analyzing receipt" for a fake 2-second delay, then returned a random pick from 4 hardcoded mock receipts (Fresh Market, City Pharmacy, Gas Station, Electronics Store). RN's `receipt-scanner.tsx` was an honest "Not implemented yet" placeholder, unreachable from nav.

**New Edge Function `app_11941c8fec_receipt_scan`**: deployed to the shared Supabase project (same `verify_jwt: false` + manual `supabase.auth.getUser(token)` pattern as every other function here), source committed to both repos per the established duplication convention. Takes `{ imageBase64, mimeType, language }`, sends the image to Claude (`claude-haiku-4-5-20251001`) via its vision API with a system prompt asking for strict JSON (`{isReceipt, storeName, date, items: [{name, amount}], total}` or `{isReceipt: false}`), defensively strips markdown fences before parsing, and validates the shape before returning it. Distinguishes real failure classes for the client: `not_a_receipt` (the photo isn't a receipt), `unreadable` (parse/shape failure), and hard errors (missing image, oversized payload, unsupported MIME type, upstream Anthropic failure) - no case silently succeeds with fabricated data.

**Response shape matches what the UI already expected** (`storeName`, `items: [{name, amount}]`, `total`, `date`) - no UI schema change needed, only the data source changed from `Math.random()` mock selection to a real parsed response.

**Web** (`ReceiptScanner.tsx`): removed `MOCK_RECEIPTS` and the fake `setTimeout` entirely. `handleFileChange` now reads the picked file as base64, gets the user's session token, POSTs to the function, and maps `error` responses to real, distinct toast messages (not-a-receipt / unreadable / unavailable) rather than ever faking a success.

**RN** (`receipt-scanner.tsx`): built for real (previously an unlinked placeholder). Added `expo-image-picker` (new dependency, SDK-54-compatible version resolved via `expo install`) plus its config plugin in `app.json` with camera/photo-library permission strings - the `NSCameraUsageDescription` and Android `CAMERA` permission already existed in `app.json` from an earlier pass that anticipated this feature but never built it. Real camera-capture and photo-library flows (`ImagePicker.launchCameraAsync` / `launchImageLibraryAsync`, `base64: true`), same edge-function call as web, same three-way error handling. "Add to Finance" writes into the same `amanah_finance` AsyncStorage key (scoped via `getUserItem`/`setUserItem`) that the real Finance screen already reads, using RN's existing expense-category enum - not a new parallel finance store. Receipt history saved under a new user-scoped key `amanah_receipts`.

**Verification**: RN - `tsc --noEmit` 26 baseline (zero new, none in `receipt-scanner.tsx`), `expo export --platform android` clean. Web - `tsc --noEmit` 0 errors, `npm run build` clean (prerender included). Not verified: an actual live photo scan on a device/emulator (none available this session) - the function was reasoned through and its JSON-shape validation is defensive against a malformed Claude response, but a real end-to-end scan (camera → function → Claude → parsed UI) hasn't been watched happen. Recommend one real test scan on each platform before considering this fully closed.

---

## 0i. File Structure Overview (Android repo — `amanahlife-rn`)

```
app/                      Expo Router screens
  (auth)/                 Landing, login, signup (pre-auth)
  (tabs)/                 Main app screens (Dashboard, Finance, Planner, Settings, etc.)
  _layout.tsx             Root layout — providers, notification handler setup
assets/                   Icons, splash, logo, play-store/ (icon, feature graphic, screenshots, .aab)
src/
  contexts/               Auth, Language, Theme, Subscription React contexts
  components/ui/          Shared UI primitives (Card, Button, PageHeader, etc.)
  hooks/                  useRTL and other shared hooks
  lib/                    supabase client, toast, prayerNotifications, useBottomSheet
  screens/                DashboardScreen (shared between tabs)
  theme/                  Font constants
eas.json                  EAS build profiles (development, preview, production)
app.json                  Expo app config (icon, splash, plugins, permissions)
```

(Web repo file structure to be documented once migration/reconciliation in Phase 4 is complete.)
