import { forecastFromOpenMeteo } from '../src/lib/open-meteo.mjs';

const CACHE_TTL_MS = 5 * 60 * 1000;

/** Share in-flight requests per city and cache successful forecasts for five minutes. */
export function createForecastReader(load = forecastFromOpenMeteo, now = Date.now) {
  const forecasts = new Map();

  return function readForecast(city) {
    const cached = forecasts.get(city.id);
    if (cached && now() < cached.expiresAt) return cached.promise;

    const entry = {
      expiresAt: Infinity,
      promise: Promise.resolve().then(() => load(city)).then(air => {
        entry.expiresAt = now() + CACHE_TTL_MS;
        return air;
      }).catch(error => {
        forecasts.delete(city.id);
        throw error;
      })
    };
    forecasts.set(city.id, entry);
    return entry.promise;
  };
}
