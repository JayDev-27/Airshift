import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import { cities, band, defaultProfile, demoForecast, getPlan, localAnswer, normalizeProfile, recommendedWindow } from '../src/domain.mjs';
import { photoCredits } from '../src/city-photos.mjs';
import { createSiteFetch } from '../server/worker.mjs';

test('every supported city has a distinct photo, a full demo day and sourced plan actions', () => {
  const photoLinks = new Set();
  for (const city of cities) {
    const air = demoForecast(city.id);
    const plan = getPlan({ ...defaultProfile, city: city.id }, air);
    assert.equal(air.hours.length, 24);
    assert.ok(plan.window.best);
    assert.ok(plan.actions.every(action => action.sources.length));
    assert.ok(photoCredits[city.id].author);
    photoLinks.add(photoCredits[city.id].link);
  }
  assert.equal(photoLinks.size, cities.length);
});

test('severe family scenario produces transparent impact figures', () => {
  const plan = getPlan(defaultProfile, demoForecast());
  assert.equal(plan.outdoorMinutes, 30);
  assert.equal(plan.window.best.hour, 14);
  assert.equal(plan.tailpipeKg.toFixed(1), '2.0');
  assert.equal(plan.usableShift, false);
  assert.deepEqual([30, 31, 60, 61, 90, 91, 120, 121, 250, 251].map(pm => band(pm)[0]),
    ['Good', 'Satisfactory', 'Satisfactory', 'Moderate', 'Moderate', 'Poor', 'Poor', 'Very poor', 'Very poor', 'Severe']);
});

test('fixed-shift worker, quantified transport and optional household details stay consistent', () => {
  const profile = normalizeProfile({ city: 'invalid', household: 'outdoor', flexible: false, transit: false, km: -10, efficiency: 0 });
  assert.equal(profile.city, 'delhi');
  assert.equal(profile.km, 0);
  assert.equal(profile.efficiency, 4);
  const plan = getPlan(profile, demoForecast());
  assert.equal(plan.outdoorMinutes, 0);
  assert.equal(plan.tailpipeKg, 0);
  assert.match(plan.actions[0].title, /Shorten/);
});

test('activity comparisons reject past hours, missing slots and cross-day windows', () => {
  const now = Math.floor(Date.now() / 1000);
  const air = { mode: 'live', hours: [
    { day: 'Today', hour: 13, pm: 1, time: now - 3600 },
    { day: 'Today', hour: 14, pm: 12, time: now + 1 },
    { day: 'Today', hour: 16, pm: 8, time: now + 7200 },
    { day: 'Tomorrow', hour: 17, pm: 8, time: now + 10800 }
  ] };
  const window = recommendedWindow(air, { ...defaultProfile, outdoorMinutes: 90, usualHour: 13 });
  assert.equal(window.best, undefined);
  assert.equal(window.reduction, null);
});

test('guided follow-ups answer the current topic and retain relevant practical constraints', () => {
  const plan = getPlan(defaultProfile, demoForecast());
  const answer = localAnswer('What about cooking?', plan, 'Can I open my windows if I have no purifier?');
  assert.deepEqual(answer.actions, ['kitchen']);
  assert.deepEqual(answer.constraints, ['no-purifier']);
});

