import { TerminalText } from './TerminalText.js';

/** Bounded cell raster, with clipping and opaque paint in SVG document order. */
export class CharacterCanvas {
  private readonly cells: string[][];
  private readonly textLayout = new TerminalText();
  constructor(private readonly width: number, private readonly height: number,
    private readonly columns: number, private readonly rows: number) {
    this.cells = Array.from({ length: rows }, () => Array<string>(columns).fill(' '));
  }

  rectangle(x: number, y: number, width: number, height: number, filled: boolean, outlined: boolean): void {
    if (width === 0 || height === 0 || !filled && !outlined) return;
    const left = Math.round(this.coordinate(x, this.width, this.columns));
    const right = Math.round(this.coordinate(x + width, this.width, this.columns));
    const top = Math.round(this.coordinate(y, this.height, this.rows));
    const bottom = Math.round(this.coordinate(y + height, this.height, this.rows));
    for (let row = Math.max(0, top); row <= Math.min(this.rows - 1, bottom); row++) {
      for (let column = Math.max(0, left); column <= Math.min(this.columns - 1, right); column++) {
        const vertical = column === left || column === right;
        const horizontal = row === top || row === bottom;
        if (vertical || horizontal) this.put(column, row, vertical && horizontal ? '+' : vertical ? '|' : '-');
        else if (filled) this.put(column, row, '.');
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, filled: boolean, outlined: boolean): void {
    if (rx === 0 || ry === 0 || !filled && !outlined) return;
    const dx = this.width / this.columns / 2;
    const dy = this.height / this.rows / 2;
    this.paint((px, py) => {
      const x = px - cx;
      const y = py - cy;
      if (Math.hypot(x / (rx + dx), y / (ry + dy)) > 1) return;
      const inside = rx > dx && ry > dy && Math.hypot(x / (rx - dx), y / (ry - dy)) < 1;
      if (inside) return filled ? '.' : undefined;
      const nx = x / rx;
      const ny = y / ry;
      if (Math.abs(nx) > Math.abs(ny) * 2) return '|';
      if (Math.abs(ny) > Math.abs(nx) * 2) return '-';
      return nx * ny > 0 ? '\\' : '/';
    });
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    // Saturation bounds intermediate arithmetic even for extreme finite SVG coordinates.
    const ax = this.coordinate(x1, this.width, this.columns);
    const ay = this.coordinate(y1, this.height, this.rows);
    const bx = this.coordinate(x2, this.width, this.columns);
    const by = this.coordinate(y2, this.height, this.rows);
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const ux = dx / length;
    const uy = dy / length;
    const glyph = Math.abs(dx) > Math.abs(dy) * 2 ? '-' : Math.abs(dy) > Math.abs(dx) * 2 ? '|' : dx * dy > 0 ? '\\' : '/';
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        const projection = Math.max(0, Math.min(length, (column - ax) * ux + (row - ay) * uy));
        if (Math.hypot(column - ax - projection * ux, row - ay - projection * uy) <= 0.7) this.put(column, row, glyph);
      }
    }
  }

  text(x: number, y: number, content: string): void {
    let column = Math.round(this.coordinate(x, this.width, this.columns));
    // Text y is a baseline. One terminal row approximates the default SVG font.
    const row = Math.floor(y / this.height * this.rows) - 1;
    if (row < 0 || row >= this.rows) return;
    for (const glyph of this.textLayout.glyphs(content.replace(/\s+/gu, ' '))) {
      if (column >= 0 && column + glyph.width <= this.columns) this.put(column, row, glyph.text, glyph.width);
      column += glyph.width;
      if (column >= this.columns) break;
    }
  }

  render(): readonly string[] {
    const border = `+${'-'.repeat(this.columns)}+`;
    return [border, ...this.cells.map(row => `|${row.join('')}|`), border];
  }

  private paint(sample: (x: number, y: number) => string | undefined): void {
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        const glyph = sample((column + 0.5) / this.columns * this.width, (row + 0.5) / this.rows * this.height);
        if (glyph !== undefined) this.put(column, row, glyph);
      }
    }
  }
  private put(column: number, row: number, glyph: string, width = 1): void {
    const cells = this.cells[row]!;
    // Repainting either half of a wide label clears the complete previous glyph.
    for (let index = column; index < column + width; index++) {
      if (cells[index] === '') cells[index - 1] = ' ';
      if (cells[index + 1] === '') cells[index + 1] = ' ';
      cells[index] = ' ';
    }
    cells[column] = glyph;
    if (width === 2) cells[column + 1] = '';
  }
  private coordinate(value: number, extent: number, cells: number): number {
    return Math.max(-1e12, Math.min(1e12, value / extent * cells - 0.5));
  }
}
