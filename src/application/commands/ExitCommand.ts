import { Command } from '../Command.js';

export class ExitCommand extends Command {
  override get endsSession(): boolean { return true; }
  override execute(): readonly string[] { return []; }
}
