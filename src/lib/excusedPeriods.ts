/**
 * Excused periods (عذر شرعي) for the prayer and fasting trackers - Phase C,
 * 2026-08-02. Lets a user mark a Sharia-exempt period (menstruation/hayd,
 * postpartum/nifas, illness, travel) so those days aren't counted as missed
 * in streaks/stats, while still correctly tracking fasting makeup (qada)
 * obligations, which differ from the prayer rules.
 *
 * PRIVACY: this data is device-local only by design (see PROJECT.md 0c-7).
 * All storage keys use the `excused_` prefix, which deliberately does not
 * match any existing Backup/Restore sweep prefix (`prayer_completed_`,
 * `fasting_today_`, `amanah-`, `dhikr_`) - see the explicit exclusion notes
 * in app/(tabs)/settings.tsx. Do not add these keys to that sweep without
 * explicit approval of a sync/export design.
 *
 * Fiqh mapping (from the approved plan, not this file's own judgment):
 * - Menstruation/nifas: prayer waived entirely, never made up. Fasting
 *   excused, always feeds the qada (makeup) counter.
 * - Illness: prayer stays fully tracked/expected by default (shortening/
 *   combining prayers is a fiqh allowance, not a waiver) - excluded from
 *   prayer tracking ONLY if `illnessIncapacitated` is explicitly set, and
 *   even then the app takes no position on qada vs waived - the user picks
 *   via `illnessPrayerChoice` after reading the in-app disclaimer. Fasting
 *   excused, feeds qada.
 * - Travel: prayer stays fully tracked (qasr/shortening is a fiqh
 *   allowance, not a waiver - this app doesn't model qasr). Fasting
 *   excused, feeds qada.
 */
import { getUserItem, setUserItem } from './userStorage';

export type ExcusedReason = 'menstruation' | 'nifas' | 'illness' | 'travel';

export interface ExcusedPeriod {
  id: string;
  reason: ExcusedReason;
  /** ISO date (YYYY-MM-DD), inclusive. */
  startDate: string;
  /** ISO date (YYYY-MM-DD), inclusive, or null if still ongoing. */
  endDate: string | null;
  /** Illness only - was the user genuinely unable to pray (not just permitted to shorten/combine)? */
  illnessIncapacitated?: boolean;
  /**
   * Illness + illnessIncapacitated only - the app takes no fiqh position on
   * whether incapacity-missed prayers require makeup, so the user chooses
   * explicitly after the disclaimer. Undefined until chosen.
   */
  illnessPrayerChoice?: 'qada' | 'waived';
}

const PERIODS_KEY = 'excused_periods';
const QADA_FASTS_MADE_UP_KEY = 'excused_qada_fasts_made_up';
const QADA_PRAYERS_MADE_UP_KEY = 'excused_qada_prayers_made_up';
const DISCLAIMER_SEEN_KEY = 'excused_disclaimer_seen';

export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function isDateInRange(iso: string, startDate: string, endDate: string | null): boolean {
  if (iso < startDate) return false;
  if (endDate !== null && iso > endDate) return false;
  return true;
}

