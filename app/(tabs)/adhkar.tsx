/**
 * Adhkar — migrated from app/frontend/src/pages/Adhkar.tsx
 * Morning/Evening/After-Prayer/Sleep adhkar with per-item tap counters and daily
 * progress (localStorage('adhkar_progress_<date>') → AsyncStorage). Bilingual.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { getUserItem, setUserItem, migrateLegacyKeyIfNeeded } from '../../src/lib/userStorage';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, ProgressBar } from '../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_ARABIC } from '../../src/theme/fonts';

interface Dhikr { id: string; arabic: string; transliteration: string; translation: string; count: number; }
interface AdhkarCategory { id: string; nameAr: string; nameEn: string; icon: string; items: Dhikr[]; }

const ADHKAR_DATA: AdhkarCategory[] = [
  { id: 'morning', nameAr: 'أذكار الصباح', nameEn: 'Morning Adhkar', icon: '🌅', items: [
    { id: 'm1', arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', transliteration: 'Asbahna wa asbahal mulku lillah', translation: 'We have reached the morning and at this very time the kingdom belongs to Allah', count: 1 },
    { id: 'm2', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'SubhanAllahi wa bihamdihi', translation: 'Glory is to Allah and praise is to Him', count: 100 },
    { id: 'm3', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', transliteration: "La ilaha illAllahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir", translation: 'None has the right to be worshipped except Allah alone, He has no partner. His is the dominion and His is the praise, and He is over all things omnipotent', count: 10 },
    { id: 'm4', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created', count: 3 },
    { id: 'm5', arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ', transliteration: "Bismillahil-ladhi la yadurru ma'asmihi shay'un", translation: 'In the name of Allah with whose name nothing can harm', count: 3 },
    { id: 'm6', arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا', transliteration: 'Allahumma bika asbahna wa bika amsayna', translation: 'O Allah, by Your leave we have reached the morning', count: 1 },
    { id: 'm7', arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ', transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyah", translation: 'O Allah, I ask You for pardon and well-being', count: 1 },
    { id: 'm8', arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ', transliteration: 'HasbiyAllahu la ilaha illa Huwa', translation: 'Allah is sufficient for me, there is no god but He', count: 7 },
    { id: 'm9', arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', transliteration: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mas-tata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa ant", translation: "O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me, for none forgives sins except You (Sayyid al-Istighfar)", count: 1 },
    { id: 'm10', arabic: 'اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ', transliteration: "Allahumma inni asbahtu ush-hiduka wa ush-hidu hamalata 'arshika, wa mala'ikataka, wa jami'a khalqika, annaka antallahu la ilaha illa anta wahdaka la sharika laka, wa anna Muhammadan 'abduka wa rasuluk", translation: 'O Allah, I have reached the morning and call on You, on the bearers of Your Throne, on Your angels and all creation to witness that You are Allah, none has the right to be worshipped except You alone, You have no partner, and that Muhammad is Your servant and Messenger', count: 4 },
    { id: 'm11', arabic: 'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ', transliteration: "Allahumma ma asbaha bi min ni'matin aw bi-ahadin min khalqika faminka wahdaka la sharika laka, falakal-hamdu wa lakash-shukr", translation: 'O Allah, whatever blessing I or any of Your creation have risen upon is from You alone, without partner, so for You is all praise and unto You all thanks', count: 1 },
    { id: 'm12', arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَٰهَ إِلَّا أَنْتَ', transliteration: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari, la ilaha illa ant. Allahumma inni a'udhu bika minal-kufri wal-faqr, wa a'udhu bika min 'adhabil-qabr, la ilaha illa ant", translation: 'O Allah, grant my body health, O Allah, grant my hearing health, O Allah, grant my sight health, none has the right to be worshipped except You. O Allah, I seek refuge in You from disbelief and poverty, and from the punishment of the grave, none has the right to be worshipped except You', count: 3 },
    { id: 'm13', arabic: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ', transliteration: "Allahumma 'Alimal-ghaybi wash-shahadah, Fatiras-samawati wal-ard, Rabba kulli shay'in wa malikahu, ash-hadu al-la ilaha illa ant, a'udhu bika min sharri nafsi, wa min sharrish-shaytani wa shirkihi, wa an aqtarifa 'ala nafsi su'an aw ajurrahu ila muslim", translation: 'O Allah, Knower of the unseen and the seen, Creator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that none has the right to be worshipped except You. I seek refuge in You from the evil of myself, from the evil and shirk of Satan, and from wronging my own soul or bringing such wrong upon a Muslim', count: 1 },
    { id: 'm14', arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا', transliteration: "Radeetu billahi rabban, wa bil-Islami dinan, wa bi-Muhammadin sallallahu 'alayhi wa sallama nabiyya", translation: 'I am pleased with Allah as a Lord, and Islam as a religion, and Muhammad (peace be upon him) as a Prophet', count: 3 },
    { id: 'm15', arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', transliteration: "Ya Hayyu Ya Qayyumu birahmatika astagheeth, aslih li sha'ni kullahu, wa la takilni ila nafsi tarfata 'ayn", translation: 'O Ever-Living, O Self-Subsisting and Supporter of all, by Your mercy I seek relief. Set right all my affairs and do not leave me to myself, even for the blink of an eye', count: 1 },
    { id: 'm16', arabic: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ', transliteration: "Asbahna 'ala fitratil-Islam, wa 'ala kalimatil-ikhlas, wa 'ala dini nabiyyina Muhammadin sallallahu 'alayhi wa sallam, wa 'ala millati abina Ibrahima hanifan musliman wa ma kana minal-mushrikin", translation: 'We rise upon the natural religion of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muhammad (peace be upon him), and upon the faith of our father Abraham, who was upright in submission and not among those who associate partners with Allah', count: 1 },
    { id: 'm17', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', transliteration: "Subhanallahi wa bihamdihi, 'adada khalqihi, wa rida nafsihi, wa zinata 'arshihi, wa midada kalimatih", translation: 'Glory and praise be to Allah, by the number of His creation, by His own pleasure, by the weight of His Throne, and by the extent of His words', count: 3 },
    { id: 'm18', arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', transliteration: 'Astaghfirullaha wa atubu ilayh', translation: "I seek Allah's forgiveness and turn to Him in repentance", count: 100 },
    { id: 'm19', arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ ﴿٤﴾ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِنْ شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾', transliteration: 'Surah Al-Ikhlas, Al-Falaq, and An-Nas', translation: 'Recite Surahs Al-Ikhlas, Al-Falaq, and An-Nas (each protects from all harm)', count: 3 },
  ] },
  { id: 'afterPrayer', nameAr: 'أذكار بعد الصلاة', nameEn: 'After Prayer', icon: '🕌', items: [
    { id: 'p1', arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', translation: 'I seek forgiveness from Allah', count: 3 },
    { id: 'p2', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', translation: 'Glory be to Allah', count: 33 },
    { id: 'p3', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', translation: 'All praise is due to Allah', count: 33 },
    { id: 'p4', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', translation: 'Allah is the Greatest', count: 33 },
    { id: 'p5', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', transliteration: 'La ilaha illAllahu wahdahu la sharika lah', translation: 'None has the right to be worshipped except Allah alone', count: 1 },
  ] },
  { id: 'evening', nameAr: 'أذكار المساء', nameEn: 'Evening Adhkar', icon: '🌙', items: [
    { id: 'e1', arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', transliteration: 'Amsayna wa amsal mulku lillah', translation: 'We have reached the evening and the kingdom belongs to Allah', count: 1 },
    { id: 'e2', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', transliteration: 'SubhanAllahi wa bihamdihi', translation: 'Glory is to Allah and praise is to Him', count: 100 },
    { id: 'e3', arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', transliteration: "A'udhu bikalimatillahit-tammati min sharri ma khalaq", translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created', count: 3 },
    { id: 'e4', arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا', transliteration: 'Allahumma bika amsayna wa bika asbahna', translation: 'O Allah, by Your leave we have reached the evening', count: 1 },
    { id: 'e5', arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ فَمِنْكَ', transliteration: "Allahumma ma amsa bi min ni'matin faminka", translation: 'O Allah, whatever blessing has been received by me is from You', count: 1 },
    { id: 'e6', arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', transliteration: "La ilaha illAllahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa huwa 'ala kulli shay'in qadir", translation: 'None has the right to be worshipped except Allah alone, He has no partner. His is the dominion and His is the praise, and He is over all things omnipotent', count: 10 },
    { id: 'e7', arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', transliteration: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mas-tata't, a'udhu bika min sharri ma sana't, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi faghfir li fa-innahu la yaghfirudh-dhunuba illa ant", translation: "O Allah, You are my Lord, none has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me, for none forgives sins except You (Sayyid al-Istighfar)", count: 1 },
    { id: 'e8', arabic: 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ', transliteration: "Allahumma inni amsaytu ush-hiduka wa ush-hidu hamalata 'arshika, wa mala'ikataka, wa jami'a khalqika, annaka antallahu la ilaha illa anta wahdaka la sharika laka, wa anna Muhammadan 'abduka wa rasuluk", translation: 'O Allah, I have reached the evening and call on You, on the bearers of Your Throne, on Your angels and all creation to witness that You are Allah, none has the right to be worshipped except You alone, You have no partner, and that Muhammad is Your servant and Messenger', count: 4 },
    { id: 'e9', arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَٰهَ إِلَّا أَنْتَ', transliteration: "Allahumma 'afini fi badani, Allahumma 'afini fi sam'i, Allahumma 'afini fi basari, la ilaha illa ant. Allahumma inni a'udhu bika minal-kufri wal-faqr, wa a'udhu bika min 'adhabil-qabr, la ilaha illa ant", translation: 'O Allah, grant my body health, O Allah, grant my hearing health, O Allah, grant my sight health, none has the right to be worshipped except You. O Allah, I seek refuge in You from disbelief and poverty, and from the punishment of the grave, none has the right to be worshipped except You', count: 3 },
    { id: 'e10', arabic: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ', transliteration: "Allahumma 'Alimal-ghaybi wash-shahadah, Fatiras-samawati wal-ard, Rabba kulli shay'in wa malikahu, ash-hadu al-la ilaha illa ant, a'udhu bika min sharri nafsi, wa min sharrish-shaytani wa shirkihi, wa an aqtarifa 'ala nafsi su'an aw ajurrahu ila muslim", translation: 'O Allah, Knower of the unseen and the seen, Creator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that none has the right to be worshipped except You. I seek refuge in You from the evil of myself, from the evil and shirk of Satan, and from wronging my own soul or bringing such wrong upon a Muslim', count: 1 },
    { id: 'e11', arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا', transliteration: "Radeetu billahi rabban, wa bil-Islami dinan, wa bi-Muhammadin sallallahu 'alayhi wa sallama nabiyya", translation: 'I am pleased with Allah as a Lord, and Islam as a religion, and Muhammad (peace be upon him) as a Prophet', count: 3 },
    { id: 'e12', arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', transliteration: "Ya Hayyu Ya Qayyumu birahmatika astagheeth, aslih li sha'ni kullahu, wa la takilni ila nafsi tarfata 'ayn", translation: 'O Ever-Living, O Self-Subsisting and Supporter of all, by Your mercy I seek relief. Set right all my affairs and do not leave me to myself, even for the blink of an eye', count: 1 },
    { id: 'e13', arabic: 'أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ', transliteration: "Amsayna 'ala fitratil-Islam, wa 'ala kalimatil-ikhlas, wa 'ala dini nabiyyina Muhammadin sallallahu 'alayhi wa sallam, wa 'ala millati abina Ibrahima hanifan musliman wa ma kana minal-mushrikin", translation: 'We reach the evening upon the natural religion of Islam, upon the word of sincere devotion, upon the religion of our Prophet Muhammad (peace be upon him), and upon the faith of our father Abraham, who was upright in submission and not among those who associate partners with Allah', count: 1 },
    { id: 'e14', arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', transliteration: "Subhanallahi wa bihamdihi, 'adada khalqihi, wa rida nafsihi, wa zinata 'arshihi, wa midada kalimatih", translation: 'Glory and praise be to Allah, by the number of His creation, by His own pleasure, by the weight of His Throne, and by the extent of His words', count: 3 },
    { id: 'e15', arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', transliteration: 'Astaghfirullaha wa atubu ilayh', translation: "I seek Allah's forgiveness and turn to Him in repentance", count: 100 },
    { id: 'e16', arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ ﴿٤﴾ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِنْ شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾', transliteration: 'Surah Al-Ikhlas, Al-Falaq, and An-Nas', translation: 'Recite Surahs Al-Ikhlas, Al-Falaq, and An-Nas (each protects from all harm)', count: 3 },
  ] },
  { id: 'sleep', nameAr: 'أذكار النوم', nameEn: 'Sleep Adhkar', icon: '😴', items: [
    { id: 's1', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', transliteration: 'Bismika Allahumma amutu wa ahya', translation: 'In Your name O Allah, I die and I live', count: 1 },
    { id: 's2', arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', translation: 'Glory be to Allah', count: 33 },
    { id: 's3', arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', translation: 'All praise is due to Allah', count: 33 },
    { id: 's4', arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', translation: 'Allah is the Greatest', count: 34 },
    { id: 's5', arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', transliteration: "Allahumma qini 'adhabaka yawma tab'athu 'ibadak", translation: 'O Allah, protect me from Your punishment on the day You resurrect Your servants', count: 3 },
  ] },
];

export default function Adhkar() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const tr = (en: string, ar: string) => (language === 'ar' ? ar : en);
  const userId = user?.id ?? null;

  const [selectedCategory, setSelectedCategory] = useState('morning');
  const [progress, setProgress] = useState<Record<string, number>>({});
  const today = new Date().toDateString();

  useEffect(() => {
    migrateLegacyKeyIfNeeded(`adhkar_progress_${today}`, userId).then(() => {
      getUserItem(`adhkar_progress_${today}`, userId).then((s) => { if (s) setProgress(JSON.parse(s)); });
    });
  }, [today, userId]);

  const increment = (id: string, maxCount: number) => {
    const current = progress[id] || 0;
    if (current < maxCount) {
      const updated = { ...progress, [id]: current + 1 };
      setProgress(updated);
      setUserItem(`adhkar_progress_${today}`, userId, JSON.stringify(updated));
      Vibration.vibrate(8);
    }
  };

  const currentCategory = ADHKAR_DATA.find((c) => c.id === selectedCategory)!;
  const totalRequired = currentCategory.items.reduce((s, i) => s + i.count, 0);
  const totalDone = currentCategory.items.reduce((s, i) => s + Math.min(progress[i.id] || 0, i.count), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🍃" title={tr('Adhkar', 'الأذكار')} />

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left' }}>
          {totalDone}/{totalRequired} {tr('completed', 'مكتمل')}
        </Text>
      </View>

      {/* Category tabs — 4 equal tabs, no ScrollView */}
      <View style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
      }}>
        {ADHKAR_DATA.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={{
                flex: 1,
                backgroundColor: active ? colors.teal : colors.card,
                borderRadius: 10,
                paddingVertical: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
              <Text style={{
                color: active ? '#04211C' : colors.textSecondary,
                fontSize: 10,
                fontFamily: FONT_UI_MEDIUM,
                textAlign: 'center',
                marginTop: 3,
              }} numberOfLines={2}>
                {language === 'ar' ? cat.nameAr : cat.nameEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Overall progress */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <ProgressBar value={totalRequired > 0 ? (totalDone / totalRequired) * 100 : 0} color={colors.gold} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {currentCategory.items.map((item) => {
          const current = progress[item.id] || 0;
          const isDone = current >= item.count;
          return (
            <View
              key={item.id}
              style={[styles.item, {
                backgroundColor: isDone ? colors.teal + '1A' : colors.card,
                borderColor: isDone ? colors.teal + '4D' : colors.border,
              }]}
            >
              <Text style={[styles.arabic, { color: colors.text, textAlign: 'right' }]}>{item.arabic}</Text>
              <Text style={[styles.translit, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{item.transliteration}</Text>
              <Text style={[styles.translation, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>{item.translation}</Text>
              {/* In Arabic: +1 on RIGHT, counter on LEFT */}
              <View style={[styles.itemFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.progWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.miniTrack, { backgroundColor: colors.surface }]}>
                    <View style={{ width: `${(current / item.count) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.teal }} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: FONT_UI }}>{current}/{item.count}</Text>
                </View>
                <TouchableOpacity
                  disabled={isDone}
                  onPress={() => increment(item.id, item.count)}
                  style={[styles.countBtn, { backgroundColor: isDone ? colors.teal + '33' : colors.teal }]}
                >
                  <Text style={{ color: isDone ? colors.teal : '#04211C', fontSize: 14, fontFamily: FONT_UI_BOLD }}>{isDone ? '✓' : '+1'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  catChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minWidth: 130 },
  content: { padding: 16, paddingTop: 6, paddingBottom: 32, gap: 12 },
  item: { padding: 16, borderRadius: 16, borderWidth: 1 },
  arabic: { fontSize: 19, fontFamily: FONT_ARABIC, textAlign: 'right', lineHeight: 36, marginBottom: 8 },
  translit: { fontSize: 12, fontFamily: FONT_UI, fontStyle: 'italic', marginBottom: 3 },
  translation: { fontSize: 12, fontFamily: FONT_UI, marginBottom: 12 },
  itemFooter: { alignItems: 'center', justifyContent: 'space-between' },
  progWrap: { alignItems: 'center', gap: 8 },
  miniTrack: { width: 96, height: 6, borderRadius: 3, overflow: 'hidden' },
  countBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
});
