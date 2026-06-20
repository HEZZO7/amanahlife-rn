/**
 * LanguageContext — React Native
 * Migrated from app/frontend/src/contexts/LanguageContext.tsx
 * Replaces localStorage with AsyncStorage
 * Replaces document.dir with I18nManager.forceRTL
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'ar' | 'en';

// Full translations migrated from web app
const translations: Record<string, { ar: string; en: string }> = {
  home: { ar: 'الرئيسية', en: 'Home' },
  prayer: { ar: 'الصلاة', en: 'Prayer' },
  quran: { ar: 'القرآن', en: 'Quran' },
  dhikr: { ar: 'الذكر', en: 'Dhikr' },
  duas: { ar: 'الدعاء', en: 'Duas' },
  dailyRoutine: { ar: 'الورد اليومي', en: 'Daily Routine' },
  fasting: { ar: 'الصيام', en: 'Fasting' },
  tasks: { ar: 'المهام', en: 'Tasks' },
  adhkar: { ar: 'الأذكار', en: 'Adhkar' },
  finance: { ar: 'المالية', en: 'Finance' },
  welcome: { ar: 'مرحباً بك', en: 'Welcome' },
  chooseLanguage: { ar: 'اختر لغتك', en: 'Choose your language' },
  arabic: { ar: 'العربية', en: 'Arabic' },
  english: { ar: 'الإنجليزية', en: 'English' },
  continue: { ar: 'متابعة', en: 'Continue' },
  morning: { ar: 'أذكار الصباح', en: 'Morning Adhkar' },
  evening: { ar: 'أذكار المساء', en: 'Evening Adhkar' },
  income: { ar: 'الدخل', en: 'Income' },
  expense: { ar: 'المصروفات', en: 'Expense' },
  savings: { ar: 'المدخرات', en: 'Savings' },
  addTransaction: { ar: 'إضافة معاملة', en: 'Add Transaction' },
  amount: { ar: 'المبلغ', en: 'Amount' },
  category: { ar: 'الفئة', en: 'Category' },
  description: { ar: 'الوصف', en: 'Description' },
  goals: { ar: 'الأهداف', en: 'Goals' },
  wellness: { ar: 'العافية', en: 'Wellness' },
  planner: { ar: 'المخطط', en: 'Planner' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  search: { ar: 'بحث', en: 'Search' },
  more: { ar: 'المزيد', en: 'More' },
  zakat: { ar: 'حاسبة العطاء', en: 'Giving Tracker' },
  qibla: { ar: 'القبلة', en: 'Qibla' },
  calendar: { ar: 'التقويم', en: 'Calendar' },
  signOut: { ar: 'تسجيل الخروج', en: 'Sign Out' },
  assalamuAlaikum: { ar: 'السلام عليكم! 👋', en: 'Assalamu Alaikum! 👋' },
  islamicCompanion: { ar: 'رفيقك الذكي', en: 'Your smart life companion' },
  quickActions: { ar: 'إجراءات سريعة', en: 'Quick Actions' },
  verseOfDay: { ar: 'آية اليوم', en: 'Verse of the Day' },
  nextPrayer: { ar: 'الصلاة القادمة', en: 'Next Prayer' },
  prayerStreak: { ar: 'تتابع الصلاة', en: 'Prayer Streak' },
  today: { ar: 'اليوم', en: 'Today' },
  streak: { ar: 'التتابع', en: 'Streak' },
  days: { ar: 'أيام', en: 'days' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  delete: { ar: 'حذف', en: 'Delete' },
  edit: { ar: 'تعديل', en: 'Edit' },
  darkMode: { ar: 'الوضع الداكن', en: 'Dark Mode' },
  lightMode: { ar: 'الوضع الفاتح', en: 'Light Mode' },
  transactions: { ar: 'المعاملات', en: 'Transactions' },
  addGoal: { ar: 'إضافة هدف', en: 'Add Goal' },
  progress: { ar: 'التقدم', en: 'Progress' },
  profile: { ar: 'الملف الشخصي', en: 'Profile' },
  currency: { ar: 'العملة', en: 'Currency' },
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  spiritual: { ar: 'روحي', en: 'Spiritual' },
  family: { ar: 'عائلي', en: 'Family' },
  mood: { ar: 'المزاج', en: 'Mood' },
  hydration: { ar: 'الماء', en: 'Hydration' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lock the native RTL layer to LTR always.
    // All RTL layout is handled manually via the `isRTL` value from this
    // context (flexDirection, textAlign, etc.) — this gives instant switching
    // without needing an app reload and avoids double-reversal bugs.
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);

    AsyncStorage.getItem('amanah_language').then((stored) => {
      if (stored === 'ar' || stored === 'en') {
        setLanguageState(stored);
      }
      setReady(true);
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('amanah_language', lang);
    await AsyncStorage.setItem('al_lang', lang);
  };

  const t = (key: string): string => {
    return translations[key]?.[language] ?? key;
  };

  const isRTL = language === 'ar';

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context ?? {
    language: 'en' as Language,
    setLanguage: async () => {},
    t: (key: string) => key,
    isRTL: false,
  };
}

export async function hasLanguagePreference(): Promise<boolean> {
  const val = await AsyncStorage.getItem('amanah_language');
  return val !== null;
}
