# Phase 4 Summary — Remove Fake Testimonials + Real AI Life Coach

## Problem

1. `subscription.tsx` rendered a "What Our Users Say" section with four
   entirely fabricated reviews — invented names, cities, star ratings, and
   quotes, presented as real user testimonials. No such reviews exist.
2. `ai-life-coach.tsx`'s "AI Life Coach" picked a random string out of a
   fixed, hardcoded array per category. No AI model was ever called, despite
   the screen's name and framing implying a real, personalized assistant.

## Fix

### Fake testimonials — removed entirely

- Deleted the `TESTIMONIALS` array and its entire rendered `<Card>` section
  from `app/(tabs)/subscription.tsx`, plus the now-dead
  `testimonialCard`/`quoteText`/`reviewerRow`/`reviewerAvatar`/`reviewerName`/
  `reviewerLoc` styles.
- No replacement content was added — there is nothing honest to show here
  yet. If real reviews are collected in the future (App Store/Play Store
  ratings API, a verified-review system, etc.), this section can come back
  backed by that data.

### Real AI Life Coach

- New Edge Function `supabase/functions/app_11941c8fec_ai_life_coach/index.ts`
  — calls Anthropic's Messages API (`claude-haiku-4-5-20251001`) with a
  system prompt grounded in the user's own goals (fetched from
  `amanah-goals`), the last 6 turns of conversation history for continuity,
  and the user's message. Requires a valid Supabase JWT (same
  `supabase.auth.getUser(token)` pattern as the existing Lemon Squeezy
  functions). CORS is scoped to `app.amanahlife.com`/`amanahlife.com` for
  browser callers; native app calls (no `Origin` header) pass through
  unrestricted since browser CORS doesn't apply to them.
- `app/(tabs)/ai-life-coach.tsx`: removed the hardcoded `COACHING_RESPONSES`
  array and random-pick logic entirely. The category buttons now call
  `askCategoryCoach(category)`, which sends a category-scoped prompt to the
  real endpoint. Added a free-text question input (`TextInput` + send
  button) so users can ask their own questions, not just tap a fixed
  category — this is what makes it an actual assistant rather than four
  buttons wired to canned strings. Added a "Coach is thinking..." loading
  state and error toasts for sign-out/network/empty-response cases.
- `WISDOM_QUOTES` and `HABIT_SUGGESTIONS` were left untouched — these are
  static hadith quotes and generic habit tips presented as reference
  content, not chat responses claiming to be personalized AI output, so they
  don't have the same integrity problem the testimonials and coach chat did.

### tsconfig fix (side effect of adding the Edge Function)

- `tsconfig.json` gained `"exclude": ["supabase/functions/**"]`. The new
  Edge Function is Deno runtime code (`Deno.serve`, `npm:` specifiers) that
  the RN/Expo TypeScript project has no business type-checking — without
  this exclude, `npx tsc --noEmit` (this project's own verification method
  used throughout every phase) failed with `Cannot find name 'Deno'` and
  similar errors. The web app never hits this because its `npm run build`
  script is just `vite build`, which never runs `tsc` over
  `src/supabase/functions/` at all — this exclude makes the RN project
  behave the same way, just explicitly instead of by accident.

## ⚠️ Not deployed — no Supabase access

Same constraint as every prior phase touching the backend: I do not have
Supabase MCP access to the production project (`nyhsnvjdgifphwkqzwel`).
Before this works in the app:

1. Deploy the function: `supabase functions deploy app_11941c8fec_ai_life_coach`
   (or via the dashboard) against the real project.
2. Set the `ANTHROPIC_API_KEY` secret on that function. Without it, every
   call returns `{ error: "AI coach not configured" }` (500) and the app
   shows the generic "AI coach is currently unavailable" toast — it fails
   safely, but it does need this key set to actually work.

## Typecheck

`audit/phase4-typecheck.txt` vs `audit/phase2-typecheck.txt`: same
pre-existing error set (`cardTitle`/`sectionLabel` "missing StyleSheet key"
errors), only line numbers shifted from inserted/removed code, plus one
fewer `subscription.tsx` `sectionLabel` error site removed along with the
testimonials section. No new errors. Re-checked again after the Basmalah fix
and Planner change below — still identical, no new errors.

## Not performed — on-device manual test / live AI verification

I could not run the app on a device or call the deployed function (it isn't
deployed yet, per above) to confirm the coach actually produces sensible,
on-topic replies, respects the "no definitive fatwas" instruction in
practice, or that the free-text input handles multi-turn conversations
naturally. Recommend a manual pass once the function is deployed and keyed:
ask a spiritual-growth question, a financial one, and a follow-up question
in the same conversation to confirm history is being used.

---

# Also in this pass (outside the execution plan's phase numbering)

Two items the user raised directly mid-session, addressed before resuming
the phase-by-phase plan:

## Basmalah duplication bug (Quran reader, both apps)

`api.alquran.cloud` prepends the Basmalah to ayah 1's text for every surah
except Al-Fatihah (1) and At-Tawbah (9). Both readers already render the
Basmalah as a separate header line above the surah, so it was showing up
twice — once in the header, once glued onto the start of ayah 1's own text.

Fixed via a shared `stripBasmalahPrefix(text, surahNumber, numberInSurah)`
helper (applied at the point ayah data is mapped into state, before
render) in:
- `app/(tabs)/quran.tsx` (RN)
- `app/frontend/src/pages/QuranReader.tsx` (web, already committed/pushed to
  `main` as `3697a3a` — this one isn't gated behind the audit plan's
  phase-by-phase review since it's an independent, already-verified fix)

Al-Fatihah is correctly left untouched (the Basmalah *is* its ayah 1), and
At-Tawbah's ayah 1 never matches the strip prefix so it's a no-op there too
— verified by reading both files' existing "don't show Basmalah header for
surah 1 or 9" logic, which now stays in sync with the new strip logic.

## Planner: tap any day to review it (RN, weekly view)

`app/(tabs)/planner.tsx`'s Weekly view previously only auto-highlighted
"Today" with no way to look at another day's items. Added `selectedDay`
state (defaults to today); tapping a day row now selects it (highlighted
gold, distinct from today's teal highlight) and a details section below the
week list shows that day's tasks and agenda items, reusing the same card
layout as the Agenda view. Selecting today still shows exactly what it
showed before this change.
