import { createInterface } from 'node:readline';
import { EditorSession } from '../application/EditorSession.js';
import { FileSvgStore } from '../infrastructure/FileSvgStore.js';
import { Cli } from './Cli.js';

/** Composition root: the only CLI class aware of the filesystem adapter. */
export class Main {
  async run(): Promise<void> {
    const cli = new Cli(new EditorSession(new FileSvgStore()));
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const input = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
    if (interactive) {
      process.stdout.write("svg-editor 0.1 — type 'help' for commands\n\n");
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
