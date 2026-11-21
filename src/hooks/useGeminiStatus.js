import { useEffect, useState } from 'react';

/** Whether the server has Gemini configured. False on static hosting or any error. */
export function useGeminiStatus() {
  const [gemini, setGemini] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/status', { signal: controller.signal })
      .then(response => response.json())
      .then(status => setGemini(status.gemini === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return gemini;
}
