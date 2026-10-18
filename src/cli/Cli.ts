import type { EditorSession } from '../application/EditorSession.js';
import { CommandParser } from './CommandParser.js';

export class Cli {
  constructor(private readonly session: EditorSession, private readonly parser = new CommandParser()) {}

  async execute(line: string): Promise<{ output: readonly string[]; error?: string }> {
    try {
      const command = this.parser.parse(line);
      return { output: command ? await command.execute(this.session) : [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: [], error: `error: ${message.replace(/[\r\n\u001b]/g, ' ')}` };
    }
  }
}
