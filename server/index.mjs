import express from 'express';
import compression from 'compression';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cities } from '../src/domain.mjs';
import { createAssistant } from './assistant.mjs';
import { createForecastReader } from './forecast.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = express();
const httpServer = createServer(app);
const dev = process.argv.includes('--dev');
const port = Number(process.env.PORT || (dev ? 5173 : 8080));
const geminiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const fetchForecast = createForecastReader();
const ask = createAssistant(geminiKey, model);

app.disable('x-powered-by');
app.use(compression());
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  if (!dev) res.set('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'");
  next();
});
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, express.json({ limit: '12kb' }));

app.get('/api/status', (_req, res) => res.json({ gemini: Boolean(geminiKey), ...(geminiKey && { model }) }));
app.get('/api/forecast', async (req, res) => {
  const city = cities.find(entry => entry.id === req.query.city);
  if (!city) return res.status(400).json({ error: 'Choose a supported city.' });
  try {
    res.json(await fetchForecast(city));
  } catch {
    res.status(503).json({ error: 'The forecast could not be loaded. Check CPCB for local readings.' });
  }
});


app.post('/api/assistant', async (req, res) => {
  const connection = new AbortController();
  const cancelDisconnected = () => { if (!res.writableFinished) connection.abort(); };
  res.once('close', cancelDisconnected);
  try {
    const result = await ask(req.body, connection.signal);
    if (!connection.signal.aborted) res.status(result.status).json(result.data);
  } finally {
    res.off('close', cancelDisconnected);
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint.' }));
app.use('/api', (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Send valid JSON.' });
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
