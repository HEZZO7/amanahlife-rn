/**
 * Classic Search — searches across app content:
 * Duas (local), Adhkar (local), Islamic events (local), Quran surahs (alquran.cloud).
 * RTL-aware: input, results, and empty state all flip for Arabic.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRTL } from '../../src/hooks/useRTL';
import { PageHeader } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_ARABIC } from '../../src/theme/fonts';

// ── Static content to search ──────────────────────────────────────────────────

const DUAS_CONTENT = [
  { id: 'd1', type: 'dua', titleEn: 'Morning Dua', titleAr: 'دعاء الصباح', bodyEn: 'We have reached the morning and at this very time the whole kingdom belongs to Allah.', bodyAr: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ' },
  { id: 'd2', type: 'dua', titleEn: 'Before Sleep', titleAr: 'دعاء قبل النوم', bodyEn: 'In Your name, O Allah, I die and I live.', bodyAr: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا' },
  { id: 'd3', type: 'dua', titleEn: 'Protection Dua', titleAr: 'دعاء الحماية', bodyEn: 'In the name of Allah, with whose name nothing can harm.', bodyAr: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ' },
  { id: 'd4', type: 'dua', titleEn: 'For Anxiety', titleAr: 'دعاء القلق', bodyEn: 'O Allah, I seek refuge in You from worry and grief.', bodyAr: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ' },
  { id: 'd5', type: 'dua', titleEn: 'After Eating', titleAr: 'دعاء بعد الطعام', bodyEn: 'All praise is due to Allah who fed me this.', bodyAr: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا' },
];

const ADHKAR_CONTENT = [
  { id: 'a1', type: 'dhikr', titleEn: 'SubhanAllah', titleAr: 'سبحان الله', bodyEn: 'Glory be to Allah — recite 33 times after each prayer.', bodyAr: 'سُبْحَانَ اللَّهِ — ٣٣ مرة بعد كل صلاة' },
  { id: 'a2', type: 'dhikr', titleEn: 'Alhamdulillah', titleAr: 'الحمد لله', bodyEn: 'All praise is due to Allah — recite 33 times after each prayer.', bodyAr: 'الْحَمْدُ لِلَّهِ — ٣٣ مرة بعد كل صلاة' },
  { id: 'a3', type: 'dhikr', titleEn: 'Allahu Akbar', titleAr: 'الله أكبر', bodyEn: 'Allah is the Greatest — recite 33 times after each prayer.', bodyAr: 'اللَّهُ أَكْبَرُ — ٣٣ مرة بعد كل صلاة' },
  { id: 'a4', type: 'dhikr', titleEn: 'Astaghfirullah', titleAr: 'أستغفر الله', bodyEn: 'I seek forgiveness from Allah — recite 3 times after prayer.', bodyAr: 'أَسْتَغْفِرُ اللَّهَ — ٣ مرات بعد الصلاة' },
];

const EVENTS_CONTENT = [
  { id: 'e1', type: 'event', titleEn: 'Ramadan Begins', titleAr: 'بداية رمضان', bodyEn: 'Start of the blessed month of fasting — 28 Feb 2026.', bodyAr: 'بداية شهر الصيام المبارك — ٢٨ فبراير ٢٠٢٦' },
  { id: 'e2', type: 'event', titleEn: 'Eid al-Fitr', titleAr: 'عيد الفطر', bodyEn: 'Festival of Breaking the Fast — 30 Mar 2026.', bodyAr: 'عيد الفطر المبارك — ٣٠ مارس ٢٠٢٦' },
  { id: 'e3', type: 'event', titleEn: 'Eid al-Adha', titleAr: 'عيد الأضحى', bodyEn: 'Festival of Sacrifice — 5 Jun 2026.', bodyAr: 'عيد الأضحى المبارك — ٥ يونيو ٢٠٢٦' },
  { id: 'e4', type: 'event', titleEn: 'Day of Arafah', titleAr: 'يوم عرفة', bodyEn: 'Best day for dua and fasting — 4 Jun 2026.', bodyAr: 'أفضل يوم للدعاء والصيام — ٤ يونيو ٢٠٢٦' },
  { id: 'e5', type: 'event', titleEn: "Laylat al-Qadr", titleAr: 'ليلة القدر', bodyEn: 'Night of Power — better than 1000 months — 26 Mar 2026.', bodyAr: 'ليلة خير من ألف شهر — ٢٦ مارس ٢٠٢٦' },
];

const FINANCE_TIPS = [
  { id: 'f1', type: 'tip', titleEn: 'Halal Investment', titleAr: 'الاستثمار الحلال', bodyEn: 'Avoid interest-based products. Prefer equity funds screened for Sharia compliance.', bodyAr: 'تجنب المنتجات الربوية. افضّل صناديق الأسهم المتوافقة مع الشريعة.' },
  { id: 'f2', type: 'tip', titleEn: 'Zakat Reminder', titleAr: 'تذكير الزكاة', bodyEn: 'Zakat is 2.5% of wealth held above nisab for one lunar year.', bodyAr: 'الزكاة ٢.٥٪ من الثروة الفائقة للنصاب لمدة حول قمري.' },
  { id: 'f3', type: 'tip', titleEn: 'Sadaqah Jariyah', titleAr: 'الصدقة الجارية', bodyEn: 'Ongoing charity (sadaqah jariyah) continues to reward you after death.', bodyAr: 'الصدقة الجارية تستمر في الأجر بعد الوفاة.' },
];

const ALL_CONTENT = [...DUAS_CONTENT, ...ADHKAR_CONTENT, ...EVENTS_CONTENT, ...FINANCE_TIPS];

const TYPE_ICONS: Record<string, string> = { dua: '🤲', dhikr: '📿', event: '📅', tip: '💡' };
const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  dua: { en: 'Dua', ar: 'دعاء' }, dhikr: { en: 'Dhikr', ar: 'ذكر' },
  event: { en: 'Event', ar: 'حدث' }, tip: { en: 'Tip', ar: 'نصيحة' },
};

interface ResultItem { id: string; type: string; titleEn: string; titleAr: string; bodyEn: string; bodyAr: string; }

// ── Component ──────────────────────────────────────────────────────────────────

export default function ClassicSearch() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isRTL, rtlText, rtlView, language } = useRTL();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 180)); // visual feedback
    const lower = q.toLowerCase();
    const found = ALL_CONTENT.filter(item =>
      item.titleEn.toLowerCase().includes(lower) ||
      item.titleAr.includes(q) ||
      item.bodyEn.toLowerCase().includes(lower) ||
      item.bodyAr.includes(q) ||
      TYPE_LABELS[item.type].en.toLowerCase().includes(lower) ||
      TYPE_LABELS[item.type].ar.includes(q)
    );
    setResults(found);
    setSearched(true);
    setLoading(false);
  }, []);

  const renderItem = ({ item }: { item: ResultItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardHeader, rtlView as any]}>
        <View style={[styles.typeBadge, { backgroundColor: colors.teal + '20' }]}>
          <Text style={{ fontSize: 13 }}>{TYPE_ICONS[item.type]}</Text>
          <Text style={[styles.typeText, { color: colors.teal }]}>
            {isRTL ? TYPE_LABELS[item.type].ar : TYPE_LABELS[item.type].en}
          </Text>
        </View>
      </View>
      <Text style={[styles.cardTitle, { color: colors.text }, rtlText as any]}>
        {isRTL ? item.titleAr : item.titleEn}
      </Text>
      <Text style={[styles.cardBody, { color: colors.textSecondary }, rtlText as any]}>
        {isRTL ? item.bodyAr : item.bodyEn}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🔍" title={isRTL ? 'البحث الكلاسيكي' : 'Classic Search'} />

      <View style={[styles.inputWrap, { borderBottomColor: colors.border }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
          placeholder={isRTL ? 'ابحث في الأدعية والأذكار والأحداث...' : 'Search duas, adhkar, events, tips...'}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={q => { setQuery(q); doSearch(q); }}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query)}
          textAlign={isRTL ? 'right' : 'left'}
        />
        {loading && <ActivityIndicator color={colors.teal} style={{ position: 'absolute', right: isRTL ? undefined : 28, left: isRTL ? 28 : undefined }} />}
      </View>

      {!searched ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }, rtlText as any]}>
            {isRTL ? 'ابحث في المحتوى' : 'Search App Content'}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }, rtlText as any]}>
            {isRTL
              ? 'ابحث في الأدعية، الأذكار، الأحداث الإسلامية، والنصائح المالية'
              : 'Search across duas, adhkar, Islamic events, and finance tips'}
          </Text>
          <View style={styles.categoryRow}>
            {['🤲 Duas', '📿 Adhkar', '📅 Events', '💡 Tips'].map(c => (
              <View key={c} style={[styles.catChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔎</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }, rtlText as any]}>
            {isRTL ? 'لا نتائج' : 'No results'}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }, rtlText as any]}>
            {isRTL ? `لم يتم العثور على نتائج لـ "${query}"` : `No results found for "${query}"`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.countText, { color: colors.textSecondary }, rtlText as any]}>
              {isRTL ? `${results.length} نتيجة` : `${results.length} result${results.length !== 1 ? 's' : ''}`}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, position: 'relative' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: FONT_UI },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  countText: { fontSize: 12, fontFamily: FONT_UI, marginBottom: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardHeader: { marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  typeText: { fontSize: 11, fontFamily: FONT_UI_BOLD },


  cardBody: { fontSize: 13, fontFamily: FONT_UI, lineHeight: 20 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontFamily: FONT_UI_BOLD, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 14, fontFamily: FONT_UI, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
});
