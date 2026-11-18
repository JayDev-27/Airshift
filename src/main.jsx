import React, { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import {
  Activity, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Car, Check,
  ChevronDown, ChevronRight, ClipboardList, Clock3, CookingPot, FlaskConical, List,
  House, LayoutGrid, Leaf, LocateFixed, MapPin, Radio, Send, Share2, SlidersHorizontal,
  Timer, TrainFront, TriangleAlert, Users, Wind, X
} from 'lucide-react';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import './styles.css';
import { AirMark, MotionSwitch, useSlidingIndicator } from './motion.jsx';
import CityPhoto from './CityPhoto.jsx';
import { ReplyStream, replyIntro } from './ReplyStream.jsx';
import { forecastFromOpenMeteo } from '../server/forecast.mjs';
import {
  band, cities, defaultProfile, demoForecast, formatHour, formatHourShort, getPlan,
  householdNames, localAnswer, normalizeProfile, sources
} from './domain.mjs';

const CityModel = lazy(() => import('./CityModel.jsx'));

const nav = [
  ['overview', 'Overview', LayoutGrid], ['routine', 'Daily plan', ClipboardList],
  ['indoor', 'Indoor air', House], ['community', 'Community', Users], ['evidence', 'Sources & methods', BookOpen]
];
const icons = { activity: Activity, house: House, users: Users, train: TrainFront, car: Car, cooking: CookingPot, wind: Wind, timer: Timer };
const suggestions = ['Can I open my windows?', 'Plan a school pickup', 'I don’t have a purifier', 'Help our neighbourhood plan'];

function initialPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('airshift-preferences'));
    const profile = normalizeProfile(saved?.profile);
    const plan = getPlan(profile, demoForecast(profile.city));
    const picked = Array.isArray(saved?.picked)
      ? [...new Set(saved.picked)].filter(id => plan.actions.some(action => action.id === id)) : plan.initial;
    return { profile, picked };
  } catch {
    return { profile: defaultProfile, picked: getPlan(defaultProfile, demoForecast()).initial };
  }
}

function Brand() {
  return <span className="brand"><span className="brand-mark"><AirMark /></span>airshift<span className="brand-period">.</span></span>;
}

function Modal({ title, onClose, children, drawer = false }) {
  const dialog = useRef(null);
  const heading = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog ref={dialog} className={drawer ? 'dialog drawer' : 'dialog'} aria-labelledby={heading}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-inner">
        <header className="dialog-head"><h2 id={heading}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
        {children}
      </div>
    </dialog>
  );
}

