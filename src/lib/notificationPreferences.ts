/**
 * General notification-category preferences (bill/habit-goal/fasting/
 * savings/general activity), mirroring web's NotificationSettings.tsx +
 * useNotifications.ts. Separate from the granular per-prayer
 * PrayerReminderSettings in prayerNotifications.ts - web keeps these as two
 * independent systems too (a coarse "prayer_reminders" toggle here, PLUS
 * the separate per-prayer minutes-before config), so this ports that same
 * structure rather than merging them.
 *
 * Web's own implementation of this panel is preference-storage only - no
 * code anywhere on web actually schedules or sends a real bill/habit/
 * fasting/savings/general notification (confirmed by grep: send_notification
 * and sendLocalNotification are never called outside useNotifications.ts/
 * NotificationSettings.tsx itself). RN goes further here and wires REAL
 * local scheduling for the categories that have real per-item data to
 * schedule against (bill due dates, goal target dates, real Fajr/Maghrib
 * timings for fasting) - using the same expo-notifications
 * schedule/cancel-by-tag pattern prayerNotifications.ts already proved.
 * general_activity has no dedicated content on either platform (web's
 * category is genuinely just a stored preference, gating nothing) - kept
 * that way here rather than inventing generic filler notifications.
 * savings_reminders is handled differently again: it gates the milestone
 * notification savings-challenges.tsx already fires live when a challenge
 * milestone is hit (event-triggered, not time-scheduled), not something
 * this module schedules ahead of time.
 *
 * Preferences themselves sync through the same app_11941c8fec_push_notify
 * Edge Function + app_11941c8fec_notification_preferences table web
 * already uses. Authenticated preference actions derive ownership from
 * the verified JWT and accept only six boolean flags. RN never calls that function's subscribe/
 * unsubscribe/send_notification actions - those are Web Push specific
 * (VAPID/PushSubscription), not applicable to local expo-notifications
 * scheduling.
 */
import * as Notifications from 'expo-notifications';
import { getUserItem, setUserItem } from './userStorage';
import { functionUrl } from './config';
import { requestNotificationPermission, computeUpcomingTimings } from './prayerNotifications';
import { isRamadan } from './hijriDate';
import { toast } from './toast';
import { supabase } from './supabase';
import { createPreferenceClient, sanitizePreferences } from './notificationPreferenceClient';
import type { NotificationPreferences, PreferenceClient } from './notificationPreferenceClient';
export { DEFAULT_NOTIFICATION_PREFERENCES } from './notificationPreferenceClient';
export type { NotificationPreferences } from './notificationPreferenceClient';

const PREFS_KEY = 'amanah-notification-preferences';
const PUSH_NOTIFY_URL = functionUrl('app_11941c8fec_push_notify');
const clients = new Map<string | null, PreferenceClient>();

// Cache and trusted SDK session are scoped to the same account. No user_id
// is sent to the server; its verified JWT remains the authorization boundary.
export function getPreferenceClient(userId: string | null): PreferenceClient {
  let client = clients.get(userId);
  if (!client) {
    client = createPreferenceClient(userId, {
      url: PUSH_NOTIFY_URL,
      getSession: async () => (await supabase.auth.getSession()).data.session,
      request: (input, init) => fetch(input, init),
      readCache: () => getUserItem(PREFS_KEY, userId),
      writeCache: value => setUserItem(PREFS_KEY, userId, value),
    });
    clients.set(userId, client);
  }
  return client;
}
export async function getLocalPreferences(userId: string | null): Promise<NotificationPreferences> {
  let prefs = sanitizePreferences(null);
  try {
    const raw = await getUserItem(PREFS_KEY, userId);
    prefs = sanitizePreferences(raw ? JSON.parse(raw) : null);
    // Return only the six flags; client.load() persists cleanup in its serialized queue.
  } catch { /* Reading is still usable when cache cleanup cannot be persisted. */ }
  return prefs;
}
export async function syncPreferencesFromServer(accessToken: string | null, userId: string | null): Promise<NotificationPreferences> {
  if (!accessToken) return getLocalPreferences(userId);
  return (await getPreferenceClient(userId).load()).preferences;
}

