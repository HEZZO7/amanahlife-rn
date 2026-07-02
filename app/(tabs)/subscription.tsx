/**
 * Subscription — migrated from app/frontend/src/pages/Subscription.tsx
 * 3 plan cards (Free / Balanced Life / Family Plan), monthly/yearly billing toggle,
 * live FX rates via open.er-api.com, 7-day free trial CTA, testimonials,
 * upgrade via Lemon Squeezy checkout endpoint, manage portal for paid users.
 * localStorage → AsyncStorage, window.location → expo-web-browser.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { PageHeader, Card } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

const CHECKOUT_ENDPOINT = 'https://nyhsnvjdgifphwkqzwel.supabase.co/functions/v1/app_11941c8fec_lemonsqueezy_checkout';

const PLANS = [
  {
    id: 'free' as const,
    nameAr: 'مجاني', nameEn: 'Free',
    monthlyPrice: 0, yearlyPrice: 0, icon: '🌱',
    featuresAr: ['مواقيت الصلاة ومحدد القبلة', 'تتبع مالي أساسي', 'عداد الذكر والأدعية', 'قارئ القرآن مع الإشارات المرجعية', '3 أهداف نشطة', 'تتابعات عادات أساسية', 'التقويم الإسلامي'],
    featuresEn: ['Prayer times & Qibla finder', 'Basic financial tracking', 'Dhikr counter & daily duas', 'Quran reader with bookmarks', '3 active goals', 'Basic habit streaks', 'Islamic calendar'],
  },
  {
    id: 'balanced' as const,
    nameAr: 'الحياة المتوازنة', nameEn: 'Balanced Life',
    monthlyPrice: 6.99, yearlyPrice: 4.89, icon: '⭐',
    featuresAr: ['كل ما في الخطة المجانية', 'المدرب الذكي (بلا حدود)', 'ماسح الإيصالات', 'تحديات الادخار الذكية', 'نقاط الحياة الأسبوعية', 'أهداف بلا حدود', 'تحليلات متقدمة', 'دعم متعدد العملات', 'دعم ذو أولوية'],
    featuresEn: ['Everything in Free', 'AI Life Coach (unlimited)', 'Receipt scanner', 'Smart savings challenges', 'Weekly life score', 'Unlimited goals', 'Advanced analytics', 'Multi-currency support', 'Priority support'],
  },
  {
    id: 'family' as const,
    nameAr: 'أمانة العائلة', nameEn: 'Family Plan',
    monthlyPrice: 12.99, yearlyPrice: 9.09, icon: '👑',
    featuresAr: ['كل ما في خطة الحياة المتوازنة', 'حتى 6 أفراد من العائلة', 'لوحة عائلية مشتركة', 'مخطط ميزانية العائلة', 'نقاط المساءلة', 'أهداف وتحديات مشتركة', 'تتابعات صلاة العائلة', 'دعم عائلي مخصص'],
    featuresEn: ['Everything in Balanced', 'Up to 6 family members', 'Shared family dashboard', 'Family budget planner', 'Accountability scores', 'Shared goals & challenges', 'Family prayer streaks', 'Dedicated family support'],
  },
];

const TESTIMONIALS = [
  { nameAr: 'أحمد الراشدي', nameEn: 'Ahmed Al-Rashidi', locationAr: 'الرياض، السعودية', locationEn: 'Riyadh, Saudi Arabia', quoteAr: 'أمانة غيّرت طريقة تنظيم حياتي. أصبحت أحافظ على صلواتي وأذكاري بانتظام.', quoteEn: 'AmanahLife changed how I organize my life. I now maintain my prayers and adhkar regularly.', rating: 5 },
  { nameAr: 'فاطمة المنصوري', nameEn: 'Fatima Al-Mansouri', locationAr: 'دبي، الإمارات', locationEn: 'Dubai, UAE', quoteAr: 'التخطيط الذكي بالذكاء الاصطناعي ساعدني على تحقيق أهدافي. تطبيق رائع!', quoteEn: 'The AI planning helped me achieve my goals. Amazing app!', rating: 5 },
  { nameAr: 'عمر حسين', nameEn: 'Omar Hussein', locationAr: 'عمّان، الأردن', locationEn: 'Amman, Jordan', quoteAr: 'أفضل تطبيق استخدمته لتنظيم حياتي. أنصح به بشدة.', quoteEn: 'Best lifestyle app I have used. Highly recommend.', rating: 5 },
  { nameAr: 'نورة الحربي', nameEn: 'Noura Al-Harbi', locationAr: 'جدة، السعودية', locationEn: 'Jeddah, Saudi Arabia', quoteAr: 'ميزة تتبع الأهداف والعادات ممتازة. أصبحت أقرأ القرآن يومياً.', quoteEn: 'The goals tracker is excellent. I now read Quran daily.', rating: 4 },
];

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, SAR: 3.75, AED: 3.67, KWD: 0.31, QAR: 3.64, EGP: 49.5,
  EUR: 0.92, GBP: 0.79, TRY: 38.5, MYR: 4.45, PKR: 278, INR: 83.5,
};

export default function SubscriptionScreen() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const { tier: currentTier, billingCycle, isTrialActive, trialDaysRemaining, startTrial, refetch } = useSubscription();
  const { user } = useAuth();
  const isAr = language === 'ar';
  const tr = (en: string, ar: string) => isAr ? ar : en;

  const [billing, setBilling] = useState<'monthly' | 'yearly'>(billingCycle);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [currency, setCurrency] = useState('USD');
  const isFreeTier = currentTier === 'free' && !isTrialActive;
  const currentPlan = PLANS.find(p => p.id === currentTier);

  useEffect(() => { setBilling(billingCycle); }, [billingCycle]);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d.result === 'success') setRates(d.rates); })
      .catch(() => {});
  }, []);

  const fmtPrice = (usd: number) => {
    if (usd === 0) return isAr ? 'مجاني' : 'Free';
    const rate = rates[currency] || 1;
    const converted = (usd * rate).toFixed(2);
    const symbols: Record<string, string> = { USD: '$', SAR: '﷼', AED: 'د.إ', EUR: '€', GBP: '£', KWD: 'د.ك', QAR: 'ر.ق', EGP: 'ج.م', TRY: '₺', MYR: 'RM', PKR: '₨', INR: '₹' };
    const sym = symbols[currency] || currency;
    return isAr ? `${converted} ${sym}` : `${sym}${converted}`;
  };

  const handleUpgrade = async (planId: 'balanced' | 'family') => {
    if (!user) { toast.error(tr('Please sign in first', 'يرجى تسجيل الدخول أولاً')); return; }
    setCheckoutLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ tier: planId, billing, successUrl: 'amanahlife://subscription?success=true', cancelUrl: 'amanahlife://subscription?canceled=true' }),
      });
      const data = await response.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        refetch();
      } else {
        toast.error(tr('Error creating checkout session', 'حدث خطأ أثناء إنشاء جلسة الدفع'));
      }
    } catch {
      toast.error(tr('Connection error occurred', 'حدث خطأ في الاتصال'));
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = useCallback(async () => {
    if (currentTier === 'free') { toast.info(tr("You don't have an active subscription.", 'ليس لديك اشتراك نشط.')); return; }
    if (!user) { toast.error(tr('Please sign in first', 'يرجى تسجيل الدخول أولاً')); return; }
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      const response = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'manage', returnUrl: 'amanahlife://subscription' }),
      });
      const data = await response.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
      } else {
        toast.info(tr('Subscription management unavailable. Contact support.', 'إدارة الاشتراك غير متاحة. تواصل مع الدعم.'));
      }
    } catch {
      toast.error(tr('Connection error', 'حدث خطأ'));
    } finally {
      setPortalLoading(false);
    }
  }, [currentTier, user, isAr]);

  const CURRENCIES = ['USD', 'SAR', 'AED', 'KWD', 'QAR', 'EGP', 'EUR', 'GBP', 'TRY', 'MYR', 'PKR', 'INR'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="💎" title={tr('Subscription', 'الاشتراك')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Social proof banner */}
        <View style={[styles.banner, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={{ fontSize: 18 }}>🌍</Text>
          <Text style={[styles.bannerText, { color: colors.text, textAlign: isRTL ? 'right' : 'center', flex: 1 }]}>
            {tr('Your smart companion for a more organized and balanced life ✨', 'رفيقك الذكي لحياة أكثر تنظيمًا وتوازنًا ✨')}
          </Text>
        </View>

        {/* Trial banner */}
        {isTrialActive && (
          <Card style={[styles.trialCard, { borderColor: colors.gold + '60', backgroundColor: colors.gold + '12', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold + '25', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>⏳</Text>
            </View>
            <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.trialTitle, { color: colors.text }]}>{tr('Free Trial Active', 'التجربة المجانية نشطة')}</Text>
              <Text style={[styles.trialSub, { color: colors.textSecondary }]}>
                {tr(`${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`, `متبقي ${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'يوم' : 'أيام'}`)}
              </Text>
            </View>
            <Text style={[styles.trialDays, { color: colors.gold }]}>{trialDaysRemaining}</Text>
          </Card>
        )}

        {/* Free trial CTA */}
        {isFreeTier && (
          <View style={[styles.trialCta, { borderColor: colors.gold + '50', backgroundColor: colors.gold + '08' }]}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🎁</Text>
            <Text style={[styles.ctaTitle, { color: colors.text }]}>{tr('Try Premium Free', 'جرّب المميز مجاناً')}</Text>
            <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>
              {tr('Get all premium features for 7 days, no payment required', 'احصل على جميع المميزات لمدة 7 أيام بدون دفع')}
            </Text>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.gold }]} onPress={startTrial} activeOpacity={0.85}>
              <Text style={[styles.ctaBtnText, { color: '#1A1200' }]}>🚀 {tr('Start 7-Day Free Trial', 'ابدأ تجربة 7 أيام مجانية')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Current plan */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Current Plan', 'باقتك الحالية')}</Text>
          <View style={[styles.currentRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
            <View style={[styles.currentAvatar, { backgroundColor: colors.gold + '30' }]}>
              <Text style={{ fontSize: 22 }}>{currentPlan?.icon || '🌱'}</Text>
            </View>
            <View style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.currentName, { color: colors.text }]}>
                {isAr ? currentPlan?.nameAr : currentPlan?.nameEn}
                {isTrialActive && <Text style={{ color: colors.gold, fontSize: 12 }}> · {tr('Trial', 'تجربة')}</Text>}
              </Text>
              <Text style={[styles.currentBilling, { color: colors.textSecondary }]}>
                {billingCycle === 'yearly' ? tr('Yearly Plan', 'اشتراك سنوي') : tr('Monthly Plan', 'اشتراك شهري')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Manage subscription (paid only) */}
        {currentTier !== 'free' && !isTrialActive && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Manage Subscription', 'إدارة الاشتراك')}</Text>
            <Text style={[styles.manageSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {tr('Update payment method, view invoices, or cancel', 'تحديث طريقة الدفع، عرض الفواتير، أو الإلغاء')}
            </Text>
            <TouchableOpacity
              style={[styles.manageBtn, { borderColor: colors.gold }]}
              onPress={handleManage} disabled={portalLoading} activeOpacity={0.85}
            >
              {portalLoading ? <ActivityIndicator color={colors.gold} size="small" /> : (
                <Text style={[styles.manageBtnText, { color: colors.gold }]}>💳 {tr('Manage Subscription', 'إدارة الاشتراك')}</Text>
              )}
            </TouchableOpacity>
          </Card>
        )}

        {/* Billing toggle + plan cards */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginBottom: 12 }]}>
            {tr('Available Plans', 'الباقات المتاحة')}
          </Text>

          {/* Billing pill — in Arabic: شهري on RIGHT, سنوي on LEFT */}
          <View style={[styles.billingPill, { backgroundColor: colors.bg, borderColor: colors.border, alignSelf: 'center', marginBottom: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {(['monthly', 'yearly'] as const).map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.billingBtn, billing === b && { backgroundColor: colors.teal }]}
                onPress={() => setBilling(b)}
              >
                <Text style={[styles.billingText, { color: billing === b ? '#04211C' : colors.textSecondary }]}>
                  {b === 'monthly' ? tr('Monthly', 'شهري') : tr('Yearly (-20%)', 'سنوي (-20%)')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Currency selector */}
          <View style={[styles.currencyRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 14 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{tr('Currency:', 'العملة:')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.currencyChip, { backgroundColor: currency === c ? colors.teal : colors.surface, borderColor: currency === c ? colors.teal : colors.border }]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={{ color: currency === c ? '#04211C' : colors.textSecondary, fontSize: 11, fontFamily: FONT_UI_BOLD }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Plan cards */}
          <View style={{ gap: 12 }}>
            {PLANS.map((plan) => {
              const isCurrent = currentTier === plan.id;
              const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
              const isLoading = checkoutLoading === plan.id;
              return (
                <View
                  key={plan.id}
                  style={[styles.planCard, {
                    borderColor: isCurrent ? colors.gold : colors.border,
                    backgroundColor: isCurrent ? colors.gold + '0A' : colors.bg,
                  }]}
                >
                  {/* Plan header */}
                  <View style={[styles.planHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.planLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={{ fontSize: 22 }}>{plan.icon}</Text>
                      <Text style={[styles.planName, { color: colors.text, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
                        {isAr ? plan.nameAr : plan.nameEn}
                      </Text>
                    </View>
                    <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                      <Text style={[styles.planPrice, { color: colors.gold }]}>{fmtPrice(price)}</Text>
                      {price > 0 && <Text style={[styles.planPer, { color: colors.textSecondary }]}>{tr('/mo', '/شهر')}</Text>}
                    </View>
                  </View>

                  {/* Features */}
                  <View style={{ gap: 6, marginBottom: 12 }}>
                    {(isAr ? plan.featuresAr : plan.featuresEn).map((f, i) => (
                      <View key={i} style={[styles.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={{ color: colors.green, fontSize: 14, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>✓</Text>
                        <Text style={[styles.featureText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA */}
                  {isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: colors.gold + '1A', borderColor: colors.gold + '40' }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.gold }]}>✓ {tr('Current Plan', 'باقتك الحالية')}</Text>
                    </View>
                  ) : plan.id === 'free' ? (
                    <View style={[styles.currentBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.textSecondary }]}>{tr('Basic Plan', 'الباقة الأساسية')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.upgradeBtn, { backgroundColor: colors.gold }]}
                      onPress={() => handleUpgrade(plan.id as 'balanced' | 'family')}
                      disabled={!!isLoading} activeOpacity={0.85}
                    >
                      {isLoading ? <ActivityIndicator color="#1A1200" size="small" /> : (
                        <Text style={[styles.upgradeBtnText, { color: '#1A1200' }]}>{tr('Upgrade', 'ترقية')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Testimonials */}
        <Card>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginBottom: 4 }]}>
            {tr('What Our Users Say', 'ماذا يقول مستخدمونا')}
          </Text>
          <Text style={[styles.manageSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginBottom: 14 }]}>
            {tr('Reviews from users worldwide', 'آراء المستخدمين حول العالم')}
          </Text>
          <View style={{ gap: 10 }}>
            {TESTIMONIALS.map((t, i) => (
              <View key={i} style={[styles.testimonialCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 3, marginBottom: 8 }}>
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Text key={si} style={{ color: si < t.rating ? colors.gold : colors.border, fontSize: 12 }}>★</Text>
                  ))}
                </View>
                <Text style={[styles.quoteText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  "{isAr ? t.quoteAr : t.quoteEn}"
                </Text>
                <View style={[styles.reviewerRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
                  <View style={[styles.reviewerAvatar, { backgroundColor: colors.teal + '25' }]}>
                    <Text style={{ color: colors.gold, fontSize: 12, fontFamily: FONT_UI_BOLD }}>
                      {(isAr ? t.nameAr : t.nameEn).charAt(0)}
                    </Text>
                  </View>
                  <View style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.reviewerName, { color: colors.text }]}>{isAr ? t.nameAr : t.nameEn}</Text>
                    <Text style={[styles.reviewerLoc, { color: colors.textSecondary }]}>{isAr ? t.locationAr : t.locationEn}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  bannerText: { fontSize: 13, fontFamily: FONT_UI_MEDIUM },
  trialCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  trialTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  trialSub: { fontSize: 12, fontFamily: FONT_UI, marginTop: 2 },
  trialDays: { fontSize: 26, fontFamily: FONT_UI_BLACK },
  trialCta: { padding: 20, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', marginBottom: 14 },
  ctaTitle: { fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 6, textAlign: 'center' },
  ctaSub: { fontSize: 13, fontFamily: FONT_UI, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  ctaBtn: { paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14 },
  ctaBtnText: { fontSize: 15, fontFamily: FONT_UI_BOLD },


  currentRow: { flexDirection: 'row', alignItems: 'center' },
  currentAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  currentName: { fontSize: 16, fontFamily: FONT_UI_BOLD },
  currentBilling: { fontSize: 12, fontFamily: FONT_UI, marginTop: 2 },
  manageSub: { fontSize: 12, fontFamily: FONT_UI, marginTop: 4, marginBottom: 12 },
  manageBtn: { paddingVertical: 13, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  manageBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  billingPill: { flexDirection: 'row', borderRadius: 24, borderWidth: 1, padding: 3 },
  billingBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  billingText: { fontSize: 13, fontFamily: FONT_UI_BOLD },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  planCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  planHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planLeft: { alignItems: 'center', gap: 8 },
  planName: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  planPrice: { fontSize: 18, fontFamily: FONT_UI_BLACK },
  planPer: { fontSize: 11, fontFamily: FONT_UI },
  featureRow: { alignItems: 'center' },
  featureText: { fontSize: 13, fontFamily: FONT_UI },
  currentBadge: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  currentBadgeText: { fontSize: 13, fontFamily: FONT_UI_BOLD },
  upgradeBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  upgradeBtnText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  testimonialCard: { padding: 14, borderRadius: 14, borderWidth: 1 },
  quoteText: { fontSize: 13, fontFamily: FONT_UI, lineHeight: 20 },
  reviewerRow: { flexDirection: 'row', alignItems: 'center' },
  reviewerAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reviewerName: { fontSize: 12, fontFamily: FONT_UI_BOLD },
  reviewerLoc: { fontSize: 10, fontFamily: FONT_UI },
});
