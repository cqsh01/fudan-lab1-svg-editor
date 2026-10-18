import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Cli } from '../src/cli/Cli.js';
import { Tokenizer } from '../src/cli/Tokenizer.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { FileSvgStore } from '../src/infrastructure/FileSvgStore.js';

const setup = () => {
  const session = new EditorSession(new FileSvgStore());
  return { session, cli: new Cli(session) };
};

test('tokenizer preserves quoted text, escapes, empty content and colors', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize(' # comment'), []);
  assert.deepEqual(tokenizer.tokenize('create text t 0 0 "A \\"B\\" \\\\ C\\n"').at(-1), { value: 'A "B" \\ C\n', quoted: true });
  assert.equal(tokenizer.tokenize('set t text ""').at(-1)?.value, '');
  assert.equal(tokenizer.tokenize('set r fill #ffffff').at(-1)?.value, '#ffffff');
  for (const input of ['set t text "oops', 'help "a"b', 'help "\\q"', 'help a"b']) {
    assert.throws(() => tokenizer.tokenize(input));
  }
});

test('CLI covers all commands and all types, including in, group, ordering and nested ungroup', async () => {
  const { session, cli } = setup();
  const commands = [
    'help', 'init', 'canvas', 'canvas 900 700',
    'create g scene', 'create g node in scene',
    'create rect r 10 20 100 50 #eee in node',
    'create text t 20 40 "My Diagram" in node',
    'create circle c 100 100 20 red in scene',
    'create ellipse e 1 2 3 4', 'create line l 0 0 20 20 black',
    'move node 1.5 -2', 'scale node 2', 'set node fill blue',
    'set r stroke black', 'set r stroke-width 2', 'set t text "in"',
    'group pair l e', 'addto scene pair', 'front c', 'back c',
    'tree', 'tree node', 'show r', 'ungroup pair', 'undo', 'redo',
    'delete node', 'undo',
  ];
  for (const line of commands) {
    const result = await cli.execute(line);
    assert.equal(result.error, undefined, `${line}: ${result.error}`);
  }
  assert.equal(session.document.find('r').attributes.x, '23');
  assert.equal(session.document.find('t').textContent, 'in');
  assert.equal(session.document.find('r').attributes.fill, '#eee');
  assert.equal(session.document.children[0]?.id, 'scene');
  assert.equal(session.document.find('scene').children[0]?.id, 'c');
});

test('required errors and parser failures keep the document unchanged', async () => {
  const { session, cli } = setup();
  assert.equal((await cli.execute('tree')).error, "error: no document. use 'init' or 'read' first");
  await cli.execute('init');
  await cli.execute('create g scene');
  await cli.execute('create rect r 0 0 1 1 in scene');
  const errors = new Map([
    ['create rect r 0 0 1 1', 'error: id already exists: r'],
    ['show missing', 'error: no such shape: missing'],
    ['create circle c 0 0 1 in missing', 'error: no such container: missing'],
    ['create g child in r', 'error: not a container: r'],
    ['create box b 0 0 1 1 "title"', 'error: unknown shape type: box (is the plugin loaded?)'],
    ['group bad r scene', 'error: cannot group a container into its own descendant: scene'],
    ['ungroup scene', 'error: cannot ungroup top-level container: scene'],
    ['scale r 0', 'error: scale factor must be positive'],
    ['set r label x', 'error: unknown attribute: label'],
    ['canvas 100', 'error: usage: canvas [w h]'],
  ]);
  for (const [line, expected] of errors) assert.equal((await cli.execute(line)).error, expected, line);
  for (const line of ['move r 1', 'create rect x 0 0 1 1 extra extra', 'help extra', 'scale r NaN', 'set r x "1 2"', 'unknown', 'create g']) {
    assert.match((await cli.execute(line)).error ?? '', /^error: /, line);
  }
  assert.equal(session.document.count, 2);
  assert.equal(session.document.find('r').attributes.x, '0');
  assert.equal((await cli.execute('undo')).error, undefined);
  assert.equal(session.document.count, 1);
});

test('stdin scripts continue after errors and return failure status; clean scripts are quiet', () => {
  const result = spawnSync(process.execPath, ['dist/src/cli/Main.js'], {
    input: '# replay\ninit 400 300\ncreate text t 10 20 "Hello world"\nshow missing\ntree\n', encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'error: no such shape: missing\n');
  assert.match(result.stdout, /svg \(400x300\)/);
  assert.match(result.stdout, /"Hello world"/);
  assert.doesNotMatch(result.stdout, /svg> /);
  const clean = spawnSync(process.execPath, ['dist/src/cli/Main.js'], { input: 'init\n', encoding: 'utf8' });
  assert.equal(clean.status, 0);
  assert.equal(clean.stdout, 'canvas 800x600 created\n');
  assert.equal(clean.stderr, '');
});
