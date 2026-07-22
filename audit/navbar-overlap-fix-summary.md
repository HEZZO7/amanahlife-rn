# Nav bar overlap fix — web + RN

## The bug

The "Choose Search Type" bottom sheet (Classic Search / AI Smart Search),
Finance's Add/Edit Transaction, Tasks' Add Task, and Planner's Add Event
dialogs all covered the bottom nav bar while open, and taps meant for the
nav were swallowed by the sheet/modal's own backdrop instead.

## Web fix

`BottomNav.tsx`'s search sheet, and the three "Add X" dialogs in
`Finance.tsx`/`TaskManager.tsx`/`Planner.tsx`, all used a `fixed inset-0`
backdrop at a z-index above the nav's (`z-50`). Changed each to
`fixed inset-x-0 top-0` with an inline `bottom: 4rem` (matching the nav's
`h-16`), so the overlay now stops above the nav strip instead of extending
over it.

Not touched (different z-index, or genuinely full-screen by design):
Onboarding's full-screen takeover (`z-[9999]`, intentionally blocks
everything during first run), BackupRestore's confirmation dialog, and
SmartSavingsChallenges' milestone celebration (both `z-50`, same as nav,
not elevated above it).

**Verified live**: fetched the deployed production bundle after Coolify's
auto-deploy and confirmed the `bottom:"4rem"` fix is present in the shipped
code. Could not visually click-test the actual overlap in a browser this
session (screenshot tooling hung, and Finance/Planner/TaskManager all
require authenticated test credentials I don't have) — recommend a quick
manual pass to confirm the nav is visibly undimmed and tappable while each
sheet is open.

## RN fix — a real platform difference, not just copy-paste

React Native's `<Modal>` opens its own native window that captures **every**
touch within its bounds, even where nothing is drawn — a `transparent`
Modal still blocks taps to whatever's behind it (a well-documented
RN/Android limitation). This is fundamentally different from web's CSS
z-index stacking, where an element simply outside an overlay's bounds is
untouched. So simply resizing the RN sheets' backdrop the same way as web
would **not** have fixed anything — the nav would still be unreachable no
matter how the Modal's content was sized, because the Modal's native
window covers the full screen for touch purposes regardless.

The actual fix: stopped using `<Modal>` for these five sheets/dialogs
entirely, replacing each with a plain conditionally-rendered, absolutely-
positioned `View` inside the normal screen tree (same technique as web —
a real sibling in the same view hierarchy, not a separate native window).
Each one is offset from the bottom by the nav bar's own measured height, so
taps below it fall through to the real nav underneath.

**New infrastructure:**
- `src/contexts/NavBarHeightContext.tsx` — `BottomNav` measures its own
  rendered height (which already includes safe-area insets) via `onLayout`
  and publishes it here; any other screen's sheet reads it via
  `useNavBarHeight()` to size its own overlay correctly, without guessing
  or hardcoding a height.
- `src/lib/useBackToClose.ts` — native `Modal` closes automatically on the
  Android back button via `onRequestClose`; a plain View loses that for
  free, so this restores it explicitly (`BackHandler.addEventListener`)
  wherever one of these sheets replaces a Modal.

**Fixed** (all 5 places using this pattern): `BottomNav.tsx`'s search
sheet, `finance.tsx`'s Add/Edit Transaction, `tasks.tsx`'s Add Task,
`planner.tsx`'s Add Event (the screen the bug was originally reported
against), and `bill-reminders.tsx`'s Add Bill (built earlier this session
with the same now-fixed pattern, so it would have inherited the bug
immediately).

**Not touched** (same underlying Modal-blocks-everything issue exists, but
out of scope for this pass — see reasoning below): `giving-tracker.tsx`'s
currency picker and `settings.tsx`'s country picker (same class of bug,
lower-priority selection sheets), `settings.tsx`'s delete-account
confirmation and `savings-challenges.tsx`'s milestone celebration (arguably
fine to keep fully blocking — a destructive confirmation and an
auto-dismissing 3-second toast respectively, not interactive forms users
need the nav open behind), `GlobalHeader.tsx`'s dropdown menu (anchored
near the top, not a bottom sheet, different bug class).

## Typecheck

`audit/navfix-typecheck.txt` vs the prior baseline: identical, zero new
errors across all touched files (`NavBarHeightContext.tsx`,
`useBackToClose.ts`, `app/_layout.tsx`, `BottomNav.tsx`, `finance.tsx`,
`tasks.tsx`, `planner.tsx`, `bill-reminders.tsx`).

## Not performed — on-device verification

This is a real, un-tested platform-level change (removing `<Modal>` in
favor of a plain positioned View). I'm confident in the reasoning — RN's
Modal-blocks-touches-behind-it behavior is a well-documented, widely-hit
issue — but I have not run this on a device or in Expo Go, since EAS build
quota is exhausted until Aug 1. Before shipping, worth confirming on an
actual Android device: the nav bar is visible and tappable while each of
the 5 sheets is open, the sheets themselves still render/animate/dismiss
correctly (they lose Modal's built-in slide/fade transition — these now
appear instantly rather than animating in), and the Android back button
still closes them.
