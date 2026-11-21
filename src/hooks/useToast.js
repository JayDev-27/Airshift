import { useEffect, useState } from 'react';
import { TOAST_DURATION_MS } from '../lib/constants.mjs';

/** A message that clears itself after a few seconds. */
export function useToast() {
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(''), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast]);
  return [toast, setToast];
}
