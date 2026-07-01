/**
 * Fasting Tracker — migrated from app/frontend/src/pages/FastingTracker.tsx
 * localStorage → AsyncStorage. Today's suhoor/fasting/iftar toggles, 30-day grid,
 * Quran-pages counter with goal progress. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card, ProgressBar } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

interface DayStatus { date: string; fasted: boolean; }

export default function FastingTracker() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const today = new Date().toDateString();

  const [suhoor, setSuhoor] = useState(false);
  const [fasting, setFasting] = useState(false);
  const [iftar, setIftar] = useState(false);
  const [quranPages, setQuranPages] = useState(0);
  const [monthDays, setMonthDays] = useState<DayStatus[]>([]);

  useEffect(() => {
    (async () => {
      const storedToday = await AsyncStorage.getItem(`fasting_today_${today}`);
      if (storedToday) {
        const data = JSON.parse(storedToday);
        setSuhoor(!!data.suhoor); setFasting(!!data.fasting); setIftar(!!data.iftar);
      }
      const storedPages = await AsyncStorage.getItem(`quran_pages_${today}`);
      if (storedPages) setQuranPages(parseInt(storedPages, 10));

      const days: DayStatus[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toDateString();
        const dayData = await AsyncStorage.getItem(`fasting_today_${dateStr}`);
        days.push({ date: dateStr, fasted: dayData ? JSON.parse(dayData).fasting === true : false });
      }
      setMonthDays(days);
    })();
  }, [today]);

  const saveToday = (s: boolean, f: boolean, i: boolean) =>
    AsyncStorage.setItem(`fasting_today_${today}`, JSON.stringify({ suhoor: s, fasting: f, iftar: i }));

  const toggleSuhoor = () => { const v = !suhoor; setSuhoor(v); saveToday(v, fasting, iftar); };
  const toggleFasting = () => {
    const v = !fasting; setFasting(v); saveToday(suhoor, v, iftar);
    setMonthDays((prev) => prev.map((d) => d.date === today ? { ...d, fasted: v } : d));
  };
  const toggleIftar = () => { const v = !iftar; setIftar(v); saveToday(suhoor, fasting, v); };

  const addPages = (n: number) => {
    const newVal = Math.max(0, quranPages + n);
    setQuranPages(newVal);
    AsyncStorage.setItem(`quran_pages_${today}`, String(newVal));
  };

  const fastedDays = monthDays.filter((d) => d.fasted).length;

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

        {/* 30-day grid */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('30-Day Progress', 'تقدم ٣٠ يوم')}</Text>
          <View style={styles.grid}>
            {monthDays.map((day, i) => (
              <View key={i} style={[styles.gridCell, { backgroundColor: day.fasted ? colors.teal : colors.surface }]} />
            ))}
          </View>
        </Card>

        {/* Quran pages */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Quran Pages', 'صفحات القرآن')}</Text>
          <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.bigNum, { color: colors.gold }]}>{quranPages}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{tr('Goal', 'الهدف')}: 20 {tr('pages', 'صفحة')}</Text>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.pageBtn, { backgroundColor: colors.surface }]} onPress={() => addPages(-1)}>
                <Text style={{ color: colors.text, fontSize: 18, fontFamily: FONT_UI_BOLD }}>−</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pageBtn, { backgroundColor: colors.teal }]} onPress={() => addPages(1)}>
                <Text style={{ color: '#04211C', fontSize: 18, fontFamily: FONT_UI_BOLD }}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pageBtn, { backgroundColor: colors.gold }]} onPress={() => addPages(5)}>
                <Text style={{ color: '#1A1200', fontSize: 13, fontFamily: FONT_UI_BOLD }}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={Math.min(100, (quranPages / 20) * 100)} color={colors.gold} />
          </View>
        </Card>
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


  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { width: '8%', aspectRatio: 1, borderRadius: 4 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  bigNum: { fontSize: 30, fontFamily: FONT_UI_BLACK },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
