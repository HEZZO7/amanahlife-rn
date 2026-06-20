/**
 * Weekly Life Score — migrated from app/frontend/src/pages/WeeklyLifeScore.tsx
 * Computes 5 life dimensions (spiritual/health/financial/social/growth) from
 * stored data, overall score, dimension bars, weekly trend, recommendations.
 * localStorage → AsyncStorage (async aggregation). (PremiumGate omitted.)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

interface DimensionScore { name: string; nameAr: string; score: number; icon: string; color: string; }
interface WeeklyRecord { weekStart: string; scores: number[]; overall: number; }

const STORAGE_KEY = 'amanah-weekly-life-scores';
const RECOMMENDATIONS = {
  en: {
    Spiritual: 'Try to complete all 5 daily prayers and add morning adhkar to your routine.',
    Health: 'Log your wellness data daily - track mood, sleep, and hydration for better insights.',
    Financial: 'Review your spending this week. Consider setting a daily budget limit.',
    Social: 'Schedule quality time with family. Even 15 minutes of undivided attention matters.',
    Growth: 'Break large tasks into smaller ones. Complete at least 3 tasks daily.',
  },
  ar: {
    Spiritual: 'حاول إتمام الصلوات الخمس يومياً وأضف أذكار الصباح لروتينك.',
    Health: 'سجل بيانات صحتك يومياً - تتبع المزاج والنوم والترطيب لرؤى أفضل.',
    Financial: 'راجع إنفاقك هذا الأسبوع. فكر في وضع حد يومي للميزانية.',
    Social: 'خصص وقتاً نوعياً للعائلة. حتى 15 دقيقة من الاهتمام الكامل مهمة.',
    Growth: 'قسم المهام الكبيرة إلى أصغر. أكمل 3 مهام يومياً على الأقل.',
  },
};

function getWeekStart(): string {
  const now = new Date();
  const diff = now.getDate() - now.getDay();
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

export default function WeeklyLifeScore() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';

  const [dimensions, setDimensions] = useState<DimensionScore[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyRecord[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    (async () => {
      // Spiritual — prayer completions this week
      let spiritualScore = 0;
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today); date.setDate(date.getDate() - i);
        const prayerData = await AsyncStorage.getItem(`prayer_completed_${date.toDateString()}`);
        if (prayerData) spiritualScore += (JSON.parse(prayerData).length / 5) * (100 / 7);
      }
      // Health — wellness logs
      let healthScore = 50;
      const wellnessData = await AsyncStorage.getItem('amanah-wellness');
      if (wellnessData) { try { const logs = JSON.parse(wellnessData).slice(-7); if (logs.length > 0) healthScore = Math.min(100, logs.length * 14 + 10); } catch {} }
      // Financial — savings rate
      let financialScore = 50;
      const transactions = JSON.parse((await AsyncStorage.getItem('amanah-transactions')) || '[]');
      if (transactions.length > 0) {
        const income = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + (t.amount || 0), 0);
        const expenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (t.amount || 0), 0);
        if (income > 0) financialScore = Math.min(100, Math.max(0, ((income - expenses) / income) * 100 + 30));
      }
      // Social — family goals
      const goals = JSON.parse((await AsyncStorage.getItem('amanah-goals')) || '[]');
      const familyGoals = goals.filter((g: any) => g.category === 'Family' || g.category === 'Social');
      const socialScore = familyGoals.length > 0
        ? Math.min(100, familyGoals.reduce((s: number, g: any) => s + (g.progress || 0), 0) / familyGoals.length + 20) : 40;
      // Growth — tasks completed
      const tasks = JSON.parse((await AsyncStorage.getItem('amanah-tasks')) || '[]');
      const completedTasks = tasks.filter((t: any) => t.completed);
      const growthScore = tasks.length > 0 ? Math.min(100, (completedTasks.length / Math.max(tasks.length, 1)) * 100) : 30;

      const scores: DimensionScore[] = [
        { name: 'Spiritual', nameAr: 'الروحاني', score: Math.round(spiritualScore), icon: '🕌', color: '#1FC7C1' },
        { name: 'Health', nameAr: 'الصحة', score: Math.round(healthScore), icon: '💚', color: '#4ade80' },
        { name: 'Financial', nameAr: 'المالي', score: Math.round(financialScore), icon: '💰', color: '#c9a96e' },
        { name: 'Social', nameAr: 'الاجتماعي', score: Math.round(socialScore), icon: '👥', color: '#a78bfa' },
        { name: 'Growth', nameAr: 'النمو الشخصي', score: Math.round(growthScore), icon: '📈', color: '#f472b6' },
      ];
      setDimensions(scores);
      const overall = Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length);
      setOverallScore(overall);

      const stored: WeeklyRecord[] = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || '[]');
      const thisWeekStart = getWeekStart();
      const idx = stored.findIndex((r) => r.weekStart === thisWeekStart);
      const record: WeeklyRecord = { weekStart: thisWeekStart, scores: scores.map((s) => s.score), overall };
      if (idx >= 0) stored[idx] = record; else { stored.push(record); if (stored.length > 8) stored.shift(); }
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setWeeklyHistory(stored.slice(-4));
    })();
  }, []);

  const scoreColor = (s: number) => (s >= 70 ? colors.green : s >= 50 ? colors.gold : colors.red);
  const scoreBg = (s: number) => (s >= 70 ? { bg: colors.green + '1A', bd: colors.green + '4D' } : s >= 50 ? { bg: colors.gold + '1A', bd: colors.gold + '4D' } : { bg: colors.red + '1A', bd: colors.red + '4D' });

  const lowestDimension = dimensions.length > 0 ? dimensions.reduce((min, d) => (d.score < min.score ? d : min), dimensions[0]) : null;
  const obg = scoreBg(overallScore);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="💯" title={isAr ? 'مؤشر الحياة الأسبوعي' : 'Weekly Life Score'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall */}
        <View style={[styles.overall, { backgroundColor: obg.bg, borderColor: obg.bd }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, marginBottom: 6 }}>{isAr ? 'النتيجة الإجمالية' : 'Overall Score'}</Text>
          <Text style={[styles.overallNum, { color: scoreColor(overallScore) }]}>{overallScore}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, marginTop: 6 }}>
            {overallScore >= 70 ? (isAr ? '🌟 أداء ممتاز! استمر' : '🌟 Excellent! Keep it up') : overallScore >= 50 ? (isAr ? '💪 جيد، يمكنك التحسن' : '💪 Good, room for improvement') : (isAr ? '🔄 تحتاج لمزيد من الجهد' : '🔄 Needs more effort')}
          </Text>
        </View>

        {/* Dimensions */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>📐 {isAr ? 'تفاصيل الأبعاد' : 'Dimension Breakdown'}</Text>
          <View style={{ gap: 12 }}>
            {dimensions.map((dim) => (
              <View key={dim.name} style={{ gap: 5 }}>
                {/* In RTL: score on left, label+icon on right */}
                <View style={[styles.dimHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: isRTL ? scoreColor(dim.score) : colors.text, fontSize: 13.5, fontFamily: FONT_UI_MEDIUM, textAlign: isRTL ? 'right' : 'left' }}>
                    {isRTL ? `${dim.score}/100` : `${dim.icon} ${dim.name}`}
                  </Text>
                  <Text style={{ color: isRTL ? colors.text : scoreColor(dim.score), fontSize: 13.5, fontFamily: FONT_UI_BOLD, textAlign: isRTL ? 'left' : 'right' }}>
                    {isRTL ? `${dim.icon} ${dim.nameAr}` : `${dim.score}/100`}
                  </Text>
                </View>
                {/* Bar grows from right in RTL */}
                <View style={[styles.track, { backgroundColor: colors.bg }]}>
                  <View style={{
                    width: `${dim.score}%`,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: dim.color,
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                  }} />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Weekly trend */}
        {weeklyHistory.length > 1 && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>📈 {isAr ? 'الاتجاه الأسبوعي' : 'Weekly Trend'}</Text>
            <View style={styles.chart}>
              {weeklyHistory.map((week, i) => {
                const height = Math.max(10, week.overall);
                const last = i === weeklyHistory.length - 1;
                return (
                  <View key={i} style={styles.barCol}>
                    <Text style={{ color: scoreColor(week.overall), fontSize: 11, fontFamily: FONT_UI_BOLD, marginBottom: 2 }}>{week.overall}</Text>
                    <View style={styles.barTrack}>
                      <View style={{ width: '100%', height: `${height}%`, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: week.overall >= 70 ? '#4ade80' : week.overall >= 50 ? '#facc15' : '#f87171', opacity: last ? 1 : 0.5, minHeight: 6 }} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI, marginTop: 4 }}>{isAr ? `أ${i + 1}` : `W${i + 1}`}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Recommendations */}
        {lowestDimension && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>💡 {isAr ? 'توصيات للتحسين' : 'Improvement Recommendations'}</Text>
            <View style={[styles.recBox, { backgroundColor: '#C9A96E1A', borderColor: '#C9A96E33' }]}>
              <Text style={{ color: '#C9A96E', fontSize: 11, fontFamily: FONT_UI_MEDIUM, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
                {isAr ? 'أقل بُعد:' : 'Lowest dimension:'} {lowestDimension.icon} {isAr ? lowestDimension.nameAr : lowestDimension.name} ({lowestDimension.score}/100)
              </Text>
              <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
                {RECOMMENDATIONS[isAr ? 'ar' : 'en'][lowestDimension.name as keyof typeof RECOMMENDATIONS.en]}
              </Text>
            </View>
            {dimensions.filter((d) => d.score < 50 && d.name !== lowestDimension.name).slice(0, 2).map((dim) => (
              <View key={dim.name} style={[styles.recBox, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 8 }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>{dim.icon} {isAr ? dim.nameAr : dim.name} ({dim.score}/100)</Text>
                <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>{RECOMMENDATIONS[isAr ? 'ar' : 'en'][dim.name as keyof typeof RECOMMENDATIONS.en]}</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  overall: { borderRadius: 18, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 14 },
  overallNum: { fontSize: 48, fontFamily: FONT_UI_BLACK },
  cardTitle: { fontSize: 15, fontFamily: FONT_UI_BOLD, marginBottom: 14 },
  dimHeader: { justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  recBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
});
