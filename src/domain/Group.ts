import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';
import type { ShapeVisitor } from './ShapeVisitor.js';

export class Group extends Shape {
  readonly type = 'g';
  override accept(visitor: ShapeVisitor): void { visitor.group(this); }
  private readonly items: Shape[] = [];
  constructor(id: string) { super(id); }
  override get children(): readonly Shape[] { return [...this.items]; }
  override asContainer(): Group { return this; }

  insert(index: number, shape: Shape): void {
    if (shape === this || Group.contains(shape, this)) {
      throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    }
    if (this.items.includes(shape)) throw new Error(`shape already in container: ${shape.id}`);
    this.items.splice(index, 0, shape);
  }
  append(shape: Shape): void { this.insert(this.items.length, shape); }
  remove(shape: Shape): number {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new Error(`shape not in container: ${shape.id}`);
    this.items.splice(index, 1);
    return index;
  }
  override move(dx: number, dy: number): void {
    Numbers.finite(dx, 'dx');
    Numbers.finite(dy, 'dy');
    for (const child of this.items) child.move(dx, dy);
  }
  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    for (const child of this.items) child.scale(factor);
  }
  override clone(): Group {
    const copy = new Group(this.id);
    this.copyStylesTo(copy);
    for (const child of this.items) copy.append(child.clone());
    return copy;
  }
  override describe(): string {
    return `${this.label}${this.styleSummary() ? `  ${this.styleSummary()}` : ''}`;
  }
  static contains(ancestor: Shape, target: Shape): boolean {
    return ancestor.children.some(child => child === target || Group.contains(child, target));
  }
}
