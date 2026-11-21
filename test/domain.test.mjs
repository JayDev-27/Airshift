import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  band, cities, defaultProfile, demoForecast, formatHour, formatHourShort,
  getPlan, localAnswer, normalizeProfile, recommendedWindow, sources
} from '../src/domain.mjs';

describe('normalizeProfile', () => {
  test('returns defaults for missing or non-object input', () => {
    for (const input of [undefined, null, 'delhi', 42, []]) {
      assert.deepEqual(normalizeProfile(input), defaultProfile);
    }
  });

  test('keeps valid values and ignores unknown keys', () => {
    const profile = normalizeProfile({ city: 'mumbai', household: 'adult', purifier: true, injected: '<script>' });
    assert.equal(profile.city, 'mumbai');
    assert.equal(profile.household, 'adult');
    assert.equal(profile.purifier, true);
    assert.equal('injected' in profile, false);
  });

  test('rejects wrong types instead of coercing them', () => {
    const profile = normalizeProfile({ sensitive: 'false', km: '20', household: 'admin' });
    assert.equal(profile.sensitive, defaultProfile.sensitive);
    assert.equal(profile.km, defaultProfile.km);
    assert.equal(profile.household, defaultProfile.household);
  });

  test('clamps and rounds numeric ranges', () => {
    const high = normalizeProfile({ km: 9999, efficiency: 999, outdoorMinutes: 1000, usualHour: 23 });
    assert.deepEqual([high.km, high.efficiency, high.outdoorMinutes, high.usualHour], [250, 60, 180, 19]);
    const low = normalizeProfile({ km: -1, efficiency: 1, outdoorMinutes: 1, usualHour: 0 });
    assert.deepEqual([low.km, low.efficiency, low.outdoorMinutes, low.usualHour], [0, 4, 10, 6]);
    assert.equal(normalizeProfile({ km: 12.6 }).km, 13);
    assert.equal(normalizeProfile({ km: Number.NaN }).km, defaultProfile.km);
    assert.equal(normalizeProfile({ km: Infinity }).km, defaultProfile.km);
  });
});

describe('band', () => {
  test('follows CPCB PM2.5 category boundaries', () => {
    assert.deepEqual(band(0), ['Good', 'good']);
    assert.deepEqual(band(250.4), ['Very poor', 'very-poor']);
    assert.deepEqual(band(251), ['Severe', 'severe']);
  });

  test('labels non-numeric readings as unavailable', () => {
    assert.equal(band(Number.NaN)[0], 'Unavailable');
  });
});

describe('formatting', () => {
  test('formats 12-hour clock labels', () => {
    assert.equal(formatHour(0), '12:00 AM');
    assert.equal(formatHour(12), '12:00 PM');
    assert.equal(formatHour(19), '7:00 PM');
    assert.equal(formatHourShort(8), '8 AM');
  });
});

describe('demoForecast', () => {
  test('is labeled as a demo and scales by city', () => {
    const delhi = demoForecast('delhi');
    const chennai = demoForecast('chennai');
    assert.equal(delhi.mode, 'demo');
    assert.equal(delhi.validAt, null);
    assert.ok(delhi.hours.every(hour => hour.day === 'Winter demo'));
    assert.ok(chennai.pm < delhi.pm);
    assert.deepEqual(demoForecast('unknown').hours, delhi.hours);
  });
});

describe('recommendedWindow', () => {
  test('finds the lowest-pollution start and the reduction against the usual hour', () => {
    const window = recommendedWindow(demoForecast(), defaultProfile);
    assert.equal(window.usual.hour, 8);
    assert.equal(window.best.hour, 14);
    assert.ok(window.reduction > 50);
  });

  test('weights a partial final hour by its share of the activity', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ day: 'Winter demo', hour, pm: hour === 10 ? 200 : 100 }));
    const window = recommendedWindow({ mode: 'demo', hour: 9, hours }, { ...defaultProfile, outdoorMinutes: 90, usualHour: 9 });
    assert.equal(window.usual.pm, 133);
  });

  test('never schedules before 7 AM or past 8 PM', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ day: 'Winter demo', hour, pm: hour < 7 || hour > 19 ? 1 : 100 }));
    const window = recommendedWindow({ mode: 'demo', hour: 0, hours }, defaultProfile);
    assert.ok(window.best.hour >= 7 && window.best.hour <= 19);
  });
});

