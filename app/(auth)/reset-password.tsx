/**
 * Reset Password — mirrors app/frontend/src/pages/ResetPassword.tsx.
 * Reached via the `amanahlife://reset-password` deep link sent by
 * login.tsx's resetPasswordForEmail({ redirectTo: 'amanahlife://reset-password' }).
 *
 * Web relies on supabase-js's `detectSessionInUrl` (the default in a
 * browser) to parse the recovery link automatically and fire
 * PASSWORD_RECOVERY. RN's client explicitly sets `detectSessionInUrl:
 * false` (required - there's no browser URL bar to parse), so this screen
 * has to do that parsing itself. Handles both link shapes Supabase can
 * send for a recovery link, since which one a given project uses depends
 * on a server-side Auth setting this session can't inspect:
 *   - PKCE: `amanahlife://reset-password?code=...` -> exchangeCodeForSession
 *   - Implicit: `amanahlife://reset-password#access_token=...&type=recovery` -> setSession
 * Also listens for PASSWORD_RECOVERY same as web, as a defense-in-depth
 * fallback in case Supabase ever session-recovers some other way.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../src/theme/fonts';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const router = useRouter();
  const isAr = language === 'ar';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifyFailed, setVerifyFailed] = useState(false);
  const url = Linking.useURL();
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });
    // Already-established session (e.g. this screen re-rendered after the
    // exchange below already completed once).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!url || sessionReady || handledUrl.current === url) return;
    handledUrl.current = url;

    (async () => {
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setSessionReady(true);
          return;
        }

        const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken && hashParams.get('type') === 'recovery') {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
          setSessionReady(true);
          return;
        }

        // Neither shape matched - the link may be malformed or expired.
        setVerifyFailed(true);
      } catch {
        setVerifyFailed(true);
      }
    })();
  }, [url, sessionReady]);

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(isAr ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error(isAr ? 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isAr ? 'تم تحديث كلمة المرور بنجاح! يمكنك تسجيل الدخول الآن.' : 'Password updated successfully! You can now sign in.');
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign: isRTL ? 'right' as const : 'left' as const },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.text }]}>AmanahLife</Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
          {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Your Password'}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {verifyFailed ? (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isAr ? 'رابط غير صالح' : 'Invalid or expired link'}
            </Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary, marginBottom: 16 }]}>
              {isAr
                ? 'انتهت صلاحية رابط إعادة التعيين أو أنه غير صالح. اطلب رابطاً جديداً من شاشة تسجيل الدخول.'
                : 'This reset link is invalid or has expired. Request a new one from the login screen.'}
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.green }]} onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={styles.primaryBtnText}>{isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}</Text>
            </TouchableOpacity>
          </>
        ) : !sessionReady ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator color={colors.teal} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, marginTop: 12 }}>
              {isAr ? 'جاري التحقق من الرابط...' : 'Verifying your reset link...'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{isAr ? 'كلمة مرور جديدة' : 'New Password'}</Text>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              {isAr ? 'أدخل كلمة المرور الجديدة أدناه' : 'Enter your new password below'}
            </Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'كلمة المرور الجديدة' : 'New Password'}</Text>
            <TextInput
              style={inputStyle}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}</Text>
            <TextInput
              style={inputStyle}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.green, opacity: loading ? 0.7 : 1 }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.primaryBtnText}>{isAr ? 'تحديث كلمة المرور' : 'Update Password'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: FONT_UI_MEDIUM }}>
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, paddingTop: 80, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 28 },
  heroTitle: { fontSize: 26, fontFamily: FONT_UI_BOLD },
  heroSub: { fontSize: 14, fontFamily: FONT_UI, marginTop: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  cardTitle: { fontSize: 18, fontFamily: FONT_UI_BOLD, textAlign: 'center', marginBottom: 6 },
  cardSub: { fontSize: 13, fontFamily: FONT_UI, textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 13, fontFamily: FONT_UI_MEDIUM, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, fontFamily: FONT_UI, marginBottom: 14 },
  primaryBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: FONT_UI_BOLD },
  ghostBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
});
