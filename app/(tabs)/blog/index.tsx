/**
 * Blog — native list screen, migrated from
 * app/frontend/src/pages/blog/BlogIndexPage.tsx. Content sourced from
 * src/lib/blogContent.ts (generated from the web repo's real content
 * directory, app/frontend/seo/content/ - see that file's header).
 * Filters to the current app language, matching web's own per-language
 * article set.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { PageHeader, Card } from '../../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM, FONT_UI_BOLD } from '../../../src/theme/fonts';
import { BLOG_POSTS } from '../../../src/lib/blogContent';

export default function BlogIndex() {
  const router = useRouter();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';

  const posts = BLOG_POSTS.filter((p) => p.lang === language);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="📝" title={isAr ? 'المدونة' : 'Blog'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {posts.map((post) => (
          <TouchableOpacity key={post.slug} activeOpacity={0.85} onPress={() => router.push(`/(tabs)/blog/${post.slug}` as any)}>
            <Card padded={false} style={{ marginBottom: 14, overflow: 'hidden' }}>
              {!!post.heroImage && (
                <Image source={{ uri: post.heroImage }} style={styles.hero} resizeMode="cover" />
              )}
              <View style={{ padding: 14 }}>
                <Text
                  style={{ color: colors.text, fontSize: 15, fontFamily: FONT_UI_BOLD, textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }}
                  numberOfLines={2}
                >
                  {post.title}
                </Text>
                {!!post.keywords && (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {post.keywords.split(',').slice(0, 3).map((kw, i) => (
                      <View key={i} style={{ backgroundColor: colors.teal + '1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ color: colors.teal, fontSize: 11, fontFamily: FONT_UI_MEDIUM }}>{kw.trim()}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text
                  style={{ color: colors.textSecondary, fontSize: 12.5, fontFamily: FONT_UI, textAlign: isRTL ? 'right' : 'left', lineHeight: 18 }}
                  numberOfLines={3}
                >
                  {post.description}
                </Text>
                <Text style={{ color: colors.teal, fontSize: 12, fontFamily: FONT_UI_MEDIUM, marginTop: 10, textAlign: isRTL ? 'right' : 'left' }}>
                  {isAr ? 'اقرأ المزيد ←' : 'Read more →'}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  hero: { width: '100%', height: 160 },
});
