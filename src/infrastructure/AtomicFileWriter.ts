import { randomUUID } from 'node:crypto';
import { rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export class AtomicFileWriter {
  async write(path: string, source: string): Promise<void> {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, source, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      await rename(temporary, path);
    } finally { await unlink(temporary).catch(() => undefined); }
  }
}
