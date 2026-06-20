/**
 * Goals — migrated from app/frontend/src/pages/Goals.tsx
 * localStorage('amanah-goals') → AsyncStorage. Category/status filters, inline
 * add form, gradient progress bars, quick-set progress buttons, linked-task
 * count (from 'amanah-tasks'). Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface Goal {
  id: string;
  title: string;
  category: 'Personal' | 'Financial' | 'Spiritual' | 'Family';
  targetDate: string;
  progress: number;
  status: 'Active' | 'Completed' | 'Paused';
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Personal: '👤', Financial: '💰', Spiritual: '🕌', Family: '👨‍👩‍👧‍👦',
};
const CAT_LABELS: Record<string, { en: string; ar: string }> = {
  All: { en: 'All', ar: 'الكل' },
  Personal: { en: 'Personal', ar: 'شخصي' },
  Financial: { en: 'Financial', ar: 'مالي' },
  Spiritual: { en: 'Spiritual', ar: 'روحي' },
  Family: { en: 'Family', ar: 'عائلي' },
};
const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  All: { en: 'All', ar: 'الكل' },
  Active: { en: 'Active', ar: 'نشط' },
  Completed: { en: 'Completed', ar: 'مكتمل' },
  Paused: { en: 'Paused', ar: 'متوقف' },
};

export default function Goals() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const L = (m: { en: string; ar: string }) => (language === 'ar' ? m.ar : m.en);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasksRaw, setTasksRaw] = useState<{ title?: string; category?: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [newGoal, setNewGoal] = useState({ title: '', category: 'Personal' as Goal['category'], targetDate: '', progress: 0 });

  useEffect(() => {
    AsyncStorage.getItem('amanah-goals').then((s) => { if (s) setGoals(JSON.parse(s)); });
    AsyncStorage.getItem('amanah-tasks').then((s) => { if (s) { try { setTasksRaw(JSON.parse(s)); } catch {} } });
  }, []);
  useEffect(() => { AsyncStorage.setItem('amanah-goals', JSON.stringify(goals)); }, [goals]);

  const addGoal = () => {
    if (!newGoal.title.trim()) return;
    setGoals([{
      id: Date.now().toString(),
      title: newGoal.title,
      category: newGoal.category,
      targetDate: newGoal.targetDate,
      progress: newGoal.progress,
      status: 'Active',
      createdAt: new Date().toISOString(),
    }, ...goals]);
    setNewGoal({ title: '', category: 'Personal', targetDate: '', progress: 0 });
    setShowForm(false);
  };
  const updateProgress = (id: string, progress: number) =>
    setGoals(goals.map((g) => g.id === id ? { ...g, progress: Math.min(100, progress), status: progress >= 100 ? 'Completed' : g.status } : g));
  const toggleStatus = (id: string) =>
    setGoals(goals.map((g) => g.id === id ? { ...g, status: g.status === 'Active' ? 'Paused' : g.status === 'Paused' ? 'Active' : g.status } : g));
  const deleteGoal = (id: string) => setGoals(goals.filter((g) => g.id !== id));

  const getLinkedTasksCount = (goalTitle: string) =>
    tasksRaw.filter((t) =>
      t.title?.toLowerCase().includes(goalTitle.toLowerCase()) ||
      t.category?.toLowerCase().includes(goalTitle.toLowerCase())
    ).length;

  const filteredGoals = goals.filter((g) =>
    (filterCategory === 'All' || g.category === filterCategory) &&
    (filterStatus === 'All' || g.status === filterStatus)
  );

  const statusStyle = (status: Goal['status']) =>
    status === 'Active' ? { bg: colors.teal + '33', fg: colors.teal }
      : status === 'Completed' ? { bg: colors.gold + '33', fg: colors.gold }
      : { bg: colors.textMuted + '33', fg: colors.textSecondary };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        icon="🎯"
        title={tr('Goals', 'الأهداف')}
        right={
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.teal }]} onPress={() => setShowForm((s) => !s)}>
            <Text style={styles.addBtnText}>+ {tr('Add', 'إضافة')}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Inline add form */}
        {showForm && (
          <Card style={{ marginBottom: 16, gap: 12 }}>
            <TextInput
              value={newGoal.title}
              onChangeText={(v) => setNewGoal({ ...newGoal, title: v })}
              placeholder={tr('Title', 'العنوان')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <View style={styles.chipRow}>
              {(['Personal', 'Financial', 'Spiritual', 'Family'] as Goal['category'][]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: newGoal.category === c ? colors.teal : colors.bg, borderColor: colors.border }]}
                  onPress={() => setNewGoal({ ...newGoal, category: c })}
                >
                  <Text style={[styles.chipText, { color: newGoal.category === c ? '#04211C' : colors.textSecondary }]}>
                    {CATEGORY_ICONS[c]} {L(CAT_LABELS[c])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={newGoal.targetDate}
              onChangeText={(v) => setNewGoal({ ...newGoal, targetDate: v })}
              placeholder={tr('Target date (YYYY-MM-DD)', 'تاريخ الهدف')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.teal }]} onPress={addGoal}>
                <Text style={[styles.formBtnText, { color: '#04211C' }]}>{tr('Save', 'حفظ')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, { backgroundColor: colors.surface }]} onPress={() => setShowForm(false)}>
                <Text style={[styles.formBtnText, { color: colors.textSecondary }]}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Category filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['All', 'Personal', 'Financial', 'Spiritual', 'Family'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, { backgroundColor: filterCategory === cat ? colors.teal : colors.card, borderColor: colors.border }]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[styles.filterText, { color: filterCategory === cat ? '#04211C' : colors.textSecondary }]}>{L(CAT_LABELS[cat])}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status filters */}
        <View style={[styles.filterRow, { marginBottom: 14 }]}>
          {['All', 'Active', 'Completed', 'Paused'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, { backgroundColor: filterStatus === st ? colors.gold : colors.card, borderColor: colors.border }]}
              onPress={() => setFilterStatus(st)}
            >
              <Text style={[styles.filterText, { color: filterStatus === st ? '#1A1200' : colors.textSecondary }]}>{L(STATUS_LABELS[st])}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goals list */}
        {filteredGoals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🎯</Text>
            <Text style={{ color: colors.textSecondary, fontFamily: FONT_UI, textAlign: 'center' }}>
              {tr('No goals yet. Add your first goal!', 'لا توجد أهداف بعد. أضف هدفك الأول!')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredGoals.map((goal) => {
              const ss = statusStyle(goal.status);
              return (
                <Card key={goal.id}>
                  <View style={[styles.goalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.goalTitleWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[goal.category]}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{goal.title}</Text>
                        <Text style={[styles.goalSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                          {L(CAT_LABELS[goal.category])} • {goal.targetDate || tr('No deadline', 'بدون موعد')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity onPress={() => toggleStatus(goal.id)} style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                        <Text style={{ color: ss.fg, fontSize: 10, fontFamily: FONT_UI_BOLD }}>{L(STATUS_LABELS[goal.status])}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteGoal(goal.id)} hitSlop={6}>
                        <Text style={{ color: colors.red, fontSize: 13 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress */}
                  <View style={{ marginTop: 10 }}>
                    <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.smallMuted, { color: colors.textSecondary }]}>{tr('Progress', 'التقدم')}</Text>
                      <Text style={{ color: colors.gold, fontSize: 12, fontFamily: FONT_UI_BOLD }}>{goal.progress}%</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.bg }]}>
                      <LinearGradient
                        colors={['#1FC7C1', '#D4A017']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ width: `${goal.progress}%`, height: 8, borderRadius: 4 }}
                      />
                    </View>
                  </View>

                  {/* Quick-set + linked tasks */}
                  <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {[10, 25, 50, 75, 100].map((val) => (
                        <TouchableOpacity
                          key={val}
                          style={[styles.pctBtn, { backgroundColor: goal.progress >= val ? colors.teal + '4D' : colors.bg }]}
                          onPress={() => updateProgress(goal.id, val)}
                        >
                          <Text style={{ color: goal.progress >= val ? colors.teal : colors.textSecondary, fontSize: 10, fontFamily: FONT_UI_MEDIUM }}>{val}%</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={[styles.smallMuted, { color: colors.textSecondary }]}>
                      {tr('Linked', 'مرتبط')}: {getLinkedTasksCount(goal.title)}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: FONT_UI },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: FONT_UI_MEDIUM },
  formBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  formBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: FONT_UI_MEDIUM },
  empty: { alignItems: 'center', paddingVertical: 48 },
  goalHeader: { justifyContent: 'space-between', alignItems: 'flex-start' },
  goalTitleWrap: { alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  goalTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  goalSub: { fontSize: 11, fontFamily: FONT_UI, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  smallMuted: { fontSize: 11, fontFamily: FONT_UI },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 5 },
  pctBtn: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
});
