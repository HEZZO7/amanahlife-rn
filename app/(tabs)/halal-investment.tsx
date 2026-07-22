/**
 * Halal Investment — migrated from app/frontend/src/pages/HalalInvestment.tsx
 * 5 tabs: Screening (static criteria), Portfolio (CRUD), Murabaha calculator
 * (cost-plus financing), Ijara calculator (lease-to-own), Home Ownership
 * tracker. localStorage('amanah_investments') → AsyncStorage, per-user scoped.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { usePersistedState } from '../../src/lib/usePersistedState';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface Investment { id: string; name: string; amount: number; type: 'Stocks' | 'Sukuk' | 'Real Estate' | 'Gold'; date: string; returns: number; }
interface HomeOwnership { propertyValue: number; downPayment: number; monthlyInstallment: number; totalPaid: number; }
interface InvestmentData { portfolio: Investment[]; homeOwnership: HomeOwnership; }

const STORAGE_KEY = 'amanah_investments';
const DEFAULT_DATA: InvestmentData = {
  portfolio: [],
  homeOwnership: { propertyValue: 0, downPayment: 0, monthlyInstallment: 0, totalPaid: 0 },
};

const HALAL_CRITERIA = [
  { icon: '🚫🍺', en: 'No Alcohol', ar: 'لا كحول' },
  { icon: '🚫🎰', en: 'No Gambling', ar: 'لا قمار' },
  { icon: '🚫💳', en: 'No Interest-Based Finance', ar: 'لا ربا' },
  { icon: '🚫🐷', en: 'No Pork Products', ar: 'لا منتجات خنزير' },
  { icon: '🚫🔫', en: 'No Weapons', ar: 'لا أسلحة' },
  { icon: '🚫🎭', en: 'No Adult Entertainment', ar: 'لا ترفيه محرم' },
];

type Tab = 'screening' | 'portfolio' | 'murabaha' | 'ijara' | 'home';

export default function HalalInvestment() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const tr = (en: string, ar: string) => (isAr ? ar : en);
  const userId = user?.id ?? null;

  const [data, setData] = usePersistedState<InvestmentData>(STORAGE_KEY, userId, DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<Investment['type']>('Stocks');

  const [murabahaCost, setMurabahaCost] = useState('');
  const [murabahaMargin, setMurabahaMargin] = useState('');
  const [murabahaInstallments, setMurabahaInstallments] = useState('');

  const [ijaraValue, setIjaraValue] = useState('');
  const [ijaraTerm, setIjaraTerm] = useState('');
  const [ijaraRent, setIjaraRent] = useState('');

  const addInvestment = () => {
    if (!newName.trim() || !newAmount) return;
    setData((prev) => ({
      ...prev,
      portfolio: [...prev.portfolio, {
        id: Date.now().toString(),
        name: newName.trim(),
        amount: parseFloat(newAmount),
        type: newType,
        date: new Date().toISOString().split('T')[0],
        returns: 0,
      }],
    }));
    setNewName(''); setNewAmount('');
  };
  const removeInvestment = (id: string) => setData((prev) => ({ ...prev, portfolio: prev.portfolio.filter((i) => i.id !== id) }));
  const totalPortfolio = data.portfolio.reduce((sum, i) => sum + i.amount, 0);

  const murabahaResult = (() => {
    const cost = parseFloat(murabahaCost) || 0;
    const margin = parseFloat(murabahaMargin) || 0;
    const inst = parseInt(murabahaInstallments, 10) || 1;
    const totalPrice = cost + (cost * margin) / 100;
    return { totalPrice, monthlyPayment: totalPrice / inst, profit: totalPrice - cost };
  })();

  const ijaraResult = (() => {
    const value = parseFloat(ijaraValue) || 0;
    const term = parseInt(ijaraTerm, 10) || 1;
    const rent = parseFloat(ijaraRent) || 0;
    const totalRent = rent * term;
    return { totalRent, ownership: totalRent >= value, remaining: Math.max(value - totalRent, 0) };
  })();

  const equityPct = data.homeOwnership.propertyValue > 0
    ? Math.min(Math.round(((data.homeOwnership.downPayment + data.homeOwnership.totalPaid) / data.homeOwnership.propertyValue) * 100), 100)
    : 0;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'screening', label: tr('Screening', 'الفحص'), icon: '✅' },
    { key: 'portfolio', label: tr('Portfolio', 'المحفظة'), icon: '📈' },
    { key: 'murabaha', label: tr('Murabaha', 'مرابحة'), icon: '🏦' },
    { key: 'ijara', label: tr('Ijara', 'إجارة'), icon: '🏠' },
    { key: 'home', label: tr('Home', 'التملك'), icon: '🏡' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="📈" title={tr('Halal Investment', 'الاستثمار الحلال')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow} style={{ flexGrow: 0, marginBottom: 14 }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity key={t.key} style={[styles.tab, { backgroundColor: active ? colors.teal + '33' : colors.card, borderColor: active ? colors.teal + '4D' : colors.border }]} onPress={() => setActiveTab(t.key)}>
                <Text style={{ color: active ? colors.teal : colors.textSecondary, fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{t.icon} {t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Portfolio Summary */}
        <Card style={[styles.summaryCard, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30' }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{tr('Total Portfolio', 'إجمالي المحفظة')}</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{totalPortfolio.toLocaleString()}</Text>
          <Text style={{ color: colors.teal, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{data.portfolio.length} {tr('investments', 'استثمارات')}</Text>
        </Card>

        {/* Screening Tab */}
        {activeTab === 'screening' && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>✅ {tr('Halal Screening Criteria', 'معايير الاستثمار الحلال')}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {tr('Companies must meet these criteria to be Shariah-compliant', 'يجب أن تستوفي الشركات هذه المعايير لتكون متوافقة مع الشريعة')}
            </Text>
            <View style={{ gap: 10 }}>
              {HALAL_CRITERIA.map((c, i) => (
                <View key={i} style={[styles.criteriaRow, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ fontSize: 18 }}>{c.icon}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI }}>{isAr ? c.ar : c.en}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.tipBox, { backgroundColor: colors.teal + '15' }]}>
              <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI }}>
                {tr('💡 Tip: Always verify Shariah compliance certification before investing', '💡 نصيحة: تحقق دائمًا من شهادة الامتثال الشرعي قبل الاستثمار')}
              </Text>
            </View>
          </Card>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <View style={{ gap: 14 }}>
            <Card>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{tr('Add Investment', 'إضافة استثمار')}</Text>
              <View style={{ gap: 8 }}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={tr('Investment Name', 'اسم الاستثمار')}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                />
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 }}>
                  <TextInput
                    value={newAmount}
                    onChangeText={setNewAmount}
                    placeholder={tr('Amount', 'المبلغ')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[styles.input, { flex: 1, backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  />
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, flexWrap: 'wrap' }}>
                  {(['Stocks', 'Sukuk', 'Real Estate', 'Gold'] as Investment['type'][]).map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, { backgroundColor: newType === t ? colors.teal : colors.bg, borderColor: colors.border }]} onPress={() => setNewType(t)}>
                      <Text style={{ color: newType === t ? '#04211C' : colors.textSecondary, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.teal }]} onPress={addInvestment}>
                  <Text style={{ color: '#04211C', fontSize: 13, fontFamily: FONT_UI_BOLD }}>{tr('Add Investment', 'إضافة استثمار')}</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <View style={{ gap: 8 }}>
              {data.portfolio.map((inv) => (
                <Card key={inv.id} style={[styles.invRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM }}>{inv.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{inv.type} • {inv.date}</Text>
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{inv.amount.toLocaleString()}</Text>
                    <TouchableOpacity onPress={() => removeInvestment(inv.id)} hitSlop={8}>
                      <Text style={{ color: colors.red }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
              {data.portfolio.length === 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI, textAlign: 'center', paddingVertical: 24 }}>
                  {tr('No investments yet', 'لا توجد استثمارات بعد')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Murabaha Tab */}
        {activeTab === 'murabaha' && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🏦 {tr('Murabaha Calculator', 'حاسبة المرابحة')}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {tr('Murabaha: Cost-plus financing with known profit margin', 'المرابحة: بيع بالتقسيط مع هامش ربح معلوم')}
            </Text>
            <View style={{ gap: 10 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{tr('Cost Price', 'سعر التكلفة')}</Text>
                <TextInput value={murabahaCost} onChangeText={setMurabahaCost} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{tr('Profit Margin (%)', 'هامش الربح (%)')}</Text>
                <TextInput value={murabahaMargin} onChangeText={setMurabahaMargin} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{tr('Installments (months)', 'عدد الأقساط (شهر)')}</Text>
                <TextInput value={murabahaInstallments} onChangeText={setMurabahaInstallments} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} />
              </View>
            </View>
            {!!(murabahaCost && murabahaMargin && murabahaInstallments) && (
              <View style={[styles.resultBox, { backgroundColor: colors.teal + '15' }]}>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{tr('Total Price', 'السعر الإجمالي')}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{murabahaResult.totalPrice.toLocaleString()}</Text>
                </View>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{tr('Profit', 'الربح')}</Text>
                  <Text style={{ color: colors.gold, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{murabahaResult.profit.toLocaleString()}</Text>
                </View>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{tr('Monthly Payment', 'القسط الشهري')}</Text>
                  <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{Math.round(murabahaResult.monthlyPayment).toLocaleString()}</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Ijara Tab */}
        {activeTab === 'ijara' && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🏠 {tr('Ijara Calculator', 'حاسبة الإجارة')}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {tr('Ijara: Lease-to-own Islamic financing', 'الإجارة: تأجير منتهي بالتمليك')}
            </Text>
            <View style={{ gap: 10 }}>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{tr('Asset Value', 'قيمة الأصل')}</Text>
                <TextInput value={ijaraValue} onChangeText={setIjaraValue} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{tr('Lease Term (months)', 'مدة الإيجار (شهر)')}</Text>
                <TextInput value={ijaraTerm} onChangeText={setIjaraTerm} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} />
              </View>
              <View>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{tr('Monthly Rent', 'الإيجار الشهري')}</Text>
                <TextInput value={ijaraRent} onChangeText={setIjaraRent} keyboardType="numeric" style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]} />
              </View>
            </View>
            {!!(ijaraValue && ijaraTerm && ijaraRent) && (
              <View style={[styles.resultBox, { backgroundColor: colors.teal + '15' }]}>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{tr('Total Rent', 'إجمالي الإيجار')}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{ijaraResult.totalRent.toLocaleString()}</Text>
                </View>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{tr('Remaining to Own', 'المتبقي للتملك')}</Text>
                  <Text style={{ color: colors.gold, fontSize: 13, fontFamily: FONT_UI_BOLD }}>{ijaraResult.remaining.toLocaleString()}</Text>
                </View>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{tr('Ownership Status', 'حالة التملك')}</Text>
                  <Text style={{ color: ijaraResult.ownership ? colors.teal : colors.textSecondary, fontSize: 13, fontFamily: FONT_UI_BOLD }}>
                    {ijaraResult.ownership ? tr('✅ Complete', '✅ مكتمل') : tr('⏳ In Progress', '⏳ جاري')}
                  </Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Home Ownership Tab */}
        {activeTab === 'home' && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🏡 {tr('Home Ownership Tracker', 'متتبع تملك المنزل')}</Text>
            <View style={{ gap: 10 }}>
              {([
                ['propertyValue', tr('Property Value', 'قيمة العقار')],
                ['downPayment', tr('Down Payment', 'الدفعة المقدمة')],
                ['monthlyInstallment', tr('Monthly Installment', 'القسط الشهري')],
                ['totalPaid', tr('Total Paid', 'إجمالي المدفوع')],
              ] as [keyof HomeOwnership, string][]).map(([field, label]) => (
                <View key={field}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <TextInput
                    value={data.homeOwnership[field] ? String(data.homeOwnership[field]) : ''}
                    onChangeText={(v) => setData((prev) => ({ ...prev, homeOwnership: { ...prev.homeOwnership, [field]: parseFloat(v) || 0 } }))}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }]}
                  />
                </View>
              ))}
            </View>
            {data.homeOwnership.propertyValue > 0 && (
              <View style={{ marginTop: 12 }}>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>{tr('Equity %', 'نسبة التملك')}</Text>
                  <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_BOLD }}>{equityPct}%</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: colors.bg }]}>
                  <View style={{ width: `${equityPct}%`, height: '100%', borderRadius: 6, backgroundColor: colors.gold }} />
                </View>
                <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: FONT_UI }}>{(data.homeOwnership.downPayment + data.homeOwnership.totalPaid).toLocaleString()}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: FONT_UI }}>{data.homeOwnership.propertyValue.toLocaleString()}</Text>
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  tabRow: { gap: 6 },
  tab: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  summaryCard: { borderWidth: 1, marginBottom: 14 },
  summaryLabel: { fontSize: 11, fontFamily: FONT_UI },
  summaryValue: { fontSize: 22, fontFamily: FONT_UI_BOLD, marginVertical: 2 },
  cardTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD, marginBottom: 6 },
  cardSub: { fontSize: 11, fontFamily: FONT_UI, marginBottom: 14 },
  criteriaRow: { alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  tipBox: { borderRadius: 12, padding: 10, marginTop: 14 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, fontFamily: FONT_UI },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  addBtn: { paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  invRow: { alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 11, fontFamily: FONT_UI, marginBottom: 4 },
  resultBox: { borderRadius: 12, padding: 12, marginTop: 14, gap: 6 },
  rowBetween: { justifyContent: 'space-between', marginBottom: 3 },
  barTrack: { height: 12, borderRadius: 6, overflow: 'hidden', marginVertical: 4 },
});
