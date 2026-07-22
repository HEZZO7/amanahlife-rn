# Phase 5 Summary — Centralize Supabase Config

## Problem

The Supabase project URL (and, in `src/lib/supabase.ts`, the anon key) was
hardcoded separately in five places:

- `src/lib/supabase.ts` — the actual client init (URL + anon key)
- `app/(tabs)/subscription.tsx` — `CHECKOUT_ENDPOINT`
- `app/(tabs)/ai-life-coach.tsx` — `AI_COACH_ENDPOINT` (added in Phase 4)
- `app/(tabs)/ai-search.tsx` — `AI_ENDPOINT`
- `app/(tabs)/settings.tsx` — inline in `handleDeleteAccount`'s `fetch(...)` call

Five independent copies of the same project ref string, each of which
would need to be found and edited by hand if the project ever moved (a new
Supabase project, a staging environment, etc.) — easy to miss one.

## Fix

New `src/lib/config.ts`:

```ts
export const SUPABASE_URL = 'https://nyhsnvjdgifphwkqzwel.supabase.co';
export const SUPABASE_ANON_KEY = '...';
export function functionUrl(functionName: string): string {
  return `${SUPABASE_URL}/functions/v1/${functionName}`;
}
```

- `src/lib/supabase.ts` now imports `SUPABASE_URL`/`SUPABASE_ANON_KEY` from
  `config.ts` instead of declaring its own copies.
- The four screens each replaced their hardcoded endpoint string with
  `functionUrl('<function-name>')`.

Verified no hardcoded occurrences of the project ref remain anywhere except
inside `config.ts` itself (`grep -rn "nyhsnvjdgifphwkqzwel"` across `app/`
and `src/`).

## Not in scope

`ANTHROPIC_API_KEY`, `LEMONSQUEEZY_API_KEY`, and the other Edge-Function-side
secrets already live in Supabase's own secrets store (server-side, not this
repo) — those aren't duplicated client-side config, so there's nothing to
centralize for them here.

## Typecheck

`audit/phase5-typecheck.txt` vs `audit/phase4-typecheck.txt`: identical
error set (same pre-existing `cardTitle`/`sectionLabel` errors), only line
numbers shifted by one from each file's new `import { functionUrl } from
'../../src/lib/config'` line. No new errors.

## Not performed — on-device manual test

Didn't run the app on a device to confirm the four screens still reach
their endpoints correctly after the refactor. The change is a pure string
substitution (`functionUrl('x')` produces byte-identical output to the
literal it replaced — confirmed by inspection, not by re-deriving from
scratch), so risk is low, but this wasn't independently verified on-device.
