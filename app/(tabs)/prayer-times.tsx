/**
 * Prayer Times — migrated from app/frontend/src/pages/PrayerTimes.tsx
 * - navigator.geolocation  → expo-location
 * - localStorage           → AsyncStorage
 * - sonner toast           → src/lib/toast
 * Same aladhan.com API (method=2), Mecca fallback, next-prayer countdown,
 * gradient hero card, progress bar, bilingual/RTL.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTimeFormat } from '../../src/contexts/TimeFormatContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Screen, Card, Button, GradientCard, ProgressBar } from '../../src/components/ui';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_BOLD, FONT_UI_MEDIUM, FONT_UI_BLACK } from '../../src/theme/fonts';

interface PrayerTime { name: string; time: string; icon: string; }

const PRAYER_NAMES_AR: Record<string, string> = {
  Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر',
  Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء',
};

export default function PrayerTimes() {
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const { formatTime } = useTimeFormat();
  const { colors } = useTheme();
  const router = useRouter();

  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; countdown: string } | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) router.replace('/(auth)/landing');
  }, [user, authLoading]);

  const updateNextPrayer = useCallback((prayerList: PrayerTime[]) => {
    const now = new Date();
    for (const prayer of prayerList) {
      const [hours, minutes] = prayer.time.split(':').map(Number);
      const prayerDate = new Date();
      prayerDate.setHours(hours, minutes, 0, 0);
      if (prayerDate > now) {
        const diff = prayerDate.getTime() - now.getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setNextPrayer({ name: prayer.name, time: prayer.time, countdown: `${h}h ${m}m` });
        return;
      }
    }
    const tomorrowLabel = language === 'ar' ? 'الفجر (غداً)' : 'Fajr (tomorrow)';
    setNextPrayer({ name: tomorrowLabel, time: prayerList[0]?.time || '', countdown: '' });
  }, [language]);

  const fetchPrayerTimes = useCallback(async (lat: number, lng: number) => {
    try {
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=2`
      );
      const data = await res.json();
      const timings = data.data.timings;
      setLocation(data.data.meta.timezone || (language === 'ar' ? 'موقعك' : 'Your Location'));

      const prayerList: PrayerTime[] = [
        { name: 'Fajr', time: timings.Fajr, icon: '🌅' },
        { name: 'Sunrise', time: timings.Sunrise, icon: '☀️' },
        { name: 'Dhuhr', time: timings.Dhuhr, icon: '🌤️' },
        { name: 'Asr', time: timings.Asr, icon: '⛅' },
        { name: 'Maghrib', time: timings.Maghrib, icon: '🌇' },
        { name: 'Isha', time: timings.Isha, icon: '🌙' },
      ];
      setPrayers(prayerList);
      updateNextPrayer(prayerList);
    } catch {
      toast.error(language === 'ar' ? 'فشل في تحميل مواقيت الصلاة' : 'Failed to fetch prayer times');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language, updateNextPrayer]);

  const loadByLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await fetchPrayerTimes(21.4225, 39.8262);
        toast.info(language === 'ar'
          ? 'يتم استخدام موقع مكة المكرمة. فعّل الموقع لنتائج دقيقة.'
          : 'Using default location (Mecca). Enable location for accurate times.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude);
    } catch {
      await fetchPrayerTimes(21.4225, 39.8262);
    }
  }, [fetchPrayerTimes, language]);

  useEffect(() => { loadByLocation(); }, []);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (prayers.length > 0) updateNextPrayer(prayers);
    }, 60000);
    return () => clearInterval(interval);
  }, [prayers, updateNextPrayer]);

  // Load completed from storage
  useEffect(() => {
    const today = new Date().toDateString();
    AsyncStorage.getItem(`prayer_completed_${today}`).then((saved) => {
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    });
  }, []);

  const toggleCompleted = (name: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      const today = new Date().toDateString();
      AsyncStorage.setItem(`prayer_completed_${today}`, JSON.stringify([...next]));
      return next;
    });
  };

  const onRefresh = () => { setRefreshing(true); loadByLocation(); };

  const getPrayerDisplayName = (name: string) =>
    language === 'ar' ? (PRAYER_NAMES_AR[name] || name) : name;

  if (authLoading || loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {language === 'ar' ? 'جاري تحميل مواقيت الصلاة...' : 'Loading prayer times...'}
        </Text>
      </View>
    );
  }

  const completedCount = [...completed].filter((n) => n !== 'Sunrise').length;

  return (
    <Screen
      icon="🕌"
      title={language === 'ar' ? 'مواقيت الصلاة' : 'Prayer Times'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Next prayer hero card */}
      {nextPrayer && (
        <GradientCard style={styles.heroCard}>
          <Text style={styles.heroLabel}>{language === 'ar' ? 'الصلاة القادمة' : 'Next Prayer'}</Text>
          <Text style={styles.heroName}>
            {language === 'ar' && PRAYER_NAMES_AR[nextPrayer.name] ? PRAYER_NAMES_AR[nextPrayer.name] : nextPrayer.name}
          </Text>
          <Text style={styles.heroTime}>{formatTime(nextPrayer.time)}</Text>
          {!!nextPrayer.countdown && (
            <Text style={styles.heroCountdown}>
              {language === 'ar' ? 'بعد' : 'in'} {nextPrayer.countdown}
            </Text>
          )}
        </GradientCard>
      )}

      {/* Location */}
      <Text style={[styles.location, { color: colors.textSecondary }]}>
        📍 {language === 'ar' ? 'الموقع:' : 'Location:'} {location}
      </Text>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {language === 'ar' ? 'تقدم اليوم: ' : "Today's Progress: "}
          <Text style={{ color: colors.green, fontFamily: FONT_UI_BOLD }}>{completedCount}/5</Text>
          {language === 'ar' ? ' صلوات مكتملة' : ' prayers completed'}
        </Text>
        <ProgressBar value={(completedCount / 5) * 100} color={colors.green} />
      </View>

      {/* Prayer list */}
      <View style={{ gap: 12 }}>
        {prayers.map((prayer) => {
          const done = completed.has(prayer.name);
          return (
            <Card
              key={prayer.name}
              style={[
                styles.prayerRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                done && { backgroundColor: colors.green + '22', borderColor: colors.green + '66' },
              ]}
            >
              <View style={[styles.prayerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: 26 }}>{prayer.icon}</Text>
                <View>
                  <Text style={[styles.prayerName, { color: done ? colors.green : colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {getPrayerDisplayName(prayer.name)}
                  </Text>
                  <Text style={[styles.prayerTime, { color: colors.textSecondary }]}>{formatTime(prayer.time)}</Text>
                </View>
              </View>
              {prayer.name !== 'Sunrise' && (
                <Button
                  size="sm"
                  variant={done ? 'default' : 'outline'}
                  title={done ? (language === 'ar' ? '✓ تم' : '✓ Done') : (language === 'ar' ? 'تسجيل' : 'Mark')}
                  onPress={() => toggleCompleted(prayer.name)}
                />
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontFamily: FONT_UI },
  heroCard: { alignItems: 'center', marginBottom: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: FONT_UI_MEDIUM },
  heroName: { color: '#fff', fontSize: 30, fontFamily: FONT_UI_BLACK, marginTop: 4 },
  heroTime: { color: '#fff', fontSize: 20, fontFamily: FONT_UI_BOLD, marginTop: 2 },
  heroCountdown: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 8, fontFamily: FONT_UI_MEDIUM },
  location: { fontSize: 13, textAlign: 'center', marginBottom: 14, fontFamily: FONT_UI },
  progressWrap: { marginBottom: 18, gap: 8 },
  progressText: { fontSize: 13, textAlign: 'center', fontFamily: FONT_UI },
  prayerRow: { alignItems: 'center', justifyContent: 'space-between' },
  prayerLeft: { alignItems: 'center', gap: 12 },
  prayerName: { fontSize: 16, fontFamily: FONT_UI_BOLD },
  prayerTime: { fontSize: 13, marginTop: 2, fontFamily: FONT_UI },
});
