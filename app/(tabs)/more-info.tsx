/**
 * More / Info — mirrors the web footer's Product/Company/Support link
 * structure (app/frontend/public/landing.html footer), since Android had
 * no equivalent. Legal pages (privacy/terms/refund) and Help Center/Blog
 * open the public web URLs (expo-web-browser) since no native screens
 * exist for them. Features/Pricing/Showcase/Testimonials link out to the
 * web landing page — no native equivalents beyond Pricing → Subscription.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRTL } from '../../src/hooks/useRTL';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

const WEB_BASE = 'https://app.amanahlife.com';

export default function MoreInfo() {
  const router = useRouter();
  const { language } = useLanguage();
  const { colors } = useTheme();
  const { rtlText } = useRTL();
  const isAr = language === 'ar';

  const openWeb = (path: string) => WebBrowser.openBrowserAsync(`${WEB_BASE}${path}`);
  const openMail = () => Linking.openURL('mailto:support@amanahlife.com');
  const openCeoMail = () => Linking.openURL('mailto:CEO@amanahlife.com');

  const sections: { label: string; items: { label: string; onPress: () => void }[] }[] = [
    {
      label: isAr ? 'المنتج' : 'Product',
      items: [
        { label: isAr ? 'المميزات' : 'Features', onPress: () => openWeb('/landing#features') },
        { label: isAr ? 'الأسعار' : 'Pricing', onPress: () => router.push('/(tabs)/subscription' as any) },
        { label: isAr ? 'العرض' : 'Showcase', onPress: () => openWeb('/landing#showcase') },
        { label: isAr ? 'آراء المستخدمين' : 'Testimonials', onPress: () => openWeb('/landing#testimonials') },
      ],
    },
    {
      label: isAr ? 'الشركة' : 'Company',
      items: [
        { label: isAr ? 'عنّا' : 'About Us', onPress: () => router.push('/(tabs)/about' as any) },
        { label: isAr ? 'سياسة الخصوصية' : 'Privacy Policy', onPress: () => router.push('/(tabs)/privacy' as any) },
        { label: isAr ? 'شروط الخدمة' : 'Terms of Service', onPress: () => openWeb('/terms') },
        { label: isAr ? 'سياسة الاسترداد' : 'Refund Policy', onPress: () => router.push('/(tabs)/refund' as any) },
        { label: isAr ? 'اتصل بنا' : 'Contact Us', onPress: () => openWeb('/contact') },
      ],
    },
    {
      label: isAr ? 'الدعم' : 'Support',
      items: [
        { label: 'support@amanahlife.com', onPress: openMail },
        { label: 'CEO@amanahlife.com', onPress: openCeoMail },
        { label: isAr ? 'مركز المساعدة' : 'Help Center', onPress: () => openWeb('/contact') },
        { label: isAr ? 'المدونة' : 'Blog', onPress: () => openWeb('/blog') },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader title={isAr ? 'المزيد' : 'More'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, lineHeight: 19, marginBottom: 18, ...rtlText }}>
          {isAr
            ? 'رفيقك الذكي الشامل في الحياة. أدر أموالك، تابع عاداتك، خطط لأهدافك، وانمُ روحياً — كل ذلك في تطبيق واحد.'
            : 'Your complete smart life companion. Manage finances, track habits, plan goals, and grow spiritually — all in one app.'}
        </Text>

        {sections.map((section) => (
          <Card key={section.label} style={{ marginBottom: 14 }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{section.label}</Text>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                style={{ paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}
              >
                <Text style={{ color: colors.teal, fontSize: 14, fontFamily: FONT_UI_MEDIUM, ...rtlText }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        ))}

        <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: FONT_UI, textAlign: 'center', marginTop: 8 }}>
          {isAr
            ? '© 2026 أمانة لايف، منتج تابع لشركة LinkoraNet LLC. جميع الحقوق محفوظة.'
            : '© 2026 AmanahLife, a product of LinkoraNet LLC. All rights reserved.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontFamily: FONT_UI_BOLD, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
});
