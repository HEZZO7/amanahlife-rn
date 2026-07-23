/**
 * Bill Reminders — migrated from app/frontend/src/pages/BillReminders.tsx
 * Add/edit bills with due date, frequency, category. Upcoming list sorted by
 * due date with overdue/due-soon badges, collapsible payment history.
 * localStorage('amanah-bills') → AsyncStorage, per-user scoped.
 */
import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Pressable, Animated,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usePersistedState } from '../../src/lib/usePersistedState';
import { useNavBarHeight } from '../../src/contexts/NavBarHeightContext';
import { useBackToClose } from '../../src/lib/useBackToClose';
import { useSheetAnimation } from '../../src/lib/useSheetAnimation';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  category: string;
  isPaid: boolean;
  paidDate?: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'utilities', en: 'Utilities', ar: 'مرافق', icon: '💡' },
  { value: 'rent', en: 'Rent', ar: 'إيجار', icon: '🏠' },
  { value: 'insurance', en: 'Insurance', ar: 'تأمين', icon: '🛡️' },
  { value: 'subscription', en: 'Subscriptions', ar: 'اشتراكات', icon: '📱' },
  { value: 'phone', en: 'Phone', ar: 'هاتف', icon: '📞' },
  { value: 'internet', en: 'Internet', ar: 'إنترنت', icon: '🌐' },
  { value: 'other', en: 'Other', ar: 'أخرى', icon: '📋' },
];

function categoryIcon(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.icon || '📋';
}

