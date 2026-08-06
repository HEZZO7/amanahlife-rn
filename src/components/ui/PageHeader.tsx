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
  subtitle?: string;
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
export function PageHeader({ icon, title, subtitle, right }: PageHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  // Back button (36) + row gap (12) — subtitle indents by this much so it
  // lines up under the title rather than the back button, in either
  // direction.
  const titleIndent = 48;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bg, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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

      {!!subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              textAlign: isRTL ? 'right' : 'left',
              [isRTL ? 'marginRight' : 'marginLeft']: titleIndent,
            },
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  row: { height: 36, alignItems: 'center', gap: 12 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontFamily: FONT_UI_BOLD },
  subtitle: { fontSize: 12.5, marginTop: 4 },
});
