import React, { useState } from 'react';
import { Share2, Wind } from 'lucide-react';
import { householdNames } from '../domain.mjs';
import { ROOM_AREA_RANGE } from '../lib/constants.mjs';
import { purifierCadr } from '../lib/planning.mjs';
import { ActionList } from '../components/ActionList.jsx';
import { Impact } from '../components/Impact.jsx';
import { Methodology, SourceList } from '../components/Sources.jsx';

function ActionCard({ title, subtitle, actions, picked, handlers }) {
  return (
    <section className="card plan-card">
      <div className="card-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      <ActionList actions={actions} picked={picked} onToggle={handlers.toggle} onEvidence={handlers.showEvidence} />
    </section>
  );
}

/** Full action list with impact. */
export function RoutinePage({ plan, profile, picked, actions }) {
  return (
    <div className="lower-grid">
      <ActionCard
        title="Recommended actions"
        subtitle={`${householdNames[profile.household]} · ${picked.length} selected`}
        actions={plan.actions}
        picked={picked}
        handlers={actions}
      />
      <Impact plan={plan} profile={profile} picked={picked} showMethod={actions.showMethod} />
    </div>
  );
}

function PurifierSizer() {
  const [area, setArea] = useState(15);
  const cadr = purifierCadr(area);
  return (
    <section className="card tool-card">
      <span className="impact-icon"><Wind size={20} /></span>
      <h2>Size a room purifier</h2>
      <p>Estimate the minimum smoke CADR to look for on the product label.</p>
      <label>
        Room floor area (m²)
        <input type="number" min={ROOM_AREA_RANGE.min} max={ROOM_AREA_RANGE.max} value={area} onChange={event => setArea(event.target.value)} />
      </label>
      <div className="metric">{cadr ?? '—'}<small>m³/h</small></div>
      <p>EPA rule of thumb for an approximately 2.4 m ceiling. Taller rooms can need more capacity.</p>
      <SourceList ids={['filter']} />
    </section>
  );
}

/** Indoor actions plus the purifier sizing tool. */
export function IndoorPage({ plan, profile, picked, actions }) {
  return (
    <div className="lower-grid subpage-grid">
      <ActionCard
        title="Indoor actions"
        subtitle={profile.purifier ? 'With a HEPA purifier' : 'Without a purifier'}
        actions={plan.actions.filter(action => action.category === 'Indoor air')}
        picked={picked}
        handlers={actions}
      />
      <PurifierSizer />
    </div>
  );
}

/** Group actions plus a copyable briefing. */
export function CommunityPage({ shareCards, briefing, picked, actions }) {
  return (
    <div className="lower-grid subpage-grid">
      <ActionCard
        title="Community actions"
        subtitle="For schools, societies and neighbourhood groups"
        actions={shareCards}
        picked={picked}
        handlers={actions}
      />
      <section className="card tool-card">
        <span className="impact-icon"><Share2 size={19} /></span>
        <h2>Share a briefing</h2>
        <p>Copy this message for your school or residents’ group.</p>
        <pre className="share-preview">{briefing}</pre>
        <button className="primary-btn" onClick={() => actions.copy(briefing)}><Share2 size={16} /> Copy briefing</button>
      </section>
    </div>
  );
}

/** Every source and assumption. */
export function EvidencePage() {
  return <section className="card evidence-card"><Methodology all /></section>;
}
