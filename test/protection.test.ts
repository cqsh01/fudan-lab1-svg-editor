import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Cli } from '../src/cli/Cli.js';
import { CommandParser } from '../src/cli/CommandParser.js';
import { EditorShell } from '../src/cli/EditorShell.js';
import { UnsavedChangesGuard } from '../src/cli/UnsavedChangesGuard.js';
import { EditorSession } from '../src/application/EditorSession.js';
import type { Terminal } from '../src/application/ports/Terminal.js';
import { FileSvgStore } from '../src/infrastructure/FileSvgStore.js';
import { FileRecoveryStore } from '../src/infrastructure/FileRecoveryStore.js';

class ScriptTerminal implements Terminal {
  readonly output: string[] = [];
  readonly errors: string[] = [];
  constructor(private readonly lines: string[], readonly interactive = true, readonly interrupted = false) {}
  async readLine(): Promise<string | undefined> { return this.lines.shift(); }
  writeLine(message: string): void { this.output.push(message); }
  writeError(message: string): void { this.errors.push(message); }
  close(): void {}
}

test('dirty tracking follows save, edit, undo, redo and failed IO, with no false positives from queries', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.dirty-'));
  try {
    const session = new EditorSession(new FileSvgStore());
    const cli = new Cli(session);
    assert.equal(session.dirty, false);
    await cli.execute('init');
    assert.equal(session.dirty, true);
    await cli.execute(`save "${join(directory, 'saved.svg')}"`);
    assert.equal(session.dirty, false);
    await cli.execute('create rect r 1 2 3 4');
    assert.equal(session.dirty, true);
    await cli.execute('undo');
    assert.equal(session.dirty, false);
    await cli.execute('redo');
    assert.equal(session.dirty, true);
    await cli.execute(`save "${join(directory, 'missing/x.svg')}"`);
    assert.equal(session.dirty, true);
    const revision = session.revision;
    await cli.execute('tree');
    await cli.execute('status');
    await cli.execute('show r');
    assert.equal(session.revision, revision);
    await cli.execute('canvas 900 700');
    assert.equal(session.dirty, true);
    await cli.execute(`read "${join(directory, 'saved.svg')}"`);
    assert.equal(session.dirty, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('interactive init/read/exit require explicit discard; cancellation preserves redo and document', async () => {
  const session = new EditorSession(new FileSvgStore());
  const terminal = new ScriptTerminal(['', 'no', 'discard']);
  const cli = new Cli(session, new CommandParser(), new UnsavedChangesGuard(session, terminal));
  await cli.execute('init');
  await cli.execute('create rect r 1 2 3 4');
  await cli.execute('undo');
  const before = session.document.clone();
  assert.equal((await cli.execute('init 10 20')).output[0], 'cancelled: document unchanged');
  assert.equal(session.document.sameContent(before), true);
  assert.equal((await cli.execute('redo')).error, undefined);
  assert.equal((await cli.execute('read test/fixtures/other.svg')).output[0], 'cancelled: document unchanged');
  assert.equal((await cli.execute('exit')).exitRequested, true);
  assert.equal(terminal.output.filter(line => line.startsWith('Unsaved')).length, 3);
});

test('EOF retains a recoverable draft, recovery restores it, save and explicit discard remove it', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.shell-'));
  try {
    const drafts = join(directory, 'drafts');
    const session = new EditorSession(new FileSvgStore());
    const terminal = new ScriptTerminal(['init 400 300', 'create text t 1 2 "Recover me"']);
    const cli = new Cli(session, new CommandParser(), new UnsavedChangesGuard(session, terminal));
    assert.equal(await new EditorShell(session, terminal, cli, new FileRecoveryStore(drafts)).run(), 0);
    assert.match(terminal.errors.join('\n'), /unsaved changes kept/);
    const resumed = new EditorSession(new FileSvgStore());
    const next = new ScriptTerminal([`save "${join(directory, 'saved.svg')}"`, 'exit']);
    const nextCli = new Cli(resumed, new CommandParser(), new UnsavedChangesGuard(resumed, next));
    assert.equal(await new EditorShell(resumed, next, nextCli, new FileRecoveryStore(drafts), undefined, { recover: true }).run(), 0);
    assert.equal(resumed.document.find('t').textContent, 'Recover me');
    assert.equal(resumed.dirty, false);
    assert.deepEqual((await readdir(drafts)).filter(name => !name.startsWith('._')), []);
    const discardSession = new EditorSession(new FileSvgStore());
    const discard = new ScriptTerminal(['init', 'exit', 'discard']);
    const discardCli = new Cli(discardSession, new CommandParser(), new UnsavedChangesGuard(discardSession, discard));
    await new EditorShell(discardSession, discard, discardCli, new FileRecoveryStore(drafts)).run();
    assert.deepEqual((await readdir(drafts)).filter(name => !name.startsWith('._')), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('backup failure never misreports a successful edit as a command failure, but cannot claim recovery', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.shell-'));
  try {
    const session = new EditorSession(new FileSvgStore());
    const terminal = new ScriptTerminal(['init', 'create rect r 1 2 3 4']);
    const code = await new EditorShell(session, terminal, new Cli(session), new FileRecoveryStore('package.json')).run();
    assert.equal(code, 1);
    assert.equal(session.document.count, 1);
    assert.ok(terminal.output.includes('rect#r created'));
    assert.match(terminal.errors.join('\n'), /could not be backed up/);
    assert.doesNotMatch(terminal.errors.join('\n'), /unsaved changes kept/);
    const interrupted = new ScriptTerminal(['init'], true, true);
    assert.equal(await new EditorShell(session, interrupted, new Cli(session), new FileRecoveryStore(directory)).run(), 130);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('confirmed replacement that fails preserves the old document and its undo history', async () => {
  const session = new EditorSession(new FileSvgStore());
  const terminal = new ScriptTerminal(['discard']);
  const cli = new Cli(session, new CommandParser(), new UnsavedChangesGuard(session, terminal));
  await cli.execute('init');
  await cli.execute('create rect r 1 2 3 4');
  const revision = session.revision;
  assert.match((await cli.execute('read test/fixtures/absent.svg')).error ?? '', /cannot read file/);
  assert.equal(session.document.find('r').attributes.x, '1');
  assert.equal(session.dirty, true);
  assert.equal(session.revision, revision);
  assert.equal((await cli.execute('undo')).error, undefined);
  assert.equal(session.document.count, 0);
});

test('explicit discard-on-exit bypasses recovery retention, while cancelled exit keeps editing', async () => {
  const directory = await mkdtemp(join(process.cwd(), 'test/.shell-'));
  try {
    const session = new EditorSession(new FileSvgStore());
    const terminal = new ScriptTerminal(['init', 'exit', '', 'create rect r 1 2 3 4']);
    const cli = new Cli(session, new CommandParser(), new UnsavedChangesGuard(session, terminal));
    await new EditorShell(session, terminal, cli, new FileRecoveryStore(directory), undefined, { discardOnExit: true }).run();
    assert.equal(session.document.count, 1);
    assert.deepEqual((await readdir(directory)).filter(name => !name.startsWith('._')), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
