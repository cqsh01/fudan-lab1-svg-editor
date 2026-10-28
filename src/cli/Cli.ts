import type { EditorSession } from '../application/EditorSession.js';
import { CommandParser } from './CommandParser.js';
import type { UnsavedChangesGuard } from './UnsavedChangesGuard.js';

export class Cli {
  constructor(private readonly session: EditorSession, private readonly parser = new CommandParser(), private readonly guard?: UnsavedChangesGuard) {}

  async execute(line: string): Promise<{ output: readonly string[]; error?: string; exitRequested?: boolean }> {
    try {
      const command = this.parser.parse(line);
      if (!command) return { output: [] };
      if (this.guard && !await this.guard.allow(command)) return { output: ['cancelled: document unchanged'] };
      const output = await command.execute(this.session);
      return command.endsSession ? { output, exitRequested: true } : { output };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: [], error: `error: ${message.replace(/[\r\n\u001b]/g, ' ')}` };
    }
  }
}
