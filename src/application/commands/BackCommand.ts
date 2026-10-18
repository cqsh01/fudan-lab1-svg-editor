import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class BackCommand extends EditCommand {
  protected get action(): string { return `back ${this.id}`; }
  constructor(private readonly id: string) { super(); }
  protected override change(document: SvgDocument): string {
    document.reorder(this.id, false);
    return `${document.find(this.id).label} sent to back`;
  }
}
