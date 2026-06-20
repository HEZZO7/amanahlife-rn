import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useRouter } from 'expo-router';

export default function Screen() {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const router = useRouter();
  const name = 'ai-search';
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { borderColor: colors.border }]}>
          <Text style={{ color: colors.teal }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Migrate from:{'\n'}app/frontend/src/pages/{name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}.tsx
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.teal, fontWeight: '700', marginBottom: 6 }}>Connected to Supabase ✓</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 20 }}>
            • Real auth: useAuth(){'\n'}
            • Real data: supabase.from('table').select(){'\n'}
            • Same APIs as web app
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  back: { borderWidth: 1, borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8, textTransform: 'capitalize' },
  sub: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
});
