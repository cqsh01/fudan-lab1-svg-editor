import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Rect extends GeometryShape {
  readonly type = 'rect';
  override accept(visitor: ShapeVisitor): void { visitor.rect(this); }
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ['x'], ['y'], ['width', 'height']);
  }
  override clone(): Rect {
    const copy = new Rect(this.id, this.value('x'), this.value('y'), this.value('width'), this.value('height'));
    this.copyStylesTo(copy);
    return copy;
  }
  override describe(): string {
    return this.details(`x=${this.value('x')} y=${this.value('y')} w=${this.value('width')} h=${this.value('height')}`);
  }
}
