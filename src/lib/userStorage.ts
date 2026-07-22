/**
 * Per-user-scoped AsyncStorage wrapper.
 *
 * Every screen used to read/write content under a fixed key (e.g.
 * 'amanah_family_budget'), with no relation to which account was signed in.
 * On a shared device, signing out of account A and into account B would
 * show account A's data to account B (and let B silently overwrite it).
 *
 * getUserItem/setUserItem/removeUserItem wrap AsyncStorage with the key
 * scoped to the current user.id (or 'guest' when signed out), so each
 * account's content is isolated on the same device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export function getScopedKey(baseKey: string, userId: string | null): string {
  return `${baseKey}:${userId ?? 'guest'}`;
}

export async function getUserItem(baseKey: string, userId: string | null): Promise<string | null> {
  return AsyncStorage.getItem(getScopedKey(baseKey, userId));
}

export async function setUserItem(baseKey: string, userId: string | null, value: string): Promise<void> {
  return AsyncStorage.setItem(getScopedKey(baseKey, userId), value);
}

export async function removeUserItem(baseKey: string, userId: string | null): Promise<void> {
  return AsyncStorage.removeItem(getScopedKey(baseKey, userId));
}

/**
 * One-time upgrade path: if data exists under the old unscoped `baseKey`
 * and nothing yet exists under this user's scoped key, copy it over and
 * remove the legacy key. Safe to call on every screen mount — it's a no-op
 * once migrated (or if there was never legacy data to begin with).
 */
export async function migrateLegacyKeyIfNeeded(baseKey: string, userId: string | null): Promise<void> {
  try {
    const scopedKey = getScopedKey(baseKey, userId);
    const [existingScoped, legacy] = await Promise.all([
      AsyncStorage.getItem(scopedKey),
      AsyncStorage.getItem(baseKey),
    ]);
    if (legacy !== null && existingScoped === null) {
      await AsyncStorage.setItem(scopedKey, legacy);
      await AsyncStorage.removeItem(baseKey);
    }
  } catch {
    // Best-effort — if migration fails, the screen just starts fresh under
    // the new scoped key rather than crashing.
  }
}
