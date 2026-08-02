/**
 * Excused-period (عذر شرعي) management sheet - Phase C, 2026-08-02.
 * Reached via a discreet entry point on prayer-times.tsx and fasting.tsx
 * only (no dashboard tile, no notifications, nothing on any shared/family
 * view - per the explicit privacy instruction). Lets the user start/end a
 * menstruation, nifas, illness, or travel period, and tick off fasting/
 * prayer makeup (qada) as they complete it.
 *
 * No native date-picker dependency (e.g. @react-native-community/
 * datetimepicker) is used here deliberately - a new native module would
 * need a fresh EAS build to actually work on-device, and this pass is
 * explicitly not allowed to touch EAS. Dates are chosen via simple
 * "N days ago" steppers instead.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../theme/fonts';
import {
  ExcusedPeriod, ExcusedReason, EXCUSED_REASON_LABELS, DISCLAIMER_TEXT,
  getExcusedPeriods, addExcusedPeriod, endExcusedPeriod, deleteExcusedPeriod,
  hasSeenDisclaimer, markDisclaimerSeen,
  computeFastingQadaOwed, getFastingQadaMadeUp, adjustFastingQadaMadeUp,
  computePrayerQadaOwed, getPrayerQadaMadeUp, adjustPrayerQadaMadeUp,
  isoDate,
} from '../lib/excusedPeriods';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const REASONS: ExcusedReason[] = ['menstruation', 'nifas', 'illness', 'travel'];

function daysAgoToIso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return isoDate(d);
}

function formatIsoForDisplay(iso: string, isAr: boolean): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(isAr ? 'ar' : 'en', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExcusedPeriodsModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const userId = user?.id ?? null;
  const row = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [periods, setPeriods] = useState<ExcusedPeriod[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const [reason, setReason] = useState<ExcusedReason>('menstruation');
  const [startDaysAgo, setStartDaysAgo] = useState(0);
  const [isOngoing, setIsOngoing] = useState(true);
  const [endDaysAgo, setEndDaysAgo] = useState(0);
  const [illnessIncapacitated, setIllnessIncapacitated] = useState(false);
  const [illnessChoice, setIllnessChoice] = useState<'qada' | 'waived' | null>(null);

  const [fastingOwed, setFastingOwed] = useState(0);
  const [fastingMadeUp, setFastingMadeUp] = useState(0);
  const [prayerOwed, setPrayerOwed] = useState(0);
  const [prayerMadeUp, setPrayerMadeUp] = useState(0);

  const refresh = useCallback(async () => {
    const [p, fOwed, fMade, pOwed, pMade] = await Promise.all([
      getExcusedPeriods(userId),
      computeFastingQadaOwed(userId),
      getFastingQadaMadeUp(userId),
      computePrayerQadaOwed(userId),
      getPrayerQadaMadeUp(userId),
    ]);
    setPeriods(p.slice().reverse());
    setFastingOwed(fOwed);
    setFastingMadeUp(fMade);
    setPrayerOwed(pOwed);
    setPrayerMadeUp(pMade);
  }, [userId]);

  useEffect(() => {
    if (!visible) return;
    hasSeenDisclaimer(userId).then((seen) => setShowDisclaimer(!seen));
    refresh();
  }, [visible, userId, refresh]);

  const resetForm = () => {
    setReason('menstruation');
    setStartDaysAgo(0);
    setIsOngoing(true);
    setEndDaysAgo(0);
    setIllnessIncapacitated(false);
    setIllnessChoice(null);
    setShowAddForm(false);
  };

  const acknowledgeDisclaimer = async () => {
    await markDisclaimerSeen(userId);
    setShowDisclaimer(false);
  };

  const canSave = reason !== 'illness' || !illnessIncapacitated || illnessChoice !== null;

  const handleSave = async () => {
    if (!canSave) return;
    await addExcusedPeriod(userId, {
      reason,
      startDate: daysAgoToIso(startDaysAgo),
      endDate: isOngoing ? null : daysAgoToIso(Math.min(endDaysAgo, startDaysAgo)),
      illnessIncapacitated: reason === 'illness' ? illnessIncapacitated : undefined,
      illnessPrayerChoice: reason === 'illness' && illnessIncapacitated ? illnessChoice ?? undefined : undefined,
    });
    resetForm();
    refresh();
  };

  const handleEndNow = async (id: string) => {
    await endExcusedPeriod(userId, id);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteExcusedPeriod(userId, id);
    refresh();
  };

  const bumpFastingMadeUp = async (delta: number) => {
    await adjustFastingQadaMadeUp(userId, delta);
    refresh();
  };
  const bumpPrayerMadeUp = async (delta: number) => {
    await adjustPrayerQadaMadeUp(userId, delta);
    refresh();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={[styles.header, row]}>
            <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'فترة عذر شرعي' : 'Excused Period'}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowDisclaimer(true)} hitSlop={8}>
                <Text style={{ fontSize: 18 }}>ℹ️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDisclaimer ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 4 }}>
              <Text style={[styles.disclaimerText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isAr ? DISCLAIMER_TEXT.ar : DISCLAIMER_TEXT.en}
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.teal, marginTop: 16 }]}
                onPress={acknowledgeDisclaimer}
              >
                <Text style={{ color: '#04211C', fontFamily: FONT_UI_BOLD }}>{isAr ? 'فهمت' : 'I understand'}</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={{ flex: 1 }}>
              {/* Qada summary */}
              <View style={[styles.qadaRow, row, { borderColor: colors.border }]}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[styles.qadaLabel, { color: colors.textSecondary }]}>{isAr ? 'صيام قضاء متبقٍ' : 'Fasts owed'}</Text>
                  <Text style={[styles.qadaNum, { color: colors.gold }]}>{Math.max(0, fastingOwed - fastingMadeUp)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.surface }]} onPress={() => bumpFastingMadeUp(-1)}>
                      <Text style={{ color: colors.text }}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.teal }]} onPress={() => bumpFastingMadeUp(1)}>
                      <Text style={{ color: '#04211C' }}>+1 {isAr ? 'قُضي' : 'made up'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {prayerOwed > 0 && (
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={[styles.qadaLabel, { color: colors.textSecondary }]}>{isAr ? 'صلوات قضاء متبقية' : 'Prayers owed'}</Text>
                    <Text style={[styles.qadaNum, { color: colors.gold }]}>{Math.max(0, prayerOwed - prayerMadeUp)}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.surface }]} onPress={() => bumpPrayerMadeUp(-1)}>
                        <Text style={{ color: colors.text }}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.teal }]} onPress={() => bumpPrayerMadeUp(1)}>
                        <Text style={{ color: '#04211C' }}>+1 {isAr ? 'قُضيت' : 'made up'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Existing periods */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isAr ? 'الفترات المسجلة' : 'Recorded periods'}
              </Text>
              {periods.length === 0 && (
                <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: FONT_UI, paddingVertical: 8 }}>
                  {isAr ? 'لا توجد فترات مسجلة' : 'No periods recorded yet'}
                </Text>
              )}
              {periods.map((p) => (
                <View key={p.id} style={[styles.periodRow, row, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontFamily: FONT_UI_MEDIUM, fontSize: 13, textAlign: isRTL ? 'right' : 'left' }}>
                      {isAr ? EXCUSED_REASON_LABELS[p.reason].ar : EXCUSED_REASON_LABELS[p.reason].en}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
                      {formatIsoForDisplay(p.startDate, isAr)} - {p.endDate ? formatIsoForDisplay(p.endDate, isAr) : (isAr ? 'مستمرة' : 'ongoing')}
                    </Text>
                  </View>
                  {!p.endDate && (
                    <TouchableOpacity onPress={() => handleEndNow(p.id)} style={[styles.tinyBtn, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.text, fontSize: 11 }}>{isAr ? 'إنهاء الآن' : 'End now'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(p.id)} hitSlop={8} style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                    <Text style={{ color: colors.red, fontSize: 14 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!showAddForm ? (
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.teal, marginTop: 16 }]} onPress={() => setShowAddForm(true)}>
                  <Text style={{ color: '#04211C', fontFamily: FONT_UI_BOLD }}>{isAr ? '+ إضافة فترة جديدة' : '+ Add new period'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginTop: 16, gap: 12 }}>
                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isAr ? 'السبب' : 'Reason'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {REASONS.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.chip, { borderColor: colors.border }, reason === r && { backgroundColor: colors.teal, borderColor: colors.teal }]}
                        onPress={() => { setReason(r); setIllnessIncapacitated(false); setIllnessChoice(null); }}
                      >
                        <Text style={{ color: reason === r ? '#04211C' : colors.text, fontFamily: FONT_UI_MEDIUM, fontSize: 13 }}>
                          {isAr ? EXCUSED_REASON_LABELS[r].ar : EXCUSED_REASON_LABELS[r].en}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {reason === 'illness' && (
                    <>
                      <TouchableOpacity
                        style={[styles.checkboxRow, row]}
                        onPress={() => { setIllnessIncapacitated((v) => !v); setIllnessChoice(null); }}
                      >
                        <Text style={{ fontSize: 16 }}>{illnessIncapacitated ? '☑️' : '⬜'}</Text>
                        <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                          {isAr
                            ? 'كنت عاجزاً تماماً عن أداء الصلاة خلال هذه الفترة (وليس مجرد قصر أو جمع الصلوات)'
                            : "I was genuinely unable to pray at all during this period (not just shortening/combining)"}
                        </Text>
                      </TouchableOpacity>
                      {illnessIncapacitated && (
                        <View style={{ gap: 8 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
                            {isAr ? 'هل ستقضي هذه الصلوات لاحقاً؟' : 'Will you make up these prayers later?'}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={[styles.chip, { borderColor: colors.border, flex: 1, alignItems: 'center' }, illnessChoice === 'qada' && { backgroundColor: colors.teal, borderColor: colors.teal }]}
                              onPress={() => setIllnessChoice('qada')}
                            >
                              <Text style={{ color: illnessChoice === 'qada' ? '#04211C' : colors.text, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'قضاء' : 'Qada (makeup)'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.chip, { borderColor: colors.border, flex: 1, alignItems: 'center' }, illnessChoice === 'waived' && { backgroundColor: colors.teal, borderColor: colors.teal }]}
                              onPress={() => setIllnessChoice('waived')}
                            >
                              <Text style={{ color: illnessChoice === 'waived' ? '#04211C' : colors.text, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'ساقطة' : 'Waived'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isAr ? 'تاريخ البدء' : 'Start date'}
                  </Text>
                  <DaysAgoStepper value={startDaysAgo} onChange={setStartDaysAgo} colors={colors} isAr={isAr} row={row} />

                  <View style={[styles.checkboxRow, row]}>
                    <TouchableOpacity onPress={() => setIsOngoing((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>{isOngoing ? '☑️' : '⬜'}</Text>
                      <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI }}>{isAr ? 'مستمرة (لم تنتهِ بعد)' : 'Ongoing (hasn’t ended yet)'}</Text>
                    </TouchableOpacity>
                  </View>

                  {!isOngoing && (
                    <>
                      <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {isAr ? 'تاريخ الانتهاء' : 'End date'}
                      </Text>
                      <DaysAgoStepper value={endDaysAgo} onChange={setEndDaysAgo} colors={colors} isAr={isAr} row={row} max={startDaysAgo} />
                    </>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border, flex: 1 }]} onPress={resetForm}>
                      <Text style={{ color: colors.text, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: canSave ? colors.teal : colors.border, flex: 1 }]}
                      onPress={handleSave}
                      disabled={!canSave}
                    >
                      <Text style={{ color: canSave ? '#04211C' : colors.textMuted, fontFamily: FONT_UI_BOLD }}>{isAr ? 'حفظ' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DaysAgoStepper({ value, onChange, colors, isAr, row, max }: {
  value: number; onChange: (v: number) => void; colors: any; isAr: boolean; row: any; max?: number;
}) {
  const label = value === 0 ? (isAr ? 'اليوم' : 'Today') : (isAr ? `قبل ${value} يوم` : `${value} day${value === 1 ? '' : 's'} ago`);
  return (
    <View style={[styles.stepperRow, row]}>
      <TouchableOpacity
        style={[styles.smallBtn, { backgroundColor: colors.surface }]}
        onPress={() => onChange(Math.min(max ?? 365, value + 1))}
      >
        <Text style={{ color: colors.text }}>−</Text>
      </TouchableOpacity>
      <Text style={{ color: colors.text, fontFamily: FONT_UI_MEDIUM, fontSize: 13, minWidth: 100, textAlign: 'center' }}>{label}</Text>
      <TouchableOpacity
        style={[styles.smallBtn, { backgroundColor: colors.surface }]}
        onPress={() => onChange(Math.max(0, value - 1))}
      >
        <Text style={{ color: colors.text }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  header: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 16, fontFamily: FONT_UI_BOLD },
  disclaimerText: { fontSize: 13, fontFamily: FONT_UI, lineHeight: 20 },
  primaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  secondaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  qadaRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  qadaLabel: { fontSize: 11, fontFamily: FONT_UI },
  qadaNum: { fontSize: 24, fontFamily: FONT_UI_BOLD, marginTop: 2 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontFamily: FONT_UI_BOLD, letterSpacing: 0.5, marginTop: 4 },
  periodRow: { alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  tinyBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  checkboxRow: { alignItems: 'center', gap: 8 },
  stepperRow: { alignItems: 'center', gap: 10 },
});
