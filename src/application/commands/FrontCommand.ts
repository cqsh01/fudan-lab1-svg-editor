import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class FrontCommand extends EditCommand {
  protected get action(): string { return `front ${this.id}`; }
  constructor(private readonly id: string) { super(); }
  protected override change(document: SvgDocument): string {
    document.reorder(this.id, true);
    return `${document.find(this.id).label} brought to front`;
  }
}
