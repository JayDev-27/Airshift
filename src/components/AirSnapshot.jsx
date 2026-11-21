import React, { lazy, Suspense, useState } from 'react';
import { Activity, ArrowUpRight, Clock3, MapPin, Wind } from 'lucide-react';
import { band, formatHour } from '../domain.mjs';
import CityPhoto from './CityPhoto.jsx';
import { MotionSwitch } from './motion.jsx';

const CityModel = lazy(() => import('./CityModel.jsx'));
const SCALE_LABELS = ['0', '100', '200', '300', '400+'];
const SCALE_MAX = 400;

/** Position of the reading on the 0–400 scale, kept inside the bar ends. */
const scalePosition = pm => Math.min(98, Math.max(2, pm / SCALE_MAX * 100));

function ReadingCard({ air, onSources }) {
  const [severity] = band(air.mean);
  return (
    <div className="atlas-reading" role="group" aria-label="Outdoor air quality">
      <div className="atlas-reading-head">
        <span><Wind size={17} /> PM₂.₅</span><span className="atlas-severity"><i /> {severity}</span>
      </div>
      <div className="atlas-number"><strong>{air.mean}</strong><span>µg/m³</span></div>
      <p>{air.mode === 'demo' ? 'Sample 24-hour average' : 'Modeled 24-hour average'}</p>
      <div className="atlas-scale" aria-hidden="true">
        <div className="atlas-scale-bar"><i style={{ left: `${scalePosition(air.mean)}%` }} /></div>
        <div>{SCALE_LABELS.map(label => <span key={label}>{label}</span>)}</div>
      </div>
      <button className="atlas-method" onClick={onSources}>How to read this <ArrowUpRight size={13} /></button>
    </div>
  );
}

function OutdoorWindow({ plan }) {
  const best = plan.window.best;
  const preferIndoors = plan.indoorOnly && plan.outdoorMinutes > 0;
  return (
    <div className="atlas-window">
      <Clock3 size={19} />
      <span>{best ? 'Lower-pollution slot' : 'Outdoor timing'}</span>
      <strong>{best ? formatHour(best.hour) : 'No daytime slot'}</strong>
      <small>{preferIndoors ? 'Prefer indoor activity' : 'Check local readings'}</small>
    </div>
  );
}

function HourlyPeak({ air }) {
  const peak = air.hours.reduce((highest, point) => (point.pm > highest.pm ? point : highest));
  return (
    <div className="atlas-peak">
      <Activity size={17} />
      <span>Hourly peak</span>
      <strong>{peak.pm}<small> µg/m³</small></strong>
      <small>{air.mode === 'live' && `${peak.day} · `}{formatHour(peak.hour)}</small>
    </div>
  );
}

/** Hero overview: city scene, current reading, best outdoor slot and hourly peak. */
export function AirSnapshot({ air, city, plan, dataStatus, onSources, children }) {
  const [, tone] = band(air.mean);
  const [tinted, setTinted] = useState(true);
  const [delhiView, setDelhiView] = useState('model');
  const isDelhi = city.id === 'delhi';
  const showingModel = isDelhi && delhiView === 'model';

  return (
    <section className={`atlas tone-${tone}`} aria-label="Air quality overview">
      {showingModel ? (
        <Suspense fallback={<div className="model-visual model-loading" data-tint={tinted} aria-hidden="true" />}>
          <CityModel tone={tone} tinted={tinted} />
        </Suspense>
      ) : <CityPhoto city={city} />}
      <div className="atlas-heading">
        <h1>Air quality overview</h1>
        <div className="atlas-location"><MapPin size={14} /> {city.name}, India <i /> <span role="status">{dataStatus}</span></div>
        {children}
      </div>
      <ReadingCard air={air} onSources={onSources} />
      <OutdoorWindow plan={plan} />
      <HourlyPeak air={air} />
      <div className="atlas-layer">
        {isDelhi && (
          <MotionSwitch
            label="City scene"
            value={delhiView}
            options={[{ key: 'model', label: '3D map' }, { key: 'photo', label: 'Photo' }]}
            onChange={setDelhiView}
            className="compact scene-switch"
          />
        )}
        {showingModel && (
          <button className="atlas-pill" aria-pressed={tinted} onClick={() => setTinted(value => !value)} title="Regional severity tint">
            <i /> Air tint
          </button>
        )}
      </div>
    </section>
  );
}
