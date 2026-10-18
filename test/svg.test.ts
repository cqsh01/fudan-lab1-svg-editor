import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { FileSvgStore } from '../src/infrastructure/FileSvgStore.js';
import { DocumentFormatter } from '../src/application/DocumentFormatter.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Text } from '../src/domain/Text.js';

const codec = new SvgCodec();
const wrap = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">${body}</svg>`;

test('all six types round-trip with order, style, text escaping and nested groups', () => {
  const source = wrap(`<g id="scene" fill="#eee" stroke-width="2">
    <rect id="r" x="1.5" y="-2" width="3" height="4"/>
    <circle id="c" cx="10" cy="20" r="3"/>
    <ellipse id="e" cx="4" cy="5" rx="6" ry="7" stroke="red"/>
    <line id="l" x1="1" y1="2" x2="3" y2="4"/>
    <g id="nested"><text id="t" x="10" y="20">A &amp; B &lt; C &quot;中文&quot;</text></g>
  </g>`);
  const result = codec.decode(source);
  const encoded = codec.encode(result.document);
  const again = codec.decode(encoded);
  assert.match(encoded, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(encoded, /A &amp; B &lt; C/);
  assert.deepEqual(new DocumentFormatter().tree(again.document), new DocumentFormatter().tree(result.document));
  assert.deepEqual(again.warnings, []);
  assert.equal(again.document.count, 7);
  assert.equal(again.document.find('t').textContent, 'A & B < C "中文"');
  assert.equal(again.document.find('r').attributes.fill, undefined);
});

test('missing ids are deterministic, globally unique, and skip explicit ids declared later', () => {
  const result = codec.decode(wrap('<rect/><g><rect id="rect1"/><rect/><circle/></g>'));
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>',
    'warning: assigned id circle1 to unnamed <circle>',
  ]);
  assert.equal(result.document.count, 5);
  assert.throws(() => codec.decode(wrap('<g id="x"><rect id="x"/></g>')), /id already exists: x/);
});

test('reject malformed, foreign, unsupported and lossy SVG inputs', () => {
  const bad = [
    '', '<svg><g></svg>', '<html/>', '<svg width="0"/>', '<svg width="NaN"/>',
    '<svg viewBox="0 0 40 30"/>', '<!DOCTYPE svg><svg/>',
    wrap('<path id="p" d="M 0 0"/>'), wrap('<g id="g" transform="translate(1,2)"/>'),
    wrap('<text id="t"><tspan>nested</tspan></text>'), wrap('<rect id="r" onclick="alert(1)"/>'),
    wrap('<rect id="r" x="nan"/>'), wrap('<rect id="r" width="-1"/>'),
    wrap('<g xmlns="http://example.com/other" id="g"/>'), wrap('stray text'),
    wrap('<rect id="r"><circle id="c"/></rect>'),
  ];
  for (const source of bad) assert.throws(() => codec.decode(source), source);
});

test('zero dimensions, default geometry, empty text and case-sensitive ids survive', () => {
  const result = codec.decode('<svg width="400px" height="300px"><rect id="R"/><rect id="r"/><text id="t"/></svg>');
  assert.equal(result.document.find('R').attributes.width, '0');
  assert.equal(result.document.find('t').textContent, '');
  const reread = codec.decode(codec.encode(result.document));
  assert.equal(reread.document.count, 3);
});

test('file IO saves atomically, reports failures, and cleans temporary files', async () => {
  // All test artifacts stay inside lab1 and are removed after verification.
  const directory = await mkdtemp(join(process.cwd(), 'test/.svg-'));
  const store = new FileSvgStore();
  try {
    const target = join(directory, 'with space.svg');
    const document = new SvgDocument(400, 300);
    document.add(new Text('title', 10, 20, 'A&B <中文>'));
    await writeFile(target, 'previous content');
    await store.write(target, document);
    assert.equal((await store.read(target)).document.find('title').textContent, 'A&B <中文>');
    assert.match(await readFile(target, 'utf8'), /^<\?xml/);
    await assert.rejects(() => store.read(join(directory, 'missing.svg')), /cannot read file:/);
    await assert.rejects(() => store.write(join(directory, 'missing', 'x.svg'), document), /cannot write file:/);
    await assert.rejects(() => store.write(directory, document), /cannot write file:/);
    assert.deepEqual((await readdir(directory)).filter(name => !name.startsWith('._')), ['with space.svg']);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