describe('getPlan', () => {
  test('every action links to a defined source', () => {
    for (const city of cities) {
      for (const household of ['family', 'adult', 'outdoor', 'community']) {
        const plan = getPlan({ ...defaultProfile, city: city.id, household }, demoForecast(city.id));
        for (const action of plan.actions) {
          assert.ok(action.sources.every(id => sources[id]?.url.startsWith('https://')), `${city.id}/${action.id}`);
        }
      }
    }
  });

  test('computes tailpipe CO2 from distance and fuel economy', () => {
    const plan = getPlan({ ...defaultProfile, km: 28, efficiency: 14 }, demoForecast());
    assert.equal(plan.tailpipeKg, 28 * 2.35 / 14);
    assert.match(plan.actions.find(action => action.id === 'transport').impact, /4\.7 kg/);
  });

  test('reports no avoided emissions when the household does not drive', () => {
    const plan = getPlan({ ...defaultProfile, drive: false }, demoForecast());
    assert.equal(plan.tailpipeKg, 0);
    assert.match(plan.actions.find(action => action.id === 'transport').title, /low-emission/);
  });

  test('uses a purifier action when the household has one', () => {
    const plan = getPlan({ ...defaultProfile, purifier: true }, demoForecast());
    assert.match(plan.actions.find(action => action.id === 'home').title, /HEPA/);
  });

  test('suggests a time shift on cleaner days instead of moving indoors', () => {
    const plan = getPlan({ ...defaultProfile, city: 'chennai', sensitive: false, household: 'adult' }, demoForecast('chennai'));
    assert.equal(plan.indoorOnly, false);
    assert.equal(plan.outdoorMinutes, 0);
  });

  test('community groups start with the coordination action', () => {
    const plan = getPlan({ ...defaultProfile, household: 'community' }, demoForecast());
    assert.deepEqual(plan.initial, ['activity', 'home', 'community']);
    assert.deepEqual(plan.actions.find(action => action.id === 'community').sources, ['school', 'caqm']);
  });

  test('uses bus guidance in cities without a metro', () => {
    const plan = getPlan({ ...defaultProfile, city: 'patna' }, demoForecast('patna'));
    assert.match(plan.actions.find(action => action.id === 'transport').title, /bus/);
  });
});

describe('localAnswer', () => {
  const plan = getPlan(defaultProfile, demoForecast());

  test('routes topics to reviewed actions, limited to three', () => {
    const answer = localAnswer('Cooking, windows, school run and the metro?', plan);
    assert.equal(answer.mode, 'local');
    assert.equal(answer.actions.length, 3);
    assert.ok(answer.actions.every(id => plan.actions.some(action => action.id === id)));
  });

  test('detects practical constraints', () => {
    const answer = localAnswer("I can't reschedule, have asthma and no public transport or purifier", plan);
    assert.deepEqual(answer.constraints.sort(), ['fixed-time', 'no-transit', 'sensitive'].sort());
    assert.deepEqual(localAnswer('We do not have any purifier, without an air purifier', plan).constraints, ['no-purifier']);
  });

  test('chooses group and schedule formats', () => {
    assert.equal(localAnswer('Make a note for our society', plan).format, 'group');
    assert.equal(localAnswer('Give me a schedule', plan).format, 'schedule');
  });

  test('understands Hindi keywords', () => {
    assert.deepEqual(localAnswer('रसोई में क्या करें?', plan).actions, ['kitchen']);
  });

  test('falls back to the initial plan for an unrelated question', () => {
    assert.deepEqual(localAnswer('Hello', plan).actions, plan.initial);
  });
});
