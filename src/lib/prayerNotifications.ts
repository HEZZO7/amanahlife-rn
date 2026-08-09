/**
 * Prayer-time-aware local notification reminders.
 * Schedules a local notification N minutes before each enabled prayer,
 * computed fully offline via adhan-js (src/lib/prayerCalculation.ts) using
 * the same location/method settings the Prayer Times screen persists (see
 * src/lib/prayerLocation.ts) - not a separate copy of that logic.
 *
 * Phase 3 (critical-audit-2026-07): this used to only ever schedule
 * *today's* remaining prayers, one-shot, whenever the app happened to be
 * opened (app launch, or a settings change). If the user didn't open the
 * app the next day, every reminder silently stopped - there was no
 * mechanism to reschedule for tomorrow. Fixed by scheduling a rolling
 * DAYS_AHEAD-day window every time this runs, so as long as the user opens
 * the app at least once within that window, reminders keep rolling
 * forward. A true fix-and-forget (reschedule via a background task even if
 * the app is never reopened) would need expo-task-manager/expo-background-
 * fetch wired into app.json and a new native build to test - separate,
 * bigger scope.
 *
 * Phase B (2026-08-02): previously this fetched api.aladhan.com's
 * /calendar endpoint - a fetch failure (offline, API down, rate limit)
 * was swallowed silently, `upcoming` came back empty, and
 * schedulePrayerNotifications() just returned with zero reminders
 * scheduled and NO error surfaced to the user, ever (confirmed by reading
 * the code directly, not assumed). Switching to local calculation removes
 * that failure mode structurally - resolveActiveLocation() always
 * produces *some* coordinates (manual city > GPS > last-known > Mecca), so
 * the timings map can no longer come back empty. The one real failure mode
 * left (notification permission denied) was ALSO silent before; now
 * surfaced via toast so the user knows reminders aren't active instead of
 * silently not receiving them.
 * Re-run schedulePrayerNotifications() whenever settings change or the app
 * opens.
 *
 * Phase P6 (accuracy audit, 2026-08-09): schedulePrayerNotifications() takes
 * an optional pre-resolved `overrideLocation`. Without it, this always
 * re-reads location/method from storage via resolveActiveLocation() -
 * correct for the app-launch and Settings reminder-toggle call sites, which
 * have no fresher in-memory value. But the Prayer Times screen's own
 * reschedule (right after the user changes city/method) used to rely on
 * writing the new value to storage and then immediately re-reading it back
 * un-awaited - structurally fragile, and it also meant the on-screen
 * display and the scheduled notifications each independently resolved GPS,
 * so a moving user could get two different fixes for the same reschedule.
 * That call site now resolves location once and passes it straight through
 * via overrideLocation, guaranteeing the displayed and scheduled times are
 * always computed from the exact same coordinates.
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculatePrayerTimes } from './prayerCalculation';
import { resolveActiveLocation, ResolvedLocation } from './prayerLocation';
import { toast } from './toast';

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerReminderSettings {
  enabled: boolean;
  minutesBefore: number;
  perPrayer: Record<PrayerName, boolean>;
}

export const DEFAULT_REMINDER_SETTINGS: PrayerReminderSettings = {
  enabled: false,
  minutesBefore: 10,
  perPrayer: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
};

const STORAGE_KEY = 'amanah-prayer-reminders';
const NOTIFICATION_TAG = 'amanah-prayer-reminder';

export async function getReminderSettings(): Promise<PrayerReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: PrayerReminderSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const DAYS_AHEAD = 7;

/**
 * Compute prayer timings for each of the next `days` days (today included),
 * keyed by Date#toDateString(), from the current persisted location +
 * calculation method (src/lib/prayerLocation.ts). Fully local - always
 * returns `days` entries, since resolveActiveLocation() always resolves to
 * *some* coordinates. Exported so other reminder categories (fasting
 * Suhoor/Iftar) reuse the same computation instead of duplicating it.
 */
export async function computeUpcomingTimings(
  days: number,
  userId: string | null,
  overrideLocation?: ResolvedLocation
): Promise<{ timings: Map<string, Record<PrayerName, string>>; source: ResolvedLocation['source'] }> {
  const { latitude, longitude, method, source } = overrideLocation ?? await resolveActiveLocation(userId);
  const result = new Map<string, Record<PrayerName, string>>();
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const timings = calculatePrayerTimes(latitude, longitude, d, method);
    result.set(d.toDateString(), {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    });
  }
  return { timings: result, source };
}

