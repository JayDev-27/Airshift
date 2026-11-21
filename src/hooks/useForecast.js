import { useEffect, useState } from 'react';
import { demoForecast } from '../domain.mjs';
import { forecastFromOpenMeteo } from '../../server/forecast.mjs';
import { DIRECT_FORECAST_TIMEOUT_MS, FORECAST_REFRESH_MS } from '../lib/constants.mjs';

const UNAVAILABLE = 'Current forecast unavailable. Showing the winter demo.';

/** Load from the API, falling back to Open-Meteo directly when no server is available (static hosting). */
async function loadLiveForecast(city, signal) {
  const response = await fetch(`/api/forecast?city=${city.id}`, { signal }).catch(() => null);
  if (signal.aborted) return null;
  if (response?.ok) return response.json();
  return forecastFromOpenMeteo(city, AbortSignal.any([signal, AbortSignal.timeout(DIRECT_FORECAST_TIMEOUT_MS)]));
}

/**
 * Forecast for a city in demo or live mode. Live data refreshes every 15 minutes
 * and falls back to the labelled demo with an explanation if it cannot load.
 * @param {{ id: string, lat: number, lon: number }} city
 * @param {'demo' | 'live'} mode
 * @param {number} reload Increment to force a live refresh.
 */
export function useForecast(city, mode, reload) {
  const [air, setAir] = useState(() => demoForecast(city.id));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // Switching city or mode resets the forecast state before the next load starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('');
    if (mode === 'demo') {
      setAir(demoForecast(city.id));
      setLoading(false);
      return undefined;
    }
    const refresh = async () => {
      setLoading(true);
      setError('');
      try {
        const forecast = await loadLiveForecast(city, controller.signal);
        if (forecast && !controller.signal.aborted) setAir(forecast);
      } catch {
        if (!controller.signal.aborted) {
          setAir(demoForecast(city.id));
          setError(UNAVAILABLE);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    refresh();
    const timer = setInterval(refresh, FORECAST_REFRESH_MS);
    return () => { controller.abort(); clearInterval(timer); };
    // `city` is looked up from `city.id`, so the id is the complete dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id, mode, reload]);

  // While a new city loads, show its demo day rather than the previous city's readings.
  const visibleAir = air.city === city.id ? air : demoForecast(city.id);
  return { air: visibleAir, error, loading };
}
