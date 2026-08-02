/**
 * Lazy per-surah loader for the bundled Quran translation JSON assets.
 * A switch (not an object literal) so each surah's require() only executes
 * - and only that surah's data gets parsed into memory - when actually
 * requested, instead of eagerly parsing all 114 files at import time.
 */
export interface QuranTranslationAyah {
  numberInSurah: number;
  text: string;
}

export function loadTranslationSurah(surahNumber: number): QuranTranslationAyah[] {
  switch (surahNumber) {
    case 1: return require('../../assets/quran/en-sahih/1.json');
    case 2: return require('../../assets/quran/en-sahih/2.json');
    case 3: return require('../../assets/quran/en-sahih/3.json');
    case 4: return require('../../assets/quran/en-sahih/4.json');
    case 5: return require('../../assets/quran/en-sahih/5.json');
    case 6: return require('../../assets/quran/en-sahih/6.json');
    case 7: return require('../../assets/quran/en-sahih/7.json');
    case 8: return require('../../assets/quran/en-sahih/8.json');
    case 9: return require('../../assets/quran/en-sahih/9.json');
    case 10: return require('../../assets/quran/en-sahih/10.json');
    case 11: return require('../../assets/quran/en-sahih/11.json');
    case 12: return require('../../assets/quran/en-sahih/12.json');
    case 13: return require('../../assets/quran/en-sahih/13.json');
    case 14: return require('../../assets/quran/en-sahih/14.json');
    case 15: return require('../../assets/quran/en-sahih/15.json');
    case 16: return require('../../assets/quran/en-sahih/16.json');
    case 17: return require('../../assets/quran/en-sahih/17.json');
    case 18: return require('../../assets/quran/en-sahih/18.json');
    case 19: return require('../../assets/quran/en-sahih/19.json');
    case 20: return require('../../assets/quran/en-sahih/20.json');
    case 21: return require('../../assets/quran/en-sahih/21.json');
    case 22: return require('../../assets/quran/en-sahih/22.json');
    case 23: return require('../../assets/quran/en-sahih/23.json');
    case 24: return require('../../assets/quran/en-sahih/24.json');
    case 25: return require('../../assets/quran/en-sahih/25.json');
    case 26: return require('../../assets/quran/en-sahih/26.json');
    case 27: return require('../../assets/quran/en-sahih/27.json');
    case 28: return require('../../assets/quran/en-sahih/28.json');
    case 29: return require('../../assets/quran/en-sahih/29.json');
    case 30: return require('../../assets/quran/en-sahih/30.json');
    case 31: return require('../../assets/quran/en-sahih/31.json');
    case 32: return require('../../assets/quran/en-sahih/32.json');
    case 33: return require('../../assets/quran/en-sahih/33.json');
    case 34: return require('../../assets/quran/en-sahih/34.json');
    case 35: return require('../../assets/quran/en-sahih/35.json');
    case 36: return require('../../assets/quran/en-sahih/36.json');
    case 37: return require('../../assets/quran/en-sahih/37.json');
    case 38: return require('../../assets/quran/en-sahih/38.json');
    case 39: return require('../../assets/quran/en-sahih/39.json');
    case 40: return require('../../assets/quran/en-sahih/40.json');
    case 41: return require('../../assets/quran/en-sahih/41.json');
    case 42: return require('../../assets/quran/en-sahih/42.json');
    case 43: return require('../../assets/quran/en-sahih/43.json');
    case 44: return require('../../assets/quran/en-sahih/44.json');
    case 45: return require('../../assets/quran/en-sahih/45.json');
    case 46: return require('../../assets/quran/en-sahih/46.json');
    case 47: return require('../../assets/quran/en-sahih/47.json');
    case 48: return require('../../assets/quran/en-sahih/48.json');
    case 49: return require('../../assets/quran/en-sahih/49.json');
    case 50: return require('../../assets/quran/en-sahih/50.json');
    case 51: return require('../../assets/quran/en-sahih/51.json');
    case 52: return require('../../assets/quran/en-sahih/52.json');
    case 53: return require('../../assets/quran/en-sahih/53.json');
    case 54: return require('../../assets/quran/en-sahih/54.json');
    case 55: return require('../../assets/quran/en-sahih/55.json');
    case 56: return require('../../assets/quran/en-sahih/56.json');
    case 57: return require('../../assets/quran/en-sahih/57.json');
    case 58: return require('../../assets/quran/en-sahih/58.json');
    case 59: return require('../../assets/quran/en-sahih/59.json');
    case 60: return require('../../assets/quran/en-sahih/60.json');
    case 61: return require('../../assets/quran/en-sahih/61.json');
    case 62: return require('../../assets/quran/en-sahih/62.json');
    case 63: return require('../../assets/quran/en-sahih/63.json');
    case 64: return require('../../assets/quran/en-sahih/64.json');
    case 65: return require('../../assets/quran/en-sahih/65.json');
    case 66: return require('../../assets/quran/en-sahih/66.json');
    case 67: return require('../../assets/quran/en-sahih/67.json');
    case 68: return require('../../assets/quran/en-sahih/68.json');
    case 69: return require('../../assets/quran/en-sahih/69.json');
    case 70: return require('../../assets/quran/en-sahih/70.json');
    case 71: return require('../../assets/quran/en-sahih/71.json');
    case 72: return require('../../assets/quran/en-sahih/72.json');
    case 73: return require('../../assets/quran/en-sahih/73.json');
    case 74: return require('../../assets/quran/en-sahih/74.json');
    case 75: return require('../../assets/quran/en-sahih/75.json');
    case 76: return require('../../assets/quran/en-sahih/76.json');
    case 77: return require('../../assets/quran/en-sahih/77.json');
    case 78: return require('../../assets/quran/en-sahih/78.json');
    case 79: return require('../../assets/quran/en-sahih/79.json');
    case 80: return require('../../assets/quran/en-sahih/80.json');
    case 81: return require('../../assets/quran/en-sahih/81.json');
    case 82: return require('../../assets/quran/en-sahih/82.json');
    case 83: return require('../../assets/quran/en-sahih/83.json');
    case 84: return require('../../assets/quran/en-sahih/84.json');
    case 85: return require('../../assets/quran/en-sahih/85.json');
    case 86: return require('../../assets/quran/en-sahih/86.json');
    case 87: return require('../../assets/quran/en-sahih/87.json');
    case 88: return require('../../assets/quran/en-sahih/88.json');
    case 89: return require('../../assets/quran/en-sahih/89.json');
    case 90: return require('../../assets/quran/en-sahih/90.json');
    case 91: return require('../../assets/quran/en-sahih/91.json');
    case 92: return require('../../assets/quran/en-sahih/92.json');
    case 93: return require('../../assets/quran/en-sahih/93.json');
    case 94: return require('../../assets/quran/en-sahih/94.json');
    case 95: return require('../../assets/quran/en-sahih/95.json');
    case 96: return require('../../assets/quran/en-sahih/96.json');
    case 97: return require('../../assets/quran/en-sahih/97.json');
    case 98: return require('../../assets/quran/en-sahih/98.json');
    case 99: return require('../../assets/quran/en-sahih/99.json');
    case 100: return require('../../assets/quran/en-sahih/100.json');
    case 101: return require('../../assets/quran/en-sahih/101.json');
    case 102: return require('../../assets/quran/en-sahih/102.json');
    case 103: return require('../../assets/quran/en-sahih/103.json');
    case 104: return require('../../assets/quran/en-sahih/104.json');
    case 105: return require('../../assets/quran/en-sahih/105.json');
    case 106: return require('../../assets/quran/en-sahih/106.json');
    case 107: return require('../../assets/quran/en-sahih/107.json');
    case 108: return require('../../assets/quran/en-sahih/108.json');
    case 109: return require('../../assets/quran/en-sahih/109.json');
    case 110: return require('../../assets/quran/en-sahih/110.json');
    case 111: return require('../../assets/quran/en-sahih/111.json');
    case 112: return require('../../assets/quran/en-sahih/112.json');
    case 113: return require('../../assets/quran/en-sahih/113.json');
    case 114: return require('../../assets/quran/en-sahih/114.json');
    default: return [];
  }
}
