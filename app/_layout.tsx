import React from 'react';
import { Stack } from 'expo-router';
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
import { AuthProvider } from '../src/contexts/AuthContext';
import { SubscriptionProvider } from '../src/contexts/SubscriptionContext';

const queryClient = new QueryClient();

export default function RootLayout() {
  // Load the web app's fonts (Tajawal for UI, Amiri for Arabic). We render the
  // app even before they finish — RN falls back to the system font meanwhile.
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
              <AuthProvider>
                <SubscriptionProvider>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="(auth)" />
                  </Stack>
                </SubscriptionProvider>
              </AuthProvider>
            </LanguageProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
