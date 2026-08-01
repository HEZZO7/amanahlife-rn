/**
 * Blog post reader — native detail screen, migrated from
 * app/frontend/src/pages/blog/BlogPostPage.tsx +
 * src/components/blog/BlogArticleLayout.tsx. Renders one article's real
 * content (src/lib/blogContent.ts) via the minimal SimpleMarkdown renderer.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { PageHeader } from '../../../src/components/ui';
import { FONT_UI, FONT_UI_MEDIUM } from '../../../src/theme/fonts';
import { BLOG_POSTS } from '../../../src/lib/blogContent';
import { SimpleMarkdown } from '../../../src/lib/simpleMarkdown';

export default function BlogPost() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const isAr = language === 'ar';

  const post = BLOG_POSTS.find((p) => p.slug === slug && p.lang === language)
    ?? BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <PageHeader icon="📝" title={isAr ? 'المدونة' : 'Blog'} />
        <View style={styles.notFound}>
          <Text style={{ color: colors.textSecondary, fontSize: 14, fontFamily: FONT_UI }}>
            {isAr ? 'لم يتم العثور على المقال' : 'Article not found'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageHeader icon="📝" title={post.title.length > 28 ? `${post.title.slice(0, 28)}…` : post.title} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.textSecondary, fontSize: 12.5, fontFamily: FONT_UI_MEDIUM, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
          {post.description}
        </Text>
        <SimpleMarkdown body={post.body} colors={colors} isAr={isAr} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
