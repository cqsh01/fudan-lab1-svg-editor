import { GeometryShape } from './GeometryShape.js';
import { Shape } from './Shape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Text extends GeometryShape {
  readonly type = 'text';
  override accept(visitor: ShapeVisitor): void { visitor.text(this); }
  override get creationStyle(): undefined { return undefined; }
  private content: string;
  constructor(id: string, x: number, y: number, content: string) {
    super(id, { x, y }, ['x'], ['y'], []);
    Shape.validateText(content);
    this.content = content;
  }
  override get textContent(): string { return this.content; }
  override set(attribute: string, value: string): void {
    if (attribute === 'text') {
      Shape.validateText(value);
      this.content = value;
    } else super.set(attribute, value);
  }
  override clone(): Text {
    const copy = new Text(this.id, this.value('x'), this.value('y'), this.content);
    this.copyStylesTo(copy);
    return copy;
  }
  override describe(): string {
    return this.details(`(${this.value('x')},${this.value('y')}) ${JSON.stringify(this.content)}`);
  }
}
