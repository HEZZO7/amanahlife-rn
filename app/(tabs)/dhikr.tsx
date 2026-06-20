/**
 * Dhikr Counter — migrated from app/frontend/src/pages/DhikrCounter.tsx
 * localStorage → AsyncStorage. Per-preset/day counts, daily total, SVG progress
 * ring, gradient tap button, navigator.vibrate → RN Vibration. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card, Button } from '../../src/components/ui';
import { FONT_UI, FONT_UI_BOLD, FONT_UI_BLACK, FONT_ARABIC_BOLD } from '../../src/theme/fonts';

interface DhikrPreset { id: string; arabic: string; transliteration: string; meaning: string; meaningAr: string; target: number; }

const PRESETS: DhikrPreset[] = [
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', meaning: 'Glory be to Allah', meaningAr: 'تنزيه الله عن كل نقص', target: 33 },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', meaning: 'All praise is due to Allah', meaningAr: 'الثناء على الله بصفات الكمال', target: 33 },
  { id: 'allahuakbar', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', meaning: 'Allah is the Greatest', meaningAr: 'الله أعظم من كل شيء', target: 33 },
  { id: 'lailaha', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', transliteration: 'La ilaha illallah', meaning: 'There is no god but Allah', meaningAr: 'لا معبود بحق إلا الله', target: 100 },
  { id: 'astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', meaning: 'I seek forgiveness from Allah', meaningAr: 'أطلب المغفرة من الله', target: 100 },
  { id: 'salawat', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', transliteration: 'Allahumma salli ala Muhammad', meaning: 'O Allah, send blessings upon Muhammad', meaningAr: 'الصلاة على النبي ﷺ', target: 100 },
];

const R = 88;
const CIRC = 2 * Math.PI * R;

export default function DhikrCounter() {
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const [selectedPreset, setSelectedPreset] = useState<DhikrPreset>(PRESETS[0]);
  const [count, setCount] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/(auth)/landing');
  }, [user, authLoading]);

  useEffect(() => {
    const today = new Date().toDateString();
    (async () => {
      const savedCount = await AsyncStorage.getItem(`dhikr_count_${selectedPreset.id}_${today}`);
      const savedTotal = await AsyncStorage.getItem(`dhikr_total_${today}`);
      setCount(savedCount ? parseInt(savedCount) : 0);
      if (savedTotal) setDailyTotal(parseInt(savedTotal));
    })();
  }, [selectedPreset]);

  useEffect(() => {
    const today = new Date().toDateString();
    AsyncStorage.setItem(`dhikr_count_${selectedPreset.id}_${today}`, count.toString());
    AsyncStorage.setItem(`dhikr_total_${today}`, dailyTotal.toString());
  }, [count, dailyTotal, selectedPreset]);

  const increment = () => {
    setCount((c) => c + 1);
    setDailyTotal((t) => t + 1);
    Vibration.vibrate(10);
  };
  const reset = () => setCount(0);

  const progress = Math.min((count / selectedPreset.target) * 100, 100);
  const isComplete = count >= selectedPreset.target;
  const ringColor = isComplete ? colors.green : colors.teal;

  if (authLoading) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🔢" title={tr('Dhikr Counter', 'عداد الذكر')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily total */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{tr("Today's Total", 'إجمالي اليوم')}</Text>
          <Text style={[styles.total, { color: colors.teal }]}>{dailyTotal}</Text>
        </View>

        {/* Selected dhikr */}
        <Card style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={[styles.dhikrArabic, { color: colors.text }]}>{selectedPreset.arabic}</Text>
          <Text style={[styles.dhikrTranslit, { color: colors.text }]}>{selectedPreset.transliteration}</Text>
          <Text style={[styles.dhikrMeaning, { color: colors.textSecondary }]}>
            {language === 'ar' ? selectedPreset.meaningAr : selectedPreset.meaning}
          </Text>
        </Card>

        {/* Progress ring */}
        <View style={styles.ringWrap}>
          <Svg width={192} height={192} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={96} cy={96} r={R} stroke={colors.surface} strokeWidth={8} fill="none" />
            <Circle
              cx={96} cy={96} r={R}
              stroke={ringColor} strokeWidth={8} fill="none"
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={CIRC * (1 - progress / 100)}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringCount, { color: colors.text }]}>{count}</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>/ {selectedPreset.target}</Text>
          </View>
        </View>

        {/* Tap button */}
        <TouchableOpacity activeOpacity={0.85} onPress={increment} style={styles.tapWrap}>
          <LinearGradient colors={[colors.teal, '#178F8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tapBtn}>
            <Text style={styles.tapText}>{tr('TAP', 'اضغط')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Controls */}
        <View style={styles.controls}>
          <Button variant="outline" size="sm" title={tr('Reset', 'إعادة')} onPress={reset} />
          <Button variant="outline" size="sm" title={tr('Change Dhikr', 'تغيير الذكر')} onPress={() => setShowPresets((s) => !s)} />
        </View>

        {/* Preset selector */}
        {showPresets && (
          <Card style={{ marginTop: 16 }}>
            <Text style={[styles.selectTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {tr('Select Dhikr', 'اختر الذكر')}
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {PRESETS.map((preset) => {
                const active = selectedPreset.id === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetBtn, {
                      backgroundColor: active ? colors.teal + '1A' : colors.surface,
                      borderColor: active ? colors.teal : colors.border,
                    }]}
                    onPress={() => { setSelectedPreset(preset); setShowPresets(false); }}
                  >
                    <Text style={[styles.presetName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                      {language === 'ar' ? preset.arabic : preset.transliteration}
                    </Text>
                    <Text style={[styles.presetSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {language === 'ar' ? preset.meaningAr : preset.meaning} • {tr('Target', 'الهدف')}: {preset.target}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Completion */}
        {isComplete && (
          <View style={[styles.complete, { backgroundColor: colors.teal + '1A', borderColor: colors.teal + '4D' }]}>
            <Text style={[styles.completeTitle, { color: colors.teal }]}>{tr('🎉 Target Reached!', '🎉 تم الوصول للهدف!')}</Text>
            <Text style={[styles.completeSub, { color: colors.teal }]}>
              {tr("MashaAllah! You've completed your dhikr goal.", 'ما شاء الله! أكملت هدف الذكر.')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  muted: { fontSize: 13, fontFamily: FONT_UI },
  total: { fontSize: 26, fontFamily: FONT_UI_BLACK, marginTop: 2 },
  dhikrArabic: { fontSize: 32, fontFamily: FONT_ARABIC_BOLD, marginBottom: 6, textAlign: 'center', lineHeight: 50 },
  dhikrTranslit: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  dhikrMeaning: { fontSize: 12, fontFamily: FONT_UI, marginTop: 3, textAlign: 'center' },
  ringWrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', width: 192, height: 192 },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringCount: { fontSize: 40, fontFamily: FONT_UI_BLACK },
  tapWrap: { alignSelf: 'center', marginTop: 20 },
  tapBtn: {
    width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  tapText: { color: '#fff', fontSize: 20, fontFamily: FONT_UI_BOLD },
  controls: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 20 },
  selectTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  presetBtn: { padding: 12, borderRadius: 10, borderWidth: 1 },
  presetName: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  presetSub: { fontSize: 11, fontFamily: FONT_UI, marginTop: 2 },
  complete: { marginTop: 18, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  completeTitle: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  completeSub: { fontSize: 13, fontFamily: FONT_UI, marginTop: 3, textAlign: 'center' },
});
