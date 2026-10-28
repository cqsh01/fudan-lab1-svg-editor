import { readFile } from 'node:fs/promises';
import type { SvgStore } from '../application/ports/SvgStore.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';
import { AtomicFileWriter } from './AtomicFileWriter.js';

export class FileSvgStore implements SvgStore {
  constructor(private readonly codec = new SvgCodec(), private readonly writer = new AtomicFileWriter()) {}

  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    let source: string;
    try { source = await readFile(path, 'utf8'); }
    catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(source);
  }

  async write(path: string, document: SvgDocument): Promise<void> {
    const source = this.codec.encode(document);
    try { await this.writer.write(path, source); }
    catch { throw new Error(`cannot write file: ${path}`); }
  }
}
