import type { SvgDocument } from '../../domain/SvgDocument.js';

export interface PreviewSnapshot {
  readonly document: SvgDocument | undefined;
  readonly filePath: string | undefined;
  readonly dirty: boolean;
  readonly revision: number;
}

export interface PreviewSource {
  previewSnapshot(): PreviewSnapshot;
}
