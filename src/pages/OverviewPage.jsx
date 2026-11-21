import React from 'react';
import { ArrowRight, ArrowUpRight, FlaskConical, Radio, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { householdNames, sources } from '../domain.mjs';
import { ActionList } from '../components/ActionList.jsx';
import { AirSnapshot } from '../components/AirSnapshot.jsx';
import { HourlyOutlook } from '../components/HourlyOutlook.jsx';
import { Impact } from '../components/Impact.jsx';
import { MotionSwitch } from '../components/motion.jsx';

function DataModeSwitch({ air, loading, onModeChange, onCustomize }) {
  const options = [
    { key: 'demo', label: 'Winter demo', icon: FlaskConical, disabled: loading && air.mode === 'demo' },
    { key: 'live', label: loading ? 'Loading…' : 'Current forecast', icon: Radio, disabled: loading }
  ];
  return (
    <div className="atlas-modes">
      <MotionSwitch label="Air data mode" value={air.mode} options={options} onChange={onModeChange} />
      <button className="quiet-btn customize" onClick={onCustomize}><SlidersHorizontal size={16} /> Customize plan</button>
    </div>
  );
}

function ForecastError({ message }) {
  return (
    <p className="forecast-error atlas-error" role="status">
      <TriangleAlert size={16} /> {message}{' '}
      <a href={sources.official.url} target="_blank" rel="noreferrer">Check CPCB <ArrowUpRight size={12} /></a>
    </p>
  );
}

/** Landing view: city scene, hourly outlook, today's plan and its impact. */
export function OverviewPage({ air, city, plan, profile, picked, dataStatus, forecast, actions }) {
  const todays = plan.actions.filter(action => plan.initial.includes(action.id) || picked.includes(action.id));
  return (
    <>
      <AirSnapshot air={air} city={city} plan={plan} dataStatus={dataStatus} onSources={actions.showMethod}>
        <DataModeSwitch air={air} loading={forecast.loading} onModeChange={forecast.setMode} onCustomize={actions.editProfile} />
      </AirSnapshot>
      {forecast.error && <ForecastError message={forecast.error} />}
      <div className="overview-grid">
        <HourlyOutlook air={air} best={plan.window.best} />
        <section className="card plan-card">
          <div className="card-head">
            <div><h2>Today’s plan</h2><p>{householdNames[profile.household]} · {picked.length} selected</p></div>
            <button className="text-btn" onClick={() => actions.navigate('routine')}>View plan <ArrowRight size={15} /></button>
          </div>
          <ActionList actions={todays} picked={picked} onToggle={actions.toggle} onEvidence={actions.showEvidence} />
        </section>
        <Impact plan={plan} profile={profile} picked={picked} showMethod={actions.showMethod} />
      </div>
    </>
  );
}