function ForecastChart({ air, best }) {
  const canvas = useRef(null);
  const [hover, setHover] = useState(null);
  const offset = 37;
  const right = 13;
  const top = 12;
  const bottom = 27;
  const plotted = hover === null ? null : air.hours[hover];
  useEffect(() => {
    const element = canvas.current;
    const paint = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = width * ratio;
      element.height = height * ratio;
      const context = element.getContext('2d');
      context.scale(ratio, ratio);
      const max = Math.max(40, ...air.hours.map(point => point.pm));
      const magnitude = 10 ** Math.floor(Math.log10(max / 4));
      const step = Math.ceil(max / 4 / magnitude) * magnitude;
      const ceiling = step * Math.ceil(max / step);
      const x = index => offset + index / (air.hours.length - 1) * (width - offset - right);
      const y = pm => height - bottom - pm / ceiling * (height - bottom - top);
      context.font = '10px "IBM Plex Mono", monospace';
      context.textBaseline = 'middle';
      context.fillStyle = '#636761';
      for (let value = 0; value <= ceiling; value += step) {
        context.strokeStyle = '#e5e6df';
        context.setLineDash(value ? [3, 4] : []);
        context.beginPath(); context.moveTo(offset, y(value)); context.lineTo(width - right, y(value)); context.stroke();
        context.fillText(String(value), 1, y(value));
      }
      context.setLineDash([]);
      const axis = [0, 6, 12, 18, air.hours.length - 1].filter((index, position, values) => index < air.hours.length && values.indexOf(index) === position);
      for (const index of axis) {
        context.textAlign = index === 0 ? 'left' : index === axis.at(-1) ? 'right' : 'center';
        context.fillText(formatHourShort(air.hours[index].hour), x(index), height - 7);
      }
      const bestIndex = best ? air.hours.findIndex(point => point.hour === best.hour && point.day === best.day) : -1;
      const columnWidth = Math.min(18, (width - offset - right) / air.hours.length * .65);
      const base = y(0);
      air.hours.forEach((point, index) => {
        const barTop = y(point.pm);
        const share = point.pm / max;
        const hue = 30 - 46 * share;
        const gradient = context.createLinearGradient(0, barTop, 0, base + 1);
        gradient.addColorStop(0, index === bestIndex ? '#96ad52' : `hsl(${hue} ${47 - 18 * share}% 61%)`);
        gradient.addColorStop(1, index === bestIndex ? '#96ad524d' : `hsl(${hue} 28% 62% / .28)`);
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(x(index) - columnWidth / 2, barTop, columnWidth, Math.max(1, base - barTop), [3, 3, 0, 0]);
        context.fill();
        if (hover === index || bestIndex === index) {
          context.strokeStyle = hover === index ? '#232821' : '#5e7433';
          context.lineWidth = 1;
          context.stroke();
        }
      });
    };
    const observer = new ResizeObserver(paint);
    observer.observe(element);
    paint();
    return () => observer.disconnect();
  }, [air, best, hover]);
  const setPoint = event => {
    const bounds = canvas.current.getBoundingClientRect();
    const scaled = (event.clientX - bounds.left - offset) / (bounds.width - offset - right);
    setHover(Math.max(0, Math.min(air.hours.length - 1, Math.round(scaled * (air.hours.length - 1)))));
  };
  return (
    <div className="chart-box">
      <canvas ref={canvas} aria-label="Hourly PM2.5 chart. Use arrow keys to inspect hourly values." tabIndex={0}
        onPointerMove={setPoint} onPointerLeave={() => setHover(null)} onClick={setPoint} onBlur={() => setHover(null)}
        onKeyDown={event => {
          if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
          event.preventDefault();
          setHover(value => Math.max(0, Math.min(air.hours.length - 1, (value ?? (event.key === 'ArrowRight' ? -1 : 1)) + (event.key === 'ArrowRight' ? 1 : -1))));
        }} />
      {plotted && <div className="chart-tooltip" role="status">{air.mode === 'live' && `${plotted.day} · `}{formatHour(plotted.hour)} · {plotted.pm} µg/m³</div>}
    </div>
  );
}

function AirSnapshot({ air, city, plan, dataStatus, onSources, children }) {
  const [severity, tone] = band(air.mean);
  const [tinted, setTinted] = useState(true);
  const [delhiView, setDelhiView] = useState('model');
  const showingModel = city.id === 'delhi' && delhiView === 'model';
  const best = plan.window.best;
  const peak = air.hours.reduce((highest, point) => point.pm > highest.pm ? point : highest);
  const preferIndoors = plan.indoorOnly && plan.outdoorMinutes > 0;
  return <section className={`atlas tone-${tone}`} aria-label="Air quality overview">
    {showingModel ? <Suspense fallback={<div className="model-visual model-loading" data-tint={tinted} aria-hidden="true" />}>
      <CityModel tone={tone} tinted={tinted} />
    </Suspense> : <CityPhoto city={city} />}
    <div className="atlas-heading">
      <h1>Air quality overview</h1>
      <div className="atlas-location"><MapPin size={14} /> {city.name}, India <i /> <span role="status">{dataStatus}</span></div>
      {children}
    </div>
    <div className="atlas-reading" role="group" aria-label="Outdoor air quality">
      <div className="atlas-reading-head">
        <span><Wind size={17} /> PM₂.₅</span><span className="atlas-severity"><i /> {severity}</span>
      </div>
      <div className="atlas-number"><strong>{air.mean}</strong><span>µg/m³</span></div>
      <p>{air.mode === 'demo' ? 'Sample 24-hour average' : 'Modeled 24-hour average'}</p>
      <div className="atlas-scale" aria-hidden="true">
        <div className="atlas-scale-bar"><i style={{ left: `${Math.min(98, Math.max(2, air.mean / 400 * 100))}%` }} /></div>
        <div><span>0</span><span>100</span><span>200</span><span>300</span><span>400+</span></div>
      </div>
      <button className="atlas-method" onClick={onSources}>How to read this <ArrowUpRight size={13} /></button>
    </div>
    <div className="atlas-window">
      <Clock3 size={19} />
      <span>{best ? 'Lower-pollution slot' : 'Outdoor timing'}</span>
      <strong>{best ? formatHour(best.hour) : 'No daytime slot'}</strong>
      <small>{preferIndoors ? 'Prefer indoor activity' : 'Check local readings'}</small>
    </div>
    <div className="atlas-peak">
      <Activity size={17} />
      <span>Hourly peak</span>
      <strong>{peak.pm}<small> µg/m³</small></strong>
      <small>{air.mode === 'live' && `${peak.day} · `}{formatHour(peak.hour)}</small>
    </div>
    <div className="atlas-layer">
      {city.id === 'delhi' && <MotionSwitch label="City scene" value={delhiView} options={[{ key: 'model', label: '3D map' }, { key: 'photo', label: 'Photo' }]} onChange={setDelhiView} className="compact scene-switch" />}
      {showingModel && <button className="atlas-pill" aria-pressed={tinted} onClick={() => setTinted(value => !value)} title="Regional severity tint"><i /> Air tint</button>}
    </div>
  </section>;
}

