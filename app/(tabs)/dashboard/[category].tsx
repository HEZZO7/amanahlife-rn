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
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { PageHeader, FeatureGrid } from '../../../src/components/ui';
import { getNavItems, getCategories, CategoryId } from '../../../src/lib/dashboardNav';

export default function CategoryLanding() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const { language } = useLanguage();
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
});
