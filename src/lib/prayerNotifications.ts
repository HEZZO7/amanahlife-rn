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
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculatePrayerTimes } from './prayerCalculation';
import { resolveActiveLocation } from './prayerLocation';
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
export async function computeUpcomingTimings(days: number, userId: string | null): Promise<Map<string, Record<PrayerName, string>>> {
  const { latitude, longitude, method } = await resolveActiveLocation(userId);
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
  return result;
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
 */
export async function schedulePrayerNotifications(
  settings: PrayerReminderSettings,
  isAr: boolean,
  userId: string | null
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

  const upcoming = await computeUpcomingTimings(DAYS_AHEAD, userId);

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
