import React, { useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import BottomNav from '../../src/components/navigation/BottomNav';
import { Toaster } from '../../src/lib/toast';
import GlobalHeader from '../../src/components/GlobalHeader';

export default function TabsLayout() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Standard Android tab-app back behavior: back from any tab other than
  // Dashboard returns to Dashboard first; only exits the app when already
  // there. Without this, `(tabs)` is a single Stack.Screen in the root
  // navigator (this layout uses <Slot />, not its own Stack/Tabs
  // navigator), so switching tabs via router.push doesn't reliably build
  // the "go home, then exit" back-stack users expect - back could exit
  // straight from any tab. Sheets (search, add-forms) register their own
  // higher-priority back handler via useBackToClose and close first; this
  // one only runs once no sheet is open.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pathname !== '/') {
        router.replace('/(tabs)/' as any);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pathname, router]);

  return (
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
