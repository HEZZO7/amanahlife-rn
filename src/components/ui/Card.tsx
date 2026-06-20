import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps extends ViewProps {
  /** Apply default 16px padding (web CardContent p-4/p-6). Default true. */
  padded?: boolean;
}

/** Card — mirrors the web `<Card>` (rounded, bg-card, border). */
export function Card({ style, padded = true, children, ...props }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        padded && styles.padded,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1 },
  padded: { padding: 16 },
});
