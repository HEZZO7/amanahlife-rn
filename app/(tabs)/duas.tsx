/**
 * Duas Collection — migrated from app/frontend/src/pages/DuasCollection.tsx
 * Static dua set, category filter, search, favorites (localStorage → AsyncStorage),
 * expandable cards (tap to reveal translation + reference). Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_ARABIC } from '../../src/theme/fonts';

interface Dua { id: string; category: string; categoryAr: string; arabic: string; transliteration: string; translation: string; reference: string; }

const DUAS: Dua[] = [
  { id: '1', category: 'Morning', categoryAr: 'الصباح', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ', transliteration: 'Asbahna wa asbahal mulku lillah, walhamdu lillah', translation: 'We have reached the morning and at this very time the whole kingdom belongs to Allah. All praise is due to Allah.', reference: 'Muslim' },
  { id: '2', category: 'Morning', categoryAr: 'الصباح', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ', transliteration: 'Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykan-nushur', translation: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.', reference: 'Tirmidhi' },
  { id: '3', category: 'Evening', categoryAr: 'المساء', arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ', transliteration: 'Amsayna wa amsal mulku lillah, walhamdu lillah', translation: 'We have reached the evening and at this very time the whole kingdom belongs to Allah. All praise is due to Allah.', reference: 'Muslim' },
  { id: '4', category: 'Before Sleep', categoryAr: 'قبل النوم', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', transliteration: 'Bismika Allahumma amutu wa ahya', translation: 'In Your name, O Allah, I die and I live.', reference: 'Bukhari' },
  { id: '5', category: 'Before Sleep', categoryAr: 'قبل النوم', arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', transliteration: "Allahumma qini adhabaka yawma tab'athu ibadak", translation: 'O Allah, protect me from Your punishment on the day You resurrect Your servants.', reference: 'Abu Dawud' },
  { id: '6', category: 'Eating', categoryAr: 'الطعام', arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ', transliteration: 'Bismillahi wa ala barakatillah', translation: 'In the name of Allah and with the blessings of Allah.', reference: 'Abu Dawud' },
  { id: '7', category: 'Eating', categoryAr: 'الطعام', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ', transliteration: "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah", translation: 'All praise is due to Allah who fed me this and provided it for me without any might or power from me.', reference: 'Tirmidhi' },
  { id: '8', category: 'Travel', categoryAr: 'السفر', arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ', transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin', translation: 'Glory be to Him who has subjected this to us, and we were not capable of that.', reference: 'Quran 43:13' },
  { id: '9', category: 'Protection', categoryAr: 'الحماية', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-Alim", translation: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.', reference: 'Abu Dawud, Tirmidhi' },
  { id: '10', category: 'Protection', categoryAr: 'الحماية', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: "A'udhu bi kalimatillahit-tammati min sharri ma khalaq", translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', reference: 'Muslim' },
  { id: '11', category: 'Anxiety', categoryAr: 'القلق', arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ', transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan", translation: 'O Allah, I seek refuge in You from worry and grief.', reference: 'Bukhari' },
  { id: '12', category: 'Gratitude', categoryAr: 'الشكر', arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', transliteration: "Allahumma a'inni ala dhikrika wa shukrika wa husni ibadatik", translation: 'O Allah, help me to remember You, to thank You, and to worship You well.', reference: 'Abu Dawud' },
];

const CATEGORIES = [
  { en: 'All', ar: 'الكل' }, { en: 'Morning', ar: 'الصباح' }, { en: 'Evening', ar: 'المساء' },
  { en: 'Before Sleep', ar: 'قبل النوم' }, { en: 'Eating', ar: 'الطعام' }, { en: 'Travel', ar: 'السفر' },
  { en: 'Protection', ar: 'الحماية' }, { en: 'Anxiety', ar: 'القلق' }, { en: 'Gratitude', ar: 'الشكر' },
];

function DuaCard({ dua, isFavorite, onToggle, language, isRTL }: { dua: Dua; isFavorite: boolean; onToggle: (id: string) => void; language: string; isRTL: boolean }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={isFavorite ? { borderColor: colors.gold + '80', backgroundColor: colors.gold + '0D' } : undefined}>
      {/* In Arabic: star on LEFT, badge on RIGHT (row-reverse) */}
      <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.catBadge, { backgroundColor: colors.gold + '1A' }]}>
          <Text style={{ color: colors.gold, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{language === 'ar' ? dua.categoryAr : dua.category}</Text>
        </View>
        <TouchableOpacity onPress={() => onToggle(dua.id)} hitSlop={8}>
          <Text style={{ color: isFavorite ? colors.gold : colors.textSecondary, fontSize: 20 }}>{isFavorite ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.arabic, { color: colors.text }]}>{dua.arabic}</Text>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((e) => !e)}>
        <Text style={[styles.translit, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{dua.transliteration}</Text>
        {expanded ? (
          <>
            <Text style={[styles.translation, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{dua.translation}</Text>
            <Text style={[styles.reference, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {language === 'ar' ? 'المرجع' : 'Reference'}: {dua.reference}
            </Text>
          </>
        ) : (
          <Text style={[styles.hint, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {language === 'ar' ? 'اضغط لعرض الترجمة' : 'Tap to see translation'}
          </Text>
        )}
      </TouchableOpacity>
    </Card>
  );
}

export default function DuasCollection() {
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => { if (!authLoading && !user) router.replace('/(auth)/landing'); }, [user, authLoading]);
  useEffect(() => { AsyncStorage.getItem('dua_favorites').then((s) => { if (s) setFavorites(new Set(JSON.parse(s))); }); }, []);
  useEffect(() => { AsyncStorage.setItem('dua_favorites', JSON.stringify([...favorites])); }, [favorites]);

  const toggleFavorite = (id: string) => setFavorites((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const filteredDuas = DUAS.filter((dua) => {
    const matchCategory = selectedCategory === 'All' || dua.category === selectedCategory;
    const q = search.toLowerCase();
    const matchSearch = search === '' ||
      dua.transliteration.toLowerCase().includes(q) || dua.translation.toLowerCase().includes(q) ||
      dua.category.toLowerCase().includes(q) || dua.categoryAr.includes(search) || dua.arabic.includes(search);
    return matchCategory && matchSearch;
  });

  if (authLoading) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🤲" title={tr('Duas', 'الأدعية')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TextInput
          placeholder={tr('Search duas...', 'ابحث في الأدعية...')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[styles.search, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
        />

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.en;
            return (
              <TouchableOpacity
                key={cat.en}
                style={[styles.catChip, { backgroundColor: active ? colors.gold : 'transparent', borderColor: active ? colors.gold : colors.border }]}
                onPress={() => setSelectedCategory(cat.en)}
              >
                <Text style={{ color: active ? '#1A1200' : colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{language === 'ar' ? cat.ar : cat.en}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Favorites */}
        {selectedCategory === 'All' && favorites.size > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.favTitle, { color: colors.gold }]}>⭐ {tr('Favorites', 'المفضلة')}</Text>
            <View style={{ gap: 12 }}>
              {DUAS.filter((d) => favorites.has(d.id)).map((dua) => (
                <DuaCard key={`fav-${dua.id}`} dua={dua} isFavorite onToggle={toggleFavorite} language={language} isRTL={isRTL} />
              ))}
            </View>
          </View>
        )}

        {/* List */}
        <View style={{ gap: 12, marginTop: 8 }}>
          {filteredDuas.map((dua) => (
            <DuaCard key={dua.id} dua={dua} isFavorite={favorites.has(dua.id)} onToggle={toggleFavorite} language={language} isRTL={isRTL} />
          ))}
        </View>

        {filteredDuas.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
            <Text style={{ color: colors.textSecondary, fontFamily: FONT_UI }}>{tr('No duas found for this search.', 'لم يتم العثور على أدعية.')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  search: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: FONT_UI, marginBottom: 12 },
  catRow: { gap: 8, paddingBottom: 14 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  favTitle: { fontSize: 13, fontFamily: FONT_UI_BOLD, marginBottom: 10 },
  cardTop: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  arabic: { fontSize: 21, fontFamily: FONT_ARABIC, textAlign: 'right', lineHeight: 42, marginBottom: 12 },
  translit: { fontSize: 13.5, fontFamily: FONT_UI_MEDIUM, fontStyle: 'italic' },
  translation: { fontSize: 13.5, fontFamily: FONT_UI, marginTop: 8, lineHeight: 20 },
  reference: { fontSize: 11, fontFamily: FONT_UI, marginTop: 8 },
  hint: { fontSize: 11, fontFamily: FONT_UI, marginTop: 4 },
});
