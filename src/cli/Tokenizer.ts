import type { Token } from './Token.js';

export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index]!)) { index++; continue; }
      const quoted = line[index] === '"';
      let value = '';
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const character = line[index++]!;
          if (character === '"') { closed = true; break; }
          if (character === '\\') {
            const escaped = line[index++];
            const escapes: Record<string, string> = { '"': '"', '\\': '\\', n: '\n', t: '\t', r: '\r' };
            if (escaped === undefined || escapes[escaped] === undefined) throw new Error('invalid escape in quoted argument');
            value += escapes[escaped];
          } else value += character;
        }
        if (!closed) throw new Error('unterminated double quote');
        if (index < line.length && !/\s/.test(line[index]!)) throw new Error('expected space after quoted argument');
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          const character = line[index++]!;
          if (character === '"') throw new Error('double quote must start an argument');
          value += character;
        }
      }
      tokens.push({ value, quoted });
    }
    return tokens;
  }
}
