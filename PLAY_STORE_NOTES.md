# Play Store Submission Notes — AmanahLife

## ⚠️ Submit to Internal Testing first — do NOT submit to Production yet

**Hard blocker before Production:** Google Play Billing must be integrated for the GCC/MENA subscription flow. The current Lemon Squeezy external checkout (opened via in-app browser from `app/(tabs)/subscription.tsx`) is a Play Store policy risk in markets where Google Play Billing is available and required — **Saudi Arabia, UAE, Qatar, Egypt, Kuwait, Iraq** (all confirmed live Play Billing markets). The US Epic v. Google court injunction (effective Oct 29, 2025) relaxed Play Billing requirements for apps serving **US users only** — it does **not** extend to GCC/MENA, which is this app's actual target market. Tracked as its own task, blocking Production release specifically.

Internal Testing does not require this fix — it's safe to upload the current `.aab` there now to validate everything else (sign-in, RTL, new features) on a real device.

---

## Store Assets (ready in `/assets/play-store/`)

- `icon-512.png` — 512×512, no alpha
- `feature-graphic-1024x500.png` — dark green/gold, "AmanahLife — Plan with Purpose. Live with Amanah."
- `screenshots/01-dashboard.png`, `02-planner.png`, `03-pricing.png`, `04-settings.png` — captured from the real device, English, 1080×2118 (9:16)
- `amanahlife-production.aab` (gitignored — too large for GitHub; upload directly to Play Console from this local path)

## Store Listing Copy

**App Title:** AmanahLife: Life Planner & Log

**Short Description:** Your smart life companion — plan goals, habits, and daily life in one app.

**Category:** Lifestyle

**Developer name:** LinkoraNet LLC

**Developer email:** admin@amanahlife.com

**Developer website:** https://app.amanahlife.com/landing

**Privacy Policy URL:** https://app.amanahlife.com/privacy (public, not behind login — confirmed)

**Full Description:**

> AmanahLife is your all-in-one personal life planning and daily log app — designed to help you live with purpose, stay organized, and grow every day.
>
> Whether you want to track your daily habits, plan your personal goals, manage your family budget, or stay on top of your spiritual routine, AmanahLife brings everything together in one beautiful, easy-to-use app.
>
> **Plan Your Life**
> - Daily planner and task tracker
> - Personal and family goal setting
> - Life score — weekly assessment of your progress
> - AI Life Coach for personalized daily guidance
>
> **Stay Organized**
> - Bill reminders and payment tracker
> - Family budget planner with income and expense tracking
> - Multi-currency support (USD, EUR, GBP, CAD, AUD and more)
> - Document vault for your family's important files
>
> **Grow Every Day**
> - Habit streaks to build lasting routines
> - Progress analytics and lifestyle KPIs
> - Smart savings challenges
> - Daily briefing to start your day with clarity
>
> **Family Features**
> - Shared family dashboard
> - Up to 6 family members (Family Plan)
> - Shared goals and accountability scores
> - Family prayer streaks
>
> **Spiritual Tools**
> - Prayer times and Qibla finder
> - Quran reader with bookmarks
> - Dhikr counter and daily duas
> - Islamic calendar and Ramadan mode
> - Zakat and giving tracker
>
> **Available Worldwide**
> AmanahLife supports users across the United States, Canada, UK, Europe, Australia, and the Middle East — with full multi-currency support and a bilingual interface (English and Arabic).
>
> **Plans**
> - Free: Get started with core features, no credit card required
> - Balanced Life ($6.99/mo): Unlock AI Life Coach, receipt scanner, advanced analytics, and more
> - Family Plan ($12.99/mo): Everything in Balanced, plus shared family tools for up to 6 members
> - Yearly plans available with 20% savings
> - 7-day free trial on all premium plans
>
> AmanahLife is developed and operated by LinkoraNet LLC, a US-registered company.
>
> Plan with Purpose. Live with Amanah.

## Content Rating Answers

- Violence: No
- Sexual content: No
- Profanity: No
- Personal data (name, email): Yes — account registration
- Location data: Yes — prayer times and Qibla direction only
- Directed at children under 13: No
- Ads: No
- In-app purchases/subscriptions: Yes
- **Result: Everyone (E)**

## Location Permission Justification (paste into Play Console)

> "Location is used solely to calculate accurate prayer times and Qibla direction for the user's current position. Location data is not shared with third parties or used for advertising."

## Data Safety Form

- Personal info collected: Name, Email (account registration) — Yes
- Location: Yes, used only for prayer times/Qibla — "used for app functionality," not shared with third parties, not used for advertising
- Financial info: Yes — budget/transaction data (Supabase-backed on web; AsyncStorage-backed locally on Android)
- Encrypted in transit: Yes (Supabase HTTPS)
- Account deletion: Yes — in-app flow (Settings → Danger Zone) + public web page (`/delete-account`)

## Still Pending

- Founder photo — placeholder in place, Huzaifa to provide
- Google Play Billing (Production blocker only, see above)
