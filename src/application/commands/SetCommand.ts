import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from '../EditCommand.js';


export class SetCommand extends EditCommand {
  protected get action(): string { return `set ${this.id} ${this.attribute}`; }
  constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) { super(); }
  protected override change(document: SvgDocument): string {
    const shape = document.find(this.id);
    shape.set(this.attribute, this.value);
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
