import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { createForecastReader } from '../server/forecast.mjs';
import { createAssistant } from '../server/assistant.mjs';
import { createSiteFetch } from '../server/worker.mjs';
import { forecastFromOpenMeteo } from '../src/lib/open-meteo.mjs';
import { loadLiveForecast } from '../src/lib/forecast-client.mjs';

const city = { id: 'delhi', lat: 28.61, lon: 77.21 };
const nativeFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = nativeFetch; });

function provider({ offset = 0, gapAt = -1, status = 200 } = {}) {
  const current = Math.floor(Date.now() / 3_600_000) * 3600 + offset;
  const time = Array.from({ length: 49 }, (_, index) => current - 86_400 + 3600 + index * 3600 - 3600);
  const pm2_5 = time.map((_, index) => (index === gapAt ? null : 50 + index));
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(String(url));
    return status === 200 ? Response.json({ current: { time: current, pm2_5: 80 }, hourly: { time, pm2_5 } }) : new Response(null, { status });
  };
  return calls;
}

describe('forecastFromOpenMeteo', () => {
  test('requests CAMS PM2.5 for the city and returns 24 complete future hours', async () => {
    const calls = provider();
    const air = await forecastFromOpenMeteo(city);
    const url = new URL(calls[0]);
    assert.equal(url.origin, 'https://air-quality-api.open-meteo.com');
    assert.equal(url.searchParams.get('domains'), 'cams_global');
    assert.equal(url.searchParams.get('latitude'), '28.61');
    assert.equal(air.mode, 'live');
    assert.equal(air.pm, 80);
    assert.equal(air.hours.length, 24);
    assert.ok(air.hours.every((hour, index) => index === 0 || hour.time - air.hours[index - 1].time === 3600));
  });

  test('rejects provider errors', async () => {
    provider({ status: 502 });
    await assert.rejects(forecastFromOpenMeteo(city), /unavailable/);
  });

  test('rejects stale data', async () => {
    provider({ offset: -3 * 3600 });
    await assert.rejects(forecastFromOpenMeteo(city), /timestamp/);
  });

  test('rejects forecasts with missing hours', async () => {
    provider({ gapAt: 30 });
    await assert.rejects(forecastFromOpenMeteo(city), /coverage/);
  });
});

describe('createForecastReader', () => {
  test('shares one request between concurrent callers and caches the result', async () => {
    let loads = 0;
    const read = createForecastReader(async () => { loads++; return { pm: 1 }; });
    await Promise.all([read(city), read(city), read(city)]);
    await read(city);
    assert.equal(loads, 1);
  });

  test('does not cache failures', async () => {
    let loads = 0;
    const read = createForecastReader(async () => { loads++; throw new Error('down'); });
    await assert.rejects(read(city));
    await assert.rejects(read(city));
    assert.equal(loads, 2);
  });

  test('starts the cache lifetime after completion and never replaces a pending request', async () => {
    let now = 0;
    let finish;
    let loads = 0;
    const read = createForecastReader(() => {
      loads++;
      return new Promise(resolve => { finish = resolve; });
    }, () => now);
    const first = read(city);
    await Promise.resolve();
    now = 300_001;
    assert.equal(read(city), first);
    finish({ pm: 1 });
    await first;
    assert.equal(read(city), first);
    now += 300_000;
    const next = read(city);
    await Promise.resolve();
    assert.equal(loads, 2);
    finish({ pm: 2 });
    assert.deepEqual(await next, { pm: 2 });
  });
});