// Scheduling follows a confirmed save; scheduling failure never pretends that
// the server reverted the preference. No changes to reminder generation itself.
export function getScheduledPreferenceClient(userId: string | null, isAr: boolean): PreferenceClient {
  const client = getPreferenceClient(userId);
  return {
    load: client.load,
    save: async input => {
      const result = await client.save(input);
      try {
        // Check account again before touching this device's reminder schedule.
        const session = (await supabase.auth.getSession()).data.session;
        if (!userId || session?.user.id !== userId) return result;
        if (Object.prototype.hasOwnProperty.call(input, 'bill_reminders')) await scheduleBillReminders(userId, result.preferences.bill_reminders, isAr);
        if (Object.prototype.hasOwnProperty.call(input, 'habit_reminders')) await scheduleGoalReminders(userId, result.preferences.habit_reminders, isAr);
        if (Object.prototype.hasOwnProperty.call(input, 'fasting_reminders')) await scheduleFastingReminders(result.preferences.fasting_reminders, isAr, userId);
      } catch {
        toast.error(isAr ? 'حُفظ التفضيل، لكن تعذّر تحديث تذكيرات الجهاز. أعد فتح التطبيق للمحاولة.' : 'Preference saved, but device reminders could not be refreshed. Reopen the app to retry.');
      }
      return result;
    },
  };
}

async function cancelTagged(tag: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => (n.content.data as any)?.tag === tag);
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

const BILL_TAG = 'amanah-bill-reminder';
const GOAL_TAG = 'amanah-goal-reminder';
const FASTING_TAG = 'amanah-fasting-reminder';

interface Bill { id: string; name: string; amount: number; dueDate: string; isPaid: boolean; }
interface Goal { id: string; title: string; targetDate: string; status: 'Active' | 'Completed' | 'Paused'; }

/**
 * Real per-bill due-date reminders - 1 day before + on the due date, for
 * every unpaid bill. Reads the same `amanah-bills` data
 * bill-reminders.tsx itself owns; never invents bills.
 */
export async function scheduleBillReminders(userId: string | null, enabled: boolean, isAr: boolean): Promise<void> {
  await cancelTagged(BILL_TAG);
  if (!enabled) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const raw = await getUserItem('amanah-bills', userId);
  if (!raw) return;
  let bills: Bill[];
  try { bills = JSON.parse(raw); } catch { return; }

  const now = new Date();
  for (const bill of bills) {
    if (bill.isPaid) continue;
    const due = new Date(bill.dueDate);
    if (Number.isNaN(due.getTime())) continue;

    const onDue = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9, 0, 0, 0);
    const dayBefore = new Date(onDue.getTime() - 24 * 60 * 60 * 1000);

    for (const trigger of [dayBefore, onDue]) {
      if (trigger.getTime() <= now.getTime()) continue;
      const isToday = trigger.getTime() === onDue.getTime();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isAr ? '💳 تذكير بفاتورة' : '💳 Bill Reminder',
          body: isAr
            ? `${bill.name} — ${bill.amount} مستحقة ${isToday ? 'اليوم' : 'غداً'}`
            : `${bill.name} — $${bill.amount} due ${isToday ? 'today' : 'tomorrow'}`,
          data: { tag: BILL_TAG },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      });
    }
  }
}

/**
 * Real per-goal target-date reminders - 3 days before + on the target
 * date, for every Active goal with a future target date. Reads the same
 * `amanah-goals` data goals.tsx itself owns; never invents goals.
 */
export async function scheduleGoalReminders(userId: string | null, enabled: boolean, isAr: boolean): Promise<void> {
  await cancelTagged(GOAL_TAG);
  if (!enabled) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const raw = await getUserItem('amanah-goals', userId);
  if (!raw) return;
  let goals: Goal[];
  try { goals = JSON.parse(raw); } catch { return; }

  const now = new Date();
  for (const goal of goals) {
    if (goal.status !== 'Active' || !goal.targetDate) continue;
    const target = new Date(goal.targetDate);
    if (Number.isNaN(target.getTime())) continue;

    const onTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 10, 0, 0, 0);
    const threeDaysBefore = new Date(onTarget.getTime() - 3 * 24 * 60 * 60 * 1000);

    for (const trigger of [threeDaysBefore, onTarget]) {
      if (trigger.getTime() <= now.getTime()) continue;
      const isToday = trigger.getTime() === onTarget.getTime();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isAr ? '🎯 تذكير بالهدف' : '🎯 Goal Reminder',
          body: isAr
            ? `"${goal.title}" ${isToday ? 'يستحق اليوم' : 'يستحق خلال 3 أيام'}`
            : `"${goal.title}" ${isToday ? 'is due today' : 'is due in 3 days'}`,
          data: { tag: GOAL_TAG },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      });
    }
  }
}

