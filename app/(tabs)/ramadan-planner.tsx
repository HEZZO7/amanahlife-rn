/**
 * Ramadan & Eid Planner — migrated from app/frontend/src/pages/RamadanPlanner.tsx
 * localStorage('amanah_ramadan') → AsyncStorage. Countdown, summary, 5 tabs
 * (calendar fast-grid + Quran pages, meals, budget, eid budget, charity tracker).
 * Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card, ProgressBar } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

interface RamadanDay { day: number; fasted: boolean; quranPages: number; charity: number; }
interface RamadanData {
  days: RamadanDay[];
  mealPlan: { suhoor: string[]; iftar: string[] };
  budget: { food: number; charity: number; gifts: number; decorations: number };
  eidBudget: { clothes: number; gifts: number; food: number; events: number };
  charityGoal: number;
  totalCharity: number;
}

const STORAGE_KEY = 'amanah_ramadan';
const DEFAULT_DATA: RamadanData = {
  days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, fasted: false, quranPages: 0, charity: 0 })),
  mealPlan: {
    suhoor: ['Oatmeal & Dates', 'Eggs & Bread', 'Yogurt & Fruits', 'Rice & Chicken'],
    iftar: ['Dates & Water', 'Soup & Salad', 'Grilled Meat', 'Mixed Platter'],
  },
  budget: { food: 3000, charity: 2000, gifts: 1000, decorations: 500 },
  eidBudget: { clothes: 2000, gifts: 1500, food: 1000, events: 500 },
  charityGoal: 100,
  totalCharity: 0,
};

type Tab = 'calendar' | 'meals' | 'budget' | 'eid' | 'charity';

export default function RamadanPlanner() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';

  const [data, setData] = useState<RamadanData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((s) => { if (s) { try { setData(JSON.parse(s)); } catch {} } setReady(true); });
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data, ready]);

  const toggleFast = (day: number) => setData((p) => ({ ...p, days: p.days.map((d) => d.day === day ? { ...d, fasted: !d.fasted } : d) }));
  const updateQuranPages = (day: number, pages: number) => setData((p) => ({ ...p, days: p.days.map((d) => d.day === day ? { ...d, quranPages: pages } : d) }));
  const addDailyCharity = (day: number, amount: number) => setData((p) => ({ ...p, days: p.days.map((d) => d.day === day ? { ...d, charity: d.charity + amount } : d), totalCharity: p.totalCharity + amount }));

  const countdown = (() => {
    const now = new Date();
    const nextRamadan = new Date(2027, 1, 17);
    if (nextRamadan < now) nextRamadan.setFullYear(nextRamadan.getFullYear() + 1);
    return Math.ceil((nextRamadan.getTime() - now.getTime()) / 86400000);
  })();

  const completedFasts = data.days.filter((d) => d.fasted).length;
  const totalQuranPages = data.days.reduce((s, d) => s + d.quranPages, 0);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'calendar', label: isAr ? 'التقويم' : 'Calendar', icon: '📅' },
    { key: 'meals', label: isAr ? 'الوجبات' : 'Meals', icon: '🍽️' },
    { key: 'budget', label: isAr ? 'الميزانية' : 'Budget', icon: '💰' },
    { key: 'eid', label: isAr ? 'العيد' : 'Eid', icon: '🎉' },
    { key: 'charity', label: isAr ? 'الصدقة' : 'Charity', icon: '🤲' },
  ];

  const budgetLabels: Record<string, { en: string; ar: string; icon: string }> = {
    food: { en: 'Food & Groceries', ar: 'الطعام والمشتريات', icon: '🍽️' },
    charity: { en: 'Charity & Giving', ar: 'الصدقة والعطاء', icon: '🤲' },
    gifts: { en: 'Gifts', ar: 'الهدايا', icon: '🎁' },
    decorations: { en: 'Decorations', ar: 'الزينة', icon: '🏮' },
  };
  const eidLabels: Record<string, { en: string; ar: string; icon: string }> = {
    clothes: { en: 'Clothes', ar: 'الملابس', icon: '👔' },
    gifts: { en: 'Gifts & Eidiya', ar: 'الهدايا والعيدية', icon: '🎁' },
    food: { en: 'Food & Sweets', ar: 'الطعام والحلويات', icon: '🍰' },
    events: { en: 'Events & Outings', ar: 'الفعاليات والنزهات', icon: '🎪' },
  };

  const renderBudget = (entries: [string, number][], labels: Record<string, { en: string; ar: string; icon: string }>, barColor: string, fill: string) => (
    <Card>
      <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
        {labels === budgetLabels ? (isAr ? '💰 ميزانية رمضان' : '💰 Ramadan Budget') : (isAr ? '🎉 ميزانية العيد' : '🎉 Eid Budget')}
      </Text>
      {entries.map(([key, value]) => {
        const label = labels[key];
        return (
          <View key={key} style={[styles.budgetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={{ fontSize: 18 }}>{label.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ color: colors.text, fontSize: 12.5, fontFamily: FONT_UI }}>{isAr ? label.ar : label.en}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{value.toLocaleString()}</Text>
              </View>
              <View style={{ marginTop: 5 }}><ProgressBar value={fill === 'budget' ? 60 : 40} color={barColor} /></View>
            </View>
          </View>
        );
      })}
      <View style={[styles.totalRow, { borderTopColor: colors.border, flexDirection: 'row' }]}>
        <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_BOLD }}>{isAr ? 'الإجمالي' : 'Total'}</Text>
        <Text style={{ color: colors.gold, fontSize: 14, fontFamily: FONT_UI_BOLD }}>{entries.reduce((a, [, b]) => a + b, 0).toLocaleString()}</Text>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🌙" title={isAr ? 'مخطط رمضان والعيد' : 'Ramadan & Eid Planner'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Countdown */}
        <LinearGradient colors={['#D4A01733', colors.teal + '33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.countdown, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{isAr ? 'العد التنازلي لرمضان' : 'Countdown to Ramadan'}</Text>
          <Text style={{ color: colors.gold, fontSize: 30, fontFamily: FONT_UI_BLACK }}>{countdown}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{isAr ? 'يوم' : 'days'}</Text>
        </LinearGradient>

        {/* Summary */}
        <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Card style={styles.summaryCard}><Text style={[styles.summaryNum, { color: colors.teal }]}>{completedFasts}/30</Text><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{isAr ? 'صيام' : 'Fasts'}</Text></Card>
          <Card style={styles.summaryCard}><Text style={[styles.summaryNum, { color: colors.gold }]}>{totalQuranPages}</Text><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{isAr ? 'صفحات قرآن' : 'Quran Pages'}</Text></Card>
          <Card style={styles.summaryCard}><Text style={[styles.summaryNum, { color: colors.teal }]}>{data.totalCharity}</Text><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{isAr ? 'صدقة' : 'Charity'}</Text></Card>
        </View>

        {/* Tabs — RTL reverses order */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} style={{ flexGrow: 0, marginBottom: 14 }}>
          {(isRTL ? [...tabs].reverse() : tabs).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, { backgroundColor: active ? colors.teal + '33' : colors.card, borderColor: active ? colors.teal + '4D' : colors.border }]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={{ color: active ? colors.teal : colors.textSecondary, fontSize: 11.5, fontFamily: FONT_UI_MEDIUM }}>{tab.icon} {tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Calendar */}
        {activeTab === 'calendar' && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? '30 يوم رمضان' : '30 Days of Ramadan'}</Text>
            {/* RTL: day 1 top-right, day 30 bottom-left + Arabic numerals */}
            {/* RTL: day 1 top-right, flowing right→left */}
            <View style={[styles.dayGrid, { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }]}>
              {data.days.map((day) => (
                <TouchableOpacity
                  key={day.day}
                  style={[styles.dayCell, { backgroundColor: day.fasted ? colors.teal + '4D' : colors.surface, borderColor: day.fasted ? colors.teal : colors.border }]}
                  onPress={() => toggleFast(day.day)}
                >
                  <Text style={{ color: day.fasted ? colors.teal : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_BOLD }}>
                    {day.day}
                  </Text>
                  {day.fasted && <Text style={{ color: colors.teal, fontSize: 8 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.subTitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'صفحات القرآن اليومية' : 'Daily Quran Pages'}</Text>
            {/* Quran pages grid — Arabic: right-to-left with "يوم N" labels */}
            <View style={[styles.quranGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {data.days.slice(0, 10).map((day) => (
                <View key={day.day} style={styles.quranCell}>
                  <Text style={{ color: colors.textSecondary, fontSize: 9, fontFamily: FONT_UI, textAlign: 'center' }}>
                    {isAr ? `يوم ${day.day}` : `D${day.day}`}
                  </Text>
                  <TextInput
                    value={day.quranPages ? String(day.quranPages) : ''}
                    onChangeText={(v) => updateQuranPages(day.day, parseInt(v) || 0)}
                    keyboardType="numeric"
                    style={[styles.quranInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  />
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Meals */}
        {activeTab === 'meals' && (
          <View style={{ gap: 14 }}>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🌅 {isAr ? 'أفكار السحور' : 'Suhoor Ideas'}</Text>
              <View style={{ gap: 8 }}>
                {data.mealPlan.suhoor.map((meal, i) => (
                  <View key={i} style={[styles.mealRow, { backgroundColor: colors.bg, flexDirection: 'row' }]}><Text>🥣</Text><Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI }}>{meal}</Text></View>
                ))}
              </View>
            </Card>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🌙 {isAr ? 'أفكار الإفطار' : 'Iftar Ideas'}</Text>
              <View style={{ gap: 8 }}>
                {data.mealPlan.iftar.map((meal, i) => (
                  <View key={i} style={[styles.mealRow, { backgroundColor: colors.bg, flexDirection: 'row' }]}><Text>🍲</Text><Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI }}>{meal}</Text></View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* Budget */}
        {activeTab === 'budget' && renderBudget(Object.entries(data.budget) as [string, number][], budgetLabels, colors.teal, 'budget')}

        {/* Eid */}
        {activeTab === 'eid' && renderBudget(Object.entries(data.eidBudget) as [string, number][], eidLabels, colors.gold, 'eid')}

        {/* Charity */}
        {activeTab === 'charity' && (
          <View style={{ gap: 14 }}>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🤲 {isAr ? 'متتبع الصدقة' : 'Charity Tracker'}</Text>
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ color: colors.teal, fontSize: 30, fontFamily: FONT_UI_BLACK }}>{data.totalCharity}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{isAr ? 'الهدف اليومي' : 'Daily Goal'}: {data.charityGoal}</Text>
              </View>
              <ProgressBar value={Math.min((data.totalCharity / (data.charityGoal * 30)) * 100, 100)} color={colors.teal} height={12} />
              <View style={[styles.chRow, { marginTop: 14 }]}>
                {[10, 50, 100].map((amount) => (
                  <TouchableOpacity key={amount} style={[styles.chBtn, { backgroundColor: colors.teal + '1A', borderColor: colors.teal + '4D' }]} onPress={() => addDailyCharity(1, amount)}>
                    <Text style={{ color: colors.teal, fontSize: 14, fontFamily: FONT_UI_BOLD }}>+{amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
            <Card>
              <Text style={[styles.subTitle, { color: colors.textSecondary, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'سجل الصدقات' : 'Charity Log'}</Text>
              {data.days.filter((d) => d.charity > 0).length > 0 ? data.days.filter((d) => d.charity > 0).map((d) => (
                <View key={d.day} style={[styles.logRow, { borderBottomColor: colors.border, flexDirection: 'row' }]}>
                  <Text style={{ color: colors.text, fontSize: 12, fontFamily: FONT_UI }}>{isAr ? 'يوم' : 'Day'} {d.day}</Text>
                  <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{d.charity}</Text>
                </View>
              )) : (
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, textAlign: 'center', paddingVertical: 16 }}>{isAr ? 'لم تسجل صدقات بعد' : 'No charity recorded yet'}</Text>
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  countdown: { borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center', marginBottom: 14 },
  summaryRow: { gap: 8, marginBottom: 14 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  summaryNum: { fontSize: 18, fontFamily: FONT_UI_BOLD },
  summaryLabel: { fontSize: 10, fontFamily: FONT_UI, marginTop: 2, textAlign: 'center' },
  tabRow: { gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },


  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCell: { width: '14%', aspectRatio: 1, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  subTitle: { fontSize: 12, fontFamily: FONT_UI_BOLD, marginTop: 16, marginBottom: 8 },
  quranGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quranCell: { width: '18%' },
  quranInput: { borderRadius: 6, borderWidth: 1, textAlign: 'center', fontSize: 12, paddingVertical: 4, marginTop: 2, fontFamily: FONT_UI },
  mealRow: { alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  budgetRow: { alignItems: 'center', gap: 12, marginBottom: 12 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  totalRow: { justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  chRow: { flexDirection: 'row', gap: 8 },
  chBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  logRow: { justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1 },
});
