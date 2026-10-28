import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Tests the distributable in a clean local prefix, including the actual Windows shim. */
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
      const prefix = join(directory, '安装 包 (CMD)');
      this.command(process.execPath, [npm, 'install', '--prefix', prefix, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', join(directory, manifest[0]!.filename)]);
      const installed = join(prefix, 'node_modules/lab1-svg-editor');
      const main = join(installed, 'dist/src/cli/Main.js');
      const bin = join(prefix, 'node_modules/.bin', process.platform === 'win32' ? 'svg-editor.cmd' : 'svg-editor');
      await access(bin);
      const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')) as { version: string };
      if (process.platform === 'win32') {
        assert.equal(this.cmd(bin, '--version').trim(), metadata.version);
        assert.match(this.cmd(bin, '--help'), /Usage: svg-editor/);
      } else {
        assert.equal(this.command(process.execPath, [bin, '--version']).trim(), metadata.version);
        assert.match(this.command(process.execPath, [bin, '--help']), /Usage: svg-editor/);
      }
      assert.equal(this.command(process.execPath, [main], 'init 400 300\n'), 'canvas 400x300 created\n');
      await this.fileWorkflow(directory, main, bin);
      await assert.rejects(() => access(join(prefix, 'node_modules/typescript')));
      console.log(`Package check passed: clean installation, ${process.platform === 'win32' ? 'cmd.exe/.cmd' : 'executable'}, help, version, native file paths, Unicode, CRLF, and failure exit code.`);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }

  private async fileWorkflow(directory: string, main: string, bin: string): Promise<void> {
    const input = join(directory, '输入 diagram.svg');
    const output = join(directory, '输出 diagram.svg');
    const script = join(directory, '中文 编辑.commands');
    await writeFile(input, '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect id="card" x="10" y="20" width="100" height="50"/><text id="label" x="20" y="40">原始</text></svg>', 'utf8');
    const commands = [`read "${input}"`, String.raw`set label text "中文 & <SVG> \"quoted\""`, 'move card 5 0', `save "${output}"`, 'exit'].join('\r\n') + '\r\n';
    await writeFile(script, commands, 'utf8');
    const transcript = process.platform === 'win32' ? this.cmd(bin, '< "%LAB1_SVG_SCRIPT%"', script) : this.command(process.execPath, [main], commands);
    assert.match(transcript, /rect#card moved by \(5,0\)/);
    const saved = await readFile(output, 'utf8');
    assert.match(saved, /x="15"/);
    assert.match(saved, /中文 &amp; &lt;SVG/);
    const badScript = join(directory, '错误.commands');
    const bad = `read "${join(directory, '不存在.svg')}"\r\nexit\r\n`;
    await writeFile(badScript, bad, 'utf8');
    if (process.platform === 'win32') this.cmd(bin, '< "%LAB1_SVG_SCRIPT%"', badScript, 1);
    else this.command(process.execPath, [main], bad, 1);
  }

  private command(executable: string, args: string[], input?: string, expectedStatus = 0): string {
    const result = spawnSync(executable, args, { encoding: 'utf8', ...(input === undefined ? {} : { input }), timeout: 120_000 });
    assert.equal(result.status, expectedStatus, result.error?.message ?? result.stderr);
    if (expectedStatus === 1) assert.match(result.stderr, /^error: cannot read file:/);
    return result.stdout;
  }
  private cmd(bin: string, argumentsLine: string, script?: string, expectedStatus = 0): string {
    // Fixed command structure; paths travel through quoted environment expansion.
    const result = spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `""%LAB1_SVG_BIN%" ${argumentsLine}"`], {
      encoding: 'utf8', windowsVerbatimArguments: true, timeout: 120_000,
      env: { ...process.env, LAB1_SVG_BIN: bin, LAB1_SVG_SCRIPT: script ?? '' },
    });
    assert.equal(result.status, expectedStatus, result.error?.message ?? result.stderr);
    if (expectedStatus === 0) assert.equal(result.stderr, '');
    else assert.match(result.stderr, /^error: cannot read file:/);
    return result.stdout;
  }
}

await new PackageSmoke().run();
