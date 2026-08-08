/**
 * AI Smart Search — natural language search across the user's own real data.
 * Calls the real app_11941c8fec_ai_search Edge Function (Claude-backed,
 * built in Phase J). Previously this screen called functionUrl('ai_search'),
 * a slug that was never deployed - every query silently fell through to the
 * local KB fallback below and never reached the real backend, since before
 * this session started. Mirrors web's AISearch.tsx: gathers the user's own
 * local tasks/goals/transactions/adhkar/Quran data and sends it in the
 * request body (Phase J's design - there's no server-side table for any of
 * that to query), and renders the real {type,title,description,icon}[]
 * results into this screen's existing chat-bubble UI rather than a single
 * free-text answer. Falls back to the local keyword KB only for genuine
 * backend-unavailable cases (no session, network error, non-2xx) - a
 * successful call that legitimately found nothing shows an honest "no
 * results" message instead, never the unrelated canned KB answer.
 * Full RTL support via useRTL hook. Gated "balanced"-tier via PremiumGate,
 * matching web's PremiumGate requiredTier.
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { TRIAL_DURATION_DAYS } from '../../src/contexts/SubscriptionContext';
import { useRTL } from '../../src/hooks/useRTL';
import { supabase } from '../../src/lib/supabase';
import { functionUrl } from '../../src/lib/config';
import { getUserItem } from '../../src/lib/userStorage';
import { PageHeader } from '../../src/components/ui';
import PremiumGate from '../../src/components/PremiumGate';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK, FONT_ARABIC } from '../../src/theme/fonts';

const AI_ENDPOINT = functionUrl('app_11941c8fec_ai_search');

interface AISearchResult { type: string; title: string; description: string; icon: string; }

// Same keys each screen already reads/writes (grepped each one's own
// storage call before using it here) - no new storage format invented.
async function gatherLocalData(userId: string | null) {
  const readJson = async (key: string, fallback: unknown) => {
    try {
      const raw = await getUserItem(key, userId);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const [tasks, goals, transactions, adhkarToday, quranBookmarks, quranLastRead] = await Promise.all([
    readJson('amanah_tasks', []),
    readJson('amanah-goals', []),
    readJson('amanah_finance', []),
    readJson(`adhkar_progress_${new Date().toDateString()}`, null),
    readJson('quran_bookmarks', []),
    readJson('quran_last_read', null),
  ]);

  return {
    tasks: (tasks as unknown[]).slice(0, 30),
    goals: (goals as unknown[]).slice(0, 20),
    transactions: (transactions as unknown[]).slice(-30),
    adhkarToday,
    quranBookmarks: (quranBookmarks as unknown[]).slice(0, 20),
    quranLastRead,
  };
}

function formatResults(results: AISearchResult[], isAr: boolean): string {
  if (results.length === 0) {
    return isAr ? 'لم يتم العثور على نتائج مطابقة في بياناتك.' : "I couldn't find anything matching that in your data.";
  }
  return results.map((r) => `${r.icon} ${r.title}${r.description ? `\n   ${r.description}` : ''}`).join('\n\n');
}

// ── Local fallback knowledge base ──────────────────────────────────────────────
const KB: { keywords: string[]; answer: { en: string; ar: string } }[] = [
  {
    keywords: ['prayer', 'salah', 'صلاة', 'صلوات', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'],
    answer: { en: 'AmanahLife shows your 5 daily prayer times based on your location using the aladhan.com API. Head to the Prayer Times screen to see Fajr, Dhuhr, Asr, Maghrib, and Isha — and mark each one as done to build your streak.', ar: 'يعرض AmanahLife أوقات الصلوات الخمس بناءً على موقعك باستخدام واجهة aladhan.com. توجه إلى شاشة مواقيت الصلاة لرؤية الفجر والظهر والعصر والمغرب والعشاء، وسجّل كل صلاة لبناء تتابعك اليومي.' },
  },
  {
    keywords: ['quran', 'قرآن', 'surah', 'سورة', 'ayah', 'آية', 'read', 'قراءة'],
    answer: { en: 'The Quran Reader in AmanahLife fetches all 114 surahs from alquran.cloud with Arabic text and English translation side by side. You can bookmark ayahs and resume from where you left off.', ar: 'يجلب قارئ القرآن في AmanahLife جميع السور الـ 114 من alquran.cloud مع النص العربي والترجمة الإنجليزية جنباً إلى جنب. يمكنك وضع إشارات مرجعية على الآيات والمتابعة من حيث توقفت.' },
  },
  {
    keywords: ['zakat', 'زكاة', 'nisab', 'نصاب', 'giving', 'عطاء', 'charity', 'صدقة'],
    answer: { en: `The Zakat & Giving screen calculates your zakat obligation at 2.5% of wealth above nisab. Enter your assets, liabilities, and choose from 12 currencies with live exchange rates. It also shows a ${TRIAL_DURATION_DAYS}-day free trial for premium features.`, ar: 'تحسب شاشة الزكاة والعطاء التزامك بالزكاة بنسبة 2.5% من الثروة فوق النصاب. أدخل أصولك والتزاماتك واختر من 12 عملة بأسعار صرف حية.' },
  },
  {
    keywords: ['dhikr', 'ذكر', 'subhanallah', 'سبحان', 'alhamdulillah', 'الحمد', 'counter', 'عداد'],
    answer: { en: 'The Dhikr Counter lets you count SubhanAllah, Alhamdulillah, Allahu Akbar, and other adhkar. It has a progress ring, vibration feedback, and saves your daily count automatically.', ar: 'يتيح لك عداد الذكر حساب سبحان الله والحمد لله والله أكبر وغيرها. يحتوي على حلقة تقدم وتغذية راجعة بالاهتزاز ويحفظ عدادك اليومي تلقائياً.' },
  },
  {
    keywords: ['fasting', 'صيام', 'صوم', 'iftar', 'إفطار', 'suhoor', 'سحور', 'ramadan', 'رمضان'],
    answer: { en: 'Use the Fasting Tracker to log your suhoor, fasting, and iftar each day. The 30-day grid shows your progress for the month. Also track Quran pages read each day.', ar: 'استخدم متتبع الصيام لتسجيل سحورك وصيامك وإفطارك كل يوم. تُظهر شبكة 30 يوماً تقدمك للشهر. يمكنك أيضاً تتبع صفحات القرآن التي تقرأها كل يوم.' },
  },
  {
    keywords: ['finance', 'مالية', 'money', 'مال', 'income', 'دخل', 'expense', 'مصروف', 'savings', 'ادخار', 'budget', 'ميزانية'],
    answer: { en: 'The Finance screen tracks your income, expenses, and savings rate. Add transactions with categories, and view your monthly summary. The Family Budget screen allows multiple family members to track shared expenses.', ar: 'تتتبع شاشة المالية دخلك ومصاريفك ومعدل ادخارك. أضف المعاملات بالفئات واعرض ملخصك الشهري. تتيح شاشة ميزانية العائلة لأفراد الأسرة تتبع المصاريف المشتركة.' },
  },
  {
    keywords: ['goals', 'أهداف', 'goal', 'هدف', 'progress', 'تقدم', 'achieve', 'إنجاز'],
    answer: { en: 'Set personal, financial, spiritual, and family goals in the Goals screen. Track percentage progress with colorful gradient bars and link tasks to goals.', ar: 'ضع أهدافاً شخصية ومالية وروحية وعائلية في شاشة الأهداف. تتبع نسبة التقدم بأشرطة متدرجة ملونة وربط المهام بالأهداف.' },
  },
  {
    keywords: ['wellness', 'عافية', 'health', 'صحة', 'mood', 'مزاج', 'sleep', 'نوم', 'stress', 'توتر', 'hydration', 'ماء'],
    answer: { en: 'Log your daily wellness in the Wellness screen: mood (5 emoji scale), sleep hours, hydration cups, and stress level. See your weekly trend as a bar chart and get an overall wellness score out of 100.', ar: 'سجّل عافيتك اليومية في شاشة العافية: المزاج (5 رموز تعبيرية)، ساعات النوم، أكواب الماء، ومستوى التوتر. شاهد اتجاهك الأسبوعي كمخطط أعمدة واحصل على درجة عافية إجمالية من 100.' },
  },
  {
    keywords: ['qibla', 'قبلة', 'direction', 'اتجاه', 'kaaba', 'كعبة', 'mecca', 'مكة', 'compass', 'بوصلة'],
    answer: { en: 'The Qibla Finder uses your device compass and GPS to show the exact direction to the Kaaba in Mecca. Hold your phone flat for best accuracy.', ar: 'يستخدم محدد القبلة بوصلة جهازك ونظام GPS لإظهار الاتجاه الدقيق نحو الكعبة المشرفة في مكة المكرمة. امسك هاتفك بشكل مستوٍ للحصول على أفضل دقة.' },
  },
  {
    keywords: ['subscription', 'اشتراك', 'plan', 'خطة', 'premium', 'مميز', 'price', 'سعر', 'free', 'مجاني', 'trial', 'تجربة'],
    answer: { en: 'AmanahLife has 3 plans: Free (prayer, Quran, dhikr), Balanced Life at $6.99/mo (AI insights, lifestyle tracking), and Family Plan at $12.99/mo (family sharing, shared dashboard). A 7-day free trial is available.', ar: 'يتضمن AmanahLife 3 خطط: مجانية (صلاة، قرآن، ذكر)، الحياة المتوازنة بـ 6.99$/شهر (رؤى ذكاء اصطناعي، تتبع نمط الحياة)، وخطة العائلة بـ 12.99$/شهر (مشاركة عائلية، لوحة مشتركة). تجربة مجانية لمدة 7 أيام متاحة.' },
  },
];

function localAnswer(query: string, isAr: boolean): string {
  const q = query.toLowerCase();
  for (const item of KB) {
    if (item.keywords.some(k => q.includes(k.toLowerCase()))) {
      return isAr ? item.answer.ar : item.answer.en;
    }
  }
  return isAr
    ? 'لم أجد إجابة محددة لسؤالك. جرّب أن تسأل عن الصلاة، القرآن، الزكاة، الصيام، المالية، الأهداف، أو الاشتراك.'
    : "I couldn't find a specific answer. Try asking about prayer times, Quran, zakat, fasting, finance, goals, or subscription plans.";
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Message { role: 'user' | 'ai'; text: string; }

export default function AISearch() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isRTL, rtlText, rtlView, rtlAlign, language } = useRTL();
  const isAr = language === 'ar';

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendQuery = async () => {
    const q = query.trim();
    if (!q || loading) return;
    const userMsg: Message = { role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const localData = await gatherLocalData(user?.id ?? null);
        const res = await fetch(AI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ query: q, language, data: localData }),
        });
        if (res.ok) {
          const resJson = await res.json();
          if (!resJson.error) {
            const text = formatResults(resJson.results || [], isAr);
            setMessages(prev => [...prev, { role: 'ai', text }]);
            setLoading(false);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
            return;
          }
        }
      }
      // Backend unavailable (no session, non-2xx, or an error field) - only
      // now fall back to the local KB. A successful call with a real but
      // empty results array is handled above via formatResults, not here.
      const fallback = localAnswer(q, isAr);
      setMessages(prev => [...prev, { role: 'ai', text: fallback }]);
    } catch {
      const fallback = localAnswer(q, isAr);
      setMessages(prev => [...prev, { role: 'ai', text: fallback }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const SUGGESTIONS = isAr
    ? ['ما هي مواقيت الصلاة؟', 'كيف أحسب الزكاة؟', 'كيف أتابع صيامي؟', 'ما هي خطط الاشتراك؟']
    : ['What are prayer times?', 'How do I calculate zakat?', 'How do I track fasting?', "What's included in each plan?"];

  return (
    <PremiumGate requiredTier="balanced" screenIcon="🤖" screenTitle="AI Smart Search" screenTitleAr="البحث الذكي بالذكاء الاصطناعي">
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHeader icon="🤖" title={isAr ? 'البحث الذكي بالذكاء الاصطناعي' : 'AI Smart Search'} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Welcome */}
        {messages.length === 0 && (
          <View style={[styles.welcome, rtlAlign as any]}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🧠</Text>
            <Text style={[styles.welcomeTitle, { color: colors.text }, rtlText as any]}>
              {isAr ? 'المساعد الذكي' : 'AI Assistant'}
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.textSecondary }, rtlText as any]}>
              {isAr ? 'اسأل عن أي شيء في التطبيق — الصلاة، القرآن، الزكاة، الصيام، المالية، والمزيد' : 'Ask anything about the app — prayer, Quran, zakat, fasting, finance, and more'}
            </Text>
            <Text style={[styles.suggestLabel, { color: colors.textSecondary }, rtlText as any]}>
              {isAr ? 'اقتراحات:' : 'Suggestions:'}
            </Text>
            <View style={styles.suggestWrap}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.suggestChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { setQuery(s); }}
                >
                  <Text style={[{ color: colors.text, fontSize: 12.5, fontFamily: FONT_UI_MEDIUM }, rtlText as any]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <View key={i} style={[
            styles.bubble,
            msg.role === 'user'
              ? [styles.userBubble, { backgroundColor: colors.teal, alignSelf: isRTL ? 'flex-start' : 'flex-end' }]
              : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, alignSelf: isRTL ? 'flex-end' : 'flex-start' }],
          ]}>
            {msg.role === 'ai' && (
              <Text style={[styles.aiLabel, { color: colors.gold, textAlign: isRTL ? 'right' : 'left' }]}>
                {isAr ? `المساعد الذكي 🤖` : `🤖 AI`}
              </Text>
            )}
            <Text style={[
              styles.bubbleText,
              { color: msg.role === 'user' ? '#04211C' : colors.text },
              rtlText as any,
            ]}>{msg.text}</Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            <ActivityIndicator color={colors.teal} size="small" />
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.bg, borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: isRTL ? 'rtl' : 'ltr',
            },
          ]}
          placeholder={isAr ? 'اسأل سؤالاً...' : 'Ask a question...'}
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={sendQuery}
          returnKeyType="send"
          multiline
          textAlign={isRTL ? 'right' : 'left'}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: query.trim() ? colors.teal : colors.surface }]}
          onPress={sendQuery}
          disabled={!query.trim() || loading}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  msgList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  welcome: { alignItems: 'center', paddingVertical: 32 },
  welcomeTitle: { fontSize: 22, fontFamily: FONT_UI_BLACK, marginBottom: 8, textAlign: 'center' },
  welcomeSub: { fontSize: 14, fontFamily: FONT_UI, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  suggestLabel: { fontSize: 12, fontFamily: FONT_UI_MEDIUM, marginBottom: 10 },
  suggestWrap: { gap: 8, width: '100%' },
  suggestChip: { padding: 12, borderRadius: 12, borderWidth: 1 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12, marginBottom: 10 },
  userBubble: {},
  aiBubble: { borderWidth: 1 },
  aiLabel: { fontSize: 11, fontFamily: FONT_UI_BOLD, marginBottom: 4, alignSelf: 'stretch' },
  bubbleText: { fontSize: 14, fontFamily: FONT_UI, lineHeight: 22, alignSelf: 'stretch' },
  inputBar: { padding: 12, borderTopWidth: 1, gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: FONT_UI, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
