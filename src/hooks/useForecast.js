import { useEffect, useMemo, useState } from 'react';
import { demoForecast } from '../domain.mjs';
import { FORECAST_REFRESH_MS } from '../lib/constants.mjs';
import { loadLiveForecast } from '../lib/forecast-client.mjs';

const UNAVAILABLE = 'Current forecast unavailable. Showing the winter demo.';

/** A live forecast belongs to one city and one explicit refresh request. */
export function useForecast(city, mode, revision) {
  const demo = useMemo(() => demoForecast(city.id), [city.id]);
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (mode !== 'live') return;
    const controller = new AbortController();
    const { signal } = controller;
    let timer;

    async function refresh() {
      let result;
      try {
        result = { air: await loadLiveForecast(city, signal), error: '' };
      } catch {
        result = { air: demo, error: UNAVAILABLE };
      }
      if (signal.aborted) return;
      setSnapshot({ ...result, city, revision, loading: false });
      timer = setTimeout(() => {
        setSnapshot(previous => ({ ...previous, loading: true, error: '' }));
        void refresh();
      }, FORECAST_REFRESH_MS);
    }

    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [city, demo, mode, revision]);

  if (mode === 'live' && snapshot?.city === city && snapshot.revision === revision) return snapshot;
  return { air: demo, error: '', loading: mode === 'live' };
}
