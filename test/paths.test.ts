import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { SvgStore } from '../src/application/ports/SvgStore.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Cli } from '../src/cli/Cli.js';
import { FileSvgStore } from '../src/infrastructure/FileSvgStore.js';

class PathStore implements SvgStore {
  lastRead = '';
  lastWrite = '';
  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    this.lastRead = path;
    return { document: new SvgDocument(400, 300), warnings: [] };
  }
  async write(path: string): Promise<void> { this.lastWrite = path; }
}

const paths = [
  String.raw`C:\Users\Alice\My Art\demo.svg`,
  String.raw`C:\temp\new.svg`,
  String.raw`C:\用户\绘图 作业\矩形.svg`,
  String.raw`\\server\共享 目录\new\text.svg`,
  String.raw`assets\new\rect.svg`,
  'C:/Users/Alice/My Art/demo.svg',
  '/Users/绘图 作业/demo.svg',
];

for (const path of paths) {
  test(`read/save preserve literal file paths: ${path}`, async () => {
    const store = new PathStore();
    const session = new EditorSession(store);
    const cli = new Cli(session);
    assert.equal((await cli.execute(`read "${path}"`)).error, undefined);
    assert.equal(store.lastRead, path);
    assert.equal(session.filePath, path);
    assert.equal((await cli.execute(`save "${path}"`)).error, undefined);
    assert.equal(store.lastWrite, path);
    assert.equal(store.lastRead.includes('\t'), false);
    assert.equal(store.lastRead.includes('\n'), false);
  });
}

test('text still decodes escapes while a quoted path can escape its quote delimiter', async () => {
  const store = new PathStore();
  const session = new EditorSession(store);
  const cli = new Cli(session);
  await cli.execute('init');
  assert.equal((await cli.execute(String.raw`create text t 1 2 "A\nB\tC\rD\\E\"F"`)).error, undefined);
  assert.equal(session.document.find('t').textContent, 'A\nB\tC\rD\\E"F');
  const before = session.document.clone();
  assert.match((await cli.execute(String.raw`set t text "bad\q"`)).error ?? '', /invalid escape/);
  assert.equal(session.document.sameContent(before), true);
  assert.equal((await cli.execute(String.raw`save "/tmp/a\"b.svg"`)).error, undefined);
  assert.equal(store.lastWrite, '/tmp/a"b.svg');
});

test('real file round-trip uses native quoted paths with spaces and Unicode', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.paths-'));
  try {
    const path = join(directory, '中文 diagram.svg');
    const session = new EditorSession(new FileSvgStore());
    const cli = new Cli(session);
    await cli.execute('init 400 300');
    await cli.execute('create text t 1 2 "中文 & SVG"');
    assert.equal((await cli.execute(`save "${path}"`)).error, undefined);
    await cli.execute('init');
    assert.equal((await cli.execute(`read "${path}"`)).error, undefined);
    assert.equal(session.document.find('t').textContent, '中文 & SVG');
    assert.match(await readFile(path, 'utf8'), /中文 &amp; SVG/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
