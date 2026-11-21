const PROVIDER_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const TIME_ZONE = 'Asia/Kolkata';
const HOURS_PER_DAY = 24;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = HOURS_PER_DAY * SECONDS_PER_HOUR;
const MAX_FORECAST_AGE_SECONDS = 2 * SECONDS_PER_HOUR;
export const FORECAST_PROVIDER_TIMEOUT_MS = 6500;

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, month: 'short', day: 'numeric', hour: '2-digit', hourCycle: 'h23'
});

function localHour(timestamp) {
  const parts = Object.fromEntries(formatter.formatToParts(timestamp * 1000).map(part => [part.type, part.value]));
  return { day: `${parts.day} ${parts.month}`, hour: Number(parts.hour) };
}

function isReading(value) {
  return Number.isFinite(value) && value >= 0;
}

function isCurrent(timestamp, now) {
  return Number.isFinite(timestamp) && Math.abs(timestamp - now / 1000) <= MAX_FORECAST_AGE_SECONDS;
}

function hasCompleteDay(points) {
  return points.length === HOURS_PER_DAY && points.every((point, index) =>
    isReading(point?.pm) && Number.isFinite(point.time) && point.time === points[0].time + index * SECONDS_PER_HOUR);
}

/** Validate a normalized live response before passing it to the planner. */
export function isLiveForecast(air, cityId, now = Date.now()) {
  if (air?.mode !== 'live' || air.city !== cityId || !isReading(air.pm) || !isReading(air.mean)) return false;
  const current = air.validAt / 1000;
  if (!Number.isFinite(air.validAt) || !isCurrent(current, now) || air.hour !== localHour(current).hour) return false;
  if (!Array.isArray(air.hours) || !hasCompleteDay(air.hours)) return false;
  const firstOffset = air.hours[0].time - current;
  return firstOffset >= 0 && firstOffset < SECONDS_PER_HOUR && air.hours.every(point => {
    const { day, hour } = localHour(point.time);
    return point.day === day && point.hour === hour;
  });
}

/** Convert provider data into the forecast used by both runtimes and the static site. */
function parseForecast(data, cityId, now) {
  const current = data?.current?.time;
  const pm = data?.current?.pm2_5;
  if (!isCurrent(current, now) || !isReading(pm)) throw new Error('Forecast timestamp or value unavailable');

  const { time, pm2_5: readings } = data.hourly ?? {};
  if (!Array.isArray(time) || !Array.isArray(readings)) throw new Error('Forecast coverage unavailable');
  const points = time.map((timestamp, index) => ({ time: timestamp, pm: readings[index] }));
  const history = points.filter(point => point.time > current - SECONDS_PER_DAY && point.time <= current);
  const future = points.filter(point => point.time >= current && point.time < current + SECONDS_PER_DAY);
  if (!hasCompleteDay(history) || !hasCompleteDay(future) || future[0].time - history.at(-1).time > SECONDS_PER_HOUR) {
    throw new Error('Forecast coverage unavailable');
  }

  return {
    city: cityId,
    mode: 'live',
    pm: Math.round(pm),
    mean: Math.round(history.reduce((sum, point) => sum + point.pm, 0) / HOURS_PER_DAY),
    hour: localHour(current).hour,
    validAt: current * 1000,
    hours: future.map(point => ({ ...localHour(point.time), pm: Math.round(point.pm), time: point.time }))
  };
}

/** Fetch a recent, complete CAMS PM₂.₅ forecast for a supported city. */
export async function forecastFromOpenMeteo(city, signal = AbortSignal.timeout(FORECAST_PROVIDER_TIMEOUT_MS), fetcher = fetch) {
  const params = new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon), domains: 'cams_global',
    hourly: 'pm2_5', current: 'pm2_5', past_hours: String(HOURS_PER_DAY), forecast_hours: String(HOURS_PER_DAY + 1),
    timezone: TIME_ZONE, timeformat: 'unixtime'
  });
  const response = await fetcher(`${PROVIDER_URL}?${params}`, { signal });
  if (!response.ok) throw new Error('Forecast provider unavailable');
  return parseForecast(await response.json(), city.id, Date.now());
}
