/**
 * Prayer-time-aware local notification reminders.
 * Mirrors web Feature 3 (Smart Prayer-Time-Aware Reminders): fetches prayer
 * times from the same Aladhan API used elsewhere in the app, then schedules
 * a local notification N minutes before each enabled prayer.
 *
 * Phase 3 (critical-audit-2026-07): this used to only ever schedule
 * *today's* remaining prayers, one-shot, whenever the app happened to be
 * opened (app launch, or a settings change). If the user didn't open the
 * app the next day, every reminder silently stopped - there was no
 * mechanism to reschedule for tomorrow. Fixed by scheduling a rolling
 * DAYS_AHEAD-day window every time this runs, using the Aladhan calendar
 * endpoint (one call per month touched, not one per day) so as long as the
 * user opens the app at least once within that window, reminders keep
 * rolling forward. A true fix-and-forget (reschedule via a background task
 * even if the app is never reopened) would need expo-task-manager /
 * expo-background-fetch wired into app.json and a new native build to test
 * - out of scope right now since EAS build quota is exhausted until Aug 1.
 * Re-run schedulePrayerNotifications() whenever settings change or the app
 * opens.
 */
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

function stripTimezoneSuffix(time: string): string {
  // The /calendar endpoint returns times like "05:12 (+03)"; /timings
  // returns clean "05:12" - handle both by just taking the first token.
  return time.split(' ')[0];
}

/** Fetch prayer timings for each of the next `days` days (today included), keyed by Date#toDateString(). */
async function fetchUpcomingTimings(days: number): Promise<Map<string, Record<PrayerName, string>>> {
  const result = new Map<string, Record<PrayerName, string>>();
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const coords = status === 'granted'
      ? (await Location.getCurrentPositionAsync({})).coords
      : { latitude: 21.4225, longitude: 39.8262 };

    const today = new Date();
    const targetDates: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      targetDates.push(d);
    }

    // Fetch one calendar (month) per distinct year-month touched by the
    // window, instead of one request per day.
    const monthKeys = new Set(targetDates.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`));
    const monthEntries = new Map<string, any[]>();
    await Promise.all([...monthKeys].map(async (key) => {
      const [year, month] = key.split('-');
      const res = await fetch(
        `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=2`
      );
      const data = await res.json();
      if (Array.isArray(data?.data)) monthEntries.set(key, data.data);
    }));

    for (const d of targetDates) {
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const days = monthEntries.get(key);
      if (!days) continue;
      const entry = days.find((e: any) => Number(e?.date?.gregorian?.day) === d.getDate());
      if (!entry) continue;
      const t = entry.timings;
      result.set(d.toDateString(), {
        Fajr: stripTimezoneSuffix(t.Fajr),
        Dhuhr: stripTimezoneSuffix(t.Dhuhr),
        Asr: stripTimezoneSuffix(t.Asr),
        Maghrib: stripTimezoneSuffix(t.Maghrib),
        Isha: stripTimezoneSuffix(t.Isha),
      });
    }
  } catch {
    // Best-effort - return whatever was gathered before the failure so the
    // caller can still schedule a partial window rather than nothing at all.
  }
  return result;
}

/** Cancel any previously scheduled prayer reminders (identified by their content data tag). */
export async function cancelAllPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.tag === NOTIFICATION_TAG);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** (Re)schedule the next DAYS_AHEAD days of prayer reminders based on current settings. Call on app start and whenever settings change. */
export async function schedulePrayerNotifications(
  settings: PrayerReminderSettings,
  isAr: boolean
): Promise<void> {
  await cancelAllPrayerNotifications();
  if (!settings.enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const upcoming = await fetchUpcomingTimings(DAYS_AHEAD);
  if (upcoming.size === 0) return;

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
}
