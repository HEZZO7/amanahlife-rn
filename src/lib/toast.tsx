/**
 * Lightweight toast — React Native replacement for the web app's `sonner`.
 * Usage mirrors sonner:  toast.success('...'), toast.error('...'), toast.info('...')
 *
 * Mount <Toaster /> once (done in app/(tabs)/_layout.tsx). Toasts appear at the
 * top of the screen and auto-dismiss after ~3s.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { FONT_UI_MEDIUM } from '../theme/fonts';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; message: string; }

let counter = 0;
const listeners = new Set<(t: ToastItem) => void>();

function emit(type: ToastType, message: string) {
  const item: ToastItem = { id: ++counter, type, message };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (m: string) => emit('success', m),
  error: (m: string) => emit('error', m),
  info: (m: string) => emit('info', m),
  message: (m: string) => emit('info', m),
};

function ToastRow({ item, color }: { item: ToastItem; color: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const { colors } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }, 2700);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: color, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>{item.message}</Text>
    </Animated.View>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const { colors } = useTheme();

  useEffect(() => {
    const listener = (t: ToastItem) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), 3000);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  if (items.length === 0) return null;

  const colorFor = (type: ToastType) =>
    type === 'success' ? colors.green : type === 'error' ? colors.red : colors.teal;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {items.map((item) => (
        <ToastRow key={item.id} item={item} color={colorFor(item.type)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    maxWidth: '92%', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { flex: 1, fontSize: 13.5, fontFamily: FONT_UI_MEDIUM },
});
