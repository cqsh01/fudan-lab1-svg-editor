import type { Rect } from './Rect.js';
import type { Circle } from './Circle.js';
import type { Ellipse } from './Ellipse.js';
import type { Line } from './Line.js';
import type { Text } from './Text.js';
import type { Group } from './Group.js';

/** Read-only operations use polymorphism instead of another type-name registry. */
export interface ShapeVisitor {
  rect(shape: Rect): void;
  circle(shape: Circle): void;
  ellipse(shape: Ellipse): void;
  line(shape: Line): void;
  text(shape: Text): void;
  group(shape: Group): void;
}
