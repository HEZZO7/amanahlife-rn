/**
 * Quran Reader — migrated from app/frontend/src/pages/QuranReader.tsx
 * alquran.cloud API (surah list, Arabic + en.asad translation). Search, last-read
 * resume, ayah bookmarks. localStorage → AsyncStorage, sonner → src/lib/toast.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Card } from '../../src/components/ui';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_ARABIC } from '../../src/theme/fonts';

interface Surah { number: number; name: string; englishName: string; englishNameTranslation: string; numberOfAyahs: number; revelationType: string; }
interface Ayah { number: number; text: string; numberInSurah: number; translation?: string; }

export default function QuranReader() {
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [lastRead, setLastRead] = useState<{ surah: number; name: string } | null>(null);
  const todayKey = new Date().toDateString();
  const [quranPages, setQuranPages] = useState(0);
  const userId = user?.id ?? null;

  useEffect(() => { if (!authLoading && !user) router.replace('/(auth)/landing'); }, [user, authLoading]);

  useEffect(() => {
    Promise.all([
      migrateLegacyKeyIfNeeded('quran_bookmarks', userId),
      migrateLegacyKeyIfNeeded('quran_last_read', userId),
      migrateLegacyKeyIfNeeded(`quran_pages_${todayKey}`, userId),
    ]).then(() => {
      getUserItem('quran_bookmarks', userId).then((s) => { if (s) setBookmarks(new Set(JSON.parse(s))); });
      getUserItem('quran_last_read', userId).then((s) => { if (s) setLastRead(JSON.parse(s)); });
      getUserItem(`quran_pages_${todayKey}`, userId).then((s) => { if (s) setQuranPages(parseInt(s, 10)); });
    });
  }, [userId]);

  const addPages = (n: number) => {
    const newVal = Math.max(0, quranPages + n);
    setQuranPages(newVal);
    setUserItem(`quran_pages_${todayKey}`, userId, String(newVal));
  };
  useEffect(() => { setUserItem('quran_bookmarks', userId, JSON.stringify([...bookmarks])); }, [bookmarks, userId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        setSurahs(data.data);
      } catch {
        toast.error(tr('Failed to load Quran data', 'فشل تحميل بيانات القرآن'));
      } finally { setLoading(false); }
    })();
  }, [language]);

  const loadSurah = async (surah: Surah) => {
    setLoading(true);
    setSelectedSurah(surah);
    setLastRead({ surah: surah.number, name: surah.englishName });
    setUserItem('quran_last_read', userId, JSON.stringify({ surah: surah.number, name: surah.englishName }));
    try {
      const [arabicRes, englishRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`),
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/en.asad`),
      ]);
      const arabicData = await arabicRes.json();
      const englishData = await englishRes.json();
      setAyahs(arabicData.data.ayahs.map((ayah: Ayah, i: number) => ({ ...ayah, translation: englishData.data.ayahs[i]?.text || '' })));
    } catch {
      toast.error(tr('Failed to load surah', 'فشل تحميل السورة'));
    } finally { setLoading(false); }
  };

  const toggleBookmark = (key: string) => setBookmarks((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const goBack = () => {
    if (selectedSurah) { setSelectedSurah(null); setAyahs([]); }
    else router.back();
  };

  const filteredSurahs = surahs.filter((s) =>
    s.englishName.toLowerCase().includes(search.toLowerCase()) ||
    s.englishNameTranslation.toLowerCase().includes(search.toLowerCase()) ||
    s.name.includes(search) || s.number.toString() === search
  );

  if (authLoading) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header — back button always left in Arabic (row-reverse puts back on left, title on right) */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={goBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
            <Path d={isRTL ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
          📖 {selectedSurah ? (isRTL ? selectedSurah.name : selectedSurah.englishName) : tr('Quran', 'القرآن الكريم')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedSurah ? (
          <>
            {/* Pages read today */}
            <Card style={[styles.pagesCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.bigNum, { color: colors.gold }]}>{quranPages}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>
                  {tr("Today's pages", 'صفحات اليوم')} • {tr('Goal', 'الهدف')}: 20
                </Text>
              </View>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.pageBtn, { backgroundColor: colors.surface }]} onPress={() => addPages(-1)}>
                  <Text style={{ color: colors.text, fontSize: 18, fontFamily: FONT_UI_BOLD }}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pageBtn, { backgroundColor: colors.teal }]} onPress={() => addPages(1)}>
                  <Text style={{ color: '#04211C', fontSize: 18, fontFamily: FONT_UI_BOLD }}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pageBtn, { backgroundColor: colors.gold }]} onPress={() => addPages(5)}>
                  <Text style={{ color: '#1A1200', fontSize: 13, fontFamily: FONT_UI_BOLD }}>+5</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Search */}
            <TextInput
              placeholder={tr('Search surah by name or number...', 'ابحث عن سورة بالاسم أو الرقم...')}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              style={[styles.search, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
            />

            {/* Last read */}
            {lastRead && (
              <Card style={[styles.lastRead, { borderColor: colors.teal + '4D', backgroundColor: colors.teal + '14', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.teal, fontSize: 11, fontFamily: FONT_UI_MEDIUM, textAlign: isRTL ? 'right' : 'left' }}>{tr('Continue Reading', 'متابعة القراءة')}</Text>
                  <Text style={{ color: colors.text, fontSize: 15, fontFamily: FONT_UI_BOLD, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{lastRead.name}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.resumeBtn, { backgroundColor: colors.teal }]}
                  onPress={() => { const s = surahs.find((x) => x.number === lastRead.surah); if (s) loadSurah(s); }}
                >
                  <Text style={{ color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD }}>{tr('Resume', 'استئناف')}</Text>
                </TouchableOpacity>
              </Card>
            )}

            {/* Surah list */}
            {loading ? (
              <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
            ) : (
              <View style={{ gap: 8 }}>
                {filteredSurahs.map((surah) => (
                  <TouchableOpacity key={surah.number} activeOpacity={0.7} onPress={() => loadSurah(surah)}>
                    <Card style={[styles.surahRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.surahNum, { backgroundColor: colors.teal + '1A' }]}>
                        <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{surah.number}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.surahName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                          {language === 'ar' ? surah.name : surah.englishName}
                        </Text>
                        <Text style={[styles.surahSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                          {language === 'ar'
                            ? `${surah.numberOfAyahs} آيات • ${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}`
                            : `${surah.englishNameTranslation} • ${surah.numberOfAyahs} ayahs • ${surah.revelationType}`}
                        </Text>
                      </View>
                      <Text style={[styles.surahArabic, { color: colors.text }]}>
                        {language === 'ar' ? surah.englishName : surah.name}
                      </Text>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 14 }}>
            {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
              <Text style={[styles.bismillah, { color: colors.text }]}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
            )}
            {ayahs.map((ayah) => {
              const key = `${selectedSurah.number}:${ayah.numberInSurah}`;
              const isBookmarked = bookmarks.has(key);
              return (
                <Card key={ayah.number} style={isBookmarked ? { borderColor: colors.gold, backgroundColor: colors.gold + '14' } : undefined}>
                  <View style={[styles.ayahHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.ayahNum, { backgroundColor: colors.teal + '1A' }]}>
                      <Text style={{ color: colors.teal, fontSize: 11, fontFamily: FONT_UI_BOLD }}>{ayah.numberInSurah}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleBookmark(key)} hitSlop={8}>
                      <Text style={{ color: isBookmarked ? colors.gold : colors.textSecondary, fontSize: 20 }}>{isBookmarked ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.ayahArabic, { color: colors.text }]}>{ayah.text}</Text>
                  <Text style={[styles.ayahTrans, { color: colors.textSecondary }]}>{ayah.translation}</Text>
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
  header: { height: 56, alignItems: 'center', paddingHorizontal: 14, gap: 12, borderBottomWidth: 1 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: FONT_UI_BOLD, flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  search: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: FONT_UI, marginBottom: 14 },
  pagesCard: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  bigNum: { fontSize: 26, fontFamily: FONT_UI_BOLD },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lastRead: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  resumeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  surahRow: { alignItems: 'center', gap: 14 },
  surahNum: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  surahName: { fontSize: 15, fontFamily: FONT_UI_BOLD, alignSelf: 'stretch' },
  surahSub: { fontSize: 11, fontFamily: FONT_UI, marginTop: 2, alignSelf: 'stretch' },
  surahArabic: { fontSize: 18, fontFamily: FONT_ARABIC },
  bismillah: { textAlign: 'center', fontSize: 24, fontFamily: FONT_ARABIC, paddingVertical: 8, lineHeight: 44 },
  ayahHeader: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  ayahNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ayahArabic: { fontSize: 22, fontFamily: FONT_ARABIC, textAlign: 'right', lineHeight: 44, marginBottom: 10 },
  ayahTrans: { fontSize: 14, fontFamily: FONT_UI, lineHeight: 22 },
});
