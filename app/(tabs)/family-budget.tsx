/**
 * Family Budget — migrated from app/frontend/src/pages/FamilyBudget.tsx
 * localStorage('amanah_family_budget') → AsyncStorage. Tabs (family/budget/
 * income/expenses), summary, members, annual goals, category budget bars,
 * income/expense forms (currency chips). Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PageHeader, Card, ProgressBar } from '../../src/components/ui';
import LockedFeatureModal from '../../src/components/LockedFeatureModal';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface FamilyMember { id: string; name: string; role: string; }
interface BudgetCategory { name: string; nameAr: string; icon: string; budgeted: number; actual: number; }
interface IncomeEntry { id: string; source: string; amount: number; currency: string; date: string; }
interface ExpenseEntry { id: string; category: string; description: string; amount: number; currency: string; date: string; }
interface FamilyBudgetData {
  members: FamilyMember[];
  annualGoals: { hajj: number; education: number; emergency: number; savings: number };
  monthlyBudget: number;
  categories: BudgetCategory[];
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
}

const CURRENCIES = ['USD', 'EUR', 'GBP'];
const RATES: Record<string, number> = { SAR: 1, USD: 3.75, EUR: 4.05, GBP: 4.72 };
const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { name: 'Housing', nameAr: 'السكن', icon: '🏠', budgeted: 2000, actual: 0 },
  { name: 'Food', nameAr: 'الطعام', icon: '🍽️', budgeted: 1500, actual: 0 },
  { name: 'Transport', nameAr: 'المواصلات', icon: '🚗', budgeted: 500, actual: 0 },
  { name: 'Education', nameAr: 'التعليم', icon: '📚', budgeted: 800, actual: 0 },
  { name: 'Healthcare', nameAr: 'الصحة', icon: '🏥', budgeted: 300, actual: 0 },
  { name: 'Charity', nameAr: 'الصدقة', icon: '🤲', budgeted: 500, actual: 0 },
  { name: 'Entertainment', nameAr: 'الترفيه', icon: '🎮', budgeted: 200, actual: 0 },
  { name: 'Utilities', nameAr: 'المرافق', icon: '💡', budgeted: 400, actual: 0 },
];
const STORAGE_KEY = 'amanah_family_budget';
const DEFAULT_DATA: FamilyBudgetData = {
  members: [], annualGoals: { hajj: 20000, education: 15000, emergency: 10000, savings: 30000 },
  monthlyBudget: 6200, categories: DEFAULT_CATEGORIES, income: [], expenses: [],
};

type Tab = 'family' | 'budget' | 'income' | 'expenses';

export default function FamilyBudget() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const { tier, isTrialActive, loading: subLoading } = useSubscription();
  const userId = user?.id ?? null;
  const hasAccess = tier === 'family' || isTrialActive;
  const [lockedModalOpen, setLockedModalOpen] = useState(true);
  const isAr = language === 'ar';

  const [data, setData] = useState<FamilyBudgetData>(DEFAULT_DATA);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('budget');
  const [newMember, setNewMember] = useState({ name: '', role: '' });
  const [newIncome, setNewIncome] = useState({ source: '', amount: '', currency: 'USD' });
  const [newExpense, setNewExpense] = useState({ category: 'Housing', description: '', amount: '', currency: 'USD' });

  useEffect(() => {
    migrateLegacyKeyIfNeeded(STORAGE_KEY, userId).then(() => {
      getUserItem(STORAGE_KEY, userId).then((s) => { if (s) { try { setData(JSON.parse(s)); } catch {} } setReady(true); });
    });
  }, [userId]);
  useEffect(() => { if (ready) setUserItem(STORAGE_KEY, userId, JSON.stringify(data)); }, [data, ready, userId]);

  const addMember = () => {
    if (!newMember.name) return;
    setData((p) => ({ ...p, members: [...p.members, { id: Date.now().toString(), ...newMember }] }));
    setNewMember({ name: '', role: '' });
  };
  const removeMember = (id: string) => setData((p) => ({ ...p, members: p.members.filter((m) => m.id !== id) }));
  const addIncome = () => {
    if (!newIncome.source || !newIncome.amount) return;
    setData((p) => ({ ...p, income: [...p.income, { id: Date.now().toString(), source: newIncome.source, amount: parseFloat(newIncome.amount), currency: newIncome.currency, date: new Date().toISOString().split('T')[0] }] }));
    setNewIncome({ source: '', amount: '', currency: 'USD' });
  };
  const addExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    const amt = parseFloat(newExpense.amount);
    setData((p) => ({
      ...p,
      expenses: [...p.expenses, { id: Date.now().toString(), category: newExpense.category, description: newExpense.description, amount: amt, currency: newExpense.currency, date: new Date().toISOString().split('T')[0] }],
      categories: p.categories.map((c) => c.name === newExpense.category ? { ...c, actual: c.actual + amt * (RATES[newExpense.currency] || 1) } : c),
    }));
    setNewExpense({ category: 'Housing', description: '', amount: '', currency: 'USD' });
  };

  const totalIncome = data.income.reduce((s, i) => s + i.amount * (RATES[i.currency] || 1), 0);
  const totalExpenses = data.expenses.reduce((s, e) => s + e.amount * (RATES[e.currency] || 1), 0);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'family', label: isAr ? 'العائلة' : 'Family', icon: '👨‍👩‍👧‍👦' },
    { key: 'budget', label: isAr ? 'الميزانية' : 'Budget', icon: '📊' },
    { key: 'income', label: isAr ? 'الدخل' : 'Income', icon: '💵' },
    { key: 'expenses', label: isAr ? 'المصروفات' : 'Expenses', icon: '🧾' },
  ];
  const annualLabels: Record<string, { en: string; ar: string; icon: string }> = {
    hajj: { en: 'Hajj Fund', ar: 'صندوق الحج', icon: '🕋' }, education: { en: 'Education', ar: 'التعليم', icon: '🎓' },
    emergency: { en: 'Emergency', ar: 'الطوارئ', icon: '🚨' }, savings: { en: 'Savings', ar: 'التوفير', icon: '🏦' },
  };

  const inputStyle = [styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' as const : 'left' as const }];

  const CurrencyChips = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {CURRENCIES.map((c) => (
        <TouchableOpacity key={c} style={[styles.curChip, { backgroundColor: value === c ? colors.teal : colors.bg, borderColor: colors.border }]} onPress={() => onChange(c)}>
          <Text style={{ color: value === c ? '#04211C' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (subLoading) return null;

  if (!hasAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <PageHeader icon="👨‍👩‍👧‍👦" title={isAr ? 'ميزانية العائلة' : 'Family Budget'} />
        <LockedFeatureModal
          visible={lockedModalOpen}
          onClose={() => { setLockedModalOpen(false); router.push('/(tabs)/subscription' as any); }}
          requiredPlan="family"
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🔒</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontFamily: FONT_UI_BOLD, marginBottom: 6 }}>
            {isAr ? 'ميزة مدفوعة' : 'Premium Feature'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: 'center' }}>
            {isAr ? 'ميزانية العائلة متاحة في خطة أمانة العائلة.' : 'Family Budget is available in the Family Plan.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="👨‍👩‍👧‍👦" title={isAr ? 'ميزانية العائلة' : 'Family Budget'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow} style={{ flexGrow: 0, marginBottom: 14 }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tab, { backgroundColor: active ? colors.teal + '33' : colors.card, borderColor: active ? colors.teal + '4D' : colors.border }]} onPress={() => setActiveTab(tab.key)}>
                <Text style={{ color: active ? colors.teal : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{tab.icon} {tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary */}
        <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Card style={styles.summaryCard}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>{isAr ? 'الدخل' : 'Income'}</Text><Text style={[styles.sVal, { color: colors.teal }]}>{Math.round(totalIncome).toLocaleString()}</Text></Card>
          <Card style={styles.summaryCard}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>{isAr ? 'المصروفات' : 'Expenses'}</Text><Text style={[styles.sVal, { color: colors.red }]}>{Math.round(totalExpenses).toLocaleString()}</Text></Card>
          <Card style={styles.summaryCard}><Text style={[styles.sLabel, { color: colors.textSecondary }]}>{isAr ? 'المتبقي' : 'Balance'}</Text><Text style={[styles.sVal, { color: totalIncome - totalExpenses >= 0 ? colors.gold : colors.red }]}>{Math.round(totalIncome - totalExpenses).toLocaleString()}</Text></Card>
        </View>

        {/* Family */}
        {activeTab === 'family' && (
          <View style={{ gap: 14 }}>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'أفراد العائلة' : 'Family Members'}</Text>
              {data.members.map((m) => (
                <View key={m.id} style={[styles.memberRow, { borderBottomColor: colors.border, flexDirection: 'row' }]}>
                  <View>
                    <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM, textAlign: isRTL ? 'right' : 'left' }}>{m.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>{m.role}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMember(m.id)} hitSlop={8}><Text style={{ color: colors.red, fontSize: 13 }}>✕</Text></TouchableOpacity>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TextInput value={newMember.name} onChangeText={(v) => setNewMember((p) => ({ ...p, name: v }))} placeholder={isAr ? 'الاسم' : 'Name'} placeholderTextColor={colors.textMuted} style={[...inputStyle, { flex: 1 }]} />
                <TextInput value={newMember.role} onChangeText={(v) => setNewMember((p) => ({ ...p, role: v }))} placeholder={isAr ? 'الدور' : 'Role'} placeholderTextColor={colors.textMuted} style={[...inputStyle, { flex: 1 }]} />
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.teal }]} onPress={addMember}><Text style={{ color: '#04211C', fontSize: 18, fontFamily: FONT_UI_BOLD }}>+</Text></TouchableOpacity>
              </View>
            </Card>

            <Card>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🎯 {isAr ? 'الأهداف السنوية' : 'Annual Goals'}</Text>
              {(Object.entries(data.annualGoals) as [string, number][]).map(([key, value]) => {
                const label = annualLabels[key];
                const progress = Math.min((totalIncome * 0.1) / value * 100, 100);
                return (
                  <View key={key} style={{ marginBottom: 12 }}>
                    <View style={[styles.rowBetween, { flexDirection: 'row', marginBottom: 5 }]}>
                      <Text style={{ color: colors.text, fontSize: 12.5, fontFamily: FONT_UI }}>{label.icon} {isAr ? label.ar : label.en}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{value.toLocaleString()}</Text>
                    </View>
                    <ProgressBar value={progress} color={colors.teal} />
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {/* Budget */}
        {activeTab === 'budget' && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'الميزانية الشهرية' : 'Monthly Budget'}</Text>
            {data.categories.map((cat, idx) => {
              const pct = cat.budgeted > 0 ? Math.min((cat.actual / cat.budgeted) * 100, 100) : 0;
              const over = cat.actual > cat.budgeted;
              return (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 5 }]}>
                    <Text style={{ color: colors.text, fontSize: 12.5, fontFamily: FONT_UI }}>
                      {isAr ? `${isAr ? cat.nameAr : cat.name} ${cat.icon}` : `${cat.icon} ${cat.name}`}
                    </Text>
                    <Text style={{ color: over ? colors.red : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{Math.round(cat.actual).toLocaleString()}/{cat.budgeted.toLocaleString()}</Text>
                  </View>
                  <ProgressBar value={pct} color={over ? colors.red : colors.teal} />
                </View>
              );
            })}
          </Card>
        )}

        {/* Income */}
        {activeTab === 'income' && (
          <View style={{ gap: 14 }}>
            <Card style={{ gap: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', marginBottom: 0 }]}>{isAr ? 'إضافة دخل' : 'Add Income'}</Text>
              <TextInput value={newIncome.source} onChangeText={(v) => setNewIncome((p) => ({ ...p, source: v }))} placeholder={isAr ? 'المصدر' : 'Source'} placeholderTextColor={colors.textMuted} style={inputStyle} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput value={newIncome.amount} onChangeText={(v) => setNewIncome((p) => ({ ...p, amount: v }))} keyboardType="numeric" placeholder={isAr ? 'المبلغ' : 'Amount'} placeholderTextColor={colors.textMuted} style={[...inputStyle, { flex: 1 }]} />
                <CurrencyChips value={newIncome.currency} onChange={(c) => setNewIncome((p) => ({ ...p, currency: c }))} />
              </View>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.teal }]} onPress={addIncome}><Text style={{ color: '#04211C', fontSize: 14, fontFamily: FONT_UI_BOLD }}>{isAr ? 'إضافة' : 'Add Income'}</Text></TouchableOpacity>
            </Card>
            <View style={{ gap: 8 }}>
              {data.income.slice().reverse().map((entry) => (
                <Card key={entry.id} style={[styles.entryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View><Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>{entry.source}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{entry.date}</Text></View>
                  <Text style={{ color: colors.teal, fontSize: 14, fontFamily: FONT_UI_BOLD }}>+{entry.amount.toLocaleString()} {entry.currency}</Text>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Expenses */}
        {activeTab === 'expenses' && (
          <View style={{ gap: 14 }}>
            <Card style={{ gap: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', marginBottom: 0 }]}>{isAr ? 'إضافة مصروف' : 'Add Expense'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {data.categories.map((c) => (
                  <TouchableOpacity key={c.name} style={[styles.curChip, { backgroundColor: newExpense.category === c.name ? colors.gold : colors.bg, borderColor: colors.border }]} onPress={() => setNewExpense((p) => ({ ...p, category: c.name }))}>
                    <Text style={{ color: newExpense.category === c.name ? '#1A1200' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{c.icon} {isAr ? c.nameAr : c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput value={newExpense.description} onChangeText={(v) => setNewExpense((p) => ({ ...p, description: v }))} placeholder={isAr ? 'الوصف' : 'Description'} placeholderTextColor={colors.textMuted} style={inputStyle} />
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput value={newExpense.amount} onChangeText={(v) => setNewExpense((p) => ({ ...p, amount: v }))} keyboardType="numeric" placeholder={isAr ? 'المبلغ' : 'Amount'} placeholderTextColor={colors.textMuted} style={[...inputStyle, { flex: 1 }]} />
                <CurrencyChips value={newExpense.currency} onChange={(c) => setNewExpense((p) => ({ ...p, currency: c }))} />
              </View>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.red }]} onPress={addExpense}><Text style={{ color: '#fff', fontSize: 14, fontFamily: FONT_UI_BOLD }}>{isAr ? 'إضافة مصروف' : 'Add Expense'}</Text></TouchableOpacity>
            </Card>
            <View style={{ gap: 8 }}>
              {data.expenses.slice().reverse().map((entry) => (
                <Card key={entry.id} style={[styles.entryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View><Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>{entry.description}</Text><Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{entry.category} • {entry.date}</Text></View>
                  <Text style={{ color: colors.red, fontSize: 14, fontFamily: FONT_UI_BOLD }}>-{entry.amount.toLocaleString()} {entry.currency}</Text>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  tabRow: { gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  summaryRow: { gap: 8, marginBottom: 14 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  sLabel: { fontSize: 10, fontFamily: FONT_UI, textAlign: 'center' },
  sVal: { fontSize: 15, fontFamily: FONT_UI_BOLD, marginTop: 3 },


  memberRow: { justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, fontFamily: FONT_UI },
  addBtn: { width: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  curChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  submitBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 2 },
  entryRow: { justifyContent: 'space-between', alignItems: 'center' },
});
