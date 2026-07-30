# FamilyBudget Phase B step 2 — conflict-resolution options

**Status:** for review during the Phase B step 1 soak period. The conflict-resolution *option* is still open — nothing below is implemented.

**One thing is now settled (2026-07-30):** mirroring deletion is the **first task of step 2**, ahead of choosing any conflict-resolution option. It is a correctness gap that exists today, not a race to guard against, and it is a prerequisite for everything else — there is no point reasoning about which writer wins a conflict while deleted rows silently come back regardless. **Soft delete is the leaning** (see the deletion section below), on the grounds that this is shared financial data where an audit trail of who removed what has real value. Not implemented; recorded here as the confirmed starting point for when the soak ends.

**Decide before starting step 2** (flipping reads from local storage to the server), because the choice changes how much of the client gets rewritten.

---

## The problem, precisely

Step 1 mirrors the client's **entire** local blob on every change: a debounced push that upserts every settings row, every category, and every income and expense row it holds. That is safe today for one reason only — **reads still come from local storage**, so nothing the server holds is ever shown to a user. The moment step 2 makes the server the read source, three real failure modes open up.

### 1. Stale overwrite
Device B has the budget loaded. Device A adds an expense. B's user changes one unrelated number. B's mirror pushes B's *whole* blob — which never contained A's expense — and A's newer values get overwritten by B's older ones.

Notably this needs no simultaneous editing. A tab left open overnight is enough.

### 2. Deletion is not mirrored at all — a gap that exists *today*
`mirrorToServer()` only ever upserts. Nothing deletes. So right now, deleting an expense locally leaves the row on the server permanently. During step 1 that is invisible (server data is never read). After step 2 the deleted row **reappears** on next load.

Worse, with whole-blob pushes a stale device actively resurrects rows: it re-upserts entries the user deleted elsewhere. Whatever else is chosen, **step 2 cannot ship without deciding deletion semantics.**

### 3. Silent same-field races
Two members edit the Housing budget within the debounce window. One value survives. Neither user is told.

Of the three, **(2) is the one that must be solved** — it is an existing correctness gap, not a theoretical race. (1) is likely in real use. (3) is rare and arguably acceptable.

---

## Option A — Server-authoritative with per-row operations

Stop pushing the blob. Rewrite each mutation to issue one targeted operation: insert *this* expense, delete *this* expense, update *this* setting. Reads come from the server; local storage becomes a display cache for offline/first paint.

- **Fixes:** (1) entirely — a device can only ever transmit the change it actually made, so it cannot clobber fields it never touched. (2) naturally — a delete is a real `DELETE`. (3) narrows it to genuine same-field, same-moment edits.
- **Costs:** the largest client change of the options here — every handler in `FamilyBudget.tsx` (and later `family-budget.tsx`) moves from "mutate blob, let the effect sync" to explicit operations. Needs a decision on offline behaviour: queue operations, or block writes when offline.
- **Note:** this is the conventional destination for exactly this migration shape. The other options are mostly refinements *on top of* it rather than alternatives to it.

## Option B — Optimistic concurrency (version / `updated_at` check)

Each row carries a version. The client sends the version it last read; the server rejects the write if it has moved. On rejection the client refetches and either retries or surfaces the conflict.

- **Fixes:** turns (1) and (3) from silent data loss into a detectable event.
- **Costs:** needs a policy for what happens on rejection — silent retry (which can still lose the user's intent), or a conflict UI (real design work for a rare case). Adds a column and a check to every write. **Does not fix (2)** on its own.
- **Honest assessment:** most valuable combined with A, not instead of it. On its own it detects conflicts that whole-blob pushes create, rather than stopping them being created.

## Option C — Field-level timestamps (CRDT-lite)

Every field carries its own `updated_at`; a write only lands if its timestamp is newer than what is stored.

- **Fixes:** tolerates out-of-order arrival, so (1) becomes much less damaging.
- **Costs:** depends on **client clocks**, which are wrong more often than people expect — a device with a skewed clock will either permanently lose every write or permanently win every write. Significantly heavier schema. Still resolves (3) silently. **Does not fix (2).**
- **Honest assessment:** more machinery than a family budget with a handful of members warrants.

## Option D — Realtime subscriptions (a complement, not a solution)

Subscribe to the family's tables via Supabase Realtime so every device refreshes when anything changes.

- **Fixes:** nothing on its own — but it dramatically shrinks the window in which a device *can* be stale, which is what makes (1) likely in practice.
- **Costs:** a live connection per open client; needs care so an incoming update does not stomp a field the user is mid-edit.
- **Honest assessment:** cheap, high value **on top of A**. Worth considering in the same step precisely because "stale tab" is the realistic trigger.

## Option E — Locking / single-writer

Mentioned only to dismiss: for a household budget with a few members, "Fatima is editing" locks are disproportionate and produce their own failure mode (stale locks from a closed tab).

---

## Deletion semantics — the confirmed first task of step 2

This is no longer a sub-decision to be taken alongside the conflict option. It comes **first**, because it is the one defect here that is already real: `mirrorToServer()` only upserts, so a locally deleted expense persists on the server indefinitely and would reappear the moment reads flip over.

- **Hard delete** — simple, and correct once reads are server-authoritative and pushes are per-row (Option A). A stale client cannot resurrect anything because it no longer pushes rows it did not touch. But it depends on that rewrite landing first, and it leaves no record.
- **Soft delete (`deleted_at`)** — **the current leaning.** Defensive in a way hard delete is not: even a misbehaving, offline-for-a-week, or not-yet-updated client cannot bring a row back, because the row's deleted state is data rather than an absence. It also leaves an audit trail of who removed what and when — genuinely useful for a shared household budget, where "where did that 3,000 go?" is a question people actually ask each other. Costs a column and a filter on every read.

Leaning soft delete unless something during the soak argues otherwise. Worth noting it also decouples this task from Option A: soft delete is correct even while the client still pushes whole blobs, so it can ship before the larger client rewrite rather than depending on it.

---

## Suggested shape (deletion now settled; the rest still for review)

Order of work when the soak ends:

1. **Mirror deletion (soft delete).** Confirmed first task — see above.
2. **Then** choose and implement a conflict-resolution option from the below.

**A + D** is the suggestion for step 2 proper:

- **A** because it is the only option that fixes the gap that actually exists today (2), and it removes the *mechanism* behind (1) rather than detecting its damage after the fact.
- **D** because the realistic trigger for staleness is an idle open client, and Realtime addresses that directly for little effort.
- **B** deferred — worth revisiting if real usage shows same-field races, which it may well never.
- **C** rejected on clock-skew grounds unless offline editing becomes a headline feature.

**What to watch during the soak** that would change this recommendation:
- Does anyone actually use the feature from two devices? If not, the urgency of (1) drops sharply and A can be scoped smaller.
- Do server rows accumulate that no longer exist locally? That is (2) happening in production, and it makes deletion semantics the first thing step 2 addresses.
