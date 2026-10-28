import type { Command } from '../application/Command.js';
import type { EditorSession } from '../application/EditorSession.js';
import type { Terminal } from '../application/ports/Terminal.js';

export class UnsavedChangesGuard {
  constructor(private readonly session: EditorSession, private readonly terminal: Terminal) {}

  async allow(command: Command): Promise<boolean> {
    if (!this.session.dirty || (!command.replacesDocument && !command.endsSession)) return true;
    this.terminal.writeLine("Unsaved changes. Run 'save <file.svg>' to keep your work.");
    const answer = await this.terminal.readLine("Type 'discard' to continue, or press Enter to cancel: ");
    return answer?.trim().toLowerCase() === 'discard';
  }
}
