/**
 * BottomNav — React Native
 * Migrated from app/frontend/src/components/BottomNav.tsx
 * Exact same 5 tabs: Dashboard, Finance, Search, Planner, More(Settings)
 * Same teal-400 active color, same search modal with Classic/AI options
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Pressable, Platform, I18nManager, LayoutChangeEvent,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSetNavBarHeight } from '../../contexts/NavBarHeightContext';
import { useBackToClose } from '../../lib/useBackToClose';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';

// SVG icons matching web app exactly
function DashboardIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x="3" y="3" width="8" height="8" rx="1.5" />
      <Rect x="13" y="3" width="8" height="8" rx="1.5" />
      <Rect x="3" y="13" width="8" height="8" rx="1.5" />
      <Rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Svg>
  );
}

function FinanceIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.75A2.25 2.25 0 0118 6v0a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 003 10.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-6z" />
      <Circle cx="16.5" cy="14.5" r="1.5" fill={color} stroke="none" />
    </Svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </Svg>
  );
}

function PlannerIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <Line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
}

function MoreIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

const NAV_ITEMS = [
  { path: '/(tabs)/', id: 'dashboard' },
  { path: '/(tabs)/finance', id: 'finance' },
  { path: 'search-modal', id: 'search' },
  { path: '/(tabs)/planner', id: 'planner' },
  { path: '/(tabs)/settings', id: 'more' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const setNavBarHeight = useSetNavBarHeight();
  const [navHeight, setNavHeight] = useState(0);

  const handleNavLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setNavHeight(h);
    setNavBarHeight(h);
  };

  useBackToClose(showSearchModal, () => setShowSearchModal(false));

  const getLabel = (id: string) => {
    const labels: Record<string, string> = {
      dashboard: language === 'ar' ? 'الرئيسية' : 'Dashboard',
      finance: language === 'ar' ? 'المالية' : 'Finance',
      search: language === 'ar' ? 'بحث' : 'Search',
      planner: language === 'ar' ? 'المخطط' : 'Planner',
      more: language === 'ar' ? 'المزيد' : 'More',
    };
    return labels[id] || id;
  };

  const renderIcon = (id: string, color: string) => {
    switch (id) {
      case 'dashboard': return <DashboardIcon color={color} />;
      case 'finance': return <FinanceIcon color={color} />;
      case 'search': return <SearchIcon color={color} />;
      case 'planner': return <PlannerIcon color={color} />;
      case 'more': return <MoreIcon color={color} />;
      default: return null;
    }
  };

  return (
    <>
      <View
        onLayout={handleNavLayout}
        style={[styles.nav, {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12),
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }]}
      >
        {NAV_ITEMS.map((item) => {
          const isSearchModal = item.path === 'search-modal';
          const isActive = !isSearchModal && (
            item.path === '/(tabs)/' ? pathname === '/' : pathname.includes(item.id)
          );
          const isSearchActive = isSearchModal && (pathname.includes('search') || pathname.includes('ai-search'));
          const active = isActive || isSearchActive;
          const color = active ? colors.teal : colors.textSecondary;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tab, active && { backgroundColor: colors.teal + '20' }]}
              onPress={() => {
                if (isSearchModal) { setShowSearchModal(true); return; }
                router.push(item.path as any);
              }}
              activeOpacity={0.7}
            >
              {renderIcon(item.id, color)}
              <Text style={[styles.label, { color }]}>{getLabel(item.id)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search sheet — plain positioned View, NOT <Modal>. RN's <Modal> opens
          its own native window that captures every touch within its bounds
          even where nothing is drawn, so a Modal-based sheet here would
          block taps to the real nav bar underneath no matter how it's sized
          (unlike web's CSS stacking, where an element outside an overlay's
          bounds is simply untouched). Rendering it as a normal sibling View,
          offset by the nav's own measured height, lets taps below the sheet
          fall through to the nav exactly like the web fix for this bug. */}
      {showSearchModal && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable
            style={[StyleSheet.absoluteFillObject, { bottom: navHeight, backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={() => setShowSearchModal(false)}
          />
          <Pressable onPress={() => {}} style={[styles.sheet, { position: 'absolute', left: 0, right: 0, bottom: navHeight, backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text, textAlign: language === 'ar' ? 'right' : 'center' }]}>
              {language === 'ar' ? 'اختر نوع البحث' : 'Choose Search Type'}
            </Text>

            {/* Classic Search — Free */}
            <TouchableOpacity
              style={[styles.searchOption, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
              onPress={() => { setShowSearchModal(false); setTimeout(() => router.navigate('/(tabs)/search'), 50); }}
            >
              <View style={[styles.searchIcon, { backgroundColor: colors.teal + '20' }]}>
                <SearchIcon color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.searchTitle, { color: colors.text, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                  {language === 'ar' ? 'البحث الكلاسيكي' : 'Classic Search'}
                </Text>
                <Text style={[styles.searchSub, { color: colors.textSecondary, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                  {language === 'ar' ? 'بحث نصي في المحتوى والصفحات' : 'Text search across content & pages'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.teal + '20' }]}>
                <Text style={{ color: colors.teal, fontSize: 10, fontWeight: '700' }}>
                  {language === 'ar' ? 'مجاني' : 'Free'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* AI Smart Search — Premium */}
            <TouchableOpacity
              style={[styles.searchOption, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
              onPress={() => { setShowSearchModal(false); setTimeout(() => router.navigate('/(tabs)/ai-search'), 50); }}
            >
              <View style={[styles.searchIcon, { backgroundColor: colors.gold + '20' }]}>
                <SearchIcon color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.searchTitle, { color: colors.text, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                  {language === 'ar' ? 'البحث الذكي بالذكاء الاصطناعي' : 'AI Smart Search'}
                </Text>
                <Text style={[styles.searchSub, { color: colors.textSecondary, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                  {language === 'ar' ? 'بحث بلغة طبيعية في بياناتك' : 'Natural language search across your data'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.gold + '20' }]}>
                <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '700' }}>Premium ✦</Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    margin: 2,
    gap: 2,
  },
  label: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  searchOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  searchIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  searchTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  searchSub: { fontSize: 12, lineHeight: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
});
