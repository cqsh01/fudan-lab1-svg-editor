import type { EditorSession } from './EditorSession.js';

export abstract class Command {
  get replacesDocument(): boolean { return false; }
  get endsSession(): boolean { return false; }
  abstract execute(session: EditorSession): readonly string[] | Promise<readonly string[]>;
}
