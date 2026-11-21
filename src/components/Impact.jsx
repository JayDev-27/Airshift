import React from 'react';
import { ArrowUpRight, Car, Leaf, Timer } from 'lucide-react';

/** Exposure figure for the selected plan: a percentage for a time shift, otherwise avoided minutes. */
function exposureSummary(plan, picked) {
  const active = picked.includes('activity');
  const reduction = active && plan.usableShift ? plan.window.reduction : null;
  if (reduction > 0) return { value: `~${reduction}`, unit: '%', note: 'less outdoor PM₂.₅ for the same activity duration' };
  const minutes = active ? plan.outdoorMinutes : 0;
  return {
    value: minutes, unit: 'min',
    note: minutes ? 'less time outdoors for the planned activity' : 'no outdoor minutes counted as avoided'
  };
}

/** Projected outdoor exposure and tailpipe CO₂ avoided by the selected actions. */
export function Impact({ plan, profile, picked, showMethod }) {
  const exposure = exposureSummary(plan, picked);
  const co2 = picked.includes('transport') ? plan.tailpipeKg : 0;
  return (
    <aside className="card impact-card">
      <div className="impact-title">
        <span className="impact-icon"><Leaf size={19} /></span>
        <div><h2>Your plan’s impact</h2><p>Projected if you follow the plan</p></div>
      </div>
      <div className="impact-stat">
        <div className="impact-label"><Timer size={15} /> Outdoor exposure</div>
        <div className="metric">{exposure.value}<small>{exposure.unit}</small></div>
        <p>{exposure.note}</p>
      </div>
      <div className="impact-stat">
        <div className="impact-label"><Car size={15} /> Petrol-car emissions</div>
        <div className="metric">{co2 ? `~${co2.toFixed(1)}` : '0'}<small>kg CO₂</small></div>
        <p>{co2 ? `tailpipe CO₂ avoided if you skip the ${profile.km} km drive` : 'tailpipe CO₂ avoided in the selected plan'}</p>
      </div>
      <button className="method-link" onClick={showMethod}>See the calculations <ArrowUpRight size={15} /></button>
    </aside>
  );
}
