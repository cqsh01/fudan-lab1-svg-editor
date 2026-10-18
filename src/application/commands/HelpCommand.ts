import { Command } from '../Command.js';

export class HelpCommand extends Command {
  constructor(private readonly lines: readonly string[]) { super(); }
  override execute(): readonly string[] { return this.lines; }
}
