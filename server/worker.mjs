import { apiHeaders, createApiHandler, isApiPath } from './api.mjs';
import { maxBodyBytes, securityHeaders } from './security.mjs';

/**
 * Read the raw body while enforcing the byte limit on the stream itself,
 * so an oversized upload is cancelled before it is buffered.
 * @param {Request} request
 * @returns {Promise<{ bytes?: Uint8Array, status?: 400 | 413 }>}
 */
async function readBody(request) {
  if (!request.body) return { status: 400 };
  const reader = request.body.getReader();
  const bytes = new Uint8Array(maxBodyBytes);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > maxBodyBytes) {
        await reader.cancel().catch(() => {});
        return { status: 413 };
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
    return { bytes: bytes.subarray(0, size) };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}

/**
 * Build the fetch handler for the hosted Worker runtime.
 * @param {Record<string, { type: string, data: string }>} assets Base64 static files keyed by URL path.
 * @returns {(request: Request, env?: { GEMINI_API_KEY?: string, GEMINI_MODEL?: string }) => Promise<Response>}
 */
export function createSiteFetch(assets) {
  const handleApi = createApiHandler();

  return async function fetch(request, env = {}) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (isApiPath(path)) {
      const { status, data } = await handleApi({
        method: request.method,
        url,
        contentType: request.headers.get('content-type'),
        contentEncoding: request.headers.get('content-encoding'),
        readBody: () => readBody(request),
        signal: request.signal
      }, env);
      const headers = { ...securityHeaders, ...apiHeaders };
      if (request.method === 'HEAD') return new Response(null, { status, headers: { ...headers, 'Content-Type': 'application/json' } });
      return Response.json(data, { status, headers });
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
