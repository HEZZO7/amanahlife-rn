# Item 5 Summary — Restore Slide/Fade-In to the 5 Nav-Overlap-Fixed Sheets

## Problem

`audit/navbar-overlap-fix-summary.md` fixed the nav-bar overlap bug by
replacing `<Modal>` with a plain positioned `View` in 5 places (RN's
`<Modal>` blocks touches to everything behind it, even fully transparent
areas — a real platform difference from web's CSS stacking). That fix was
correct but had a side effect noted at the time: these 5 sheets lost the
slide/fade transition `<Modal>` provided for free, and started appearing
instantly instead.

## Fix

New `src/lib/useSheetAnimation.ts` — a small shared hook:

```ts
useSheetAnimation(visible: boolean, distance = 24) => { opacity, translateY }
```

Uses plain `Animated` from `react-native` (not `react-native-reanimated` —
reanimated is only present as a transitive dependency, never imported
directly anywhere in the app, so adding a first direct usage here would
mean also verifying its babel plugin/worklet setup is correctly configured,
for no real benefit over `Animated.timing` on a one-shot fade). Runs with
`useNativeDriver: true`, so the animation executes entirely on the native
thread and can never block a JS-thread tap on the nav bar underneath while
it plays.

Applied to all 5 places, each wrapping only the sheet/card panel itself
(not the backdrop `Pressable`, and not the outer `pointerEvents="box-none"`
container) in an `Animated.View` carrying the opacity/translateY, with the
existing tap-swallowing inner `Pressable` (`onPress={() => {}}`, stops taps
on the card from bubbling to the backdrop's close handler) left completely
unchanged inside it:

- `src/components/navigation/BottomNav.tsx` — search sheet ("Choose Search
  Type"), `distance: 60` (larger, since it's a bottom sheet that should
  read as sliding up from off-screen, not a centered dialog nudging in).
- `app/(tabs)/finance.tsx` — Add/Edit Transaction, default `distance: 24`.
- `app/(tabs)/tasks.tsx` — Add Task, default `distance: 24`.
- `app/(tabs)/planner.tsx` — Add Event (the screen the original nav-overlap
  bug was reported against), default `distance: 24`.
- `app/(tabs)/bill-reminders.tsx` — Add Bill, default `distance: 24`.

Each screen's `showX` boolean (already used for `useBackToClose`) is passed
straight into `useSheetAnimation` — no new state needed. The hook resets
its animated value to 0 and restarts the timing whenever `visible` flips
true, so re-opening a sheet after closing it always replays the animation
correctly.

## Deliberately not done

- **No exit animation.** These sheets are still conditionally rendered
  (`{showX && (...)}`) and unmount immediately on close, same as before —
  only the entrance got an animation back, matching the "simple visual
  animation" ask and the scope of what was actually lost. Adding an exit
  animation would require delaying the unmount (e.g. an `isClosing` state
  or `Animated.timing` callback before `setShowX(false)`), which is a
  bigger behavioral change than restoring what `<Modal>` used to do for
  the entrance.
- **No backdrop fade.** Only the panel itself animates; the backdrop
  `Pressable` appears at full opacity immediately, same as it did right
  after the nav-overlap fix landed. Could be added later as a small
  follow-up if wanted, but wasn't part of what broke.

## Typecheck

`npx tsc --noEmit`: zero new errors in any of the 6 touched/new files
(`useSheetAnimation.ts`, `BottomNav.tsx`, `finance.tsx`, `tasks.tsx`,
`planner.tsx`, `bill-reminders.tsx`). `git status` confirms these are the
only files changed. The only errors anywhere in the run are the
pre-existing `cardTitle` baseline errors in `ramadan-planner.tsx` — a
different, untouched file, already documented as known noise in
`audit/phase6-summary.md`.

## Not performed — on-device verification

Could not confirm on an actual device or in Expo Go that the animation
plays smoothly, that timing feels right, or that RTL (Arabic) layout
doesn't shift oddly during the slide (translateY only, so it shouldn't,
but not visually confirmed) — EAS build quota is exhausted until Aug 1,
the same limitation noted on every RN item this session. Recommend
opening each of the 5 sheets once a build is available and confirming: the
panel fades/slides in smoothly, the nav bar underneath stays visible and
tappable throughout the animation (not just after it finishes), and taps
inside the panel still don't accidentally close the sheet.
