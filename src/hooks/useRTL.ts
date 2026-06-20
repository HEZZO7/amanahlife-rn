/**
 * useRTL — global RTL helper hook.
 * Provides style helpers so every screen can apply Arabic RTL layout
 * without repeating the same ternary logic everywhere.
 *
 * Usage:
 *   const { isRTL, rtlText, rtlView, rtlAlign, rtlPad, toAr } = useRTL();
 *   <Text style={[styles.label, rtlText]}>…</Text>
 *   <View style={[styles.row, rtlView]}>…</View>
 */
import { useLanguage } from '../contexts/LanguageContext';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function useRTL() {
  const { language, isRTL } = useLanguage();

  /** Right-align text + RTL writing direction for Arabic. */
  const rtlText = isRTL
    ? ({ textAlign: 'right' as const, writingDirection: 'rtl' as const })
    : ({} as object);

  /** Reverse horizontal flex rows for Arabic. */
  const rtlView = isRTL
    ? ({ flexDirection: 'row-reverse' as const })
    : ({} as object);

  /** Align children to the end (right) for Arabic. */
  const rtlAlign = isRTL
    ? ({ alignItems: 'flex-end' as const })
    : ({} as object);

  /**
   * Swap left/right padding values for Arabic.
   * rtlPad(leftEn, rightEn) → { paddingLeft, paddingRight }
   */
  const rtlPad = (left: number, right: number) =>
    isRTL
      ? ({ paddingLeft: right, paddingRight: left })
      : ({ paddingLeft: left, paddingRight: right });

  /**
   * Convert Western digits to Arabic-Indic numerals when in Arabic mode.
   * e.g.  toAr(30) → '٣٠'   (EN mode → '30')
   */
  const toAr = (n: number | string): string => {
    if (!isRTL) return String(n);
    return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[parseInt(d)]);
  };

  return { isRTL, language, rtlText, rtlView, rtlAlign, rtlPad, toAr };
}
