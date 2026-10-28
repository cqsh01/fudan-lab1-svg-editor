import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { EditorSession } from '../src/application/EditorSession.js';
import { Cli } from '../src/cli/Cli.js';
import { FileSvgStore } from '../src/infrastructure/FileSvgStore.js';
import { PreviewServer } from '../src/infrastructure/PreviewServer.js';

test('preview renders memory, reflects undo, and leaves history and dirty state intact', async () => {
  const session = new EditorSession(new FileSvgStore());
  const cli = new Cli(session);
  const preview = new PreviewServer(session);
  const address = await preview.start();
  try {
    const empty = await fetch(`${address}state`).then(response => response.json()) as { hasDocument: boolean };
    assert.equal(empty.hasDocument, false);
    assert.equal((await fetch(`${address}image.svg`)).status, 404);
    const page = await fetch(address);
    assert.match(page.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    assert.match(await page.text(), /图形预览/);
    await cli.execute('init 400 300');
    await cli.execute('create text t 10 20 "Hello <SVG>"');
    await cli.execute('move t 5 0');
    const revision = session.revision;
    const state = await fetch(`${address}state`).then(response => response.json()) as { width: number; count: number; dirty: boolean };
    assert.equal(state.width, 400);
    assert.equal(state.count, 1);
    assert.equal(state.dirty, true);
    const image = await fetch(`${address}image.svg`).then(response => response.text());
    assert.match(image, /x="15"/);
    assert.match(image, /Hello &lt;SVG/);
    assert.equal(session.revision, revision);
    assert.equal(session.dirty, true);
    assert.equal((await cli.execute('undo')).error, undefined);
    assert.match(await fetch(`${address}image.svg`).then(response => response.text()), /x="10"/);
    assert.equal((await cli.execute('redo')).error, undefined);
    assert.match(await fetch(`${address}image.svg`).then(response => response.text()), /x="15"/);
    assert.equal((await fetch(address, { method: 'HEAD' })).status, 200);
  } finally { await preview.stop(); }
  await assert.rejects(() => fetch(`${address}state`));
});

test('preview has no mutation/filesystem routes, requires the random path and rejects foreign hosts', async () => {
  const session = new EditorSession(new FileSvgStore());
  session.initialize(800, 600);
  const preview = new PreviewServer(session);
  const address = await preview.start();
  try {
    const origin = new URL(address).origin;
    assert.equal((await fetch(`${origin}/`)).status, 404);
    assert.equal((await fetch(`${address}../../package.json`)).status, 404);
    assert.equal((await fetch(`${address}command`, { method: 'POST', body: 'delete anything' })).status, 405);
    const foreignHost = await new Promise<number | undefined>((resolve, reject) => {
      const outgoing = request(`${address}state`, { headers: { Host: 'example.com' } }, response => {
        response.resume();
        resolve(response.statusCode);
      });
      outgoing.on('error', reject);
      outgoing.end();
    });
    assert.equal(foreignHost, 403);
    assert.equal(session.document.count, 0);
    assert.equal(await preview.start(), address);
  } finally { await preview.stop(); await preview.stop(); }
});

test('preview startup reports occupied ports and can be cleaned up after failure', async () => {
  const session = new EditorSession(new FileSvgStore());
  const first = new PreviewServer(session);
  const address = await first.start();
  const second = new PreviewServer(session, Number(new URL(address).port));
  try { await assert.rejects(() => second.start(), /EADDRINUSE/); }
  finally { await second.stop(); await first.stop(); }
});
