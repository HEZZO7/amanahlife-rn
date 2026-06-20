/**
 * GlobalHeader — sticky app-level header mirroring the web app's top nav.
 * Shows: logo + "AmanahLife" | EN/AR pill toggle | theme toggle | ⋮ settings dropdown
 * Rendered once in app/(tabs)/_layout.tsx so it persists across all tab screens.
 */
import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Modal, Pressable, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../theme/fonts';

export default function GlobalHeader() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => {
    setMenuOpen(false);
    Alert.alert(
      language === 'ar' ? 'تسجيل الخروج' : 'Sign Out',
      language === 'ar' ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to sign out?',
      [
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: language === 'ar' ? 'خروج' : 'Sign Out', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const userEmail = user?.email || '';

  return (
    <View style={[
      styles.header,
      { backgroundColor: colors.bg, borderBottomColor: colors.border },
      { flexDirection: isRTL ? 'row-reverse' : 'row' },
    ]}>
      {/* Logo + Name */}
      <TouchableOpacity
        style={[styles.brand, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => router.push('/(tabs)/')}
        activeOpacity={0.8}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
          <Text style={[styles.brandName, { color: colors.text }]}>AmanahLife</Text>
          <Text style={[styles.brandNameAr, { color: colors.teal }]}>أمانة لايف</Text>
        </View>
      </TouchableOpacity>

      {/* Right controls */}
      <View style={[styles.controls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* EN / AR pill toggle */}
        <View style={[styles.langPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && { backgroundColor: colors.teal }]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langText, { color: language === 'en' ? '#04211C' : colors.textSecondary }]}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'ar' && { backgroundColor: colors.teal }]}
            onPress={() => setLanguage('ar')}
          >
            <Text style={[styles.langText, { color: language === 'ar' ? '#04211C' : colors.textSecondary }]}>AR</Text>
          </TouchableOpacity>
        </View>

        {/* Theme toggle */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        {/* Settings menu */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setMenuOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 18, color: colors.text }}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown menu modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
            isRTL ? { left: 16 } : { right: 16 },
          ]}>
            {/* User info */}
            <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.teal + '30' }]}>
                <Text style={{ color: colors.teal, fontSize: 16, fontFamily: FONT_UI_BOLD }}>
                  {(userName[0] || '?').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                {!!userName && <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{userName}</Text>}
                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>{userEmail}</Text>
              </View>
            </View>

            {/* Menu items */}
            <MenuItem
              icon="⚙️"
              label={language === 'ar' ? 'الإعدادات' : 'Settings'}
              colors={colors}
              onPress={() => { setMenuOpen(false); router.push('/(tabs)/settings'); }}
            />
            <MenuItem
              icon="🔔"
              label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
              colors={colors}
              onPress={() => { setMenuOpen(false); router.push('/(tabs)/settings'); }}
            />
            <MenuItem
              icon="💎"
              label={language === 'ar' ? 'الاشتراك' : 'Subscription'}
              colors={colors}
              onPress={() => { setMenuOpen(false); router.push('/(tabs)/subscription'); }}
            />
            <MenuItem
              icon="🌙"
              label={isDark ? (language === 'ar' ? 'الوضع الفاتح' : 'Light Mode') : (language === 'ar' ? 'الوضع الداكن' : 'Dark Mode')}
              colors={colors}
              onPress={() => { setMenuOpen(false); toggleTheme(); }}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <MenuItem
              icon="🚪"
              label={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              colors={colors}
              labelColor={colors.red}
              onPress={handleSignOut}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, label, onPress, colors, labelColor }: {
  icon: string; label: string; onPress: () => void; colors: any; labelColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={{ fontSize: 16, marginRight: 10 }}>{icon}</Text>
      <Text style={[styles.menuLabel, { color: labelColor || colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  brand: { alignItems: 'center', flex: 1 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  brandName: { fontSize: 14, fontFamily: FONT_UI_BOLD, lineHeight: 18 },
  brandNameAr: { fontSize: 11, fontFamily: FONT_UI_MEDIUM, lineHeight: 14 },
  controls: { alignItems: 'center', gap: 6 },
  langPill: {
    flexDirection: 'row', borderRadius: 20, borderWidth: 1,
    overflow: 'hidden',
  },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  langText: { fontSize: 12, fontFamily: FONT_UI_BOLD },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dropdown: {
    position: 'absolute', top: 60, minWidth: 240,
    borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: 1,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: 14, fontFamily: FONT_UI_BOLD },
  userEmail: { fontSize: 12, fontFamily: FONT_UI, marginTop: 1 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  menuLabel: { fontSize: 14, fontFamily: FONT_UI_MEDIUM },
  divider: { height: 1, marginVertical: 4 },
});
