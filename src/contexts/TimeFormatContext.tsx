/**
 * TimeFormatContext — React Native
 * Migrated from app/frontend/src/contexts/TimeFormatContext.tsx
 * Replaces localStorage with AsyncStorage.
 *
 * Note: unlike the web version, this does not attempt Intl-based locale
 * detection for the initial default — Hermes' Intl support varies across
 * devices, so it defaults to 24h (the safer global default per the spec)
 * until the user explicitly chooses 12h in Settings.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeFormat, formatClockTime } from '../lib/time';

interface TimeFormatContextType {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  formatTime: (hhmm: string) => string;
}

const TimeFormatContext = createContext<TimeFormatContextType | undefined>(undefined);

export function TimeFormatProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('24h');

  useEffect(() => {
    AsyncStorage.getItem('amanah_time_format').then((stored) => {
      if (stored === '12h' || stored === '24h') setTimeFormatState(stored);
    });
  }, []);

  const setTimeFormat = (format: TimeFormat) => {
    setTimeFormatState(format);
    AsyncStorage.setItem('amanah_time_format', format);
  };

  const formatTime = (hhmm: string) => formatClockTime(hhmm, timeFormat);

  return (
    <TimeFormatContext.Provider value={{ timeFormat, setTimeFormat, formatTime }}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export function useTimeFormat() {
  const context = useContext(TimeFormatContext);
  if (context === undefined) {
    return {
      timeFormat: '24h' as TimeFormat,
      setTimeFormat: () => {},
      formatTime: (hhmm: string) => formatClockTime(hhmm, '24h'),
    };
  }
  return context;
}