function HourlyOutlook({ air, best }) {
  const [view, setView] = useState('chart');
  return <section className="card forecast-card">
    <div className="card-head">
      <div><h2>Hourly outlook</h2><p>{air.mode === 'demo' ? 'Sample winter day' : 'Next 24 hours · IST'} · PM₂.₅ (µg/m³)</p></div>
      <MotionSwitch label="Hourly outlook display" value={view} options={[
        { key: 'chart', label: 'Chart', icon: Activity }, { key: 'readings', label: 'Readings', icon: List }
      ]} onChange={setView} className="compact" />
    </div>
    {view === 'chart' ? <ForecastChart key={`${air.city}-${air.mode}`} air={air} best={best} /> :
      <div className="readings" tabIndex={0} role="region" aria-label="Scrollable hourly PM2.5 readings">
        <table>
          <thead><tr><th scope="col">Local time</th><th scope="col">PM₂.₅ (µg/m³)</th></tr></thead>
          <tbody>{air.hours.map(point => {
            const isBest = point.hour === best?.hour && point.day === best?.day;
            return <tr key={`${point.day}-${point.hour}`} className={isBest ? 'reading-best' : undefined}>
              <td>{air.mode === 'live' && `${point.day}, `}{formatHour(point.hour)}{isBest && <span>Lower-pollution slot</span>}</td><td>{point.pm}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    <div className="forecast-footer">
      <span><i className="chart-dot" /> Hourly PM₂.₅</span>
      {best && <span className="chart-key"><i /> Lower-pollution slot</span>}
    </div>
  </section>;
}

function ActionRow({ action, picked, toggle, showEvidence }) {
  const Icon = icons[action.icon];
  return <li className="action-row">
    <div className={`action-icon ${action.color}`}><Icon size={19} /></div>
    <div className="action-text">
      <div className="action-meta"><span>{action.category}</span><i />{action.when}</div>
      <h3>{action.title}</h3>
      <p>{action.description}</p>
      <button className="action-impact" onClick={() => showEvidence(action)}><ArrowDownRight size={14} /> {action.impact}</button>
    </div>
    <button className={`pick ${picked ? 'picked' : ''}`} aria-pressed={picked} aria-label={`${picked ? 'Remove' : 'Add'} ${action.title} ${picked ? 'from' : 'to'} your plan`} onClick={() => toggle(action.id)}>
      {picked && <Check size={14} strokeWidth={2.8} />}
    </button>
  </li>;
}

function Impact({ plan, profile, picked, showMethod }) {
  const outdoor = picked.includes('activity') ? plan.outdoorMinutes : 0;
  const reduction = picked.includes('activity') && plan.usableShift ? plan.window.reduction : null;
  const co2 = picked.includes('transport') ? plan.tailpipeKg : 0;
  return <aside className="card impact-card">
    <div className="impact-title"><span className="impact-icon"><Leaf size={19} /></span><div><h2>Your plan’s impact</h2><p>Projected if you follow the plan</p></div></div>
    <div className="impact-stat"><div className="impact-label"><Timer size={15} /> Outdoor exposure</div>
      <div className="metric">{reduction > 0 ? `~${reduction}` : outdoor}<small>{reduction > 0 ? '%' : 'min'}</small></div>
      <p>{reduction > 0 ? 'less outdoor PM₂.₅ for the same activity duration' : outdoor ? 'less time outdoors for the planned activity' : 'no outdoor minutes counted as avoided'}</p>
    </div>
    <div className="impact-stat"><div className="impact-label"><Car size={15} /> Petrol-car emissions</div>
      <div className="metric">{co2 ? `~${co2.toFixed(1)}` : '0'}<small>kg CO₂</small></div>
      <p>{co2 ? `tailpipe CO₂ avoided if you skip the ${profile.km} km drive` : 'tailpipe CO₂ avoided in the selected plan'}</p>
    </div>
    <button className="method-link" onClick={showMethod}>See the calculations <ArrowUpRight size={15} /></button>
  </aside>;
}

function ProfileForm({ profile, onSave }) {
  const [draft, setDraft] = useState(profile);
  const fields = [
    ['sensitive', 'Someone is sensitive to air pollution'], ['purifier', 'We have a HEPA air purifier'],
    ['transit', 'Public transport is practical'], ['flexible', 'We can move outdoor activities'],
    ['drive', 'This trip normally uses a petrol car']
  ];
  const set = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  return <form className="profile-form" onSubmit={event => { event.preventDefault(); onSave(normalizeProfile(draft)); }}>
    <div className="form-grid"><label>City<select value={draft.city} onChange={e => set('city', e.target.value)}>{cities.map(city => <option value={city.id} key={city.id}>{city.name}</option>)}</select></label>
      <label>Who are you planning for?<select value={draft.household} onChange={e => set('household', e.target.value)}>{Object.entries(householdNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
    <fieldset>{fields.map(([key, label]) => <label key={key}><input type="checkbox" checked={draft[key]} onChange={e => set(key, e.target.checked)} />{label}</label>)}</fieldset>
    {draft.drive && <div className="form-grid"><label>Petrol round trip (km)<input required type="number" min="0" max="250" value={draft.km} onChange={e => set('km', e.target.value === '' ? '' : e.target.valueAsNumber)} /></label><label>Fuel economy (km/L)<input required type="number" min="4" max="60" value={draft.efficiency} onChange={e => set('efficiency', e.target.value === '' ? '' : e.target.valueAsNumber)} /></label></div>}
    <div className="form-grid"><label>Usual outdoor time<select value={draft.usualHour} onChange={e => set('usualHour', Number(e.target.value))}>{Array.from({ length: 14 }, (_, index) => index + 6).map(hour => <option key={hour} value={hour}>{formatHour(hour)}</option>)}</select></label>
      <label>Outdoor activity (minutes)<input required type="number" min="10" max="180" value={draft.outdoorMinutes} onChange={e => set('outdoorMinutes', e.target.value === '' ? '' : e.target.valueAsNumber)} /></label></div>
    <button className="primary-btn"><Check size={17} /> Save and update plan</button>
  </form>;
}

function SourceList({ ids }) {
  return <div className="source-list">{[...new Set(ids)].map(id => <a href={sources[id].url} key={id} target="_blank" rel="noreferrer"><BookOpen size={16} /><span><strong>{sources[id].name}</strong><small>{sources[id].note}</small></span><ArrowUpRight size={15} /></a>)}</div>;
}

function Methodology({ all = false }) {
  return <div className="methodology">
    <section><h3>Outdoor air</h3><p>The winter demo uses synthetic readings. The current forecast uses the CAMS Global grid via Open-Meteo at roughly 45 km resolution. The hourly chart shows modeled PM₂.₅. The card applies India’s PM₂.₅ bands to a 24-hour average of the model. Official CPCB AQI is based on station readings across several pollutants.</p></section>
    <section><h3>City views</h3><p>The Delhi model uses OpenStreetMap geometry with illustrative buildings and estimated heights. Each city has a credited photograph. The tint in the Delhi model depicts a citywide category and has no street-level readings.</p></section>
    <section><h3>Outdoor exposure</h3><p>Moving a planned activity indoors counts the outdoor minutes you would avoid. For a rescheduled activity, the comparison is the modeled average PM₂.₅ over equal-length blocks. Breathing rate, personal dose, and indoor concentrations are outside the estimate.</p></section>
    <section><h3>Petrol-car emissions</h3><p>Round-trip kilometres ÷ km per litre × 2.35 kg CO₂ per litre. This is gross petrol-car tailpipe CO₂ avoided when the trip is replaced. Replacement travel can have its own emissions. The estimate cannot predict a change in city AQI.</p></section>
    <section><h3>Indoor air and Gemini</h3><p>Indoor recommendations follow particle control guidance from the US EPA. Gemini, when configured, ranks reviewed actions and identifies constraints in a question. Airshift computes air-quality labels and impact estimates before presenting the result.</p></section>
    <SourceList ids={all ? Object.keys(sources) : ['cpcb', 'official', 'meteo', 'cams', 'fuel']} />
  </div>;
}

function Assistant({ profile, air, gemini, turns, setTurns, onClose, onApply, onCopy }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const request = useRef(null);
  const body = useRef(null);
  const feed = useRef(null);
  const follow = useRef(true);
  const city = cities.find(entry => entry.id === profile.city);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (follow.current) body.current.scrollTop = body.current.scrollHeight;
    });
    observer.observe(feed.current);
    return () => observer.disconnect();
  }, []);

  async function submit(value) {
    const text = value.trim();
    if (!text || busy) return;
    const controller = new AbortController();
    request.current = controller;
    const id = crypto.randomUUID?.() ?? String(Date.now());
    follow.current = true;
    setActiveReply(id);
    setTurns(previous => [...previous, { id, text }]);
    setQuestion('');
    setBusy(true);
    const recent = turns.slice(-2).map(turn => turn.text);
    const related = /^(and |but |what (if|about) |how about |instead|then\b)/i.test(text);
    const fallback = localAnswer(text, getPlan(profile, air), related ? recent.at(-1) : undefined);
    let answer = fallback;
    if (gemini) {
      try {
        const response = await fetch('/api/assistant', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ question: text, context: recent, profile, air: { pm: air.pm, mean: air.mean } })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.mode === 'gemini') answer = data;
        }
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    } else if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await new Promise(resolve => window.setTimeout(resolve, 220));
    }
    if (controller.signal.aborted) return;
    const modified = { ...profile };
    for (const flag of answer.constraints ?? []) {
      if (flag === 'no-purifier') modified.purifier = false;
      if (flag === 'no-transit') modified.transit = false;
      if (flag === 'fixed-time') modified.flexible = false;
      if (flag === 'sensitive') modified.sensitive = true;
    }
    const contextualPlan = getPlan(modified, air);
    const cards = answer.actions.map(key => contextualPlan.actions.find(action => action.id === key)).filter(Boolean);
    const result = { ...answer, profile: modified, cards, constraints: answer.constraints ?? [],
      intro: replyIntro({ ...answer, cards, profile: modified }, city, air) };
    setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, result } : turn));
    setBusy(false);
  }

  function apply(result, id) {
    onApply(result.profile, result.actions);
    setTurns(previous => previous.map(turn => turn.id === id ? { ...turn, result: { ...turn.result, applied: true } } : turn));
  }

  return <Modal title={<><AirMark className="assistant-header-mark" active={busy} /> Ask Airshift</>} onClose={onClose} drawer>
    <div className="assistant-body" ref={body} onScroll={event => {
      const panel = event.currentTarget;
      follow.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 68;
    }}>
      <div className="assistant-feed" ref={feed}>
        <div className={turns.length ? 'assistant-session' : 'assistant-welcome'}>
          {!turns.length && <AirMark className="welcome-mark" active />}
          {!turns.length && <h3>What are you planning today?</h3>}
          <span className="assistant-context"><MapPin size={14} /> {city.name} <i /> {air.mode === 'demo' ? 'Winter demo' : 'Current forecast'}</span>
          {!turns.length && <div className="suggestions">{suggestions.map(sample =>
            <button className="quiet-btn tiny" key={sample} onClick={() => submit(sample)}>{sample}<ArrowUpRight size={12} /></button>
          )}</div>}
        </div>
        {turns.map(turn => <div className="chat-turn" key={turn.id}>
          <p className="asked">{turn.text}</p>
          {turn.result ? <ReplyStream result={turn.result} immediate={turn.id !== activeReply}
            onApply={() => apply(turn.result, turn.id)} onShare={() => onCopy(groupMessage(city, air, turn.result.cards))} />
            : <div className="assistant-thinking" role="status"><AirMark className="reply-mark" active /> Preparing your reply<span aria-hidden="true"><i /><i /><i /></span></div>}
        </div>)}
      </div>
    </div>
    <form className="assistant-form" onSubmit={event => { event.preventDefault(); submit(question); }}><input value={question} placeholder="Ask about your day…" aria-label="Ask about your day" maxLength={600} onChange={event => setQuestion(event.target.value)} /><button className="primary-btn" aria-label="Send question" disabled={!question.trim() || busy}><Send size={18} strokeWidth={1.7} /></button></form>
  </Modal>;
}

