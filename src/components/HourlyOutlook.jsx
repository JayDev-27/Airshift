import React, { useState } from 'react';
import { Activity, List } from 'lucide-react';
import { formatHour } from '../domain.mjs';
import { ForecastChart } from './ForecastChart.jsx';
import { MotionSwitch } from './motion.jsx';

const VIEWS = [{ key: 'chart', label: 'Chart', icon: Activity }, { key: 'readings', label: 'Readings', icon: List }];
const isSameSlot = (point, best) => point.hour === best?.hour && point.day === best?.day;

/** Accessible table alternative to the chart. */
function ReadingsTable({ air, best }) {
  return (
    // A focusable scroll region lets keyboard users scroll the table (WCAG 2.1.1, axe scrollable-region-focusable).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="readings" tabIndex={0} role="region" aria-label="Scrollable hourly PM2.5 readings">
      <table>
        <thead><tr><th scope="col">Local time</th><th scope="col">PM₂.₅ (µg/m³)</th></tr></thead>
        <tbody>
          {air.hours.map(point => {
            const isBest = isSameSlot(point, best);
            return (
              <tr key={`${point.day}-${point.hour}`} className={isBest ? 'reading-best' : undefined}>
                <td>
                  {air.mode === 'live' && `${point.day}, `}{formatHour(point.hour)}
                  {isBest && <span>Lower-pollution slot</span>}
                </td>
                <td>{point.pm}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Hourly PM₂.₅ card that switches between a chart and a readings table. */
export function HourlyOutlook({ air, best }) {
  const [view, setView] = useState('chart');
  return (
    <section className="card forecast-card">
      <div className="card-head">
        <div>
          <h2>Hourly outlook</h2>
          <p>{air.mode === 'demo' ? 'Sample winter day' : 'Next 24 hours · IST'} · PM₂.₅ (µg/m³)</p>
        </div>
        <MotionSwitch label="Hourly outlook display" value={view} options={VIEWS} onChange={setView} className="compact" />
      </div>
      {view === 'chart'
        ? <ForecastChart key={`${air.city}-${air.mode}`} air={air} best={best} />
        : <ReadingsTable air={air} best={best} />}
      <div className="forecast-footer">
        <span><i className="chart-dot" /> Hourly PM₂.₅</span>
        {best && <span className="chart-key"><i /> Lower-pollution slot</span>}
      </div>
    </section>
  );
}
