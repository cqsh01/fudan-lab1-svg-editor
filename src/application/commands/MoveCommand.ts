import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class MoveCommand extends EditCommand {
  protected get action(): string { return `move ${this.id}`; }
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  protected override change(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.move(this.dx, this.dy);
    return `${shape.label} moved by (${this.dx},${this.dy})`;
  }
}
