/**
 * Qibla Finder — migrated from app/frontend/src/pages/QiblaFinder.tsx
 * DeviceOrientationEvent → expo-location watchHeadingAsync. Great-circle bearing
 * to the Kaaba, rotating compass dial + Qibla arrow, geolocation w/ NY fallback.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Svg, { Line } from 'react-native-svg';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../src/components/ui';
import { toast } from '../../src/lib/toast';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD, FONT_UI_BLACK } from '../../src/theme/fonts';

const COMPASS = 280;

export default function QiblaFinder() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();
  const isAr = language === 'ar';

  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [locationName, setLocationName] = useState(isAr ? 'جارٍ التحديد...' : 'Detecting...');
  const [error, setError] = useState('');
  const headingSub = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => { if (!authLoading && !user) router.replace('/(auth)/landing'); }, [user, authLoading]);

  const calculateQibla = useCallback((lat: number, lng: number) => {
    const kaabaLat = 21.4225, kaabaLng = 39.8262;
    const latRad = (lat * Math.PI) / 180;
    const kaabaLatRad = (kaabaLat * Math.PI) / 180;
    const dLng = ((kaabaLng - lng) * Math.PI) / 180;
    const x = Math.sin(dLng);
    const y = Math.cos(latRad) * Math.tan(kaabaLatRad) - Math.sin(latRad) * Math.cos(dLng);
    let qibla = (Math.atan2(x, y) * 180) / Math.PI;
    if (qibla < 0) qibla += 360;
    setQiblaDirection(Math.round(qibla));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(isAr ? 'تم رفض الوصول إلى الموقع. يرجى تفعيل خدمات الموقع.' : 'Location access denied. Please enable location services.');
          calculateQibla(40.7128, -74.006);
          setLocationName(isAr ? 'نيويورك (افتراضي)' : 'New York (default)');
          toast.info(isAr ? 'يتم استخدام الموقع الافتراضي. فعّل GPS للحصول على اتجاه دقيق.' : 'Using default location. Enable GPS for accurate direction.');
        } else {
          const pos = await Location.getCurrentPositionAsync({});
          calculateQibla(pos.coords.latitude, pos.coords.longitude);
          setLocationName(`${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E`);
        }
        headingSub.current = await Location.watchHeadingAsync((h) => {
          setCompassHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
        });
      } catch {
        setError(isAr ? 'تعذر تحديد الموقع' : 'Could not determine location');
        calculateQibla(40.7128, -74.006);
      }
    })();
    return () => { headingSub.current?.remove(); };
  }, [calculateQibla, isAr]);

  const rotation = qiblaDirection !== null ? qiblaDirection - compassHeading : 0;

  if (authLoading) return null;

  const cardinals: { label: string; style: object; color: string }[] = [
    { label: isAr ? 'شمال' : 'N', style: { top: 4, alignSelf: 'center' }, color: colors.red },
    { label: isAr ? 'جنوب' : 'S', style: { bottom: 4, alignSelf: 'center' }, color: colors.textSecondary },
    { label: isAr ? 'شرق' : 'E', style: { right: 4, top: COMPASS / 2 - 11 }, color: colors.textSecondary },
    { label: isAr ? 'غرب' : 'W', style: { left: 4, top: COMPASS / 2 - 11 }, color: colors.textSecondary },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="🧭" title={isAr ? 'محدد القبلة' : 'Qibla Finder'} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: colors.gold + '1A', borderColor: colors.gold + '4D' }]}>
            <Text style={{ color: colors.gold, fontSize: 13, fontFamily: FONT_UI, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        <Text style={[styles.location, { color: colors.textSecondary, textAlign: isAr ? 'right' : 'left' }]}>📍 {locationName}</Text>

        {/* Compass */}
        <View style={styles.compassWrap}>
          <View style={[styles.compass, { borderColor: colors.border, backgroundColor: colors.card }]}>
            {/* Rotating dial */}
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${-compassHeading}deg` }] }]}>
              <Svg width={COMPASS} height={COMPASS} style={StyleSheet.absoluteFill}>
                {Array.from({ length: 36 }).map((_, i) => {
                  const major = i % 9 === 0;
                  const len = major ? 16 : 8;
                  return (
                    <Line
                      key={i}
                      x1={COMPASS / 2} y1={4} x2={COMPASS / 2} y2={4 + len}
                      stroke={major ? colors.textSecondary : colors.border}
                      strokeWidth={major ? 2 : 1}
                      originX={COMPASS / 2} originY={COMPASS / 2}
                      rotation={i * 10}
                    />
                  );
                })}
              </Svg>
              {cardinals.map((c) => (
                <Text key={c.label} style={[styles.cardinal, c.style, { color: c.color }]}>{c.label}</Text>
              ))}
            </View>

            {/* Qibla arrow */}
            <View style={[StyleSheet.absoluteFill, styles.arrowWrap, { transform: [{ rotate: `${rotation}deg` }] }]}>
              <Text style={styles.kaaba}>🕋</Text>
              <View style={[styles.arrowHead, { borderBottomColor: colors.green }]} />
              <View style={[styles.arrowTail, { backgroundColor: colors.green + '99' }]} />
            </View>

            {/* Center dot */}
            <View style={[styles.centerDot, { backgroundColor: colors.green, borderColor: colors.bg }]} />
          </View>
        </View>

        {/* Direction info */}
        <Card style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={[styles.dirLabel, { color: colors.textSecondary }]}>{isAr ? 'اتجاه القبلة' : 'Qibla Direction'}</Text>
          <Text style={[styles.dirValue, { color: colors.green }]}>{qiblaDirection !== null ? `${qiblaDirection}°` : '...'}</Text>
          <Text style={[styles.dirSub, { color: colors.textSecondary }]}>{isAr ? 'من الشمال (باتجاه عقارب الساعة)' : 'from North (clockwise)'}</Text>
        </Card>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.teal + '14', borderColor: colors.teal + '40' }]}>
          <Text style={[styles.instrTitle, { color: colors.teal, textAlign: isAr ? 'right' : 'left' }]}>{isAr ? 'طريقة الاستخدام:' : 'How to use:'}</Text>
          {(isAr
            ? ['أمسك جهازك بشكل مسطح ومستوٍ', 'السهم الأخضر يشير نحو الكعبة', 'لأفضل دقة، فعّل خدمات الموقع', 'قم بمعايرة البوصلة بتحريك هاتفك على شكل رقم 8']
            : ['Hold your device flat and level', 'The green arrow points toward the Kaaba', 'For best accuracy, enable location services', 'Calibrate your compass by moving your phone in a figure-8 pattern']
          ).map((line, i) => (
            <Text key={i} style={[styles.instrLine, { color: colors.teal, textAlign: isAr ? 'right' : 'left' }]}>• {line}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  errorBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  location: { fontSize: 13, fontFamily: FONT_UI, textAlign: 'center', marginBottom: 18 },
  compassWrap: { alignItems: 'center' },
  compass: { width: COMPASS, height: COMPASS, borderRadius: COMPASS / 2, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  cardinal: { position: 'absolute', fontSize: 12, fontFamily: FONT_UI_BOLD },
  arrowWrap: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 28 },
  kaaba: { fontSize: 18, marginBottom: 2 },
  arrowHead: { width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 78, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  arrowTail: { width: 8, height: 56, borderRadius: 4, marginTop: -6 },
  centerDot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  dirLabel: { fontSize: 13, fontFamily: FONT_UI },
  dirValue: { fontSize: 40, fontFamily: FONT_UI_BLACK, marginVertical: 4 },
  dirSub: { fontSize: 11, fontFamily: FONT_UI },
  instructions: { marginTop: 20, padding: 16, borderRadius: 14, borderWidth: 1 },
  instrTitle: { fontSize: 14, fontFamily: FONT_UI_BOLD, marginBottom: 8 },
  instrLine: { fontSize: 12, fontFamily: FONT_UI, lineHeight: 20 },
});
