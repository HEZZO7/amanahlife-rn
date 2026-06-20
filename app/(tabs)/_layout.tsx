import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import BottomNav from '../../src/components/navigation/BottomNav';
import { Toaster } from '../../src/lib/toast';
import GlobalHeader from '../../src/components/GlobalHeader';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    // edges={['top']} — GlobalHeader sits inside SafeAreaView so top is handled.
    // Bottom is handled inside BottomNav via useSafeAreaInsets.
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <GlobalHeader />
      <View style={{ flex: 1 }}>
        <Slot />
        <BottomNav />
        <Toaster />
      </View>
    </SafeAreaView>
  );
}
