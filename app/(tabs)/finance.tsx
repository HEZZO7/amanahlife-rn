/**
 * Finance — migrated from app/frontend/src/pages/Finance.tsx
 * localStorage('amanah_finance') → AsyncStorage. Monthly income/expense/savings
 * rate, transaction list, FAB + add-transaction modal. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Pressable, Animated,
} from 'react-native';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useNavBarHeight } from '../../src/contexts/NavBarHeightContext';
import { useBackToClose } from '../../src/lib/useBackToClose';
import { useSheetAnimation } from '../../src/lib/useSheetAnimation';
import { PageHeader, Card, ProgressBar } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

type TransactionType = 'income' | 'expense';
type IncomeCategory = 'salary' | 'freelance' | 'investment' | 'gift' | 'other';
type ExpenseCategory = 'housing' | 'food' | 'transport' | 'education' | 'healthcare' | 'charity' | 'entertainment' | 'utilities' | 'other';
type Category = IncomeCategory | ExpenseCategory;

interface Transaction {
  id: string;
  type: TransactionType;
  category: Category;
  amount: number;
  description: string;
  date: string;
}

const INCOME_CATEGORIES: IncomeCategory[] = ['salary', 'freelance', 'investment', 'gift', 'other'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['housing', 'food', 'transport', 'education', 'healthcare', 'charity', 'entertainment', 'utilities', 'other'];

const CATEGORY_ICONS: Record<Category, string> = {
  salary: '💰', freelance: '💻', investment: '📈', gift: '🎁', other: '📦',
  housing: '🏠', food: '🍽️', transport: '🚗', education: '📚', healthcare: '🏥', charity: '🤲', entertainment: '🎮', utilities: '💡',
};
const CATEGORY_LABELS: Record<Category, { ar: string; en: string }> = {
  salary: { ar: 'راتب', en: 'Salary' },
  freelance: { ar: 'عمل حر', en: 'Freelance' },
  investment: { ar: 'استثمار', en: 'Investment' },
  gift: { ar: 'هدية', en: 'Gift' },
  other: { ar: 'أخرى', en: 'Other' },
  housing: { ar: 'السكن', en: 'Housing' },
  food: { ar: 'الطعام', en: 'Food' },
  transport: { ar: 'المواصلات', en: 'Transport' },
  education: { ar: 'التعليم', en: 'Education' },
  healthcare: { ar: 'الصحة', en: 'Healthcare' },
  charity: { ar: 'الصدقة', en: 'Charity' },
  entertainment: { ar: 'الترفيه', en: 'Entertainment' },
  utilities: { ar: 'المرافق', en: 'Utilities' },
};

export default function Finance() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const userId = user?.id ?? null;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<Category>('salary');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const categoryOptions = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    migrateLegacyKeyIfNeeded('amanah_finance', userId).then(() => {
      getUserItem('amanah_finance', userId).then((stored) => {
        if (stored) setTransactions(JSON.parse(stored));
      });
    });
  }, [userId]);

  const saveTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    setUserItem('amanah_finance', userId, JSON.stringify(updated));
  };

  const resetForm = () => {
    setEditingId(null);
    setType('income');
    setCategory('salary');
    setAmount('');
    setDescription('');
    setShowForm(false);
  };

  const navBarHeight = useNavBarHeight();
  useBackToClose(showForm, resetForm);
  const sheetAnim = useSheetAnimation(showForm);

  const submitTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    if (editingId) {
      saveTransactions(
        transactions.map((tx) =>
          tx.id === editingId
            ? { ...tx, type, category, amount: parseFloat(amount), description: description.trim() || CATEGORY_LABELS[category][language === 'ar' ? 'ar' : 'en'] }
            : tx
        )
      );
    } else {
      const newTx: Transaction = {
        id: Date.now().toString(),
        type,
        category,
        amount: parseFloat(amount),
        description: description.trim() || CATEGORY_LABELS[category][language === 'ar' ? 'ar' : 'en'],
        date: new Date().toISOString(),
      };
      saveTransactions([newTx, ...transactions]);
    }
    resetForm();
  };

  const openEditForm = (tx: Transaction) => {
    setEditingId(tx.id);
    setType(tx.type);
    setCategory(tx.category);
    setAmount(String(tx.amount));
    setDescription(tx.description);
    setShowForm(true);
  };

  const deleteTransaction = (id: string) => saveTransactions(transactions.filter((tx) => tx.id !== id));

  const now = new Date();
  const monthTransactions = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0;

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="💰" title={tr('Finance', 'المالية')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{tr('Income', 'الدخل')}</Text>
            <Text style={[styles.summaryValue, { color: colors.teal }]}>{fmt(monthlyIncome)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{tr('Expense', 'المصروفات')}</Text>
            <Text style={[styles.summaryValue, { color: colors.red }]}>{fmt(monthlyExpense)}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{tr('Savings', 'الادخار')}</Text>
            <Text style={[styles.summaryValue, { color: colors.gold }]}>{savingsRate}%</Text>
          </Card>
        </View>

        {/* Savings rate bar */}
        <Card style={{ marginBottom: 14 }}>
          <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{tr('Savings Rate', 'معدل الادخار')}</Text>
            <Text style={[styles.bodyText, { color: colors.gold, fontFamily: FONT_UI_BOLD }]}>{savingsRate}%</Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <ProgressBar value={savingsRate} color={colors.gold} height={12} />
          </View>
        </Card>

        {/* Transactions */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {tr('Transactions', 'المعاملات')}
          </Text>
          {transactions.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {tr('No transactions yet', 'لا توجد معاملات بعد')}
            </Text>
          ) : (
            <View style={{ gap: 8, marginTop: 8 }}>
              {transactions.slice(0, 20).map((tx) => (
                <View
                  key={tx.id}
                  style={[styles.txRow, { backgroundColor: colors.bg, flexDirection: 'row' }]}
                >
                  <TouchableOpacity
                    style={[styles.txLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => openEditForm(tx)}
                  >
                    <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[tx.category]}</Text>
                    <View>
                      <Text style={[styles.txDesc, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tx.description}</Text>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={[styles.txRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.teal : colors.red }]}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </Text>
                    <TouchableOpacity onPress={() => deleteTransaction(tx.id)} hitSlop={8}>
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.teal }]}
        onPress={() => setShowForm(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit transaction sheet — plain positioned View, not <Modal>: RN's
          Modal opens a native window that blocks touches to whatever's
          behind it everywhere within its bounds (even fully transparent
          areas), so it always covers the nav bar regardless of content
          size. Stopping this overlay above the measured nav height instead
          lets the nav stay visible and tappable, matching the web fix. */}
      {showForm && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={[styles.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: navBarHeight }]} onPress={resetForm}>
          <Animated.View style={{ opacity: sheetAnim.opacity, transform: [{ translateY: sheetAnim.translateY }] }}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingId ? tr('Edit Transaction', 'تعديل المعاملة') : tr('Add Transaction', 'إضافة معاملة')}
            </Text>

            {/* Type toggle */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, { backgroundColor: type === 'income' ? colors.teal : colors.surface }]}
                onPress={() => { setType('income'); setCategory('salary'); }}
              >
                <Text style={[styles.typeText, { color: type === 'income' ? '#04211C' : colors.textSecondary }]}>{tr('Income', 'الدخل')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, { backgroundColor: type === 'expense' ? colors.red : colors.surface }]}
                onPress={() => { setType('expense'); setCategory('housing'); }}
              >
                <Text style={[styles.typeText, { color: type === 'expense' ? '#fff' : colors.textSecondary }]}>{tr('Expense', 'المصروفات')}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={tr('Amount', 'المبلغ')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={tr('Description', 'الوصف')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />

            <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }]}>
              {tr('Category', 'الفئة')}
            </Text>
            <View style={styles.chipWrap}>
              {categoryOptions.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: category === c ? colors.gold : colors.surface }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, { color: category === c ? '#1A1200' : colors.textSecondary }]}>
                    {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c][language === 'ar' ? 'ar' : 'en']}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={resetForm}>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.teal }]} onPress={submitTransaction}>
                <Text style={[styles.typeText, { color: '#04211C' }]}>{editingId ? tr('Save', 'حفظ') : tr('Add', 'إضافة')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
          </Animated.View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 90 },
  summaryRow: { gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  summaryLabel: { fontSize: 10, fontFamily: FONT_UI, marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 18, fontFamily: FONT_UI_BOLD },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  bodyText: { fontSize: 13, fontFamily: FONT_UI },
  sectionTitle: { fontSize: 15, fontFamily: FONT_UI_MEDIUM, marginBottom: 4 },


  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 13, fontFamily: FONT_UI },
  txRow: { alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 12 },
  txLeft: { alignItems: 'center', gap: 8, flexShrink: 1 },
  txDesc: { fontSize: 13.5, fontFamily: FONT_UI_MEDIUM },
  txDate: { fontSize: 10, fontFamily: FONT_UI, marginTop: 1 },
  txRight: { alignItems: 'center', gap: 10 },
  txAmount: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: '#04211C', fontSize: 30, fontFamily: FONT_UI_BOLD, marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  typeText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: FONT_UI, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 12, fontFamily: FONT_UI_MEDIUM },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
});
