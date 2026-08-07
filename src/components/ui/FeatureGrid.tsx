/**
 * FeatureGrid — shared 2-column icon/title/description card grid (the A4
 * pattern), extracted from DashboardScreen.tsx / dashboard/[category].tsx
 * where it was duplicated. Bug fix (2026-08): both duplicates set
 * `textAlign` conditionally on `isRTL` but left `alignItems` on the card
 * itself hardcoded to `'flex-start'` - since RN's cross-axis `alignItems`
 * controls where a shrink-wrapped child's OWN box sits (not just how text
 * aligns within it), the icon/title/description boxes stayed pinned to the
 * left edge of the card in Arabic regardless of `textAlign`. Fixing it once
 * here means every screen that adopts FeatureGrid gets it right without
 * re-deriving the ternary.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export interface FeatureGridItem {
  key: string;
  icon: string;
  title: string;
  description?: string;
  onPress: () => void;
}

interface FeatureGridProps {
  items: FeatureGridItem[];
}

export function FeatureGrid({ items }: FeatureGridProps) {
  const { isRTL } = useLanguage();
  const { colors } = useTheme();

  return (
    <View style={[styles.grid, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.gridItem,
            { backgroundColor: colors.card, borderColor: colors.border, alignItems: isRTL ? 'flex-end' : 'flex-start' },
          ]}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 24, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{item.icon}</Text>
          <Text style={[styles.gridLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
          {!!item.description && (
            <Text style={[styles.gridDescription, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {item.description}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1, justifyContent: 'flex-start' },
  gridLabel: { fontSize: 14, fontWeight: '600' },
  gridDescription: { fontSize: 12, marginTop: 2 },
});
