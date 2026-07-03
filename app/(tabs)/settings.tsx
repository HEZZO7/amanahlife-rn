/**
 * Settings — migrated from app/frontend/src/pages/Settings.tsx
 * Subscription/profile, theme & language toggles, country picker (modal),
 * currency, Islamic toggles (RN Switch), CSV export (browser download → RN
 * Share), delete-account flow (Supabase edge fn) + confirm modal, sign out.
 * localStorage('amanah-settings') → AsyncStorage. sonner → src/lib/toast.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal, Pressable, TextInput, Share, ActivityIndicator, Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import { useBottomSheetPadding } from '../../src/lib/useBottomSheet';
import { useRTL } from '../../src/hooks/useRTL';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { supabase } from '../../src/lib/supabase';
import {
  PrayerName, PrayerReminderSettings, DEFAULT_REMINDER_SETTINGS,
  getReminderSettings, saveReminderSettings, schedulePrayerNotifications,
} from '../../src/lib/prayerNotifications';
import { PageHeader, Card } from '../../src/components/ui';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

interface AppSettings { currency: string; country: string; showHijri: boolean; showIslamicEvents: boolean; ramadanMode: boolean; easternNumerals: boolean; }

const COUNTRIES = [
  { code: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', currency: 'SAR', symbol: '﷼', flag: '🇸🇦' },
  { code: 'AE', nameAr: 'الإمارات', nameEn: 'UAE', currency: 'AED', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', currency: 'KWD', symbol: 'د.ك', flag: '🇰🇼' },
  { code: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', currency: 'BHD', symbol: '.د.ب', flag: '🇧🇭' },
  { code: 'OM', nameAr: 'عمان', nameEn: 'Oman', currency: 'OMR', symbol: 'ر.ع', flag: '🇴🇲' },
  { code: 'QA', nameAr: 'قطر', nameEn: 'Qatar', currency: 'QAR', symbol: 'ر.ق', flag: '🇶🇦' },
  { code: 'EG', nameAr: 'مصر', nameEn: 'Egypt', currency: 'EGP', symbol: 'ج.م', flag: '🇪🇬' },
  { code: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', currency: 'JOD', symbol: 'د.أ', flag: '🇯🇴' },
  { code: 'IQ', nameAr: 'العراق', nameEn: 'Iraq', currency: 'IQD', symbol: 'ع.د', flag: '🇮🇶' },
  { code: 'LB', nameAr: 'لبنان', nameEn: 'Lebanon', currency: 'LBP', symbol: 'ل.ل', flag: '🇱🇧' },
  { code: 'SY', nameAr: 'سوريا', nameEn: 'Syria', currency: 'SYP', symbol: 'ل.س', flag: '🇸🇾' },
  { code: 'TR', nameAr: 'تركيا', nameEn: 'Turkey', currency: 'TRY', symbol: '₺', flag: '🇹🇷' },
  { code: 'MY', nameAr: 'ماليزيا', nameEn: 'Malaysia', currency: 'MYR', symbol: 'RM', flag: '🇲🇾' },
  { code: 'ID', nameAr: 'إندونيسيا', nameEn: 'Indonesia', currency: 'IDR', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'PK', nameAr: 'باكستان', nameEn: 'Pakistan', currency: 'PKR', symbol: '₨', flag: '🇵🇰' },
  { code: 'BD', nameAr: 'بنغلاديش', nameEn: 'Bangladesh', currency: 'BDT', symbol: '৳', flag: '🇧🇩' },
  { code: 'IN', nameAr: 'الهند', nameEn: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳' },
  { code: 'US', nameAr: 'الولايات المتحدة', nameEn: 'USA', currency: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'CA', nameAr: 'كندا', nameEn: 'Canada', currency: 'CAD', symbol: 'C$', flag: '🇨🇦' },
  { code: 'EU', nameAr: 'منطقة اليورو', nameEn: 'Eurozone', currency: 'EUR', symbol: '€', flag: '🇪🇺' },
  { code: 'GB', nameAr: 'المملكة المتحدة', nameEn: 'UK', currency: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'CH', nameAr: 'سويسرا', nameEn: 'Switzerland', currency: 'CHF', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'AU', nameAr: 'أستراليا', nameEn: 'Australia', currency: 'AUD', symbol: 'A$', flag: '🇦🇺' },
  { code: 'NZ', nameAr: 'نيوزيلندا', nameEn: 'New Zealand', currency: 'NZD', symbol: 'NZ$', flag: '🇳🇿' },
];
const DEFAULT_SETTINGS: AppSettings = { currency: 'QAR', country: 'QA', showHijri: true, showIslamicEvents: true, ramadanMode: false, easternNumerals: false };

export default function Settings() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme, colors, autoSwitch, setAutoSwitch } = useTheme();
  const isAr = language === 'ar';
  const sheetPb = useBottomSheetPadding();
  const { rtlText, rtlView } = useRTL();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [reminders, setReminders] = useState<PrayerReminderSettings>(DEFAULT_REMINDER_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem('amanah-settings').then((s) => { if (s) { try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) }); } catch {} } setReady(true); });
    getReminderSettings().then(setReminders);
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem('amanah-settings', JSON.stringify(settings)); }, [settings, ready]);

  const updateReminders = async (next: PrayerReminderSettings) => {
    setReminders(next);
    await saveReminderSettings(next);
    await schedulePrayerNotifications(next, isAr);
  };
  const togglePrayerReminder = (prayer: PrayerName) =>
    updateReminders({ ...reminders, perPrayer: { ...reminders.perPrayer, [prayer]: !reminders.perPrayer[prayer] } });

  const updateSetting = (key: keyof AppSettings, value: boolean | string) => setSettings((p) => ({ ...p, [key]: value }));
  const handleCountryChange = (code: string) => {
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) setSettings((p) => ({ ...p, country: code, currency: country.currency }));
    setShowCountryPicker(false);
  };
  const getSelectedCountry = () => COUNTRIES.find((c) => c.code === settings.country);

  const exportCSV = async (rows: string, filename: string, label: string) => {
    if (!rows) { toast.info(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export'); return; }
    try { await Share.share({ message: rows, title: filename }); }
    catch { toast.error(isAr ? 'فشل التصدير' : 'Export failed'); }
  };
  const exportFinanceCSV = async () => {
    const transactions = JSON.parse((await AsyncStorage.getItem('amanah_finance')) || '[]');
    if (transactions.length === 0) { toast.info(isAr ? 'لا توجد معاملات' : 'No transactions'); return; }
    const headers = 'Date,Type,Category,Amount,Description\n';
    const rows = transactions.map((t: any) => `${t.date || ''},${t.type || ''},${t.category || ''},${t.amount || 0},${t.description || ''}`).join('\n');
    exportCSV(headers + rows, 'amanah-finance-export.csv', 'finance');
  };
  const exportGoalsCSV = async () => {
    const goals = JSON.parse((await AsyncStorage.getItem('amanah-goals')) || '[]');
    if (goals.length === 0) { toast.info(isAr ? 'لا توجد أهداف' : 'No goals'); return; }
    const headers = 'Title,Category,Status,Progress,Target Date\n';
    const rows = goals.map((g: any) => `${g.title || ''},${g.category || ''},${g.status || ''},${g.progress || 0}%,${g.targetDate || ''}`).join('\n');
    exportCSV(headers + rows, 'amanah-goals-export.csv', 'goals');
  };

  const BACKUP_KEYS = [
    'amanah-agenda', 'amanah-goals', 'amanah-settings', 'amanah-streaks', 'amanah-tasks',
    'amanah-theme', 'amanah-theme-autoswitch', 'amanah-transactions', 'amanah-wellness',
    'amanah_finance', 'amanah_language', 'amanah_tasks', 'dua_favorites', 'quran_bookmarks', 'quran_last_read',
  ];

  const [backupBusy, setBackupBusy] = useState(false);

  const exportAllData = async () => {
    setBackupBusy(true);
    try {
      const entries = await AsyncStorage.multiGet(BACKUP_KEYS);
      const data: Record<string, string | null> = {};
      entries.forEach(([key, value]) => { data[key] = value; });
      const payload = {
        timestamp: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
        data,
      };
      const fileUri = FileSystem.documentDirectory + `amanahlife-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));
      await Share.share({ url: fileUri, message: isAr ? 'نسخة احتياطية من أمانة لايف' : 'AmanahLife backup' });
      toast.success(isAr ? 'تم تصدير البيانات' : 'Data exported');
    } catch {
      toast.error(isAr ? 'فشل التصدير' : 'Export failed');
    } finally {
      setBackupBusy(false);
    }
  };

  const importAllData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets?.[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const payload = JSON.parse(content);
      if (!payload.data) throw new Error('invalid backup file');

      const doRestore = async () => {
        setBackupBusy(true);
        try {
          const pairs: [string, string][] = Object.entries(payload.data)
            .filter(([, v]) => typeof v === 'string')
            .map(([k, v]) => [k, v as string]);
          await AsyncStorage.multiSet(pairs);
          toast.success(isAr ? 'تم استعادة البيانات. أعد تشغيل التطبيق لتطبيق التغييرات.' : 'Data restored. Restart the app to apply changes.');
        } finally {
          setBackupBusy(false);
        }
      };

      Alert.alert(
        isAr ? 'استعادة البيانات' : 'Restore Data',
        isAr
          ? 'سيؤدي هذا إلى استبدال بياناتك الحالية بالكامل بالبيانات الموجودة في هذا الملف. هل تريد المتابعة؟'
          : 'This will completely overwrite your current data with the contents of this file. Continue?',
        [
          { text: isAr ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: isAr ? 'استعادة' : 'Restore', style: 'destructive', onPress: doRestore },
        ]
      );
      return;
    } catch {
      toast.error(isAr ? 'ملف نسخة احتياطية غير صالح' : 'Invalid backup file');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') { toast.error(isAr ? 'يرجى كتابة DELETE للتأكيد' : 'Please type DELETE to confirm'); return; }
    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error(isAr ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first'); setDeleteLoading(false); return; }
      const response = await fetch('https://nyhsnvjdgifphwkqzwel.supabase.co/functions/v1/app_11941c8fec_delete_account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error || 'Failed to delete account'); }
      toast.success(isAr ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
      await AsyncStorage.clear();
      await signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isAr ? 'فشل حذف الحساب' : 'Failed to delete account'));
    }
    setDeleteLoading(false); setShowDeleteDialog(false); setDeleteConfirmText('');
  };

  const country = getSelectedCountry();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="⚙️" title={isAr ? 'الإعدادات' : 'Settings'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subscription */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'الاشتراك' : 'Subscription'}</Text>
          <View style={[styles.rowBetween, { ...rtlView }]}>
            <View style={[styles.profileLeft, { ...rtlView }]}>
              <LinearGradient colors={['#C9A96E', '#A67C3D']} style={styles.avatar}><Text style={{ fontSize: 16 }}>👑</Text></LinearGradient>
              <View>
                <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'مجاني' : 'Free'}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>{isAr ? 'باقتك الحالية' : 'Current Plan'}</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.manageBtn, { backgroundColor: '#C9A96E' }]} onPress={() => router.push('/(tabs)/subscription')}>
              <Text style={{ color: '#fff', fontSize: 12, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إدارة' : 'Manage'}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Profile */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'الملف الشخصي' : 'Profile'}</Text>
          <View style={[styles.profileLeft, { ...rtlView }]}>
            <LinearGradient colors={[colors.teal, '#178F8A']} style={styles.avatarLg}>
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONT_UI_BOLD }}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
            </LinearGradient>
            <View>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>{user?.email || 'User'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI }}>AmanahLife Member</Text>
            </View>
          </View>
        </Card>

        {/* Theme */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'المظهر' : 'Theme'}</Text>
          <ToggleRow icon={theme === 'dark' ? '🌙' : '☀️'} label={theme === 'dark' ? (isAr ? 'الوضع الداكن' : 'Dark Mode') : (isAr ? 'الوضع الفاتح' : 'Light Mode')} value={theme === 'dark'} onChange={toggleTheme} colors={colors} isAr={isAr} />
          <ToggleRow icon="🌗" label={isAr ? 'التبديل التلقائي (شروق/غروب)' : 'Auto-switch (sunrise/sunset)'} value={autoSwitch} onChange={() => setAutoSwitch(!autoSwitch)} colors={colors} isAr={isAr} />
        </Card>

        {/* Language */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'اختر لغتك' : 'Choose Language'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.langBtn, { backgroundColor: language === 'en' ? colors.teal : colors.bg, borderColor: colors.border }]} onPress={() => setLanguage('en')}>
              <Text style={{ color: language === 'en' ? '#04211C' : colors.textSecondary, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>🇬🇧 English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, { backgroundColor: language === 'ar' ? colors.teal : colors.bg, borderColor: colors.border }]} onPress={() => setLanguage('ar')}>
              <Text style={{ color: language === 'ar' ? '#04211C' : colors.textSecondary, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>🇸🇦 العربية</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Regional */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'الإقليمية' : 'Regional'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginBottom: 6, ...rtlText }}>{isAr ? 'الدولة' : 'Country'}</Text>
          <TouchableOpacity style={[styles.countryBtn, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setShowCountryPicker(true)}>
            <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI }}>{country?.flag} {isAr ? country?.nameAr : country?.nameEn}</Text>
            <Text style={{ color: colors.textSecondary }}>▾</Text>
          </TouchableOpacity>
          <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
            <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI }}>{isAr ? 'العملة' : 'Currency'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: FONT_UI }}>{settings.currency} {country?.symbol || ''}</Text>
          </View>
        </Card>

        {/* Islamic toggles */}
        <Card style={{ marginBottom: 14, gap: 14 }}>
          <ToggleRow icon="📅" label={isAr ? 'التقويم الهجري' : 'Hijri Calendar'} value={settings.showHijri} onChange={() => updateSetting('showHijri', !settings.showHijri)} colors={colors} isAr={isAr} />
          <ToggleRow icon="🕌" label={isAr ? 'المناسبات الإسلامية' : 'Islamic Events'} value={settings.showIslamicEvents} onChange={() => updateSetting('showIslamicEvents', !settings.showIslamicEvents)} colors={colors} isAr={isAr} />
          <ToggleRow icon="🌙" label={isAr ? 'وضع رمضان' : 'Ramadan Mode'} value={settings.ramadanMode} onChange={() => updateSetting('ramadanMode', !settings.ramadanMode)} colors={colors} isAr={isAr} />
          <ToggleRow icon="١٢٣" label={isAr ? 'الأرقام العربية' : 'Eastern Numerals'} value={settings.easternNumerals} onChange={() => updateSetting('easternNumerals', !settings.easternNumerals)} colors={colors} isAr={isAr} />
        </Card>

        {/* Backup & Restore */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? '💾 النسخ الاحتياطي والاستعادة' : '💾 Backup & Restore'}</Text>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isAr ? 'row-reverse' : 'row', opacity: backupBusy ? 0.5 : 1 }]}
            onPress={exportAllData}
            disabled={backupBusy}
          >
            <Text style={{ fontSize: 16 }}>⬇️</Text>
            <View><Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI, textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'تصدير البيانات' : 'Export Data'}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>{isAr ? 'تنزيل نسخة JSON' : 'Download JSON backup'}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 8, flexDirection: isAr ? 'row-reverse' : 'row', opacity: backupBusy ? 0.5 : 1 }]}
            onPress={importAllData}
            disabled={backupBusy}
          >
            <Text style={{ fontSize: 16 }}>⬆️</Text>
            <View><Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI, textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'استعادة البيانات' : 'Import Data'}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>{isAr ? 'استعادة من ملف JSON' : 'Restore from JSON file'}</Text></View>
          </TouchableOpacity>
        </Card>

        {/* Prayer Reminders */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? '🕌 تذكيرات الصلاة' : '🕌 Prayer Reminders'}</Text>
          <ToggleRow
            icon="🔔"
            label={isAr ? `تفعيل التذكيرات (قبل ${reminders.minutesBefore} دقيقة)` : `Enable reminders (${reminders.minutesBefore} min before)`}
            value={reminders.enabled}
            onChange={() => updateReminders({ ...reminders, enabled: !reminders.enabled })}
            colors={colors}
            isAr={isAr}
          />
          {reminders.enabled && (['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as PrayerName[]).map((prayer) => (
            <ToggleRow
              key={prayer}
              icon="•"
              label={isAr
                ? { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' }[prayer]
                : prayer}
              value={reminders.perPrayer[prayer]}
              onChange={() => togglePrayerReminder(prayer)}
              colors={colors}
              isAr={isAr}
            />
          ))}
        </Card>

        {/* Export */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'تصدير البيانات' : 'Export Data'}</Text>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isAr ? 'row-reverse' : 'row' }]} onPress={exportFinanceCSV}>
            <Text style={{ fontSize: 16 }}>💰</Text>
            <View><Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI, textAlign: isAr ? 'right' : 'left' }}>{isAr ? 'تصدير المالية' : 'Export Finance'}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>CSV format</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: colors.bg, borderColor: colors.border, marginTop: 8, flexDirection: isAr ? 'row-reverse' : 'row' }]} onPress={exportGoalsCSV}>
            <Text style={{ fontSize: 16 }}>🎯</Text>
            <View><Text style={{ color: colors.text, fontSize: 13.5, fontFamily: FONT_UI }}>{isAr ? 'تصدير الأهداف' : 'Export Goals'}</Text><Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: FONT_UI }}>CSV format</Text></View>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary, ...rtlText }]}>{isAr ? 'عن التطبيق' : 'About'}</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontFamily: FONT_UI_BOLD, marginBottom: 2, ...rtlText }}>AmanahLife</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginBottom: 10, ...rtlText }}>
            {isAr ? 'الإصدار 1.0.0' : 'Version 1.0.0'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginBottom: 14, lineHeight: 17, ...rtlText }}>
            {isAr
              ? '© 2026 أمانة لايف، منتج تابع لشركة LinkoraNet LLC. جميع الحقوق محفوظة.'
              : '© 2026 AmanahLife, a product of LinkoraNet LLC. All rights reserved.'}
          </Text>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync('https://app.amanahlife.com/privacy')} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_MEDIUM, ...rtlText }}>
              {isAr ? '🔒 سياسة الخصوصية' : '🔒 Privacy Policy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync('https://app.amanahlife.com/terms')} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_MEDIUM, ...rtlText }}>
              {isAr ? '📄 شروط الخدمة' : '📄 Terms of Service'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/about' as any)} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_MEDIUM, ...rtlText }}>
              {isAr ? '🕌 عن أمانة لايف والمؤسس' : '🕌 About & Founder'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/more-info' as any)}>
            <Text style={{ color: colors.teal, fontSize: 13, fontFamily: FONT_UI_MEDIUM, ...rtlText }}>
              {isAr ? 'ℹ️ المزيد' : 'ℹ️ More'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Danger zone */}
        <Card style={{ marginBottom: 14, borderColor: colors.red + '4D' }}>
          <Text style={[styles.sectionLabel, { color: colors.red, ...rtlText }]}>{isAr ? 'منطقة الخطر' : 'Danger Zone'}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: FONT_UI, marginBottom: 12, ...rtlText }}>
            {isAr ? 'حذف حسابك نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك.' : 'Deleting your account is permanent and cannot be undone. All your data will be removed.'}
          </Text>
          <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: colors.red + '1A', borderColor: colors.red + '4D' }]} onPress={() => setShowDeleteDialog(true)}>
            <Text style={{ color: colors.red, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>{isAr ? '🗑️ حذف الحساب' : '🗑️ Delete Account'}</Text>
          </TouchableOpacity>
        </Card>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.signOut, { backgroundColor: colors.red + '1A', borderColor: colors.red + '4D', opacity: signOutLoading ? 0.5 : 1 }]}
          disabled={signOutLoading}
          onPress={async () => { setSignOutLoading(true); await signOut(); }}
        >
          <Text style={{ color: colors.red, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>
            {signOutLoading ? (isAr ? 'جارٍ تسجيل الخروج...' : 'Signing out...') : (isAr ? 'تسجيل الخروج' : 'Sign Out')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country picker */}
      <Modal visible={showCountryPicker} transparent animationType="slide" onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCountryPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: sheetPb }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((c) => {
                const active = settings.country === c.code;
                return (
                  <TouchableOpacity key={c.code} style={[styles.countryOption, { flexDirection: isAr ? 'row-reverse' : 'row' }, active && { backgroundColor: colors.teal + '1A' }]} onPress={() => handleCountryChange(c.code)}>
                    <Text style={{ color: active ? colors.teal : colors.text, fontSize: 14, fontFamily: active ? FONT_UI_BOLD : FONT_UI }}>{c.flag} {isAr ? c.nameAr : c.nameEn}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{c.currency} {c.symbol}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={showDeleteDialog} transparent animationType="fade" onRequestClose={() => setShowDeleteDialog(false)}>
        <Pressable style={styles.centerOverlay} onPress={() => setShowDeleteDialog(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={{ color: colors.red, fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 8 }}>{isAr ? '⚠️ حذف الحساب' : '⚠️ Delete Account'}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, marginBottom: 14, lineHeight: 19 }}>
              {isAr ? 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك وجميع بياناتك نهائياً.' : 'This action cannot be undone. Your account and all associated data will be permanently deleted.'}
            </Text>
            <Text style={{ color: colors.text, fontSize: 12, fontFamily: FONT_UI_MEDIUM, marginBottom: 6 }}>{isAr ? 'اكتب DELETE للتأكيد' : 'Type DELETE to confirm'}</Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={[styles.input, { backgroundColor: colors.bg, color: colors.text, borderColor: colors.red + '4D' }]}
            />
            <View style={{ flexDirection: isAr ? 'row-reverse' : 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.dlgBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}>
                <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dlgBtn, { backgroundColor: colors.red, opacity: deleteConfirmText !== 'DELETE' || deleteLoading ? 0.5 : 1 }]} disabled={deleteConfirmText !== 'DELETE' || deleteLoading} onPress={handleDeleteAccount}>
                {deleteLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONT_UI_BOLD }}>{isAr ? 'حذف نهائي' : 'Delete Forever'}</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function isRTL(isAr: boolean) { return isAr ? 'right' as const : 'left' as const; }

function ToggleRow({ icon, label, value, onChange, colors, isAr }: { icon: string; label: string; value: boolean; onChange: () => void; colors: any; isAr: boolean }) {
  return (
    <View style={[styles.rowBetween, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
      <View style={[styles.toggleLabel, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <Text style={{ fontSize: 15, color: '#FFFFFF' }}>{icon}</Text>
        <Text style={{ color: colors.text, fontSize: 14, fontFamily: FONT_UI, textAlign: isAr ? 'right' : 'left' }}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.surface, true: colors.teal }} thumbColor="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },


  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarLg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  manageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  langBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  countryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dangerBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  signOut: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  countryOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderRadius: 8 },
  centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialog: { borderRadius: 20, borderWidth: 1, padding: 20 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: FONT_UI },
  dlgBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
