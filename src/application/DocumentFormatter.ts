import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class DocumentFormatter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.find(id);
      return [shape.describe(), ...this.branches(shape.children, '')];
    }
    return [`svg (${document.width}x${document.height})`, ...this.branches(document.children, '')];
  }
  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.find(id);
    const lines = [`${shape.label}  parent=${document.parentLabel(id)}`];
    for (const [key, value] of Object.entries(shape.attributes)) {
      if (key !== 'id') lines.push(`  ${key}=${JSON.stringify(value).replace(/^"|"$/g, '')}`);
    }
    if (shape.textContent !== undefined) lines.push(`  text=${JSON.stringify(shape.textContent)}`);
    return lines;
  }
  private branches(children: readonly Shape[], prefix: string): string[] {
    return children.flatMap((shape, index) => {
      const last = index === children.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${shape.describe()}`,
        ...this.branches(shape.children, `${prefix}${last ? '    ' : '│   '}`)];
    });
  }
}
