/**
 * Minimal markdown-to-RN renderer for blog article bodies. Deliberately
 * narrow - only supports the actual markdown constructs the real articles
 * in seo/content/*.md use (confirmed by grep before writing this): #/##/###
 * headings, **bold** inline spans, a single hero image per article, and
 * plain paragraphs. No lists/links/tables support since none of the real
 * content uses them - not a general-purpose markdown engine.
 */
import React from 'react';
import { View, Text, Image } from 'react-native';
import { FONT_UI, FONT_UI_BOLD } from '../theme/fonts';

interface Colors { text: string; textSecondary: string; }

function renderInline(text: string, key: string, color: string, isAr: boolean): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text key={key} style={{ color, fontSize: 14.5, fontFamily: FONT_UI, lineHeight: 22, textAlign: isAr ? 'right' : 'left' }}>
      {parts.map((part, i) => {
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          return <Text key={i} style={{ fontFamily: FONT_UI_BOLD }}>{boldMatch[1]}</Text>;
        }
        return part;
      })}
    </Text>
  );
}

export function SimpleMarkdown({ body, colors, isAr }: { body: string; colors: Colors; isAr: boolean }) {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(' ').trim();
    if (text) blocks.push(<View key={`p-${blocks.length}`} style={{ marginBottom: 14 }}>{renderInline(text, `t-${blocks.length}`, colors.textSecondary, isAr)}</View>);
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
