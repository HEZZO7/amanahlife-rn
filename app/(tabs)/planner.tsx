/**
 * Planner — migrated from app/frontend/src/pages/Planner.tsx
 * Agenda / Weekly / Monthly views. Tasks ('amanah-tasks') + agenda
 * ('amanah-agenda') from AsyncStorage. Hijri date in header, FAB + add-event
 * modal. HTML date/time inputs → plain text inputs (YYYY-MM-DD / HH:MM).
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface AgendaItem { id: string; title: string; date: string; time: string; description: string; }
interface Task { id: string; title: string; category: string; priority: string; completed: boolean; date?: string; }
type ViewMode = 'agenda' | 'weekly' | 'monthly';

export default function Planner() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const locale = language === 'ar' ? 'ar' : 'en';

  const [view, setView] = useState<ViewMode>('agenda');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [hijriDate, setHijriDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', date: '', time: '', description: '' });

  useEffect(() => {
    AsyncStorage.getItem('amanah-tasks').then((s) => { if (s) setTasks(JSON.parse(s)); });
    AsyncStorage.getItem('amanah-agenda').then((s) => { if (s) setAgendaItems(JSON.parse(s)); });
  }, []);

  useEffect(() => { AsyncStorage.setItem('amanah-agenda', JSON.stringify(agendaItems)); }, [agendaItems]);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
        const res = await fetch(`https://api.aladhan.com/v1/gToH/${dateStr}`);
        const data = await res.json();
        const h = data.data.hijri;
        setHijriDate(language === 'ar' ? `${h.day} ${h.month.ar} ${h.year} هـ` : `${h.day} ${h.month.en} ${h.year} AH`);
      } catch {}
    })();
  }, [language]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter((task) => (task.date ? task.date === todayStr : true));
  const todayAgenda = agendaItems.filter((item) => item.date === todayStr);
  const hasItems = todayTasks.length > 0 || todayAgenda.length > 0;

  const addAgendaItem = () => {
    if (!newItem.title.trim()) return;
    setAgendaItems((prev) => [...prev, {
      id: Date.now().toString(),
      title: newItem.title.trim(),
      date: newItem.date || todayStr,
      time: newItem.time || '',
      description: newItem.description.trim(),
    }]);
    setNewItem({ title: '', date: '', time: '', description: '' });
    setShowAddForm(false);
  };
  const removeAgendaItem = (id: string) => setAgendaItems((prev) => prev.filter((i) => i.id !== id));

  const getWeekDays = () => {
    const days: Date[] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
    return days;
  };
  const getMonthDays = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };
  const getTaskCountForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter((t) => t.date === dateStr).length + agendaItems.filter((a) => a.date === dateStr).length;
  };

  const priorityColor = (task: Task) =>
    task.completed ? colors.teal : task.priority === 'high' ? colors.red : task.priority === 'medium' ? colors.gold : colors.textMuted;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        icon="📋"
        title={tr('Planner', 'المخطط')}
        right={hijriDate ? <Text style={{ color: colors.gold, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{hijriDate}</Text> : undefined}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* View tabs — RTL reverses order */}
        <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(['agenda', 'weekly', 'monthly'] as ViewMode[]).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.tab, view === v && { backgroundColor: colors.teal }]}
              onPress={() => setView(v)}
            >
              <Text style={[styles.tabText, { color: view === v ? '#04211C' : colors.textSecondary }]}>
                {v === 'agenda' ? tr('Agenda', 'الجدول') : v === 'weekly' ? tr('Weekly', 'أسبوعي') : tr('Monthly', 'شهري')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Agenda */}
        {view === 'agenda' && (
          <View>
            <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 12 }]}>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                {tr('Today', 'اليوم')} — {new Date().toLocaleDateString()}
              </Text>
              <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>
                {todayTasks.length + todayAgenda.length} {tr('tasks', 'مهام')}
              </Text>
            </View>

            {!hasItems ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyCircle, { backgroundColor: colors.teal + '1A' }]}>
                  <Text style={{ fontSize: 34 }}>🗓️</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {tr('No agenda items today', 'لا توجد مواعيد اليوم')}
                </Text>
                <Text style={[styles.muted, { color: colors.textSecondary, textAlign: 'center' }]}>
                  {tr('Tap + to add a new event or task', 'اضغط + لإضافة موعد أو مهمة جديدة')}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {todayAgenda.map((item) => (
                  <Card key={item.id} padded={false} style={[styles.itemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.dot, { backgroundColor: colors.gold }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {item.time ? `${item.time} • ` : ''}{item.description || tr('Event', 'موعد')}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeAgendaItem(item.id)} hitSlop={8}>
                      <Text style={{ color: colors.textSecondary }}>✕</Text>
                    </TouchableOpacity>
                  </Card>
                ))}
                {todayTasks.map((task) => (
                  <Card key={task.id} padded={false} style={[styles.itemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.dot, { backgroundColor: priorityColor(task) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, {
                        color: task.completed ? colors.textSecondary : colors.text,
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                        textAlign: isRTL ? 'right' : 'left',
                      }]}>{task.title}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {task.category} • {task.priority}
                      </Text>
                    </View>
                    {task.completed && <Text style={{ color: colors.teal }}>✓</Text>}
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Weekly */}
        {view === 'weekly' && (
          <View style={{ gap: 8 }}>
            {getWeekDays().map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const count = getTaskCountForDate(day);
              return (
                <View
                  key={i}
                  style={[styles.weekRow, {
                    backgroundColor: isToday ? colors.teal + '1A' : colors.card,
                    borderColor: isToday ? colors.teal : colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <View style={[styles.weekLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.weekDateBox, { backgroundColor: isToday ? colors.teal : colors.bg }]}>
                      <Text style={[styles.weekDow, { color: isToday ? '#04211C' : colors.textSecondary }]}>
                        {day.toLocaleDateString(locale, { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.weekNum, { color: isToday ? '#04211C' : colors.text }]}>{day.getDate()}</Text>
                    </View>
                    <Text style={{ color: isToday ? colors.text : colors.textSecondary, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>
                      {isToday ? tr('Today', 'اليوم') : day.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  {count > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                      <Text style={styles.badgeText}>{count}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Monthly */}
        {view === 'monthly' && (
          <View>
            <Text style={[styles.monthTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </Text>
            {!!hijriDate && <Text style={[styles.monthHijri, { color: colors.gold, textAlign: isRTL ? 'right' : 'left' }]}>{hijriDate}</Text>}
            {/* Full Arabic day names, RTL grid when AR */}
            <View style={[styles.monthGrid, { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' }]}>
              {(isRTL
                ? ['السبت', 'الجمعة', 'الخميس', 'الأربعاء', 'الثلاثاء', 'الاثنين', 'الأحد']
                : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
              ).map((d, idx) => (
                <View key={idx} style={styles.monthCell}>
                  <Text style={[styles.monthDow, { color: colors.textSecondary }]}>{d}</Text>
                </View>
              ))}
              {getMonthDays().map((day, i) => {
                if (day === null) return <View key={i} style={styles.monthCell} />;
                const isToday = day === new Date().getDate();
                const dateObj = new Date(new Date().getFullYear(), new Date().getMonth(), day);
                const hasTask = getTaskCountForDate(dateObj) > 0;
                return (
                  <View key={i} style={styles.monthCell}>
                    <View style={[styles.monthDay, isToday && { backgroundColor: colors.teal }]}>
                      <Text style={{ color: isToday ? '#04211C' : colors.textSecondary, fontSize: 13, fontFamily: isToday ? FONT_UI_BOLD : FONT_UI }}>
                        {day}
                      </Text>
                      {hasTask && <View style={[styles.taskDot, { backgroundColor: colors.gold }]} />}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.teal }]} onPress={() => setShowAddForm(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add event modal */}
      <Modal visible={showAddForm} transparent animationType="fade" onRequestClose={() => setShowAddForm(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAddForm(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Add New Event', 'إضافة موعد جديد')}</Text>
            <TextInput
              value={newItem.title}
              onChangeText={(v) => setNewItem((p) => ({ ...p, title: v }))}
              placeholder={tr('Title', 'العنوان')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
              <TextInput
                value={newItem.date}
                onChangeText={(v) => setNewItem((p) => ({ ...p, date: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { flex: 1, backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              />
              <TextInput
                value={newItem.time}
                onChangeText={(v) => setNewItem((p) => ({ ...p, time: v }))}
                placeholder="HH:MM"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { flex: 1, backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
              />
            </View>
            <TextInput
              value={newItem.description}
              onChangeText={(v) => setNewItem((p) => ({ ...p, description: v }))}
              placeholder={tr('Description (optional)', 'الوصف (اختياري)')}
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, { minHeight: 64, backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left', textAlignVertical: 'top' }]}
            />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setShowAddForm(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>{tr('Cancel', 'إلغاء')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.teal }]} onPress={addAgendaItem}>
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
  content: { padding: 16, paddingBottom: 90 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: FONT_UI_MEDIUM },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontSize: 13, fontFamily: FONT_UI },
  emptyWrap: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  itemRow: { alignItems: 'center', gap: 12, padding: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  itemTitle: { fontSize: 14, fontFamily: FONT_UI_MEDIUM },
  itemSub: { fontSize: 10.5, fontFamily: FONT_UI, marginTop: 2 },
  weekRow: { alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, borderWidth: 1 },
  weekLeft: { alignItems: 'center', gap: 12 },
  weekDateBox: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  weekDow: { fontSize: 10, fontFamily: FONT_UI },
  weekNum: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  badge: { paddingHorizontal: 9, paddingVertical: 2, borderRadius: 12, minWidth: 22, alignItems: 'center' },
  badgeText: { color: '#1A1200', fontSize: 12, fontFamily: FONT_UI_BOLD },
  monthTitle: { textAlign: 'center', fontSize: 15, fontFamily: FONT_UI_BOLD, marginBottom: 4 },
  monthHijri: { textAlign: 'center', fontSize: 11, fontFamily: FONT_UI_MEDIUM, marginBottom: 12 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  monthDow: { fontSize: 10, fontFamily: FONT_UI },
  monthDay: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taskDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: '#04211C', fontSize: 30, fontFamily: FONT_UI_BOLD, marginTop: -2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 17, fontFamily: FONT_UI_BOLD },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: FONT_UI },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
});
