/**
 * Dashboard / Home Screen
 * Migrated from app/frontend/src/pages/Index.tsx plus its SmartBriefing,
 * DuaOfTheDay, MotivationalQuote, and Streaks components — mirrored here
 * in the same section order since RN has no equivalent shared components.
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
import * as Notifications from 'expo-notifications';
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

// Mirrors web MotivationalQuote.tsx QUOTES pool exactly (islamic + motivational mix)
const DAILY_INSPIRATION_QUOTES = [
  { arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', english: 'Indeed, with hardship comes ease.', source: 'Quran 94:6', sourceAr: 'القرآن ٩٤:٦' },
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', english: 'Whoever relies upon Allah – then He is sufficient for him.', source: 'Quran 65:3', sourceAr: 'القرآن ٦٥:٣' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ', english: 'So remember Me; I will remember you.', source: 'Quran 2:152', sourceAr: 'القرآن ٢:١٥٢' },
  { arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', english: 'And your Lord is going to give you, and you will be satisfied.', source: 'Quran 93:5', sourceAr: 'القرآن ٩٣:٥' },
  { arabic: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', english: 'Indeed, Allah does not allow to be lost the reward of those who do good.', source: 'Quran 9:120', sourceAr: 'القرآن ٩:١٢٠' },
  { arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', english: 'The best among you are those who learn the Quran and teach it.', source: 'Sahih al-Bukhari', sourceAr: 'صحيح البخاري' },
  { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', english: 'Actions are judged by intentions.', source: 'Sahih al-Bukhari & Muslim', sourceAr: 'متفق عليه' },
  { arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ', english: 'Whoever takes a path seeking knowledge, Allah will ease for him a path to Paradise.', source: 'Sahih Muslim', sourceAr: 'صحيح مسلم' },
  { arabic: 'الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ', english: 'The strong believer is better and more beloved to Allah than the weak believer.', source: 'Sahih Muslim', sourceAr: 'صحيح مسلم' },
  { arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا', english: 'Allah does not burden a soul beyond that it can bear.', source: 'Quran 2:286', sourceAr: 'القرآن ٢:٢٨٦' },
  { arabic: 'النجاح ليس نهائيًا، والفشل ليس قاتلًا: إنها الشجاعة للاستمرار هي ما يهم.', english: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', source: 'Winston Churchill', sourceAr: 'ونستون تشرشل' },
  { arabic: 'الطريقة الوحيدة للقيام بعمل عظيم هي أن تحب ما تفعله.', english: 'The only way to do great work is to love what you do.', source: 'Steve Jobs', sourceAr: 'ستيف جوبز' },
  { arabic: 'لا تنتظر الفرصة، بل اصنعها.', english: "Don't wait for opportunity. Create it.", source: 'George Bernard Shaw', sourceAr: 'جورج برنارد شو' },
  { arabic: 'كل يوم هو فرصة جديدة لتغيير حياتك.', english: 'Every day is a new opportunity to change your life.', source: 'Unknown', sourceAr: 'مجهول' },
  { arabic: 'الانضباط هو الجسر بين الأهداف والإنجاز.', english: 'Discipline is the bridge between goals and accomplishment.', source: 'Jim Rohn', sourceAr: 'جيم رون' },
  { arabic: 'ابدأ من حيث أنت. استخدم ما لديك. افعل ما تستطيع.', english: 'Start where you are. Use what you have. Do what you can.', source: 'Arthur Ashe', sourceAr: 'آرثر آش' },
  { arabic: 'الاتساق أهم من الكمال.', english: 'Consistency is more important than perfection.', source: 'Unknown', sourceAr: 'مجهول' },
  { arabic: 'خطط ليومك وإلا سيخطط لك أحد آخر.', english: 'Plan your day or someone else will plan it for you.', source: 'Jim Rohn', sourceAr: 'جيم رون' },
  { arabic: 'التقدم الصغير كل يوم يؤدي إلى نتائج كبيرة.', english: 'Small daily progress leads to big results.', source: 'Unknown', sourceAr: 'مجهول' },
  { arabic: 'أنت لا تحتاج أن تكون عظيمًا لتبدأ، لكنك تحتاج أن تبدأ لتكون عظيمًا.', english: "You don't have to be great to start, but you have to start to be great.", source: 'Zig Ziglar', sourceAr: 'زيج زيجلار' },
];

// Mirrors web SmartBriefing.tsx quotes pool exactly
const BRIEFING_QUOTES = [
  { ar: 'إن الله لا يضيع أجر المحسنين', en: 'Indeed, Allah does not allow to be lost the reward of those who do good.', source: 'Quran 9:120' },
  { ar: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا', en: 'Whoever fears Allah, He will make a way out for him.', source: 'Quran 65:2' },
  { ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'For indeed, with hardship will be ease.', source: 'Quran 94:5' },
  { ar: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ', en: 'And cooperate in righteousness and piety.', source: 'Quran 5:2' },
  { ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً', en: 'Our Lord, give us good in this world.', source: 'Quran 2:201' },
  { ar: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ', en: 'Do not despair of the mercy of Allah.', source: 'Quran 12:87' },
  { ar: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ', en: 'Actions are judged by intentions.', source: 'Hadith - Bukhari' },
];

// Mirrors web DuaOfTheDay.tsx duas pool exactly
const DUAS = [
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan waqina adhaban-nar', english: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the torment of the Fire.' },
  { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', transliteration: 'Rabbi-shrah li sadri wa yassir li amri', english: 'My Lord, expand for me my chest and ease for me my task.' },
  { arabic: 'رَبِّ زِدْنِي عِلْمًا', transliteration: 'Rabbi zidni ilma', english: 'My Lord, increase me in knowledge.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ', transliteration: "Allahumma inni a'udhu bika minal-hammi wal-hazan", english: 'O Allah, I seek refuge in You from worry and grief.' },
  { arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ', transliteration: 'Hasbiyallahu la ilaha illa Huwa, alayhi tawakkaltu', english: 'Sufficient for me is Allah; there is no deity except Him. On Him I have relied.' },
  { arabic: 'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي', transliteration: 'Allahumma-hdini wa saddidni', english: 'O Allah, guide me and keep me on the right path.' },
  { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا', transliteration: "Rabbana la tuzigh quloobana ba'da idh hadaytana", english: 'Our Lord, let not our hearts deviate after You have guided us.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', transliteration: "Allahumma inni as'alukal-'afiyah fid-dunya wal-akhirah", english: 'O Allah, I ask You for well-being in this world and the Hereafter.' },
  { arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ', transliteration: "Rabbi awzi'ni an ashkura ni'mataka", english: 'My Lord, enable me to be grateful for Your favor.' },
  { arabic: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي', transliteration: "Allahumma aslih li dini alladhi huwa 'ismatu amri", english: 'O Allah, set right my religion which is the safeguard of my affairs.' },
  { arabic: 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَارْزُقْنِي', transliteration: 'Allahumma-ghfir li warhamni wahdini warzuqni', english: 'O Allah, forgive me, have mercy on me, guide me, and provide for me.' },
  { arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ', transliteration: "Rabbana hab lana min azwajina wa dhurriyyatina qurrata a'yun", english: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', transliteration: "Allahumma inni as'alukal-huda wat-tuqa wal-'afafa wal-ghina", english: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.' },
  { arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي', transliteration: "Rabbij-'alni muqimas-salati wa min dhurriyyati", english: 'My Lord, make me an establisher of prayer, and from my descendants.' },
  { arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِي رِزْقِنَا', transliteration: 'Allahumma barik lana fi rizqina', english: 'O Allah, bless us in our provision.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ', transliteration: "Allahumma inni a'udhu bika min 'ilmin la yanfa'", english: 'O Allah, I seek refuge in You from knowledge that does not benefit.' },
  { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', transliteration: "Rabbana taqabbal minna innaka antas-Sami'ul-'Alim", english: 'Our Lord, accept from us. Indeed You are the Hearing, the Knowing.' },
  { arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', transliteration: "Allahumma a'inni 'ala dhikrika wa shukrika wa husni 'ibadatik", english: 'O Allah, help me to remember You, thank You, and worship You well.' },
  { arabic: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا', transliteration: 'Rabbana-ghfir lana dhunubana wa israfana fi amrina', english: 'Our Lord, forgive us our sins and our excesses in our affairs.' },
  { arabic: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا', transliteration: "Allahummaj-'al fi qalbi nura", english: 'O Allah, place light in my heart.' },
  { arabic: 'رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنتَ خَيْرُ الْوَارِثِينَ', transliteration: 'Rabbi la tadhrani fardan wa anta khayrul-warithin', english: 'My Lord, do not leave me alone, and You are the best of inheritors.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ', transliteration: "Allahumma inni as'aluka khayra hadhal-yawm", english: 'O Allah, I ask You for the good of this day.' },
  { arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ', transliteration: "Allahummak-fini bi halalika 'an haramik", english: 'O Allah, suffice me with what You have made lawful over what You have made unlawful.' },
  { arabic: 'رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ', transliteration: 'Rabbana amanna faghfir lana warhamna wa anta khayrur-rahimin', english: 'Our Lord, we have believed, so forgive us and have mercy upon us, and You are the best of the merciful.' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكَسَلِ وَالْهَرَمِ', transliteration: 'Allahumma inni a\'udhu bika minal-kasali wal-haram', english: 'O Allah, I seek refuge in You from laziness and old age.' },
  { arabic: 'رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ', transliteration: 'Rabbi hab li hukman wa alhiqni bis-salihin', english: 'My Lord, grant me authority and join me with the righteous.' },
  { arabic: 'اللَّهُمَّ ثَبِّتْنِي وَاجْعَلْنِي هَادِيًا مَهْدِيًّا', transliteration: "Allahumma thabbitni waj'alni hadiyan mahdiyya", english: 'O Allah, make me steadfast and make me a guide who is rightly guided.' },
  { arabic: 'رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ', transliteration: "Rabbana afrigh 'alayna sabran wa tawaffana muslimin", english: 'Our Lord, pour upon us patience and let us die as Muslims.' },
  { arabic: 'اللَّهُمَّ يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', transliteration: "Allahumma ya muqallibal-qulub thabbit qalbi 'ala dinik", english: 'O Allah, Turner of hearts, keep my heart firm upon Your religion.' },
  { arabic: 'رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ', transliteration: 'Rabbi adkhilni mudkhala sidqin wa akhrijni mukhraja sidq', english: 'My Lord, cause me to enter a sound entrance and cause me to exit a sound exit.' },
  { arabic: 'اللَّهُمَّ اجْعَلْنِي شَكُورًا لَكَ ذَكَّارًا لَكَ', transliteration: "Allahummaj-'alni shakuran laka dhakkaran lak", english: 'O Allah, make me grateful to You, always remembering You.' },
];

const LEVEL_TITLES_EN = ['Beginner', 'Seeker', 'Devoted', 'Scholar', 'Master'];
const LEVEL_TITLES_AR = ['مبتدئ', 'باحث', 'متعبد', 'عالم', 'متقن'];

const DUA_NOTIF_KEY = 'amanah-dua-notifications';

interface HijriInfo { day: string; month: string; year: string; }
interface NextPrayer { name: string; time: string; }
interface DailySummary { tasksDone: number; tasksTotal: number; prayersDone: number; activeGoals: number; balance: number; overdueCount: number; }
interface StreakData { appStreak: number; prayerStreak: number; quranStreak: number; savingsStreak: number; xp: number; level: number; title: string; badges: { icon: string; name: string; earned: boolean }[]; }
interface BriefingData { greeting: string; dailySpending: number; dailyBudget: number; streak: number; tasksCount: number; quote: { text: string; source: string }; }

export default function DashboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { rtlView, rtlText } = useRTL();
  const router = useRouter();

  const [hijriDate, setHijriDate] = useState<HijriInfo | null>(null);
  const [nextPrayer, setNextPrayer] = useState<NextPrayer | null>(null);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dailySummary, setDailySummary] = useState<DailySummary>({ tasksDone: 0, tasksTotal: 0, prayersDone: 0, activeGoals: 0, balance: 0, overdueCount: 0 });
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [duaNotifEnabled, setDuaNotifEnabled] = useState(false);
  const [dhikrToday, setDhikrToday] = useState(0);

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyVerse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  const inspirationQuote = DAILY_INSPIRATION_QUOTES[dayOfYear % DAILY_INSPIRATION_QUOTES.length];
  const todaysDua = DUAS[dayOfYear % DUAS.length];

  // Redirect to landing if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/landing');
    }
  }, [user, authLoading]);

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

  // Daily summary — Tasks/Prayer/Goals/Savings, mirrors web dailySummary useMemo
  const loadDailySummary = useCallback(async () => {
    const [tasksRaw, prayerRaw, goalsRaw, txRaw] = await Promise.all([
      AsyncStorage.getItem('amanah_tasks'), // was 'amanah-tasks' (dash) - key-name mismatch with tasks.tsx's real key, fixed 2026-07-23
      AsyncStorage.getItem(`prayer_completed_${new Date().toDateString()}`),
      AsyncStorage.getItem('amanah-goals'),
      AsyncStorage.getItem('amanah-transactions'),
    ]);
    const tasks = JSON.parse(tasksRaw || '[]');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter((tk: { date?: string }) => !tk.date || tk.date === todayStr);
    const doneTasks = todayTasks.filter((tk: { completed?: boolean }) => tk.completed);
    const prayersDone = prayerRaw ? JSON.parse(prayerRaw).length : 0;
    const goals = JSON.parse(goalsRaw || '[]');
    const activeGoals = goals.filter((g: { status?: string }) => g.status === 'Active').length;
    const transactions = JSON.parse(txRaw || '[]');
    const balance = transactions.reduce((acc: number, tx: { type?: string; amount?: number }) =>
      acc + (tx.type === 'income' ? (tx.amount || 0) : -(tx.amount || 0)), 0);
    const overdueTasks = tasks.filter((tk: { date?: string; completed?: boolean }) => {
      if (!tk.date || tk.completed) return false;
      return tk.date < todayStr;
    });
    setDailySummary({
      tasksDone: doneTasks.length,
      tasksTotal: todayTasks.length,
      prayersDone,
      activeGoals,
      balance,
      overdueCount: overdueTasks.length,
    });
  }, []);

  // Achievements — mirrors web Streaks.tsx exactly (app/prayer/quran/savings streaks, XP, badges)
  const loadStreaks = useCallback(async () => {
    const today = new Date();
    const todayKey = `amanah_visit_${today.toISOString().split('T')[0]}`;

    let appStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `amanah_visit_${d.toISOString().split('T')[0]}`;
      if (await AsyncStorage.getItem(key)) {
        appStreak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }
    await AsyncStorage.setItem(todayKey, '1');

    let prayerStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const val = await AsyncStorage.getItem(`prayer_completed_${d.toDateString()}`);
      if (val) {
        const completed = JSON.parse(val);
        if (completed.length >= 5) { prayerStreak++; } else { break; }
      } else {
        if (i === 0) continue;
        break;
      }
    }

    let quranStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `amanah_quran_${d.toISOString().split('T')[0]}`;
      if (await AsyncStorage.getItem(key)) {
        quranStreak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }

    const budgetRaw = await AsyncStorage.getItem('amanah_family_budget');
    const budgetData = JSON.parse(budgetRaw || '{}');
    const monthlyBudget = budgetData.monthlyBudget || 5000;
    const dailyBudget = monthlyBudget / 30;
    const txRaw = await AsyncStorage.getItem('amanah-transactions');
    const transactions = JSON.parse(txRaw || '[]');

    let savingsStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayExpenses = transactions
        .filter((tx: { type?: string; date?: string }) => tx.type === 'expense' && tx.date === dateStr)
        .reduce((sum: number, tx: { amount?: number }) => sum + (tx.amount || 0), 0);
      if (dayExpenses <= dailyBudget) { savingsStreak++; } else { break; }
    }

    const dhikrRaw = await AsyncStorage.getItem(`dhikr_total_${today.toDateString()}`);
    const dhikrTotal = parseInt(dhikrRaw || '0', 10);
    setDhikrToday(dhikrTotal);

    const totalPrayers = prayerStreak * 5 * 10;
    const totalQuran = quranStreak * 20;
    const totalDhikr = dhikrTotal * 5;
    const xp = totalPrayers + totalQuran + totalDhikr + (appStreak * 5);
    const level = Math.min(Math.floor(xp / 100), 4);
    const titles = language === 'ar' ? LEVEL_TITLES_AR : LEVEL_TITLES_EN;
    const title = titles[level];

    const badges = [
      { icon: '🌟', name: language === 'ar' ? 'أول أسبوع' : 'First Week', earned: appStreak >= 7 },
      { icon: '💪', name: language === 'ar' ? 'شهر قوي' : 'Month Strong', earned: appStreak >= 30 },
      { icon: '🌙', name: language === 'ar' ? 'محارب رمضان' : 'Ramadan Warrior', earned: prayerStreak >= 30 },
      { icon: '💰', name: language === 'ar' ? 'موفر الحج' : 'Hajj Saver', earned: savingsStreak >= 60 },
      { icon: '📖', name: language === 'ar' ? 'قارئ القرآن' : 'Quran Reader', earned: quranStreak >= 7 },
      { icon: '🏆', name: language === 'ar' ? 'المتفوق' : 'Overachiever', earned: xp >= 500 },
    ];

    setStreakData({ appStreak, prayerStreak, quranStreak, savingsStreak, xp, level, title, badges });
  }, [language]);

  // Smart Briefing — mirrors web SmartBriefing.tsx (greeting, spending, streak, tasks left, quote)
  const loadBriefing = useCallback(async () => {
    const hour = new Date().getHours();
    let greeting: string;
    if (hour < 12) greeting = language === 'ar' ? 'صباح الخير ☀️' : 'Good Morning ☀️';
    else if (hour < 17) greeting = language === 'ar' ? 'مساء الخير 🌤️' : 'Good Afternoon 🌤️';
    else greeting = language === 'ar' ? 'مساء النور 🌙' : 'Good Evening 🌙';

    const [txRaw, budgetRaw, tasksRaw] = await Promise.all([
      AsyncStorage.getItem('amanah-transactions'),
      AsyncStorage.getItem('amanah_family_budget'),
      AsyncStorage.getItem('amanah_tasks'), // was 'amanah-tasks' (dash) - key-name mismatch with tasks.tsx's real key, fixed 2026-07-23
    ]);
    const transactions = JSON.parse(txRaw || '[]');
    const todayStr = new Date().toISOString().split('T')[0];
    const dailySpending = transactions
      .filter((tx: { type?: string; date?: string }) => tx.type === 'expense' && tx.date === todayStr)
      .reduce((sum: number, tx: { amount?: number }) => sum + (tx.amount || 0), 0);
    const budgetData = JSON.parse(budgetRaw || '{}');
    const monthlyBudget = budgetData.monthlyBudget || 5000;
    const dailyBudget = Math.round(monthlyBudget / 30);

    let briefingStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const val = await AsyncStorage.getItem(`prayer_completed_${d.toDateString()}`);
      if (val) {
        const completed = JSON.parse(val);
        if (completed.length >= 1) { briefingStreak++; } else { break; }
      } else {
        if (i === 0) continue;
        break;
      }
    }

    const tasks = JSON.parse(tasksRaw || '[]');
    const tasksCount = tasks.filter((tk: { date?: string; completed?: boolean }) =>
      (!tk.date || tk.date === todayStr) && !tk.completed
    ).length;

    const quoteIdx = dayOfYear % BRIEFING_QUOTES.length;
    const quote = {
      text: language === 'ar' ? BRIEFING_QUOTES[quoteIdx].ar : BRIEFING_QUOTES[quoteIdx].en,
      source: BRIEFING_QUOTES[quoteIdx].source,
    };

    setBriefing({ greeting, dailySpending, dailyBudget, streak: briefingStreak, tasksCount, quote });
  }, [language]);

  useEffect(() => {
    AsyncStorage.getItem(DUA_NOTIF_KEY).then((v) => {
      if (v === 'true') setDuaNotifEnabled(true);
    });
  }, []);

  const requestDuaNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setDuaNotifEnabled(true);
        await AsyncStorage.setItem(DUA_NOTIF_KEY, 'true');
      }
    } catch {}
  };

  useEffect(() => {
    fetchHijri();
    fetchPrayerTimes();
    calcStreak();
    loadDailySummary();
    loadStreaks();
    loadBriefing();
  }, [fetchHijri, loadStreaks, loadBriefing]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHijri(), fetchPrayerTimes(), calcStreak(), loadDailySummary(), loadStreaks(), loadBriefing()]);
    setRefreshing(false);
  }, [fetchHijri, loadStreaks, loadBriefing]);

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
    { icon: '📿', title: language === 'ar' ? 'الذكر' : 'Dhikr', path: '/(tabs)/dhikr' },
    { icon: '⏱️', title: language === 'ar' ? 'الصيام' : 'Fasting', path: '/(tabs)/fasting' },
    { icon: '✅', title: language === 'ar' ? 'المهام' : 'Tasks', path: '/(tabs)/tasks' },
    { icon: '🍃', title: language === 'ar' ? 'الأذكار' : 'Adhkar', path: '/(tabs)/adhkar' },
    { icon: '💰', title: language === 'ar' ? 'المالية' : 'Finance', path: '/(tabs)/finance' },
    { icon: '🧭', title: language === 'ar' ? 'القبلة' : 'Qibla', path: '/(tabs)/qibla' },
    { icon: '💎', title: language === 'ar' ? 'الزكاة' : 'Zakat', path: '/(tabs)/giving-tracker' },
    { icon: '🗓️', title: language === 'ar' ? 'التقويم' : 'Calendar', path: '/(tabs)/calendar' },
    { icon: '🎯', title: language === 'ar' ? 'الأهداف' : 'Goals', path: '/(tabs)/goals' },
    { icon: '💚', title: language === 'ar' ? 'العافية' : 'Wellness', path: '/(tabs)/wellness' },
    { icon: '📋', title: language === 'ar' ? 'المخطط' : 'Planner', path: '/(tabs)/planner' },
    { icon: '🤖', title: language === 'ar' ? 'المدرب الذكي' : 'AI Coach', path: '/(tabs)/ai-life-coach' },
    { icon: '💯', title: language === 'ar' ? 'مؤشر الحياة' : 'Life Score', path: '/(tabs)/weekly-life-score' },
    { icon: '🌙', title: language === 'ar' ? 'رمضان' : 'Ramadan', path: '/(tabs)/ramadan-planner' },
    { icon: '📊', title: language === 'ar' ? 'التحليلات' : 'Analytics', path: '/(tabs)/progress-analytics' },
    { icon: '🏠', title: language === 'ar' ? 'الميزانية' : 'Family Budget', path: '/(tabs)/family-budget' },
    { icon: '🔔', title: language === 'ar' ? 'الفواتير' : 'Bill Reminders', path: '/(tabs)/bill-reminders' },
    { icon: '📊', title: language === 'ar' ? 'اللوحة المالية' : 'Financial Dashboard', path: '/(tabs)/financial-dashboard' },
    { icon: '📈', title: language === 'ar' ? 'الاستثمار الحلال' : 'Halal Investment', path: '/(tabs)/halal-investment' },
    { icon: '🏆', title: language === 'ar' ? 'تحديات الادخار' : 'Savings Challenges', path: '/(tabs)/savings-challenges' },
    { icon: '⚙️', title: language === 'ar' ? 'الإعدادات' : 'Settings', path: '/(tabs)/settings' },
  ];

  const filtered = NAV_ITEMS.filter(i =>
    !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const prayerNameAr: Record<string, string> = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

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

      {/* Smart / Good Morning Briefing */}
      {briefing && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.rowBetween, rtlView as any]}>
            <Text style={[styles.cardTitle, { color: colors.text }, rtlText as any]}>{briefing.greeting}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {language === 'ar' ? 'ملخص يومي' : 'Daily Briefing'}
            </Text>
          </View>
          <View style={[styles.briefingGrid]}>
            <View style={[styles.briefingCell, { backgroundColor: colors.bg }]}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>💰 {language === 'ar' ? 'الإنفاق اليوم' : "Today's Spending"}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: briefing.dailySpending > briefing.dailyBudget ? colors.red : colors.teal }}>
                {briefing.dailySpending}/{briefing.dailyBudget}
              </Text>
            </View>
            <View style={[styles.briefingCell, { backgroundColor: colors.bg }]}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>🔥 {language === 'ar' ? 'السلسلة' : 'Streak'}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gold }}>{briefing.streak} {language === 'ar' ? 'يوم' : 'days'}</Text>
            </View>
            <View style={[styles.briefingCell, { backgroundColor: colors.bg }]}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>✅ {language === 'ar' ? 'المهام المتبقية' : 'Tasks Left'}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{briefing.tasksCount}</Text>
            </View>
          </View>
          <View style={[styles.briefingQuote, { backgroundColor: colors.bg }]}>
            <Text style={{ fontSize: 13, color: colors.text, textAlign: 'center', fontStyle: 'italic' }}>"{briefing.quote.text}"</Text>
            <Text style={{ fontSize: 10, color: colors.gold, textAlign: 'center', marginTop: 4 }}>{briefing.quote.source}</Text>
          </View>
        </View>
      )}

      {/* Dua of the Day */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowBetween, rtlView as any]}>
          <Text style={[styles.cardTitle, { color: colors.gold }, rtlText as any]}>
            🤲 {language === 'ar' ? 'دعاء اليوم' : 'Dua of the Day'}
          </Text>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>#{(dayOfYear % DUAS.length) + 1}/{DUAS.length}</Text>
        </View>
        <Text style={{ fontSize: 18, color: colors.text, textAlign: 'center', lineHeight: 30, marginVertical: 10, fontFamily: 'serif' }}>
          {todaysDua.arabic}
        </Text>
        <Text style={{ fontSize: 11, color: colors.teal, textAlign: 'center', fontStyle: 'italic', marginBottom: 6 }}>
          {todaysDua.transliteration}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
          {todaysDua.english}
        </Text>
        {!duaNotifEnabled ? (
          <TouchableOpacity
            onPress={requestDuaNotifications}
            style={[styles.duaBtn, { borderColor: colors.gold + '60' }]}
          >
            <Text style={{ fontSize: 12, color: colors.gold, fontWeight: '600' }}>
              🔔 {language === 'ar' ? 'تفعيل التذكير اليومي' : 'Enable Daily Reminders'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.teal, backgroundColor: colors.teal + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
              ✓ {language === 'ar' ? 'التذكيرات مفعلة' : 'Reminders enabled'}
            </Text>
          </View>
        )}
      </View>

      {/* Daily Inspiration */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowBetween, rtlView as any]}>
          <Text style={{ fontSize: 10, color: colors.gold, fontWeight: '700', letterSpacing: 1 }}>
            ✨ {language === 'ar' ? 'إلهام اليوم' : 'Daily Inspiration'}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.text, marginTop: 8, fontFamily: language === 'ar' ? 'serif' : undefined, textAlign: isRTL ? 'right' : 'left' }}>
          {language === 'ar' ? `"${inspirationQuote.arabic}"` : `"${inspirationQuote.english}"`}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 6, textAlign: isRTL ? 'right' : 'left' }}>
          {language === 'ar' ? inspirationQuote.english : inspirationQuote.arabic}
        </Text>
        <Text style={{ fontSize: 10, color: colors.gold, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
          — {language === 'ar' ? inspirationQuote.sourceAr : inspirationQuote.source}
        </Text>
      </View>

      {/* Achievements */}
      {streakData && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.rowBetween, rtlView as any]}>
            <Text style={[styles.cardTitle, { color: colors.text }, rtlText as any]}>
              🏅 {language === 'ar' ? 'الإنجازات' : 'Achievements'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: colors.gold, backgroundColor: colors.gold + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '700' }}>
                Lv.{streakData.level + 1} {streakData.title}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>{streakData.xp} XP</Text>
            </View>
          </View>

          <View style={styles.achieveRow}>
            <View style={styles.achieveCell}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.teal, textAlign: 'center' }}>{streakData.appStreak}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>{language === 'ar' ? 'استخدام' : 'App'} 🔥</Text>
            </View>
            <View style={styles.achieveCell}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.teal, textAlign: 'center' }}>{streakData.prayerStreak}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>{language === 'ar' ? 'صلاة' : 'Prayer'} 🕌</Text>
            </View>
            <View style={styles.achieveCell}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.teal, textAlign: 'center' }}>{streakData.quranStreak}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>{language === 'ar' ? 'قرآن' : 'Quran'} 📖</Text>
            </View>
            <View style={styles.achieveCell}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.teal, textAlign: 'center' }}>{streakData.savingsStreak}</Text>
              <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }}>{language === 'ar' ? 'توفير' : 'Savings'} 💰</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <View style={[styles.rowBetween, { marginBottom: 4 }]}>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{language === 'ar' ? 'التقدم للمستوى التالي' : 'Next Level Progress'}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{streakData.xp % 100}/100 XP</Text>
            </View>
            <View style={{ width: '100%', height: 6, backgroundColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${streakData.xp % 100}%`, backgroundColor: colors.teal, borderRadius: 999 }} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {streakData.badges.map((badge, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 11,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: badge.earned ? colors.gold + '20' : colors.border + '80',
                  color: badge.earned ? colors.gold : colors.textMuted,
                }}
              >
                {badge.icon} {badge.name}
              </Text>
            ))}
          </View>
        </View>
      )}

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

      {/* Overdue alert */}
      {dailySummary.overdueCount > 0 && (
        <TouchableOpacity
          style={[styles.overdueAlert, { backgroundColor: colors.red + '15', borderColor: colors.red + '40' }]}
          onPress={() => router.push('/(tabs)/tasks')}
        >
          <Text style={{ backgroundColor: colors.red, color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
            {dailySummary.overdueCount}
          </Text>
          <Text style={{ color: colors.red, fontSize: 13 }}>
            {language === 'ar' ? 'مهام متأخرة' : 'Overdue tasks'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Daily Summary — Tasks/Prayer/Goals/Savings */}
      <View style={[styles.summaryRow, rtlView as any]}>
        <View style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{language === 'ar' ? 'المهام' : 'Tasks'}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{dailySummary.tasksDone}/{dailySummary.tasksTotal}</Text>
        </View>
        <View style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{language === 'ar' ? 'الصلاة' : 'Prayer'}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{dailySummary.prayersDone}/5</Text>
        </View>
        <View style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{language === 'ar' ? 'الأهداف' : 'Goals'}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gold }}>{dailySummary.activeGoals}</Text>
        </View>
        <View style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>{language === 'ar' ? 'التوفير' : 'Savings'}</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.teal }}>{dailySummary.balance >= 0 ? '+' : ''}{dailySummary.balance}</Text>
        </View>
      </View>

      {/* Quick Shortcuts */}
      <View style={[styles.shortcutsRow, rtlView as any]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} style={[styles.shortcutBtn, { backgroundColor: colors.teal + '15', borderColor: colors.teal + '40' }]}>
          <Text style={{ fontSize: 12, color: colors.teal }}>✅ {language === 'ar' ? 'مهام اليوم' : "Today's Tasks"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/goals')} style={[styles.shortcutBtn, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '40' }]}>
          <Text style={{ fontSize: 12, color: colors.gold }}>🎯 {language === 'ar' ? 'الأهداف النشطة' : 'Active Goals'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/finance')} style={[styles.shortcutBtn, { backgroundColor: colors.teal + '15', borderColor: colors.teal + '40' }]}>
          <Text style={{ fontSize: 12, color: colors.teal }}>💰 {language === 'ar' ? 'المعاملات الأخيرة' : 'Recent Transactions'}</Text>
        </TouchableOpacity>
      </View>

      {/* Top widgets: Next Prayer / Prayer Streak / Today's Dhikr */}
      <View style={[styles.statsRow, rtlView as any]}>
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
              ? (language === 'ar' ? (prayerNameAr[nextPrayer.name] || nextPrayer.name) : nextPrayer.name)
              : (language === 'ar' ? 'الصلاة القادمة' : 'Next Prayer')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/prayer-times')}
        >
          <Text style={{ fontSize: 22, marginBottom: 4 }}>🔥</Text>
          <Text style={[styles.statValue, { color: colors.gold }]}>{streak} {language === 'ar' ? 'يوم' : streak === 1 ? 'day' : 'days'}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'ar' ? 'استمر' : 'Keep going'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/dhikr')}
        >
          <Text style={{ fontSize: 22, marginBottom: 4 }}>📿</Text>
          <Text style={[styles.statValue, { color: colors.teal }]}>{dhikrToday}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {language === 'ar' ? 'ذكر اليوم' : "Today's Dhikr"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Verse of the Day */}
      <View style={[styles.verseCard, {
        backgroundColor: colors.card,
        borderColor: colors.teal + '40',
        borderLeftWidth: isRTL ? 1 : 3,
        borderRightWidth: isRTL ? 3 : 1,
      }]}>
        <Text style={[styles.verseLabel, { color: colors.teal }, rtlText as any]}>
          📖 {language === 'ar' ? 'آية اليوم' : 'Verse of the Day'}
        </Text>
        <Text style={[styles.verseArabic, { color: colors.text }]}>{dailyVerse.arabic}</Text>
        <Text style={[styles.verseTranslation, { color: colors.textSecondary }, rtlText as any]}>{dailyVerse.translation}</Text>
        <Text style={[styles.verseRef, { color: colors.teal }, rtlText as any]}>{dailyVerse.reference}</Text>
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
  card: { borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  briefingGrid: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  briefingCell: { flex: 1, borderRadius: 12, padding: 10 },
  briefingQuote: { borderRadius: 12, padding: 10 },
  duaBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  achieveRow: { flexDirection: 'row', marginTop: 12 },
  achieveCell: { flex: 1 },
  verseCard: { borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderLeftWidth: 3 },
  verseLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  verseArabic: { fontSize: 20, fontFamily: 'serif', lineHeight: 34, textAlign: 'right', marginBottom: 8 },
  verseTranslation: { fontSize: 13, lineHeight: 20, marginBottom: 6, fontStyle: 'italic' },
  verseRef: { fontSize: 11, fontWeight: '700' },
  overdueAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCell: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1 },
  shortcutsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  shortcutBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
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
