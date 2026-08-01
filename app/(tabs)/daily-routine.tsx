/**
 * Daily Routine — migrated from app/frontend/src/pages/DailyRoutine.tsx
 * 5 fixed routine checklists (Morning, Weekly Review, Health Day, Deep
 * Focus, Learning Session), toggle complete/incomplete, per-routine streak
 * counter that increments/decrements with each toggle. Fully local state,
 * no backend dependency - same pattern as Bill Reminders/Financial
 * Dashboard/Halal Investment/Savings Challenges ports.
 *
 * Web stores this under plain (unscoped) localStorage keys
 * (`routines_${today}`, `routine_streak_${id}`) - a shared-device account
 * bleed gap the same class of issue Phase 1's audit fixed elsewhere on web,
 * just never applied here since this screen didn't exist on RN yet. Ported
 * here using the established per-user-scoped storage convention
 * (getUserItem/setUserItem) instead of copying the unscoped pattern.
 * Streaks are consolidated into one persisted record instead of web's 5
 * separate per-routine keys - same behavior, fewer keys.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { getUserItem, setUserItem } from '../../src/lib/userStorage';
import { usePersistedState } from '../../src/lib/usePersistedState';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface RoutineDef { id: string; nameAr: string; nameEn: string; duration: number; icon: string; }
interface Routine extends RoutineDef { streak: number; completed: boolean; }

const DEFAULT_ROUTINES: RoutineDef[] = [
  { id: 'morning', nameAr: 'روتين الصباح', nameEn: 'Morning Routine', duration: 30, icon: '🌅' },
  { id: 'weekly', nameAr: 'مراجعة أسبوعية', nameEn: 'Weekly Review', duration: 45, icon: '📋' },
  { id: 'health', nameAr: 'يوم صحي', nameEn: 'Health Day', duration: 60, icon: '💪' },
  { id: 'focus', nameAr: 'تركيز عميق', nameEn: 'Deep Focus', duration: 90, icon: '🎯' },
  { id: 'learning', nameAr: 'جلسة تعلم', nameEn: 'Learning Session', duration: 45, icon: '📚' },
];

export default function DailyRoutine() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const tr = (en: string, ar: string) => (isAr ? ar : en);
  const userId = user?.id ?? null;

  const [streaks, setStreaks, streaksReady] = usePersistedState<Record<string, number>>('amanah-routine-streaks', userId, {});
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!streaksReady) return;
    const today = new Date().toDateString();
    const key = `routines_${today}`;
    getUserItem(key, userId).then((raw) => {
      if (raw) {
        try { setRoutines(JSON.parse(raw)); setLoaded(true); return; } catch {}
      }
      const initial = DEFAULT_ROUTINES.map((r) => ({ ...r, streak: streaks[r.id] ?? 0, completed: false }));
      setRoutines(initial);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaksReady, userId]);

  const toggleRoutine = (id: string) => {
    const today = new Date().toDateString();
    const updated = routines.map((r) => {
      if (r.id !== id) return r;
      const newCompleted = !r.completed;
      const newStreak = newCompleted ? r.streak + 1 : Math.max(0, r.streak - 1);
      return { ...r, completed: newCompleted, streak: newStreak };
    });
    setRoutines(updated);
    setUserItem(`routines_${today}`, userId, JSON.stringify(updated));
    const nextStreaks = { ...streaks };
    for (const r of updated) nextStreaks[r.id] = r.streak;
    setStreaks(nextStreaks);
  };

  const completedCount = routines.filter((r) => r.completed).length;
  const progress = routines.length > 0 ? (completedCount / routines.length) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🌅" title={tr('Daily Routine', 'الروتين اليومي')} />
      {loaded && (
        <>
          <View style={styles.progressWrap}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, marginBottom: 8, textAlign: isAr ? 'right' : 'left' }}>
              {completedCount}/{routines.length} {tr('completed', 'مكتمل')}
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.surface }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.gold, width: `${progress}%` }]} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {routines.map((routine) => (
              <Card
                key={routine.id}
                style={{
                  marginBottom: 12,
                  borderColor: routine.completed ? colors.teal + '4D' : colors.border,
                  backgroundColor: routine.completed ? colors.teal + '12' : colors.card,
                }}
              >
                <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.left, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: 24 }}>{routine.icon}</Text>
                    <View style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 14.5,
                          fontFamily: FONT_UI_BOLD,
                          textDecorationLine: routine.completed ? 'line-through' : 'none',
                          opacity: routine.completed ? 0.6 : 1,
                          textAlign: isAr ? 'right' : 'left',
                        }}
                      >
                        {isAr ? routine.nameAr : routine.nameEn}
                      </Text>
                      <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontFamily: FONT_UI }}>
                          {routine.duration} {tr('min', 'دقيقة')}
                        </Text>
                        <Text style={{ color: colors.gold, fontSize: 11.5, fontFamily: FONT_UI_MEDIUM }}>
                          🔥 {routine.streak} {tr('days', 'أيام')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleRoutine(routine.id)}
                    style={[
                      styles.checkBtn,
                      {
                        backgroundColor: routine.completed ? colors.teal : colors.surface,
                        borderColor: routine.completed ? colors.teal : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: routine.completed ? '#04211C' : colors.textSecondary, fontSize: 16, fontFamily: FONT_UI_BOLD }}>
                      {routine.completed ? '✓' : '○'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  progressTrack: { width: '100%', height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  content: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  row: { alignItems: 'center', justifyContent: 'space-between' },
  left: { alignItems: 'center', flex: 1 },
  metaRow: { gap: 10, marginTop: 3 },
  checkBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
