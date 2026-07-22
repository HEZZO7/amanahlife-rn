/**
 * Savings Challenges — migrated from app/frontend/src/pages/SmartSavingsChallenges.tsx
 * 5 fixed challenge templates, join/leave, progress + milestone celebrations,
 * daily AI savings tip (app_11941c8fec_savings_tips Edge Function - newly
 * created this session, web's equivalent hook called a function that never
 * existed), milestone push notifications via expo-notifications (same
 * library Phase 3's prayer reminders already use).
 * localStorage('amanah-savings-challenges') → AsyncStorage, per-user scoped.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usePersistedState } from '../../src/lib/usePersistedState';
import { getUserItem, setUserItem } from '../../src/lib/userStorage';
import { requestNotificationPermission } from '../../src/lib/prayerNotifications';
import { supabase } from '../../src/lib/supabase';
import { functionUrl } from '../../src/lib/config';
import { toast } from '../../src/lib/toast';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface Challenge {
  id: string;
  titleEn: string; titleAr: string;
  descEn: string; descAr: string;
  duration: number;
  targetAmount: number;
  icon: string;
  milestones: number[];
}
interface JoinedChallenge { challengeId: string; joinedAt: string; savedAmount: number; completedMilestones: number[]; }

const STORAGE_KEY = 'amanah-savings-challenges';
const TIP_CACHE_KEY = 'amanah-daily-savings-tip';
const NOTIFICATIONS_ENABLED_KEY = 'amanah-savings-notifications-enabled';

const CHALLENGES: Challenge[] = [
  { id: '52-week', titleEn: '52-Week Challenge', titleAr: 'تحدي 52 أسبوع', descEn: 'Save incrementally each week. Week 1 = $1, Week 2 = $2... Week 52 = $52. Total: $1,378!', descAr: 'ادخر بشكل تصاعدي كل أسبوع. الأسبوع 1 = 1$، الأسبوع 2 = 2$... الأسبوع 52 = 52$. المجموع: 1,378$!', duration: 364, targetAmount: 1378, icon: '📅', milestones: [25, 50, 75, 100] },
  { id: 'no-spend', titleEn: 'No-Spend Week', titleAr: 'أسبوع بدون إنفاق', descEn: 'Challenge yourself to spend nothing on non-essentials for 7 days. Track what you save!', descAr: 'تحدَّ نفسك بعدم الإنفاق على غير الضروريات لمدة 7 أيام. تتبع ما توفره!', duration: 7, targetAmount: 200, icon: '🚫', milestones: [25, 50, 75, 100] },
  { id: 'round-up', titleEn: 'Round-Up Savings', titleAr: 'ادخار التقريب', descEn: 'Round up every purchase to the nearest dollar and save the difference. 30-day challenge!', descAr: 'قرّب كل عملية شراء لأقرب وحدة وادخر الفرق. تحدي 30 يوم!', duration: 30, targetAmount: 150, icon: '🔄', milestones: [25, 50, 75, 100] },
  { id: 'emergency-fund', titleEn: 'Emergency Fund Sprint', titleAr: 'سباق صندوق الطوارئ', descEn: 'Build a 1-month emergency fund in 90 days. Save a fixed amount daily!', descAr: 'ابنِ صندوق طوارئ لشهر واحد في 90 يوماً. ادخر مبلغاً ثابتاً يومياً!', duration: 90, targetAmount: 3000, icon: '🏃', milestones: [25, 50, 75, 100] },
  { id: 'ramadan-savings', titleEn: 'Ramadan Savings', titleAr: 'ادخار رمضان', descEn: 'Save for Ramadan expenses and charity. 30 days of intentional saving for the blessed month.', descAr: 'ادخر لمصاريف رمضان والصدقة. 30 يوماً من الادخار المقصود للشهر المبارك.', duration: 30, targetAmount: 500, icon: '🌙', milestones: [25, 50, 75, 100] },
];

const AI_TIPS_ENDPOINT = functionUrl('app_11941c8fec_savings_tips');

function getDaysRemaining(joinedAt: string, duration: number): number {
  const end = new Date(joinedAt).getTime() + duration * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function SavingsChallenges() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const tr = (en: string, ar: string) => (isAr ? ar : en);
  const userId = user?.id ?? null;

  const [joined, setJoined] = usePersistedState<JoinedChallenge[]>(STORAGE_KEY, userId, []);
  const [notificationsEnabled, setNotificationsEnabled] = usePersistedState<boolean>(NOTIFICATIONS_ENABLED_KEY, userId, false);
  const [addAmountId, setAddAmountId] = useState<string | null>(null);
  const [addValue, setAddValue] = useState('');
  const [celebrating, setCelebrating] = useState<{ title: string; milestone: number } | null>(null);
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

  const tipChallenges = useMemo(() => joined.map((j) => {
    const c = CHALLENGES.find((c) => c.id === j.challengeId);
    if (!c) return null;
    return {
      id: c.id,
      title: isAr ? c.titleAr : c.titleEn,
      targetAmount: c.targetAmount,
      savedAmount: j.savedAmount,
      daysRemaining: getDaysRemaining(j.joinedAt, c.duration),
      progress: Math.min(100, Math.round((j.savedAmount / c.targetAmount) * 100)),
    };
  }).filter(Boolean) as { id: string; title: string; targetAmount: number; savedAmount: number; daysRemaining: number; progress: number }[], [joined, isAr]);

  const fetchTip = async (force = false) => {
    if (tipChallenges.length === 0) { setDailyTip(null); return; }
    const today = new Date().toISOString().split('T')[0];
    if (!force) {
      const cached = await getUserItem(TIP_CACHE_KEY, userId);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.date === today && parsed.language === language && parsed.tip) { setDailyTip(parsed.tip); return; }
        } catch {}
      }
    }
    setTipLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(AI_TIPS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ challenges: tipChallenges, language }),
      });
      const data = await response.json();
      if (data.tip) {
        setDailyTip(data.tip);
        setUserItem(TIP_CACHE_KEY, userId, JSON.stringify({ tip: data.tip, date: today, language }));
      }
    } catch {
      // Best-effort - the tip card just stays hidden/unrefreshed on failure.
    } finally {
      setTipLoading(false);
    }
  };

  useEffect(() => { fetchTip(); }, [tipChallenges.length, language, userId]);

  const toggleNotifications = async () => {
    if (notificationsEnabled) { setNotificationsEnabled(false); return; }
    const granted = await requestNotificationPermission();
    if (!granted) { toast.error(tr('Notification permission denied', 'تم رفض إذن الإشعارات')); return; }
    setNotificationsEnabled(true);
  };

  const joinChallenge = (challengeId: string) => {
    setJoined((prev) => [...prev, { challengeId, joinedAt: new Date().toISOString(), savedAmount: 0, completedMilestones: [] }]);
  };
  const leaveChallenge = (challengeId: string) => setJoined((prev) => prev.filter((j) => j.challengeId !== challengeId));

  const addSavings = async (challengeId: string, amount: number) => {
    if (!amount || amount <= 0) { setAddAmountId(null); setAddValue(''); return; }
    const challenge = CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) return;

    let hitMilestone: number | null = null;
    setJoined((prev) => prev.map((j) => {
      if (j.challengeId !== challengeId) return j;
      const newAmount = j.savedAmount + amount;
      const progress = (newAmount / challenge.targetAmount) * 100;
      const newMilestones = [...j.completedMilestones];
      for (const m of challenge.milestones) {
        if (progress >= m && !newMilestones.includes(m)) { newMilestones.push(m); hitMilestone = m; }
      }
      return { ...j, savedAmount: newAmount, completedMilestones: newMilestones };
    }));

    if (hitMilestone !== null) {
      const title = isAr ? challenge.titleAr : challenge.titleEn;
      setCelebrating({ title, milestone: hitMilestone });
      setTimeout(() => setCelebrating(null), 3000);
      if (notificationsEnabled) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: isAr ? '🎉 مبروك!' : '🎉 Congratulations!',
            body: isAr ? `وصلت إلى ${hitMilestone}% من هدف "${title}"!` : `You reached ${hitMilestone}% of "${title}"!`,
          },
          trigger: null,
        });
      }
    }
    setAddAmountId(null);
    setAddValue('');
  };

  const totalSaved = joined.reduce((sum, j) => sum + j.savedAmount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        icon="🏆"
        title={tr('Savings Challenges', 'تحديات الادخار')}
        right={
          <TouchableOpacity
            style={[styles.notifBtn, { borderColor: notificationsEnabled ? colors.gold + '50' : colors.border, backgroundColor: notificationsEnabled ? colors.gold + '15' : 'transparent' }]}
            onPress={toggleNotifications}
          >
            <Text style={{ fontSize: 16 }}>{notificationsEnabled ? '🔔' : '🔕'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{joined.length}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{tr('Active Challenges', 'تحديات نشطة')}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.teal }]}>{totalSaved.toLocaleString()}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{tr('Total Saved', 'إجمالي المدخرات')}</Text>
          </Card>
        </View>

        {/* Daily Tip */}
        {joined.length > 0 && (
          <Card style={[styles.tipCard, { backgroundColor: colors.gold + '10', borderColor: colors.gold + '30' }]}>
            <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD }}>💡 {tr('Daily Savings Tip', 'نصيحة الادخار اليومية')}</Text>
              <TouchableOpacity onPress={() => fetchTip(true)} disabled={tipLoading} hitSlop={8}>
                <Text style={{ color: colors.gold, fontSize: 12 }}>{tipLoading ? '…' : '↻'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12.5, fontFamily: FONT_UI, lineHeight: 18, marginTop: 6 }}>
              {tipLoading ? tr('Loading tip...', 'جارٍ تحميل النصيحة...') : dailyTip || tr('No tip available right now.', 'لا توجد نصيحة متاحة حالياً.')}
            </Text>
          </Card>
        )}

        {/* Challenge Cards */}
        <View style={{ gap: 10 }}>
          {CHALLENGES.map((challenge) => {
            const data = joined.find((j) => j.challengeId === challenge.id);
            const isJoined = !!data;
            const progress = data ? (data.savedAmount / challenge.targetAmount) * 100 : 0;
            const daysLeft = data ? getDaysRemaining(data.joinedAt, challenge.duration) : challenge.duration;

            return (
              <Card key={challenge.id}>
                <View style={[styles.challengeTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.challengeTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: 22 }}>{challenge.icon}</Text>
                    <View>
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{isAr ? challenge.titleAr : challenge.titleEn}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 10.5, fontFamily: FONT_UI }}>
                        {challenge.duration} {tr('days', 'يوم')} • {tr('Target:', 'الهدف:')} {challenge.targetAmount}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinBtn, isJoined ? { borderColor: colors.red + '50' } : { borderColor: colors.gold + '50' }]}
                    onPress={() => (isJoined ? leaveChallenge(challenge.id) : joinChallenge(challenge.id))}
                  >
                    <Text style={{ color: isJoined ? colors.red : colors.gold, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>
                      {isJoined ? tr('Leave', 'مغادرة') : tr('Join', 'انضمام')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontFamily: FONT_UI, marginTop: 8 }}>
                  {isAr ? challenge.descAr : challenge.descEn}
                </Text>

                {isJoined && data && (
                  <>
                    <View style={{ marginTop: 10 }}>
                      <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{Math.min(100, Math.round(progress))}%</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{daysLeft} {tr('days left', 'يوم متبقي')}</Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.bg }]}>
                        <View style={{ width: `${Math.min(100, progress)}%`, height: '100%', borderRadius: 6, backgroundColor: colors.gold }} />
                      </View>
                    </View>

                    <View style={[styles.milestonesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {challenge.milestones.map((m) => {
                        const done = data.completedMilestones.includes(m);
                        return (
                          <View key={m} style={[styles.milestoneChip, { backgroundColor: done ? colors.gold + '25' : colors.bg, borderColor: done ? colors.gold + '4D' : colors.border }]}>
                            <Text style={{ color: done ? colors.gold : colors.textSecondary, fontSize: 10.5, fontFamily: FONT_UI_MEDIUM }}>{done ? '✅ ' : ''}{m}%</Text>
                          </View>
                        );
                      })}
                    </View>

                    {addAmountId === challenge.id ? (
                      <View style={[styles.addRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TextInput
                          value={addValue}
                          onChangeText={setAddValue}
                          placeholder={tr('Amount', 'المبلغ')}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          style={[styles.addInput, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                        />
                        <TouchableOpacity style={[styles.addConfirmBtn, { backgroundColor: colors.gold }]} onPress={() => addSavings(challenge.id, parseFloat(addValue) || 0)}>
                          <Text style={{ color: '#1A1200', fontSize: 12, fontFamily: FONT_UI_BOLD }}>{tr('Add', 'إضافة')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAddAmountId(null); setAddValue(''); }} hitSlop={8}>
                          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.addSavingsBtn, { backgroundColor: colors.teal + '15', borderColor: colors.teal + '30' }]} onPress={() => setAddAmountId(challenge.id)}>
                        <Text style={{ color: colors.teal, fontSize: 12.5, fontFamily: FONT_UI_MEDIUM }}>💰 {tr('Add Savings', 'إضافة مدخرات')}</Text>
                      </TouchableOpacity>
                    )}

                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: 'center', marginTop: 8 }}>
                      {tr('Saved:', 'المحفوظ:')} {data.savedAmount.toLocaleString()} / {challenge.targetAmount.toLocaleString()}
                    </Text>
                  </>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {/* Milestone celebration */}
      <Modal visible={!!celebrating} transparent animationType="fade">
        <View style={styles.celebrateOverlay}>
          <View style={[styles.celebrateBox, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <Text style={{ fontSize: 44, marginBottom: 10 }}>🎉🎊🏆</Text>
            <Text style={{ color: colors.text, fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 6 }}>{tr('Congratulations!', 'مبروك!')}</Text>
            {celebrating && (
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: 'center' }}>
                {tr(`You reached ${celebrating.milestone}% of your goal!`, `وصلت إلى ${celebrating.milestone}% من هدفك!`)}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  notifBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { gap: 10 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: FONT_UI_BOLD },
  tipCard: { borderWidth: 1 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  challengeTop: { alignItems: 'flex-start', justifyContent: 'space-between' },
  challengeTitleRow: { alignItems: 'center', gap: 8, flexShrink: 1 },
  joinBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  barTrack: { height: 10, borderRadius: 6, overflow: 'hidden', marginTop: 4 },
  milestonesRow: { gap: 6, marginTop: 10 },
  milestoneChip: { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  addRow: { alignItems: 'center', gap: 8, marginTop: 10 },
  addInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: FONT_UI },
  addConfirmBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addSavingsBtn: { marginTop: 10, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  celebrateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  celebrateBox: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', maxWidth: 320 },
});
