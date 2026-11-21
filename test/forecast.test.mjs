import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { createForecastReader, forecastFromOpenMeteo } from '../server/forecast.mjs';
import { createAssistant } from '../server/assistant.mjs';

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
