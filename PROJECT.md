# AmanahLife — Project Documentation

Handoff document for the full AmanahLife project (web + Android). Last updated 2026-07-04.

---

## 0a. Project Overview

- **Name:** AmanahLife (أمانة لايف)
- **Description:** Personal life planning and daily log SaaS app — helps individuals and families plan goals, track habits, manage daily routines, and grow personally, with an Islamic-life-companion focus (prayer times, Quran, Zakat, Ramadan tools) alongside general productivity/finance features.
- **Operator:** LinkoraNet LLC, a Wyoming-registered US entity
- **Founder:** Huzaifa Al Ezzo — Founder & CEO, LinkoraNet LLC ([LinkedIn](https://www.linkedin.com/in/huzaifa-ezzo-trans7))
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
| Web hosting | Currently served via **Atoms Dev** platform (see Known Issues) — domain `amanahlife.com` is registered/DNS-managed on **Hostinger**; `app.amanahlife.com` subdomain's DNS currently points to Atoms Dev's infrastructure |
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
| AI Life Coach | ✅ | ✅ |
| Prayer times + Qibla finder | ✅ | ✅ |
| Quran reader with bookmarks | ✅ | ✅ |
| Dhikr counter + daily duas | ✅ | ✅ |
| Islamic calendar + Hijri | ✅ | ✅ |
| Ramadan mode | ✅ | ✅ |
| Zakat & Giving tracker | ✅ | ✅ |
| Halal Investment tracker | ✅ | ✅ |
| Bill reminders | ✅ | ✅ |
| Progress analytics | ✅ | ✅ |
| Document vault | ✅ | ⚠️ not confirmed ported |
| Family dashboard + shared goals | ✅ | ✅ |
| Data Backup & Restore | ✅ (Supabase-backed) | ✅ (AsyncStorage-backed, same UX) |
| Motivational Quotes (daily rotation) | ✅ | ✅ |
| Dark/Light auto-switch (sunrise/sunset) | ✅ | ✅ |
| Prayer-time push notifications | ✅ | ✅ (local notifications via expo-notifications) |
| Multi-currency support (USD default) | ✅ | ✅ |
| Bilingual EN/AR + RTL | ✅ | ✅ |
| Subscription management | ✅ (Lemon Squeezy) | ⚠️ same Lemon Squeezy flow via in-app browser — not Play Billing |
| PWA / offline mode | ✅ (web only, by design) | N/A — not applicable to native app |
| More/Info screen (footer sitemap) | N/A (web has footer) | ✅ new screen added |
| About/Founder page | ✅ | ✅ |

---

## 0d. Pending / Deferred Items

1. **Google Play Billing integration — HARD BLOCKER before Production Play Store release.** GCC/MENA target markets (Saudi Arabia, UAE, Qatar, Egypt, Kuwait, Iraq) have no exception to Google's billing policy (unlike the post-Epic-v-Google US injunction). Play Billing is fully live in these markets, so the current Lemon Squeezy-via-in-app-browser flow is a real Play Store rejection risk. Requires: native billing library (e.g. `react-native-iap`), matching Play Console subscription products, and backend receipt validation. **Internal Testing does not require this fix — only Production does.**
2. Apple App Store / iOS build — not started.
3. Founder photo on About page — placeholder in place (`TODO(Huzaifa):` marker in code), Huzaifa to provide professional photo.
4. Play Store screenshots — captured from device by Huzaifa, committed to `assets/play-store/screenshots/`.
5. Atoms Dev migration — web app still served via Atoms Dev; migration to Hostinger-hosted, GitHub-deployed infrastructure is in progress (see `MIGRATION-COMPLETE.md` once finished, or Known Issues below if still pending).

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

**Security advisories (non-blocking, worth addressing):**
- `notification_preferences` and `push_subscriptions` each have a `service_role_all_*` policy with `USING (true)` / `WITH CHECK (true)` for `ALL` commands — likely an intentional service-role backend-access pattern (edge functions manage these tables), but worth double-checking it's scoped only to the service role and not exposed to anon/authenticated users.
- Leaked password protection (HaveIBeenPwned check) is disabled in Supabase Auth settings — free to enable, recommended.
- **Atoms Dev** (atoms.dev) — currently serves `app.amanahlife.com` via a custom DNS A record pointing to their infrastructure (UCloud, Hong Kong). This is being migrated away from — see Known Issues.

---

## 0f. StartFleet / Mercury Bank Requirements — Status

1. ✅ Footer: `© 2026 AmanahLife, a product of LinkoraNet LLC. All rights reserved.` (+ Arabic equivalent) — live on web footer/landing and Android Settings/More screens.
2. ✅ About/Founder section — Huzaifa Al Ezzo bio (EN + AR, exact text), LinkedIn link, photo placeholder with `TODO(Huzaifa):` marker — present on web landing page, web `/about` page, and Android About screen.
3. ✅ `/about` page accessible from navigation on both platforms.
4. ✅ Privacy Policy at a public URL (`https://app.amanahlife.com/privacy`), not behind login. Account deletion also has a public page at `/delete-account`.

---

## 0g. Known Issues

- **Web app is not yet migrated off Atoms Dev.** `app.amanahlife.com` is served by Atoms Dev's infrastructure; the GitHub repo `HEZZO7/AmanahLifeapp` has historically been a manually-synced mirror, not the deploy source. Atoms Dev's own account has hit its usage quota ("0 credits remaining"), which blocks further changes through that chat interface.
- **Android subscriptions still use Lemon Squeezy via in-app browser**, not native Google Play Billing — see Pending Items #1.
- Document Vault feature not confirmed ported to Android (web has it, Android status unclear as of this writing).
- Two Google Cloud project numbers are involved in OAuth (`792822759216` and `405525965488`) due to historical setup by a previous builder — both are correctly authorized in Supabase's Google provider config, but this dual-project setup is worth consolidating into one project eventually for cleanliness (not urgent, currently working correctly).

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
See `DEPLOYMENT.md` (produced during Phase 4 of the migration) for the GitHub → Hostinger (or chosen host) auto-deploy setup.

### Supabase
Edge functions are deployed via the Supabase CLI or dashboard; no local migration tooling is set up in this repo as of this writing — schema changes have been applied directly.

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
