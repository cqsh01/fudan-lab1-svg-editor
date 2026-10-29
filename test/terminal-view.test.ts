import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Cli } from '../src/cli/Cli.js';
import { CommandParser } from '../src/cli/CommandParser.js';
import { EditorShell } from '../src/cli/EditorShell.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { TerminalView } from '../src/application/TerminalView.js';
import { TerminalText } from '../src/application/TerminalText.js';
import type { Terminal } from '../src/application/ports/Terminal.js';
import { FileSvgStore } from '../src/infrastructure/FileSvgStore.js';
import { FileRecoveryStore } from '../src/infrastructure/FileRecoveryStore.js';

class ViewTerminal implements Terminal {
  readonly interactive = false;
  readonly interrupted = false;
  readonly output: string[] = [];
  readonly errors: string[] = [];
  columns = 42;
  rows = 20;
  constructor(private readonly input: string[] = []) {}
  async readLine(): Promise<string | undefined> { return this.input.shift(); }
  writeLine(line: string): void { this.output.push(line); }
  writeError(line: string): void { this.errors.push(line); }
  close(): void {}
}

async function drawing(commands: string[]) {
  const terminal = new ViewTerminal();
  const session = new EditorSession(new FileSvgStore());
  const view = new TerminalView(terminal);
  const cli = new Cli(session, new CommandParser(undefined, undefined, view));
  for (const command of commands) assert.equal((await cli.execute(command)).error, undefined, command);
  return { terminal, session, view, cli };
}

// Spatial assertions use landmarks, rather than copying the renderer's math.
test('view shows only the actual canvas, with one rectangle and no invented labels or connectors', async () => {
  const { session, cli } = await drawing(['init 400 200', 'create rect card 80 60 200 80 none', 'set card stroke black']);
  const before = session.document.clone();
  const revision = session.revision;
  const result = await cli.execute('view');
  assert.equal(result.error, undefined);
  const image = result.output.join('\n');
  assert.match(image, /^Canvas 400 x 200 \| unsaved \| 1 elements/);
  assert.equal(result.output.filter(line => /\+---+\+/.test(line)).length, 4); // frame and rectangle, two edges each
  assert.doesNotMatch(image, /Start|Process|->/);
  assert.equal(session.document.sameContent(before), true);
  assert.equal(session.revision, revision);
  assert.equal((await cli.execute('undo')).error, undefined); // view did not create an IO barrier
  assert.equal(session.document.find('card').attributes.stroke, undefined);
  assert.equal((await cli.execute('redo')).error, undefined);
  assert.equal((await cli.execute('view extra')).error, 'error: usage: view');
});

test('groups inherit paint; text, circle, ellipse and line occupy their real positions in one canvas', async () => {
  const { cli } = await drawing([
    'init 400 200', 'create g scene', 'set scene fill none', 'set scene stroke black',
    'create circle c 70 60 30 in scene', 'create ellipse e 210 60 50 25 in scene',
    'create line l 40 140 300 140 black in scene', 'create text t 140 180 "当前 SVG"',
  ]);
  const result = (await cli.execute('view')).output;
  const upper = result.slice(2, 7).join('\n');
  assert.match(upper, /[/\\|]/); // curved outlines
  assert.doesNotMatch(upper, /\./); // inherited fill=none
  assert.match(result.join('\n'), /-----/);
  assert.match(result.join('\n'), /当前 SVG/);
  assert.equal(result.filter(line => /^\+[-]+\+$/.test(line)).length, 2); // a single shared canvas
  await cli.execute('move scene 0 60');
  const moved = (await cli.execute('view')).output;
  assert.notDeepEqual(moved, result);
  await cli.execute('undo');
  assert.deepEqual((await cli.execute('view')).output, result);
  await cli.execute('redo');
  assert.deepEqual((await cli.execute('view')).output, moved);
});

test('opaque fill occludes earlier shapes; front/back, invisible shapes and child overrides are respected', async () => {
  const { cli } = await drawing([
    'init 400 200', 'create text t 100 110 "VISIBLE"', 'create rect cover 50 50 250 100 red',
  ]);
  assert.doesNotMatch((await cli.execute('view')).output.join('\n'), /VISIBLE/);
  await cli.execute('back cover');
  assert.match((await cli.execute('view')).output.join('\n'), /VISIBLE/);
  await cli.execute('front cover');
  await cli.execute('set cover fill none');
  assert.match((await cli.execute('view')).output.join('\n'), /VISIBLE/);
  await cli.execute('create g hidden');
  await cli.execute('set hidden fill none');
  await cli.execute('create text gone 20 180 "HIDDEN" in hidden');
  assert.doesNotMatch((await cli.execute('view')).output.join('\n'), /HIDDEN/);
  await cli.execute('set gone fill black');
  assert.match((await cli.execute('view')).output.join('\n'), /HIDDEN/);
});

