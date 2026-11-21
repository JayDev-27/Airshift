/** Shared UI timings and limits, kept in one place so behaviour is easy to tune and test. */

/** How often a live forecast is refreshed while the page stays open. */
export const FORECAST_REFRESH_MS = 15 * 60 * 1000;

/** Browser-side timeout for the direct Open-Meteo fallback request. */
export const DIRECT_FORECAST_TIMEOUT_MS = 6500;

/** How long confirmation toasts stay on screen. */
export const TOAST_DURATION_MS = 3300;

/** Short pause before a guided reply so the typing state is perceptible. */
export const GUIDED_REPLY_DELAY_MS = 220;

/** Scroll distance from the bottom within which the assistant keeps following new text. */
export const FOLLOW_SCROLL_THRESHOLD_PX = 68;

/** Maximum assistant question length, matching the server limit. */
export const MAX_QUESTION_LENGTH = 600;

/** localStorage key for the saved household profile and selected actions. */
export const PREFERENCES_KEY = 'airshift-preferences';

/** US EPA rule of thumb: smoke CADR (m³/h) per m² of floor area for a ~2.4 m ceiling. */
export const CADR_PER_SQUARE_METRE = 12.2;

/** Accepted room sizes for the purifier estimate, in m². */
export const ROOM_AREA_RANGE = Object.freeze({ min: 5, max: 100 });
