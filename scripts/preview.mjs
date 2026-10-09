import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';

export function previewServer() {
  const root = fileURLToPath(new URL('../web/', import.meta.url));
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
  return createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = resolve(root, path === '/' ? 'index.html' : path.slice(1));
      const type = types[extname(file)];
      if (!file.startsWith(root + (root.endsWith(sep) ? '' : sep)) || !type || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) { res.writeHead(error.code === 'ENOENT' || error instanceof URIError ? 404 : 500).end(); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  previewServer().listen(port, '127.0.0.1', () => console.log(`Browser demo listening on port ${port}; task events are simulated.`));
}
