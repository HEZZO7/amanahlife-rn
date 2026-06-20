import React from 'react';
import { StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  /** Gradient stops. Default = teal→tealDark (web `from-[#1FC7C1] to-[#178F8A]`). */
  colors?: [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  children: React.ReactNode;
}

/** GradientCard — mirrors the web hero cards (`bg-gradient-to-r ...`). */
export function GradientCard({
  colors = ['#1FC7C1', '#178F8A'],
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  children,
}: GradientCardProps) {
  return (
    <LinearGradient colors={colors} start={start} end={end} style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 20, overflow: 'hidden' },
});
