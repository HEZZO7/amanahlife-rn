/**
 * Financial Dashboard — migrated from app/frontend/src/pages/FinancialDashboard.tsx
 * Read-only rollup: net worth, savings rate, expense-by-category bars, 6-month
 * income/expense trend, savings-goal progress — all computed from data already
 * stored by finance.tsx ('amanah_finance') and family-budget.tsx
 * ('amanah_family_budget'). No new data model, no writes. (Web PremiumGate
 * requiredTier="balanced" omitted — no RN equivalent, matching the same
 * decision already made for ai-life-coach.tsx / weekly-life-score.tsx.)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface Transaction { type: string; amount: number; category?: string; date?: string; }
interface FamilyBudgetData { annualGoals?: Record<string, number> }

const GOAL_LABELS: Record<string, { en: string; ar: string }> = {
  hajj: { en: 'Hajj Fund', ar: 'صندوق الحج' },
  education: { en: 'Education', ar: 'التعليم' },
  emergency: { en: 'Emergency', ar: 'الطوارئ' },
  savings: { en: 'General Savings', ar: 'التوفير العام' },
};

export default function FinancialDashboard() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const tr = (en: string, ar: string) => (isAr ? ar : en);
  const userId = user?.id ?? null;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetData, setBudgetData] = useState<FamilyBudgetData>({});

  // Read-only cross-file dependencies (finance.tsx / family-budget.tsx own
  // these keys) - no migration/write-back here, this screen is pure display.
  useEffect(() => {
    migrateLegacyKeyIfNeeded('amanah_finance', userId).then(() => {
      getUserItem('amanah_finance', userId).then((s) => { if (s) { try { setTransactions(JSON.parse(s)); } catch {} } });
    });
    migrateLegacyKeyIfNeeded('amanah_family_budget', userId).then(() => {
      getUserItem('amanah_family_budget', userId).then((s) => { if (s) { try { setBudgetData(JSON.parse(s)); } catch {} } });
    });
  }, [userId]);

  const dashboardData = useMemo(() => {
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const goals = budgetData.annualGoals || { hajj: 20000, education: 15000, emergency: 10000, savings: 30000 };
    const netWorth = totalIncome - totalExpenses + (goals.savings || 0) * 0.1;
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

    const categoryTotals: Record<string, number> = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      const cat = t.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0);
    });

    const monthlyData: { month: string; income: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthLabel = d.toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short' });
      const monthIncome = transactions.filter((t) => t.type === 'income' && t.date?.startsWith(monthStr)).reduce((sum, t) => sum + (t.amount || 0), 0);
      const monthExpenses = transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(monthStr)).reduce((sum, t) => sum + (t.amount || 0), 0);
      monthlyData.push({ month: monthLabel, income: monthIncome, expenses: monthExpenses });
    }

    const saved = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, netWorth, savingsRate, categoryTotals, monthlyData, goals, saved };
  }, [transactions, budgetData, isAr]);

  const maxCategory = Math.max(...Object.values(dashboardData.categoryTotals), 1);
  const maxMonthly = Math.max(...dashboardData.monthlyData.map((m) => Math.max(m.income, m.expenses)), 1);
  const sortedCategories = Object.entries(dashboardData.categoryTotals).sort(([, a], [, b]) => b - a);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="📊" title={tr('Financial Dashboard', 'لوحة التحكم المالية')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>💰 {tr('Net Worth', 'صافي الثروة')}</Text>
            <Text style={[styles.kpiValue, { color: colors.gold }]}>{Math.round(dashboardData.netWorth).toLocaleString()}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>📈 {tr('Savings Rate', 'معدل التوفير')}</Text>
            <Text style={[styles.kpiValue, { color: dashboardData.savingsRate >= 20 ? colors.teal : colors.red }]}>{dashboardData.savingsRate}%</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: FONT_UI }}>{tr('Monthly', 'شهري')}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>💵 {tr('Total Income', 'إجمالي الدخل')}</Text>
            <Text style={[styles.kpiValue, { color: colors.teal }]}>{dashboardData.totalIncome.toLocaleString()}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>🧾 {tr('Total Expenses', 'إجمالي المصروفات')}</Text>
            <Text style={[styles.kpiValue, { color: colors.red }]}>{dashboardData.totalExpenses.toLocaleString()}</Text>
          </Card>
        </View>

        {/* Expense Breakdown */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>📊 {tr('Expense Breakdown', 'توزيع المصروفات')}</Text>
          {sortedCategories.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, textAlign: 'center', paddingVertical: 12 }}>
              {tr('No data yet', 'لا توجد بيانات بعد')}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {sortedCategories.map(([cat, amount]) => (
                <View key={cat}>
                  <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ color: colors.text, fontSize: 12, fontFamily: FONT_UI }}>{cat}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{amount.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.bg }]}>
                    <View style={{ width: `${(amount / maxCategory) * 100}%`, height: '100%', borderRadius: 6, backgroundColor: colors.gold }} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Monthly Trend */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>📈 {tr('Monthly Trend', 'الاتجاه الشهري')}</Text>
          <View style={{ gap: 10 }}>
            {dashboardData.monthlyData.map((m, idx) => (
              <View key={idx} style={[styles.trendRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, width: 34 }}>{m.month}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={[styles.thinBar, { backgroundColor: colors.bg }]}>
                    <View style={{ width: `${(m.income / maxMonthly) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: colors.teal }} />
                  </View>
                  <View style={[styles.thinBar, { backgroundColor: colors.bg }]}>
                    <View style={{ width: `${(m.expenses / maxMonthly) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: colors.red }} />
                  </View>
                </View>
                <View style={{ width: 50, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ color: colors.teal, fontSize: 9.5, fontFamily: FONT_UI }}>{m.income}</Text>
                  <Text style={{ color: colors.red, fontSize: 9.5, fontFamily: FONT_UI }}>{m.expenses}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={[styles.legendRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.teal }]} /><Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>{tr('Income', 'دخل')}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.red }]} /><Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>{tr('Expenses', 'مصروفات')}</Text></View>
          </View>
        </Card>

        {/* Savings Goals */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🎯 {tr('Savings Goals', 'أهداف التوفير')}</Text>
          <View style={{ gap: 12 }}>
            {Object.entries(dashboardData.goals).map(([key, target]) => {
              const label = GOAL_LABELS[key] || { en: key, ar: key };
              const allocated = Math.round(dashboardData.saved * 0.25);
              const pct = Math.min(Math.round((allocated / (target as number)) * 100), 100);
              return (
                <View key={key}>
                  <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ color: colors.text, fontSize: 12, fontFamily: FONT_UI }}>{isAr ? label.ar : label.en}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{pct}% ({allocated.toLocaleString()}/{(target as number).toLocaleString()})</Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.bg, height: 8 }]}>
                    <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: colors.gold }} />
                  </View>
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
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpiCard: { width: '47%' },
  kpiLabel: { fontSize: 11, fontFamily: FONT_UI, marginBottom: 4 },
  kpiValue: { fontSize: 19, fontFamily: FONT_UI_BOLD },
  cardTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD, marginBottom: 10 },
  rowBetween: { justifyContent: 'space-between', marginBottom: 4 },
  barTrack: { height: 10, borderRadius: 6, overflow: 'hidden' },
  trendRow: { alignItems: 'center', gap: 8 },
  thinBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  legendRow: { justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
