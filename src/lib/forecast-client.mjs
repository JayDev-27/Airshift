import { FORECAST_PROVIDER_TIMEOUT_MS, forecastFromOpenMeteo, isLiveForecast } from './open-meteo.mjs';

// Allow the API a little more time than its own provider timeout.
const API_TIMEOUT_MS = FORECAST_PROVIDER_TIMEOUT_MS + 1000;

/** Try the application API first, then the provider for static hosting or API failure. */
export async function loadLiveForecast(city, signal, fetcher = fetch) {
  const query = new URLSearchParams({ city: city.id });
  try {
    const response = await fetcher(`/api/forecast?${query}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(API_TIMEOUT_MS)])
    });
    if (response.ok) {
      const air = await response.json();
      if (isLiveForecast(air, city.id)) return air;
    }
  } catch (error) {
    if (signal.aborted) throw error;
    // Static site hosts can serve the HTML entry page for unknown paths.
  }
  signal.throwIfAborted();
  return forecastFromOpenMeteo(city, AbortSignal.any([signal, AbortSignal.timeout(FORECAST_PROVIDER_TIMEOUT_MS)]), fetcher);
}