test('production API validates inputs, protects responses and restricts Gemini output', async t => {
  const provider = `
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('air-quality-api.open-meteo.com')) {
        const current = Math.floor(Date.now() / 3_600_000) * 3600;
        const time = Array.from({length:49}, (_, index) => current - 88_200 + index * 3600);
        const pm = time.map(() => 71);
        if (String(url).includes('latitude=25.61')) pm[30] = null;
        return Response.json({current:{time:current,pm2_5:75},hourly:{time,pm2_5:pm}});
      }
      if (!String(url).includes('generativelanguage.googleapis.com')) return nativeFetch(url, options);
      const body = JSON.parse(options.body);
      const input = JSON.parse(body.contents[0].parts[0].text);
      if (input.question === 'Simulate outage') return new Response(null, { status: 503 });
      if (options.headers['x-goog-api-key'] !== 'key-for-local-test' ||
          input.precedingQuestions.length !== 2 || input.precedingQuestions[1].length !== 600 ||
          !body.generationConfig.responseJsonSchema) return new Response(null, { status: 400 });
      const reply = { actions:['kitchen','unknown','kitchen'], format:'invented', constraints:['no-purifier','invented'] };
      return Response.json({ candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}] });
    };
  `;
  const importURL = 'data:application/javascript;base64,' + Buffer.from(provider).toString('base64');
  const server = spawn(process.execPath, ['--import', importURL, 'server/index.mjs'], {
    env: { ...process.env, PORT: '0', GEMINI_API_KEY: 'key-for-local-test' }, stdio: ['ignore', 'pipe', 'inherit']
  });
  t.after(() => server.kill());
  const [ready] = await once(server.stdout, 'data');
  const address = String(ready).match(/http:\/\/localhost:\d+/)?.[0];
  assert.ok(address);
  const send = body => fetch(address + '/api/assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body
  });
  const status = await fetch(address + '/api/status');
  assert.equal(status.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(status.headers.get('cache-control'), 'no-store');
  assert.match(status.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(JSON.stringify(await status.json()).includes('key-for-local-test'), false);
  assert.equal((await fetch(address + '/api/forecast?city=unsupported')).status, 400);
  const forecast = await (await fetch(address + '/api/forecast?city=delhi')).json();
  assert.equal(forecast.hours.length, 24);
  assert.equal(forecast.hours[0].time * 1000 - forecast.validAt, 1_800_000);
  assert.equal((await fetch(address + '/api/forecast?city=patna')).status, 503);
  assert.equal((await send('{')).status, 400);
  assert.equal((await send(JSON.stringify({ question: 'x'.repeat(601) }))).status, 400);
  assert.equal((await send(JSON.stringify({ question: 'x'.repeat(13_000) }))).status, 413);
  const payload = JSON.stringify({ question: 'What about cooking?', context: ['older', 'Can I open the windows?', 'x'.repeat(900)] });
  assert.deepEqual(await (await send(payload)).json(), {
    mode: 'gemini', actions: ['kitchen'], format: 'checklist', constraints: ['no-purifier']
  });
  assert.equal((await (await send(JSON.stringify({ question: 'Simulate outage' }))).json()).degraded, true);
  for (let index = 0; index < 28; index++) assert.equal((await send(payload)).status, 200);
  assert.equal((await send(payload)).status, 429);

  await t.test('the Express and Worker APIs return the same validation errors', async () => {
    const worker = createSiteFetch({});
    const assistant = { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' } };
    const cases = [
      ['/api', {}, 404],
      ['/api/status', { method: 'POST' }, 404],
      ['/API/FORECAST/?city=delhi&city=mumbai', {}, 400],
      ['/api/assistant', { ...assistant, body: '{' }, 400],
      ['/api/assistant', { ...assistant, body: 'null' }, 400],
      ['/api/assistant', { ...assistant, body: Buffer.from([0x22, 0xff, 0x22]) }, 400],
      ['/api/assistant', { ...assistant, body: JSON.stringify({ question: 'é'.repeat(7000) }) }, 413],
      ['/api/assistant', { ...assistant, body: payload, headers: { 'Content-Type': 'text/plain' } }, 415],
      ['/api/assistant', { ...assistant, body: payload, headers: { ...assistant.headers, 'Content-Encoding': 'gzip' } }, 415]
    ];
    for (const [path, options, expectedStatus] of cases) {
      const [expressResponse, workerResponse] = await Promise.all([
        fetch(address + path, options),
        worker(new Request(`https://airshift.example${path}`, options))
      ]);
      assert.equal(expressResponse.status, expectedStatus, path);
      assert.equal(workerResponse.status, expectedStatus, path);
      assert.equal(workerResponse.headers.get('cache-control'), expressResponse.headers.get('cache-control'), path);
      assert.deepEqual(await workerResponse.json(), await expressResponse.json(), path);
    }
    for (const response of await Promise.all([
      fetch(address + '/api/status', { method: 'HEAD' }),
      worker(new Request('https://airshift.example/api/status', { method: 'HEAD' }))
    ])) {
      assert.equal(response.status, 200);
      assert.equal(await response.text(), '');
    }
  });
});

test('hosted Worker serves the UI and mirrors guided API behavior', async () => {
  const handler = createSiteFetch({ '/index.html': { type: 'text/html', data: Buffer.from('<title>Airshift</title>').toString('base64') } });
  const sheet = await handler(new Request('https://airshift.example/'));
  assert.equal(sheet.headers.get('content-type'), 'text/html');
  assert.match(await sheet.text(), /Airshift/);
  const status = await handler(new Request('https://airshift.example/api/status'));
  assert.deepEqual(await status.json(), { gemini: false });
  const question = await handler(new Request('https://airshift.example/api/assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'Can I open my windows?' })
  }));
  assert.deepEqual(await question.json(), { mode: 'local' });
  const oversized = await handler(new Request('https://airshift.example/api/assistant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(13_000)
  }));
  assert.equal(oversized.status, 413);
  assert.equal((await handler(new Request('https://airshift.example/assets/missing.js'))).status, 404);
});
