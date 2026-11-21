export const cities = [
  { id: 'delhi', name: 'New Delhi', region: 'Delhi', lat: 28.61, lon: 77.21, metro: true, ncr: true },
  { id: 'gurugram', name: 'Gurugram', region: 'Haryana', lat: 28.46, lon: 77.03, metro: true, ncr: true },
  { id: 'noida', name: 'Noida', region: 'Uttar Pradesh', lat: 28.54, lon: 77.39, metro: true, ncr: true },
  { id: 'ghaziabad', name: 'Ghaziabad', region: 'Uttar Pradesh', lat: 28.67, lon: 77.45, metro: true, ncr: true },
  { id: 'lucknow', name: 'Lucknow', region: 'Uttar Pradesh', lat: 26.85, lon: 80.95, metro: true },
  { id: 'patna', name: 'Patna', region: 'Bihar', lat: 25.61, lon: 85.14, metro: false },
  { id: 'chandigarh', name: 'Chandigarh', region: 'Chandigarh', lat: 30.73, lon: 76.78, metro: false },
  { id: 'jaipur', name: 'Jaipur', region: 'Rajasthan', lat: 26.91, lon: 75.79, metro: true },
  { id: 'mumbai', name: 'Mumbai', region: 'Maharashtra', lat: 19.08, lon: 72.88, metro: true },
  { id: 'pune', name: 'Pune', region: 'Maharashtra', lat: 18.52, lon: 73.86, metro: true },
  { id: 'kolkata', name: 'Kolkata', region: 'West Bengal', lat: 22.57, lon: 88.36, metro: true },
  { id: 'bengaluru', name: 'Bengaluru', region: 'Karnataka', lat: 12.97, lon: 77.59, metro: true },
  { id: 'hyderabad', name: 'Hyderabad', region: 'Telangana', lat: 17.39, lon: 78.49, metro: true },
  { id: 'chennai', name: 'Chennai', region: 'Tamil Nadu', lat: 13.08, lon: 80.27, metro: true }
];

export const sources = {
  cpcb: { name: 'CPCB · National AQI methodology', url: 'https://app.cpcbccr.com/ccr_docs/FINAL-REPORT_AQI_.pdf', note: 'India’s index uses pollutant sub-indices and monitoring rules.' },
  official: { name: 'CPCB · Official station readings', url: 'https://airquality.cpcb.gov.in/AQI_India/', note: 'Check current nearby readings before changing plans.' },
  meteo: { name: 'Open-Meteo · Air Quality API', url: 'https://open-meteo.com/en/docs/air-quality-api', note: 'CAMS Global forecasts have approximately 45 km resolution.' },
  cams: { name: 'Copernicus · CAMS', url: 'https://atmosphere.copernicus.eu/', note: 'Atmospheric composition forecasts.' },
  who: { name: 'WHO · Global air quality guidelines', url: 'https://www.who.int/publications/i/item/9789240034228', note: 'Health-based exposure guidance for PM₂.₅ and other pollutants.' },
  room: { name: 'US EPA · Cleaner air rooms', url: 'https://www.epa.gov/wildfires/how-create-cleaner-air-room-home', note: 'Reducing indoor particle sources and setting up a cleaner room.' },
  filter: { name: 'US EPA · Home air cleaners', url: 'https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home', note: 'Consider room size and smoke CADR. Avoid ozone generators.' },
  school: { name: 'AirNow · Outdoor activity for schools', url: 'https://www.airnow.gov/publications/activity-guides/air-quality-and-outdoor-activity-guidance-for-schools/', note: 'Guidance for adjusting children’s outdoor activities during pollution episodes.' },
  smoke: { name: 'US EPA · Reduce smoke exposure', url: 'https://www.epa.gov/wildfire-smoke-course/strategies-reduce-exposure-outdoors', note: 'Limit time and exertion outdoors. A snug respirator can reduce particle exposure.' },
  caqm: { name: 'CAQM · Delhi-NCR advisories', url: 'https://caqm.nic.in/', note: 'Check local orders before planning school or community activities.' },
  fuel: { name: 'US EPA · Passenger vehicle emissions', url: 'https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle', note: 'Burning a litre of petrol releases approximately 2.35 kg of tailpipe CO₂.' },
  metro: { name: 'DMRC · CarbonLite Metro Travel', url: 'https://delhimetrorail.com/carbonlite-metro-travel', note: 'Delhi Metro commissioned a comparison per passenger-kilometre.' }
};

