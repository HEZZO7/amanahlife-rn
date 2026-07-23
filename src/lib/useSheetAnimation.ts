/**
 * Restores the slide/fade-in these sheets used to get for free from
 * <Modal>'s built-in transition, back when they were plain positioned Views
 * (see audit/navbar-overlap-fix-summary.md — <Modal> was removed because it
 * blocks touches to the nav bar behind it regardless of transparency).
 *
 * Plain react-native Animated, not reanimated: reanimated is only present
 * transitively (no direct usage anywhere in the app), and Animated.timing
 * with useNativeDriver is enough for a one-shot opacity/translateY fade.
 * Runs entirely on the native thread, so it never blocks JS-thread taps on
 * the nav bar underneath while it plays.
 */
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useSheetAnimation(visible: boolean, distance: number = 24) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, progress]);

  return {
    opacity: progress,
    translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
  };
}
