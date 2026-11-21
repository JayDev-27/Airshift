import { cities } from '../src/domain.mjs';
import { createAssistant } from './assistant.mjs';
import { createForecastReader } from './forecast.mjs';
import { maxBodyBytes, securityHeaders } from './security.mjs';

/** Serialize an API response with no-store caching and the shared security headers. */
function json(data, status = 200) {
  return Response.json(data, { status, headers: { ...securityHeaders, 'Cache-Control': 'no-store' } });
}

/**
 * Read a JSON body while enforcing the byte limit on the stream itself,
 * so an oversized upload is cancelled before it is buffered.
 * @param {Request} request
 * @returns {Promise<{ data?: unknown, status?: 400 | 413 }>}
 */
async function readBody(request) {
  if (!request.body) return { status: 400 };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let content = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBodyBytes) {
        await reader.cancel();
        return { status: 413 };
      }
      content += decoder.decode(value, { stream: true });
    }
    return { data: JSON.parse(content + decoder.decode()) };
  } catch {
    return { status: 400 };
  }
}

/**
 * Build the fetch handler for the hosted Worker runtime.
 * @param {Record<string, { type: string, data: string }>} assets Base64 static files keyed by URL path.
 * @returns {(request: Request, env?: { GEMINI_API_KEY?: string, GEMINI_MODEL?: string }) => Promise<Response>}
 */
export function createSiteFetch(assets) {
  const forecast = createForecastReader();
  let service;

  return async function fetch(request, env = {}) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/api/')) {
      const key = env.GEMINI_API_KEY;
      const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
      if (path === '/api/status' && request.method === 'GET') return json({ gemini: Boolean(key), ...(key && { model }) });
      if (path === '/api/forecast' && request.method === 'GET') {
        const city = cities.find(entry => entry.id === url.searchParams.get('city'));
        if (!city) return json({ error: 'Choose a supported city.' }, 400);
        try {
          return json(await forecast(city));
        } catch {
          return json({ error: 'The forecast could not be loaded. Check CPCB for local readings.' }, 503);
        }
      }
      if (path === '/api/assistant' && request.method === 'POST') {
        const { data, status } = await readBody(request);
        if (status === 413) return json({ error: 'Request body is too large.' }, 413);
        if (status === 400) return json({ error: 'Send valid JSON.' }, 400);
        if (!service || service.key !== key || service.model !== model) {
          service = { key, model, ask: createAssistant(key, model) };
        }
        const result = await service.ask(data, request.signal);
        return json(result.data, result.status);
      }
      return json({ error: 'Unknown endpoint.' }, 404);
    }

    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { ...securityHeaders, Allow: 'GET, HEAD' } });
    const asset = assets[path === '/' ? '/index.html' : path];
    if (!asset) return new Response('File not found', { status: 404, headers: securityHeaders });
    const bytes = request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.data), letter => letter.charCodeAt(0));
    return new Response(bytes, { headers: {
      ...securityHeaders,
      'Content-Type': asset.type,
      'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable'
        : path === '/' || path === '/index.html' ? 'no-cache' : 'public, max-age=300',
    } });
  };
}
