import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export function previewServer() {
  const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/pet.js', 'pet.js'], ['/style.css', 'style.css']]);
  const types = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8' };
  return createServer(async (req, res) => {
    const file = files.get(new URL(req.url, 'http://localhost').pathname);
    if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404).end(); return; }
    try {
      const body = await readFile(new URL(`../web/${file}`, import.meta.url));
      res.writeHead(200, { 'Content-Type': types[file.split('.').pop()], 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) { console.error(error); res.writeHead(500).end(); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  previewServer().listen(port, '127.0.0.1', () => console.log(`Browser demo listening on port ${port}; task events are simulated.`));
}
