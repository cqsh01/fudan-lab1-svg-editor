import type { SvgDocument } from '../domain/SvgDocument.js';
import { Command } from './Command.js';
import type { EditorSession } from './EditorSession.js';

/** A command owns its mementos; failed candidates never enter the session. */
export abstract class EditCommand extends Command {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  protected abstract readonly action: string;
  protected abstract change(document: SvgDocument): string;

  override execute(session: EditorSession): readonly string[] { return session.executeEdit(this); }

  apply(session: EditorSession): readonly string[] {
    const before = session.document.clone();
    const candidate = before.clone();
    const message = this.change(candidate);
    const after = candidate.clone();
    this.before = before;
    this.after = after;
    session.restore(candidate);
    return [message];
  }
  undo(session: EditorSession): readonly string[] {
    if (!this.before) throw new Error('command has not been executed');
    session.restore(this.before.clone());
    return [`undone: ${this.action}`];
  }
  redo(session: EditorSession): readonly string[] {
    if (!this.after) throw new Error('command has not been executed');
    session.restore(this.after.clone());
    return [`redone: ${this.action}`];
  }
}
