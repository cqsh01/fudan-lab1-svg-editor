import type { ShapeVisitor } from '../domain/ShapeVisitor.js';
import type { Shape } from '../domain/Shape.js';
import type { Rect } from '../domain/Rect.js';
import type { Circle } from '../domain/Circle.js';
import type { Ellipse } from '../domain/Ellipse.js';
import type { Line } from '../domain/Line.js';
import type { Text } from '../domain/Text.js';
import type { Group } from '../domain/Group.js';
import type { CharacterCanvas } from './CharacterCanvas.js';

/** Visitor preserves composite order and inherited paint without inspecting type names. */
export class CharacterRenderer implements ShapeVisitor {
  private readonly defaults: Readonly<Record<string, string>> = { fill: 'black', stroke: 'none', 'stroke-width': '1' };
  private style = this.defaults;
  constructor(private readonly canvas: CharacterCanvas) {}

  draw(shapes: readonly Shape[]): void {
    for (const shape of shapes) {
      const parent = this.style;
      const inherited = { ...parent };
      const attributes = shape.attributes;
      for (const key of Object.keys(this.defaults)) {
        const value = attributes[key]?.trim().toLowerCase();
        if (value !== undefined && value !== 'inherit' && value !== 'unset') inherited[key] = value === 'initial' ? this.defaults[key]! : value;
      }
      this.style = inherited;
      try { shape.accept(this); } finally { this.style = parent; }
    }
  }
  rect(shape: Rect): void {
    const a = shape.attributes;
    this.canvas.rectangle(Number(a.x), Number(a.y), Number(a.width), Number(a.height), this.visible('fill'), this.stroke());
  }
  circle(shape: Circle): void {
    const a = shape.attributes;
    this.canvas.ellipse(Number(a.cx), Number(a.cy), Number(a.r), Number(a.r), this.visible('fill'), this.stroke());
  }
  ellipse(shape: Ellipse): void {
    const a = shape.attributes;
    this.canvas.ellipse(Number(a.cx), Number(a.cy), Number(a.rx), Number(a.ry), this.visible('fill'), this.stroke());
  }
  line(shape: Line): void {
    const a = shape.attributes;
    if (this.stroke()) this.canvas.line(Number(a.x1), Number(a.y1), Number(a.x2), Number(a.y2));
  }
  text(shape: Text): void {
    const a = shape.attributes;
    if (this.visible('fill') || this.stroke()) this.canvas.text(Number(a.x), Number(a.y), shape.textContent);
  }
  group(shape: Group): void { this.draw(shape.children); }

  private visible(attribute: string): boolean {
    const value = this.style[attribute]?.trim().toLowerCase();
    return value !== 'none' && value !== 'transparent';
  }
  private stroke(): boolean { return this.visible('stroke') && Number(this.style['stroke-width']) > 0; }
}