export const defaultProfile = {
  city: 'delhi', household: 'family', sensitive: true, purifier: false, transit: true,
  flexible: true, drive: true, km: 12, efficiency: 14, outdoorMinutes: 30, usualHour: 8
};

/**
 * Coerce untrusted profile input to a valid planning profile. Unknown keys are
 * dropped, enums fall back to defaults and numbers are clamped to safe ranges.
 * @param {unknown} [input]
 * @returns {typeof defaultProfile}
 */
export function normalizeProfile(input = {}) {
  const base = { ...defaultProfile };
  if (!input || typeof input !== 'object') return base;
  if (cities.some(city => city.id === input.city)) base.city = input.city;
  if (['family', 'adult', 'outdoor', 'community'].includes(input.household)) base.household = input.household;
  for (const key of ['sensitive', 'purifier', 'transit', 'flexible', 'drive']) {
    if (typeof input[key] === 'boolean') base[key] = input[key];
  }
  for (const [key, min, max] of [['km', 0, 250], ['efficiency', 4, 60], ['outdoorMinutes', 10, 180], ['usualHour', 6, 19]]) {
    if (typeof input[key] === 'number' && Number.isFinite(input[key])) base[key] = Math.round(Math.min(max, Math.max(min, input[key])));
  }
  return base;
}

export const householdNames = { family: 'Family with children', adult: 'Adult household', outdoor: 'Outdoor worker', community: 'Community / school' };