const FASTING_DAYS_AHEAD = 7;
const SUHOOR_MINUTES_BEFORE_FAJR = 30;

/**
 * Real Suhoor/Iftar alerts using the same locally-computed Fajr/Maghrib
 * timings prayerNotifications.ts computes for prayer reminders (Phase B,
 * 2026-08-02 - was the same Aladhan fetch prayer reminders used to share;
 * switching both to local calculation removes the network dependency and
 * the silent-failure path a fetch error used to leave here too).
 */
export async function scheduleFastingReminders(enabled: boolean, isAr: boolean, userId: string | null): Promise<void> {
  await cancelTagged(FASTING_TAG);
  if (!enabled) return;
  const granted = await requestNotificationPermission();
  if (!granted) {
    toast.error(isAr
      ? 'تعذّر جدولة تذكيرات السحور والإفطار - يرجى السماح بالإشعارات من إعدادات الجهاز.'
      : 'Could not schedule Suhoor/Iftar reminders - please allow notifications in device settings.');
    return;
  }

  const { timings: upcoming } = await computeUpcomingTimings(FASTING_DAYS_AHEAD, userId);

  const now = new Date();
  for (const [dateKey, timings] of upcoming) {
    const dayDate = new Date(dateKey);
    // Gate on the actual Hijri calendar date, not a manual toggle - Suhoor/
    // Iftar only make sense during Ramadan itself. Checked per-day (not
    // once for the whole call) so the rolling 7-day window self-corrects
    // right at the Ramadan start/end boundary instead of scheduling a
    // week's worth of alerts based on whatever today happens to be.
    if (!isRamadan(dayDate)) continue;

    const [fh, fm] = timings.Fajr.split(':').map(Number);
    if (!Number.isNaN(fh) && !Number.isNaN(fm)) {
      const fajrTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), fh, fm);
      const suhoorTrigger = new Date(fajrTime.getTime() - SUHOOR_MINUTES_BEFORE_FAJR * 60 * 1000);
      if (suhoorTrigger.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isAr ? '🌙 السحور' : '🌙 Suhoor',
            body: isAr ? `${SUHOOR_MINUTES_BEFORE_FAJR} دقيقة حتى الفجر` : `${SUHOOR_MINUTES_BEFORE_FAJR} minutes until Fajr`,
            data: { tag: FASTING_TAG },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: suhoorTrigger },
        });
      }
    }

    const [mh, mm] = timings.Maghrib.split(':').map(Number);
    if (!Number.isNaN(mh) && !Number.isNaN(mm)) {
      const iftarTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), mh, mm);
      if (iftarTime.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isAr ? '🌅 الإفطار' : '🌅 Iftar',
            body: isAr ? 'حان وقت الإفطار' : 'Time to break your fast',
            data: { tag: FASTING_TAG },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: iftarTime },
        });
      }
    }
  }
}

/** Compatibility wrapper for existing consumers; never confirms a local-only save. */
export async function updatePreference(
  accessToken: string | null, userId: string | null,
  key: keyof NotificationPreferences, value: boolean, isAr: boolean
): Promise<NotificationPreferences> {
  if (!accessToken || !userId) throw new Error('Authentication required');
  return (await getScheduledPreferenceClient(userId, isAr).save({ [key]: value })).preferences;
}

/** Re-run every category's real scheduling on app start, mirroring prayerNotifications.ts's own "call on app start and whenever settings change" rule - keeps the rolling reminder windows current even if the user never revisits Settings. */
export async function refreshAllCategoryReminders(userId: string | null, prefs: NotificationPreferences, isAr: boolean): Promise<void> {
  await Promise.all([
    scheduleBillReminders(userId, prefs.bill_reminders, isAr),
    scheduleGoalReminders(userId, prefs.habit_reminders, isAr),
    scheduleFastingReminders(prefs.fasting_reminders, isAr, userId),
  ]);
}

