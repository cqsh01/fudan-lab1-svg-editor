import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorSession } from '../src/application/EditorSession.js';
import type { SvgStore } from '../src/application/ports/SvgStore.js';
import { CreateCommand } from '../src/application/commands/CreateCommand.js';
import { MoveCommand } from '../src/application/commands/MoveCommand.js';
import { GroupCommand } from '../src/application/commands/GroupCommand.js';
import { TreeCommand } from '../src/application/commands/TreeCommand.js';
import { CanvasCommand } from '../src/application/commands/CanvasCommand.js';
import { Rect } from '../src/domain/Rect.js';
import { Group } from '../src/domain/Group.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

class MemoryStore implements SvgStore {
  fail = false;
  saved: SvgDocument | undefined;
  async read(): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    if (this.fail) throw new Error('cannot read file: broken.svg');
    return { document: this.saved?.clone() ?? new SvgDocument(400, 300), warnings: [] };
  }
  async write(_path: string, document: SvgDocument): Promise<void> {
    if (this.fail) throw new Error('cannot write file: broken.svg');
    this.saved = document.clone();
  }
}

test('one group command is one undo unit; display does not enter history', () => {
  const session = new EditorSession(new MemoryStore());
  assert.throws(() => session.undo(), /no document/);
  session.initialize(800, 600);
  assert.throws(() => session.redo(), /undo not allowed after io command/);
  new CreateCommand(new Rect('a', 1, 2, 3, 4)).execute(session);
  new CreateCommand(new Rect('b', 2, 3, 4, 5)).execute(session);
  new GroupCommand('pair', ['b', 'a']).execute(session);
  const tree = new TreeCommand().execute(session);
  assert.match(tree.join('\n'), /g#pair/);
  session.undo();
  assert.deepEqual(session.document.children.map(shape => shape.id), ['a', 'b']);
  session.redo();
  assert.deepEqual(session.document.find('pair').children.map(shape => shape.id), ['a', 'b']);
});

test('failed edit preserves document AND redo history; new edit clears redo', () => {
  const session = new EditorSession(new MemoryStore());
  session.initialize(10, 10);
  new CreateCommand(new Rect('a', 0.1, 0, 1, 1)).execute(session);
  new MoveCommand('a', 0.2, 0).execute(session);
  session.undo();
  assert.throws(() => new CreateCommand(new Rect('a', 0, 0, 1, 1)).execute(session), /id already exists/);
  session.redo();
  assert.equal(session.document.find('a').attributes.x, String(0.1 + 0.2));
  session.undo();
  assert.equal(session.document.find('a').attributes.x, '0.1');
  new MoveCommand('a', 1, 0).execute(session);
  assert.throws(() => session.redo(), /nothing to redo/);
});

test('a failure halfway through a composite operation cannot mutate the session', () => {
  const session = new EditorSession(new MemoryStore());
  session.initialize(10, 10);
  const group = new Group('g');
  group.append(new Rect('a', 1, 0, 1, 1));
  group.append(new Rect('b', 1e308, 0, 1, 1));
  new CreateCommand(group).execute(session);
  assert.throws(() => new MoveCommand('g', 1e308, 0).execute(session), /must be finite/);
  assert.equal(session.document.find('a').attributes.x, '1');
  session.undo();
  assert.equal(session.document.count, 0);
});

test('successful IO creates a barrier; failed IO preserves history and document', async () => {
  const store = new MemoryStore();
  const session = new EditorSession(store);
  session.initialize(800, 600);
  new CreateCommand(new Rect('a', 0, 0, 1, 1)).execute(session);
  store.fail = true;
  await assert.rejects(() => session.save('broken.svg'), /cannot write file/);
  await assert.rejects(() => session.read('broken.svg'), /cannot read file/);
  session.undo();
  session.redo();
  store.fail = false;
  await session.save('good.svg');
  assert.throws(() => session.undo(), /undo not allowed after io command/);
  new MoveCommand('a', 10, 0).execute(session);
  session.undo();
  assert.equal(session.document.find('a').attributes.x, '0');
  new CanvasCommand().execute(session);
  session.redo();
  assert.equal(session.document.find('a').attributes.x, '10');
  new CanvasCommand(400, 300).execute(session);
  assert.throws(() => session.redo(), /undo not allowed/);
  await session.read('good.svg');
  assert.equal(session.document.width, 800);
  assert.throws(() => session.undo(), /undo not allowed/);
});

test('invalid resize/init/save keep state and failed edits cannot lift the IO barrier', async () => {
  const session = new EditorSession(new MemoryStore());
  session.initialize(800, 600);
  assert.throws(() => session.resize(100, -1), /positive/);
  assert.throws(() => session.initialize(-1, 100), /positive/);
  assert.throws(() => new MoveCommand('missing', 1, 1).execute(session), /no such shape/);
  assert.throws(() => session.undo(), /undo not allowed/);
  assert.equal(session.document.width, 800);
  await assert.rejects(() => session.save(), /no file path/);
});