export default function BillReminders() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const tr = (en: string, ar: string) => (isAr ? ar : en);
  const userId = user?.id ?? null;

  const [bills, setBills] = usePersistedState<Bill[]>('amanah-bills', userId, []);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const navBarHeight = useNavBarHeight();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<Bill['frequency']>('monthly');
  const [category, setCategory] = useState('utilities');

  const resetForm = () => {
    setName(''); setAmount(''); setDueDate(''); setFrequency('monthly'); setCategory('utilities');
  };
  useBackToClose(showForm, () => { resetForm(); setShowForm(false); });
  const sheetAnim = useSheetAnimation(showForm);

  const handleAdd = () => {
    if (!name.trim() || !amount || !dueDate) return;
    const newBill: Bill = {
      id: Date.now().toString(),
      name: name.trim(),
      amount: Number(amount),
      dueDate,
      frequency,
      category,
      isPaid: false,
      createdAt: new Date().toISOString(),
    };
    setBills((prev) => [...prev, newBill]);
    resetForm();
    setShowForm(false);
  };

  const markPaid = (id: string) => {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, isPaid: true, paidDate: new Date().toISOString() } : b)));
  };

  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
  };

  const getDaysUntilDue = (dateStr: string) => {
    const due = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const upcomingBills = useMemo(
    () => bills.filter((b) => !b.isPaid).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [bills]
  );
  const paidBills = useMemo(
    () => bills.filter((b) => b.isPaid).sort((a, b) => new Date(b.paidDate || b.dueDate).getTime() - new Date(a.paidDate || a.dueDate).getTime()),
    [bills]
  );
  const monthlyTotal = useMemo(() => upcomingBills.reduce((sum, b) => sum + b.amount, 0), [upcomingBills]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        icon="🔔"
        title={tr('Bill Reminders', 'تذكير الفواتير')}
        right={
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.teal }]} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ {tr('Bill', 'فاتورة')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Monthly Total */}
        <Card style={[styles.totalCard, { backgroundColor: colors.teal + '15', borderColor: colors.teal + '30' }]}>
          <View style={[styles.totalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{tr('Total Upcoming Bills', 'إجمالي الفواتير القادمة')}</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{monthlyTotal.toLocaleString()}</Text>
            </View>
            <Text style={{ fontSize: 30 }}>💳</Text>
          </View>
          <Text style={[styles.totalSub, { color: colors.textSecondary }]}>
            {upcomingBills.length} {tr('bills pending', 'فاتورة معلقة')}
          </Text>
        </Card>

        {/* Upcoming Bills */}
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
          📋 {tr('Upcoming Bills', 'الفواتير القادمة')}
        </Text>
        <View style={{ gap: 8 }}>
          {upcomingBills.map((bill) => {
            const daysLeft = getDaysUntilDue(bill.dueDate);
            const isDueSoon = daysLeft <= 3 && daysLeft >= 0;
            const isOverdue = daysLeft < 0;
            return (
              <Card
                key={bill.id}
                style={[isDueSoon && { borderColor: colors.gold + '80' }, isOverdue && { borderColor: colors.red + '80' }]}
              >
                <View style={[styles.billRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.billLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: 22 }}>{categoryIcon(bill.category)}</Text>
                    <View>
                      <Text style={[styles.billName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{bill.name}</Text>
                      <Text style={[styles.billSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {bill.dueDate} • {tr(
                          bill.frequency.charAt(0).toUpperCase() + bill.frequency.slice(1),
                          bill.frequency === 'monthly' ? 'شهري' : bill.frequency === 'weekly' ? 'أسبوعي' : 'سنوي'
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={[styles.billAmount, { color: colors.text }]}>{bill.amount.toLocaleString()}</Text>
                    {isDueSoon && (
                      <View style={[styles.badge, { backgroundColor: colors.gold + '25' }]}>
                        <Text style={{ color: colors.gold, fontSize: 10, fontFamily: FONT_UI_MEDIUM }}>
                          {tr(`${daysLeft}d left`, `${daysLeft} أيام`)}
                        </Text>
                      </View>
                    )}
                    {isOverdue && (
                      <View style={[styles.badge, { backgroundColor: colors.red + '25' }]}>
                        <Text style={{ color: colors.red, fontSize: 10, fontFamily: FONT_UI_MEDIUM }}>{tr('Overdue', 'متأخر')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.billActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => markPaid(bill.id)}>
                    <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>✓ {tr('Mark Paid', 'تم الدفع')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => deleteBill(bill.id)}>
                    <Text style={{ color: colors.red, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{tr('Delete', 'حذف')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
          {upcomingBills.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <Text style={{ fontSize: 34, marginBottom: 8 }}>🎉</Text>
              <Text style={{ color: colors.textSecondary, fontFamily: FONT_UI }}>{tr('No pending bills', 'لا توجد فواتير معلقة')}</Text>
            </View>
          )}
        </View>

        {/* Payment History */}
        <TouchableOpacity
          style={[styles.historyToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowHistory((h) => !h)}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📜 {tr('Payment History', 'سجل المدفوعات')} ({paidBills.length})</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{showHistory ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showHistory && (
          <View style={{ gap: 8 }}>
            {paidBills.map((bill) => (
              <Card key={bill.id} style={{ opacity: 0.75 }}>
                <View style={[styles.billRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.billLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text>{categoryIcon(bill.category)}</Text>
                    <View>
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>{bill.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
                        {tr('Paid', 'تم الدفع')}: {bill.paidDate ? new Date(bill.paidDate).toLocaleDateString() : '-'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{bill.amount.toLocaleString()} ✓</Text>
                </View>
              </Card>
            ))}
            {paidBills.length === 0 && (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontFamily: FONT_UI, paddingVertical: 12 }}>
                {tr('No payment history yet', 'لا يوجد سجل بعد')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Bill sheet — plain positioned View, not <Modal> (see finance.tsx
          for why): stops above the measured nav height instead of blocking
          it. */}
      {showForm && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={[styles.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: navBarHeight }]} onPress={() => setShowForm(false)}>
          <Animated.View style={{ opacity: sheetAnim.opacity, transform: [{ translateY: sheetAnim.translateY }] }}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Add New Bill', 'إضافة فاتورة جديدة')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={tr('Bill name', 'اسم الفاتورة')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={tr('Amount', 'المبلغ')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
              {(['weekly', 'monthly', 'yearly'] as Bill['frequency'][]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, { backgroundColor: frequency === f ? colors.teal : colors.bg, borderColor: colors.border }]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={{ color: frequency === f ? '#04211C' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>
                    {tr(f.charAt(0).toUpperCase() + f.slice(1), f === 'monthly' ? 'شهري' : f === 'weekly' ? 'أسبوعي' : 'سنوي')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.chip, { backgroundColor: category === c.value ? colors.teal : colors.bg, borderColor: colors.border }]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={{ color: category === c.value ? '#04211C' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>
                    {c.icon} {isAr ? c.ar : c.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => { resetForm(); setShowForm(false); }}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.teal }]} onPress={handleAdd}>
                <Text style={[styles.modalBtnText, { color: '#04211C' }]}>{tr('Add Bill', 'إضافة')}</Text>
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
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: '#04211C', fontSize: 12, fontFamily: FONT_UI_BOLD },
  totalCard: { borderWidth: 1 },
  totalRow: { alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 11, fontFamily: FONT_UI },
  totalValue: { fontSize: 24, fontFamily: FONT_UI_BOLD, marginTop: 2 },
  totalSub: { fontSize: 11, fontFamily: FONT_UI, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  billRow: { alignItems: 'center', justifyContent: 'space-between' },
  billLeft: { alignItems: 'center', gap: 10, flexShrink: 1 },
  billName: { fontSize: 14, fontFamily: FONT_UI_MEDIUM },
  billSub: { fontSize: 10.5, fontFamily: FONT_UI, marginTop: 2 },
  billAmount: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  billActions: { gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  historyToggle: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 17, fontFamily: FONT_UI_BOLD },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: FONT_UI },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
});
