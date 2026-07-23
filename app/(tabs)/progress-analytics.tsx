/**
 * Progress Analytics — migrated from app/frontend/src/pages/ProgressAnalytics.tsx
 * recharts (Bar/Pie/Line) reimplemented with react-native-svg: category bar
 * chart, status donut, progress-over-time line chart, goal-status & activity
 * cards. Reads goals/tasks/dhikr/streaks from AsyncStorage. Bilingual/RTL.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Circle, Polyline, Line as SvgLine } from 'react-native-svg';
import { getUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

interface Goal { id: string; title: string; category: 'Personal' | 'Financial' | 'Spiritual' | 'Family'; targetDate: string; progress: number; status: 'Active' | 'Completed' | 'Paused'; createdAt: string; }
interface Task { id: string; title: string; completed?: boolean; date?: string; }

const GOLD = '#C9A96E';
const CHART_W = Dimensions.get('window').width - 64;

export default function ProgressAnalytics() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const userId = user?.id ?? null;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dhikrCount, setDhikrCount] = useState(0);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });

  useEffect(() => {
    (async () => {
      const today = new Date().toDateString();
      await Promise.all([
        migrateLegacyKeyIfNeeded('amanah-goals', userId),
        // 'amanah_tasks' (underscore) is tasks.tsx's real key. This used to
        // read 'amanah-tasks' (dash), a pre-existing mismatch that meant the
        // task count here was always 0. Fixed 2026-07-23.
        migrateLegacyKeyIfNeeded('amanah_tasks', userId),
        migrateLegacyKeyIfNeeded(`dhikr_total_${today}`, userId),
        migrateLegacyKeyIfNeeded('amanah-streaks', userId),
      ]);
      try { setGoals(JSON.parse((await getUserItem('amanah-goals', userId)) || '[]')); } catch {}
      try { setTasks(JSON.parse((await getUserItem('amanah_tasks', userId)) || '[]')); } catch {}
      setDhikrCount(parseInt((await getUserItem(`dhikr_total_${today}`, userId)) || '0', 10));
      try { const d = JSON.parse((await getUserItem('amanah-streaks', userId)) || '{}'); setStreakData({ currentStreak: d.currentStreak || 0, longestStreak: d.longestStreak || 0 }); } catch {}
    })();
  }, [userId]);

  const catLabels: Record<string, { ar: string; en: string }> = {
    Personal: { ar: 'شخصي', en: 'Personal' }, Financial: { ar: 'مالي', en: 'Financial' },
    Spiritual: { ar: 'روحي', en: 'Spiritual' }, Family: { ar: 'عائلي', en: 'Family' },
  };
  const categoryProgress = (['Personal', 'Financial', 'Spiritual', 'Family'] as const).map((cat) => {
    const catGoals = goals.filter((g) => g.category === cat);
    return { name: catLabels[cat][isAr ? 'ar' : 'en'], progress: catGoals.length ? Math.round(catGoals.reduce((s, g) => s + g.progress, 0) / catGoals.length) : 0 };
  });

  const statusDistribution = [
    { name: isAr ? 'مكتمل' : 'Completed', value: goals.filter((g) => g.status === 'Completed').length, color: '#22c55e' },
    { name: isAr ? 'نشط' : 'Active', value: goals.filter((g) => g.status === 'Active').length, color: GOLD },
    { name: isAr ? 'متوقف' : 'Paused', value: goals.filter((g) => g.status === 'Paused').length, color: '#6b7280' },
  ].filter((d) => d.value > 0);

  const weeklyTrends = (() => {
    const weeks: { week: string; progress: number; tasks: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
      const relevant = goals.filter((g) => new Date(g.createdAt) <= weekEnd);
      const avg = relevant.length ? Math.round(relevant.reduce((s, g) => s + g.progress, 0) / relevant.length) : 0;
      const wt = tasks.filter((t) => t.date && t.completed && new Date(t.date) >= weekStart && new Date(t.date) < weekEnd).length;
      weeks.push({ week: isAr ? `أ${8 - i}` : `W${8 - i}`, progress: avg, tasks: wt });
    }
    return weeks;
  })();

  const goalStatus = {
    total: goals.length,
    completed: goals.filter((g) => g.status === 'Completed').length,
    active: goals.filter((g) => g.status === 'Active').length,
    paused: goals.filter((g) => g.status === 'Paused').length,
  };
  const activity = { completedTasks: tasks.filter((t) => t.completed).length, totalTasks: tasks.length };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🏅" title={isAr ? 'تحليلات التقدم' : 'Progress Analytics'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category bar chart */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.h2, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'التقدم حسب الفئة' : 'Progress by Category'}</Text>
          {goals.length > 0 ? (
            <BarChart data={categoryProgress} colors={colors} />
          ) : (
            <Empty icon="📊" text={isAr ? 'أضف أهدافاً لرؤية التقدم' : 'Add goals to see progress'} colors={colors} />
          )}
        </Card>

        {/* Status donut */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.h2, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'نظرة عامة' : 'Overview'}</Text>
          {statusDistribution.length > 0 ? (
            <Donut data={statusDistribution} colors={colors} />
          ) : (
            <Empty icon="🎯" text={isAr ? 'لا توجد أهداف بعد' : 'No goals yet'} colors={colors} />
          )}
        </Card>

        {/* Line chart */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.h2, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'التقدم عبر الزمن' : 'Progress Over Time'}</Text>
          <LineChartView data={weeklyTrends} colors={colors} />
          <View style={styles.legend}>
            <Legend color={GOLD} label={isAr ? 'التقدم %' : 'Progress %'} colors={colors} />
            <Legend color={colors.teal} label={isAr ? 'المهام المنجزة' : 'Tasks Done'} colors={colors} />
          </View>
        </Card>

        {/* Goal status cards */}
        <Text style={[styles.h2, { color: colors.text, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'حالة الأهداف' : 'Goal Status'}</Text>
        <View style={styles.statGrid}>
          <StatCard icon="✓" iconColor="#22c55e" value={goalStatus.completed} label={isAr ? 'مكتمل' : 'Completed'} pct={goalStatus.total ? Math.round((goalStatus.completed / goalStatus.total) * 100) : null} colors={colors} />
          <StatCard icon="◐" iconColor={GOLD} value={goalStatus.active} label={isAr ? 'قيد التنفيذ' : 'In Progress'} pct={goalStatus.total ? Math.round((goalStatus.active / goalStatus.total) * 100) : null} colors={colors} />
          <StatCard icon="⏸" iconColor="#6b7280" value={goalStatus.paused} label={isAr ? 'متوقف' : 'Paused'} pct={goalStatus.total ? Math.round((goalStatus.paused / goalStatus.total) * 100) : null} colors={colors} />
          <StatCard icon="Σ" iconColor={colors.teal} value={goalStatus.total} label={isAr ? 'إجمالي' : 'Total'} pct={null} colors={colors} />
        </View>

        {/* Activity summary */}
        <Text style={[styles.h2, { color: colors.text, marginTop: 20, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'ملخص النشاط' : 'Activity Summary'}</Text>
        <View style={styles.statGrid}>
          <ActivityCard emoji="📿" value={dhikrCount} color={GOLD} label={isAr ? 'ذكر اليوم' : "Today's Dhikr"} colors={colors} />
          <ActivityCard emoji="✅" value={`${activity.completedTasks}/${activity.totalTasks}`} color={colors.teal} label={isAr ? 'المهام المنجزة' : 'Tasks Done'} colors={colors} />
          <ActivityCard emoji="🔥" value={streakData.currentStreak} color="#f97316" label={isAr ? 'التتابع الحالي' : 'Current Streak'} colors={colors} />
          <ActivityCard emoji="🏆" value={streakData.longestStreak} color={colors.teal} label={isAr ? 'أطول تتابع' : 'Longest Streak'} colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
}

function BarChart({ data, colors }: { data: { name: string; progress: number }[]; colors: any }) {
  const { isRTL } = useLanguage();
  const H = 180, barW = CHART_W / data.length * 0.5, gap = CHART_W / data.length;
  return (
    <View>
      <Svg width={CHART_W} height={H}>
        {[0, 25, 50, 75, 100].map((g) => {
          const y = H - 24 - (g / 100) * (H - 40);
          return <SvgLine key={g} x1={0} y1={y} x2={CHART_W} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />;
        })}
        {data.map((d, i) => {
          const barH = (d.progress / 100) * (H - 40);
          const x = i * gap + gap / 2 - barW / 2;
          return <Rect key={i} x={x} y={H - 24 - barH} width={barW} height={Math.max(barH, 1)} rx={6} fill={GOLD} />;
        })}
      </Svg>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {data.map((d, i) => (
          <View key={i} style={{ width: gap, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{d.name}</Text>
            <Text style={{ color: colors.text, fontSize: 11, fontFamily: FONT_UI_BOLD }}>{d.progress}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Donut({ data, colors }: { data: { name: string; value: number; color: string }[]; colors: any }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 60, cx = 90, cy = 90, C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={180} height={180} style={{ transform: [{ rotate: '-90deg' }] }}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const seg = frac * C;
          const circle = (
            <Circle key={i} cx={cx} cy={cy} r={r} stroke={d.color} strokeWidth={22} fill="none"
              strokeDasharray={`${seg} ${C - seg}`} strokeDashoffset={-offset} />
          );
          offset += seg;
          return circle;
        })}
      </Svg>
      <View style={[styles.legend, { marginTop: 8 }]}>
        {data.map((d, i) => <Legend key={i} color={d.color} label={`${d.name}: ${d.value}`} colors={colors} />)}
      </View>
    </View>
  );
}

function LineChartView({ data, colors }: { data: { week: string; progress: number; tasks: number }[]; colors: any }) {
  const H = 180, padB = 24, padT = 8;
  const maxVal = Math.max(100, ...data.map((d) => Math.max(d.progress, d.tasks)), 1);
  const stepX = CHART_W / (data.length - 1);
  const y = (v: number) => padT + (1 - v / maxVal) * (H - padB - padT);
  const ptsProgress = data.map((d, i) => `${i * stepX},${y(d.progress)}`).join(' ');
  const ptsTasks = data.map((d, i) => `${i * stepX},${y(d.tasks)}`).join(' ');
  return (
    <View>
      <Svg width={CHART_W} height={H}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => {
          const gy = padT + g * (H - padB - padT);
          return <SvgLine key={g} x1={0} y1={gy} x2={CHART_W} y2={gy} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />;
        })}
        <Polyline points={ptsProgress} fill="none" stroke={GOLD} strokeWidth={2} />
        <Polyline points={ptsTasks} fill="none" stroke={colors.teal} strokeWidth={2} />
        {data.map((d, i) => <Circle key={`p${i}`} cx={i * stepX} cy={y(d.progress)} r={3} fill={GOLD} />)}
        {data.map((d, i) => <Circle key={`t${i}`} cx={i * stepX} cy={y(d.tasks)} r={3} fill={colors.teal} />)}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {data.map((d, i) => <Text key={i} style={{ color: colors.textSecondary, fontSize: 9, fontFamily: FONT_UI }}>{d.week}</Text>)}
      </View>
    </View>
  );
}

function Legend({ color, label, colors }: { color: string; label: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{label}</Text>
    </View>
  );
}

function Empty({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 28 }}>
      <Text style={{ fontSize: 28, marginBottom: 6 }}>{icon}</Text>
      <Text style={{ color: colors.textSecondary, fontFamily: FONT_UI }}>{text}</Text>
    </View>
  );
}

function StatCard({ icon, iconColor, value, label, pct, colors }: any) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconColor + '33' }]}><Text style={{ color: iconColor, fontSize: 16 }}>{icon}</Text></View>
      <Text style={{ color: colors.text, fontSize: 22, fontFamily: FONT_UI_BOLD }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginTop: 2 }}>{label}</Text>
      {pct !== null && <Text style={{ color: iconColor, fontSize: 11, fontFamily: FONT_UI_MEDIUM, marginTop: 2 }}>{pct}%</Text>}
    </Card>
  );
}

function ActivityCard({ emoji, value, color, label, colors }: any) {
  return (
    <Card style={styles.statCard}>
      <Text style={{ fontSize: 22, marginBottom: 2 }}>{emoji}</Text>
      <Text style={{ color, fontSize: 20, fontFamily: FONT_UI_BOLD }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  h2: { fontSize: 16, fontFamily: FONT_UI_BOLD, marginBottom: 12, alignSelf: 'stretch' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: 16 },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
