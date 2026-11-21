import { defaultProfile, demoForecast, getPlan, normalizeProfile } from '../domain.mjs';
import { PREFERENCES_KEY } from './constants.mjs';

const fallback = () => ({ profile: defaultProfile, picked: getPlan(defaultProfile, demoForecast()).initial });

/**
 * Restore saved preferences, discarding anything invalid. Storage can be
 * missing or throw (private windows, blocked site data), so every failure
 * falls back to the default household.
 * @param {Pick<Storage, 'getItem'> | undefined} storage
 */
export function loadPreferences(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(PREFERENCES_KEY) ?? 'null');
    const profile = normalizeProfile(saved?.profile);
    const plan = getPlan(profile, demoForecast(profile.city));
    const picked = Array.isArray(saved?.picked)
      ? [...new Set(saved.picked)].filter(id => plan.actions.some(action => action.id === id))
      : plan.initial;
    return { profile, picked };
  } catch {
    return fallback();
  }
}

/** Persist preferences; storage is a convenience, so failures are ignored. */
export function savePreferences(storage, preferences) {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    /* Storage is optional. */
  }
}
