import test from 'node:test';
import assert from 'node:assert/strict';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';
import { Circle } from '../src/domain/Circle.js';
import { Text } from '../src/domain/Text.js';

test('Composite moves and scales every descendant; copies remain independent', () => {
  const doc = new SvgDocument();
  const outer = new Group('outer');
  const inner = new Group('inner');
  inner.append(new Rect('r', 10, 20, 30, 40));
  inner.append(new Text('t', 5, 6, '开始'));
  outer.append(inner);
  doc.add(outer);
  const before = doc.clone();
  outer.move(2, 3);
  outer.scale(2);
  assert.deepEqual(doc.find('r').attributes, { id: 'r', x: '24', y: '46', width: '60', height: '80' });
  assert.equal(doc.find('t').attributes.x, '14');
  assert.equal(before.find('r').attributes.x, '10');
  outer.set('fill', 'red');
  assert.equal(outer.attributes.fill, 'red');
  assert.equal(doc.find('r').attributes.fill, undefined);
});

test('group preserves document order and ungroup preserves the occupied position', () => {
  const doc = new SvgDocument();
  doc.add(new Group('scene'));
  for (const id of ['a', 'b', 'c', 'd']) doc.add(new Circle(id, 0, 0, 1), 'scene');
  const group = doc.group('pair', ['c', 'a']);
  assert.deepEqual(group.children.map(item => item.id), ['a', 'c']);
  assert.deepEqual(doc.find('scene').children.map(item => item.id), ['pair', 'b', 'd']);
  assert.equal(doc.ungroup('pair'), 2);
  assert.deepEqual(doc.find('scene').children.map(item => item.id), ['a', 'c', 'b', 'd']);
});

test('cross-parent grouping uses lowest common ancestor', () => {
  const doc = new SvgDocument();
  doc.add(new Group('scene'));
  doc.add(new Group('left'), 'scene');
  doc.add(new Group('right'), 'scene');
  doc.add(new Rect('a', 0, 0, 1, 1), 'left');
  doc.add(new Rect('b', 0, 0, 1, 1), 'right');
  doc.group('pair', ['b', 'a']);
  assert.equal(doc.parentLabel('pair'), 'g#scene');
  assert.deepEqual(doc.find('pair').children.map(item => item.id), ['a', 'b']);
});

test('invalid ids, cycles, duplicates, and top-level ungroup are rejected before mutation', () => {
  const doc = new SvgDocument();
  doc.add(new Group('g'));
  doc.add(new Group('child'), 'g');
  doc.add(new Rect('r', 0, 0, 1, 1), 'child');
  assert.throws(() => doc.group('bad', ['r', 'g']), /own descendant: g/);
  assert.throws(() => doc.addTo('child', 'g'), /own descendant/);
  assert.throws(() => doc.addTo('g', 'g'), /own descendant/);
  assert.throws(() => doc.ungroup('g'), /top-level container/);
  assert.throws(() => doc.add(new Circle('r', 0, 0, 1)), /id already exists: r/);
  assert.throws(() => doc.group('bad', ['r', 'r']), /duplicate group member/);
  assert.throws(() => new Group('bad id'), /id must/);
  assert.equal(doc.count, 3);
});

test('geometry validates finite numbers and nonnegative dimensions', () => {
  const rect = new Rect('r', -10, 0.5, 0, 20);
  assert.throws(() => rect.scale(0), /scale factor must be positive/);
  assert.throws(() => rect.set('width', '-1'), /non-negative/);
  assert.throws(() => rect.set('x', 'NaN'), /invalid number/);
  assert.throws(() => rect.set('label', 'x'), /unknown attribute: label/);
  assert.throws(() => rect.set('stroke-width', '-1'), /non-negative/);
  assert.equal(rect.attributes.width, '0');
  const attributes = rect.attributes as Record<string, string>;
  attributes.x = '999';
  assert.equal(rect.attributes.x, '-10');
});
