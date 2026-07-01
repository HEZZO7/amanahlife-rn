/**
 * Task Manager — migrated from app/frontend/src/pages/TaskManager.tsx
 * localStorage('amanah_tasks') → AsyncStorage. Week strip, category filters,
 * checkbox tasks with priority badges, FAB + add-task modal. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

type Priority = 'high' | 'medium' | 'low';
type Category = 'worship' | 'work' | 'personal' | 'health';
interface Task { id: string; title: string; priority: Priority; category: Category; completed: boolean; date: string; }

const PRIORITY_COLORS: Record<Priority, string> = { high: '#E05D4E', medium: '#D4A017', low: '#1FC7C1' };
const CATEGORY_ICONS: Record<Category, string> = { worship: '🕌', work: '💼', personal: '👤', health: '💪' };
const CAT_LABELS: Record<string, { en: string; ar: string }> = {
  all: { en: 'All', ar: 'الكل' }, worship: { en: 'Worship', ar: 'عبادة' }, work: { en: 'Work', ar: 'عمل' },
  personal: { en: 'Personal', ar: 'شخصي' }, health: { en: 'Health', ar: 'صحة' },
};
const PRIO_LABELS: Record<Priority, { en: string; ar: string }> = {
  high: { en: 'High', ar: 'عالية' }, medium: { en: 'Medium', ar: 'متوسطة' }, low: { en: 'Low', ar: 'منخفضة' },
};

export default function TaskManager() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const L = (m: { en: string; ar: string }) => (language === 'ar' ? m.ar : m.en);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('personal');
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toDateString());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + i); return d;
  });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  useEffect(() => { AsyncStorage.getItem('amanah_tasks').then((s) => { if (s) setTasks(JSON.parse(s)); }); }, []);

  const saveTasks = (updated: Task[]) => { setTasks(updated); AsyncStorage.setItem('amanah_tasks', JSON.stringify(updated)); };

  const addTask = () => {
    if (!title.trim()) return;
    saveTasks([...tasks, { id: Date.now().toString(), title: title.trim(), priority, category, completed: false, date: selectedDate }]);
    setTitle(''); setShowForm(false);
  };
  const toggleTask = (id: string) => saveTasks(tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id: string) => saveTasks(tasks.filter((t) => t.id !== id));

  const filteredTasks = tasks.filter((task) => task.date === selectedDate && (filter === 'all' || task.category === filter));
  const completedCount = filteredTasks.filter((t) => t.completed).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="✅" title={tr('Tasks', 'المهام')} />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
          {completedCount}/{filteredTasks.length} {tr('completed', 'مكتمل')}
        </Text>
      </View>

      {/* Week strip — reversed in Arabic so الأحد appears on the right */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.weekRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} style={{ flexGrow: 0 }}>
        {weekDays.map((day) => {
          const isSel = day.toDateString() === selectedDate;
          return (
            <TouchableOpacity
              key={day.toDateString()}
              style={[styles.dayBtn, { backgroundColor: isSel ? colors.teal : colors.card }]}
              onPress={() => setSelectedDate(day.toDateString())}
            >
              <Text style={{ color: isSel ? '#04211C' : colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>{(language === 'ar' ? dayNamesAr : dayNames)[day.getDay()]}</Text>
              <Text style={{ color: isSel ? '#04211C' : colors.text, fontSize: 17, fontFamily: FONT_UI_BOLD }}>{day.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={{ flexGrow: 0 }}>
        {(['all', 'worship', 'work', 'personal', 'health'] as const).map((cat) => {
          const active = filter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, { backgroundColor: active ? colors.gold : colors.card }]}
              onPress={() => setFilter(cat)}
            >
              <Text style={{ color: active ? '#1A1200' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>
                {cat === 'all' ? L(CAT_LABELS.all) : `${CATEGORY_ICONS[cat]} ${L(CAT_LABELS[cat])}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Task list */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredTasks.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 32, fontFamily: FONT_UI }}>
            {tr('No tasks for this day', 'لا توجد مهام لهذا اليوم')}
          </Text>
        ) : filteredTasks.map((task) => (
          <View
            key={task.id}
            style={[styles.taskRow, {
              backgroundColor: task.completed ? colors.teal + '0D' : colors.card,
              borderColor: task.completed ? colors.teal + '33' : colors.border,
              opacity: task.completed ? 0.7 : 1,
              flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <TouchableOpacity
              style={[styles.checkbox, { borderColor: task.completed ? colors.teal : colors.textMuted, backgroundColor: task.completed ? colors.teal : 'transparent' }]}
              onPress={() => toggleTask(task.id)}
            >
              {task.completed && <Text style={{ color: '#04211C', fontSize: 12, fontFamily: FONT_UI_BOLD }}>✓</Text>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM, textDecorationLine: task.completed ? 'line-through' : 'none', textAlign: isRTL ? 'right' : 'left' }}>{task.title}</Text>
              <View style={[styles.taskMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: 12 }}>{CATEGORY_ICONS[task.category]}</Text>
                <Text style={[styles.prioBadge, { backgroundColor: PRIORITY_COLORS[task.priority] + '33', color: PRIORITY_COLORS[task.priority] }]}>{L(PRIO_LABELS[task.priority])}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => deleteTask(task.id)} hitSlop={8}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.teal }]} onPress={() => setShowForm(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add task modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowForm(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{tr('Add Task', 'إضافة مهمة')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={tr('Title', 'العنوان')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <Text style={[styles.formLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Priority', 'الأولوية')}</Text>
            <View style={styles.chipWrap}>
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, { backgroundColor: priority === p ? PRIORITY_COLORS[p] : colors.surface }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={{ color: priority === p ? '#fff' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{L(PRIO_LABELS[p])}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.formLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Category', 'الفئة')}</Text>
            <View style={styles.chipWrap}>
              {(['worship', 'work', 'personal', 'health'] as Category[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, { backgroundColor: category === c ? colors.gold : colors.surface }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={{ color: category === c ? '#1A1200' : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{CATEGORY_ICONS[c]} {L(CAT_LABELS[c])}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowForm(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.teal }]} onPress={addTask}>
                <Text style={[styles.modalBtnText, { color: '#04211C' }]}>{tr('Add', 'إضافة')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  dayBtn: { minWidth: 52, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  filterRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  content: { padding: 16, paddingTop: 8, paddingBottom: 90, gap: 8 },
  taskRow: { alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskMeta: { alignItems: 'center', gap: 8, marginTop: 3 },
  prioBadge: { fontSize: 10, fontFamily: FONT_UI_MEDIUM, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: '#04211C', fontSize: 30, fontFamily: FONT_UI_BOLD, marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 10 },
  modalTitle: { fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: FONT_UI },
  formLabel: { fontSize: 13, fontFamily: FONT_UI, marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
});
