/**
 * Wellness — migrated from app/frontend/src/pages/Wellness.tsx
 * localStorage('amanah-wellness') → AsyncStorage. Daily mood/sleep/hydration/
 * stress log (range inputs → steppers), today's wellness score with circular
 * metric gauges (react-native-svg), 7-day gradient trend bars. Bilingual.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

interface WellnessEntry { date: string; mood: number; sleep: number; hydration: number; stress: number; }
const MOOD_EMOJIS = ['😢', '😟', '😐', '🙂', '😊'];

const ARC = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

function MetricCircle({ label, value, max, emoji, inverted, trackColor }: {
  label: string; value: number; max: number; emoji: string; inverted?: boolean; trackColor: string;
}) {
  const { colors } = useTheme();
  const percentage = inverted ? ((max - value + 1) / max) * 100 : (value / max) * 100;
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ width: 48, height: 48, marginBottom: 4 }}>
        <Svg width={48} height={48} viewBox="0 0 36 36" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Path d={ARC} fill="none" stroke={trackColor} strokeWidth={3} />
          <Path d={ARC} fill="none" stroke={colors.teal} strokeWidth={3} strokeDasharray={`${percentage}, 100`} strokeLinecap="round" />
        </Svg>
        <Text style={styles.metricEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}/{max}</Text>
    </View>
  );
}

function Stepper({ label, value, min, max, onChange, accent }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; accent: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <View style={[styles.stepTrack, { backgroundColor: colors.bg }]}>
          <View style={{ width: `${((value - min) / (max - min)) * 100}%`, height: 8, borderRadius: 4, backgroundColor: accent }} />
        </View>
        <TouchableOpacity
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Wellness() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [mood, setMood] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);
  const [hydration, setHydration] = useState(6);
  const [stress, setStress] = useState(2);
  const [showForm, setShowForm] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find((e) => e.date === todayStr);

  useEffect(() => {
    AsyncStorage.getItem('amanah-wellness').then((s) => { if (s) setEntries(JSON.parse(s)); });
  }, []);
  useEffect(() => { AsyncStorage.setItem('amanah-wellness', JSON.stringify(entries)); }, [entries]);

  const logToday = () => {
    const entry: WellnessEntry = { date: todayStr, mood, sleep: sleepHours, hydration, stress };
    setEntries([entry, ...entries.filter((e) => e.date !== todayStr)]);
    setShowForm(false);
  };

  const getWellnessScore = (e: WellnessEntry) => Math.round(
    (e.mood / 5) * 25 + (Math.min(e.sleep, 9) / 9) * 25 + (e.hydration / 12) * 25 + ((6 - e.stress) / 5) * 25
  );

  const getLast7Days = (): WellnessEntry[] => {
    const days: WellnessEntry[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push(entries.find((e) => e.date === dateStr) || { date: dateStr, mood: 0, sleep: 0, hydration: 0, stress: 0 });
    }
    return days;
  };
  const last7 = getLast7Days();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        icon="💚"
        title={tr('Wellness', 'العافية')}
        right={!todayEntry ? (
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.teal }]} onPress={() => setShowForm((s) => !s)}>
            <Text style={styles.addBtnText}>+ {tr('Log', 'تسجيل')}</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Log form */}
        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{tr('Mood', 'المزاج')}</Text>
            <View style={styles.moodRow}>
              {MOOD_EMOJIS.map((emoji, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.moodBtn, mood === i + 1 && { backgroundColor: colors.teal + '33', transform: [{ scale: 1.2 }] }]}
                  onPress={() => setMood(i + 1)}
                >
                  <Text style={{ fontSize: 24, opacity: mood === i + 1 ? 1 : 0.5 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Stepper label={`${tr('Sleep', 'النوم')}: ${sleepHours} ${tr('hours', 'ساعات')}`} value={sleepHours} min={0} max={12} onChange={setSleepHours} accent={colors.teal} />
            <Stepper label={`${tr('Hydration', 'الماء')}: ${hydration} ${tr('cups', 'أكواب')}`} value={hydration} min={0} max={12} onChange={setHydration} accent={colors.teal} />
            <Stepper label={`${tr('Stress', 'التوتر')}: ${stress}/5`} value={stress} min={1} max={5} onChange={setStress} accent={colors.gold} />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.teal }]} onPress={logToday}>
              <Text style={[styles.saveBtnText, { color: '#04211C' }]}>{tr('Save', 'حفظ')}</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Today's score */}
        {todayEntry && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {tr('Wellness Score', 'مؤشر العافية')} — {tr('Today', 'اليوم')}
            </Text>
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <Text>
                <Text style={[styles.bigScore, { color: colors.gold }]}>{getWellnessScore(todayEntry)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: FONT_UI }}>/100</Text>
              </Text>
            </View>
            <View style={styles.metricsRow}>
              <MetricCircle label={tr('Mood', 'المزاج')} value={todayEntry.mood} max={5} emoji={MOOD_EMOJIS[todayEntry.mood - 1]} trackColor={colors.border} />
              <MetricCircle label={tr('Sleep', 'النوم')} value={todayEntry.sleep} max={12} emoji="😴" trackColor={colors.border} />
              <MetricCircle label={tr('Water', 'الماء')} value={todayEntry.hydration} max={12} emoji="💧" trackColor={colors.border} />
              <MetricCircle label={tr('Stress', 'التوتر')} value={todayEntry.stress} max={5} emoji="😰" inverted trackColor={colors.border} />
            </View>
          </Card>
        )}

        {/* 7-day trend */}
        <Card>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left', alignSelf: 'stretch' }]}>{tr('Weekly Trend', 'الاتجاه الأسبوعي')}</Text>
          <View style={styles.chart}>
            {last7.map((entry, i) => {
              const score = entry.mood > 0 ? getWellnessScore(entry) : 0;
              const height = score > 0 ? Math.max(10, score) : 5;
              // Full day names in Arabic, short in English
              const dayLabel = isRTL
                ? new Date(entry.date).toLocaleDateString('ar', { weekday: 'long' })
                : new Date(entry.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barValue, { color: colors.textSecondary }]}>{score > 0 ? score : ''}</Text>
                  <View style={styles.barTrack}>
                    {score > 0 ? (
                      <LinearGradient colors={['#D4A017', '#1FC7C1']} style={[styles.bar, { height: `${height}%` }]} />
                    ) : (
                      <View style={[styles.bar, { height: `${height}%`, backgroundColor: colors.surface }]} />
                    )}
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textSecondary, fontSize: isRTL ? 8 : 10 }]}>{dayLabel}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD },
  label: { fontSize: 13, fontFamily: FONT_UI, marginBottom: 8 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  moodBtn: { padding: 8, borderRadius: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, fontFamily: FONT_UI_BOLD },
  stepTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  saveBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },


  bigScore: { fontSize: 40, fontFamily: FONT_UI_BLACK },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metricEmoji: { position: 'absolute', width: 48, height: 48, textAlign: 'center', lineHeight: 48, fontSize: 16 },
  metricLabel: { fontSize: 10, fontFamily: FONT_UI },
  metricValue: { fontSize: 12, fontFamily: FONT_UI_MEDIUM },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 10, fontFamily: FONT_UI, marginBottom: 2 },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, minHeight: 4 },
  barLabel: { fontSize: 10, fontFamily: FONT_UI, marginTop: 4 },
});
