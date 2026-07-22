/**
 * Native <Modal> automatically closes on the Android hardware/gesture back
 * button via onRequestClose. Sheets rewritten as plain positioned Views
 * (to stop blocking the nav bar - see NavBarHeightContext) lose that for
 * free, so this restores it explicitly wherever one of those sheets is open.
 *
 * Returning `true` from the handler is what makes this "close the sheet"
 * instead of "pop the screen" or "exit the app" - it tells Android this
 * press was fully handled, so expo-router's own back handling (and the
 * OS default of exiting on the last screen) never runs.
 *
 * onClose is read from a ref rather than added to the effect's dependency
 * array, so passing a fresh inline arrow function on every render (the
 * normal way this hook gets called) doesn't tear down and re-add the
 * listener on every render - it's only added once when the sheet opens
 * and removed once when it closes.
 */
import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

export function useBackToClose(visible: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [visible]);
}
