import { Numbers } from '../domain/Numbers.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import type { Command } from '../application/Command.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { ExitCommand } from '../application/commands/ExitCommand.js';
import { StatusCommand } from '../application/commands/StatusCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { RedoCommand } from '../application/commands/RedoCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import { UndoCommand } from '../application/commands/UndoCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import type { Token } from './Token.js';
import { Tokenizer } from './Tokenizer.js';

interface CommandDefinition {
  readonly syntax: string;
  readonly build: (args: readonly Token[]) => Command;
}

/** The only command-name dispatch. The registry also supplies help, avoiding drift. */
export class CommandParser {
  private readonly definitions = new Map<string, CommandDefinition>();
  constructor(private readonly factory = new ShapeFactory(), private readonly tokenizer = new Tokenizer()) {
    this.register('init', 'init [w] [h]', args => {
      this.arity(args, 0, 2, 'init [w] [h]');
      return new InitCommand(this.number(args, 0, 'width', 800), this.number(args, 1, 'height', 600));
    });
    this.register('read', 'read <file.svg>', args => {
      this.arity(args, 1, 1, 'read <file.svg>');
      return new ReadCommand(args[0]!.value);
    });
    this.register('save', 'save [file.svg]', args => {
      this.arity(args, 0, 1, 'save [file.svg]');
      return new SaveCommand(args[0]?.value);
    });
    this.register('canvas', 'canvas [w h]', args => {
      if (args.length !== 0 && args.length !== 2) throw new Error('usage: canvas [w h]');
      return args.length ? new CanvasCommand(this.number(args, 0, 'width'), this.number(args, 1, 'height')) : new CanvasCommand();
    });
    this.register('create', 'create <type> <id> [params...] [in <containerId>]', args => this.create(args));
    this.register('delete', 'delete <id>', args => {
      this.arity(args, 1, 1, 'delete <id>');
      return new DeleteCommand(args[0]!.value);
    });
    this.register('move', 'move <id> <dx> <dy>', args => {
      this.arity(args, 3, 3, 'move <id> <dx> <dy>');
      return new MoveCommand(args[0]!.value, this.number(args, 1, 'dx'), this.number(args, 2, 'dy'));
    });
    this.register('scale', 'scale <id> <factor>', args => {
      this.arity(args, 2, 2, 'scale <id> <factor>');
      return new ScaleCommand(args[0]!.value, this.number(args, 1, 'scale factor'));
    });
    this.register('set', 'set <id> <attr> <value>', args => {
      this.arity(args, 3, 3, 'set <id> <attr> <value>');
      return new SetCommand(args[0]!.value, args[1]!.value, args[2]!.value);
    });
    this.register('group', 'group <newGid> <id1> [id2...]', args => {
      this.arity(args, 2, Number.POSITIVE_INFINITY, 'group <newGid> <id1> [id2...]');
      return new GroupCommand(args[0]!.value, args.slice(1).map(arg => arg.value));
    });
    this.register('ungroup', 'ungroup <gid>', args => {
      this.arity(args, 1, 1, 'ungroup <gid>');
      return new UngroupCommand(args[0]!.value);
    });
    this.register('addto', 'addto <gid> <id>', args => {
      this.arity(args, 2, 2, 'addto <gid> <id>');
      return new AddToCommand(args[0]!.value, args[1]!.value);
    });
    this.register('front', 'front <id>', args => {
      this.arity(args, 1, 1, 'front <id>');
      return new FrontCommand(args[0]!.value);
    });
    this.register('back', 'back <id>', args => {
      this.arity(args, 1, 1, 'back <id>');
      return new BackCommand(args[0]!.value);
    });
    this.register('tree', 'tree [id]', args => {
      this.arity(args, 0, 1, 'tree [id]');
      return new TreeCommand(args[0]?.value);
    });
    this.register('show', 'show <id>', args => {
      this.arity(args, 1, 1, 'show <id>');
      return new ShowCommand(args[0]!.value);
    });
    this.register('undo', 'undo', args => {
      this.arity(args, 0, 0, 'undo');
      return new UndoCommand();
    });
    this.register('redo', 'redo', args => {
      this.arity(args, 0, 0, 'redo');
      return new RedoCommand();
    });
    this.register('status', 'status', args => {
      this.arity(args, 0, 0, 'status');
      return new StatusCommand();
    });
    this.register('exit', 'exit', args => {
      this.arity(args, 0, 0, 'exit');
      return new ExitCommand();
    });
    this.register('help', 'help', args => {
      this.arity(args, 0, 0, 'help');
      return new HelpCommand(this.help());
    });
  }
  parse(line: string): Command | undefined {
    const tokens = this.tokenizer.tokenize(line);
    const name = tokens[0]?.value;
    if (name === undefined) return undefined;
    const definition = this.definitions.get(name);
    if (!definition) throw new Error(`unknown command: ${name}. type 'help' for commands`);
    return definition.build(tokens.slice(1));
  }
  private register(name: string, syntax: string, build: CommandDefinition['build']): void {
    this.definitions.set(name, { syntax, build });
  }
  private help(): readonly string[] {
    return ['SVG Editor · Commands', '', ...[...this.definitions.values()].map(definition => `  ${definition.syntax}`), '',
      'Create parameters:', '  rect     <x> <y> <w> <h> [fill]', '  circle   <cx> <cy> <r> [fill]',
      '  ellipse  <cx> <cy> <rx> <ry> [fill]', '  line     <x1> <y1> <x2> <y2> [stroke]',
      '  text     <x> <y> "content"', '  g        (empty container)', '',
      'Set: fill / stroke / stroke-width, own geometry, text content.',
      'Quotes: \\" / \\\\ / \\n / \\t / \\r. A line starting with # is a comment.',
      'IO commands clear history; canvas without arguments only displays size.', 'Use status to inspect unsaved changes. Use exit to close, or Ctrl+D to keep a recovery draft.'];
  }
  private create(input: readonly Token[]): CreateCommand {
    const syntax = 'create <type> <id> [params...] [in <containerId>]';
    this.arity(input, 2, Number.POSITIVE_INFINITY, syntax);
    const shape = this.factory.create(input[0]!.value, input[1]!.value);
    let parameters = input.slice(2);
    let parentId: string | undefined;
    const marker = parameters.at(-2);
    if (marker?.value === 'in' && !marker.quoted) {
      parentId = parameters.at(-1)!.value;
      parameters = parameters.slice(0, -2);
    }
    const geometry = this.factory.geometryOf(shape);
    const required = geometry.length + (shape.textContent !== undefined ? 1 : 0);
    const style = shape.creationStyle;
    this.arity(parameters, required, required + (style === undefined ? 0 : 1), syntax);
    geometry.forEach((attribute, index) => shape.set(attribute, parameters[index]!.value));
    if (shape.textContent !== undefined) shape.set('text', parameters[geometry.length]!.value);
    if (style !== undefined && parameters[required]) shape.set(style, parameters[required]!.value);
    return new CreateCommand(shape, parentId);
  }
  private arity(args: readonly Token[], min: number, max: number, syntax: string): void {
    if (args.length < min || args.length > max) throw new Error(`usage: ${syntax}`);
  }
  private number(args: readonly Token[], index: number, name: string, fallback?: number): number {
    const value = args[index]?.value;
    if (value === undefined && fallback !== undefined) return fallback;
    return Numbers.parse(value!, name);
  }
}
