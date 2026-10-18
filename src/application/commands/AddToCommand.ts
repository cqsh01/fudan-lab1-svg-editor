import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class AddToCommand extends EditCommand {
  protected get action(): string { return `addto ${this.groupId} ${this.id}`; }
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override change(document: SvgDocument): string {
    document.addTo(this.groupId, this.id);
    return `${document.find(this.id).label} moved into g#${this.groupId}`;
  }
}
