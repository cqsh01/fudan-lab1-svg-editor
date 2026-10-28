import type { SvgDocument } from '../../domain/SvgDocument.js';

export interface RecoveryStore {
  readonly location: string;
  save(document: SvgDocument, originalPath?: string): Promise<void>;
  recoverLatest(): Promise<{ document: SvgDocument; originalPath?: string }>;
  clear(): Promise<void>;
}
