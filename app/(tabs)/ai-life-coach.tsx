/**
 * AI Life Coach — migrated from app/frontend/src/pages/AILifeCoach.tsx
 * Coaching-area buttons + free-text questions call a real Supabase Edge
 * Function (app_11941c8fec_ai_life_coach) backed by Anthropic's API,
 * personalized with the user's goals (from 'amanah-goals'). Also: habit
 * suggestions, daily-wisdom reveal. localStorage → AsyncStorage. (Web
 * PremiumGate omitted — no RN equivalent.) Bilingual/RTL.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { functionUrl } from '../../src/lib/config';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

const AI_COACH_ENDPOINT = functionUrl('app_11941c8fec_ai_life_coach');

interface Goal { id: string; title: string; category?: string; progress?: number; }
interface CoachMessage { id: string; type: 'user' | 'coach'; text: string; timestamp: number; }

const CATEGORIES = {
  en: ['Spiritual Growth', 'Health & Fitness', 'Financial Wisdom', 'Relationships'],
  ar: ['النمو الروحي', 'الصحة واللياقة', 'الحكمة المالية', 'العلاقات'],
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
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';
  const gold = '#C9A96E';
  const userId = user?.id ?? null;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showWisdom, setShowWisdom] = useState(false);
  const [question, setQuestion] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    migrateLegacyKeyIfNeeded('amanah-goals', userId).then(() => {
      getUserItem('amanah-goals', userId).then((s) => { if (s) { try { setGoals(JSON.parse(s)); } catch {} } });
    });
  }, [userId]);

  const categories = isAr ? CATEGORIES.ar : CATEGORIES.en;
  const wisdom = isAr ? WISDOM_QUOTES.ar : WISDOM_QUOTES.en;
  const habits = isAr ? HABIT_SUGGESTIONS.ar : HABIT_SUGGESTIONS.en;

  // Calls the real ai_life_coach Edge Function (Anthropic-backed) instead of
  // picking a random string from a fixed array - see Phase 4 audit notes.
  const askCoach = async (text: string) => {
    if (!text.trim() || coachLoading) return;
    if (!user) { toast.error(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first'); return; }

    const userMsg: CoachMessage = { id: Date.now().toString(), type: 'user', text, timestamp: Date.now() };
    const historyForRequest = [...messages, userMsg].slice(-6);
    setMessages((prev) => [...prev, userMsg]);
    setCoachLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first'); return; }

      const response = await fetch(AI_COACH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          message: text,
          language: isAr ? 'ar' : 'en',
          goals: goals.slice(0, 5),
          history: historyForRequest,
        }),
      });
      const data = await response.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), type: 'coach', text: data.reply, timestamp: Date.now() + 100 }]);
      } else {
        toast.error(isAr ? 'المدرب الذكي غير متاح حالياً' : 'AI coach is currently unavailable');
      }
    } catch {
      toast.error(isAr ? 'حدث خطأ في الاتصال' : 'Connection error occurred');
    } finally {
      setCoachLoading(false);
    }
  };

  const askCategoryCoach = (category: string) => {
    setSelectedCategory(category);
    askCoach(isAr ? `أحتاج نصيحة حول: ${category}` : `I need advice on: ${category}`);
  };

  const sendQuestion = () => {
    const text = question.trim();
    if (!text) return;
    setQuestion('');
    askCoach(text);
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
                  onPress={() => askCategoryCoach(cat)}
                  disabled={coachLoading}
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
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>💬 {isAr ? 'محادثة المدرب' : 'Coach Chat'}</Text>
          {messages.length > 0 && (
            <View style={{ gap: 10, marginBottom: 12 }}>
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
              {coachLoading && (
                <View style={[styles.msg, { backgroundColor: gold + '1A', borderColor: gold + '33', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }]}>
                  <ActivityIndicator size="small" color={gold} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{isAr ? 'المدرب يكتب...' : 'Coach is thinking...'}</Text>
                </View>
              )}
            </View>
          )}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={isAr ? 'اسأل مدربك الذكي...' : 'Ask your AI coach...'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg, textAlign: isRTL ? 'right' : 'left' }]}
              editable={!coachLoading}
              onSubmitEditing={sendQuestion}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: gold, opacity: coachLoading || !question.trim() ? 0.5 : 1 }]}
              onPress={sendQuestion}
              disabled={coachLoading || !question.trim()}
            >
              <Text style={{ fontSize: 16 }}>➤</Text>
            </TouchableOpacity>
          </View>
        </Card>

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
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: FONT_UI },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
