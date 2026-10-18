import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class DeleteCommand extends EditCommand {
  protected get action(): string { return `delete ${this.id}`; }
  constructor(private readonly id: string) { super(); }
  protected override change(document: SvgDocument): string {
    const shape = document.delete(this.id);
    return `${shape.label} deleted`;
  }
}
