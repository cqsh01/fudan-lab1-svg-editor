import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('launch help and version work without a document; unknown options fail clearly', async () => {
  const metadata = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
  for (const option of ['--version', '-v']) {
    const result = spawnSync(process.execPath, ['dist/src/cli/Main.js', option], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, `${metadata.version}\n`);
    assert.equal(result.stderr, '');
  }
  const help = spawnSync(process.execPath, ['dist/src/cli/Main.js', '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: svg-editor/);
  assert.doesNotMatch(help.stdout, /svg> /);
  const invalid = spawnSync(process.execPath, ['dist/src/cli/Main.js', '--not-an-option'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /^error: /);
});

test('preview options validate ports before entering the command loop', () => {
  for (const args of [['--port', '4321'], ['--preview', '--port', '-1'], ['--preview', '--port', '65536'], ['--preview', '--port', 'abc']]) {
    const result = spawnSync(process.execPath, ['dist/src/cli/Main.js', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^error: /);
  }
});
