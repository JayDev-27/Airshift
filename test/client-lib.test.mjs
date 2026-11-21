import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { cities, defaultProfile, demoForecast, getPlan } from '../src/domain.mjs';
import { buildReply, requestAnswer } from '../src/lib/assistant-client.mjs';
import { PREFERENCES_KEY } from '../src/lib/constants.mjs';
import {
  applyConstraints, chartScale, dataStatusLabel, groupMessage, isFollowUp, purifierCadr, toggleId
} from '../src/lib/planning.mjs';
import { loadPreferences, savePreferences } from '../src/lib/preferences.mjs';

const delhi = cities.find(city => city.id === 'delhi');
const mumbai = cities.find(city => city.id === 'mumbai');
const air = demoForecast();

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), data };
}

describe('groupMessage', () => {
  const actions = [{ title: 'Move play indoors', description: 'Use a cleaner room.' }];

  test('labels demo readings and links official sources', () => {
    const text = groupMessage(delhi, air, actions);
    assert.match(text, /^Airshift community plan · New Delhi/);
    assert.match(text, /Practice scenario/);
    assert.match(text, /• Move play indoors\. Use a cleaner room\./);
    assert.match(text, /airquality\.cpcb\.gov\.in/);
    assert.match(text, /caqm\.nic\.in/);
  });

  test('dates live forecasts and omits NCR advisories elsewhere', () => {
    const text = groupMessage(mumbai, { mode: 'live', validAt: Date.UTC(2026, 10, 21, 6) }, actions);
    assert.match(text, /regional PM₂\.₅ forecast for 21 Nov 2026/);
    assert.doesNotMatch(text, /caqm/);
  });
});

describe('dataStatusLabel', () => {
  test('describes demo and live data', () => {
    assert.equal(dataStatusLabel(air), 'Synthetic winter readings');
    assert.match(dataStatusLabel({ mode: 'live', validAt: Date.UTC(2026, 10, 21, 6) }), /^Model valid at .+ IST$/);
  });
});

describe('purifierCadr', () => {
  test('applies the EPA rule of thumb within the supported range', () => {
    assert.equal(purifierCadr(15), 183);
    assert.equal(purifierCadr('20'), 244);
    assert.equal(purifierCadr(5), 61);
  });

  test('rejects missing or out-of-range areas', () => {
    for (const value of ['', 'abc', 4, 101, Number.NaN]) assert.equal(purifierCadr(value), null);
  });
});

describe('applyConstraints', () => {
  test('applies each constraint without mutating the profile', () => {
    const profile = { ...defaultProfile, purifier: true, transit: true, flexible: true, sensitive: false };
    const adjusted = applyConstraints(profile, ['no-purifier', 'no-transit', 'fixed-time', 'sensitive']);
    assert.deepEqual(
      [adjusted.purifier, adjusted.transit, adjusted.flexible, adjusted.sensitive],
      [false, false, false, true]
    );
    assert.equal(profile.purifier, true);
  });

  test('ignores unknown or missing constraints', () => {
    assert.deepEqual(applyConstraints(defaultProfile, ['invented']), defaultProfile);
    assert.deepEqual(applyConstraints(defaultProfile), defaultProfile);
  });
});

describe('small helpers', () => {
  test('detects follow-up questions', () => {
    assert.equal(isFollowUp('What about cooking?'), true);
    assert.equal(isFollowUp('  and the windows?'), true);
    assert.equal(isFollowUp('Can I open my windows?'), false);
  });

  test('toggles IDs immutably', () => {
    const list = ['home'];
    assert.deepEqual(toggleId(list, 'transport'), ['home', 'transport']);
    assert.deepEqual(toggleId(list, 'home'), []);
    assert.deepEqual(list, ['home']);
  });

  test('chooses tidy chart gridlines', () => {
    assert.deepEqual(chartScale(412), { step: 200, ceiling: 600 });
    assert.deepEqual(chartScale(10), { step: 10, ceiling: 40 });
    assert.deepEqual(chartScale(95), { step: 30, ceiling: 120 });
  });
});

