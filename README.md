# AmanahLife — React Native (Expo SDK 52)

Migrated from the real Atoms Dev web app at `app.amanahlife.com`
Backend: Supabase `nyhsnvjdgifphwkqzwel.supabase.co`

---

## What's been migrated (exact 1:1 from web app)

| Web source | RN equivalent |
|---|---|
| `src/lib/supabase.ts` | `src/lib/supabase.ts` — same URL + anon key, uses AsyncStorage |
| `src/contexts/AuthContext.tsx` | `src/contexts/AuthContext.tsx` — same Supabase auth |
| `src/contexts/LanguageContext.tsx` | `src/contexts/LanguageContext.tsx` — same translations, RTL |
| `src/contexts/ThemeContext.tsx` | `src/contexts/ThemeContext.tsx` — same dark/light, teal brand |
| `src/contexts/SubscriptionContext.tsx` | `src/contexts/SubscriptionContext.tsx` — same tiers (free/balanced/family) |
| `src/components/BottomNav.tsx` | `src/components/navigation/BottomNav.tsx` — exact same 5 tabs + search modal |
| `src/pages/Index.tsx` | `src/screens/DashboardScreen.tsx` — Hijri date, prayer times, verse of day, streak |
| `src/pages/Login.tsx` | `app/(auth)/login.tsx` |
| `src/pages/LandingPage.tsx` | `app/(auth)/landing.tsx` |

---

## Setup

```bash
npm install -g eas-cli
npm install
npx expo start
```

Press `a` for Android, `i` for iOS simulator.

---

## Key replacements (web → mobile)

| Web API | React Native equivalent |
|---|---|
| `localStorage` | `AsyncStorage` from `@react-native-async-storage/async-storage` |
| `navigator.geolocation` | `expo-location` |
| `window.location.href` | `router.replace()` from `expo-router` |
| `document.dir = 'rtl'` | `I18nManager.forceRTL(true)` |
| `react-router-dom` | `expo-router` (file-based) |
| `localStorage('amanah-theme')` | `AsyncStorage.getItem('amanah-theme')` |
| Google OAuth redirect | `expo-web-browser` + deep link `amanahlife://auth/callback` |

---

## All pages to migrate

| Path | Web source file | Status |
|---|---|---|
| `/` | `pages/Index.tsx` | ✅ Full |
| `/finance` | `pages/Finance.tsx` | 🔲 Stub |
| `/planner` | `pages/Planner.tsx` | 🔲 Stub |
| `/settings` | `pages/Settings.tsx` | 🔲 Stub |
| `/goals` | `pages/Goals.tsx` | 🔲 Stub |
| `/wellness` | `pages/Wellness.tsx` | 🔲 Stub |
| `/prayer-times` | `pages/PrayerTimes.tsx` | 🔲 Stub |
| `/quran` | `pages/QuranReader.tsx` | 🔲 Stub |
| `/dhikr` | `pages/DhikrCounter.tsx` | 🔲 Stub |
| `/duas` | `pages/DuasCollection.tsx` | 🔲 Stub |
| `/adhkar` | `pages/Adhkar.tsx` | 🔲 Stub |
| `/qibla` | `pages/QiblaFinder.tsx` | 🔲 Stub |
| `/giving-tracker` | `pages/ZakatCalculator.tsx` | 🔲 Stub |
| `/calendar` | `pages/IslamicCalendar.tsx` | 🔲 Stub |
| `/fasting` | `pages/FastingTracker.tsx` | 🔲 Stub |
| `/tasks` | `pages/TaskManager.tsx` | 🔲 Stub |
| `/ai-life-coach` | `pages/AILifeCoach.tsx` | 🔲 Stub |
| `/weekly-life-score` | `pages/WeeklyLifeScore.tsx` | 🔲 Stub |
| `/ramadan-planner` | `pages/RamadanPlanner.tsx` | 🔲 Stub |
| `/progress-analytics` | `pages/ProgressAnalytics.tsx` | 🔲 Stub |
| `/family-budget` | `pages/FamilyBudget.tsx` | 🔲 Stub |
| `/financial-dashboard` | `pages/FinancialDashboard.tsx` | 🔲 Stub |
| `/savings-challenges` | `pages/SmartSavingsChallenges.tsx` | 🔲 Stub |
| `/receipt-scanner` | `pages/ReceiptScanner.tsx` | 🔲 Stub |
| `/search` | `pages/ClassicSearch.tsx` | 🔲 Stub |
| `/ai-search` | `pages/AISearch.tsx` | 🔲 Stub |

---

## Supabase tables used in the web app
- `subscriptions` (user_id, tier, status, billing_cycle)
- `profiles` (inferred from user metadata)

Check your Supabase dashboard at:
`https://supabase.com/dashboard/project/nyhsnvjdgifphwkqzwel/editor`

---

## Build for stores

```bash
# Android APK (for testing)
eas build --platform android --profile preview

# Production builds
eas build --platform all --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

Built by LinkoraNet LLC · Qatar 🇶🇦
