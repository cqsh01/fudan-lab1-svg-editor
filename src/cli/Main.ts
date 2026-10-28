#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { EditorSession } from '../application/EditorSession.js';
import { ConsoleTerminal } from '../infrastructure/ConsoleTerminal.js';
import { FileRecoveryStore } from '../infrastructure/FileRecoveryStore.js';
import { PreviewServer } from '../infrastructure/PreviewServer.js';
import { FileSvgStore } from '../infrastructure/FileSvgStore.js';
import { Cli } from './Cli.js';
import { CommandParser } from './CommandParser.js';
import { EditorShell } from './EditorShell.js';
import { LaunchHelp } from './LaunchHelp.js';
import { UnsavedChangesGuard } from './UnsavedChangesGuard.js';

/** Composition root and executable entry point. */
export class Main {
  async run(): Promise<void> {
    try {
      const { values } = parseArgs({ options: {
        help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
        preview: { type: 'boolean' }, port: { type: 'string' },
        recover: { type: 'boolean' }, 'recovery-dir': { type: 'string' }, 'discard-unsaved': { type: 'boolean' },
      } });
      const metadata = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string };
      if (values.help) { process.stdout.write(`${new LaunchHelp().render().join('\n')}\n`); return; }
      if (values.version) { process.stdout.write(`${metadata.version}\n`); return; }
      const port = values.port === undefined ? 0 : Number(values.port);
      if (values.port !== undefined && (!/^\d+$/.test(values.port) || !Number.isInteger(port) || port < 0 || port > 65535)) {
        throw new Error('port must be an integer between 0 and 65535');
      }
      if (values.port !== undefined && !values.preview) throw new Error('--port requires --preview');
      const terminal = new ConsoleTerminal();
      const session = new EditorSession(new FileSvgStore());
      const guard = terminal.interactive && !values['discard-unsaved'] ? new UnsavedChangesGuard(session, terminal) : undefined;
      const recoveryDirectory = resolve(values['recovery-dir'] ?? join(process.cwd(), '.svg-editor/recovery'));
      const recovery = terminal.interactive || values.recover ? new FileRecoveryStore(recoveryDirectory) : undefined;
      const cli = new Cli(session, new CommandParser(), guard);
      const shell = new EditorShell(session, terminal, cli, recovery, values.preview ? new PreviewServer(session, port) : undefined, {
        recover: Boolean(values.recover), discardOnExit: Boolean(values['discard-unsaved']),
        recoveryCommand: `svg-editor --recover --recovery-dir ${JSON.stringify(recoveryDirectory)}`,
      });
      const terminate = () => { process.exitCode = 143; terminal.close(); };
      process.once('SIGTERM', terminate);
      try {
        if (terminal.interactive) terminal.writeLine(`svg-editor ${metadata.version} — type 'help' for commands\n`);
        const code = await shell.run();
        if (code !== 0 && process.exitCode !== 143) process.exitCode = code;
      } finally { process.removeListener('SIGTERM', terminate); }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`error: ${message.replace(/[\r\n\u001b]/g, ' ')}\n`);
      process.exitCode = 1;
    }
  }
}

await new Main().run();