/** Cancel any previously scheduled prayer reminders (identified by their content data tag). */
export async function cancelAllPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.tag === NOTIFICATION_TAG);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * (Re)schedule the next DAYS_AHEAD days of prayer reminders based on
 * current settings. Call on app start and whenever settings change.
 * Returns true if reminders were (re)scheduled, false if they could not be
 * (surfaces a toast in the false case - previously this failed silently).
 *
 * Callers (app launch, location/method change, reminder-settings toggle)
 * fire this un-awaited from separate effects/handlers, so overlapping
 * calls are a real scenario (e.g. app launch's effect re-runs when userId
 * resolves from null to the real id shortly after auth restores). Each
 * call's own cancel-then-schedule is not atomic against another call's
 * concurrent writes, so without serialization two overlapping calls can
 * each miss cancelling the other's in-flight notifications and leave a
 * stacked union behind instead of a clean replace. inFlight chains every
 * call onto the previous one so they always run strictly one at a time -
 * the last call to actually execute is guaranteed to see and cancel
 * everything scheduled before it.
 */
let inFlight: Promise<boolean> = Promise.resolve(true);

export function schedulePrayerNotifications(
  settings: PrayerReminderSettings,
  isAr: boolean,
  userId: string | null,
  overrideLocation?: ResolvedLocation
): Promise<boolean> {
  inFlight = inFlight.then(
    () => scheduleNow(settings, isAr, userId, overrideLocation),
    () => scheduleNow(settings, isAr, userId, overrideLocation)
  );
  return inFlight;
}

async function scheduleNow(
  settings: PrayerReminderSettings,
  isAr: boolean,
  userId: string | null,
  overrideLocation?: ResolvedLocation
): Promise<boolean> {
  await cancelAllPrayerNotifications();
  if (!settings.enabled) return true;

  const granted = await requestNotificationPermission();
  if (!granted) {
    toast.error(isAr
      ? 'تعذّر جدولة تذكيرات الصلاة - يرجى السماح بالإشعارات من إعدادات الجهاز.'
      : 'Could not schedule prayer reminders - please allow notifications in device settings.');
    return false;
  }

  const { timings: upcoming, source } = await computeUpcomingTimings(DAYS_AHEAD, userId, overrideLocation);

  // Surface the same Mecca-fallback warning the Prayer Times screen shows
  // on-screen - but only when THIS call resolved the location itself (no
  // fresher value was handed in). The one caller that does hand in a fresh
  // value (Prayer Times screen, right after a location/method change)
  // already toasts this exact case via loadByLocation, so warning again
  // here would just double up the same message. The other two callers
  // (app-launch reschedule, Settings reminder toggle) had NO warning at all
  // before this - a GPS failure there silently scheduled notifications
  // against Mecca's times with zero indication anything was wrong.
  if (!overrideLocation && source === 'default') {
    toast.info(isAr
      ? 'يتم استخدام موقع مكة المكرمة الافتراضي لتذكيرات الصلاة لعدم توفر بيانات الموقع. فعّل خدمة الموقع أو اختر مدينتك من إعدادات مواقيت الصلاة.'
      : 'Prayer reminders are using the default Mecca location because no location data is available. Enable location services or set your city in Prayer Times settings.');
  }

  const now = new Date();
  const prayerLabels: Record<PrayerName, { en: string; ar: string }> = {
    Fajr: { en: 'Fajr', ar: 'الفجر' },
    Dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
    Asr: { en: 'Asr', ar: 'العصر' },
    Maghrib: { en: 'Maghrib', ar: 'المغرب' },
    Isha: { en: 'Isha', ar: 'العشاء' },
  };

  for (const [dateKey, timings] of upcoming) {
    const dayDate = new Date(dateKey);
    for (const prayer of Object.keys(timings) as PrayerName[]) {
      if (!settings.perPrayer[prayer]) continue;
      const [h, m] = timings[prayer].split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const prayerTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), h, m);
      const triggerTime = new Date(prayerTime.getTime() - settings.minutesBefore * 60 * 1000);
      if (triggerTime.getTime() <= now.getTime()) continue; // already passed

      const label = isAr ? prayerLabels[prayer].ar : prayerLabels[prayer].en;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isAr ? '🕌 تذكير بالصلاة' : '🕌 Prayer Reminder',
          body: isAr
            ? `صلاة ${label} بعد ${settings.minutesBefore} دقيقة`
            : `${label} prayer in ${settings.minutesBefore} minutes`,
          data: { tag: NOTIFICATION_TAG },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerTime },
      });
    }
  }
  return true;
}
