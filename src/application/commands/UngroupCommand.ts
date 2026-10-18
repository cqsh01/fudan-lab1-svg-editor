import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class UngroupCommand extends EditCommand {
  protected get action(): string { return `ungroup ${this.id}`; }
  constructor(private readonly id: string) { super(); }
  protected override change(document: SvgDocument): string {
    const count = document.ungroup(this.id);
    return `g#${this.id} ungrouped (${count} children promoted)`;
  }
}
