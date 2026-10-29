import { createInterface } from 'node:readline';
import type { Interface } from 'node:readline';
import type { Terminal } from '../application/ports/Terminal.js';

/** Commands and confirmation answers share one iterator, including pasted input. */
export class ConsoleTerminal implements Terminal {
  private readonly input: Interface;
  private readonly lines: AsyncIterator<string>;
  private wasInterrupted = false;
  readonly interactive: boolean;

  constructor() {
    this.interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    this.input = createInterface({ input: process.stdin, output: process.stdout, terminal: this.interactive });
    this.lines = this.input[Symbol.asyncIterator]();
    this.input.on('SIGINT', () => { this.wasInterrupted = true; this.input.close(); });
  }
  get interrupted(): boolean { return this.wasInterrupted; }
  get columns(): number { return process.stdout.isTTY ? process.stdout.getWindowSize()[0] || 80 : 80; }
  get rows(): number { return process.stdout.isTTY ? process.stdout.getWindowSize()[1] || 24 : 24; }
  async readLine(prompt: string): Promise<string | undefined> {
    if (this.interactive) { this.input.setPrompt(prompt); this.input.prompt(); }
    const line = await this.lines.next();
    return line.done ? undefined : line.value;
  }
  writeLine(message: string): void { process.stdout.write(`${message}\n`); }
  writeError(message: string): void { process.stderr.write(`${message}\n`); }
  close(): void { this.input.close(); }
}
