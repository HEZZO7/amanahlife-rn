/**
 * Islamic Calendar — migrated from app/frontend/src/pages/IslamicCalendar.tsx
 * Hijri date via aladhan timingsByCity (Makkah) with a dynamic approximation
 * fallback. Grouped upcoming events, browse-by-month, gradient banner. Bilingual.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK, FONT_ARABIC_BOLD } from '../../src/theme/fonts';

interface IslamicEvent {
  name: string; nameAr: string; hijriMonth: number; hijriDay: number;
  description: string; descriptionAr: string; icon: string;
  gregorianApprox: string; gregorianApproxAr: string;
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: 'Islamic New Year', nameAr: 'رأس السنة الهجرية', hijriMonth: 1, hijriDay: 1, description: 'Beginning of the Hijri calendar year', descriptionAr: 'بداية السنة الهجرية الجديدة', icon: '🌙', gregorianApprox: 'Jul 7, 2025', gregorianApproxAr: '٧ يوليو ٢٠٢٥' },
  { name: 'Ashura', nameAr: 'عاشوراء', hijriMonth: 1, hijriDay: 10, description: 'Day of fasting and remembrance', descriptionAr: 'يوم صيام وذكرى', icon: '📿', gregorianApprox: 'Jul 16, 2025', gregorianApproxAr: '١٦ يوليو ٢٠٢٥' },
  { name: 'Hijra of the Prophet ﷺ', nameAr: 'هجرة النبي ﷺ', hijriMonth: 2, hijriDay: 1, description: "Commemoration of the Prophet's migration", descriptionAr: 'ذكرى هجرة النبي ﷺ من مكة إلى المدينة', icon: '🕋', gregorianApprox: 'Aug 5, 2025', gregorianApproxAr: '٥ أغسطس ٢٠٢٥' },
  { name: 'Mawlid al-Nabi', nameAr: 'المولد النبوي', hijriMonth: 3, hijriDay: 12, description: "Prophet Muhammad's (ﷺ) birthday", descriptionAr: 'ذكرى مولد النبي محمد ﷺ', icon: '🕌', gregorianApprox: 'Sep 16, 2025', gregorianApproxAr: '١٦ سبتمبر ٢٠٢٥' },
  { name: "Isra' & Mi'raj", nameAr: 'الإسراء والمعراج', hijriMonth: 7, hijriDay: 27, description: 'Night Journey and Ascension', descriptionAr: 'ليلة الإسراء والمعراج', icon: '✨', gregorianApprox: 'Jan 26, 2026', gregorianApproxAr: '٢٦ يناير ٢٠٢٦' },
  { name: "Laylat al-Bara'ah", nameAr: 'ليلة النصف من شعبان', hijriMonth: 8, hijriDay: 15, description: "Night of Forgiveness - mid-Sha'ban", descriptionAr: 'ليلة النصف من شعبان - ليلة المغفرة', icon: '🌕', gregorianApprox: 'Feb 12, 2026', gregorianApproxAr: '١٢ فبراير ٢٠٢٦' },
  { name: 'Ramadan Begins', nameAr: 'بداية رمضان', hijriMonth: 9, hijriDay: 1, description: 'Start of the blessed month of fasting', descriptionAr: 'بداية شهر الصيام المبارك', icon: '🌙', gregorianApprox: 'Feb 28, 2026', gregorianApproxAr: '٢٨ فبراير ٢٠٢٦' },
  { name: 'Laylat al-Qadr', nameAr: 'ليلة القدر', hijriMonth: 9, hijriDay: 27, description: 'Night of Power - better than 1000 months', descriptionAr: 'ليلة خير من ألف شهر', icon: '⭐', gregorianApprox: 'Mar 26, 2026', gregorianApproxAr: '٢٦ مارس ٢٠٢٦' },
  { name: 'Eid al-Fitr', nameAr: 'عيد الفطر', hijriMonth: 10, hijriDay: 1, description: 'Festival of Breaking the Fast', descriptionAr: 'عيد الفطر المبارك', icon: '🎉', gregorianApprox: 'Mar 30, 2026', gregorianApproxAr: '٣٠ مارس ٢٠٢٦' },
  { name: 'Six Days of Shawwal', nameAr: 'ست من شوال', hijriMonth: 10, hijriDay: 2, description: 'Recommended fasting of 6 days', descriptionAr: 'صيام ستة أيام من شوال', icon: '🌿', gregorianApprox: 'Mar 31, 2026', gregorianApproxAr: '٣١ مارس ٢٠٢٦' },
  { name: 'Sacred Month Begins', nameAr: 'بداية الشهر الحرام', hijriMonth: 11, hijriDay: 1, description: "Dhul Qi'dah - one of the four sacred months", descriptionAr: 'ذو القعدة - أحد الأشهر الحرم', icon: '🕊️', gregorianApprox: 'Apr 27, 2026', gregorianApproxAr: '٢٧ أبريل ٢٠٢٦' },
  { name: 'Hajj Preparation', nameAr: 'التهيؤ للحج', hijriMonth: 11, hijriDay: 25, description: 'Pilgrims begin preparing for Hajj journey', descriptionAr: 'يبدأ الحجاج بالتهيؤ لرحلة الحج', icon: '🧳', gregorianApprox: 'May 21, 2026', gregorianApproxAr: '٢١ مايو ٢٠٢٦' },
  { name: 'Start of Dhul Hijjah', nameAr: 'بداية ذو الحجة', hijriMonth: 12, hijriDay: 1, description: 'The best 10 days of the year begin', descriptionAr: 'بداية أفضل عشرة أيام في السنة', icon: '🌟', gregorianApprox: 'May 27, 2026', gregorianApproxAr: '٢٧ مايو ٢٠٢٦' },
  { name: 'First 10 Days Fasting', nameAr: 'صيام العشر الأوائل', hijriMonth: 12, hijriDay: 1, description: 'Recommended fasting during the first 9 days', descriptionAr: 'صيام مستحب في الأيام التسعة الأولى', icon: '🤲', gregorianApprox: 'May 27 - Jun 4, 2026', gregorianApproxAr: '٢٧ مايو - ٤ يونيو ٢٠٢٦' },
  { name: 'Day of Tarwiyah', nameAr: 'يوم التروية', hijriMonth: 12, hijriDay: 8, description: 'Pilgrims head to Mina - start of Hajj rites', descriptionAr: 'يتوجه الحجاج إلى منى - بداية مناسك الحج', icon: '⛺', gregorianApprox: 'Jun 3, 2026', gregorianApproxAr: '٣ يونيو ٢٠٢٦' },
  { name: 'Day of Arafah', nameAr: 'يوم عرفة', hijriMonth: 12, hijriDay: 9, description: 'Best day for dua and fasting - pillar of Hajj', descriptionAr: 'أفضل يوم للدعاء والصيام - ركن الحج الأعظم', icon: '🏔️', gregorianApprox: 'Jun 4, 2026', gregorianApproxAr: '٤ يونيو ٢٠٢٦' },
  { name: 'Eid al-Adha', nameAr: 'عيد الأضحى', hijriMonth: 12, hijriDay: 10, description: 'Festival of Sacrifice', descriptionAr: 'عيد الأضحى المبارك', icon: '🐑', gregorianApprox: 'Jun 5, 2026', gregorianApproxAr: '٥ يونيو ٢٠٢٦' },
  { name: 'Days of Tashreeq', nameAr: 'أيام التشريق', hijriMonth: 12, hijriDay: 11, description: 'Days of eating, drinking, and remembrance of Allah (11-13 Dhul Hijjah)', descriptionAr: 'أيام أكل وشرب وذكر الله (١١-١٣ ذو الحجة)', icon: '🎊', gregorianApprox: 'Jun 6-8, 2026', gregorianApproxAr: '٦-٨ يونيو ٢٠٢٦' },
  { name: 'Islamic New Year 1448', nameAr: 'رأس السنة الهجرية ١٤٤٨', hijriMonth: 1, hijriDay: 1, description: 'Beginning of the new Hijri year 1448', descriptionAr: 'بداية السنة الهجرية ١٤٤٨', icon: '🌙', gregorianApprox: 'Jun 26, 2026', gregorianApproxAr: '٢٦ يونيو ٢٠٢٦' },
  { name: 'Ashura 1448', nameAr: 'عاشوراء ١٤٤٨', hijriMonth: 1, hijriDay: 10, description: 'Day of fasting and remembrance', descriptionAr: 'يوم صيام وذكرى', icon: '📿', gregorianApprox: 'Jul 5, 2026', gregorianApproxAr: '٥ يوليو ٢٠٢٦' },
];

const HIJRI_MONTHS_EN = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhul Qi'dah", 'Dhul Hijjah'];
const HIJRI_MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

function approximateHijriDate(): { day: number; month: number; year: number } {
  const anchorGregorian = new Date(2025, 6, 7);
  const diffDays = Math.floor((Date.now() - anchorGregorian.getTime()) / 86400000);
  const hijriDayLength = 29.5306;
  const totalHijriDays = Math.floor(diffDays * (354.36667 / 365.25));
  const hijriMonthsSinceAnchor = Math.floor(totalHijriDays / hijriDayLength);
  const hijriDayInMonth = Math.floor(totalHijriDays - hijriMonthsSinceAnchor * hijriDayLength) + 1;
  const yearOffset = Math.floor(hijriMonthsSinceAnchor / 12);
  const monthIndex = hijriMonthsSinceAnchor % 12;
  return { day: Math.min(Math.max(hijriDayInMonth, 1), 30), month: monthIndex + 1, year: 1447 + yearOffset };
}

export default function IslamicCalendar() {
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const isAr = language === 'ar';

  const fallback = approximateHijriDate();
  const [selectedMonth, setSelectedMonth] = useState(fallback.month);
  const [hijriDay, setHijriDay] = useState(fallback.day);
  const [hijriMonth, setHijriMonth] = useState(fallback.month);
  const [hijriYear, setHijriYear] = useState(fallback.year);
  const [loading, setLoading] = useState(true);
  const hijriMonths = isAr ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;

  useEffect(() => { if (!authLoading && !user) router.replace('/(auth)/landing'); }, [user, authLoading]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Makkah&country=Saudi+Arabia&method=4');
        const data = await res.json();
        if (data?.data?.date?.hijri) {
          const hijri = data.data.date.hijri;
          setHijriDay(parseInt(hijri.day, 10));
          setHijriMonth(hijri.month.number);
          setHijriYear(parseInt(hijri.year, 10));
          setSelectedMonth(hijri.month.number);
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const getUpcomingEvents = () => {
    const upcoming: (IslamicEvent & { sortKey: number })[] = [];
    for (const event of ISLAMIC_EVENTS) {
      let sortKey = 0;
      if (event.hijriMonth > hijriMonth) sortKey = (event.hijriMonth - hijriMonth) * 30 + event.hijriDay;
      else if (event.hijriMonth === hijriMonth && event.hijriDay >= hijriDay) sortKey = event.hijriDay - hijriDay;
      else if (event.hijriMonth <= hijriMonth) sortKey = (12 - hijriMonth + event.hijriMonth) * 30 + event.hijriDay;
      if (
        (event.hijriMonth === hijriMonth && event.hijriDay >= hijriDay) ||
        (event.hijriMonth > hijriMonth && event.hijriMonth <= hijriMonth + 3) ||
        (hijriMonth >= 10 && event.hijriMonth <= (hijriMonth + 3) - 12 && event.gregorianApprox.includes('2026'))
      ) {
        if (hijriMonth >= 11 && event.hijriMonth === 1 && !event.name.includes('1448')) continue;
        upcoming.push({ ...event, sortKey });
      }
    }
    return upcoming.sort((a, b) => a.sortKey - b.sortKey);
  };

  const getGroupedUpcomingEvents = () => {
    const events = getUpcomingEvents();
    const groups: { month: number; monthName: string; monthNameAr: string; year: number; events: IslamicEvent[] }[] = [];
    for (const event of events) {
      let year = hijriYear;
      if (event.hijriMonth < hijriMonth) year = hijriYear + 1;
      const existing = groups.find((g) => g.month === event.hijriMonth && g.year === year);
      if (existing) existing.events.push(event);
      else groups.push({ month: event.hijriMonth, monthName: HIJRI_MONTHS_EN[event.hijriMonth - 1], monthNameAr: HIJRI_MONTHS_AR[event.hijriMonth - 1], year, events: [event] });
    }
    return groups;
  };

  const getEventsForMonth = (month: number) => ISLAMIC_EVENTS.filter((e) => e.hijriMonth === month);

  if (authLoading || loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.teal} size="large" /></View>;
  }

  const groupedEvents = getGroupedUpcomingEvents();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="📅" title={isAr ? 'التقويم الإسلامي' : 'Islamic Calendar'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current month banner */}
        <LinearGradient colors={['#0F4A3C', '#178F8A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <Text style={styles.bannerLabel}>{isAr ? 'الشهر الحالي' : 'CURRENT MONTH'}</Text>
          <Text style={[styles.bannerMonth, isAr && { fontFamily: FONT_ARABIC_BOLD }]}>{isAr ? HIJRI_MONTHS_AR[hijriMonth - 1] : HIJRI_MONTHS_EN[hijriMonth - 1]}</Text>
          <Text style={styles.bannerYear}>{isAr ? `${hijriYear} هـ` : `${hijriYear} AH`}</Text>
          <View style={styles.bannerPill}>
            <Text style={styles.bannerPillText}>📅 {isAr ? `اليوم: ${hijriDay} ${HIJRI_MONTHS_AR[hijriMonth - 1]}` : `Today: ${hijriDay} ${HIJRI_MONTHS_EN[hijriMonth - 1]}`}</Text>
          </View>
        </LinearGradient>

        {/* Upcoming events */}
        <Text style={[styles.sectionHeader, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🗓️ {isAr ? 'الأحداث القادمة' : 'Upcoming Events'}</Text>
        {groupedEvents.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 16, fontFamily: FONT_UI }}>{isAr ? 'لا توجد أحداث قادمة' : 'No upcoming events'}</Text>
        ) : (
          <View style={{ gap: 20 }}>
            {groupedEvents.map((group) => (
              <View key={`${group.month}-${group.year}`}>
                <View style={styles.groupDivider}>
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                  <Text style={[styles.groupChip, { color: colors.teal, backgroundColor: colors.teal + '1A' }]}>
                    {isAr ? group.monthNameAr : group.monthName} {group.year} {isAr ? 'هـ' : 'AH'}
                  </Text>
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                </View>
                <View style={{ gap: 12 }}>
                  {group.events.map((event, idx) => (
                    <Card key={`${event.name}-${idx}`}>
                      <View style={[styles.eventTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.eventIcon, { backgroundColor: colors.teal + '1A' }]}><Text style={{ fontSize: 22 }}>{event.icon}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eventName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? event.nameAr : event.name}</Text>
                          <Text style={[styles.eventDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? event.descriptionAr : event.description}</Text>
                        </View>
                      </View>
                      <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.badge, { color: colors.green, backgroundColor: colors.green + '1A' }]}>🌙 {event.hijriDay} {isAr ? HIJRI_MONTHS_AR[event.hijriMonth - 1] : HIJRI_MONTHS_EN[event.hijriMonth - 1]}</Text>
                        <Text style={[styles.badge, { color: colors.blue, backgroundColor: colors.blue + '1A' }]}>📆 {isAr ? event.gregorianApproxAr : event.gregorianApprox}</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Browse by month */}
        <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24, textAlign: isRTL ? 'right' : 'left' }]}>📖 {isAr ? 'تصفح حسب الشهر' : 'Browse by Month'}</Text>
        {/* RTL: row-reverse makes محرم appear top-right, months flow right→left */}
        <View style={[styles.monthGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {hijriMonths.map((month, i) => {
            const selected = selectedMonth === i + 1;
            const isCurrent = i + 1 === hijriMonth;
            return (
              <TouchableOpacity
                key={month}
                style={[styles.monthBtn, {
                  backgroundColor: selected ? colors.teal : colors.card,
                  borderColor: selected ? colors.teal : isCurrent ? colors.green : colors.border,
                  borderWidth: isCurrent && !selected ? 2 : 1,
                }]}
                onPress={() => setSelectedMonth(i + 1)}
              >
                <Text numberOfLines={1} style={{ color: selected ? '#04211C' : isCurrent ? colors.green : colors.text, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{month}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Events for selected month */}
        <Text style={[styles.subHeader, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          📋 {isAr ? `أحداث شهر ${HIJRI_MONTHS_AR[selectedMonth - 1]}` : `Events in ${HIJRI_MONTHS_EN[selectedMonth - 1]}`}
        </Text>
        {getEventsForMonth(selectedMonth).length > 0 ? (
          <View style={{ gap: 8 }}>
            {getEventsForMonth(selectedMonth).map((event, idx) => (
              <Card key={`browse-${idx}`} style={{ borderColor: colors.teal + '33', backgroundColor: colors.teal + '0D' }}>
                <View style={[styles.eventTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ fontSize: 20 }}>{event.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventName, { color: colors.text, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? event.nameAr : event.name}</Text>
                    <Text style={[styles.eventDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? event.descriptionAr : event.description}</Text>
                  </View>
                </View>
                <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.green, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>🌙 {event.hijriDay} {isAr ? HIJRI_MONTHS_AR[event.hijriMonth - 1] : HIJRI_MONTHS_EN[event.hijriMonth - 1]}</Text>
                  <Text style={{ color: colors.blue, fontSize: 11, fontFamily: FONT_UI }}>📆 ≈ {isAr ? event.gregorianApproxAr : event.gregorianApprox}</Text>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <Card style={{ borderStyle: 'dashed', alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>🕊️</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI }}>{isAr ? 'لا توجد أحداث رئيسية هذا الشهر' : 'No major events this month'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginTop: 2 }}>{isAr ? 'شهر هادئ للعبادة والتأمل' : 'A quiet month for worship and reflection'}</Text>
          </Card>
        )}

        {/* Info note */}
        <View style={[styles.infoNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 11.5, fontFamily: FONT_UI, textAlign: 'center', lineHeight: 18 }}>
            {isAr
              ? '⚠️ التواريخ الهجرية تقريبية وقد تختلف بيوم أو يومين بناءً على رؤية الهلال في منطقتك. يرجى التأكد من التقويم المحلي.'
              : '⚠️ Hijri dates are approximate and may vary by 1-2 days based on moon sighting in your region. Please confirm with your local calendar.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  banner: { borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  bannerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: FONT_UI_MEDIUM, letterSpacing: 1 },
  bannerMonth: { color: '#fff', fontSize: 40, fontFamily: FONT_UI_BLACK, marginTop: 6 },
  bannerYear: { color: 'rgba(255,255,255,0.9)', fontSize: 20, fontFamily: FONT_UI_MEDIUM, marginTop: 4 },
  bannerPill: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  bannerPillText: { color: '#fff', fontSize: 13, fontFamily: FONT_UI_MEDIUM },
  groupDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  line: { flex: 1, height: 1 },
  groupChip: { fontSize: 12.5, fontFamily: FONT_UI_BOLD, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },
  eventTop: { gap: 12, alignItems: 'center', flexDirection: 'row' },
  eventIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  eventDesc: { fontSize: 11.5, fontFamily: FONT_UI, marginTop: 2, lineHeight: 16 },
  badgeRow: { gap: 8, marginTop: 10, flexWrap: 'wrap' },
  badge: { fontSize: 11, fontFamily: FONT_UI_MEDIUM, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, overflow: 'hidden' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  monthBtn: { width: '31.5%', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },


  infoNote: { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
});
