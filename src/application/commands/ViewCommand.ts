import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { TerminalView } from '../TerminalView.js';

export class ViewCommand extends Command {
  constructor(private readonly view: TerminalView) { super(); }
  override execute(session: EditorSession): readonly string[] { return this.view.render(session.previewSnapshot()); }
}
