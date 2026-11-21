import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { contentPolicy, securityHeaders } from '../server/security.mjs';
import { createSiteFetch } from '../server/worker.mjs';

const assets = {
  '/index.html': { type: 'text/html; charset=utf-8', data: Buffer.from('<title>Airshift</title>').toString('base64') },
  '/assets/app-1234.js': { type: 'text/javascript; charset=utf-8', data: Buffer.from('export {}').toString('base64') }
};

describe('content security policy', () => {
  test('blocks framing, plugins and third-party scripts', () => {
    assert.match(contentPolicy, /frame-ancestors 'none'/);
    assert.match(contentPolicy, /object-src 'none'/);
    assert.match(contentPolicy, /script-src 'self'(;|$)/);
    assert.doesNotMatch(contentPolicy, /unsafe-eval/);
  });
});

describe('hosted Worker security headers', () => {
  const handler = createSiteFetch(assets);

  for (const path of ['/', '/assets/app-1234.js', '/api/status', '/api/unknown', '/missing']) {
    test(`${path} sends every hardening header`, async () => {
      const response = await handler(new Request(`https://airshift.example${path}`));
      for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers.get(name), value, name);
    });
  }

  test('caches hashed bundles immutably and revalidates the HTML shell', async () => {
    assert.match((await handler(new Request('https://airshift.example/assets/app-1234.js'))).headers.get('cache-control'), /immutable/);
    assert.equal((await handler(new Request('https://airshift.example/'))).headers.get('cache-control'), 'no-cache');
  });

  test('rejects unsupported methods on static paths', async () => {
    const response = await handler(new Request('https://airshift.example/', { method: 'DELETE' }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  });

  test('answers HEAD without a body', async () => {
    const response = await handler(new Request('https://airshift.example/', { method: 'HEAD' }));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '');
  });

  test('rejects malformed JSON and unknown cities', async () => {
    const malformed = await handler(new Request('https://airshift.example/api/assistant', { method: 'POST', body: '{' }));
    assert.equal(malformed.status, 400);
    assert.equal((await handler(new Request('https://airshift.example/api/forecast?city=../etc'))).status, 400);
  });
});
