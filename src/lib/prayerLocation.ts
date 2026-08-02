/**
 * Shared location + calculation-method resolution for prayer-time
 * calculation - used by both the Prayer Times screen and the background
 * notification schedulers (prayerNotifications.ts / notificationPreferences.ts)
 * so they always compute against the exact same persisted settings instead
 * of two independently-drifting copies of this logic. Same storage keys
 * app/(tabs)/prayer-times.tsx writes to.
 */
import * as Location from 'expo-location';
import { getUserItem } from './userStorage';
import { CalculationMethodKey, DEFAULT_CALCULATION_METHOD } from './prayerCalculation';
import { CityOption } from '../data/curatedCities';

export const CALC_METHOD_KEY = 'prayer_calc_method';
export const LOCATION_MODE_KEY = 'prayer_location_mode';
export const MANUAL_CITY_KEY = 'prayer_manual_city';

const MECCA_COORDS = { latitude: 21.4225, longitude: 39.8262 };
const GPS_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('location-timeout')), ms)),
  ]);
}

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  method: CalculationMethodKey;
  source: 'manual' | 'gps' | 'last-known' | 'default';
}

export async function getPersistedCalcMethod(userId: string | null): Promise<CalculationMethodKey> {
  const saved = await getUserItem(CALC_METHOD_KEY, userId);
  return (saved as CalculationMethodKey) || DEFAULT_CALCULATION_METHOD;
}

/**
 * Always resolves to *some* coordinates (manual city > GPS > last-known >
 * Mecca default) - unlike the old Aladhan-fetch approach, this cannot fail
 * outright, since it's the same fallback chain prayer-times.tsx uses.
 */
export async function resolveActiveLocation(userId: string | null): Promise<ResolvedLocation> {
  const method = await getPersistedCalcMethod(userId);
  const [savedMode, savedCity] = await Promise.all([
    getUserItem(LOCATION_MODE_KEY, userId),
    getUserItem(MANUAL_CITY_KEY, userId),
  ]);

  if (savedMode === 'manual' && savedCity) {
    try {
      const city = JSON.parse(savedCity) as CityOption;
      return { latitude: city.lat, longitude: city.lon, method, source: 'manual' };
    } catch { /* fall through to GPS */ }
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await withTimeout(Location.getCurrentPositionAsync({}), GPS_TIMEOUT_MS);
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, method, source: 'gps' };
    }
  } catch { /* GPS timed out or failed - try last known below */ }

  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude, method, source: 'last-known' };
  } catch { /* fall through to default */ }

  return { latitude: MECCA_COORDS.latitude, longitude: MECCA_COORDS.longitude, method, source: 'default' };
}