describe('loadLiveForecast', () => {
  test('uses a complete, recent API response for the requested city', async () => {
    provider();
    const air = await forecastFromOpenMeteo(city);
    const actual = await loadLiveForecast(city, new AbortController().signal, async url => {
      assert.equal(url, '/api/forecast?city=delhi');
      return Response.json(air);
    });
    assert.deepEqual(actual, air);
  });

  test('falls back to the provider after malformed, mismatched or stale API responses', async () => {
    const calls = provider();
    const air = await forecastFromOpenMeteo(city);
    for (const apiResponse of [
      new Response('<html>Airshift</html>'),
      Response.json({ ...air, hours: [null] }),
      Response.json({ ...air, city: 'pune' }),
      Response.json({ ...air, validAt: Date.now() - 3 * 3600 * 1000 }),
      Response.json({ ...air, hours: air.hours.map(point => ({ ...point, day: 'invalid' })) }),
      new Response(null, { status: 503 })
    ]) {
      const actual = await loadLiveForecast(city, new AbortController().signal, (url, options) =>
        String(url).startsWith('/api/') ? apiResponse : globalThis.fetch(url, options));
      assert.deepEqual(actual, air);
    }
    assert.equal(calls.length, 7);
  });

  test('does not start the fallback once the request has been cancelled', async () => {
    const controller = new AbortController();
    let attempts = 0;
    const request = loadLiveForecast(city, controller.signal, async () => {
      attempts++;
      controller.abort();
      return new Response(null, { status: 503 });
    });
    await assert.rejects(request, { name: 'AbortError' });
    assert.equal(attempts, 1);
  });
});

test('the shared forecast endpoint returns validated data and a retryable provider failure', async () => {
  const worker = createSiteFetch({});
  const request = new Request('https://airshift.example/api/forecast?city=delhi');
  provider({ status: 502 });
  const unavailable = await worker(request);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('cache-control'), 'no-store');

  provider();
  const result = await worker(request);
  assert.equal(result.status, 200);
  const forecast = await result.json();
  assert.equal(forecast.city, 'delhi');
  assert.equal(forecast.hours.length, 24);
});

describe('createAssistant without Gemini', () => {
  const ask = createAssistant(undefined, 'test-model');

  test('validates question length', async () => {
    assert.equal((await ask({ question: '   ' })).status, 400);
    assert.equal((await ask({ question: 42 })).status, 400);
    assert.equal((await ask(null)).status, 400);
    assert.equal((await ask({ question: 'x'.repeat(601) })).status, 400);
  });

  test('tells the client to use guided mode', async () => {
    assert.deepEqual(await ask({ question: 'Can I go for a run?' }), { status: 200, data: { mode: 'local' } });
  });
});

describe('createAssistant with Gemini', () => {
  test('falls back to guided answers on malformed model output', async () => {
    globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] });
    const result = await createAssistant('key', 'model')({ question: 'What about cooking?' });
    assert.equal(result.status, 200);
    assert.equal(result.data.degraded, true);
    assert.deepEqual(result.data.actions, ['kitchen']);
  });

  test('falls back when the model only returns unknown actions', async () => {
    globalThis.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ actions: ['delete-db'], format: 'checklist', constraints: [] }) }] } }] });
    const result = await createAssistant('key', 'model')({ question: 'Windows?' });
    assert.equal(result.data.degraded, true);
  });

  test('retains relevant previous context when Gemini fails on a follow-up', async () => {
    globalThis.fetch = async () => new Response(null, { status: 503 });
    const result = await createAssistant('key', 'model')({
      question: 'What about cooking?', context: ['I do not have transit', '   ', 'I don’t have an air purifier']
    });
    assert.deepEqual(result.data.actions, ['kitchen']);
    assert.deepEqual(result.data.constraints, ['no-purifier']);
    assert.equal(result.data.degraded, true);
  });

  test('ignores thought parts and clamps forecast values sent to the model', async () => {
    let sent;
    globalThis.fetch = async (_url, options) => {
      sent = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
      return Response.json({ candidates: [{ content: { parts: [
        { thought: true, text: 'reasoning' },
        { text: JSON.stringify({ actions: ['home'], format: 'schedule', constraints: ['sensitive'] }) }
      ] } }] });
    };
    const result = await createAssistant('key', 'model')({ question: 'Indoor air?', air: { pm: 99_999, mean: -5 } });
    assert.deepEqual(result.data, { mode: 'gemini', actions: ['home'], format: 'schedule', constraints: ['sensitive'] });
    assert.equal(sent.modeledPM25.pm, 2000);
    assert.equal(sent.modeledPM25.mean, 0);
  });
});
