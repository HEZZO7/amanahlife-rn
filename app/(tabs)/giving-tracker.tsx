/**
 * Zakat & Giving Tracker — migrated from app/frontend/src/pages/ZakatCalculator.tsx
 * (dashboard routes "Zakat" here). Live FX rates (open.er-api.com w/ fallback),
 * grouped currency picker, nisab threshold, asset/liability inputs, 2.5% giving
 * calc, gradient result card. Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBottomSheetPadding } from '../../src/lib/useBottomSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';
import { useMetalPrices } from '../../src/hooks/useMetalPrices';

interface ZakatItem { label: string; labelAr: string; value: string; key: string; icon: string; }
interface CurrencyGroup { region: string; regionAr: string; currencies: { code: string; name: string; nameAr: string }[]; }

const CURRENCY_GROUPS: CurrencyGroup[] = [
  { region: 'Gulf', regionAr: 'الخليج', currencies: [
    { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي' }, { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي' },
    { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي' }, { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني' },
    { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني' }, { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري' } ] },
  { region: 'Middle East', regionAr: 'الشرق الأوسط', currencies: [
    { code: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري' }, { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'دينار أردني' },
    { code: 'IQD', name: 'Iraqi Dinar', nameAr: 'دينار عراقي' }, { code: 'LBP', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية' },
    { code: 'SYP', name: 'Syrian Pound', nameAr: 'ليرة سورية' } ] },
  { region: 'Turkey', regionAr: 'تركيا', currencies: [{ code: 'TRY', name: 'Turkish Lira', nameAr: 'ليرة تركية' }] },
  { region: 'Asia', regionAr: 'آسيا', currencies: [
    { code: 'MYR', name: 'Malaysian Ringgit', nameAr: 'رينغيت ماليزي' }, { code: 'IDR', name: 'Indonesian Rupiah', nameAr: 'روبية إندونيسية' },
    { code: 'PKR', name: 'Pakistani Rupee', nameAr: 'روبية باكستانية' }, { code: 'BDT', name: 'Bangladeshi Taka', nameAr: 'تاكا بنغلاديشية' },
    { code: 'INR', name: 'Indian Rupee', nameAr: 'روبية هندية' } ] },
  { region: 'Americas', regionAr: 'الأمريكتين', currencies: [
    { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي' }, { code: 'CAD', name: 'Canadian Dollar', nameAr: 'دولار كندي' } ] },
  { region: 'Europe', regionAr: 'أوروبا', currencies: [
    { code: 'EUR', name: 'Euro', nameAr: 'يورو' }, { code: 'GBP', name: 'British Pound', nameAr: 'جنيه إسترليني' },
    { code: 'CHF', name: 'Swiss Franc', nameAr: 'فرنك سويسري' } ] },
  { region: 'Oceania', regionAr: 'أوقيانوسيا', currencies: [
    { code: 'AUD', name: 'Australian Dollar', nameAr: 'دولار أسترالي' }, { code: 'NZD', name: 'New Zealand Dollar', nameAr: 'دولار نيوزيلندي' } ] },
];

const NISAB_GOLD_GRAMS = 87.48;
const NISAB_SILVER_GRAMS = 612.36;
const ZAKAT_RATE = 0.025;
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, SAR: 3.75, AED: 3.67, KWD: 0.31, BHD: 0.376, OMR: 0.385, QAR: 3.64,
  EGP: 49.5, JOD: 0.709, IQD: 1310, LBP: 89500, SYP: 13000, TRY: 38.5,
  MYR: 4.45, IDR: 16200, PKR: 278, BDT: 121, INR: 83.5,
  CAD: 1.36, EUR: 0.92, GBP: 0.79, CHF: 0.88, AUD: 1.53, NZD: 1.67,
};

export default function ZakatCalculator() {
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const isAr = language === 'ar';
  const sheetPb = useBottomSheetPadding();
  const { goldPricePerGram, silverPricePerGram, isLive: pricesLive, asOf: pricesAsOf } = useMetalPrices();

  const [assets, setAssets] = useState<ZakatItem[]>([
    { label: 'Cash & Bank Balance', labelAr: 'النقد والرصيد البنكي', value: '', key: 'cash', icon: '💵' },
    { label: 'Gold (in grams)', labelAr: 'الذهب (بالغرام)', value: '', key: 'gold', icon: '🪙' },
    { label: 'Silver (in grams)', labelAr: 'الفضة (بالغرام)', value: '', key: 'silver', icon: '🥈' },
    { label: 'Investments & Stocks', labelAr: 'الاستثمارات والأسهم', value: '', key: 'investments', icon: '📈' },
    { label: 'Business Inventory', labelAr: 'مخزون تجاري', value: '', key: 'business', icon: '🏪' },
    { label: 'Rental Income', labelAr: 'دخل الإيجار', value: '', key: 'rental', icon: '🏠' },
    { label: 'Other Assets', labelAr: 'أصول أخرى', value: '', key: 'other', icon: '💎' },
  ]);
  const [liabilities, setLiabilities] = useState('');
  const [calculated, setCalculated] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.replace('/(auth)/landing'); }, [user, authLoading]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        if (data.result === 'success' && data.rates) setExchangeRates(data.rates);
      } catch {} finally { setRatesLoading(false); }
    })();
  }, []);

  const getRate = (code: string) => exchangeRates[code] || FALLBACK_RATES[code] || 1;
  const convertToUSD = (amount: number, from: string) => amount / getRate(from);
  const convertFromUSD = (amountUSD: number, to: string) => amountUSD * getRate(to);

  const updateAsset = (key: string, value: string) => {
    setAssets((prev) => prev.map((a) => (a.key === key ? { ...a, value } : a)));
    setCalculated(false);
  };

  const totalAssetsUSD = assets.reduce((sum, asset) => {
    const val = parseFloat(asset.value) || 0;
    if (asset.key === 'gold') return sum + val * goldPricePerGram;
    if (asset.key === 'silver') return sum + val * silverPricePerGram;
    return sum + convertToUSD(val, currency);
  }, 0);
  const totalLiabilitiesUSD = convertToUSD(parseFloat(liabilities) || 0, currency);
  const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;
  const nisabUSD = Math.min(NISAB_GOLD_GRAMS * goldPricePerGram, NISAB_SILVER_GRAMS * silverPricePerGram);
  const isEligible = netWorthUSD >= nisabUSD;
  const zakatAmountUSD = isEligible ? netWorthUSD * ZAKAT_RATE : 0;

  const nisabDisplay = convertFromUSD(nisabUSD, currency);
  const totalAssetsDisplay = convertFromUSD(totalAssetsUSD, currency);
  const totalLiabilitiesDisplay = convertFromUSD(totalLiabilitiesUSD, currency);
  const netWorthDisplay = convertFromUSD(netWorthUSD, currency);
  const zakatDisplay = convertFromUSD(zakatAmountUSD, currency);

  const formatAmount = (amount: number) =>
    amount >= 1000000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const currentCurrencyName = (() => {
    const found = CURRENCY_GROUPS.flatMap((g) => g.currencies).find((c) => c.code === currency);
    return found ? (isAr ? found.nameAr : found.name) : currency;
  })();

  if (authLoading) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="💎" title={isAr ? 'الزكاة ومتتبع العطاء' : 'Zakat & Giving'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Currency selector */}
        <Card style={[styles.currencyCard, { borderColor: colors.teal + '4D', backgroundColor: colors.teal + '0D' }]}>
          <View style={[styles.rowBetween, { flexDirection: 'row', marginBottom: 8 }]}>
            <Text style={[styles.cardLabel, { color: colors.text }]}>🌍 {isAr ? 'اختر العملة' : 'Select Currency'}</Text>
            <Text style={{ color: ratesLoading ? colors.textSecondary : colors.teal, fontSize: 10, fontFamily: FONT_UI_MEDIUM }}>
              {ratesLoading ? (isAr ? 'جاري تحميل الأسعار...' : 'Loading rates...') : `✓ ${isAr ? 'أسعار مباشرة' : 'Live rates'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.currencyBtn, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row' }]}
            onPress={() => setShowCurrencyPicker(true)}
          >
            <Text style={{ color: colors.text, fontFamily: FONT_UI_BOLD, fontSize: 15 }}>{currency}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, flex: 1, textAlign: isRTL ? 'left' : 'right', marginHorizontal: 8 }}>{currentCurrencyName}</Text>
            <Text style={{ color: colors.textSecondary }}>▾</Text>
          </TouchableOpacity>
        </Card>

        {/* Nisab info */}
        <Card style={[styles.nisabCard, { borderColor: colors.green + '4D', backgroundColor: colors.green + '14' }]}>
          <View style={{ flexDirection: 'row' }}>
            <View>
              <Text style={{ color: colors.green, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'حد النصاب الحالي' : 'Current Nisab Threshold'}</Text>
              <Text style={{ color: colors.text, fontSize: 17, fontFamily: FONT_UI_BOLD, marginTop: 2 }}>{formatAmount(nisabDisplay)} {currency}</Text>
            </View>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{isAr ? 'ذهب' : 'Gold'}: {NISAB_GOLD_GRAMS}{isAr ? 'غ' : 'g'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{isAr ? 'فضة' : 'Silver'}: {NISAB_SILVER_GRAMS}{isAr ? 'غ' : 'g'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.green + '33' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 9, fontFamily: FONT_UI, flex: 1 }}>
              {isAr
                ? `الذهب ${formatAmount(goldPricePerGram)} / فضة ${formatAmount(silverPricePerGram)} لكل غرام (USD)`
                : `Gold ${formatAmount(goldPricePerGram)} / Silver ${formatAmount(silverPricePerGram)} per gram (USD)`}
            </Text>
            {pricesLive ? (
              <Text style={{ color: colors.green, fontSize: 9, fontFamily: FONT_UI_MEDIUM }}>✓ {isAr ? 'أسعار مباشرة' : 'Live prices'}</Text>
            ) : (
              <Text style={{ color: '#D4A017', fontSize: 9, fontFamily: FONT_UI_MEDIUM }}>
                ⚠ {pricesAsOf
                  ? (isAr ? `تقديرية (${pricesAsOf.toLocaleDateString()})` : `Estimated (${pricesAsOf.toLocaleDateString()})`)
                  : (isAr ? 'تقديرية' : 'Estimated')}
              </Text>
            )}
          </View>
        </Card>

        {/* Assets */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'أصولك' : 'Your Assets'}</Text>
          <View style={{ gap: 12, marginTop: 10 }}>
            {assets.map((asset) => (
              <View key={asset.key} style={[styles.assetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: 20, width: 30, textAlign: 'center' }}>{asset.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.assetLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? asset.labelAr : asset.label}</Text>
                  <TextInput
                    value={asset.value}
                    onChangeText={(v) => updateAsset(asset.key, v)}
                    keyboardType="numeric"
                    placeholder={asset.key === 'gold' || asset.key === 'silver' ? (isAr ? 'غرام' : 'grams') : (isAr ? `المبلغ بـ ${currency}` : `Amount in ${currency}`)}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Liabilities */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'الخصومات' : 'Deductions'}</Text>
          <View style={[styles.assetRow, { flexDirection: 'row', marginTop: 10 }]}>
            <Text style={{ fontSize: 20, width: 30, textAlign: 'center' }}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.assetLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{isAr ? 'أقساط الديون المستحقة خلال السنة القادمة' : 'Debt payments due in the next 12 months'}</Text>
              <TextInput
                value={liabilities}
                onChangeText={(v) => { setLiabilities(v); setCalculated(false); }}
                keyboardType="numeric"
                placeholder={isAr ? `المبلغ بـ ${currency}` : `Amount in ${currency}`}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
              />
              <Text style={[styles.hintText, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }]}>
                {isAr
                  ? 'أدخل فقط الأقساط المستحقة خلال الاثني عشر شهراً القادمة — وليس كامل رصيد الدين طويل الأجل.'
                  : "Enter only payments due within the next 12 months — not a long-term loan's full balance."}
              </Text>
            </View>
          </View>
        </Card>

        {/* Calculate */}
        <TouchableOpacity style={[styles.calcBtn, { backgroundColor: colors.green }]} onPress={() => setCalculated(true)} activeOpacity={0.85}>
          <Text style={styles.calcBtnText}>{isAr ? 'احسب المبلغ' : 'Calculate Giving'}</Text>
        </TouchableOpacity>

        {/* Results */}
        {calculated && (
          <Card padded={false} style={{ marginTop: 16, overflow: 'hidden' }}>
            <LinearGradient
              colors={isEligible ? ['#27AE60', '#178F8A'] : ['#6B7280', '#4B5563']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.resultHero}
            >
              <Text style={styles.resultLabel}>{isAr ? 'المبلغ المستحق' : 'Your Giving Amount'}</Text>
              <Text style={styles.resultValue}>{isEligible ? formatAmount(zakatDisplay) : '0.00'}</Text>
              <Text style={styles.resultCurrency}>{currency}</Text>
              <Text style={styles.resultNote}>
                {isEligible ? (isAr ? '٢.٥٪ من صافي ثروتك المؤهلة' : '2.5% of your net eligible wealth')
                  : (isAr ? 'أقل من حد النصاب - لا مبلغ مستحق' : 'Below Nisab threshold - no giving due')}
              </Text>
            </LinearGradient>
            <View style={{ padding: 16, gap: 8 }}>
              <ResultRow label={isAr ? 'إجمالي الأصول' : 'Total Assets'} value={formatAmount(totalAssetsDisplay)} colors={colors} isRTL={isRTL} />
              <ResultRow label={isAr ? 'الالتزامات' : 'Liabilities'} value={`-${formatAmount(totalLiabilitiesDisplay)}`} valueColor={colors.red} colors={colors} isRTL={isRTL} />
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                <ResultRow label={isAr ? 'صافي الثروة المؤهلة' : 'Net Eligible Wealth'} value={formatAmount(netWorthDisplay)} bold colors={colors} isRTL={isRTL} />
              </View>
              <ResultRow label={isAr ? 'حد النصاب' : 'Nisab Threshold'} value={`${formatAmount(nisabDisplay)} ${isEligible ? '✓' : ''}`} valueColor={isEligible ? colors.green : colors.textSecondary} colors={colors} isRTL={isRTL} />
            </View>
          </Card>
        )}

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}>ℹ️ {isAr ? 'عن الزكاة ومتتبع العطاء' : 'About Zakat & Giving Tracker'}</Text>
          {(isAr
            ? ['يُحسب العطاء بنسبة ٢.٥٪ من الثروة المحتفظ بها لسنة فوق النصاب', 'النصاب هو الحد الأدنى الذي يوجب العطاء', 'تُخصم فقط أقساط الديون المستحقة خلال الاثني عشر شهراً القادمة، وليس كامل رصيد الدين طويل الأجل (وفق معيار AAOIFI رقم ٣٥)', 'أسعار الذهب والفضة مباشرة عند توفرها؛ إذا تعذر الوصول إليها تُستخدم آخر قيمة معروفة أو تقدير تقريبي', 'أسعار الصرف مباشرة وقد تختلف قليلاً', 'استشر عالماً للأحكام الخاصة بحالتك']
            : ['Giving is calculated as 2.5% of wealth held for one year above Nisab', 'Nisab is the minimum threshold that triggers a giving obligation', "Only debt payments due within the next 12 months are deducted, not a long-term loan's full balance (per AAOIFI Sharia Standard No. 35)", 'Gold and silver prices are live when reachable; otherwise the last known value or a rough estimate is used', 'Exchange rates are fetched live and may vary slightly', 'Consult a scholar for specific rulings on your situation']
          ).map((line, i) => (
            <Text key={i} style={[styles.infoLine, { color: colors.textSecondary, textAlign: isAr ? 'right' : 'left' }]}>• {line}</Text>
          ))}
        </View>
      </ScrollView>

      {/* Currency picker modal */}
      <Modal visible={showCurrencyPicker} transparent animationType="slide" onRequestClose={() => setShowCurrencyPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCurrencyPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: sheetPb }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {CURRENCY_GROUPS.map((group) => (
                <View key={group.region}>
                  <Text style={[styles.groupHeader, { color: colors.teal, backgroundColor: colors.surface }]}>{isAr ? group.regionAr : group.region}</Text>
                  {group.currencies.map((c) => {
                    const active = currency === c.code;
                    return (
                      <TouchableOpacity
                        key={c.code}
                        style={[styles.currencyOption, { flexDirection: isRTL ? 'row-reverse' : 'row' }, active && { backgroundColor: colors.teal + '1A' }]}
                        onPress={() => { setCurrency(c.code); setShowCurrencyPicker(false); setCalculated(false); }}
                      >
                        <Text style={{ color: active ? colors.teal : colors.text, fontSize: 14, fontFamily: active ? FONT_UI_BOLD : FONT_UI_MEDIUM }}>{c.code}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{isAr ? c.nameAr : c.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ResultRow({ label, value, valueColor, bold, colors, isRTL }: any) {
  return (
    <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI }}>{label}</Text>
      <Text style={{ color: valueColor ?? colors.text, fontSize: 13, fontFamily: bold ? FONT_UI_BOLD : FONT_UI_MEDIUM }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  rowBetween: { justifyContent: 'space-between', alignItems: 'center' },
  currencyCard: { marginBottom: 14 },
  cardLabel: { fontSize: 11, fontFamily: FONT_UI },
  sectionTitle: { fontSize: 15, fontFamily: FONT_UI_MEDIUM, marginBottom: 4 },

  currencyBtn: { alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  nisabCard: { marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' },


  assetRow: { alignItems: 'center', gap: 12 },
  assetLabel: { fontSize: 11, fontFamily: FONT_UI, marginBottom: 4 },
  hintText: { fontSize: 10, fontFamily: FONT_UI, marginTop: 6 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: FONT_UI },
  calcBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  calcBtnText: { color: '#fff', fontSize: 16, fontFamily: FONT_UI_BOLD },
  resultHero: { padding: 24, alignItems: 'center' },
  resultLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: FONT_UI },
  resultValue: { color: '#fff', fontSize: 38, fontFamily: FONT_UI_BLACK, marginTop: 6 },
  resultCurrency: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: FONT_UI_MEDIUM, marginTop: 2 },
  resultNote: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: FONT_UI, marginTop: 8, textAlign: 'center' },
  infoBox: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  infoTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD, marginBottom: 8 },
  infoLine: { fontSize: 12, fontFamily: FONT_UI, lineHeight: 20 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  groupHeader: { fontSize: 11, fontFamily: FONT_UI_BOLD, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 6, textTransform: 'uppercase' },
  currencyOption: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8 },
});
