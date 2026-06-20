# AmanahLife — React Native App

> **Your intelligent Islamic life companion** · رفيقك الذكي في الحياة الإسلامية

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)](https://expo.dev)
[![EAS Build](https://img.shields.io/badge/EAS-Build-4630EB?logo=expo)](https://expo.dev/eas)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-brightgreen)](https://github.com/HEZZO7/amanahlife-rn)

---

## Overview

AmanahLife is a full-featured Islamic life companion app built with **Expo SDK 54** and **React Native**. It is a complete native migration of the web app at `app.amanahlife.com`, featuring prayer times, Quran reader, dhikr counter, halal finance tracking, goals, wellness, AI coaching, Ramadan planner, and much more — all in one beautifully designed bilingual (English / Arabic RTL) app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 (New Architecture enabled) |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (Auth + Database) |
| Auth | Email/Password + Google Sign-In (native idToken) |
| Fonts | Tajawal (UI) + Amiri (Arabic) via `@expo-google-fonts` |
| State | React Context + Zustand + TanStack Query |
| Payments | Lemon Squeezy (via Supabase Edge Function) |
| Build | EAS Build (Android AAB + iOS IPA) |
| Storage | AsyncStorage (replaces localStorage) |
| Location | expo-location (replaces navigator.geolocation) |

---

## Features & Screens

| Screen | Route | Description |
|---|---|---|
| Dashboard | `/` | Hijri date, next prayer, verse of the day, streak |
| Prayer Times | `/prayer-times` | aladhan.com API, location-based, mark prayers done |
| Quran Reader | `/quran` | alquran.cloud API, surah list, ayah view, bookmarks |
| Duas Collection | `/duas` | Categorized duas, favorites, expandable cards |
| Adhkar | `/adhkar` | Morning/Evening/Prayer/Sleep with tap counters |
| Dhikr Counter | `/dhikr` | 6 presets, SVG progress ring, haptic feedback |
| Qibla Finder | `/qibla` | Live compass via expo-location heading |
| Islamic Calendar | `/calendar` | Hijri date, upcoming events, browse by month |
| Fasting Tracker | `/fasting` | Suhoor/Iftar toggles, 30-day grid, Quran pages |
| Ramadan Planner | `/ramadan-planner` | 30-day calendar, meals, budget, Eid, charity |
| Finance | `/finance` | Income/expense tracker, savings rate, FAB modal |
| Family Budget | `/family-budget` | Family members, categories, income/expense tabs |
| Goals | `/goals` | Category/status filters, gradient progress, linked tasks |
| Tasks | `/tasks` | Week strip, category filters, priority, FAB modal |
| Planner | `/planner` | Agenda/Weekly/Monthly views, Hijri header |
| Wellness | `/wellness` | Mood/sleep/hydration/stress, SVG gauges, trend bars |
| Weekly Life Score | `/weekly-life-score` | 5-dimension score from live data, weekly history |
| Progress Analytics | `/progress-analytics` | Goals breakdown, task completion, streaks |
| AI Life Coach | `/ai-life-coach` | Category-based advice, habits, wisdom quotes |
| Zakat / Giving | `/giving-tracker` | Nisab, live FX rates, 12 currencies, result card |
| Settings | `/settings` | Language, theme, country, currency, sign out |
| Subscription | `/subscription` | 3 tiers, monthly/yearly billing, Lemon Squeezy checkout |

---

## Design System

```
Background:   #0A1F17   (dark green)
Card:         #102B1F
Border:       #163828
Teal accent:  #1FC7C1   (primary brand)
Gold accent:  #D4A017
Text:         #F2EFE9   (warm cream)
Font UI:      Tajawal (Arabic-friendly sans-serif)
Font Arabic:  Amiri (for Quran/dua text)
```

All screens support **bilingual EN/AR** with full **RTL layout** switching instantly — no app restart needed. The native RTL layer (`I18nManager`) is locked to LTR; all RTL is handled manually via `isRTL` from `LanguageContext`.

---

## Project Structure

```
AmanahLifeRN/
├── app/
│   ├── (auth)/          # landing, login, signup
│   ├── (tabs)/          # all 20+ feature screens
│   └── _layout.tsx      # root layout (fonts, providers)
├── assets/              # icon.png, splash.png, logo.png, adaptive-icon.png
├── src/
│   ├── components/
│   │   ├── GlobalHeader.tsx     # sticky header (logo, EN/AR, theme, menu)
│   │   ├── navigation/
│   │   │   └── BottomNav.tsx    # 5-tab bar (flips for Arabic)
│   │   └── ui/                  # Card, Button, PageHeader, ProgressBar, GradientCard, Screen
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Supabase auth + Google Sign-In
│   │   ├── LanguageContext.tsx  # EN/AR, isRTL, translations
│   │   ├── ThemeContext.tsx     # dark/light, color tokens
│   │   └── SubscriptionContext.tsx  # tier, trial, isPremium
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client (PKCE, AsyncStorage)
│   │   ├── googleAuth.ts        # Google Sign-In config (web client ID)
│   │   ├── toast.tsx            # Lightweight toast (replaces sonner)
│   │   └── useBottomSheet.ts    # Safe area padding for bottom sheets
│   ├── screens/
│   │   └── DashboardScreen.tsx  # Home screen
│   └── theme/
│       └── fonts.ts             # Tajawal + Amiri font constants
├── app.json             # Expo config (bundle IDs, plugins, EAS project)
├── eas.json             # EAS Build profiles (dev, preview, production)
├── google-services.json # Firebase/Google config for Android
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 10+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`

### Install & Run

```bash
git clone https://github.com/HEZZO7/amanahlife-rn.git
cd amanahlife-rn
npm install
npx expo start
```

Open in **Expo Go** for quick testing, or build a dev client for full native features.

---

## Google Sign-In Setup

To enable native Google Sign-In, paste the **Web OAuth Client ID** from Google Cloud Console into:

```ts
// src/lib/googleAuth.ts
export const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
```

Required OAuth clients in Google Cloud Console:
- **Web application** → used as `webClientId` above
- **Android** → package `com.linkoranet.amanahlife` + SHA-1 from EAS keystore

Supabase → Authentication → Providers → Google → **Authorized Client IDs** must include the Web Client ID.

---

## Building for Stores

```bash
# Login to EAS
eas login

# Development build (installs on device, no Play Store)
eas build --profile development --platform android

# Preview APK (for internal testing)
eas build --profile preview --platform android

# Production AAB (for Google Play)
eas build --profile production --platform android

# Production IPA (for App Store — requires Apple Developer account)
eas build --profile production --platform ios

# Submit to Google Play (account required)
eas submit --platform android

# Submit to App Store
eas submit --platform ios
```

### Store Details
| | Android | iOS |
|---|---|---|
| Package | `com.linkoranet.amanahlife` | `com.linkoranet.amanahlife` |
| EAS Project | `@linkoranet/amanahlife` | same |
| Project ID | `8f0bac58-8ce6-4805-bea4-57a3f26d0fbf` | same |

---

## Supabase

- **Project:** `nyhsnvjdgifphwkqzwel` (eu-west-1)
- **URL:** `https://nyhsnvjdgifphwkqzwel.supabase.co`
- **Auth:** Email (auto-confirm) + Google (enabled)
- **Tables:** `subscriptions` (tier, status, billing_cycle, user_id)
- **Edge Functions:** `app_11941c8fec_lemonsqueezy_checkout` (payment + portal)

Dashboard: https://supabase.com/dashboard/project/nyhsnvjdgifphwkqzwel

---

## Subscription Tiers

| Tier | Monthly | Yearly | Features |
|---|---|---|---|
| Free 🌱 | $0 | $0 | Prayer Times, Quran, Dhikr, Basic Planner |
| Balanced Life ⭐ | $6.99 | $4.99/mo | AI Insights, Smart Planning, Lifestyle Tracking |
| Family Plan 👑 | $12.99 | $9.99/mo | All Balanced + Family Sharing, Shared Dashboard |

Payment: Lemon Squeezy · 7-day free trial available

---

## Environment & Keys

All keys in this repo are **public/anon keys** — safe to commit:
- Supabase anon key (public by design)
- Google Web Client ID (public OAuth client)

**Never commit:** Supabase `service_role` key, private keys, or `.env` files with secrets.

---

## Roadmap

- [ ] Google Play Store submission (pending account approval)
- [ ] App Store submission (pending Apple Developer enrollment)
- [ ] Push notifications (expo-notifications)
- [ ] Receipt scanner screen (camera-based)
- [ ] Savings challenges screen
- [ ] Family dashboard screen
- [ ] Bill reminders screen

---

## Built By

**LinkoraNet LLC** · Qatar 🇶🇦

- Web: [amanahlife.com](https://amanahlife.com)
- GitHub: [@HEZZO7](https://github.com/HEZZO7)
- Email: amanahlifeapp@gmail.com

---

*May this app be a source of barakah for all who use it. 🤲*
