/**
 * About — full-page mirror of app/frontend/src/pages/About.tsx (web).
 * Two blocks: product, company. The founder block (name/photo/bio) was
 * removed from both this screen and its web counterpart to stop
 * publishing the founder's personal information.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRTL } from '../../src/hooks/useRTL';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

export default function About() {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const { rtlText } = useRTL();
  const isAr = language === 'ar';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader title={isAr ? 'عن أمانة لايف' : 'About AmanahLife'} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Block 1 — Product */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={[styles.title, { color: colors.text, ...rtlText }]}>
            {isAr ? 'عن أمانة لايف' : 'About AmanahLife'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, lineHeight: 20, marginBottom: 10, ...rtlText }}>
            {isAr
              ? 'أمانة لايف تطبيق لتخطيط الحياة والتسجيل اليومي مصمّم للمستخدمين حول العالم. يساعد الأفراد والعائلات على تحديد الأهداف وتتبع العادات وإدارة الروتين اليومي والنمو الشخصي — كل ذلك في مكان واحد. متاح عالمياً مع دعم كامل للعملات المتعددة بما فيها الدولار الأمريكي.'
              : 'AmanahLife is a personal life planning and daily log app built for users worldwide. It helps individuals and families plan goals, track habits, manage their daily routines, and grow personally — all in one place. Available globally with full multi-currency support including USD.'}
          </Text>
          <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_BOLD, ...rtlText }}>
            {isAr
              ? 'طوّرته وتشغّله شركة LinkoraNet LLC، وهي شركة مسجّلة في الولايات المتحدة.'
              : 'Developed and operated by LinkoraNet LLC, a US-registered company.'}
          </Text>
        </Card>

        {/* Block 2 — Company */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.teal, ...rtlText }]}>
            {isAr ? 'الشركة' : 'The Company'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, lineHeight: 20, ...rtlText }}>
            {isAr
              ? 'أمانة لايف منتج تابع لشركة LinkoraNet LLC، وهي شركة ذات مسؤولية محدودة مسجّلة في ولاية وايومنغ، الولايات المتحدة الأمريكية. تطوّر LinkoraNet LLC منتجات رقمية وتطبيقات SaaS تخدم المستخدمين حول العالم.'
              : 'AmanahLife is a product of LinkoraNet LLC, a limited liability company registered in the State of Wyoming, United States. LinkoraNet LLC develops digital products and SaaS applications serving users worldwide.'}
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontFamily: FONT_UI_BOLD, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
});
