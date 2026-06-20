import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  color?: string;
  track?: string;
  height?: number;
}

/** ProgressBar — mirrors the web `<Progress>` / bg-secondary track + fill. */
export function ProgressBar({ value, color, track, height = 8 }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { backgroundColor: track ?? colors.surface, height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct}%`, backgroundColor: color ?? colors.teal, height, borderRadius: height / 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
