import React, { useEffect, useState } from 'react';
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

  // Search sheet's open state lives here (not inside BottomNav) so this
  // layout's single back handler can check it directly instead of racing
  // two independent BackHandler.addEventListener subscribers on registration
  // order. That race was real: this effect re-subscribes on every pathname
  // change (needed so `router.replace` below always sees the current
  // pathname), so its listener could end up registered more recently than
  // BottomNav's own sheet-close listener depending on navigation timing -
  // native BackHandler has no documented guarantee about which of two
  // independently-registered listeners runs first, so "the sheet's listener
  // happens to be newer" isn't something to build correctness on. One
  // handler with an explicit if-sheet-open-first branch has no such race.
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Closing on any pathname change covers tab-bar taps (Dashboard/Finance/
  // Planner/More) reached while the sheet is open, which previously
  // navigated without ever closing it.
  useEffect(() => {
    setShowSearchModal(false);
  }, [pathname]);

  // Standard Android tab-app back behavior: back from any tab other than
  // Dashboard returns to Dashboard first; only exits the app when already
  // there. Without this, `(tabs)` is a single Stack.Screen in the root
  // navigator (this layout uses <Slot />, not its own Stack/Tabs
  // navigator), so switching tabs via router.push doesn't reliably build
  // the "go home, then exit" back-stack users expect - back could exit
  // straight from any tab. The search sheet takes priority over this: one
  // back press with the sheet open closes ONLY the sheet (never also
  // navigates), and a second, separate back press then gets the normal
  // tab/exit behavior below. Screen-local sheets (Finance/Tasks/Planner/
  // BillReminders add-forms) keep registering their own useBackToClose
  // handler independently - unaffected by this, out of scope for this fix.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showSearchModal) {
        setShowSearchModal(false);
        return true;
      }
      if (pathname !== '/') {
        router.replace('/(tabs)/' as any);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pathname, router, showSearchModal]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <GlobalHeader />
      <View style={{ flex: 1 }}>
        <Slot />
        <BottomNav showSearchModal={showSearchModal} setShowSearchModal={setShowSearchModal} />
        <Toaster />
      </View>
    </SafeAreaView>
  );
}
