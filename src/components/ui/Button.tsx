import React from 'react';
import {
  Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, StyleProp,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { FONT_UI_BOLD } from '../../theme/fonts';

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'gold';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

/** Button — mirrors the web shadcn `<Button>` variants. */
export function Button({
  title, onPress, variant = 'default', size = 'md',
  disabled, loading, fullWidth, style, textStyle, children,
}: ButtonProps) {
  const { colors } = useTheme();

  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    default: { bg: colors.teal, fg: '#04211C', border: colors.teal },
    gold: { bg: colors.gold, fg: '#1A1200', border: colors.gold },
    destructive: { bg: colors.red, fg: '#FFFFFF', border: colors.red },
    outline: { bg: 'transparent', fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.text, border: 'transparent' },
  };
  const p = palette[variant];

  const sizes: Record<Size, { py: number; px: number; fs: number }> = {
    sm: { py: 7, px: 12, fs: 13 },
    md: { py: 11, px: 16, fs: 14 },
    lg: { py: 14, px: 20, fs: 16 },
  };
  const s = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { backgroundColor: p.bg, borderColor: p.border, paddingVertical: s.py, paddingHorizontal: s.px },
        fullWidth && { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : children ?? (
        <Text style={[styles.text, { color: p.fg, fontSize: s.fs }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12, borderWidth: 1, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 6,
  },
  text: { fontFamily: FONT_UI_BOLD },
});
