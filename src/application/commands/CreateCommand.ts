import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';
import type { Shape } from '../../domain/Shape.js';

export class CreateCommand extends EditCommand {
  protected get action(): string { return `create ${this.shape.label}`; }
  constructor(private readonly shape: Shape, private readonly parentId?: string) { super(); }
  protected override change(document: SvgDocument): string {
    document.add(this.shape.clone(), this.parentId);
    return `${this.shape.label} created${this.parentId === undefined ? '' : ` in g#${this.parentId}`}`;
  }
}
