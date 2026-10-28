import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

/** Tests the distributable in a clean local prefix, without global installation. */
export class PackageSmoke {
  async run(): Promise<void> {
    const npm = process.env.npm_execpath;
    if (!npm) throw new Error('run this check with npm run test:package');
    const directory = await mkdtemp(join(process.cwd(), 'test/.package-'));
    try {
      const packed = this.command(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', directory]);
      const manifest = JSON.parse(packed) as { filename: string; files: { path: string }[] }[];
      const files = manifest[0]!.files.map(file => file.path);
      assert.ok(files.includes('dist/src/cli/Main.js'));
      assert.ok(files.includes('doc/README.md'));
      assert.ok(!files.some(file => file.startsWith('test/') || file === 'demo.svg' || file.startsWith('node_modules/')));
      const prefix = join(directory, 'installed');
      this.command(process.execPath, [npm, 'install', '--prefix', prefix, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', join(directory, manifest[0]!.filename)]);
      const installed = join(prefix, 'node_modules/lab1-svg-editor');
      const main = join(installed, 'dist/src/cli/Main.js');
      const bin = join(prefix, 'node_modules/.bin', process.platform === 'win32' ? 'svg-editor.cmd' : 'svg-editor');
      await access(bin);
      const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')) as { version: string };
      const entry = process.platform === 'win32' ? main : bin;
      assert.equal(this.command(process.execPath, [entry, '--version']).trim(), metadata.version);
      assert.match(this.command(process.execPath, [entry, '--help']), /Usage: svg-editor/);
      assert.equal(this.command(process.execPath, [entry], 'init 400 300\n'), 'canvas 400x300 created\n');
      await assert.rejects(() => access(join(prefix, 'node_modules/typescript')));
      console.log('Package check passed: clean installation, executable, help, version, and stdin replay.');
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  private command(executable: string, args: string[], input?: string): string {
    const result = spawnSync(executable, args, { encoding: 'utf8', ...(input === undefined ? {} : { input }), timeout: 120_000 });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    return result.stdout;
  }
}

await new PackageSmoke().run();
