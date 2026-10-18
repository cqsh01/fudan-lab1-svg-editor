import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

async function sources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.filter(entry => !entry.name.startsWith('._')).map(async entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sources(path) : entry.name.endsWith('.ts') ? [path] : [];
  }))).flat();
}

test('production imports follow the documented dependency rules; one class per file', async () => {
  const root = resolve('src');
  const allowed = new Map([
    ['domain', ['domain']],
    ['application', ['domain', 'application']],
    ['cli', ['domain', 'application', 'cli']],
    ['infrastructure', ['domain', 'application', 'infrastructure']],
  ]);
  for (const file of await sources(root)) {
    const module = relative(root, file).split(/[\\/]/)[0]!;
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /^(?:export )?(?:async )?function\s/m, `free function in ${file}`);
    const classes = [...source.matchAll(/^export (?:abstract )?class (\w+)/gm)];
    assert.ok(classes.length <= 1, `multiple classes in ${file}`);
    for (const declaration of classes) assert.equal(declaration[1], basename(file, '.ts'), file);
    for (const declaration of source.matchAll(/^import\b[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
      const specifier = declaration[1]!;
      if (specifier.startsWith('.')) {
        const target = relative(root, resolve(file, '..', specifier)).split(/[\\/]/)[0]!;
        const compositionRoot = module === 'cli' && basename(file) === 'Main.ts';
        assert.ok(allowed.get(module)?.includes(target) || (compositionRoot && target === 'infrastructure'), `${file} imports ${specifier}`);
      } else {
        const entryPoint = module === 'cli' && basename(file) === 'Main.ts';
        assert.ok(module === 'infrastructure' || entryPoint, `external dependency in ${file}: ${specifier}`);
      }
    }
  }
});
