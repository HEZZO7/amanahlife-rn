/**
 * ThemeContext — React Native
 * Migrated from app/frontend/src/contexts/ThemeContext.tsx
 * Replaces localStorage with AsyncStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

type Theme = 'light' | 'dark';

// Design tokens — mirror the web app's index.css dark/light tokens exactly.
// Web dark theme: deep dark-green background (#0A1F17), card green (#102B1F),
// teal accent (#1FC7C1), gold accent (#D4A017), green border (#163828), cream text.
export const darkColors = {
  bg: '#0A1F17',        // --bg-dark-green / background
  surface: '#0D2A1E',   // slightly raised (inputs, headers)
  card: '#102B1F',      // --bg-card-green / card
  border: '#163828',    // --border-dark-green / border
  text: '#F2EFE9',      // foreground — warm cream
  textSecondary: '#9DB5AA', // muted-foreground — sage
  textMuted: '#5F7D72', // tertiary
  teal: '#1FC7C1',      // --teal-accent — primary brand color
  tealLight: '#3DD9D3',
  tealDark: '#178F8A',  // gradient end used on web hero cards
  gold: '#D4A017',      // --gold accent
  red: '#E05D4E',
  green: '#27AE60',     // success / income
  blue: '#3b82f6',
};

export const lightColors = {
  bg: '#F7F5EF',        // background 36 33% 97%
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#DDE3DE',    // border 150 10% 88%
  text: '#0B1F17',      // foreground 152 53% 8%
  textSecondary: '#4A5C54', // muted-foreground 152 20% 35%
  textMuted: '#8A968F',
  teal: '#178F8A',
  tealLight: '#1FC7C1',
  tealDark: '#0F6B67',
  gold: '#B8860B',
  red: '#DC2626',
  green: '#16A34A',
  blue: '#2563eb',
};

export type Colors = typeof darkColors;

interface ThemeContextType {
  theme: Theme;
  colors: Colors;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  autoSwitch: boolean;
  setAutoSwitch: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Fetch today's Sunrise/Maghrib for the device location via the same Aladhan API used for prayer times. */
async function fetchSunriseSunset(): Promise<{ sunrise: string; sunset: string } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const coords = status === 'granted'
      ? (await Location.getCurrentPositionAsync({})).coords
      : { latitude: 21.4225, longitude: 39.8262 }; // Mecca fallback
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=2`
    );
    const data = await res.json();
    return { sunrise: data.data.timings.Sunrise, sunset: data.data.timings.Maghrib };
  } catch {
    return null;
  }
}

function isNightNow(sunrise: string, sunset: string): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin < toMinutes(sunrise) || nowMin >= toMinutes(sunset);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [autoSwitch, setAutoSwitchState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('amanah-theme').then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored);
      }
    });
    AsyncStorage.getItem('amanah-theme-autoswitch').then((stored) => {
      if (stored === 'true') setAutoSwitchState(true);
    });
  }, []);

  const applyAutoSwitch = useCallback(async () => {
    const times = await fetchSunriseSunset();
    if (!times) return;
    setThemeState(isNightNow(times.sunrise, times.sunset) ? 'dark' : 'light');
  }, []);

  // Re-check every 15 minutes while auto-switch is on and the provider is mounted.
  useEffect(() => {
    if (!autoSwitch) return;
    applyAutoSwitch();
    const interval = setInterval(applyAutoSwitch, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoSwitch, applyAutoSwitch]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('amanah-theme', newTheme);
  };

  const setAutoSwitch = async (value: boolean) => {
    setAutoSwitchState(value);
    await AsyncStorage.setItem('amanah-theme-autoswitch', value ? 'true' : 'false');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, toggleTheme, isDark: theme === 'dark', autoSwitch, setAutoSwitch }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? {
    theme: 'dark' as Theme,
    colors: darkColors,
    setTheme: async () => {},
    toggleTheme: () => {},
    isDark: true,
    autoSwitch: false,
    setAutoSwitch: async () => {},
  };
}
