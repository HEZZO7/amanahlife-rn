/**
 * Onboarding / Landing — native screen that mirrors the web landing's hero.
 * Same brand colours, tagline, language toggle, and CTAs as the web app.
 * Replaces the old placeholder stub (no WebView needed).
 */
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage, hasLanguagePreference } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK, FONT_ARABIC_BOLD } from '../../src/theme/fonts';

const FEATURES = [
  { icon: '🕌', en: 'Prayer Times & Qibla', ar: 'مواقيت الصلاة والقبلة' },
  { icon: '📖', en: 'Quran Reader & Duas', ar: 'القرآن الكريم والأدعية' },
  { icon: '💰', en: 'Halal Finance Tracker', ar: 'تتبع المالية الحلال' },
  { icon: '🎯', en: 'Goals & Wellness', ar: 'الأهداف والعافية' },
  { icon: '🌙', en: 'Ramadan Planner', ar: 'مخطط رمضان' },
  { icon: '🤖', en: 'AI Life Coach', ar: 'المدرب الذكي' },
];

export default function LandingScreen() {
  const { colors } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAr = language === 'ar';

  // Skip landing if already signed in
  useEffect(() => {
    if (!authLoading && user) router.replace('/(tabs)/' as any);
  }, [user, authLoading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Language toggle */}
        <View style={[styles.langRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(['ar', 'en'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langBtn,
                { borderColor: language === lang ? colors.teal : colors.border,
                  backgroundColor: language === lang ? colors.teal + '20' : colors.surface },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={[styles.langText, { color: language === lang ? colors.teal : colors.textSecondary }]}>
                {lang === 'en' ? 'English' : 'العربية'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />

          <Text style={[styles.appName, { color: colors.text }]}>AmanahLife</Text>
          <Text style={[styles.appNameAr, { color: colors.teal, fontFamily: FONT_ARABIC_BOLD }]}>أمانة لايف</Text>

          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {isAr
              ? 'رفيقك الذكي في الحياة الإسلامية'
              : 'Your intelligent Islamic life companion'}
          </Text>
        </View>

        {/* Feature grid */}
        <View style={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[styles.featureItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.text, textAlign: 'center' }]}>
                {isAr ? f.ar : f.en}
              </Text>
            </View>
          ))}
        </View>

        {/* Tagline quote */}
        <View style={[styles.quoteBox, { backgroundColor: colors.teal + '15', borderColor: colors.teal + '40' }]}>
          <Text style={[styles.quoteText, { color: colors.text }]}>
            {isAr
              ? '"إِنَّ مَعَ الْعُسْرِ يُسْرًا"'
              : '"Indeed, with hardship comes ease."'}
          </Text>
          <Text style={[styles.quoteRef, { color: colors.teal }]}>
            {isAr ? 'سورة الشرح: ٦' : 'Quran 94:6'}
          </Text>
        </View>

        {/* CTA buttons */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.teal }]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isAr ? 'ابدأ رحلتك مجاناً' : 'Start Free Today'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.teal }]}
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.teal }]}>
              {isAr ? 'إنشاء حساب جديد' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={{ marginTop: 4 }}
          >
            <Text style={[styles.signinLink, { color: colors.textSecondary }]}>
              {isAr ? 'لديك حساب؟ ' : 'Already have an account? '}
              <Text style={{ color: colors.teal, fontFamily: FONT_UI_BOLD }}>
                {isAr ? 'تسجيل الدخول' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {isAr
            ? 'انضم إلى آلاف المستخدمين حول العالم'
            : 'Trusted by thousands of Muslims worldwide'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 60, paddingBottom: 48 },
  langRow: { gap: 10, justifyContent: 'flex-end', marginBottom: 32 },
  langBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  langText: { fontSize: 13, fontFamily: FONT_UI_BOLD },
  hero: { alignItems: 'center', marginBottom: 32 },
  logoImg: { width: 130, height: 130, borderRadius: 28, marginBottom: 20 },
  appName: { fontSize: 38, fontFamily: FONT_UI_BLACK, letterSpacing: -1, marginBottom: 4 },
  appNameAr: { fontSize: 22, marginBottom: 12 },
  tagline: { fontSize: 15, fontFamily: FONT_UI, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  featureItem: {
    width: '30.5%', padding: 12, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', minHeight: 80,
  },
  featureText: { fontSize: 11, fontFamily: FONT_UI_MEDIUM, lineHeight: 15, marginTop: 2 },
  quoteBox: {
    padding: 18, borderRadius: 16, borderWidth: 1, alignItems: 'center',
    marginBottom: 28,
  },
  quoteText: { fontSize: 16, fontFamily: FONT_ARABIC_BOLD, textAlign: 'center', marginBottom: 6 },
  quoteRef: { fontSize: 12, fontFamily: FONT_UI_MEDIUM },
  ctas: { gap: 12, marginBottom: 20 },
  primaryBtn: {
    paddingVertical: 17, borderRadius: 16, alignItems: 'center',
    shadowColor: '#1FC7C1', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  primaryBtnText: { color: '#04211C', fontSize: 16, fontFamily: FONT_UI_BLACK, letterSpacing: 0.3 },
  secondaryBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 16, fontFamily: FONT_UI_BOLD },
  signinLink: { textAlign: 'center', fontSize: 14, fontFamily: FONT_UI },
  footer: { textAlign: 'center', fontSize: 12, fontFamily: FONT_UI, marginTop: 4 },
});
