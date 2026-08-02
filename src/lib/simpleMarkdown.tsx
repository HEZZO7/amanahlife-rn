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
import React from 'react';
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

function renderInline(
  text: string,
  key: string,
  color: string,
  linkColor: string,
  isAr: boolean,
  onLinkPress: (url: string) => void
): React.ReactNode {
  // Bold spans and links can both appear in the same sentence, so split on
  // whichever pattern matches first at each position.
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return (
    <Text key={key} style={{ color, fontSize: 14.5, fontFamily: FONT_UI, lineHeight: 22, textAlign: isAr ? 'right' : 'left' }}>
      {parts.map((part, i) => {
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          return <Text key={i} style={{ fontFamily: FONT_UI_BOLD }}>{boldMatch[1]}</Text>;
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
      blocks.push(<Image key={`img-${idx}`} source={{ uri: imageMatch[2] }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 14 }} resizeMode="cover" />);
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
