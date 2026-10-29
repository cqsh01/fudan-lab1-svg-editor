import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Ellipse extends GeometryShape {
  readonly type = 'ellipse';
  override accept(visitor: ShapeVisitor): void { visitor.ellipse(this); }
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry }, ['cx'], ['cy'], ['rx', 'ry']);
  }
  override clone(): Ellipse {
    const copy = new Ellipse(this.id, this.value('cx'), this.value('cy'), this.value('rx'), this.value('ry'));
    this.copyStylesTo(copy);
    return copy;
  }
  override describe(): string {
    return this.details(`cx=${this.value('cx')} cy=${this.value('cy')} rx=${this.value('rx')} ry=${this.value('ry')}`);
  }
}
