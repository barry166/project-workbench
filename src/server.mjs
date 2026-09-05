import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

export default async function handler(req, res) {
  if ((req.url ?? '').split('?')[0] === '/api/health') {
    const started = performance.now();
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ online: true, responseTimeMs: Math.max(0, Math.round((performance.now() - started) * 100) / 100), checkedAt: new Date().toISOString() }));
    return;
  }
  const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safe = normalize(path).replace(/^([.][.][/\\])+/, '');
  try {
    const body = await readFile(join(root, safe));
    res.statusCode = 200;
    res.setHeader('content-type', types[extname(safe)] ?? 'text/plain; charset=utf-8');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Not found');
  }
}
