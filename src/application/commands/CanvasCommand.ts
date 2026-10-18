import { Command } from '../Command.js';
import type { EditorSession } from '../EditorSession.js';

export class CanvasCommand extends Command {
  constructor(private readonly width?: number, private readonly height?: number) { super(); }
  override execute(session: EditorSession): readonly string[] {
    if (this.width !== undefined && this.height !== undefined) {
      session.resize(this.width, this.height);
      return [`canvas resized to ${this.width}x${this.height}`];
    }
    return [`canvas ${session.document.width}x${session.document.height}`];
  }
}
