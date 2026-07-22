/**
 * Native <Modal> automatically closes on the Android hardware/gesture back
 * button via onRequestClose. Sheets rewritten as plain positioned Views
 * (to stop blocking the nav bar - see NavBarHeightContext) lose that for
 * free, so this restores it explicitly wherever one of those sheets is open.
 */
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useBackToClose(visible: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);
}
