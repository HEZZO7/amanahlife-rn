/**
 * useRTL — pure manual RTL hook.
 * I18nManager is permanently locked to LTR, so ALL RTL is handled here.
 * Works instantly on language switch, no cold restart needed.
 */
import { useLanguage } from '../contexts/LanguageContext';

export function useRTL() {
  const { language, isRTL } = useLanguage();

  const rtlView = isRTL ? ({ flexDirection: 'row-reverse' as const }) : ({} as object);
  const rtlText = isRTL ? ({ textAlign: 'right' as const, writingDirection: 'rtl' as const }) : ({} as object);
  const rtlAlign = isRTL ? ({ alignItems: 'flex-end' as const }) : ({} as object);

  const rtlPad = (left: number, right: number) =>
    isRTL ? ({ paddingLeft: right, paddingRight: left }) : ({ paddingLeft: left, paddingRight: right });

  const toAr = (n: number | string): string => {
    if (!isRTL) return String(n);
    return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
  };

  return { isRTL, language, rtlView, rtlText, rtlAlign, rtlPad, toAr };
}
