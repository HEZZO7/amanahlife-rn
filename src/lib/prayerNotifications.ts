/**
 * Prayer-time-aware local notification reminders.
 * Mirrors web Feature 3 (Smart Prayer-Time-Aware Reminders): fetches today's
 * prayer times from the same Aladhan API used elsewhere in the app, then
 * schedules a local notification N minutes before each enabled prayer.
 * Re-run schedulePrayerNotifications() whenever settings change or the app
 * opens on a new day.
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

async function fetchTodayTimings(): Promise<Record<PrayerName, string> | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const coords = status === 'granted'
      ? (await Location.getCurrentPositionAsync({})).coords
      : { latitude: 21.4225, longitude: 39.8262 };
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=2`
    );
    const data = await res.json();
    const t = data.data.timings;
    return { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
  } catch {
    return null;
  }
}

/** Cancel any previously scheduled prayer reminders (identified by their content data tag). */
export async function cancelAllPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.tag === NOTIFICATION_TAG);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/** (Re)schedule today's remaining prayer reminders based on current settings. Call on app start and whenever settings change. */
export async function schedulePrayerNotifications(
  settings: PrayerReminderSettings,
  isAr: boolean
): Promise<void> {
  await cancelAllPrayerNotifications();
  if (!settings.enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const timings = await fetchTodayTimings();
  if (!timings) return;

  const now = new Date();
  const prayerLabels: Record<PrayerName, { en: string; ar: string }> = {
    Fajr: { en: 'Fajr', ar: 'الفجر' },
    Dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
    Asr: { en: 'Asr', ar: 'العصر' },
    Maghrib: { en: 'Maghrib', ar: 'المغرب' },
    Isha: { en: 'Isha', ar: 'العشاء' },
  };

  for (const prayer of Object.keys(timings) as PrayerName[]) {
    if (!settings.perPrayer[prayer]) continue;
    const [h, m] = timings[prayer].split(':').map(Number);
    const prayerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const triggerTime = new Date(prayerTime.getTime() - settings.minutesBefore * 60 * 1000);
    if (triggerTime.getTime() <= now.getTime()) continue; // already passed today

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
