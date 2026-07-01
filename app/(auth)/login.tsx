/**
 * Login screen — mirrors app/frontend/src/pages/Login.tsx.
 * Sign In / Sign Up tabs, email+password, native Google Sign-In (colored G),
 * forgot-password modal, bilingual. Uses Tajawal/Amiri fonts + green palette.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, ScrollView, Pressable, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK, FONT_ARABIC_BOLD } from '../../src/theme/fonts';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const router = useRouter();
  const isAr = language === 'ar';

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'مرحباً بعودتك!' : 'Welcome back!');
    router.replace('/(tabs)/' as any);
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'تحقق من بريدك الإلكتروني لتأكيد حسابك' : 'Check your email to verify your account.');
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) toast.error(error.message);
    // Auth state listener in AuthContext handles redirect on success
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) { toast.error(isAr ? 'أدخل بريدك الإلكتروني' : 'Please enter your email'); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'amanahlife://reset-password',
    });
    setResetLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'تم إرسال رابط إعادة التعيين' : 'Password reset link sent!');
    setShowForgot(false);
    setResetEmail('');
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign: isRTL ? 'right' as const : 'left' as const },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero branding */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={{ color: colors.teal, fontSize: 15, fontFamily: FONT_UI_MEDIUM }}>
          {isRTL ? '→' : '←'} {isAr ? 'رجوع' : 'Back'}
        </Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
          {isAr ? 'رفيقك الذكي في الحياة' : 'Smart Life Companion'}
        </Text>
      </View>

      {/* Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
          {(['signin', 'signup'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && { backgroundColor: colors.teal }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, { color: tab === t ? '#04211C' : colors.textSecondary }]}>
                {t === 'signin' ? (isAr ? 'تسجيل الدخول' : 'Sign In') : (isAr ? 'حساب جديد' : 'Sign Up')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {tab === 'signin'
            ? (isAr ? 'أهلاً بعودتك! تابع رحلتك.' : 'Welcome back! Continue your journey.')
            : (isAr ? 'أنشئ حسابك وابدأ رحلتك.' : 'Create an account to start your journey.')}
        </Text>

        {/* Email */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'البريد الإلكتروني' : 'Email'}</Text>
        <TextInput
          style={inputStyle}
          placeholder="your@email.com"
          placeholderTextColor={colors.textMuted}
          value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email"
        />

        {/* Password */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'كلمة المرور' : 'Password'}</Text>
        <TextInput
          style={inputStyle}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          value={password} onChangeText={setPassword}
          secureTextEntry
        />

        {/* Forgot password link */}
        {tab === 'signin' && (
          <TouchableOpacity onPress={() => setShowForgot(true)} style={[styles.forgotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.forgotText, { color: colors.teal }]}>
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Primary button */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.green }]}
          onPress={tab === 'signin' ? handleSignIn : handleSignUp}
          disabled={loading} activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.primaryBtnText}>
              {tab === 'signin' ? (isAr ? 'دخول' : 'Sign In') : (isAr ? 'إنشاء الحساب' : 'Create Account')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary, backgroundColor: colors.card }]}>
            {isAr ? 'أو تابع بـ' : 'Or continue with'}
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        {/* Google button */}
        <TouchableOpacity
          style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={handleGoogle}
          disabled={googleLoading} activeOpacity={0.85}
        >
          {googleLoading ? <ActivityIndicator color={colors.text} size="small" /> : (
            <>
              <GoogleIcon />
              <Text style={[styles.googleText, { color: colors.text }]}>
                {isAr ? 'المتابعة مع Google' : 'Continue with Google'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Forgot password modal */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={() => setShowForgot(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowForgot(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {isAr
                ? 'أدخل بريدك الإلكتروني وسنرسل رابط إعادة التعيين'
                : "Enter your email and we'll send you a reset link"}
            </Text>
            <TextInput
              style={[inputStyle, { marginTop: 12 }]}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              value={resetEmail} onChangeText={setResetEmail}
              autoCapitalize="none" keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowForgot(false)}
              >
                <Text style={[styles.tabText, { color: colors.textSecondary }]}>{isAr ? 'إلغاء' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.teal }]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? <ActivityIndicator color="#04211C" size="small" /> : (
                  <Text style={[styles.tabText, { color: '#04211C' }]}>
                    {isAr ? 'إرسال الرابط' : 'Send Reset Link'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 48 },
  backBtn: { marginBottom: 24 },
  hero: { alignItems: 'center', marginBottom: 28 },
  logoImg: { width: 100, height: 100, borderRadius: 22, marginBottom: 10 },
  appTagline: { fontSize: 14, fontFamily: FONT_UI, marginTop: 4 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  subtitle: { fontSize: 13, fontFamily: FONT_UI, textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 13, fontFamily: FONT_UI_MEDIUM, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, fontFamily: FONT_UI, marginBottom: 14 },
  forgotRow: { justifyContent: 'flex-start', marginBottom: 6, marginTop: -6 },
  forgotText: { fontSize: 13, fontFamily: FONT_UI_MEDIUM },
  primaryBtn: {
    paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 6,
    shadowColor: '#27AE60', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: FONT_UI_BOLD },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  line: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: FONT_UI, paddingHorizontal: 4 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  googleText: { fontSize: 15, fontFamily: FONT_UI_BOLD },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20 },
  modalTitle: { fontSize: 17, fontFamily: FONT_UI_BOLD, marginBottom: 6 },
  modalSub: { fontSize: 13, fontFamily: FONT_UI, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
});
