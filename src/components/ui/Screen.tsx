import React from 'react';
import {
  View, ScrollView, StyleSheet, RefreshControl, StyleProp, ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { PageHeader } from './PageHeader';

interface ScreenProps {
  icon?: string;
  title: string;
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerRight?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Screen — standard page shell: PageHeader + scrolling content area.
 * The global BottomNav lives in app/(tabs)/_layout.tsx (rendered below the
 * Slot), so screens don't render it themselves.
 */
export function Screen({
  icon, title, children, scroll = true, refreshing, onRefresh, headerRight, contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon={icon} title={title} right={headerRight} />
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, styles.content, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
});
