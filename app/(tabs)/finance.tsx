/**
 * Finance — migrated from app/frontend/src/pages/Finance.tsx
 * localStorage('amanah_finance') → AsyncStorage. Monthly income/expense/savings
 * rate, transaction list, FAB + add-transaction modal. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card, ProgressBar } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

type TransactionType = 'income' | 'expense';
type IncomeCategory = 'salary' | 'freelance' | 'investment' | 'gift' | 'other';

interface Transaction {
  id: string;
  type: TransactionType;
  category: IncomeCategory;
  amount: number;
  description: string;
  date: string;
}

const CATEGORY_ICONS: Record<IncomeCategory, string> = {
  salary: '💰', freelance: '💻', investment: '📈', gift: '🎁', other: '📦',
};
const CATEGORY_LABELS: Record<IncomeCategory, { ar: string; en: string }> = {
  salary: { ar: 'راتب', en: 'Salary' },
  freelance: { ar: 'عمل حر', en: 'Freelance' },
  investment: { ar: 'استثمار', en: 'Investment' },
  gift: { ar: 'هدية', en: 'Gift' },
  other: { ar: 'أخرى', en: 'Other' },
};

export default function Finance() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<TransactionType>('income');
  const [category, setCategory] = useState<IncomeCategory>('salary');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('amanah_finance').then((stored) => {
      if (stored) setTransactions(JSON.parse(stored));
    });
  }, []);

  const saveTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    AsyncStorage.setItem('amanah_finance', JSON.stringify(updated));
  };

  const addTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const newTx: Transaction = {
      id: Date.now().toString(),
      type,
      category,
      amount: parseFloat(amount),
      description: description.trim() || CATEGORY_LABELS[category][language === 'ar' ? 'ar' : 'en'],
      date: new Date().toISOString(),
    };
    saveTransactions([newTx, ...transactions]);
    setAmount('');
    setDescription('');
    setShowForm(false);
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
                  <View style={[styles.txLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[tx.category]}</Text>
                    <View>
                      <Text style={[styles.txDesc, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tx.description}</Text>
                      <Text style={[styles.txDate, { color: colors.textSecondary }]}>
                        {new Date(tx.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
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

      {/* Add transaction modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{tr('Add Transaction', 'إضافة معاملة')}</Text>

            {/* Type toggle */}
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, { backgroundColor: type === 'income' ? colors.teal : colors.surface }]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeText, { color: type === 'income' ? '#04211C' : colors.textSecondary }]}>{tr('Income', 'الدخل')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, { backgroundColor: type === 'expense' ? colors.red : colors.surface }]}
                onPress={() => setType('expense')}
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
              {(Object.keys(CATEGORY_ICONS) as IncomeCategory[]).map((c) => (
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
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowForm(false)}>
                <Text style={[styles.typeText, { color: colors.textSecondary }]}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.teal }]} onPress={addTransaction}>
                <Text style={[styles.typeText, { color: '#04211C' }]}>{tr('Add', 'إضافة')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