test('cell aspect, terminal resize, clipping and extreme finite coordinates keep output bounded', async () => {
  const { terminal, cli } = await drawing(['init 400 200', 'create rect r -100 40 180 80', 'create line l -100 150 500 150 black']);
  let result = (await cli.execute('view')).output;
  assert.ok(result.every(line => !line.startsWith('|') || line.length <= terminal.columns));
  const frame = result[1]!;
  const cells = frame.length - 2;
  const rowCount = result.length - 4;
  assert.ok(Math.abs(cells / (rowCount * 2) - 2) < 0.2); // 400:200 physical aspect
  assert.match(result.join('\n'), /\.\./);
  terminal.columns = 22;
  result = (await cli.execute('view')).output;
  assert.ok(result[1]!.length <= 22);
  assert.ok(result[1]!.length < frame.length);
  terminal.columns = 3;
  terminal.rows = 3;
  assert.equal((await cli.execute('view')).output[1], '+-+');
  await cli.execute('create rect far 1e300 1e300 1e300 1e300');
  await cli.execute('create line huge -1e300 0 1e300 200 black');
  await cli.execute('canvas 1e-300 1e300');
  result = (await cli.execute('view')).output;
  assert.ok(result.length <= 5);
  assert.doesNotMatch(result.join('\n'), /NaN|Infinity/);
});

test('CJK labels keep cell widths and terminal controls cannot escape the character frame', async () => {
  const { cli } = await drawing(['init 400 200', 'create text t 40 100 "中文 A"']);
  const result = (await cli.execute('view')).output;
  const layout = new TerminalText();
  const width = (value: string) => layout.glyphs(value).reduce((sum, glyph) => sum + glyph.width, 0);
  assert.match(result.join('\n'), /中文 A/);
  for (const row of result.filter(line => line.startsWith('|'))) assert.equal(width(row), width(result[1]!));
  const safe = layout.glyphs('A\u009b31m\u202eB\nC').map(glyph => glyph.text).join('');
  assert.doesNotMatch(safe, /[\u009b\u202e\n]/);
  await cli.execute('create rect mask 50 80 10 30 red'); // repaint one half of a wide character
  for (const row of (await cli.execute('view')).output.filter(line => line.startsWith('|'))) {
    assert.equal(width(row), width(result[1]!));
  }
});

test('automatic view refreshes on revisions, preserves scripts by default, and prints restored documents', async () => {
  const commands = ['init 400 200', 'create rect r 20 20 80 60', 'view', 'status', 'move r 100 0', 'undo', 'redo', 'move absent 1 1', 'exit'];
  const terminal = new ViewTerminal([...commands]);
  const session = new EditorSession(new FileSvgStore());
  const view = new TerminalView(terminal);
  const cli = new Cli(session, new CommandParser(undefined, undefined, view));
  assert.equal(await new EditorShell(session, terminal, cli, undefined, undefined, { terminalPreview: true }, view).run(), 1);
  assert.equal(terminal.output.filter(line => line.startsWith('Canvas ')).length, 6); // 5 revisions + one manual view
  assert.equal(terminal.errors.length, 1);
  const quiet = new ViewTerminal(['init', 'create rect r 1 2 3 4']);
  const next = new EditorSession(new FileSvgStore());
  await new EditorShell(next, quiet, new Cli(next)).run();
  assert.equal(quiet.output.some(line => line.startsWith('Canvas ')), false);
  const resumed = new ViewTerminal(['exit']);
  await new EditorShell(session, resumed, new Cli(session), undefined, undefined, { terminalPreview: true }).run();
  assert.equal(resumed.output.filter(line => line.startsWith('Canvas ')).length, 1);
});

test('real executable supports manual and opt-in automatic character preview over stdin', () => {
  const manual = spawnSync(process.execPath, ['dist/src/cli/Main.js'], { encoding: 'utf8', input: 'view\ninit 400 200\ncreate rect r 40 40 100 60\nview\nexit\n' });
  assert.equal(manual.status, 0, manual.stderr);
  assert.match(manual.stdout, /No canvas/);
  assert.match(manual.stdout, /Canvas 400 x 200/);
  assert.doesNotMatch(manual.stdout, /\u001b|svg> /);
  const automatic = spawnSync(process.execPath, ['dist/src/cli/Main.js', '--terminal-preview'], { encoding: 'utf8', input: 'init 400 200\ncreate circle c 50 50 20\nundo\nredo\nexit\n' });
  assert.equal(automatic.status, 0, automatic.stderr);
  assert.equal(automatic.stdout.match(/Canvas 400 x 200/g)?.length, 4);
  assert.equal(automatic.stderr, '');
});

test('read, save, canvas and recovery previews reflect the current dimensions and saved baseline', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.view-'));
  try {
    const { session, cli } = await drawing(['read test/fixtures/other.svg']);
    assert.match((await cli.execute('view')).output[0]!, /saved/);
    await cli.execute('create text note 30 100 "Recovered"');
    const drafts = new FileRecoveryStore(join(directory, 'drafts'));
    await drafts.save(session.document, session.filePath);
    const resumed = new EditorSession(new FileSvgStore());
    const terminal = new ViewTerminal(['canvas 500 250', `save "${join(directory, 'saved.svg')}"`, 'exit']);
    const view = new TerminalView(terminal);
    const nextCli = new Cli(resumed, new CommandParser(undefined, undefined, view));
    assert.equal(await new EditorShell(resumed, terminal, nextCli, new FileRecoveryStore(join(directory, 'drafts')), undefined,
      { recover: true, terminalPreview: true }, view).run(), 0);
    assert.deepEqual(terminal.output.filter(line => line.startsWith('Canvas ')), [
      `Canvas 400 x 300 | unsaved | ${session.document.count} elements`,
      `Canvas 500 x 250 | unsaved | ${session.document.count} elements`,
      `Canvas 500 x 250 | saved | ${session.document.count} elements`,
    ]);
    assert.equal(resumed.dirty, false);
    assert.match(terminal.output.join('\n'), /Recovered/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
