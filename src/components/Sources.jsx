import React from 'react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { sources } from '../domain.mjs';

const CORE_SOURCES = ['cpcb', 'official', 'meteo', 'cams', 'fuel'];

const METHOD_SECTIONS = [
  ['Outdoor air', 'The winter demo uses synthetic readings. The current forecast uses the CAMS Global grid via Open-Meteo at roughly 45 km resolution. The hourly chart shows modeled PM₂.₅. The card applies India’s PM₂.₅ bands to a 24-hour average of the model. Official CPCB AQI is based on station readings across several pollutants.'],
  ['City views', 'The Delhi model uses OpenStreetMap geometry with illustrative buildings and estimated heights. Each city has a credited photograph. The tint in the Delhi model depicts a citywide category and has no street-level readings.'],
  ['Outdoor exposure', 'Moving a planned activity indoors counts the outdoor minutes you would avoid. For a rescheduled activity, the comparison is the modeled average PM₂.₅ over equal-length blocks. Breathing rate, personal dose, and indoor concentrations are outside the estimate.'],
  ['Petrol-car emissions', 'Round-trip kilometres ÷ km per litre × 2.35 kg CO₂ per litre. This is gross petrol-car tailpipe CO₂ avoided when the trip is replaced. Replacement travel can have its own emissions. The estimate cannot predict a change in city AQI.'],
  ['Indoor air and Gemini', 'Indoor recommendations follow particle control guidance from the US EPA. Gemini, when configured, ranks reviewed actions and identifies constraints in a question. Airshift computes air-quality labels and impact estimates before presenting the result.']
];

/** External links to the sources behind a recommendation. */
export function SourceList({ ids }) {
  return (
    <div className="source-list">
      {[...new Set(ids)].map(id => (
        <a href={sources[id].url} key={id} target="_blank" rel="noreferrer">
          <BookOpen size={16} />
          <span><strong>{sources[id].name}</strong><small>{sources[id].note}</small></span>
          <ArrowUpRight size={15} />
        </a>
      ))}
    </div>
  );
}

/** How the readings and impact estimates are produced. */
export function Methodology({ all = false }) {
  return (
    <div className="methodology">
      {METHOD_SECTIONS.map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
      <SourceList ids={all ? Object.keys(sources) : CORE_SOURCES} />
    </div>
  );
}
