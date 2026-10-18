import type { EditorSession } from './EditorSession.js';

export abstract class Command {
  abstract execute(session: EditorSession): readonly string[] | Promise<readonly string[]>;
}