function groupMessage(city, air, actions) {
  return [
    `Airshift community plan · ${city.name}`,
    air.mode === 'demo' ? 'Practice scenario with sample readings.' : `Based on a regional PM₂.₅ forecast for ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(air.validAt)}. Check local CPCB readings and official notices before acting.`,
    ...actions.map(action => `• ${action.title}. ${action.description}`),
    `Nearby official readings: ${sources.official.url}`,
    ...(city.ncr ? [`Delhi-NCR advisories: ${sources.caqm.url}`] : [])
  ].join('\n');
}

function App() {
  const [preferences, setPreferences] = useState(initialPreferences);
  const { profile, picked } = preferences;
  const city = cities.find(entry => entry.id === profile.city);
  const [page, setPage] = useState('overview');
  const rail = useSlidingIndicator(page, 'button[aria-current="page"]');
  const [air, setAir] = useState(() => demoForecast(profile.city));
  const [mode, setMode] = useState('demo');
  const [reload, setReload] = useState(0);
  const [forecastError, setForecastError] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [gemini, setGemini] = useState(false);
  const [assistantTurns, setAssistantTurns] = useState([]);
  const [toast, setToast] = useState('');
  const [area, setArea] = useState(15);
  const visibleAir = air.city === city.id ? air : demoForecast(city.id);
  const plan = getPlan(profile, visibleAir);
  const [manualCopy, setManualCopy] = useState('');

  useEffect(() => {
    try { localStorage.setItem('airshift-preferences', JSON.stringify(preferences)); } catch { /* Storage is optional. */ }
  }, [preferences]);
  useEffect(() => {
    fetch('/api/status').then(response => response.json()).then(status => setGemini(status.gemini === true)).catch(() => {});
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setForecastError('');
    if (mode === 'demo') {
      setAir(demoForecast(city.id));
      setLoading(false);
      return;
    }
    const fetchAir = async () => {
      setLoading(true);
      setForecastError('');
      try {
        const response = await fetch(`/api/forecast?city=${city.id}`, { signal: controller.signal }).catch(() => null);
        if (controller.signal.aborted) return;
        const forecast = response?.ok ? await response.json() : await forecastFromOpenMeteo(city,
          AbortSignal.any([controller.signal, AbortSignal.timeout(6500)]));
        if (!controller.signal.aborted) setAir(forecast);
      } catch {
        if (!controller.signal.aborted) {
          setAir(demoForecast(city.id));
          setForecastError('Current forecast unavailable. Showing the winter demo.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchAir();
    const timer = setInterval(fetchAir, 15 * 60 * 1000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [city.id, mode, reload]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 3300);
    return () => clearTimeout(timeout);
  }, [toast]);
  const navigate = target => {
    const move = () => { setPage(target); window.scrollTo({ top: 0, behavior: 'instant' }); };
    if (page === target || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) move();
    else document.startViewTransition(() => flushSync(move));
  };
  const saveProfile = (value, actionIds) => {
    if (value.city !== city.id) setAssistantTurns([]);
    setPreferences({
      profile: value,
      picked: actionIds ?? getPlan(value, value.city === city.id ? visibleAir : demoForecast(value.city)).initial
    });
  };
  const toggle = id => setPreferences(previous => ({
    ...previous,
    picked: previous.picked.includes(id) ? previous.picked.filter(key => key !== id) : [...previous.picked, id]
  }));
  const setDataMode = value => {
    if (value === mode && value === 'live') setReload(previous => previous + 1);
    setMode(value);
  };
  const openEvidence = action => setModal({ type: 'action', action });
  const renderActions = actions => <ul className="action-list">{actions.map(action => <ActionRow key={action.id} action={action} picked={picked.includes(action.id)} toggle={toggle} showEvidence={openEvidence} />)}</ul>;
  const profileAction = () => setModal({ type: 'profile' });
  const methodAction = () => setModal({ type: 'method' });
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); setToast('Community plan copied'); }
    catch { setManualCopy(text); }
  };
  const shareCards = [plan.actions.find(action => action.id === 'community'), plan.actions.find(action => action.id === 'home'), plan.actions.find(action => action.id === 'transport')];
  const communityText = groupMessage(city, visibleAir, shareCards);
  const pageHeading = {
    routine: ['Your daily plan', 'Choose the actions that fit your schedule and see their projected impact.'],
    indoor: ['Cleaner air at home', 'Reduce indoor particle sources and make the most of the equipment you have.'],
    community: ['Plan with your community', 'Give neighbours, school groups and building teams a plan they can use together.'],
    evidence: ['Sources & methods', 'Trace the recommendations, forecast and impact estimates back to their sources.']
  }[page];

  const dataStatus = visibleAir.mode === 'demo' ? 'Synthetic winter readings'
    : `Model valid at ${new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(visibleAir.validAt)} IST`;

  return <div className={page === 'overview' ? 'app-shell overview-shell' : 'app-shell'}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <button className="brand-button" aria-label="Airshift home" onClick={() => navigate('overview')}><Brand /></button>
      <nav aria-label="Main navigation" ref={rail} className="sliding-rail"><span className="sliding-thumb" aria-hidden="true" />{nav.map(([id, label, Icon]) => <button key={id} className={page === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)} aria-label={label} title={label} aria-current={page === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.65} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><button className="sidebar-foot" onClick={profileAction} aria-label="Household settings" title="Household settings"><span className="side-avatar"><Users size={17} /></span><span><strong>My household</strong><small>{householdNames[profile.household]}</small></span><ChevronRight size={15} className="profile-chevron" /></button></div>
    </aside>
    <main className="main" id="main-content" tabIndex={-1}>
      <header className="topbar">{page === 'overview' ? <span className="atlas-wordmark">airshift<span>.</span></span>
        : <div className="breadcrumb"><span>Airshift</span><ChevronRight size={13} /><strong>{nav.find(item => item[0] === page)[1]}</strong></div>}
        <button className="mobile-brand" onClick={() => navigate('overview')} aria-label="Airshift home"><Brand /></button><div className="top-actions">
        <button className="quiet-btn city-button" onClick={() => setModal({ type: 'city' })}><MapPin size={16} /> {city.name} <ChevronDown size={14} /></button>
        <button className="primary-btn ask-btn" onClick={() => setModal({ type: 'assistant' })}><AirMark className="button-mark" /> Ask Airshift</button>
      </div></header>
      <div className="main-content">
        {page !== 'overview' && <header className="page-header"><div>
          <h1>{pageHeading[0]}</h1><p>{pageHeading[1]}</p></div>
          {page !== 'evidence' && <button className="quiet-btn customize" onClick={profileAction}><SlidersHorizontal size={16} /> Customize plan</button>}
        </header>}
        {page !== 'evidence' && page !== 'overview' && <div className="data-status" role="status">
          <span className={`status-dot ${visibleAir.mode}`} />{dataStatus}
        </div>}
        {page === 'overview' && <>
          <AirSnapshot air={visibleAir} city={city} plan={plan} dataStatus={dataStatus} onSources={methodAction}>
            <div className="atlas-modes">
              <MotionSwitch label="Air data mode" value={visibleAir.mode} options={[
                { key: 'demo', label: 'Winter demo', icon: FlaskConical, disabled: loading && visibleAir.mode === 'demo' },
                { key: 'live', label: loading ? 'Loading…' : 'Current forecast', icon: Radio, disabled: loading }
              ]} onChange={setDataMode} />
              <button className="quiet-btn customize" onClick={profileAction}><SlidersHorizontal size={16} /> Customize plan</button>
            </div>
          </AirSnapshot>
          {forecastError && <p className="forecast-error atlas-error" role="status"><TriangleAlert size={16} /> {forecastError} <a href={sources.official.url} target="_blank" rel="noreferrer">Check CPCB <ArrowUpRight size={12} /></a></p>}
          <div className="overview-grid">
            <HourlyOutlook air={visibleAir} best={plan.window.best} />
            <section className="card plan-card"><div className="card-head"><div><h2>Today’s plan</h2><p>{householdNames[profile.household]} · {picked.length} selected</p></div><button className="text-btn" onClick={() => navigate('routine')}>View plan <ArrowRight size={15} /></button></div>
              {renderActions(plan.actions.filter(action => plan.initial.includes(action.id) || picked.includes(action.id)))}
            </section>
            <Impact plan={plan} profile={profile} picked={picked} showMethod={methodAction} />
          </div>
        </>}
        {page === 'routine' && <div className="lower-grid">
          <section className="card plan-card"><div className="card-head"><div><h2>Recommended actions</h2><p>{householdNames[profile.household]} · {picked.length} selected</p></div></div>{renderActions(plan.actions)}</section>
          <Impact plan={plan} profile={profile} picked={picked} showMethod={methodAction} />
        </div>}
        {page === 'indoor' && <div className="lower-grid subpage-grid"><section className="card plan-card"><div className="card-head"><div><h2>Indoor actions</h2><p>{profile.purifier ? 'With a HEPA purifier' : 'Without a purifier'}</p></div></div>{renderActions(plan.actions.filter(action => action.category === 'Indoor air'))}</section>
          <section className="card tool-card"><span className="impact-icon"><Wind size={20} /></span><h2>Size a room purifier</h2><p>Estimate the minimum smoke CADR to look for on the product label.</p><label>Room floor area (m²)<input type="number" min={5} max={100} value={area} onChange={event => setArea(event.target.value)} /></label><div className="metric">{Number(area) >= 5 && Number(area) <= 100 ? Math.round(Number(area) * 12.2) : '—'}<small>m³/h</small></div><p>EPA rule of thumb for an approximately 2.4 m ceiling. Taller rooms can need more capacity.</p><SourceList ids={['filter']} /></section></div>}
        {page === 'community' && <div className="lower-grid subpage-grid"><section className="card plan-card"><div className="card-head"><div><h2>Community actions</h2><p>For schools, societies and neighbourhood groups</p></div></div>{renderActions(shareCards)}</section>
          <section className="card tool-card"><span className="impact-icon"><Share2 size={19} /></span><h2>Share a briefing</h2><p>Copy this message for your school or residents’ group.</p><pre className="share-preview">{communityText}</pre><button className="primary-btn" onClick={() => copy(communityText)}><Share2 size={16} /> Copy briefing</button></section></div>}
        {page === 'evidence' && <section className="card evidence-card"><Methodology all /></section>}
        <footer className="main-footer"><span><LocateFixed size={14} /> India · Local time (IST)</span><span>{visibleAir.mode === 'live' ? <><a href={sources.meteo.url} target="_blank" rel="noreferrer">Open-Meteo</a><a href={sources.cams.url} target="_blank" rel="noreferrer">CAMS</a></> : 'Synthetic winter scenario'}<button onClick={methodAction}>Data & assumptions <ArrowUpRight size={12} /></button></span></footer>
      </div>
    </main>
    {modal?.type === 'profile' && <Modal title="Customize your plan" onClose={() => setModal(null)}><ProfileForm profile={profile} onSave={value => { saveProfile(value); setModal(null); setToast('Household plan updated'); }} /></Modal>}
    {modal?.type === 'city' && <Modal title="Choose your city" onClose={() => setModal(null)}><div className="city-list">{cities.map(entry => <button key={entry.id} className={entry.id === city.id ? 'chosen' : ''} onClick={() => { saveProfile({ ...profile, city: entry.id }); setModal(null); }}><img src={`/cities/${entry.id}-thumb.webp`} alt="" width={48} height={38} loading="lazy" /><span><strong>{entry.name}</strong><small>{entry.region}</small></span>{entry.id === city.id && <Check size={16} />}</button>)}</div></Modal>}
    {modal?.type === 'method' && <Modal title="Data & assumptions" onClose={() => setModal(null)}><Methodology /></Modal>}
    {modal?.type === 'action' && <Modal title={modal.action.title} onClose={() => setModal(null)}><div className="methodology"><p>{modal.action.impact}</p><SourceList ids={modal.action.sources} /><button className="text-btn" onClick={methodAction}>How impact is estimated <ArrowRight size={15} /></button></div></Modal>}
    {modal?.type === 'assistant' && <Assistant profile={profile} air={visibleAir} gemini={gemini} turns={assistantTurns} setTurns={setAssistantTurns}
      onClose={() => { setAssistantTurns(previous => previous.filter(turn => turn.result)); setModal(null); }}
      onApply={(value, ids) => { saveProfile(value, [...new Set([...picked, ...ids])]); setToast('Daily plan updated'); }} onCopy={copy} />}
    {manualCopy && <Modal title="Copy this briefing" onClose={() => setManualCopy('')}><div className="methodology"><textarea className="manual-copy" readOnly value={manualCopy} onFocus={event => event.target.select()} aria-label="Community briefing" /></div></Modal>}
    {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
