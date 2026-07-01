import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { FONT_UI_BOLD } from '../../theme/fonts';

interface PageHeaderProps {
  icon?: string;
  title: string;
  right?: React.ReactNode;
}

/**
 * PageHeader — sticky screen header with back button, title, optional action.
 *
 * Layout in LTR (English):  [←back]  [title …]  [spacer]  [right]
 * Layout in RTL (Arabic):   [right]  [spacer]  […title]  [→back]
 *
 * Using row-reverse in Arabic flips the order so the title appears on the
 * RIGHT side and the back button is on the LEFT — standard Arabic app UX.
 */
export function PageHeader({ icon, title, right }: PageHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {/* Back button — always the first element in JSX order */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={2}>
          {/* Arrow points right (→) in Arabic so it makes sense as "back" in RTL */}
          <Path d={isRTL ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>

      {/* Title — flex:1 so it fills available space */}
      <Text
        style={[styles.title, { color: colors.text, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}
        numberOfLines={1}
      >
        {icon ? icon + '  ' : ''}{title}
      </Text>

      {/* Optional right/left action slot */}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, alignItems: 'center', paddingHorizontal: 14, gap: 12, borderBottomWidth: 1 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontFamily: FONT_UI_BOLD },
});
