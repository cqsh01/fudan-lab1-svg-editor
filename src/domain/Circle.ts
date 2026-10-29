import { GeometryShape } from './GeometryShape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Circle extends GeometryShape {
  readonly type = 'circle';
  override accept(visitor: ShapeVisitor): void { visitor.circle(this); }
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r }, ['cx'], ['cy'], ['r']);
  }
  override clone(): Circle {
    const copy = new Circle(this.id, this.value('cx'), this.value('cy'), this.value('r'));
    this.copyStylesTo(copy);
    return copy;
  }
  override describe(): string {
    return this.details(`cx=${this.value('cx')} cy=${this.value('cy')} r=${this.value('r')}`);
  }
}