export async function getExcusedPeriods(userId: string | null): Promise<ExcusedPeriod[]> {
  const raw = await getUserItem(PERIODS_KEY, userId);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function savePeriods(userId: string | null, periods: ExcusedPeriod[]): Promise<void> {
  await setUserItem(PERIODS_KEY, userId, JSON.stringify(periods));
}

export async function addExcusedPeriod(userId: string | null, period: Omit<ExcusedPeriod, 'id'>): Promise<void> {
  const periods = await getExcusedPeriods(userId);
  periods.push({ ...period, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  await savePeriods(userId, periods);
}

/** Closes an ongoing period. Defaults endDate to today if not given. */
export async function endExcusedPeriod(userId: string | null, id: string, endDate?: string): Promise<void> {
  const periods = await getExcusedPeriods(userId);
  const updated = periods.map((p) => (p.id === id ? { ...p, endDate: endDate || isoDate(new Date()) } : p));
  await savePeriods(userId, updated);
}

export async function deleteExcusedPeriod(userId: string | null, id: string): Promise<void> {
  const periods = await getExcusedPeriods(userId);
  await savePeriods(userId, periods.filter((p) => p.id !== id));
}

/** Prayer is excused only for hayd/nifas, or illness explicitly marked incapacitated. Travel and non-incapacitated illness never exclude prayer. */
export function isDateExcusedForPrayer(iso: string, periods: ExcusedPeriod[]): boolean {
  return periods.some((p) => {
    if (!isDateInRange(iso, p.startDate, p.endDate)) return false;
    if (p.reason === 'menstruation' || p.reason === 'nifas') return true;
    if (p.reason === 'illness' && p.illnessIncapacitated) return true;
    return false;
  });
}

/** Fasting is excused for all 4 reasons whenever a period covers the date. */
export function isDateExcusedForFasting(iso: string, periods: ExcusedPeriod[]): boolean {
  return periods.some((p) => isDateInRange(iso, p.startDate, p.endDate));
}

function eachDateInPeriod(period: ExcusedPeriod, todayIso: string): string[] {
  const end = period.endDate && period.endDate < todayIso ? period.endDate : todayIso;
  if (period.startDate > end) return [];
  const dates: string[] = [];
  const cursor = new Date(`${period.startDate}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  while (cursor <= endDate) {
    dates.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Days owed = excused-for-fasting days (all 4 reasons) with no `fasting: true` record. Recomputed live from real data, never independently incremented, so it can't drift out of sync. */
export async function computeFastingQadaOwed(userId: string | null): Promise<number> {
  const periods = await getExcusedPeriods(userId);
  const todayIso = isoDate(new Date());
  let owed = 0;
  for (const period of periods) {
    for (const iso of eachDateInPeriod(period, todayIso)) {
      const dateStr = new Date(`${iso}T00:00:00`).toDateString();
      const raw = await getUserItem(`fasting_today_${dateStr}`, userId);
      const fasted = raw ? JSON.parse(raw).fasting === true : false;
      if (!fasted) owed++;
    }
  }
  return owed;
}

/** Owed prayer-instances (illness + incapacitated + qada choice only) = for each such day, 5 minus however many prayers were actually logged that day. */
export async function computePrayerQadaOwed(userId: string | null): Promise<number> {
  const periods = (await getExcusedPeriods(userId)).filter(
    (p) => p.reason === 'illness' && p.illnessIncapacitated && p.illnessPrayerChoice === 'qada'
  );
  const todayIso = isoDate(new Date());
  let owed = 0;
  for (const period of periods) {
    for (const iso of eachDateInPeriod(period, todayIso)) {
      const dateStr = new Date(`${iso}T00:00:00`).toDateString();
      const raw = await getUserItem(`prayer_completed_${dateStr}`, userId);
      const completedCount = raw ? (JSON.parse(raw) as unknown[]).length : 0;
      owed += Math.max(0, 5 - completedCount);
    }
  }
  return owed;
}

async function getMadeUpCount(userId: string | null, key: string): Promise<number> {
  const raw = await getUserItem(key, userId);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

async function setMadeUpCount(userId: string | null, key: string, value: number): Promise<void> {
  await setUserItem(key, userId, String(Math.max(0, value)));
}

export async function getFastingQadaMadeUp(userId: string | null): Promise<number> {
  return getMadeUpCount(userId, QADA_FASTS_MADE_UP_KEY);
}
export async function adjustFastingQadaMadeUp(userId: string | null, delta: number): Promise<number> {
  const next = (await getFastingQadaMadeUp(userId)) + delta;
  await setMadeUpCount(userId, QADA_FASTS_MADE_UP_KEY, next);
  return Math.max(0, next);
}

export async function getPrayerQadaMadeUp(userId: string | null): Promise<number> {
  return getMadeUpCount(userId, QADA_PRAYERS_MADE_UP_KEY);
}
export async function adjustPrayerQadaMadeUp(userId: string | null, delta: number): Promise<number> {
  const next = (await getPrayerQadaMadeUp(userId)) + delta;
  await setMadeUpCount(userId, QADA_PRAYERS_MADE_UP_KEY, next);
  return Math.max(0, next);
}

export async function hasSeenDisclaimer(userId: string | null): Promise<boolean> {
  return (await getUserItem(DISCLAIMER_SEEN_KEY, userId)) === 'true';
}
export async function markDisclaimerSeen(userId: string | null): Promise<void> {
  await setUserItem(DISCLAIMER_SEEN_KEY, userId, 'true');
}

export const EXCUSED_REASON_LABELS: Record<ExcusedReason, { en: string; ar: string }> = {
  menstruation: { en: 'Menstruation', ar: 'حيض' },
  nifas: { en: 'Postpartum bleeding (nifas)', ar: 'نفاس' },
  illness: { en: 'Illness', ar: 'مرض' },
  travel: { en: 'Travel', ar: 'سفر' },
};

export const DISCLAIMER_TEXT = {
  en: "AmanahLife is a habit-tracking tool, not a source of religious rulings (fatwa). For genuine illness incapacity that prevents prayer, whether missed prayers require makeup (qada) or are waived depends on the duration and severity of the incapacity — general guidance from IslamWeb and mainstream Ahlus Sunnah wal Jama'ah sources reflects this. Please assess your own situation or consult a knowledgeable source; the app takes no position and accepts no responsibility for this determination.",
  ar: 'أمانة لايف أداة لتتبع العادات، وليست مصدرًا للفتاوى الشرعية. بالنسبة للمرض الذي يمنع أداء الصلاة فعليًا، فإن وجوب قضاء الصلوات الفائتة من عدمه يعتمد على مدة وشدة العجز — وهذا ما تعكسه الإرشادات العامة من مصادر مثل الإسلام ويب وآراء أهل السنة والجماعة السائدة. يرجى تقييم حالتك أو استشارة مصدر موثوق؛ التطبيق لا يتبنى موقفًا في هذه المسألة ولا يتحمل أي مسؤولية عن هذا التحديد.',
};
