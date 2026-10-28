import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RecoveryStore } from '../application/ports/RecoveryStore.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { AtomicFileWriter } from './AtomicFileWriter.js';
import { SvgCodec } from './SvgCodec.js';

export class FileRecoveryStore implements RecoveryStore {
  private readonly directory: string;
  readonly location: string;
  private claimed = false;
  constructor(directory: string, private readonly codec = new SvgCodec(), private readonly writer = new AtomicFileWriter()) {
    this.directory = resolve(directory);
    this.location = join(this.directory, `draft-${randomUUID()}.json`);
  }
  async save(document: SvgDocument, originalPath?: string): Promise<void> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const source = JSON.stringify({ version: 1, originalPath: originalPath === undefined ? undefined : resolve(originalPath), svg: this.codec.encode(document) });
    if (Buffer.byteLength(source, 'utf8') > 16 * 1024 * 1024) throw new Error('recovery draft exceeds 16 MiB');
    await this.writer.write(this.location, source);
  }
  async recoverLatest(): Promise<{ document: SvgDocument; originalPath?: string }> {
    if (this.claimed) throw new Error('a recovery draft has already been loaded');
    let names: string[];
    try { names = await readdir(this.directory); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`no recovery draft found in: ${this.directory}`);
      throw new Error(`cannot read recovery directory: ${this.directory}`);
    }
    const files = await Promise.all(names.filter(name => /^draft-[a-f0-9-]+\.json$/.test(name)).map(async name => {
      const path = join(this.directory, name);
      const details = await stat(path);
      return { path, modified: details.mtimeMs, size: details.size, regular: details.isFile() };
    }));
    const latest = files.filter(file => file.regular && file.path !== this.location).sort((a, b) => b.modified - a.modified)[0];
    if (!latest) throw new Error(`no recovery draft found in: ${this.directory}`);
    try {
      if (latest.size > 16 * 1024 * 1024) throw new Error('draft too large');
      const raw: unknown = JSON.parse(await readFile(latest.path, 'utf8'));
      if (!raw || typeof raw !== 'object') throw new Error('invalid draft');
      const payload = raw as Record<string, unknown>;
      if (payload.version !== 1 || typeof payload.svg !== 'string' ||
        (payload.originalPath !== undefined && typeof payload.originalPath !== 'string')) throw new Error('invalid draft');
      const document = this.codec.decode(payload.svg).document;
      // Claim only a fully validated draft; concurrent recovery cannot share the same file.
      await rename(latest.path, this.location);
      this.claimed = true;
      return payload.originalPath === undefined ? { document } : { document, originalPath: payload.originalPath as string };
    } catch { throw new Error(`cannot recover draft: ${latest.path}`); }
  }
  async clear(): Promise<void> {
    try { await unlink(this.location); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}
