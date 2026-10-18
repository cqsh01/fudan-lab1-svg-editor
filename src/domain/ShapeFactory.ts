import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

/** The only shape-name dispatch point; registry becomes a plugin slot in Phase 2. */
export class ShapeFactory {
  private readonly constructors = new Map<string, (id: string) => Shape>([
    ['rect', id => new Rect(id, 0, 0, 0, 0)],
    ['circle', id => new Circle(id, 0, 0, 0)],
    ['ellipse', id => new Ellipse(id, 0, 0, 0, 0)],
    ['line', id => new Line(id, 0, 0, 0, 0)],
    ['text', id => new Text(id, 0, 0, '')],
    ['g', id => new Group(id)],
  ]);
  create(type: string, id: string): Shape {
    const construct = this.constructors.get(type);
    if (!construct) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return construct(id);
  }
  /** Attribute order defines the CLI geometry schema, without another tag dispatch. */
  geometryOf(shape: Shape): readonly string[] {
    return Object.keys(shape.attributes).filter(key => key !== 'id');
  }
}
