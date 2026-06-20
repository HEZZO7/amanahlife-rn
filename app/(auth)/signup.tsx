/**
 * Signup screen — standalone route from landing "Create Account".
 * Minimal: email + password. On success, prompts user to verify email.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_BOLD } from '../../src/theme/fonts';

export default function SignupScreen() {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const router = useRouter();
  const isAr = language === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password.length < 6) { toast.error(isAr ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'تحقق من بريدك الإلكتروني لتأكيد حسابك' : 'Check your email to verify your account.');
    router.replace('/(auth)/login');
  };

  const inputStyle = [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, textAlign: isRTL ? 'right' as const : 'left' as const }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
        <Text style={{ color: colors.teal, fontSize: 15, fontFamily: FONT_UI_BOLD }}>{isRTL ? '→' : '←'} {isAr ? 'رجوع' : 'Back'}</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>{isAr ? 'إنشاء حساب' : 'Create Account'}</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>{isAr ? 'أنشئ حسابك وابدأ رحلتك الإسلامية الذكية' : 'Join thousands managing life with purpose.'}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'البريد الإلكتروني' : 'Email'}</Text>
      <TextInput style={inputStyle} placeholder="your@email.com" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={[styles.label, { color: colors.textSecondary }]}>{isAr ? 'كلمة المرور' : 'Password'}</Text>
      <TextInput style={inputStyle} placeholder="min. 6 characters" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={[styles.btn, { backgroundColor: colors.green }]} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isAr ? 'إنشاء الحساب' : 'Create Account'}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: FONT_UI }}>
          {isAr ? 'لديك حساب؟ ' : 'Already have an account? '}
          <Text style={{ color: colors.teal, fontFamily: FONT_UI_BOLD }}>{isAr ? 'تسجيل الدخول' : 'Sign In'}</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 60, paddingBottom: 48 },
  title: { fontSize: 30, fontFamily: FONT_UI_BOLD, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: FONT_UI, marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 13, fontFamily: FONT_UI, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, fontFamily: FONT_UI, marginBottom: 16 },
  btn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FONT_UI_BOLD },
});
