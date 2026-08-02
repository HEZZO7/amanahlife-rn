/**
 * Lazy per-surah loader for the bundled Quran arabic JSON assets.
 * A switch (not an object literal) so each surah's require() only executes
 * - and only that surah's data gets parsed into memory - when actually
 * requested, instead of eagerly parsing all 114 files at import time.
 */
export interface QuranArabicAyah {
  number: number;
  text: string;
  numberInSurah: number;
}

export function loadArabicSurah(surahNumber: number): QuranArabicAyah[] {
  switch (surahNumber) {
    case 1: return require('../../assets/quran/ar/1.json');
    case 2: return require('../../assets/quran/ar/2.json');
    case 3: return require('../../assets/quran/ar/3.json');
    case 4: return require('../../assets/quran/ar/4.json');
    case 5: return require('../../assets/quran/ar/5.json');
    case 6: return require('../../assets/quran/ar/6.json');
    case 7: return require('../../assets/quran/ar/7.json');
    case 8: return require('../../assets/quran/ar/8.json');
    case 9: return require('../../assets/quran/ar/9.json');
    case 10: return require('../../assets/quran/ar/10.json');
    case 11: return require('../../assets/quran/ar/11.json');
    case 12: return require('../../assets/quran/ar/12.json');
    case 13: return require('../../assets/quran/ar/13.json');
    case 14: return require('../../assets/quran/ar/14.json');
    case 15: return require('../../assets/quran/ar/15.json');
    case 16: return require('../../assets/quran/ar/16.json');
    case 17: return require('../../assets/quran/ar/17.json');
    case 18: return require('../../assets/quran/ar/18.json');
    case 19: return require('../../assets/quran/ar/19.json');
    case 20: return require('../../assets/quran/ar/20.json');
    case 21: return require('../../assets/quran/ar/21.json');
    case 22: return require('../../assets/quran/ar/22.json');
    case 23: return require('../../assets/quran/ar/23.json');
    case 24: return require('../../assets/quran/ar/24.json');
    case 25: return require('../../assets/quran/ar/25.json');
    case 26: return require('../../assets/quran/ar/26.json');
    case 27: return require('../../assets/quran/ar/27.json');
    case 28: return require('../../assets/quran/ar/28.json');
    case 29: return require('../../assets/quran/ar/29.json');
    case 30: return require('../../assets/quran/ar/30.json');
    case 31: return require('../../assets/quran/ar/31.json');
    case 32: return require('../../assets/quran/ar/32.json');
    case 33: return require('../../assets/quran/ar/33.json');
    case 34: return require('../../assets/quran/ar/34.json');
    case 35: return require('../../assets/quran/ar/35.json');
    case 36: return require('../../assets/quran/ar/36.json');
    case 37: return require('../../assets/quran/ar/37.json');
    case 38: return require('../../assets/quran/ar/38.json');
    case 39: return require('../../assets/quran/ar/39.json');
    case 40: return require('../../assets/quran/ar/40.json');
    case 41: return require('../../assets/quran/ar/41.json');
    case 42: return require('../../assets/quran/ar/42.json');
    case 43: return require('../../assets/quran/ar/43.json');
    case 44: return require('../../assets/quran/ar/44.json');
    case 45: return require('../../assets/quran/ar/45.json');
    case 46: return require('../../assets/quran/ar/46.json');
    case 47: return require('../../assets/quran/ar/47.json');
    case 48: return require('../../assets/quran/ar/48.json');
    case 49: return require('../../assets/quran/ar/49.json');
    case 50: return require('../../assets/quran/ar/50.json');
    case 51: return require('../../assets/quran/ar/51.json');
    case 52: return require('../../assets/quran/ar/52.json');
    case 53: return require('../../assets/quran/ar/53.json');
    case 54: return require('../../assets/quran/ar/54.json');
    case 55: return require('../../assets/quran/ar/55.json');
    case 56: return require('../../assets/quran/ar/56.json');
    case 57: return require('../../assets/quran/ar/57.json');
    case 58: return require('../../assets/quran/ar/58.json');
    case 59: return require('../../assets/quran/ar/59.json');
    case 60: return require('../../assets/quran/ar/60.json');
    case 61: return require('../../assets/quran/ar/61.json');
    case 62: return require('../../assets/quran/ar/62.json');
    case 63: return require('../../assets/quran/ar/63.json');
    case 64: return require('../../assets/quran/ar/64.json');
    case 65: return require('../../assets/quran/ar/65.json');
    case 66: return require('../../assets/quran/ar/66.json');
    case 67: return require('../../assets/quran/ar/67.json');
    case 68: return require('../../assets/quran/ar/68.json');
    case 69: return require('../../assets/quran/ar/69.json');
    case 70: return require('../../assets/quran/ar/70.json');
    case 71: return require('../../assets/quran/ar/71.json');
    case 72: return require('../../assets/quran/ar/72.json');
    case 73: return require('../../assets/quran/ar/73.json');
    case 74: return require('../../assets/quran/ar/74.json');
    case 75: return require('../../assets/quran/ar/75.json');
    case 76: return require('../../assets/quran/ar/76.json');
    case 77: return require('../../assets/quran/ar/77.json');
    case 78: return require('../../assets/quran/ar/78.json');
    case 79: return require('../../assets/quran/ar/79.json');
    case 80: return require('../../assets/quran/ar/80.json');
    case 81: return require('../../assets/quran/ar/81.json');
    case 82: return require('../../assets/quran/ar/82.json');
    case 83: return require('../../assets/quran/ar/83.json');
    case 84: return require('../../assets/quran/ar/84.json');
    case 85: return require('../../assets/quran/ar/85.json');
    case 86: return require('../../assets/quran/ar/86.json');
    case 87: return require('../../assets/quran/ar/87.json');
    case 88: return require('../../assets/quran/ar/88.json');
    case 89: return require('../../assets/quran/ar/89.json');
    case 90: return require('../../assets/quran/ar/90.json');
    case 91: return require('../../assets/quran/ar/91.json');
    case 92: return require('../../assets/quran/ar/92.json');
    case 93: return require('../../assets/quran/ar/93.json');
    case 94: return require('../../assets/quran/ar/94.json');
    case 95: return require('../../assets/quran/ar/95.json');
    case 96: return require('../../assets/quran/ar/96.json');
    case 97: return require('../../assets/quran/ar/97.json');
    case 98: return require('../../assets/quran/ar/98.json');
    case 99: return require('../../assets/quran/ar/99.json');
    case 100: return require('../../assets/quran/ar/100.json');
    case 101: return require('../../assets/quran/ar/101.json');
    case 102: return require('../../assets/quran/ar/102.json');
    case 103: return require('../../assets/quran/ar/103.json');
    case 104: return require('../../assets/quran/ar/104.json');
    case 105: return require('../../assets/quran/ar/105.json');
    case 106: return require('../../assets/quran/ar/106.json');
    case 107: return require('../../assets/quran/ar/107.json');
    case 108: return require('../../assets/quran/ar/108.json');
    case 109: return require('../../assets/quran/ar/109.json');
    case 110: return require('../../assets/quran/ar/110.json');
    case 111: return require('../../assets/quran/ar/111.json');
    case 112: return require('../../assets/quran/ar/112.json');
    case 113: return require('../../assets/quran/ar/113.json');
    case 114: return require('../../assets/quran/ar/114.json');
    default: return [];
  }
}
