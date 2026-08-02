/**
 * Fasting Tracker — migrated from app/frontend/src/pages/FastingTracker.tsx
 * localStorage → AsyncStorage. Today's suhoor/fasting/iftar toggles, 30-day grid,
 * Quran-pages counter with goal progress. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BLACK } from '../../src/theme/fonts';
import { getExcusedPeriods, isDateExcusedForFasting, isoDate } from '../../src/lib/excusedPeriods';
import ExcusedPeriodsModal from '../../src/components/ExcusedPeriodsModal';

interface DayStatus { date: string; fasted: boolean; excused: boolean; }

export default function FastingTracker() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const today = new Date().toDateString();
  const userId = user?.id ?? null;

  const [suhoor, setSuhoor] = useState(false);
  const [fasting, setFasting] = useState(false);
  const [iftar, setIftar] = useState(false);
  const [monthDays, setMonthDays] = useState<DayStatus[]>([]);
  const [excusedModalOpen, setExcusedModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await migrateLegacyKeyIfNeeded(`fasting_today_${today}`, userId);
      const storedToday = await getUserItem(`fasting_today_${today}`, userId);
      if (storedToday) {
        const data = JSON.parse(storedToday);
        setSuhoor(!!data.suhoor); setFasting(!!data.fasting); setIftar(!!data.iftar);
      }

      const excusedPeriods = await getExcusedPeriods(userId);
      const days: DayStatus[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toDateString();
        // Historical days: read this user's scoped entry first; fall back to
        // the pre-scoping legacy entry (read-only) so existing 30-day
        // history isn't lost without bulk-migrating every past day.
        let dayData = await getUserItem(`fasting_today_${dateStr}`, userId);
        if (dayData === null) dayData = await AsyncStorage.getItem(`fasting_today_${dateStr}`);
        const fasted = dayData ? JSON.parse(dayData).fasting === true : false;
        // Phase C: excused days (any of the 4 reasons) never show as
        // "missed" - they feed the qada counter instead (see the excused
        // period sheet), so a fasted excused day still counts as fasted.
        const excused = !fasted && isDateExcusedForFasting(isoDate(d), excusedPeriods);
        days.push({ date: dateStr, fasted, excused });
      }
      setMonthDays(days);
    })();
  }, [today, userId]);

  const saveToday = (s: boolean, f: boolean, i: boolean) =>
    setUserItem(`fasting_today_${today}`, userId, JSON.stringify({ suhoor: s, fasting: f, iftar: i }));

  const toggleSuhoor = () => { const v = !suhoor; setSuhoor(v); saveToday(v, fasting, iftar); };
  const toggleFasting = () => {
    const v = !fasting; setFasting(v); saveToday(suhoor, v, iftar);
    setMonthDays((prev) => prev.map((d) => d.date === today ? { ...d, fasted: v, excused: v ? false : d.excused } : d));
  };
  const toggleIftar = () => { const v = !iftar; setIftar(v); saveToday(suhoor, fasting, v); };

  const fastedDays = monthDays.filter((d) => d.fasted).length;
  const excusedDays = monthDays.filter((d) => d.excused).length;
  // Phase C: excused days feed the qada counter (see the excused-period
  // sheet), not this "missed" count - they were never actually missed,
  // they were exempted.
  const missedDays = monthDays.length - fastedDays - excusedDays;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="⏱️" title={tr('Fasting', 'الصيام')} />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
          {fastedDays}/30 {tr('days completed', 'يوم مكتمل')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's status */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Today', 'اليوم')}</Text>
          <View style={styles.toggleRow}>
            <Toggle emoji="🌙" label={tr('Suhoor', 'السحور')} active={suhoor} onPress={toggleSuhoor} accent={colors.teal} colors={colors} />
            <Toggle emoji="☀️" label={tr('Fasting', 'الصيام')} active={fasting} onPress={toggleFasting} accent={colors.gold} colors={colors} />
            <Toggle emoji="🌅" label={tr('Iftar', 'الإفطار')} active={iftar} onPress={toggleIftar} accent={colors.teal} colors={colors} />
          </View>
        </Card>

        {/* Missed vs made-up summary */}
        <Card style={{ marginBottom: 14 }}>
          <View style={[styles.rowBetween, { flexDirection: 'row' }]}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[styles.bigNum, { color: colors.teal, fontSize: 22 }]}>{fastedDays}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{tr('Completed', 'أيام مكتملة')}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.border }}>
              <Text style={[styles.bigNum, { color: colors.red, fontSize: 22 }]}>{missedDays}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: 'center' }}>{tr('Missed (need makeup)', 'أيام فائتة (بحاجة للقضاء)')}</Text>
            </View>
            {excusedDays > 0 && (
              <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.border }}>
                <Text style={[styles.bigNum, { color: colors.gold, fontSize: 22 }]}>{excusedDays}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: 'center' }}>{tr('Excused (qada owed)', 'معذورة (بحاجة للقضاء)')}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* 30-day grid - excused days get a distinct 3rd color, never the "missed" red */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('30-Day Progress', 'تقدم ٣٠ يوم')}</Text>
          <View style={styles.grid}>
            {monthDays.map((day, i) => (
              <View
                key={i}
                style={[
                  styles.gridCell,
                  { backgroundColor: day.fasted ? colors.teal : day.excused ? colors.gold : colors.surface },
                ]}
              />
            ))}
          </View>
        </Card>

        {/* Discreet entry point - no dashboard tile, no notification about it. */}
        <TouchableOpacity onPress={() => setExcusedModalOpen(true)} style={{ alignSelf: 'center', marginTop: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: FONT_UI }}>
            {tr('Excused period', 'عذر شرعي')}
          </Text>
        </TouchableOpacity>
        <ExcusedPeriodsModal visible={excusedModalOpen} onClose={() => setExcusedModalOpen(false)} />
      </ScrollView>
    </View>
  );
}

function Toggle({ emoji, label, active, onPress, accent, colors }: any) {
  return (
    <TouchableOpacity
      style={[styles.toggle, { backgroundColor: active ? accent + '33' : colors.surface, borderColor: active ? accent : colors.border }]}
      onPress={onPress}
    >
      <Text style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</Text>
      <Text style={{ color: active ? accent : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 12, paddingBottom: 32 },


  cardTitle: { fontSize: 15, fontFamily: FONT_UI_MEDIUM, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { width: '8%', aspectRatio: 1, borderRadius: 4 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  bigNum: { fontSize: 30, fontFamily: FONT_UI_BLACK },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
