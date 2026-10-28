import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { FileRecoveryStore } from '../src/infrastructure/FileRecoveryStore.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Text } from '../src/domain/Text.js';

test('recovery files are independent, atomically updated and claimed only after validation', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.recovery-'));
  try {
    const first = new FileRecoveryStore(directory);
    const second = new FileRecoveryStore(directory);
    const document = new SvgDocument(400, 300);
    document.add(new Text('t', 10, 20, 'A & 中文'));
    await first.save(document, 'original.svg');
    await second.save(new SvgDocument(20, 30));
    await utimes(first.location, new Date('2025-01-01T00:00:00Z'), new Date('2025-01-01T00:00:00Z'));
    await utimes(second.location, new Date('2025-01-02T00:00:00Z'), new Date('2025-01-02T00:00:00Z'));
    assert.notEqual(first.location, second.location);
    const resumed = new FileRecoveryStore(directory);
    const recovered = await resumed.recoverLatest();
    assert.equal(recovered.document.width, 20);
    await access(first.location);
    await assert.rejects(() => access(second.location));
    await access(resumed.location);
    await resumed.clear();
    const another = new FileRecoveryStore(directory);
    const original = await another.recoverLatest();
    assert.equal(original.document.find('t').textContent, 'A & 中文');
    assert.equal(original.originalPath, resolve('original.svg'));
    await assert.rejects(() => another.recoverLatest(), /already been loaded/);
    await another.save(original.document, original.originalPath);
    assert.equal((await readdir(directory)).filter(name => !name.startsWith('._') && name.endsWith('.tmp')).length, 0);
    await another.clear();
    await assert.rejects(() => new FileRecoveryStore(directory).recoverLatest(), /no recovery draft/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('corrupt drafts remain available for inspection and failed writes are surfaced', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.recovery-'));
  try {
    const path = join(directory, 'draft-abc.json');
    await writeFile(path, '{broken');
    await assert.rejects(() => new FileRecoveryStore(directory).recoverLatest(), /cannot recover draft/);
    assert.equal(await readFile(path, 'utf8'), '{broken');
    await writeFile(path, JSON.stringify({ version: 1, svg: '<svg/>', originalPath: 42 }));
    await assert.rejects(() => new FileRecoveryStore(directory).recoverLatest(), /cannot recover draft/);
    const blocked = join(directory, 'file');
    await writeFile(blocked, 'not a directory');
    await assert.rejects(() => new FileRecoveryStore(blocked).save(new SvgDocument()));
    await assert.rejects(() => new FileRecoveryStore(join(directory, 'missing')).recoverLatest(), /no recovery draft/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('an oversized draft is rejected before replacing the last usable checkpoint', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.recovery-'));
  try {
    const store = new FileRecoveryStore(directory);
    await store.save(new SvgDocument(400, 300));
    const previous = await readFile(store.location, 'utf8');
    const oversized = new SvgDocument(400, 300);
    oversized.add(new Text('large', 0, 0, 'x'.repeat(16 * 1024 * 1024)));
    await assert.rejects(() => store.save(oversized), /exceeds 16 MiB/);
    assert.equal(await readFile(store.location, 'utf8'), previous);
    await store.clear();
  } finally { await rm(directory, { recursive: true, force: true }); }
});
