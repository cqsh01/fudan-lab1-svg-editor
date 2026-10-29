export interface Terminal {
  readonly interactive: boolean;
  readonly interrupted: boolean;
  readonly columns?: number;
  readonly rows?: number;
  readLine(prompt: string): Promise<string | undefined>;
  writeLine(message: string): void;
  writeError(message: string): void;
  close(): void;
}
