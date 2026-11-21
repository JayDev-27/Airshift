import express from 'express';
import compression from 'compression';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiHeaders, createApiHandler } from './api.mjs';
import { maxBodyBytes, securityHeaders } from './security.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = express();
const httpServer = createServer(app);
const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || (dev ? 5173 : 8080));
const handleApi = createApiHandler();
const readRawBody = express.raw({ limit: maxBodyBytes, inflate: false, type: () => true });

function readBody(req, res) {
  return new Promise(resolve => {
    readRawBody(req, res, error => {
      if (!error) return resolve({ bytes: req.body });
      const status = [400, 413, 415].includes(error.status) ? error.status : 500;
      resolve({ status });
    });
  });
}

app.disable('x-powered-by');
app.use(compression());
app.use((_req, res, next) => {
  // Vite's dev server injects inline scripts for HMR, so the strict policy applies to production only.
  const { 'Content-Security-Policy': policy, ...headers } = securityHeaders;
  res.set(dev ? headers : { ...headers, 'Content-Security-Policy': policy });
  next();
});
app.use('/api', async (req, res) => {
  res.set(apiHeaders);
  const connection = new AbortController();
  const cancelDisconnected = () => { if (!res.writableFinished) connection.abort(); };
  res.once('close', cancelDisconnected);
  try {
    const { status, data } = await handleApi({
      method: req.method,
      url: new URL(req.originalUrl, 'http://localhost'),
      contentType: req.get('content-type'),
      contentEncoding: req.get('content-encoding'),
      readBody: () => readBody(req, res),
      signal: connection.signal
    }, process.env);
    if (!connection.signal.aborted) res.status(status).json(data);
  } finally {
    res.off('close', cancelDisconnected);
  }
});

app.use('/api', (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Request failed.' });
});
if (dev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({ root, server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use('/assets', express.static(resolve(root, 'dist/assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(resolve(root, 'dist')));
  app.get(/.*/, (_req, res) => res.sendFile(resolve(root, 'dist/index.html')));
}
httpServer.listen(port, dev ? 'localhost' : '0.0.0.0', () => process.stdout.write(`Airshift at http://localhost:${httpServer.address().port}\n`));
