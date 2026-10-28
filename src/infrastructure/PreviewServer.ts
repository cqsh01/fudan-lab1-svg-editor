import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { basename } from 'node:path';
import type { Preview } from '../application/ports/Preview.js';
import type { PreviewSource } from '../application/ports/PreviewSource.js';
import { PreviewPage } from './PreviewPage.js';
import { SvgCodec } from './SvgCodec.js';

/** Loopback-only read adapter; no command execution or filesystem routes. */
export class PreviewServer implements Preview {
  private server: Server | undefined;
  private address = '';
  private readonly prefix = `/${randomBytes(24).toString('hex')}/`;
  private readonly nonce = randomBytes(18).toString('base64');
  constructor(private readonly source: PreviewSource, private readonly port = 0,
    private readonly codec = new SvgCodec(), private readonly page = new PreviewPage()) {}

  async start(): Promise<string> {
    if (this.server) return this.address;
    const server = createServer((request, response) => this.respond(request, response));
    this.server = server;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(this.port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
      });
      const binding = server.address();
      if (!binding || typeof binding === 'string') throw new Error('cannot determine preview address');
      this.address = `http://127.0.0.1:${binding.port}${this.prefix}`;
      return this.address;
    } catch (error) { this.server = undefined; server.close(); throw error; }
  }
  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (!server) return;
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  }
  private respond(request: IncomingMessage, response: ServerResponse): void {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${this.nonce}'; style-src 'nonce-${this.nonce}'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`);
    try {
      if (request.headers.host !== new URL(this.address).host) { this.send(request, response, 403, 'text/plain', 'forbidden'); return; }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        this.send(request, response, 405, 'text/plain', 'read-only preview'); return;
      }
      const path = new URL(request.url ?? '/', this.address).pathname;
      if (path === this.prefix) { this.send(request, response, 200, 'text/html', this.page.render(this.nonce)); return; }
      if (path === `${this.prefix}state`) {
        const snapshot = this.source.previewSnapshot();
        const document = snapshot.document;
        this.send(request, response, 200, 'application/json', JSON.stringify({
          hasDocument: document !== undefined, width: document?.width, height: document?.height,
          count: document?.count, filename: snapshot.filePath ? basename(snapshot.filePath) : undefined,
          dirty: snapshot.dirty, revision: snapshot.revision,
        })); return;
      }
      if (path === `${this.prefix}image.svg`) {
        const document = this.source.previewSnapshot().document;
        if (!document) { this.send(request, response, 404, 'text/plain', 'no document'); return; }
        this.send(request, response, 200, 'image/svg+xml', this.codec.encode(document)); return;
      }
      this.send(request, response, 404, 'text/plain', 'not found');
    } catch { this.send(request, response, 500, 'text/plain', 'cannot render preview'); }
  }
  private send(request: IncomingMessage, response: ServerResponse, status: number, type: string, body: string): void {
    response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
    response.end(request.method === 'HEAD' ? undefined : body);
  }
}
