export const MAX_QUESTION_LENGTH = 600;
export const MAX_CONTEXT_QUESTIONS = 2;
export const MAX_REPLY_ACTIONS = 3;
export const REPLY_FORMATS = ['checklist', 'schedule', 'group'];

export const CONSTRAINT_OVERRIDES = Object.freeze({
  'no-purifier': { purifier: false },
  'no-transit': { transit: false },
  'fixed-time': { flexible: false },
  sensitive: { sensitive: true }
});

export const REPLY_CONSTRAINTS = Object.keys(CONSTRAINT_OVERRIDES);

function allowedValues(values, allowed) {
  return Array.isArray(values) ? [...new Set(values)].filter(value => allowed.includes(value)) : [];
}

/** Accept only reviewed selections, regardless of what the network returned. */
export function normalizeReply(selection, allowedActions) {
  const actions = allowedValues(selection?.actions, allowedActions).slice(0, MAX_REPLY_ACTIONS);
  if (!actions.length) return null;
  return {
    actions,
    format: REPLY_FORMATS.includes(selection.format) ? selection.format : 'checklist',
    constraints: allowedValues(selection.constraints, REPLY_CONSTRAINTS)
  };
}
