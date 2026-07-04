/**
 * About — full-page mirror of app/frontend/src/pages/About.tsx (web).
 * Three blocks: product, founder (placeholder photo + bio), company.
 * Task 2c of the StartFleet/Mercury pre-launch prompt — identical wording
 * to web across landing section, /about page, and this native screen.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRTL } from '../../src/hooks/useRTL';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

const LINKEDIN_URL = 'https://www.linkedin.com/in/huzaifa-ezzo-trans7';

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

        {/* Block 2 — Founder */}
        <Card style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.teal, ...rtlText }]}>
            {isAr ? 'تعرّف على المؤسس' : 'Meet the Founder'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
            <Image
              source={require('../../assets/founder-photo.jpg')}
              style={[styles.avatar, { borderColor: colors.teal }]}
            />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: FONT_UI_BOLD }}>Huzaifa Al Ezzo</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>
                {isAr ? 'المؤسس والرئيس التنفيذي، LinkoraNet LLC' : 'Founder & CEO, LinkoraNet LLC'}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, lineHeight: 20, marginBottom: 12, ...rtlText }}>
            {isAr
              ? 'حذيفة العزو متخصص ثنائي اللغة يمتلك أكثر من عشر سنوات من الخبرة في الإدارة والموارد البشرية والتعليم والبحث العلمي. يحمل ماجستير في الإدارة العامة وبكالوريوس في اللغة الإنجليزية والترجمة، وقد أسس أمانة لايف انطلاقاً من رغبة حقيقية في مساعدة الناس على تنظيم حياتهم وتتبع تقدمهم والنمو بهدف. رؤيته أن يكون أمانة لايف شريكاً حقيقياً في الحياة — أداة ترافق الإنسان في رحلته نحو حياة أكثر وعياً وتحقيقاً.'
              : "Huzaifa Al Ezzo is a bilingual professional with over ten years of experience in administration, human resources, education, and research. Holding a Master of Public Administration and a Bachelor's in English Language and Translation, he built AmanahLife out of a genuine desire to help people organize their lives, track their progress, and grow with purpose. His vision is to make AmanahLife a trusted life partner — a tool that walks alongside people on their journey toward a more intentional and fulfilling life."}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(LINKEDIN_URL)}
            style={[styles.linkedinBtn, { borderColor: colors.teal }]}
          >
            <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_BOLD }}>LinkedIn</Text>
          </TouchableOpacity>
        </Card>

        {/* Block 3 — Company */}
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
  avatar: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
  },
  linkedinBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
});
