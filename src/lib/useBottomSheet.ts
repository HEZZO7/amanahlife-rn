import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

/** Returns the correct bottom padding for any bottom-sheet modal so it never
 *  gets clipped behind the Android gesture bar or iOS home indicator. */
export function useBottomSheetPadding(extra = 16): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom + extra, Platform.OS === 'ios' ? 34 : 24);
}
