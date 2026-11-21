import { cities } from '../src/domain.mjs';
import { createAssistant } from './assistant.mjs';
import { createForecastReader } from './forecast.mjs';

export const apiHeaders = Object.freeze({ 'Cache-Control': 'no-store' });

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
const JSON_CONTENT_TYPE = /^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?$/i;
const jsonDecoder = new TextDecoder('utf-8', { fatal: true });
const bodyErrors = {
  400: 'Send a valid JSON object.',
  413: 'Request body is too large.',
  415: 'Send an uncompressed UTF-8 application/json request body.',
  500: 'Request failed.'
};

function failure(status, error) {
  return { status, data: { error } };
}

function parseBody(bytes) {
  try {
    const value = JSON.parse(jsonDecoder.decode(bytes));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export function isApiPath(pathname) {
  return /^\/api(?:\/|$)/i.test(pathname);
}

/**
 * Dispatch API requests independently of the web server. Each adapter supplies
 * a lazy body reader that enforces the byte limit on its request stream.
 */
export function createApiHandler() {
  const readForecast = createForecastReader();
  let assistant;

  return async function handleApi({ method, url, contentType, contentEncoding, readBody, signal }, env = {}) {
    const path = url.pathname.toLowerCase().replace(/\/$/, '');
    const readOnly = method === 'GET' || method === 'HEAD';
    const key = env.GEMINI_API_KEY;
    const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

    if (readOnly && path === '/api/status') {
      return { status: 200, data: key ? { gemini: true, model } : { gemini: false } };
    }

    if (readOnly && path === '/api/forecast') {
      const cityIds = url.searchParams.getAll('city');
      const city = cityIds.length === 1 && cities.find(entry => entry.id === cityIds[0]);
      if (!city) return failure(400, 'Choose a supported city.');
      try {
        return { status: 200, data: await readForecast(city) };
      } catch {
        return failure(503, 'The forecast could not be loaded. Check CPCB for local readings.');
      }
    }

    if (method === 'POST' && path === '/api/assistant') {
      // Requiring JSON blocks cross-origin simple requests from reaching Gemini.
      if (!JSON_CONTENT_TYPE.test(contentType?.trim() ?? '') || (contentEncoding && contentEncoding.toLowerCase() !== 'identity')) {
        return failure(415, bodyErrors[415]);
      }
      const { bytes, status } = await readBody();
      if (status) return failure(status, bodyErrors[status]);
      const body = parseBody(bytes);
      if (!body) return failure(400, bodyErrors[400]);
      if (!assistant || assistant.key !== key || assistant.model !== model) {
        assistant = { key, model, ask: createAssistant(key, model) };
      }
      return assistant.ask(body, signal);
    }

    return failure(404, 'Unknown endpoint.');
  };
}
