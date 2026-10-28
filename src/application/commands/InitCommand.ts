import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

export class InitCommand extends Command {
  override get replacesDocument(): boolean { return true; }
  constructor(private readonly width: number, private readonly height: number) { super(); }
  override execute(session: EditorSession): readonly string[] {
    session.initialize(this.width, this.height);
    return [`canvas ${this.width}x${this.height} created`];
  }
}
