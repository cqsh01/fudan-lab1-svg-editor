import type { EditorSession } from '../application/EditorSession.js';
import type { Preview } from '../application/ports/Preview.js';
import type { RecoveryStore } from '../application/ports/RecoveryStore.js';
import type { Terminal } from '../application/ports/Terminal.js';
import type { Cli } from './Cli.js';

interface ShellOptions {
  readonly recover?: boolean;
  readonly discardOnExit?: boolean;
  readonly recoveryCommand?: string;
}

/** Terminal workflow; state changes stay in commands and the application session. */
export class EditorShell {
  private checkpointRevision = -1;
  private backedUp = false;
  constructor(private readonly session: EditorSession, private readonly terminal: Terminal,
    private readonly cli: Cli, private readonly recovery?: RecoveryStore, private readonly preview?: Preview,
    private readonly options: ShellOptions = {}) {}

  async run(): Promise<number> {
    try {
      if (this.options.recover) {
        if (!this.recovery) throw new Error('recovery store is unavailable');
        const draft = await this.recovery.recoverLatest();
        this.session.recover(draft.document, draft.originalPath);
        await this.checkpoint();
        this.terminal.writeLine('recovered unsaved document; use save to keep your work');
      }
      if (this.preview) {
        const address = `preview: ${await this.preview.start()}`;
        if (this.terminal.interactive) this.terminal.writeLine(address);
        else this.terminal.writeError(address);
      }
      let code = 0;
      while (true) {
        const line = await this.terminal.readLine('svg> ');
        if (line === undefined) break;
        const result = await this.cli.execute(line);
        await this.checkpoint();
        for (const message of result.output) this.terminal.writeLine(message);
        if (result.error) {
          this.terminal.writeError(result.error);
          if (!this.terminal.interactive) code = 1;
        }
        if (result.exitRequested) {
          if (!await this.clearDraft()) code = 1;
          return code;
        }
      }
      if (this.options.discardOnExit) {
        if (!await this.clearDraft()) code = 1;
      } else if (this.session.dirty && this.recovery) {
        if (await this.checkpoint()) {
          this.terminal.writeError(`warning: unsaved changes kept in ${JSON.stringify(this.recovery.location)}`);
          this.terminal.writeError(`recover with: ${this.options.recoveryCommand ?? 'svg-editor --recover'}`);
        } else {
          this.terminal.writeError('warning: unsaved changes could not be backed up');
          code = 1;
        }
      }
      return this.terminal.interrupted ? 130 : code;
    } finally {
      await this.preview?.stop();
      this.terminal.close();
    }
  }

  private async checkpoint(): Promise<boolean> {
    if (!this.recovery) return true;
    if (this.checkpointRevision === this.session.revision) return !this.session.dirty || this.backedUp;
    try {
      if (this.session.dirty) await this.recovery.save(this.session.document, this.session.filePath);
      else await this.recovery.clear();
      this.backedUp = this.session.dirty;
      this.checkpointRevision = this.session.revision;
      return true;
    } catch (error) {
      this.terminal.writeError(`warning: recovery unavailable: ${this.message(error)}`);
      return false;
    }
  }
  private async clearDraft(): Promise<boolean> {
    try { await this.recovery?.clear(); this.backedUp = false; return true; }
    catch (error) {
      this.terminal.writeError(`warning: cannot remove recovery draft: ${this.message(error)}`);
      return false;
    }
  }
  private message(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).replace(/[\r\n\u001b]/g, ' ');
  }
}
