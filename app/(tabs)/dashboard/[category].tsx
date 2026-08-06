/**
 * Category landing screen — Phase G dashboard restructure. One
 * parameterized screen for all 4 categories (Worship/Finance/Planning/
 * Growth), reached by tapping a category card on the home screen. Shows
 * that category's feature sub-grid, reusing the exact same 2-column grid
 * styling A4 established for the old flat "ALL FEATURES" grid.
 *
 * Does not touch loadStreaks/loadBriefing or any of DashboardScreen's
 * excused-period-aware streak logic - this screen only reads the static
 * nav data from src/lib/dashboardNav.ts, nothing stateful.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { PageHeader } from '../../../src/components/ui';
import { getNavItems, getCategories, CategoryId } from '../../../src/lib/dashboardNav';

export default function CategoryLanding() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();

  const categoryId = category as CategoryId;
  const categoryDef = getCategories(language).find((c) => c.id === categoryId);
  const items = getNavItems(language).filter((i) => i.category === categoryId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader
        icon={categoryDef?.icon}
        title={categoryDef?.title || ''}
        subtitle={categoryDef?.description}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.grid, isRTL ? { flexDirection: 'row-reverse', flexWrap: 'wrap' } : {}]}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.path}
              style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 24, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>{item.icon}</Text>
              <Text style={[styles.gridLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{item.title}</Text>
              {!!item.description && (
                <Text style={[styles.gridDescription, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{item.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Blog has no grid card in any category (it's content, not a
            feature) - Growth's landing screen carries a small link to it
            instead, per the approved Phase G plan. */}
        {categoryId === 'growth' && (
          <TouchableOpacity
            style={[styles.blogRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/(tabs)/blog' as any)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 18 }}>📝</Text>
            <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '600' }}>
              {language === 'ar' ? 'اقرأ المدونة ←' : 'Read the blog →'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'flex-start', justifyContent: 'flex-start' },
  gridLabel: { fontSize: 14, fontWeight: '600' },
  gridDescription: { fontSize: 12, marginTop: 2 },
  blogRow: { marginTop: 14, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 10 },
});
