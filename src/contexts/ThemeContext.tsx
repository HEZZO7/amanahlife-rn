/**
 * ThemeContext — React Native
 * Migrated from app/frontend/src/contexts/ThemeContext.tsx
 * Replaces localStorage with AsyncStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

type Theme = 'light' | 'dark';
type ThemeMode = 'auto' | 'light' | 'dark';

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
  textMuted: '#7E9A90', // tertiary — brightened from #5F7D72 (was ~3.2:1 on dark bg, failed WCAG AA; now ~5.7:1)
  teal: '#1FC7C1',      // --teal-accent — primary brand color
  tealLight: '#3DD9D3',
  tealDark: '#178F8A',  // gradient end used on web hero cards
  gold: '#D4A017',      // --gold accent
  red: '#E26759',       // brightened from #E05D4E (Phase F Stage 2: was 4.1-4.3:1 on surface/card, failed WCAG AA for normal text; now ~4.6:1)
  green: '#27AE60',     // success / income
  blue: '#4C8DF7',      // brightened from #3b82f6 (Phase F Stage 2: was 4.1-4.2:1 on surface/card, failed WCAG AA for normal text; now ~4.7:1)
};

export const lightColors = {
  bg: '#F7F5EF',        // background 36 33% 97%
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#DDE3DE',    // border 150 10% 88%
  text: '#0B1F17',      // foreground 152 53% 8%
  textSecondary: '#4A5C54', // muted-foreground 152 20% 35%
  textMuted: '#5C6B63', // darkened from #8A968F (was ~2.8:1 on light bg, failed WCAG AA; now ~5.2:1)
  teal: '#147B77',      // darkened from #178F8A (Phase F Stage 2: was 3.6-3.9:1 on bg/card, failed WCAG AA for normal text; now ~4.7:1)
  tealLight: '#1FC7C1',
  tealDark: '#0F6B67',
  gold: '#8F6809',      // darkened from #B8860B (Phase F Stage 2: was 3.0-3.3:1 on bg/card - the worst offender, failed even the large-text 3:1 minimum against bg; now ~4.6:1)
  red: '#D82323',       // darkened from #DC2626 (Phase F Stage 2: was 4.4:1 on bg, just under WCAG AA for normal text; now ~4.6:1)
  green: '#117F3A',     // darkened from #16A34A (Phase F Stage 2: was 3.0-3.3:1 on bg/card, failed WCAG AA for normal text; now ~4.7:1)
  blue: '#2563eb',
};

export type Colors = typeof darkColors;

interface ThemeContextType {
  /** Resolved value actually rendered - if themeMode is 'auto' this is the sunrise/sunset-computed value. */
  theme: Theme;
  colors: Colors;
  /**
   * Ground truth (Phase F, F1.1 fix). Previously there was only a resolved
   * `theme` plus an independent `autoSwitch` boolean with no coordination -
   * the auto-switch effect re-fired on every app mount and unconditionally
   * overwrote `theme`, silently reverting a manual toggle (most visibly on
   * app restart, since the effect always re-runs on mount). themeMode is
   * now the single source of truth; the auto-switch effect below is gated
   * on `themeMode === 'auto'` so it can never touch a manual choice.
   */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** Manual toggle - always switches to an explicit mode (light/dark), overriding auto. */
  toggleTheme: () => void;
  isDark: boolean;
  /** Backward-compat alias for themeMode === 'auto' - existing call sites (settings.tsx) unchanged. */
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

const THEME_KEY = 'amanah-theme';
const LEGACY_AUTOSWITCH_KEY = 'amanah-theme-autoswitch';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  // Only meaningful while themeMode === 'auto' - the sunrise/sunset-computed
  // resolved value. Kept separate from themeMode itself so a manual choice
  // is never mixed with the auto-computed one.
  const [resolvedAutoTheme, setResolvedAutoTheme] = useState<Theme>('dark');
  // Gate rendering until the stored theme is loaded, so screens never get a
  // chance to flash the 'dark' default before AsyncStorage resolves — the
  // provider is a single root-level instance, but this closes the one
  // window (first paint after app launch) where a stale default could show.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(LEGACY_AUTOSWITCH_KEY),
    ]).then(([storedTheme, legacyAutoSwitch]) => {
      // The legacy autoswitch flag predates themeMode - if it's set, honor
      // it as 'auto' regardless of whatever plain light/dark value happens
      // to be under THEME_KEY (that value predates the coordinated model).
      if (legacyAutoSwitch === 'true') {
        setThemeModeState('auto');
      } else if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') {
        setThemeModeState(storedTheme as ThemeMode);
      }
      setReady(true);
    });
  }, []);

  const applyAutoSwitch = useCallback(async () => {
    const times = await fetchSunriseSunset();
    if (!times) return;
    setResolvedAutoTheme(isNightNow(times.sunrise, times.sunset) ? 'dark' : 'light');
  }, []);

  // Re-check every 15 minutes while themeMode is 'auto' and the provider is
  // mounted. Root-cause fix for F1.1: this used to run whenever a separate
  // `autoSwitch` boolean was true and unconditionally overwrite the
  // resolved theme - including on every app mount - silently reverting a
  // manual toggle. Gating on themeMode ensures this effect can only ever
  // touch resolvedAutoTheme, never a manual light/dark choice.
  useEffect(() => {
    if (themeMode !== 'auto') return;
    applyAutoSwitch();
    const interval = setInterval(applyAutoSwitch, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [themeMode, applyAutoSwitch]);

  const theme: Theme = themeMode === 'auto' ? resolvedAutoTheme : themeMode;

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_KEY, mode);
    // themeMode is now the single source of truth - keep the legacy flag in
    // sync so a stale 'true' can never resurrect auto mode after this.
    await AsyncStorage.setItem(LEGACY_AUTOSWITCH_KEY, mode === 'auto' ? 'true' : 'false');
  };

  // Always switches to an explicit manual mode - flips the currently
  // *resolved* theme, so tapping toggle while in auto mode gives an
  // immediate, predictable result instead of an auto-computed surprise.
  const toggleTheme = () => setThemeMode(theme === 'dark' ? 'light' : 'dark');

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{
      theme,
      colors,
      themeMode,
      setThemeMode,
      toggleTheme,
      isDark: theme === 'dark',
      autoSwitch: themeMode === 'auto',
      setAutoSwitch: (value: boolean) => setThemeMode(value ? 'auto' : theme),
    }}>
      {ready ? children : <View style={{ flex: 1, backgroundColor: colors.bg }} />}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? {
    theme: 'dark' as Theme,
    colors: darkColors,
    themeMode: 'dark' as ThemeMode,
    setThemeMode: async () => {},
    toggleTheme: () => {},
    isDark: true,
    autoSwitch: false,
    setAutoSwitch: async () => {},
  };
}
