import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class ScaleCommand extends EditCommand {
  protected get action(): string { return `scale ${this.id}`; }
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override change(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.scale(this.factor);
    return `${shape.label} scaled by ${this.factor}`;
  }
}
