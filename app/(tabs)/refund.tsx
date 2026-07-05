/**
 * Refund Policy — native mirror of app/frontend/src/pages/RefundPolicy.tsx (web).
 * Was previously only reachable via an external browser link; now a real
 * in-app screen so it can't 404 as an unmatched route.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRTL } from '../../src/hooks/useRTL';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_BOLD } from '../../src/theme/fonts';

export default function RefundPolicy() {
  const { language } = useLanguage();
  const { colors } = useTheme();
  const { rtlText, rtlView } = useRTL();
  const isAr = language === 'ar';

  const sections = [
    {
      title: isAr ? 'أهلية الاسترداد' : 'Refund Eligibility',
      content: isAr
        ? 'يمكنك طلب استرداد كامل المبلغ خلال 14 يوماً من تاريخ الاشتراك الأول. ينطبق هذا على الاشتراكات الجديدة فقط وليس على التجديدات. يجب أن يكون طلب الاسترداد هو الأول من نوعه لحسابك.'
        : 'You can request a full refund within 14 days of your initial subscription date. This applies to new subscriptions only, not renewals. The refund request must be the first of its kind for your account.',
    },
    {
      title: isAr ? 'كيفية طلب الاسترداد' : 'How to Request a Refund',
      content: isAr
        ? 'لطلب استرداد، يرجى التواصل مع فريق الدعم عبر البريد الإلكتروني support@amanahlife.com مع ذكر: عنوان البريد الإلكتروني المرتبط بحسابك، تاريخ الاشتراك، وسبب طلب الاسترداد. سنرد في أقرب وقت ممكن.'
        : 'To request a refund, please contact our support team at support@amanahlife.com with: the email address associated with your account, subscription date, and reason for the refund request. We will respond as soon as possible.',
    },
    {
      title: isAr ? 'وقت المعالجة' : 'Processing Time',
      content: isAr
        ? 'بمجرد الموافقة على طلب الاسترداد، ستتم معالجته خلال 5-10 أيام عمل. سيظهر المبلغ المسترد في حسابك حسب مزود الدفع الخاص بك (قد يستغرق 3-5 أيام إضافية).'
        : 'Once your refund request is approved, it will be processed within 5-10 business days. The refunded amount will appear in your account depending on your payment provider (may take an additional 3-5 days).',
    },
    {
      title: isAr ? 'العناصر غير القابلة للاسترداد' : 'Non-Refundable Items',
      content: isAr
        ? 'لا يمكن استرداد: الاشتراكات بعد مرور 14 يوماً، الاشتراكات المتجددة (يمكن إلغاؤها فقط)، أي رسوم معالجة من مزود الدفع، والحسابات التي تم تعليقها بسبب انتهاك الشروط.'
        : 'The following are non-refundable: subscriptions after 14 days, renewed subscriptions (can only be cancelled), any processing fees from the payment provider, and accounts suspended for terms violation.',
    },
    {
      title: isAr ? 'إلغاء الاشتراك' : 'Subscription Cancellation',
      content: isAr
        ? 'يمكنك إلغاء اشتراكك في أي وقت من صفحة الإعدادات. عند الإلغاء: ستستمر في الوصول إلى الميزات المدفوعة حتى نهاية فترة الفوترة الحالية، لن يتم تحصيل رسوم إضافية، وسيتم تحويل حسابك تلقائياً إلى الخطة المجانية.'
        : 'You can cancel your subscription at any time from the Settings page. Upon cancellation: you will continue to have access to paid features until the end of the current billing period, no additional charges will be made, and your account will automatically convert to the free plan.',
    },
    {
      title: isAr ? 'الاسترداد الجزئي' : 'Partial Refunds',
      content: isAr
        ? 'في حالات استثنائية (مثل انقطاع الخدمة لفترة طويلة)، قد نقدم استرداداً جزئياً يتناسب مع فترة عدم التوفر. يتم تقييم هذه الحالات على أساس فردي.'
        : 'In exceptional cases (such as extended service outages), we may offer a partial refund proportional to the period of unavailability. These cases are evaluated on an individual basis.',
    },
    {
      title: isAr ? 'التواصل بشأن الاسترداد' : 'Contact for Refunds',
      content: isAr
        ? 'لجميع طلبات الاسترداد والاستفسارات المتعلقة بالفوترة، يرجى التواصل مع فريق الدعم على support@amanahlife.com. نسعى للرد على جميع الطلبات في أقرب وقت ممكن.'
        : 'For all refund requests and billing inquiries, please contact our support team at support@amanahlife.com. We aim to respond to all requests as soon as possible.',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader title={isAr ? 'سياسة الاسترداد' : 'Refund Policy'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, marginBottom: 6, ...rtlText }}>
          {isAr ? 'آخر تحديث: 24 مايو 2026' : 'Last updated: May 24, 2026'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, lineHeight: 20, marginBottom: 16, ...rtlText }}>
          {isAr
            ? 'نريد أن تكون راضياً عن خدمتنا. إذا لم تكن كذلك، إليك سياسة الاسترداد الخاصة بنا.'
            : 'We want you to be satisfied with our service. If you are not, here is our refund policy.'}
        </Text>

        <View style={[styles.badge, rtlView, { borderColor: colors.teal, backgroundColor: colors.teal + '15' }]}>
          <Text style={{ fontSize: 28, marginRight: 12 }}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_BOLD, ...rtlText }}>
              {isAr ? 'ضمان استرداد لمدة 14 يوماً' : '14-Day Money-Back Guarantee'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, ...rtlText }}>
              {isAr
                ? 'جرب بدون مخاطر. استرد أموالك بالكامل إذا لم تكن راضياً.'
                : 'Try risk-free. Get a full refund if you are not satisfied.'}
            </Text>
          </View>
        </View>

        {sections.map((section) => (
          <Card key={section.title} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontFamily: FONT_UI_BOLD, marginBottom: 8, ...rtlText }}>
              {section.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, lineHeight: 20, ...rtlText }}>
              {section.content}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  badge: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
});