describe('preferences', () => {
  test('falls back to defaults for missing, malformed or throwing storage', () => {
    const expected = getPlan(defaultProfile, demoForecast()).initial;
    assert.deepEqual(loadPreferences(undefined).picked, expected);
    assert.deepEqual(loadPreferences(memoryStorage({ [PREFERENCES_KEY]: '{' })).profile, defaultProfile);
    assert.deepEqual(loadPreferences({ getItem: () => { throw new Error('blocked'); } }).profile, defaultProfile);
  });

  test('restores a valid profile and drops unknown or duplicate actions', () => {
    const storage = memoryStorage({
      [PREFERENCES_KEY]: JSON.stringify({ profile: { city: 'pune', km: 999 }, picked: ['home', 'home', 'drop-table'] })
    });
    const { profile, picked } = loadPreferences(storage);
    assert.equal(profile.city, 'pune');
    assert.equal(profile.km, 250);
    assert.deepEqual(picked, ['home']);
  });

  test('saves preferences and tolerates storage failures', () => {
    const storage = memoryStorage();
    savePreferences(storage, { profile: defaultProfile, picked: ['home'] });
    assert.deepEqual(JSON.parse(storage.data.get(PREFERENCES_KEY)).picked, ['home']);
    assert.doesNotThrow(() => savePreferences({ setItem: () => { throw new Error('full'); } }, {}));
    assert.doesNotThrow(() => savePreferences(undefined, {}));
  });
});

describe('requestAnswer', () => {
  const base = { question: 'What about cooking?', recent: ['Can I open my windows?'], profile: defaultProfile, air };

  test('uses the guided answer when Gemini is off, without calling the server', async () => {
    let called = false;
    const answer = await requestAnswer({ ...base, gemini: false, fetcher: async () => { called = true; } });
    assert.equal(answer.mode, 'local');
    assert.deepEqual(answer.actions, ['kitchen']);
    assert.equal(called, false);
  });

  test('returns Gemini selections and sends only the needed context', async () => {
    let sent;
    const fetcher = async (url, options) => {
      sent = { url, body: JSON.parse(options.body) };
      return Response.json({ mode: 'gemini', actions: ['home'], format: 'checklist', constraints: [] });
    };
    const answer = await requestAnswer({ ...base, gemini: true, fetcher });
    assert.equal(answer.mode, 'gemini');
    assert.equal(sent.url, '/api/assistant');
    assert.deepEqual(Object.keys(sent.body.air), ['pm', 'mean']);
  });

  test('falls back on server errors, local replies and network failures', async () => {
    for (const fetcher of [
      async () => new Response(null, { status: 503 }),
      async () => Response.json({ mode: 'local' }),
      async () => { throw new TypeError('offline'); }
    ]) {
      assert.equal((await requestAnswer({ ...base, gemini: true, fetcher })).mode, 'local');
    }
  });

  test('propagates cancellation', async () => {
    const fetcher = async () => { throw new DOMException('aborted', 'AbortError'); };
    await assert.rejects(requestAnswer({ ...base, gemini: true, fetcher }), { name: 'AbortError' });
  });
});

describe('buildReply', () => {
  test('builds cards from a plan that reflects the constraints', () => {
    const reply = buildReply({ actions: ['home', 'unknown'], constraints: ['no-purifier'] }, { ...defaultProfile, purifier: true }, air);
    assert.equal(reply.profile.purifier, false);
    assert.equal(reply.cards.length, 1);
    assert.match(reply.cards[0].title, /cleaner-air room/);
    assert.deepEqual(reply.constraints, ['no-purifier']);
  });

  test('defaults to no constraints', () => {
    assert.deepEqual(buildReply({ actions: ['kitchen'] }, defaultProfile, air).constraints, []);
  });
});
