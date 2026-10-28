/** Immutable lexical value; consumers choose text escapes or a literal file path. */
export class Token {
  constructor(private readonly source: string, readonly quoted: boolean) {}

  get value(): string {
    if (!this.quoted) return this.source;
    let value = '';
    const escapes: Readonly<Record<string, string>> = { '"': '"', '\\': '\\', n: '\n', t: '\t', r: '\r' };
    for (let index = 0; index < this.source.length; index++) {
      const character = this.source[index]!;
      if (character !== '\\') { value += character; continue; }
      const escaped = this.source[++index];
      if (escaped === undefined || escapes[escaped] === undefined) throw new Error('invalid escape in quoted argument');
      value += escapes[escaped];
    }
    return value;
  }

  get pathValue(): string {
    // Preserve drive, relative and UNC separators, including sequences such as \n.
    // Only a quote escaped for the command grammar is decoded in a quoted path.
    return this.quoted ? this.source.replace(/\\"/g, '"') : this.source;
  }
}
