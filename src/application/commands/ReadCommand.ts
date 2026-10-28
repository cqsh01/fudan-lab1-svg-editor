import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

export class ReadCommand extends Command {
  override get replacesDocument(): boolean { return true; }
  constructor(private readonly path: string) { super(); }
  override execute(session: EditorSession): Promise<readonly string[]> { return session.read(this.path); }
}