const sample = [305, 318, 333, 350, 368, 387, 403, 412, 396, 354, 306, 241, 181, 146, 127, 141, 172, 212, 257, 286, 314, 327, 336, 345];
const sampleByCity = { delhi: 1, gurugram: .94, noida: 1.04, ghaziabad: 1.08, lucknow: .69, patna: .74, chandigarh: .42, jaipur: .39, mumbai: .20, pune: .16, kolkata: .44, bengaluru: .12, hyderabad: .18, chennai: .11 };
const SEVERE_PM25 = 250;
const PETROL_CO2_KG_PER_LITRE = 2.35;
const MINIMUM_SHIFT_IMPROVEMENT = 5;
export const formatHour = hour => `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
export const formatHourShort = hour => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;

/**
 * Synthetic, clearly labeled winter-smog day scaled for each city.
 * @param {string} [city]
 */
export function demoForecast(city = 'delhi') {
  const levels = sample.map(value => Math.round(value * (sampleByCity[city] ?? 1)));
  return {
    city, mode: 'demo', pm: levels[7], mean: Math.round(levels.reduce((sum, value) => sum + value, 0) / levels.length),
    hours: levels.map((pm, hour) => ({ pm, hour, day: 'Winter demo' })), hour: 7, validAt: null
  };
}

/**
 * Map PM₂.₅ (µg/m³) to the CPCB National AQI category for that pollutant.
 * @param {number} pm
 * @returns {[label: string, tone: string]}
 */
export function band(pm) {
  return [
    [30, 'Good', 'good'], [60, 'Satisfactory', 'good'], [90, 'Moderate', 'moderate'],
    [120, 'Poor', 'poor'], [250, 'Very poor', 'very-poor'], [Infinity, 'Severe', 'severe']
  ].find(([upper]) => Math.round(pm) <= upper)?.slice(1) ?? ['Unavailable', 'moderate'];
}

/**
 * Find the cleanest same-day outdoor window of the profile's duration between
 * 7 AM and 8 PM, skipping past hours, gaps and windows that cross midnight.
 * @returns {{ usual?: object, best?: object, reduction: number | null }}
 */
export function recommendedWindow(air, profile) {
  const duration = profile.outdoorMinutes / 60;
  const slotsNeeded = Math.ceil(duration);
  const hours = air.hours;
  const startIndex = air.mode === 'demo' ? air.hour : 0;
  const now = Date.now();
  let usual;
  let best;
  for (let index = startIndex; index + slotsNeeded <= hours.length; index++) {
    const start = hours[index];
    if (start.hour < 7 || start.hour + duration > 20) continue;
    if (air.mode === 'live' && (start.day !== hours[0].day || start.time * 1000 < now)) continue;
    let total = 0;
    for (let step = 0; step < slotsNeeded; step++) {
      const point = hours[index + step];
      if (point.day !== start.day || point.hour !== start.hour + step) {
        total = NaN;
        break;
      }
      total += point.pm * Math.min(1, duration - step);
    }
    if (!Number.isFinite(total)) continue;
    const slot = { ...start, pm: Math.round(total / duration) };
    if (!usual && slot.hour === profile.usualHour) usual = slot;
    if (!best || slot.pm < best.pm) best = slot;
  }
  const reduction = usual?.pm && best ? Math.max(0, Math.round(100 * (usual.pm - best.pm) / usual.pm)) : null;
  return { usual, best, reduction };
}

function activityAdvice(profile, { worker, group, indoorOnly, shiftHour, reduction }) {
  const usualTime = formatHour(profile.usualHour);
  if (worker) {
    if (shiftHour) return {
      title: 'Move intense tasks to a lower-pollution hour', when: shiftHour,
      description: `Ask to move the hardest tasks to ${shiftHour}. Keep exertion low and take breaks in a cleaner indoor space.`,
      impact: reduction > 0 ? `~${reduction}% lower outdoor PM₂.₅ during the same-length block.` : 'Shorter, less intense outdoor work can reduce particle exposure.'
    };
    return {
      title: 'Shorten higher-exertion outdoor tasks', when: 'During your shift',
      description: 'Use shorter outdoor blocks and take breaks indoors where possible. Consider a snug, certified N95 for unavoidable particle exposure if you can wear it safely.',
      impact: 'Shorter, less intense outdoor work can reduce particle exposure.'
    };
  }
  if (indoorOnly) {
    const activity = profile.household === 'family' ? 'play' : 'exercise';
    return {
      title: group ? 'Move group activities indoors' : 'Move outdoor activity indoors', when: usualTime,
      description: group ? 'Use a cleaner indoor venue. Confirm school and local advisories before setting the schedule.'
        : `Move the ${profile.outdoorMinutes}-minute ${activity} session to a cleaner indoor room. Keep necessary time outside brief.`,
      impact: `${profile.outdoorMinutes} outdoor minutes avoided if this activity moves inside.`
    };
  }
  if (shiftHour) return {
    title: 'Shift activity to a lower-pollution hour', when: shiftHour,
    description: `Try ${shiftHour} if local readings agree. Choose a quieter route away from traffic and adjust intensity as needed.`,
    impact: reduction > 0 ? `~${reduction}% lower modeled outdoor PM₂.₅ for the same duration.` : 'Less time and lower exertion outdoors when pollution rises.'
  };
  return {
    title: 'Keep activity light when air worsens', when: usualTime,
    description: 'Check current local readings before heading out. If pollution rises, shorten the session or switch to a cleaner indoor spot.',
    impact: 'Less time and lower exertion outdoors when pollution rises.'
  };
}

function transportAdvice(profile, city, tailpipeKg) {
  if (!profile.drive || !profile.km) return {
    title: 'Keep your trip low-emission',
    description: 'For optional errands, combine stops or use public transport where practical. During heavy pollution, keep outdoor transfers short.',
    impact: 'Fewer kilometres driven and less idling mean less tailpipe exhaust.'
  };
  if (profile.transit) return {
    title: city.metro ? 'Swap one petrol trip for the metro' : 'Swap one petrol trip for the bus',
    description: `If service and accessibility work for you, replace your ${profile.km} km petrol round trip with ${city.metro ? 'the metro' : 'a scheduled bus'}. Keep outdoor transfers short in heavy pollution.`,
    impact: `~${tailpipeKg.toFixed(1)} kg of petrol-car tailpipe CO₂ avoided if the full drive is replaced.`
  };
  return {
    title: 'Combine errands into one trip',
    description: 'Group nearby errands, skip optional trips, and switch off a parked engine where safe. Count only the kilometres you actually skip.',
    impact: 'Fewer kilometres driven and less idling mean less tailpipe exhaust.'
  };
}

/**
 * Build the reviewed action list and impact estimates for a profile and forecast.
 * Every figure is computed from explicit inputs so it can be explained in the UI.
 * @param {typeof defaultProfile} profile
 * @param {{ mode: 'demo' | 'live', pm: number, mean: number, hour?: number, hours: object[] }} air
 */
export function getPlan(profile, air) {
  const city = cities.find(entry => entry.id === profile.city) ?? cities[0];
  const outdoorWindow = recommendedWindow(air, profile);
  const { usual, best, reduction } = outdoorWindow;
  const sensitive = profile.sensitive || ['family', 'community'].includes(profile.household);
  const activityThreshold = sensitive ? 60 : 90;
  const highestReading = Math.max(air.mean, air.pm);
  const severe = air.mean > SEVERE_PM25 || air.pm > SEVERE_PM25;
  const indoorOnly = severe || (highestReading > activityThreshold && (!best || best.pm > activityThreshold));
  const group = profile.household === 'community';
  const worker = profile.household === 'outdoor';
  const tailpipeKg = profile.drive && profile.transit ? profile.km * PETROL_CO2_KG_PER_LITRE / profile.efficiency : 0;
  const relevantSources = group && city.ncr ? ['school', 'caqm'] : [worker ? 'smoke' : 'school'];
  const canShift = profile.flexible && best && (!usual || (reduction >= MINIMUM_SHIFT_IMPROVEMENT && usual.hour !== best.hour));
  const usableShift = Boolean(canShift && (!indoorOnly || worker));
  const shiftHour = usableShift ? formatHour(best.hour) : null;
  const actions = [
    {
      id: 'activity', icon: worker ? 'timer' : group ? 'users' : 'activity', category: 'Exposure', color: 'peach',
      ...activityAdvice(profile, { worker, group, indoorOnly, shiftHour, reduction }),
      sources: relevantSources
    },
    {
      id: 'home', icon: 'house', category: 'Indoor air', color: 'mint',
      title: profile.purifier ? 'Run your HEPA filter in one room' : 'Set up a cleaner-air room',
      when: 'At home',
      description: profile.purifier
        ? 'Run your HEPA purifier in the room people use most. Check the filter and smoke CADR against the room size. Keep indoor smoke sources out.'
        : 'Pick a room away from cooking. Skip incense, candles and smoking. Avoid high-heat frying when outdoor air is heavily polluted.',
      impact: profile.purifier ? 'A correctly sized filter removes airborne particles as room air passes through it.' : 'Avoiding indoor smoke sources prevents additional particles from building up.',
      sources: ['room', 'filter']
    },
    {
      id: 'transport', icon: city.metro && profile.transit ? 'train' : 'car', category: 'Low emissions', color: 'blue',
      when: 'Next trip',
      ...transportAdvice(profile, city, tailpipeKg),
      sources: city.ncr && profile.transit ? ['fuel', 'metro'] : ['fuel']
    },
    {
      id: 'kitchen', icon: 'cooking', category: 'Indoor air', color: 'mint',
      title: 'Cook with less smoke',
      when: 'At mealtime',
      description: 'Choose a lower-smoke meal and avoid charring or deep frying. Use your kitchen’s outdoors-vented exhaust while cooking if available.',
      impact: 'Lower-smoke cooking reduces the particles released into your kitchen.',
      sources: ['room']
    },
    {
      id: 'windows', icon: 'wind', category: 'Indoor air', color: 'mint',
      title: 'Check readings before airing out',
      when: best ? formatHour(best.hour) : 'When readings improve',
      description: best && best.pm > 60
        ? 'The lower forecast period still has elevated particles. Keep windows shut during peaks if safe. Maintain ventilation required for fuel-burning equipment and check nearby readings before airing out.'
        : 'Check nearby readings before opening windows. Air out when outdoor conditions improve. Keep required ventilation for fuel-burning equipment.',
      impact: 'Timing ventilation can reduce the outdoor particles that enter your home.',
      sources: ['room', 'official']
    },
    {
      id: 'community', icon: 'users', category: 'Community', color: 'blue',
      title: 'Coordinate a cleaner-air plan',
      when: 'Before the next gathering',
      description: 'Share a check-in time, move strenuous activities to a cleaner indoor venue, and set up a no-idling pickup area.',
      impact: 'Indoor scheduling reduces outdoor time. A no-idling pickup area cuts exhaust at the entrance.',
      sources: relevantSources
    }
  ];
  return {
    actions, window: outdoorWindow, indoorOnly, usableShift,
    initial: group ? ['activity', 'home', 'community'] : ['activity', 'home', 'transport'],
    outdoorMinutes: indoorOnly && !worker ? profile.outdoorMinutes : 0,
    tailpipeKg
  };
}

/**
 * Guided (offline) assistant: keyword routing to reviewed actions and practical
 * constraints, carrying context from the preceding question when the latest one
 * does not name a topic.
 * @param {string} question
 * @param {ReturnType<typeof getPlan>} plan
 * @param {string} [precedingQuestion]
 */
export function localAnswer(question, plan, precedingQuestion) {
  const text = question.toLowerCase();
  const ids = [];
  const constraints = [];
  const add = id => { if (!ids.includes(id)) ids.push(id); };
  if (/window|ventil|air out|balcony|खिड़की/.test(text)) add('windows');
  if (/cook|fry|kitchen|incense|रसोई/.test(text)) add('kitchen');
  if (/school|outdoor|run|exercise|walk|child|asthma|pickup|worker|बच्च|स्कूल/.test(text)) add('activity');
  if (/purif|hepa|indoor|room|mask|asthma|budget|filter|घर/.test(text)) add('home');
  if (/car\b|commut|metro|petrol|trip|traffic|emission|यात्रा/.test(text)) add('transport');
  if (/neighbou?r|community|society|group|school/.test(text)) add('community');
  if (/(?:no|without|don['’]t (?:own|have)) (?:an? |any )?(?:hepa |air )?purifier/.test(text)) constraints.push('no-purifier');
  if (/(?:no|without) (?:access to )?(?:transit|public transport|metro|bus)/.test(text)) constraints.push('no-transit');
  if (/fixed time|can['’]t (?:move|shift|reschedule)|cannot (?:move|shift|reschedule)/.test(text)) constraints.push('fixed-time');
  if (/asthma|lung disease|heart disease/.test(text)) constraints.push('sensitive');
  const format = /neighbou?r|community|society|for (?:our|the) group/.test(text) ? 'group'
    : /schedule|timeline/.test(text) ? 'schedule' : 'checklist';
  const preceding = precedingQuestion ? localAnswer(precedingQuestion, plan) : null;
  return {
    mode: 'local',
    actions: (ids.length ? ids : preceding?.actions ?? plan.initial).slice(0, 3),
    constraints: [...new Set([...constraints, ...(preceding?.constraints ?? [])])],
    format: !ids.length && format === 'checklist' ? preceding?.format ?? format : format
  };
}
