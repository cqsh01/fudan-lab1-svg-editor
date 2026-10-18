import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export abstract class GeometryShape extends Shape {
  private readonly geometry: Map<string, number>;
  private readonly horizontal: readonly string[];
  private readonly vertical: readonly string[];
  private readonly dimensions: readonly string[];

  protected constructor(id: string, geometry: Record<string, number>, horizontal: readonly string[],
    vertical: readonly string[], dimensions: readonly string[]) {
    super(id);
    this.geometry = new Map();
    this.horizontal = horizontal;
    this.vertical = vertical;
    this.dimensions = dimensions;
    for (const [key, value] of Object.entries(geometry)) this.write(key, value);
  }

  protected value(key: string): number { return this.geometry.get(key)!; }

  override get attributes(): Readonly<Record<string, string>> {
    return { ...super.attributes, ...Object.fromEntries([...this.geometry].map(([key, value]) => [key, Numbers.format(value)])) };
  }

  override set(attribute: string, value: string): void {
    if (this.geometry.has(attribute)) this.write(attribute, Numbers.parse(value, attribute));
    else super.set(attribute, value);
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx, 'dx');
    Numbers.finite(dy, 'dy');
    const changes = [...this.horizontal.map(key => [key, this.value(key) + dx] as const),
      ...this.vertical.map(key => [key, this.value(key) + dy] as const)];
    for (const [key, value] of changes) Numbers.finite(value, key);
    for (const [key, value] of changes) this.write(key, value);
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    const changes = [...this.geometry].map(([key, value]) => [key, value * factor] as const);
    for (const [key, value] of changes) Numbers.finite(value, key);
    for (const [key, value] of changes) this.write(key, value);
  }

  protected details(geometry: string): string {
    return `${this.label}  ${geometry}${this.styleSummary() ? ` ${this.styleSummary()}` : ''}`;
  }

  private write(key: string, value: number): void {
    if (this.dimensions.includes(key)) Numbers.nonnegative(value, key);
    this.geometry.set(key, Numbers.finite(value, key));
  }
}
