import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  color?: string;
  track?: string;
  height?: number;
}

/**
 * ProgressBar — mirrors the web `<Progress>` / bg-secondary track + fill.
 * The fill is a fixed-percentage-width child with no explicit position, so
 * it anchors to the track's flex main-start - previously always the left
 * edge regardless of language, meaning every progress bar in the app
 * (fasting, weekly life score, savings challenges, adhkar, etc.) filled
 * left-to-right even for Arabic users. flexDirection flips main-start to
 * the right for RTL so the fill grows from the correct reading-direction
 * edge, matching every other RTL-mirrored container in this app.
 */
export function ProgressBar({ value, color, track, height = 8 }: ProgressBarProps) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { backgroundColor: track ?? colors.surface, height, borderRadius: height / 2, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={{ width: `${pct}%`, backgroundColor: color ?? colors.teal, height, borderRadius: height / 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
