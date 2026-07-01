/**
 * Dashboard / Home Screen
 * Migrated from app/frontend/src/pages/Index.tsx
 * - Replaces navigator.geolocation with expo-location
 * - Replaces localStorage with AsyncStorage
 * - Replaces react-router navigate with expo-router
 * - Uses aladhan.com API (same as web app)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useRTL } from '../hooks/useRTL';

const DAILY_VERSES = [
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', translation: 'Indeed, with hardship comes ease.', reference: 'Quran 94:6' },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', translation: 'Whoever relies upon Allah - then He is sufficient for him.', reference: 'Quran 65:3' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', translation: 'So remember Me; I will remember you.', reference: 'Quran 2:152' },
  { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', translation: 'Your Lord is going to give you, and you will be satisfied.', reference: 'Quran 93:5' },
  { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي', translation: 'My Lord, expand for me my chest with assurance.', reference: 'Quran 20:25' },
  { arabic: 'وَقُل رَّبِّ زِدْنِي عِلْمًا', translation: 'My Lord, increase me in knowledge.', reference: 'Quran 20:114' },
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', translation: 'Indeed, Allah is with the patient.', reference: 'Quran 2:153' },
];

interface HijriInfo { day: string; month: string; year: string; }
interface NextPrayer { name: string; time: string; }

export default function DashboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { colors, toggleTheme } = useTheme();
  const { rtlView, rtlText } = useRTL();
  const router = useRouter();

  const [hijriDate, setHijriDate] = useState<HijriInfo | null>(null);
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyVerse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];

  // Redirect to landing if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/landing');
    }
  }, [user, authLoading]);

  // Fetch Hijri date — re-runs when language changes so month name is in correct language
  const fetchHijri = useCallback(async () => {
    try {
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const res = await fetch(`https://api.aladhan.com/v1/gToH/${dateStr}`);
      const data = await res.json();
      setHijriDate({
        day: data.data.hijri.day,
        month: language === 'ar' ? data.data.hijri.month.ar : data.data.hijri.month.en,
        year: data.data.hijri.year,
      });
    } catch {}
  }, [language]);

  // Fetch prayer times — same API as web app, uses expo-location
  const fetchPrayerTimes = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&method=2`
      );
      const data = await res.json();
      const timings = data.data.timings;
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const now = new Date();
      for (const name of prayers) {
        const [h, m] = timings[name].split(':').map(Number);
        const prayerTime = new Date();
        prayerTime.setHours(h, m, 0, 0);
        if (prayerTime > now) {
          setNextPrayer({ name, time: timings[name] });
          return;
        }
      }
      setNextPrayer({ name: 'Fajr', time: timings.Fajr });
    } catch {}
  }, []);

  // Calculate streak from AsyncStorage (replacing localStorage)
  const calcStreak = useCallback(async () => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `prayer_completed_${d.toDateString()}`;
      const val = await AsyncStorage.getItem(key);
      if (val) {
        const completed = JSON.parse(val);
        if (completed.length >= 1) { s++; } else { break; }
      } else {
        if (i === 0) continue;
        break;
      }
    }
    setStreak(s);
  }, []);

  useEffect(() => {
    fetchHijri();
    fetchPrayerTimes();
    calcStreak();
  }, [fetchHijri]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHijri(), fetchPrayerTimes(), calcStreak()]);
    setRefreshing(false);
  }, []);

  if (authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const greeting = language === 'ar' ? 'السلام عليكم' : 'Assalamu Alaikum';

  // All nav items — exact same list as web app
  const NAV_ITEMS = [
    { icon: '🕌', title: language === 'ar' ? 'الصلاة' : 'Prayer', path: '/(tabs)/prayer-times' },
    { icon: '📖', title: language === 'ar' ? 'القرآن' : 'Quran', path: '/(tabs)/quran' },
    { icon: '🤲', title: language === 'ar' ? 'الدعاء' : 'Duas', path: '/(tabs)/duas' },
    { icon: '🔢', title: language === 'ar' ? 'الذكر' : 'Dhikr', path: '/(tabs)/dhikr' },
    { icon: '⏱️', title: language === 'ar' ? 'الصيام' : 'Fasting', path: '/(tabs)/fasting' },
    { icon: '✅', title: language === 'ar' ? 'المهام' : 'Tasks', path: '/(tabs)/tasks' },
    { icon: '📿', title: language === 'ar' ? 'الأذكار' : 'Adhkar', path: '/(tabs)/adhkar' },
    { icon: '💰', title: language === 'ar' ? 'المالية' : 'Finance', path: '/(tabs)/finance' },
    { icon: '🧭', title: language === 'ar' ? 'القبلة' : 'Qibla', path: '/(tabs)/qibla' },
    { icon: '💎', title: language === 'ar' ? 'الزكاة' : 'Zakat', path: '/(tabs)/giving-tracker' },
    { icon: '📅', title: language === 'ar' ? 'التقويم' : 'Calendar', path: '/(tabs)/calendar' },
    { icon: '🎯', title: language === 'ar' ? 'الأهداف' : 'Goals', path: '/(tabs)/goals' },
    { icon: '💚', title: language === 'ar' ? 'العافية' : 'Wellness', path: '/(tabs)/wellness' },
    { icon: '📋', title: language === 'ar' ? 'المخطط' : 'Planner', path: '/(tabs)/planner' },
    { icon: '🤖', title: language === 'ar' ? 'المدرب الذكي' : 'AI Coach', path: '/(tabs)/ai-life-coach' },
    { icon: '💯', title: language === 'ar' ? 'مؤشر الحياة' : 'Life Score', path: '/(tabs)/weekly-life-score' },
    { icon: '🌙', title: language === 'ar' ? 'رمضان' : 'Ramadan', path: '/(tabs)/ramadan-planner' },
    { icon: '📊', title: language === 'ar' ? 'التحليلات' : 'Analytics', path: '/(tabs)/progress-analytics' },
    { icon: '🏠', title: language === 'ar' ? 'الميزانية' : 'Family Budget', path: '/(tabs)/family-budget' },
    { icon: '⚙️', title: language === 'ar' ? 'الإعدادات' : 'Settings', path: '/(tabs)/settings' },
  ];

  const filtered = NAV_ITEMS.filter(i =>
    !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
    >
      {/* Header */}
      <View style={[styles.header, rtlView as any]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textSecondary }, rtlText as any]}>
            {greeting} 👋
          </Text>
          <Text style={[styles.name, { color: colors.text }, rtlText as any]}>
            {userName} {hijriDate && `· ${hijriDate.day} ${hijriDate.month} ${hijriDate.year}${language === 'ar' ? 'هـ' : 'H'}`}
          </Text>
        </View>
      </View>

      {/* Daily verse */}
      <View style={[styles.verseCard, {
        backgroundColor: colors.card,
        borderColor: colors.teal + '40',
        borderLeftWidth: isRTL ? 1 : 3,
        borderRightWidth: isRTL ? 3 : 1,
      }]}>
        <Text style={[styles.verseLabel, { color: colors.teal }, rtlText as any]}>
          {language === 'ar' ? 'آية اليوم' : 'Verse of the Day'}
        </Text>
        <Text style={[styles.verseArabic, { color: colors.text }]}>{dailyVerse.arabic}</Text>
        <Text style={[styles.verseTranslation, { color: colors.textSecondary }, rtlText as any]}>{dailyVerse.translation}</Text>
        <Text style={[styles.verseRef, { color: colors.teal }, rtlText as any]}>{dailyVerse.reference}</Text>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, rtlView as any]}>
        {/* Next prayer */}
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/prayer-times')}
        >
          <Text style={{ fontSize: 22, marginBottom: 4 }}>🕌</Text>
          <Text style={[styles.statValue, { color: colors.teal }]}>
            {nextPrayer ? nextPrayer.time : '--:--'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {nextPrayer
              ? (language === 'ar' ? ({ Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء' }[nextPrayer.name] || nextPrayer.name)
                : nextPrayer.name)
              : (language === 'ar' ? 'الصلاة القادمة' : 'Next Prayer')}
          </Text>
        </TouchableOpacity>

        {/* Streak */}
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/prayer-times')}
        >
          <Text style={{ fontSize: 22, marginBottom: 4 }}>🔥</Text>
          <Text style={[styles.statValue, { color: colors.gold }]}>{streak}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'ar' ? 'أيام متتابعة' : 'Day Streak'}
          </Text>
        </TouchableOpacity>

        {/* Finance shortcut */}
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/finance')}
        >
          <Text style={{ fontSize: 22, marginBottom: 4 }}>💰</Text>
          <Text style={[styles.statValue, { color: colors.green }]}>
            {language === 'ar' ? 'المالية' : 'Finance'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'ar' ? 'اضغط للدخول' : 'Tap to open'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search — icon on RIGHT in Arabic, placeholder right-aligned */}
      <View style={[styles.searchBar, {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }]}>
        <Text style={{ color: colors.textSecondary, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>🔍</Text>
        <TextInput
          style={[styles.searchInput, {
            color: colors.text,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }]}
          placeholder={language === 'ar' ? 'ابحث في الميزات...' : 'Search features...'}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      {/* All features grid */}
      <View style={{ width: '100%' }}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', width: '100%' }]}>
          {language === 'ar' ? 'كل الميزات' : 'ALL FEATURES'}
        </Text>
      </View>
      <View style={[styles.grid, isRTL ? { flexDirection: 'row-reverse', flexWrap: 'wrap' } : {}]}>
        {filtered.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(item.path as any)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 26, marginBottom: 6 }}>{item.icon}</Text>
            <Text style={[styles.gridLabel, { color: colors.text }]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  name: { fontSize: 20, fontWeight: '800' },
  themeBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  verseCard: { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderLeftWidth: 3 },
  verseLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  verseArabic: { fontSize: 20, fontFamily: 'serif', lineHeight: 34, textAlign: 'right', marginBottom: 8 },
  verseTranslation: { fontSize: 13, lineHeight: 20, marginBottom: 6, fontStyle: 'italic' },
  verseRef: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', marginBottom: 2, textAlign: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  searchBar: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '30%', borderRadius: 16, padding: 14, borderWidth: 1, alignItems: 'center', minHeight: 90, justifyContent: 'center' },
  gridLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 2 },
});
