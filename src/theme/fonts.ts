/**
 * Font family constants — mirror the web app's index.css.
 * Web UI font:  'Tajawal'  (sans-serif)
 * Web Arabic:   'Amiri'    (serif, used for Quran/dua Arabic text)
 *
 * These names match the keys loaded via useFonts() in app/_layout.tsx.
 * If a font hasn't finished loading, React Native silently falls back to the
 * system font, so referencing these is always safe.
 */
export const FONT_UI = 'Tajawal_400Regular';
export const FONT_UI_MEDIUM = 'Tajawal_500Medium';
export const FONT_UI_BOLD = 'Tajawal_700Bold';
export const FONT_UI_BLACK = 'Tajawal_900Black';

export const FONT_ARABIC = 'Amiri_400Regular';
export const FONT_ARABIC_BOLD = 'Amiri_700Bold';
