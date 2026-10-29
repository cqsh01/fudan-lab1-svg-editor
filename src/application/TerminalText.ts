export interface TerminalGlyph {
  readonly text: string;
  readonly width: number;
}

/** Common CJK and emoji occupy two cells; terminal font metrics can still vary. */
export class TerminalText {
  private readonly segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

  glyphs(content: string): readonly TerminalGlyph[] {
    const safe = content.replace(/[\p{Cc}\p{Cf}]/gu, character => character === '\u200d' ? character : '');
    return [...this.segmenter.segment(safe)].map(({ segment }) => {
      const code = segment.codePointAt(0)!;
      const wide = code >= 0x1100 && (code <= 0x115f || code >= 0x2e80 && code <= 0xa4cf ||
        code >= 0xac00 && code <= 0xd7a3 || code >= 0xf900 && code <= 0xfaff ||
        code >= 0xfe10 && code <= 0xfe6f || code >= 0xff01 && code <= 0xff60 ||
        code >= 0xffe0 && code <= 0xffe6 || code >= 0x20000 && code <= 0x3fffd);
      return { text: /^\p{M}/u.test(segment) ? '?' : segment,
        width: wide || /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(segment) ? 2 : 1 };
    });
  }
}
