/**
 * Fetch the CAMS PM₂.₅ forecast for a city from Open-Meteo and keep it only when
 * the past 24 hours and next 24 hours are complete, hourly and current.
 * @param {{ id: string, lat: number, lon: number }} city
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ city: string, mode: 'live', pm: number, mean: number, hour: number, validAt: number, hours: Array<{ day: string, hour: number, pm: number, time: number }> }>}
 * @throws {Error} When the provider fails or the data is stale or incomplete.
 */
export async function forecastFromOpenMeteo(city, signal = AbortSignal.timeout(6500)) {
  const params = new URLSearchParams({
    latitude: String(city.lat), longitude: String(city.lon), domains: 'cams_global',
    hourly: 'pm2_5', current: 'pm2_5', past_hours: '24', forecast_hours: '25',
    timezone: 'Asia/Kolkata', timeformat: 'unixtime'
  });
  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, { signal });
  if (!response.ok) throw new Error('Forecast provider unavailable');
  const data = await response.json();
  const valid = value => Number.isFinite(value) && value >= 0;
  const current = data.current?.time;
  const now = Date.now() / 1000;
  if (!Number.isFinite(current) || Math.abs(current - now) > 7200 || !valid(data.current?.pm2_5)) throw new Error('Forecast timestamp or value unavailable');
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', hourCycle: 'h23' });
  const toHour = timestamp => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp * 1000)).map(part => [part.type, part.value]));
    return { day: `${parts.day} ${parts.month}`, hour: Number(parts.hour) };
  };
  const points = (data.hourly?.time ?? []).map((time, index) => ({ time, pm: data.hourly.pm2_5?.[index] }))
    .filter(point => Number.isFinite(point.time) && valid(point.pm));
  const history = points.filter(point => point.time > current - 86400 && point.time <= current);
  const hours = points.filter(point => point.time >= current && point.time < current + 86400)
    .map(point => ({ ...toHour(point.time), pm: Math.round(point.pm), time: point.time }));
  if (history.length !== 24 || history.some((point, index) => point.time !== history[0].time + index * 3600) ||
    hours.length !== 24 || hours.some((point, index) => point.time !== hours[0].time + index * 3600) ||
    hours[0].time - history[23].time > 3600) {
    throw new Error('Forecast coverage unavailable');
  }
  const air = {
    city: city.id, mode: 'live', pm: Math.round(data.current.pm2_5),
    mean: Math.round(history.reduce((sum, point) => sum + point.pm, 0) / history.length),
    hour: toHour(current).hour, validAt: current * 1000, hours
  };
  return air;
}

/**
 * Cache forecasts per city for five minutes and share one in-flight request
 * between concurrent callers. Failed requests are not cached.
 * @param {typeof forecastFromOpenMeteo} [load]
 */
export function createForecastReader(load = forecastFromOpenMeteo) {
  const airCache = new Map();
  return async function readForecast(city) {
    const cached = airCache.get(city.id);
    if (cached && Date.now() < cached.expiry) return cached.promise;
    const promise = load(city);
    airCache.set(city.id, { promise, expiry: Date.now() + 5 * 60 * 1000 });
    try {
      return await promise;
    } catch (error) {
      airCache.delete(city.id);
      throw error;
    }
  };
}
