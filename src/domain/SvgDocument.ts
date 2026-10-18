import { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import type { Shape } from './Shape.js';

export class SvgDocument {
  private canvasWidth: number;
  private canvasHeight: number;
  private root = new Group('__canvas__');
  constructor(width = 800, height = 600) {
    this.canvasWidth = Numbers.positive(width, 'canvas width');
    this.canvasHeight = Numbers.positive(height, 'canvas height');
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return this.root.children; }
  get count(): number { return this.ordered().length; }
  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width');
    Numbers.positive(height, 'canvas height');
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height);
    copy.root = this.root.clone();
    return copy;
  }
  find(id: string): Shape {
    const shape = this.ordered().find(item => item.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  container(id: string): Group {
    const shape = this.ordered().find(item => item.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    return shape.asContainer();
  }
  parentLabel(id: string): string {
    const parent = this.parentOf(this.find(id));
    return parent === this.root ? 'svg' : parent.label;
  }
  add(shape: Shape, parentId?: string): void {
    const incoming = this.flatten([shape]);
    const seen = new Set(this.ordered().map(item => item.id));
    for (const item of incoming) {
      if (seen.has(item.id)) throw new Error(`id already exists: ${item.id}`);
      seen.add(item.id);
    }
    (parentId === undefined ? this.root : this.container(parentId)).append(shape);
  }
  delete(id: string): Shape {
    const shape = this.find(id);
    this.parentOf(shape).remove(shape);
    return shape;
  }
  group(newId: string, ids: readonly string[]): Group {
    if (this.ordered().some(item => item.id === newId)) throw new Error(`id already exists: ${newId}`);
    if (!ids.length) throw new Error('group requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate group member');
    const selected = ids.map(id => this.find(id));
    for (const shape of selected) {
      if (selected.some(other => other !== shape && Group.contains(shape, other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    // Preserve document order even when the command lists members in another order.
    const ordered = this.ordered().filter(item => selected.includes(item));
    const parents = ordered.map(item => this.parentOf(item));
    let parent = parents[0]!;
    while (!parents.every(other => other === parent || Group.contains(parent, other))) parent = this.parentOf(parent);
    const first = ordered[0]!;
    const anchor = parent.children.find(child => child === first || Group.contains(child, first))!;
    const index = parent.children.indexOf(anchor);
    const group = new Group(newId);
    for (const item of ordered) {
      this.parentOf(item).remove(item);
      group.append(item);
    }
    parent.insert(index, group);
    return group;
  }
  ungroup(id: string): number {
    const group = this.find(id).asContainer();
    const parent = this.parentOf(group);
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.remove(group);
    const children = group.children;
    children.forEach((child, offset) => {
      group.remove(child);
      parent.insert(index + offset, child);
    });
    return children.length;
  }
  addTo(groupId: string, id: string): void {
    const group = this.container(groupId);
    const shape = this.find(id);
    if (shape === group || Group.contains(shape, group)) {
      throw new Error(`cannot move a container into its own descendant: ${id}`);
    }
    this.parentOf(shape).remove(shape);
    group.append(shape);
  }
  reorder(id: string, front: boolean): void {
    const shape = this.find(id);
    const parent = this.parentOf(shape);
    parent.remove(shape);
    parent.insert(front ? parent.children.length : 0, shape);
  }
  ordered(): readonly Shape[] { return this.flatten(this.children); }
  private flatten(items: readonly Shape[]): Shape[] {
    return items.flatMap(item => [item, ...this.flatten(item.children)]);
  }
  private parentOf(shape: Shape): Group {
    const parent = [this.root, ...this.ordered()].find(item => item.children.includes(shape));
    if (!parent) throw new Error(`no parent for shape: ${shape.id}`);
    return parent.asContainer();
  }
}
