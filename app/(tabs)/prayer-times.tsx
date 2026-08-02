/**
 * Prayer Times — migrated from app/frontend/src/pages/PrayerTimes.tsx.
 * Phase B (2026-08-02): prayer times are now computed fully offline via
 * adhan-js (src/lib/prayerCalculation.ts) instead of fetching
 * api.aladhan.com - no network call anywhere in this screen. Calculation
 * method is user-selectable (default Umm al-Qura, not the previous
 * hardcoded ISNA). Location is either automatic (GPS, with a timeout that
 * falls back to last-known-location then Mecca) or manually picked from a
 * curated city list (src/data/curatedCities.ts) - see PROJECT.md 0c-6.
 * localStorage → AsyncStorage, sonner toast → src/lib/toast.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTimeFormat } from '../../src/contexts/TimeFormatContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Screen, Card, Button, GradientCard, ProgressBar } from '../../src/components/ui';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_BOLD, FONT_UI_MEDIUM, FONT_UI_BLACK } from '../../src/theme/fonts';
import {
  calculatePrayerTimes, CALCULATION_METHODS, DEFAULT_CALCULATION_METHOD, CalculationMethodKey,
} from '../../src/lib/prayerCalculation';
import { CURATED_CITIES, CityOption } from '../../src/data/curatedCities';
import ExcusedPeriodsModal from '../../src/components/ExcusedPeriodsModal';

const MECCA_COORDS = { latitude: 21.4225, longitude: 39.8262 };
const GPS_TIMEOUT_MS = 10000;
const CALC_METHOD_KEY = 'prayer_calc_method';
const LOCATION_MODE_KEY = 'prayer_location_mode';
const MANUAL_CITY_KEY = 'prayer_manual_city';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('location-timeout')), ms)),
  ]);
}

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
  const userId = user?.id ?? null;

  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<string>('');
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; countdown: string } | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const [calcMethod, setCalcMethod] = useState<CalculationMethodKey>(DEFAULT_CALCULATION_METHOD);
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [manualCity, setManualCity] = useState<CityOption | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'location' | 'method'>('location');
  const [citySearch, setCitySearch] = useState('');
  const [excusedModalOpen, setExcusedModalOpen] = useState(false);

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

  const computePrayerTimes = useCallback((lat: number, lng: number, locationLabel: string, method: CalculationMethodKey) => {
    try {
      const timings = calculatePrayerTimes(lat, lng, new Date(), method);
      setLocation(locationLabel);
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateNextPrayer]);

  const loadByLocation = useCallback(async (method: CalculationMethodKey, mode: 'auto' | 'manual', city: CityOption | null) => {
    if (mode === 'manual' && city) {
      computePrayerTimes(city.lat, city.lon, language === 'ar' ? city.nameAr : city.name, method);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        computePrayerTimes(MECCA_COORDS.latitude, MECCA_COORDS.longitude, language === 'ar' ? 'مكة المكرمة (افتراضي)' : 'Mecca (default)', method);
        toast.info(language === 'ar'
          ? 'يتم استخدام موقع مكة المكرمة. فعّل الموقع لنتائج دقيقة، أو اختر مدينتك يدوياً.'
          : 'Using default location (Mecca). Enable location for accurate times, or set your city manually.');
        return;
      }
      const pos = await withTimeout(Location.getCurrentPositionAsync({}), GPS_TIMEOUT_MS);
      computePrayerTimes(pos.coords.latitude, pos.coords.longitude, language === 'ar' ? 'موقعك الحالي' : 'Your location', method);
    } catch {
      // GPS hung or failed (no timeout existed here before - a stuck GPS
      // fix used to hang this screen indefinitely). Try the last-known fix
      // before falling all the way back to Mecca.
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          computePrayerTimes(last.coords.latitude, last.coords.longitude, language === 'ar' ? 'آخر موقع معروف' : 'Last known location', method);
          return;
        }
      } catch { /* fall through to Mecca */ }
      computePrayerTimes(MECCA_COORDS.latitude, MECCA_COORDS.longitude, language === 'ar' ? 'مكة المكرمة (افتراضي)' : 'Mecca (default)', method);
    }
  }, [computePrayerTimes, language]);

  useEffect(() => {
    (async () => {
      await migrateLegacyKeyIfNeeded(CALC_METHOD_KEY, userId);
      await migrateLegacyKeyIfNeeded(LOCATION_MODE_KEY, userId);
      await migrateLegacyKeyIfNeeded(MANUAL_CITY_KEY, userId);
      const [savedMethod, savedMode, savedCity] = await Promise.all([
        getUserItem(CALC_METHOD_KEY, userId),
        getUserItem(LOCATION_MODE_KEY, userId),
        getUserItem(MANUAL_CITY_KEY, userId),
      ]);
      const method = (savedMethod as CalculationMethodKey) || DEFAULT_CALCULATION_METHOD;
      const mode = savedMode === 'manual' ? 'manual' : 'auto';
      const city = savedCity ? (JSON.parse(savedCity) as CityOption) : null;
      setCalcMethod(method);
      setLocationMode(mode);
      setManualCity(city);
      loadByLocation(method, mode, city);
    })();
  }, [userId]);

  const applyLocationMode = (mode: 'auto' | 'manual', city: CityOption | null) => {
    setLocationMode(mode);
    setManualCity(city);
    setUserItem(LOCATION_MODE_KEY, userId, mode);
    if (city) setUserItem(MANUAL_CITY_KEY, userId, JSON.stringify(city));
    setLoading(true);
    loadByLocation(calcMethod, mode, city);
  };

  const applyCalcMethod = (method: CalculationMethodKey) => {
    setCalcMethod(method);
    setUserItem(CALC_METHOD_KEY, userId, method);
    setLoading(true);
    loadByLocation(method, locationMode, manualCity);
  };

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (prayers.length > 0) updateNextPrayer(prayers);
    }, 60000);
    return () => clearInterval(interval);
  }, [prayers, updateNextPrayer]);

  // Load completed from storage — was raw, unscoped AsyncStorage before
  // (a privacy gap: any account signed in on this device could see/edit
  // another account's prayer record). Now scoped per user, same
  // getUserItem/setUserItem/migrateLegacyKeyIfNeeded pattern as Phase 1.
  // This is the OWNER of prayer_completed_<date> (the only file that writes
  // it) - weekly-life-score.tsx and DashboardScreen.tsx only read it.
  useEffect(() => {
    const today = new Date().toDateString();
    const key = `prayer_completed_${today}`;
    migrateLegacyKeyIfNeeded(key, userId).then(() => {
      getUserItem(key, userId).then((saved) => {
        if (saved) setCompleted(new Set(JSON.parse(saved)));
        else setCompleted(new Set());
      });
    });
  }, [userId]);

  const toggleCompleted = (name: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      const today = new Date().toDateString();
      setUserItem(`prayer_completed_${today}`, userId, JSON.stringify([...next]));
      return next;
    });
  };

  const onRefresh = () => { setRefreshing(true); loadByLocation(calcMethod, locationMode, manualCity); };

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
      headerRight={
        <TouchableOpacity
          onPress={() => setSettingsOpen(true)}
          style={[styles.settingsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
        </TouchableOpacity>
      }
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

      {/* Location - tap to open the same settings sheet */}
      <TouchableOpacity onPress={() => setSettingsOpen(true)}>
        <Text style={[styles.location, { color: colors.textSecondary }]}>
          📍 {language === 'ar' ? 'الموقع:' : 'Location:'} {location}
        </Text>
      </TouchableOpacity>

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

      {/* Discreet entry point - no dashboard tile, no notification about it. */}
      <TouchableOpacity onPress={() => setExcusedModalOpen(true)} style={{ alignSelf: 'center', marginTop: 18 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: FONT_UI }}>
          {language === 'ar' ? 'عذر شرعي' : 'Excused period'}
        </Text>
      </TouchableOpacity>
      <ExcusedPeriodsModal visible={excusedModalOpen} onClose={() => setExcusedModalOpen(false)} />

      {/* Location + calculation-method settings sheet */}
      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.bg }]}>
            <View style={[styles.modalTabRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.modalTab, settingsTab === 'location' && { borderBottomColor: colors.teal, borderBottomWidth: 2 }]}
                onPress={() => setSettingsTab('location')}
              >
                <Text style={{ color: settingsTab === 'location' ? colors.teal : colors.textSecondary, fontFamily: FONT_UI_BOLD, fontSize: 13 }}>
                  {language === 'ar' ? 'الموقع' : 'Location'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, settingsTab === 'method' && { borderBottomColor: colors.teal, borderBottomWidth: 2 }]}
                onPress={() => setSettingsTab('method')}
              >
                <Text style={{ color: settingsTab === 'method' ? colors.teal : colors.textSecondary, fontFamily: FONT_UI_BOLD, fontSize: 13 }}>
                  {language === 'ar' ? 'طريقة الحساب' : 'Calculation Method'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSettingsOpen(false)} style={{ marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0, padding: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {settingsTab === 'location' ? (
              <View style={{ flex: 1 }}>
                <View style={[styles.modeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.modeBtn, { borderColor: colors.border }, locationMode === 'auto' && { backgroundColor: colors.teal, borderColor: colors.teal }]}
                    onPress={() => applyLocationMode('auto', manualCity)}
                  >
                    <Text style={{ color: locationMode === 'auto' ? '#04211C' : colors.text, fontFamily: FONT_UI_BOLD, fontSize: 13 }}>
                      {language === 'ar' ? '📡 تلقائي (GPS)' : '📡 Automatic (GPS)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeBtn, { borderColor: colors.border }, locationMode === 'manual' && { backgroundColor: colors.teal, borderColor: colors.teal }]}
                    onPress={() => manualCity && applyLocationMode('manual', manualCity)}
                  >
                    <Text style={{ color: locationMode === 'manual' ? '#04211C' : colors.text, fontFamily: FONT_UI_BOLD, fontSize: 13 }}>
                      {language === 'ar' ? '🏙️ يدوي' : '🏙️ Manual'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  placeholder={language === 'ar' ? 'ابحث عن مدينة...' : 'Search for a city...'}
                  placeholderTextColor={colors.textMuted}
                  value={citySearch}
                  onChangeText={setCitySearch}
                  style={[styles.search, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                />
                <ScrollView style={{ flex: 1 }}>
                  {CURATED_CITIES.filter((c) =>
                    !citySearch ||
                    c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
                    c.nameAr.includes(citySearch) ||
                    c.country.toLowerCase().includes(citySearch.toLowerCase())
                  ).map((c) => (
                    <TouchableOpacity
                      key={`${c.name}-${c.countryCode}`}
                      style={[styles.cityRow, { borderBottomColor: colors.border }]}
                      onPress={() => { applyLocationMode('manual', c); setSettingsOpen(false); }}
                    >
                      <Text style={{ color: colors.text, fontFamily: FONT_UI_MEDIUM, fontSize: 14 }}>
                        {language === 'ar' ? c.nameAr : c.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{c.country}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {CALCULATION_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.methodRow, { borderBottomColor: colors.border }]}
                    onPress={() => { applyCalcMethod(m.key); setSettingsOpen(false); }}
                  >
                    <Text style={{ color: calcMethod === m.key ? colors.teal : colors.text, fontFamily: calcMethod === m.key ? FONT_UI_BOLD : FONT_UI_MEDIUM, fontSize: 14, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>
                      {language === 'ar' ? m.labelAr : m.labelEn}
                    </Text>
                    {calcMethod === m.key && <Text style={{ color: colors.teal }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  settingsBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { height: '75%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalTabRow: { alignItems: 'center', marginBottom: 14 },
  modalTab: { paddingVertical: 8, paddingHorizontal: 12, marginRight: 4 },
  modeRow: { gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  search: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONT_UI, marginBottom: 10 },
  cityRow: { paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  methodRow: { paddingVertical: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
