/**
 * Phase 6 (critical-audit-2026-07): consolidates the load-migrate-then-read,
 * write-on-change pattern that was hand-copied into most of the 16 screens
 * scoped in Phase 1 (userStorage.ts) - each screen had its own near-identical
 * pair of effects:
 *
 *   useEffect(() => {
 *     migrateLegacyKeyIfNeeded(key, userId).then(() => {
 *       getUserItem(key, userId).then((s) => { if (s) setState(JSON.parse(s)); });
 *     });
 *   }, [userId]);
 *   useEffect(() => { setUserItem(key, userId, JSON.stringify(state)); }, [state, userId]);
 *
 * Only usable for a screen's OWN single, static (non-templated) storage key
 * where load-then-write-back is the whole pattern. Does NOT cover: dynamic
 * per-day keys (dhikr/adhkar/fasting/quran-pages), read-only cross-file keys
 * a screen doesn't own (e.g. goals.tsx reading tasks.tsx's list for a linked
 * count), or settings.tsx's bespoke multi-key backup/restore/delete logic -
 * those keep their existing hand-written effects, unchanged.
 */
import { useEffect, useRef, useState } from 'react';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from './userStorage';

export interface UsePersistedStateOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
}

/**
 * Returns [value, setValue, ready]. `ready` flips to true once the initial
 * migrate+load for the current userId has finished - mirrors the `ready`
 * guard ramadan-planner.tsx and family-budget.tsx already used by hand to
 * avoid writing the default value back over real stored data before the
 * load completes; callers that don't need it can just ignore the third
 * element.
 */
export function usePersistedState<T>(
  baseKey: string,
  userId: string | null,
  defaultValue: T,
  options?: UsePersistedStateOptions<T>
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const serialize = options?.serialize ?? ((v: T) => JSON.stringify(v));
  const deserialize = options?.deserialize ?? ((raw: string) => JSON.parse(raw) as T);
  const defaultValueRef = useRef(defaultValue);

  const [value, setValue] = useState<T>(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    migrateLegacyKeyIfNeeded(baseKey, userId)
      .then(() => getUserItem(baseKey, userId))
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try { setValue(deserialize(raw)); } catch { setValue(defaultValueRef.current); }
        } else {
          setValue(defaultValueRef.current);
        }
        setReady(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey, userId]);

  useEffect(() => {
    if (!ready) return;
    setUserItem(baseKey, userId, serialize(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready, userId]);

  return [value, setValue, ready];
}
