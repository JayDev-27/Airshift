import { getPlan, localAnswer } from '../domain.mjs';
import { applyConstraints, isFollowUp } from './planning.mjs';

/**
 * Get an answer for a question: Gemini through the server when available,
 * otherwise (or on any failure) the guided local answer.
 * @param {{ question: string, recent: string[], profile: object, air: object, gemini: boolean, signal?: AbortSignal, fetcher?: typeof fetch }} input
 * @returns {Promise<{ mode: string, actions: string[], format: string, constraints?: string[] }>}
 * @throws {DOMException} AbortError when the request is cancelled.
 */
export async function requestAnswer({ question, recent, profile, air, gemini, signal, fetcher = fetch }) {
  const guided = localAnswer(question, getPlan(profile, air), isFollowUp(question) ? recent.at(-1) : undefined);
  if (!gemini) return guided;
  try {
    const response = await fetcher('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ question, context: recent, profile, air: { pm: air.pm, mean: air.mean } })
    });
    if (!response.ok) return guided;
    const data = await response.json();
    return data.mode === 'gemini' ? data : guided;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return guided;
  }
}

/**
 * Turn an answer into reply cards using a plan that reflects its constraints.
 * @returns {{ profile: object, cards: object[], constraints: string[] }}
 */
export function buildReply(answer, profile, air) {
  const constraints = answer.constraints ?? [];
  const adjusted = applyConstraints(profile, constraints);
  const plan = getPlan(adjusted, air);
  const cards = answer.actions.map(id => plan.actions.find(action => action.id === id)).filter(Boolean);
  return { profile: adjusted, cards, constraints };
}
