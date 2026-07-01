/**
 * AI Life Coach — migrated from app/frontend/src/pages/AILifeCoach.tsx
 * Coaching-area buttons generate advice chat, goals-based tips (from
 * 'amanah-goals'), habit suggestions, daily-wisdom reveal. localStorage →
 * AsyncStorage. (Web PremiumGate omitted — no RN equivalent.) Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface Goal { id: string; title: string; category?: string; progress?: number; }
interface CoachMessage { id: string; type: 'user' | 'coach'; text: string; timestamp: number; }

const CATEGORIES = {
  en: ['Spiritual Growth', 'Health & Fitness', 'Financial Wisdom', 'Relationships'],
  ar: ['النمو الروحي', 'الصحة واللياقة', 'الحكمة المالية', 'العلاقات'],
};
const COACHING_RESPONSES = {
  en: {
    'Spiritual Growth': ['Based on your prayer streak, try adding 10 minutes of Quran reflection after Fajr. Small consistent acts are more beloved to Allah than large sporadic ones.', 'Consider setting a weekly goal to memorize 3 new ayahs. Your consistency in dhikr shows you have the discipline for it.', 'Your spiritual growth is on track! Try incorporating dua during your commute to maximize blessed moments.'],
    'Health & Fitness': ["I notice you haven't logged wellness data recently. Start with just 5 minutes of stretching after Fajr prayer.", 'Hydration is key! Try drinking water at each prayer time - that\'s 5 glasses minimum throughout the day.', 'Consider fasting Mondays and Thursdays - it combines spiritual reward with proven health benefits.'],
    'Financial Wisdom': ['Your savings rate could improve. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings & charity.', 'Review your subscriptions this week. Even small recurring expenses add up over a year.', 'Consider setting up automatic transfers to your savings on payday - pay yourself first!'],
    'Relationships': ['Schedule a weekly family activity. Quality time strengthens bonds more than expensive gifts.', "Reach out to a friend you haven't spoken to in a while. The Prophet ﷺ emphasized maintaining ties.", 'Practice active listening today. Put your phone away during conversations with loved ones.'],
  },
  ar: {
    'النمو الروحي': ['بناءً على سلسلة صلواتك، حاول إضافة 10 دقائق من تدبر القرآن بعد الفجر. الأعمال الصغيرة المستمرة أحب إلى الله من الكبيرة المنقطعة.', 'فكر في تحديد هدف أسبوعي لحفظ 3 آيات جديدة. التزامك بالذكر يدل على أن لديك الانضباط لذلك.', 'نموك الروحي على المسار الصحيح! حاول دمج الدعاء أثناء تنقلك لتعظيم اللحظات المباركة.'],
    'الصحة واللياقة': ['ألاحظ أنك لم تسجل بيانات صحية مؤخراً. ابدأ بـ 5 دقائق فقط من التمدد بعد صلاة الفجر.', 'الترطيب مهم! حاول شرب الماء عند كل صلاة - هذا 5 أكواب كحد أدنى خلال اليوم.', 'فكر في صيام الاثنين والخميس - يجمع بين الأجر الروحي والفوائد الصحية المثبتة.'],
    'الحكمة المالية': ['معدل ادخارك يمكن أن يتحسن. جرب قاعدة 50/30/20: 50% احتياجات، 30% رغبات، 20% ادخار وصدقة.', 'راجع اشتراكاتك هذا الأسبوع. حتى المصاريف المتكررة الصغيرة تتراكم على مدار العام.', 'فكر في إعداد تحويلات تلقائية لمدخراتك يوم الراتب - ادفع لنفسك أولاً!'],
    'العلاقات': ['خصص نشاطاً عائلياً أسبوعياً. الوقت الجيد يقوي الروابط أكثر من الهدايا الغالية.', 'تواصل مع صديق لم تتحدث معه منذ فترة. النبي ﷺ أكد على صلة الرحم.', 'مارس الاستماع الفعال اليوم. ضع هاتفك جانباً أثناء المحادثات مع أحبائك.'],
  },
};
const WISDOM_QUOTES = {
  en: [
    { text: 'The best of you are those who are best to their families.', source: 'Prophet Muhammad ﷺ' },
    { text: 'Take advantage of five before five: your youth before old age, your health before sickness, your wealth before poverty, your free time before busyness, and your life before death.', source: 'Prophet Muhammad ﷺ' },
    { text: 'Whoever travels a path in search of knowledge, Allah makes easy for him a path to Paradise.', source: 'Prophet Muhammad ﷺ' },
    { text: 'The strong person is the one who can control himself when he is angry.', source: 'Prophet Muhammad ﷺ' },
  ],
  ar: [
    { text: 'خيركم خيركم لأهله', source: 'النبي محمد ﷺ' },
    { text: 'اغتنم خمساً قبل خمس: شبابك قبل هرمك، وصحتك قبل سقمك، وغناك قبل فقرك، وفراغك قبل شغلك، وحياتك قبل موتك', source: 'النبي محمد ﷺ' },
    { text: 'من سلك طريقاً يلتمس فيه علماً سهل الله له به طريقاً إلى الجنة', source: 'النبي محمد ﷺ' },
    { text: 'ليس الشديد بالصُّرَعة، إنما الشديد الذي يملك نفسه عند الغضب', source: 'النبي محمد ﷺ' },
  ],
};
const HABIT_SUGGESTIONS = {
  en: [
    { habit: 'Morning Quran (10 min)', benefit: 'Improves focus and spiritual connection', icon: '📖' },
    { habit: 'Gratitude Journal', benefit: "Write 3 things you're grateful for daily", icon: '✍️' },
    { habit: 'Evening Walk (20 min)', benefit: 'Reduces stress and improves sleep', icon: '🚶' },
    { habit: 'Weekly Charity', benefit: 'Even small amounts purify wealth', icon: '💝' },
    { habit: 'Digital Detox (1hr before bed)', benefit: 'Better sleep quality and mindfulness', icon: '📵' },
    { habit: 'Meal Prep Sunday', benefit: 'Healthier eating and time savings', icon: '🥗' },
  ],
  ar: [
    { habit: 'قرآن الصباح (10 دقائق)', benefit: 'يحسن التركيز والاتصال الروحي', icon: '📖' },
    { habit: 'دفتر الامتنان', benefit: 'اكتب 3 أشياء تشكر الله عليها يومياً', icon: '✍️' },
    { habit: 'مشي مسائي (20 دقيقة)', benefit: 'يقلل التوتر ويحسن النوم', icon: '🚶' },
    { habit: 'صدقة أسبوعية', benefit: 'حتى المبالغ الصغيرة تطهر المال', icon: '💝' },
    { habit: 'ديتوكس رقمي (ساعة قبل النوم)', benefit: 'نوم أفضل ويقظة ذهنية', icon: '📵' },
    { habit: 'تحضير وجبات الأحد', benefit: 'أكل صحي وتوفير وقت', icon: '🥗' },
  ],
};

export default function AILifeCoach() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const gold = '#C9A96E';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showWisdom, setShowWisdom] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('amanah-goals').then((s) => { if (s) { try { setGoals(JSON.parse(s)); } catch {} } });
  }, []);

  const categories = isAr ? CATEGORIES.ar : CATEGORIES.en;
  const wisdom = isAr ? WISDOM_QUOTES.ar : WISDOM_QUOTES.en;
  const habits = isAr ? HABIT_SUGGESTIONS.ar : HABIT_SUGGESTIONS.en;

  const askCoach = (category: string) => {
    setSelectedCategory(category);
    const lang = isAr ? 'ar' : 'en';
    const responses = (COACHING_RESPONSES[lang] as Record<string, string[]>)[category] || [];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    setMessages((prev) => [...prev,
      { id: Date.now().toString(), type: 'user', text: isAr ? `أحتاج نصيحة حول: ${category}` : `I need advice on: ${category}`, timestamp: Date.now() },
      { id: (Date.now() + 1).toString(), type: 'coach', text: randomResponse || (isAr ? 'استمر في العمل الجيد!' : 'Keep up the great work!'), timestamp: Date.now() + 100 },
    ]);
  };

  const randomQuote = wisdom[Math.floor(Math.random() * wisdom.length)];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🤖" title={isAr ? 'المدرب الذكي' : 'AI Life Coach'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <LinearGradient colors={['#1A4A3A', '#0D3328']} style={styles.welcome}>
          <Text style={[styles.welcomeTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🧠 {isAr ? 'مدربك الشخصي' : 'Your Personal Coach'}</Text>
          <Text style={[styles.welcomeSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {isAr ? 'احصل على نصائح مخصصة بناءً على أهدافك وعاداتك' : 'Get personalized advice based on your goals and habits'}
          </Text>
        </LinearGradient>

        {/* Categories */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🎯 {isAr ? 'اختر مجال النصيحة' : 'Choose Coaching Area'}</Text>
          <View style={styles.catGrid}>
            {categories.map((cat, i) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.catBtn, { backgroundColor: active ? gold + '33' : colors.bg, borderColor: active ? gold : colors.border }]}
                  onPress={() => askCoach(cat)}
                >
                  <Text style={{ color: active ? gold : colors.text, fontSize: 13, fontFamily: FONT_UI_MEDIUM, textAlign: 'center' }}>
                    {['🕌', '💪', '💰', '❤️'][i]} {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Chat */}
        {messages.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>💬 {isAr ? 'محادثة المدرب' : 'Coach Chat'}</Text>
            <View style={{ gap: 10 }}>
              {messages.slice(-6).map((msg) => (
                <View
                  key={msg.id}
                  style={[styles.msg, msg.type === 'user'
                    ? { backgroundColor: colors.teal + '1A', borderColor: colors.teal + '33', marginLeft: isRTL ? 0 : 28, marginRight: isRTL ? 28 : 0 }
                    : { backgroundColor: gold + '1A', borderColor: gold + '33', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }]}
                >
                  {msg.type === 'coach' && (
                    <Text style={{ color: gold, fontSize: 11, fontFamily: FONT_UI_MEDIUM, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
                      {isAr ? `المدرب 🤖` : `🤖 Coach`}
                    </Text>
                  )}
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI, lineHeight: 19, textAlign: isRTL ? 'right' : 'left' }}>{msg.text}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Goals-based advice */}
        {goals.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>📋 {isAr ? 'نصائح بناءً على أهدافك' : 'Advice Based on Your Goals'}</Text>
            <View style={{ gap: 8 }}>
              {goals.slice(0, 3).map((goal) => {
                const p = goal.progress || 0;
                return (
                  <View key={goal.id} style={[styles.goalRow, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.goalPct, { backgroundColor: colors.teal + '33' }]}>
                      <Text style={{ color: colors.teal, fontSize: 11, fontFamily: FONT_UI_BOLD }}>{p}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI_MEDIUM, textAlign: isRTL ? 'right' : 'left' }}>{goal.title}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
                        {p < 30 ? (isAr ? 'ابدأ بخطوات صغيرة يومية' : 'Start with small daily steps') : p < 70 ? (isAr ? 'أنت في الطريق الصحيح!' : "You're on the right track!") : (isAr ? 'أوشكت على الإنجاز!' : 'Almost there!')}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Habits */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>🌱 {isAr ? 'عادات مقترحة' : 'Suggested Habits'}</Text>
          <View style={{ gap: 4 }}>
            {habits.map((h, i) => (
              <View key={i} style={[styles.habitRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: 20 }}>{h.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI_MEDIUM, textAlign: isRTL ? 'right' : 'left' }}>{h.habit}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>{h.benefit}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Wisdom */}
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>✨ {isAr ? 'حكمة اليوم' : 'Daily Wisdom'}</Text>
          <TouchableOpacity
            style={[styles.wisdomBtn, { backgroundColor: gold + '1A', borderColor: gold + '4D' }]}
            onPress={() => setShowWisdom((w) => !w)}
          >
            {showWisdom ? (
              <>
                <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI, fontStyle: 'italic', textAlign: 'center', marginBottom: 8 }}>"{randomQuote.text}"</Text>
                <Text style={{ color: gold, fontSize: 11, fontFamily: FONT_UI_MEDIUM, textAlign: 'center' }}>— {randomQuote.source}</Text>
              </>
            ) : (
              <Text style={{ color: gold, fontSize: 13.5, fontFamily: FONT_UI_MEDIUM, textAlign: 'center' }}>{isAr ? '✨ اضغط لعرض حكمة اليوم' : "✨ Tap to reveal today's wisdom"}</Text>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  welcome: { borderRadius: 16, padding: 16, marginBottom: 14 },
  welcomeTitle: { fontSize: 16, fontFamily: FONT_UI_BOLD, marginBottom: 6 },
  welcomeSub: { fontSize: 13, fontFamily: FONT_UI, lineHeight: 19 },


  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  msg: { padding: 12, borderRadius: 12, borderWidth: 1 },
  goalRow: { alignItems: 'center', gap: 12, padding: 8, borderRadius: 10 },
  goalPct: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  habitRow: { alignItems: 'center', gap: 12, padding: 8, borderRadius: 12 },
  wisdomBtn: { borderRadius: 12, borderWidth: 1, padding: 16 },
});
