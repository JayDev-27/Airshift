import React from 'react';
import { Activity, ArrowDownRight, Car, Check, CookingPot, House, Timer, TrainFront, Users, Wind } from 'lucide-react';

const ICONS = { activity: Activity, house: House, users: Users, train: TrainFront, car: Car, cooking: CookingPot, wind: Wind, timer: Timer };

function ActionRow({ action, picked, onToggle, onEvidence }) {
  const Icon = ICONS[action.icon];
  const label = picked ? `Remove ${action.title} from your plan` : `Add ${action.title} to your plan`;
  return (
    <li className="action-row">
      <div className={`action-icon ${action.color}`}><Icon size={19} /></div>
      <div className="action-text">
        <div className="action-meta"><span>{action.category}</span><i />{action.when}</div>
        <h3>{action.title}</h3>
        <p>{action.description}</p>
        <button className="action-impact" onClick={() => onEvidence(action)}><ArrowDownRight size={14} /> {action.impact}</button>
      </div>
      <button className={`pick ${picked ? 'picked' : ''}`} aria-pressed={picked} aria-label={label} onClick={() => onToggle(action.id)}>
        {picked && <Check size={14} strokeWidth={2.8} />}
      </button>
    </li>
  );
}

/** Selectable list of reviewed actions. */
export function ActionList({ actions, picked, onToggle, onEvidence }) {
  return (
    <ul className="action-list">
      {actions.map(action => (
        <ActionRow key={action.id} action={action} picked={picked.includes(action.id)} onToggle={onToggle} onEvidence={onEvidence} />
      ))}
    </ul>
  );
}
