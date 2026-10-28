import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

export class StatusCommand extends Command {
  override execute(session: EditorSession): readonly string[] {
    const document = session.document;
    return [`canvas ${document.width}x${document.height} (${document.count} elements)`,
      `state: ${session.dirty ? 'unsaved' : 'saved'}`, `file: ${JSON.stringify(session.filePath ?? '(not saved)')}`];
  }
}
