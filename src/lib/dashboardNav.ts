/**
 * Dashboard nav data — Phase G category restructure. Single source for
 * both the home screen's category selector and each category's landing
 * screen, so the two never drift out of sync.
 *
 * Blog and Settings are deliberately excluded: Settings is already
 * reachable from every screen via BottomNav + GlobalHeader, and Blog gets
 * a small link on the Growth landing screen instead of a full grid card.
 */
export type CategoryId = 'worship' | 'finance' | 'planning' | 'growth';

export interface NavItem {
  icon: string;
  title: string;
  description: string;
  path: string;
  category: CategoryId;
}

export interface CategoryDef {
  id: CategoryId;
  icon: string;
  title: string;
  description: string;
}

export function getNavItems(language: string): NavItem[] {
  const ar = language === 'ar';
  return [
    { icon: '🕌', title: ar ? 'الصلاة' : 'Prayer', description: ar ? 'تتبع الصلوات' : 'Track daily prayers', path: '/(tabs)/prayer-times', category: 'worship' },
    { icon: '📖', title: ar ? 'القرآن' : 'Quran', description: ar ? 'قراءة وحفظ' : 'Read & bookmark', path: '/(tabs)/quran', category: 'worship' },
    { icon: '🤲', title: ar ? 'الدعاء' : 'Duas', description: ar ? 'أدعية مأثورة' : 'Supplications', path: '/(tabs)/duas', category: 'worship' },
    { icon: '📿', title: ar ? 'الذكر' : 'Dhikr', description: ar ? 'التسبيح' : 'Remembrance', path: '/(tabs)/dhikr', category: 'worship' },
    { icon: '🍃', title: ar ? 'الأذكار' : 'Adhkar', description: ar ? 'الصباح والمساء' : 'Morning & Evening', path: '/(tabs)/adhkar', category: 'worship' },
    { icon: '⏱️', title: ar ? 'الصيام' : 'Fasting', description: ar ? 'تتبع الصيام' : 'Track fasting', path: '/(tabs)/fasting', category: 'worship' },
    { icon: '🧭', title: ar ? 'القبلة' : 'Qibla', description: ar ? 'تحديد الاتجاه' : 'Find direction', path: '/(tabs)/qibla', category: 'worship' },
    { icon: '🗓️', title: ar ? 'التقويم' : 'Calendar', description: ar ? 'التواريخ الهجرية' : 'Hijri dates', path: '/(tabs)/calendar', category: 'worship' },
    { icon: '🌙', title: ar ? 'رمضان' : 'Ramadan', description: ar ? 'رمضان والعيد' : 'Ramadan & Eid', path: '/(tabs)/ramadan-planner', category: 'worship' },

    { icon: '💰', title: ar ? 'المالية' : 'Finance', description: ar ? 'تتبع المالية' : 'Track finances', path: '/(tabs)/finance', category: 'finance' },
    { icon: '💎', title: ar ? 'الزكاة' : 'Zakat', description: ar ? 'تتبع العطاء' : 'Track giving', path: '/(tabs)/giving-tracker', category: 'finance' },
    { icon: '🏠', title: ar ? 'الميزانية' : 'Family Budget', description: ar ? 'مخطط الميزانية' : 'Budget planner', path: '/(tabs)/family-budget', category: 'finance' },
    { icon: '🔔', title: ar ? 'الفواتير' : 'Bill Reminders', description: ar ? 'تتبع الفواتير' : 'Track bills', path: '/(tabs)/bill-reminders', category: 'finance' },
    { icon: '📊', title: ar ? 'اللوحة المالية' : 'Financial Dashboard', description: ar ? 'مؤشرات مالية' : 'Lifestyle KPIs', path: '/(tabs)/financial-dashboard', category: 'finance' },
    { icon: '📈', title: ar ? 'الاستثمار الحلال' : 'Halal Investment', description: ar ? 'التمويل الأخلاقي' : 'Ethical finance', path: '/(tabs)/halal-investment', category: 'finance' },
    { icon: '🏆', title: ar ? 'تحديات الادخار' : 'Savings Challenges', description: ar ? 'تحديات ممتعة' : 'Gamified saving', path: '/(tabs)/savings-challenges', category: 'finance' },
    { icon: '📸', title: ar ? 'ماسح الإيصالات' : 'Receipt Scanner', description: ar ? 'مسح وتصنيف' : 'Scan & categorize', path: '/(tabs)/receipt-scanner', category: 'finance' },

    { icon: '✅', title: ar ? 'المهام' : 'Tasks', description: ar ? 'إدارة المهام' : 'Manage tasks', path: '/(tabs)/tasks', category: 'planning' },
    { icon: '🌅', title: ar ? 'الروتين اليومي' : 'Daily Routine', description: ar ? 'العادات اليومية' : 'Daily habits', path: '/(tabs)/daily-routine', category: 'planning' },
    { icon: '📋', title: ar ? 'المخطط' : 'Planner', description: ar ? 'خطط يومك' : 'Plan your day', path: '/(tabs)/planner', category: 'planning' },
    { icon: '🎯', title: ar ? 'الأهداف' : 'Goals', description: ar ? 'تتبع الأهداف' : 'Track goals', path: '/(tabs)/goals', category: 'planning' },

    { icon: '💚', title: ar ? 'العافية' : 'Wellness', description: ar ? 'تتبع الصحة' : 'Health tracking', path: '/(tabs)/wellness', category: 'growth' },
    { icon: '🤖', title: ar ? 'المدرب الذكي' : 'AI Coach', description: ar ? 'نصائح مخصصة' : 'Personalized coaching', path: '/(tabs)/ai-life-coach', category: 'growth' },
    { icon: '💯', title: ar ? 'مؤشر الحياة' : 'Life Score', description: ar ? 'تقييم أسبوعي' : 'Weekly assessment', path: '/(tabs)/weekly-life-score', category: 'growth' },
    { icon: '📊', title: ar ? 'التحليلات' : 'Analytics', description: ar ? 'تتبع وتحليل' : 'Track & analyze', path: '/(tabs)/progress-analytics', category: 'growth' },
  ];
}

export function getCategories(language: string): CategoryDef[] {
  const ar = language === 'ar';
  return [
    { id: 'worship', icon: '🕌', title: ar ? 'العبادة' : 'Worship', description: ar ? 'الصلاة والقرآن والأذكار' : 'Prayer, Quran & remembrance' },
    { id: 'finance', icon: '💰', title: ar ? 'المالية' : 'Finance', description: ar ? 'الميزانية والزكاة والادخار' : 'Budget, Zakat & saving' },
    { id: 'planning', icon: '📋', title: ar ? 'التخطيط' : 'Planning', description: ar ? 'المهام والأهداف والروتين' : 'Tasks, goals & routines' },
    { id: 'growth', icon: '💯', title: ar ? 'النمو' : 'Growth', description: ar ? 'العافية ومؤشر الحياة' : 'Wellness & life score' },
  ];
}
