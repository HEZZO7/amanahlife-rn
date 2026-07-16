/**
 * Adhkar — migrated from app/frontend/src/pages/Adhkar.tsx
 * Morning/Evening/After-Prayer/Sleep adhkar with per-item tap counters and daily
 * progress (localStorage('adhkar_progress_<date>') → AsyncStorage). Bilingual.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, ProgressBar } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_ARABIC } from '../../src/theme/fonts';

interface Dhikr { id: string; arabic: string; transliteration: string; translation: string; count: number; }
interface AdhkarCategory { id: string; nameAr: string; nameEn: string; icon: string; items: Dhikr[]; }

const ADHKAR_DATA: AdhkarCategory[] = [
  { id: 'morning', nameAr: 'أذكار الصباح', nameEn: 'Morning Adhkar', icon: '🌅', items: [
    { id: 'm1', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', transliteration: 'Asbahna wa asbahal mulku lillah', translation: 'We have reached the morning and at this very time the kingdom belongs to Allah', count: 1 },
    { id: 'm2', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'SubhanAllahi wa bihamdihi', translation: 'Glory is to Allah and praise is to Him', count: 33 },
    { id: 'm3', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'La ilaha illAllahu wahdahu la sharika lah', translation: 'None has the right to be worshipped except Allah alone', count: 3 },
    { id: 'm4', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created', count: 3 },
    { id: 'm5', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ', transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un", translation: 'In the name of Allah with whose name nothing can harm', count: 3 },
    { id: 'm6', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا', transliteration: 'Allahumma bika asbahna wa bika amsayna', translation: 'O Allah, by Your leave we have reached the morning', count: 1 },
    { id: 'm7', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ', transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyah", translation: 'O Allah, I ask You for pardon and well-being', count: 3 },
    { id: 'm8', arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ', transliteration: 'HasbiyAllahu la ilaha illa Huwa', translation: 'Allah is sufficient for me, there is no god but He', count: 7 },
  ] },
  { id: 'afterPrayer', nameAr: 'أذكار بعد الصلاة', nameEn: 'After Prayer', icon: '🕌', items: [
    { id: 'p1', arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', translation: 'I seek forgiveness from Allah', count: 3 },
    { id: 'p2', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', translation: 'Glory be to Allah', count: 33 },
    { id: 'p3', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', translation: 'All praise is due to Allah', count: 33 },
    { id: 'p4', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', translation: 'Allah is the Greatest', count: 33 },
    { id: 'p5', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'La ilaha illAllahu wahdahu la sharika lah', translation: 'None has the right to be worshipped except Allah alone', count: 1 },
  ] },
  { id: 'evening', nameAr: 'أذكار المساء', nameEn: 'Evening Adhkar', icon: '🌙', items: [
    { id: 'e1', arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', transliteration: 'Amsayna wa amsal mulku lillah', translation: 'We have reached the evening and the kingdom belongs to Allah', count: 1 },
    { id: 'e2', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'SubhanAllahi wa bihamdihi', translation: 'Glory is to Allah and praise is to Him', count: 33 },
    { id: 'e3', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created', count: 3 },
    { id: 'e4', arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا', transliteration: 'Allahumma bika amsayna wa bika asbahna', translation: 'O Allah, by Your leave we have reached the evening', count: 1 },
    { id: 'e5', arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ فَمِنْكَ', transliteration: "Allahumma ma amsa bi min ni'matin faminka", translation: 'O Allah, whatever blessing has been received by me is from You', count: 1 },
    { id: 'e6', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'La ilaha illAllahu wahdahu la sharika lah', translation: 'None has the right to be worshipped except Allah alone', count: 3 },
  ] },
  { id: 'sleep', nameAr: 'أذكار النوم', nameEn: 'Sleep Adhkar', icon: '😴', items: [
    { id: 's1', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', transliteration: 'Bismika Allahumma amutu wa ahya', translation: 'In Your name O Allah, I die and I live', count: 1 },
    { id: 's2', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', translation: 'Glory be to Allah', count: 33 },
    { id: 's3', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', translation: 'All praise is due to Allah', count: 33 },
    { id: 's4', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', translation: 'Allah is the Greatest', count: 34 },
    { id: 's5', arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak", translation: 'O Allah, protect me from Your punishment on the day You resurrect Your servants', count: 3 },
  ] },
];

export default function Adhkar() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const [selectedCategory, setSelectedCategory] = useState('morning');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const today = new Date().toDateString();

  useEffect(() => {
    AsyncStorage.getItem(`adhkar_progress_${today}`).then((s) => { if (s) setProgress(JSON.parse(s)); });
  }, [today]);

  const increment = (id: string, maxCount: number) => {
    const current = progress[id] || 0;
    if (current < maxCount) {
      const updated = { ...progress, [id]: current + 1 };
      setProgress(updated);
      AsyncStorage.setItem(`adhkar_progress_${today}`, JSON.stringify(updated));
      Vibration.vibrate(8);
    }
  };

  const currentCategory = ADHKAR_DATA.find((c) => c.id === selectedCategory)!;
  const totalRequired = currentCategory.items.reduce((s, i) => s + i.count, 0);
  const totalDone = currentCategory.items.reduce((s, i) => s + Math.min(progress[i.id] || 0, i.count), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🍃" title={tr('Adhkar', 'الأذكار')} />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
          {totalDone}/{totalRequired} {tr('completed', 'مكتمل')}
        </Text>
      </View>

      {/* Category tabs — 4 equal tabs, no ScrollView */}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
      }}>
        {ADHKAR_DATA.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={{
                flex: 1,
                backgroundColor: active ? colors.teal : colors.card,
                borderRadius: 10,
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
              <Text style={{
                color: active ? '#04211C' : colors.textSecondary,
                fontSize: 10,
                fontFamily: FONT_UI_MEDIUM,
                textAlign: 'center',
                marginTop: 3,
              }} numberOfLines={2}>
                {language === 'ar' ? cat.nameAr : cat.nameEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Overall progress */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <ProgressBar value={totalRequired > 0 ? (totalDone / totalRequired) * 100 : 0} color={colors.gold} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {currentCategory.items.map((item) => {
          const current = progress[item.id] || 0;
          const isDone = current >= item.count;
          return (
            <View
              key={item.id}
              style={[styles.item, {
                backgroundColor: isDone ? colors.teal + '1A' : colors.card,
                borderColor: isDone ? colors.teal + '4D' : colors.border,
              }]}
            >
              <Text style={[styles.arabic, { color: colors.text, textAlign: 'right' }]}>{item.arabic}</Text>
              <Text style={[styles.translit, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{item.transliteration}</Text>
              <Text style={[styles.translation, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{item.translation}</Text>
              {/* In Arabic: +1 on RIGHT, counter on LEFT */}
              <View style={[styles.itemFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.progWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.miniTrack, { backgroundColor: colors.surface }]}>
                    <View style={{ width: `${(current / item.count) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.teal }} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{current}/{item.count}</Text>
                </View>
                <TouchableOpacity
                  disabled={isDone}
                  onPress={() => increment(item.id, item.count)}
                  style={[styles.countBtn, { backgroundColor: isDone ? colors.teal + '33' : colors.teal }]}
                >
                  <Text style={{ color: isDone ? colors.teal : '#04211C', fontSize: 14, fontFamily: FONT_UI_BOLD }}>{isDone ? '✓' : '+1'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: 130 },
  content: { padding: 16, paddingTop: 6, paddingBottom: 32, gap: 12 },
  item: { padding: 16, borderRadius: 16, borderWidth: 1 },
  arabic: { fontSize: 19, fontFamily: FONT_ARABIC, textAlign: 'right', lineHeight: 36, marginBottom: 8 },
  translit: { fontSize: 12, fontFamily: FONT_UI, fontStyle: 'italic', marginBottom: 3 },
  translation: { fontSize: 12, fontFamily: FONT_UI, marginBottom: 12 },
  itemFooter: { alignItems: 'center', justifyContent: 'space-between' },
  progWrap: { alignItems: 'center', gap: 8 },
  miniTrack: { width: 96, height: 6, borderRadius: 3, overflow: 'hidden' },
  countBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
});
