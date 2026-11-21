import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cities, formatHour, householdNames, normalizeProfile } from '../domain.mjs';

const TOGGLES = [
  ['sensitive', 'Someone is sensitive to air pollution'],
  ['purifier', 'We have a HEPA air purifier'],
  ['transit', 'Public transport is practical'],
  ['flexible', 'We can move outdoor activities'],
  ['drive', 'This trip normally uses a petrol car']
];
const OUTDOOR_HOURS = Array.from({ length: 14 }, (_, index) => index + 6);

/** Keep an empty number field editable instead of coercing it to 0 mid-typing. */
const numberValue = event => (event.target.value === '' ? '' : event.target.valueAsNumber);

function NumberField({ label, value, min, max, onChange }) {
  return (
    <label>
      {label}
      <input required type="number" min={min} max={max} value={value} onChange={event => onChange(numberValue(event))} />
    </label>
  );
}

/** Household settings. Values are normalized again on save, so the form never stores invalid input. */
export function ProfileForm({ profile, onSave }) {
  const [draft, setDraft] = useState(profile);
  const set = key => value => setDraft(previous => ({ ...previous, [key]: value }));
  const submit = event => {
    event.preventDefault();
    onSave(normalizeProfile(draft));
  };

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          City
          <select value={draft.city} onChange={event => set('city')(event.target.value)}>
            {cities.map(city => <option value={city.id} key={city.id}>{city.name}</option>)}
          </select>
        </label>
        <label>
          Who are you planning for?
          <select value={draft.household} onChange={event => set('household')(event.target.value)}>
            {Object.entries(householdNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <fieldset>
        {TOGGLES.map(([key, label]) => (
          <label key={key}>
            <input type="checkbox" checked={draft[key]} onChange={event => set(key)(event.target.checked)} />{label}
          </label>
        ))}
      </fieldset>
      {draft.drive && (
        <div className="form-grid">
          <NumberField label="Petrol round trip (km)" value={draft.km} min="0" max="250" onChange={set('km')} />
          <NumberField label="Fuel economy (km/L)" value={draft.efficiency} min="4" max="60" onChange={set('efficiency')} />
        </div>
      )}
      <div className="form-grid">
        <label>
          Usual outdoor time
          <select value={draft.usualHour} onChange={event => set('usualHour')(Number(event.target.value))}>
            {OUTDOOR_HOURS.map(hour => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
          </select>
        </label>
        <NumberField label="Outdoor activity (minutes)" value={draft.outdoorMinutes} min="10" max="180" onChange={set('outdoorMinutes')} />
      </div>
      <button className="primary-btn"><Check size={17} /> Save and update plan</button>
    </form>
  );
}
