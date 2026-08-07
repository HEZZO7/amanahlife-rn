/**
 * Category landing screen — Phase G dashboard restructure. One
 * parameterized screen for all 4 categories (Worship/Finance/Planning/
 * Growth), reached by tapping a category card on the home screen. Shows
 * that category's feature sub-grid via the shared FeatureGrid component
 * (see src/components/ui/FeatureGrid.tsx for the RTL alignment fix).
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
import { PageHeader, FeatureGrid } from '../../../src/components/ui';
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
        <FeatureGrid
          items={items.map((item) => ({
            key: item.path,
            icon: item.icon,
            title: item.title,
            description: item.description,
            onPress: () => router.push(item.path as any),
          }))}
        />

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
  blogRow: { marginTop: 14, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 10 },
});
