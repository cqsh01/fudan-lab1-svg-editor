import type { PreviewSnapshot } from './ports/PreviewSource.js';
import type { Terminal } from './ports/Terminal.js';
import { CharacterCanvas } from './CharacterCanvas.js';
import { CharacterRenderer } from './CharacterRenderer.js';

/** A read-only layout view; cells are assumed to be roughly twice as tall as wide. */
export class TerminalView {
  constructor(private readonly terminal?: Pick<Terminal, 'columns' | 'rows'>) {}

  render(snapshot: PreviewSnapshot): readonly string[] {
    const document = snapshot.document;
    if (!document) return ["No canvas. Use 'init' or 'read' first."];
    const maxColumns = this.limit(this.terminal?.columns, 80, 120) - 2;
    const maxRows = Math.max(1, this.limit(this.terminal?.rows, 24, 46) - 6);
    const ratio = document.height / document.width / 2;
    const columns = Math.max(1, Math.min(maxColumns, Math.round(maxRows / ratio)));
    const rows = Math.max(1, Math.min(maxRows, Math.round(columns * ratio)));
    const canvas = new CharacterCanvas(document.width, document.height, columns, rows);
    new CharacterRenderer(canvas).draw(document.children);
    return [`Canvas ${document.width} x ${document.height} | ${snapshot.dirty ? 'unsaved' : 'saved'} | ${document.count} elements`,
      ...canvas.render(), 'Approximate layout; fills: . | exact SVG: --preview'];
  }
  private limit(value: number | undefined, fallback: number, maximum: number): number {
    return value !== undefined && Number.isFinite(value) ? Math.max(3, Math.min(maximum, Math.floor(value))) : fallback;
  }
}
