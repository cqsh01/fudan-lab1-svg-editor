import { Command } from '../Command.js';
import { DocumentFormatter } from '../DocumentFormatter.js';
import type { EditorSession } from '../EditorSession.js';

export class TreeCommand extends Command {
  constructor(private readonly id?: string) { super(); }
  override execute(session: EditorSession): readonly string[] {
    return new DocumentFormatter().tree(session.document, this.id);
  }
}
