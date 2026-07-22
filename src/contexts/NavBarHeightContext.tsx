/**
 * Publishes BottomNav's actual measured height so bottom sheets/modals
 * elsewhere in the app can stop above it instead of covering it.
 *
 * Why this exists: React Native's <Modal> renders in its own native window
 * that captures ALL touch input within its bounds, even where nothing is
 * drawn (a `transparent` Modal still blocks taps to whatever's behind it —
 * a well-known RN/Android limitation, unlike web's CSS z-index stacking
 * where an element simply outside an overlay's bounds is untouched). So a
 * Modal-based bottom sheet can never let taps reach the real BottomNav
 * underneath it, no matter how its content is sized or positioned.
 *
 * The fix (mirroring the web fix for the same bug): stop using <Modal> for
 * sheets that should coexist with the nav, and instead render them as a
 * plain absolutely-positioned View inside the normal screen tree, offset by
 * this measured nav height. Since it's a real sibling in the same view
 * hierarchy (not a separate native window), the area below the sheet's
 * backdrop is untouched and taps fall through to the nav bar beneath it.
 *
 * BottomNav measures its own rendered height (which already includes
 * safe-area insets) via onLayout and publishes it here; any screen's own
 * "Add X" sheet reads it via useNavBarHeight() to size its overlay.
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavBarHeightContextType {
  height: number;
  setHeight: (h: number) => void;
}

const NavBarHeightContext = createContext<NavBarHeightContextType>({ height: 0, setHeight: () => {} });

export function NavBarHeightProvider({ children }: { children: ReactNode }) {
  const [height, setHeight] = useState(0);
  return (
    <NavBarHeightContext.Provider value={{ height, setHeight }}>
      {children}
    </NavBarHeightContext.Provider>
  );
}

/** Current measured BottomNav height in px (0 until first layout pass — treat as "no offset yet" rather than blocking render). */
export function useNavBarHeight(): number {
  return useContext(NavBarHeightContext).height;
}

export function useSetNavBarHeight(): (h: number) => void {
  return useContext(NavBarHeightContext).setHeight;
}
