import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { getReminderSettings, schedulePrayerNotifications } from '../src/lib/prayerNotifications';
import { getLocalPreferences, refreshAllCategoryReminders } from '../src/lib/notificationPreferences';
import { useLanguage } from '../src/contexts/LanguageContext';
import { useAuth } from '../src/contexts/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_900Black,
} from '@expo-google-fonts/tajawal';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { TimeFormatProvider } from '../src/contexts/TimeFormatContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SubscriptionProvider } from '../src/contexts/SubscriptionContext';
import { NavBarHeightProvider } from '../src/contexts/NavBarHeightContext';

const queryClient = new QueryClient();

// Inner component so it can read LanguageContext after providers are mounted.
// I18nManager.forceRTL is applied in LanguageContext on startup, so by the
// time AppShell renders the native RTL state is already correct.
function AppShell() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    getReminderSettings().then((settings) => {
      if (settings.enabled) schedulePrayerNotifications(settings, language === 'ar', userId);
    });
    getLocalPreferences(userId).then((prefs) => {
      refreshAllCategoryReminders(userId, prefs, language === 'ar');
    });
  }, [language, userId]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  useFonts({
    Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold, Tajawal_900Black,
    Amiri_400Regular, Amiri_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LanguageProvider>
              <TimeFormatProvider>
                <AuthProvider>
                  <SubscriptionProvider>
                    <NavBarHeightProvider>
                      <AppShell />
                    </NavBarHeightProvider>
                  </SubscriptionProvider>
                </AuthProvider>
              </TimeFormatProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
