import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { build } from 'esbuild';

const output = resolve('dist');
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json'],
  ['.webp', 'image/webp'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
  ['.woff', 'font/woff'], ['.woff2', 'font/woff2']
]);
const assets = {};
for (const entry of (await readdir(output, { withFileTypes: true, recursive: true })).filter(item => item.isFile())) {
  const file = join(entry.parentPath, entry.name);
  const path = '/' + file.slice(output.length + 1).replaceAll('\\', '/');
  const type = types.get(extname(path));
  if (!type) continue;
  assets[path] = { type, data: (await readFile(file)).toString('base64') };
}
if (!assets['/index.html']) throw new Error('Run the Vite client build before packaging the Site.');

await build({
  stdin: {
    contents: `import { createSiteFetch } from './server/worker.mjs'; export default { fetch: createSiteFetch(${JSON.stringify(assets)}) };`,
    resolveDir: process.cwd(), sourcefile: 'airshift-site-entry.mjs'
  },
  outfile: join(output, 'server/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  minify: true
});
