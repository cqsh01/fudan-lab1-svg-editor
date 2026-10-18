import type { EditCommand } from './EditCommand.js';
import type { EditorSession } from './EditorSession.js';

export class CommandHistory {
  private readonly past: EditCommand[] = [];
  private readonly future: EditCommand[] = [];
  private blocked = false;

  execute(command: EditCommand, session: EditorSession): readonly string[] {
    const output = command.apply(session);
    this.past.push(command);
    this.future.length = 0;
    this.blocked = false;
    return output;
  }
  undo(session: EditorSession): readonly string[] {
    this.assertAllowed();
    const command = this.past.at(-1);
    if (!command) throw new Error('nothing to undo');
    const output = command.undo(session);
    this.past.pop();
    this.future.push(command);
    return output;
  }
  redo(session: EditorSession): readonly string[] {
    this.assertAllowed();
    const command = this.future.at(-1);
    if (!command) throw new Error('nothing to redo');
    const output = command.redo(session);
    this.future.pop();
    this.past.push(command);
    return output;
  }
  barrier(): void {
    this.past.length = 0;
    this.future.length = 0;
    this.blocked = true;
  }
  private assertAllowed(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
