import { Command } from '../Command.js';
import { DocumentFormatter } from '../DocumentFormatter.js';
import type { EditorSession } from '../EditorSession.js';

export class ShowCommand extends Command {
  constructor(private readonly id: string) { super(); }
  override execute(session: EditorSession): readonly string[] {
    return new DocumentFormatter().show(session.document, this.id);
  }
}
