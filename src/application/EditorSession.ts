import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import type { EditCommand } from './EditCommand.js';
import type { SvgStore } from './ports/SvgStore.js';

export class EditorSession {
  private current: SvgDocument | undefined;
  private path: string | undefined;
  private readonly history = new CommandHistory();
  constructor(private readonly store: SvgStore) {}

  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  initialize(width: number, height: number): void {
    const next = new SvgDocument(width, height);
    this.current = next;
    this.path = undefined;
    this.history.barrier();
  }
  async read(path: string): Promise<readonly string[]> {
    const result = await this.store.read(path);
    this.current = result.document;
    this.path = path;
    this.history.barrier();
    return [...result.warnings, `read ${path} (${result.document.count} elements)`];
  }
  async save(path?: string): Promise<readonly string[]> {
    const document = this.document;
    const target = path ?? this.path;
    if (!target) throw new Error('no file path. use save <file.svg>');
    await this.store.write(target, document);
    this.path = target;
    this.history.barrier();
    return [`saved to ${target} (${document.count} elements)`];
  }
  resize(width: number, height: number): void {
    this.document.resize(width, height);
    this.history.barrier();
  }
  executeEdit(command: EditCommand): readonly string[] { return this.history.execute(command, this); }
  undo(): readonly string[] { void this.document; return this.history.undo(this); }
  redo(): readonly string[] { void this.document; return this.history.redo(this); }
  restore(document: SvgDocument): void { this.current = document; }
}
