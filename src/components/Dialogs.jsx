import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cities } from '../domain.mjs';
import { Modal } from './Modal.jsx';
import { ProfileForm } from './ProfileForm.jsx';
import { Methodology, SourceList } from './Sources.jsx';

const thumbnail = id => `${import.meta.env.BASE_URL}cities/${id}-thumb.webp`;

function CityPicker({ current, onPick }) {
  return (
    <div className="city-list">
      {cities.map(entry => (
        <button key={entry.id} className={entry.id === current ? 'chosen' : ''} onClick={() => onPick(entry.id)}>
          <img src={thumbnail(entry.id)} alt="" width={48} height={38} loading="lazy" />
          <span><strong>{entry.name}</strong><small>{entry.region}</small></span>
          {entry.id === current && <Check size={16} />}
        </button>
      ))}
    </div>
  );
}

/**
 * The app's simple dialogs, chosen by `modal.type`. The assistant drawer is rendered separately
 * because it keeps its own conversation state.
 */
export function Dialogs({ modal, profile, onClose, onSaveProfile, onPickCity, onShowMethod }) {
  switch (modal?.type) {
    case 'profile':
      return <Modal title="Customize your plan" onClose={onClose}><ProfileForm profile={profile} onSave={onSaveProfile} /></Modal>;
    case 'city':
      return <Modal title="Choose your city" onClose={onClose}><CityPicker current={profile.city} onPick={onPickCity} /></Modal>;
    case 'method':
      return <Modal title="Data & assumptions" onClose={onClose}><Methodology /></Modal>;
    case 'action':
      return (
        <Modal title={modal.action.title} onClose={onClose}>
          <div className="methodology">
            <p>{modal.action.impact}</p>
            <SourceList ids={modal.action.sources} />
            <button className="text-btn" onClick={onShowMethod}>How impact is estimated <ArrowRight size={15} /></button>
          </div>
        </Modal>
      );
    default:
      return null;
  }
}

/** Fallback when the clipboard API is unavailable: show the text ready to select. */
export function ManualCopy({ text, onClose }) {
  return (
    <Modal title="Copy this briefing" onClose={onClose}>
      <div className="methodology">
        <textarea className="manual-copy" readOnly value={text} onFocus={event => event.target.select()} aria-label="Community briefing" />
      </div>
    </Modal>
  );
}
