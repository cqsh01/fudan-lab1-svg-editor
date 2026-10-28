#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { EditorSession } from '../application/EditorSession.js';
import { FileSvgStore } from '../infrastructure/FileSvgStore.js';
import { Cli } from './Cli.js';
import { LaunchHelp } from './LaunchHelp.js';

/** Composition root and executable entry point. */
export class Main {
  async run(): Promise<void> {
    try {
      const { values } = parseArgs({ options: {
        help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
      } });
      const metadata = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string };
      if (values.help) { process.stdout.write(`${new LaunchHelp().render().join('\n')}\n`); return; }
      if (values.version) { process.stdout.write(`${metadata.version}\n`); return; }
      await this.edit(metadata.version);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`error: ${message.replace(/[\r\n\u001b]/g, ' ')}\n`);
      process.exitCode = 1;
    }
  }
  private async edit(version: string): Promise<void> {
    const cli = new Cli(new EditorSession(new FileSvgStore()));
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
    if (interactive) {
      process.stdout.write(`svg-editor ${version} — type 'help' for commands\n\n`);
      input.setPrompt('svg> ');
      input.prompt();
    }
    for await (const line of input) {
      const result = await cli.execute(line);
      for (const message of result.output) process.stdout.write(`${message}\n`);
      if (result.error) {
        process.stderr.write(`${result.error}\n`);
        if (!interactive) process.exitCode = 1;
      }
      if (interactive) input.prompt();
    }
  }
}

await new Main().run();
