import { Numbers } from './Numbers.js';
import type { Group } from './Group.js';

/** The common component protocol. Attributes are exposed as defensive copies. */
export abstract class Shape {
  private readonly identifier: string;
  private readonly styles = new Map<string, string>();
  abstract readonly type: string;

  protected constructor(id: string) {
    Shape.validateText(id);
    if (!id || /\s/.test(id)) throw new Error('id must be non-empty and contain no whitespace');
    this.identifier = id;
  }

  get id(): string { return this.identifier; }
  get label(): string { return `${this.type}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get textContent(): string | undefined { return undefined; }
  get creationStyle(): string | undefined { return undefined; }
  get attributes(): Readonly<Record<string, string>> {
    return { id: this.id, ...Object.fromEntries(this.styles) };
  }

  asContainer(): Group { throw new Error(`not a container: ${this.id}`); }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract describe(): string;

  set(attribute: string, value: string): void {
    if (!['fill', 'stroke', 'stroke-width'].includes(attribute)) {
      throw new Error(`unknown attribute: ${attribute}`);
    }
    Shape.validateText(value);
    if (!value.trim()) throw new Error(`${attribute} must not be empty`);
    if (attribute === 'stroke-width') {
      value = Numbers.format(Numbers.nonnegative(Numbers.parse(value, attribute), attribute));
    }
    this.styles.set(attribute, value);
  }

  protected copyStylesTo(target: Shape): void {
    for (const [key, value] of this.styles) target.set(key, value);
  }

  protected styleSummary(): string {
    return [...this.styles].map(([key, value]) => `${key}=${JSON.stringify(value).replace(/^"|"$/g, '')}`).join(' ');
  }

  static validateText(value: string): void {
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFF\u{10000}-\u{10FFFF}]/u.test(value)) {
      throw new Error('text contains invalid XML characters');
    }
  }
}
