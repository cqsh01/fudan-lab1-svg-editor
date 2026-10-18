import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class GroupCommand extends EditCommand {
  protected get action(): string { return `group ${this.id}`; }
  constructor(private readonly id: string, private readonly members: readonly string[]) { super(); }
  protected override change(document: SvgDocument): string {
    const group = document.group(this.id, this.members);
    return `${group.label} created with ${group.children.length} children`;
  }
}
