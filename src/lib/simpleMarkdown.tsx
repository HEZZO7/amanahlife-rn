/**
 * Minimal markdown-to-RN renderer for blog article bodies. Deliberately
 * narrow - only supports the actual markdown constructs the real articles
 * in seo/content/*.md use (confirmed by auditing all 10 real files before
 * extending this): #/##/### headings, **bold** inline spans, [text](url)
 * links, a single hero image per article, and plain paragraphs. Audited
 * for lists/blockquotes/horizontal-rules/inline-code/tables too (2026-08-02)
 * - none of the real content uses any of those, so they're deliberately
 * still unsupported rather than built speculatively. Not a general-purpose
 * markdown engine.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Image, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { FONT_UI, FONT_UI_BOLD } from '../theme/fonts';

interface Colors { text: string; textSecondary: string; teal?: string; }

/**
 * Content links are web-style paths (`/subscription`, `/prayer-times`,
 * `/blog/<slug>`) since the same markdown source ships to both platforms -
 * every one of them maps 1:1 onto an RN tab route by prefixing `(tabs)`.
 */
function isInternalPath(url: string): boolean {
  return url.startsWith('/');
}

function toRNRoute(webPath: string): string {
  return `/(tabs)${webPath}`;
}

async function handleLinkPress(url: string, router: ReturnType<typeof useRouter>): Promise<void> {
  if (isInternalPath(url)) {
    router.push(toRNRoute(url) as any);
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

// Renders at the image's own intrinsic aspect ratio (via Image.getSize),
// uncropped and square-cornered - matching web's unstyled <img> inside the
// markdown-to-jsx `prose` body, which has no crop/border-radius override.
// Falls back to 16:9 only until the real size resolves.
function ArticleHeroImage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(16 / 9);
  useEffect(() => {
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => { if (!cancelled && h > 0) setRatio(w / h); },
      () => {}
    );
    return () => { cancelled = true; };
  }, [uri]);
  return <Image source={{ uri }} style={{ width: '100%', aspectRatio: ratio, marginBottom: 14 }} resizeMode="contain" />;
}

function renderInline(
  text: string,
  key: string,
  color: string,
  linkColor: string,
  isAr: boolean,
  onLinkPress: (url: string) => void
): React.ReactNode {
  // Bold spans, italic spans, and links can all appear in the same
  // sentence, so split on whichever pattern matches first at each
  // position. Bold is listed before italic so "**x**" can't be picked up
  // by the single-asterisk alternative first (moot in practice since
  // `[^*]+` can't match into a second leading asterisk, but explicit
  // ordering keeps the intent clear).
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return (
    <Text key={key} style={{ color, fontSize: 14.5, fontFamily: FONT_UI, lineHeight: 22, textAlign: isAr ? 'right' : 'left' }}>
      {parts.map((part, i) => {
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          return <Text key={i} style={{ fontFamily: FONT_UI_BOLD }}>{boldMatch[1]}</Text>;
        }
        const italicMatch = part.match(/^\*([^*]+)\*$/);
        if (italicMatch) {
          return <Text key={i} style={{ fontStyle: 'italic' }}>{italicMatch[1]}</Text>;
        }
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          return (
            <Text
              key={i}
              style={{ color: linkColor, fontFamily: FONT_UI_BOLD, textDecorationLine: 'underline' }}
              onPress={() => onLinkPress(url)}
              suppressHighlighting={false}
            >
              {label}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

export function SimpleMarkdown({ body, colors, isAr }: { body: string; colors: Colors; isAr: boolean }) {
  const router = useRouter();
  const linkColor = colors.teal || '#1FC7C1';
  const onLinkPress = (url: string) => { handleLinkPress(url, router); };
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(' ').trim();
    if (text) blocks.push(<View key={`p-${blocks.length}`} style={{ marginBottom: 14 }}>{renderInline(text, `t-${blocks.length}`, colors.textSecondary, linkColor, isAr, onLinkPress)}</View>);
    paragraphLines = [];
  };

  lines.forEach((line, idx) => {
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imageMatch) {
      flushParagraph();
      blocks.push(<ArticleHeroImage key={`img-${idx}`} uri={imageMatch[2]} />);
      return;
    }
    const h1 = line.match(/^#\s+(.*)$/);
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h1 || h2 || h3) {
      flushParagraph();
      const content = (h1 ?? h2 ?? h3)![1];
      const size = h1 ? 22 : h2 ? 18 : 15.5;
      blocks.push(
        <Text key={`h-${idx}`} style={{ color: colors.text, fontSize: size, fontFamily: FONT_UI_BOLD, marginTop: 6, marginBottom: 10, textAlign: isAr ? 'right' : 'left' }}>
          {content}
        </Text>
      );
      return;
    }
    if (line.trim() === '') {
      flushParagraph();
      return;
    }
    paragraphLines.push(line.trim());
  });
  flushParagraph();

  return <View>{blocks}</View>;
}
