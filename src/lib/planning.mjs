import { sources } from '../domain.mjs';
import { CONSTRAINT_OVERRIDES } from './assistant-contract.mjs';
import { CADR_PER_SQUARE_METRE, ROOM_AREA_RANGE } from './constants.mjs';

const istDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
const istTime = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' });

/**
 * Shareable plain-text briefing for a school or residents' group.
 * @param {{ name: string, ncr?: boolean }} city
 * @param {{ mode: 'demo' | 'live', validAt: number | null }} air
 * @param {Array<{ title: string, description: string }>} actions
 */
export function groupMessage(city, air, actions) {
  return [
    `Airshift community plan · ${city.name}`,
    air.mode === 'demo'
      ? 'Practice scenario with sample readings.'
      : `Based on a regional PM₂.₅ forecast for ${istDate.format(air.validAt)}. Check local CPCB readings and official notices before acting.`,
    ...actions.map(action => `• ${action.title}. ${action.description}`),
    `Nearby official readings: ${sources.official.url}`,
    ...(city.ncr ? [`Delhi-NCR advisories: ${sources.caqm.url}`] : [])
  ].join('\n');
}

/** Status line describing where the readings come from. */
export function dataStatusLabel(air) {
  return air.mode === 'demo' ? 'Synthetic winter readings' : `Model valid at ${istTime.format(air.validAt)} IST`;
}

/**
 * Minimum smoke CADR to look for, or null when the room size is out of range.
 * @param {number | string} area Floor area in m².
 */
export function purifierCadr(area) {
  const value = Number(area);
  if (!Number.isFinite(value) || value < ROOM_AREA_RANGE.min || value > ROOM_AREA_RANGE.max) return null;
  return Math.round(value * CADR_PER_SQUARE_METRE);
}

/**
 * Apply temporary constraints from an assistant answer to a copy of the profile.
 * @param {object} profile
 * @param {string[]} [constraints]
 */
export function applyConstraints(profile, constraints = []) {
  const adjusted = { ...profile };
  for (const flag of constraints) {
    if (Object.hasOwn(CONSTRAINT_OVERRIDES, flag)) Object.assign(adjusted, CONSTRAINT_OVERRIDES[flag]);
  }
  return adjusted;
}

/** Whether a question continues the previous one ("what about…", "and…"). */
export function isFollowUp(question) {
  return /^(and |but |what (if|about) |how about |instead|then\b)/i.test(question.trim());
}

/** Toggle an action ID in the selected list. */
export function toggleId(list, id) {
  return list.includes(id) ? list.filter(key => key !== id) : [...list, id];
}

/**
 * Round the chart's y-axis up to tidy gridlines (about four steps).
 * @param {number} max Largest value plotted.
 * @returns {{ step: number, ceiling: number }}
 */
export function chartScale(max) {
  const top = Math.max(40, max);
  const magnitude = 10 ** Math.floor(Math.log10(top / 4));
  const step = Math.ceil(top / 4 / magnitude) * magnitude;
  return { step, ceiling: step * Math.ceil(top / step) };
}
