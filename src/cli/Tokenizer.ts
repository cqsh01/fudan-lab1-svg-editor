import { Token } from './Token.js';

/** Recognizes boundaries and quotes; argument meaning belongs to the command. */
export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      if (/\s/.test(line[index]!)) { index++; continue; }
      const quoted = line[index] === '"';
      let source = '';
      if (quoted) {
        index++;
        let closed = false;
        while (index < line.length) {
          const character = line[index++]!;
          if (character === '"') { closed = true; break; }
          source += character;
          if (character === '\\' && index < line.length) source += line[index++];
        }
        if (!closed) throw new Error('unterminated double quote');
        if (index < line.length && !/\s/.test(line[index]!)) throw new Error('expected space after quoted argument');
      } else {
        while (index < line.length && !/\s/.test(line[index]!)) {
          const character = line[index++]!;
          if (character === '"') throw new Error('double quote must start an argument');
          source += character;
        }
      }
      tokens.push(new Token(source, quoted));
    }
    return tokens;
  }
}
