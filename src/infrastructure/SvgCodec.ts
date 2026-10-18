import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document as XmlDocument, Element, Node } from '@xmldom/xmldom';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';

/** Explicit SVG subset: unfamiliar rendering semantics are rejected, never discarded. */
export class SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) throw new Error('invalid SVG: DTD and entities are unsupported');
    let xml: XmlDocument;
    try {
      xml = new DOMParser({ onError: (_level, message) => { throw new Error(message); } }).parseFromString(source, 'application/xml');
    } catch {
      throw new Error('invalid SVG: malformed XML');
    }
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new Error('invalid SVG: root must be <svg>');
    this.checkNamespace(root);
    this.checkRootAttributes(root);
    const width = this.length(root.getAttribute('width') ?? '800', 'canvas width');
    const height = this.length(root.getAttribute('height') ?? '600', 'canvas height');
    const viewBox = root.getAttribute('viewBox');
    if (viewBox !== null) {
      const values = viewBox.trim().split(/[\s,]+/).map(value => Numbers.parse(value, 'viewBox'));
      if (values.length !== 4 || values[0] !== 0 || values[1] !== 0 || values[2] !== width || values[3] !== height) {
        throw new Error('unsupported viewBox: expected 0 0 <width> <height>');
      }
    }
    const document = new SvgDocument(width, height);
    const used = new Set<string>();
    this.reserveIds(root, used);
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    for (const element of this.elements(root)) {
      document.add(this.readShape(element, used, counters, warnings));
    }
    return { document, warnings };
  }

  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    for (const child of document.children) {
      root.appendChild(xml.createTextNode('\n  '));
      root.appendChild(this.writeShape(xml, child, 1));
    }
    if (document.children.length) root.appendChild(xml.createTextNode('\n'));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }

  private readShape(element: Element, used: Set<string>, counters: Map<string, number>, warnings: string[]): Shape {
    this.checkNamespace(element);
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute('id');
    if (id === null || id === '') {
      let sequence = counters.get(type) ?? 0;
      do { id = `${type}${++sequence}`; } while (used.has(id));
      counters.set(type, sequence);
      used.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const shape = this.factory.create(type, id);
    for (let i = 0; i < element.attributes.length; i++) {
      const attribute = element.attributes.item(i)!;
      if (attribute.name === 'id' || attribute.name === 'xmlns') continue;
      // XML text content is a child node, not an SVG attribute called "text".
      if (attribute.name === 'text') throw new Error(`unsupported SVG attribute: text on <${type}>`);
      shape.set(attribute.name, attribute.value);
    }
    const children = this.elements(element, shape.textContent !== undefined);
    if (shape.textContent !== undefined) {
      if (children.length) throw new Error('unsupported SVG: nested text elements');
      shape.set('text', element.textContent ?? '');
    } else if (children.length) {
      const container = shape.asContainer();
      for (const child of children) container.append(this.readShape(child, used, counters, warnings));
    }
    return shape;
  }

  private writeShape(xml: XmlDocument, shape: Shape, depth: number): Element {
    const element = xml.createElementNS(this.namespace, shape.type);
    for (const [key, value] of Object.entries(shape.attributes)) element.setAttribute(key, value);
    if (shape.textContent !== undefined) element.appendChild(xml.createTextNode(shape.textContent));
    for (const child of shape.children) {
      element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth + 1)}`));
      element.appendChild(this.writeShape(xml, child, depth + 1));
    }
    if (shape.children.length) element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth)}`));
    return element;
  }

  private reserveIds(element: Element, ids: Set<string>): void {
    // Reserve explicit ids before allocating any: a later rect1 must not collide.
    for (const child of Array.from(element.childNodes).filter(node => node.nodeType === 1) as Element[]) {
      const id = child.getAttribute('id');
      if (id) {
        if (ids.has(id)) throw new Error(`id already exists: ${id}`);
        ids.add(id);
      }
      this.reserveIds(child, ids);
    }
  }
  private elements(parent: Element, allowText = false): Element[] {
    const elements: Element[] = [];
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 1) elements.push(node as Element);
      else if (!this.ignorable(node, allowText)) throw new Error(`unsupported SVG content in <${parent.localName}>`);
    }
    return elements;
  }
  private ignorable(node: Node, allowText: boolean): boolean {
    return node.nodeType === 8 || ((node.nodeType === 3 || node.nodeType === 4) && (allowText || !(node.nodeValue ?? '').trim()));
  }
  private checkNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('unsupported SVG namespace');
  }
  private checkRootAttributes(root: Element): void {
    for (let i = 0; i < root.attributes.length; i++) {
      const attribute = root.attributes.item(i)!;
      if (!['xmlns', 'width', 'height', 'viewBox', 'version'].includes(attribute.name)) {
        throw new Error(`unsupported SVG root attribute: ${attribute.name}`);
      }
    }
  }
  private length(value: string, name: string): number {
    return Numbers.parse(value.trim().replace(/px$/, ''), name);
  }
}
