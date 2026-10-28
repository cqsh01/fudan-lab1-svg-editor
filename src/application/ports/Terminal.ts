export interface Terminal {
  readonly interactive: boolean;
  readonly interrupted: boolean;
  readLine(prompt: string): Promise<string | undefined>;
  writeLine(message: string): void;
  writeError(message: string): void;
  close(): void;
}
