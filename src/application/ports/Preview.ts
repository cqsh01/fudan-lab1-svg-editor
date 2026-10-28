export interface Preview {
  start(): Promise<string>;
  stop(): Promise<void>;
}
