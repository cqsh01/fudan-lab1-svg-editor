import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

export class RedoCommand extends Command {
  override execute(session: EditorSession): readonly string[] { return session.redo(); }
}
