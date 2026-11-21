import React from 'react';
import {
  ArrowUpRight, BookOpen, ChevronDown, ChevronRight, ClipboardList, House, LayoutGrid, LocateFixed, MapPin,
  SlidersHorizontal, Users
} from 'lucide-react';
import { householdNames, sources } from '../domain.mjs';
import { Brand } from './Brand.jsx';
import { AirMark, useSlidingIndicator } from './motion.jsx';

export const PAGES = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'routine', label: 'Daily plan', icon: ClipboardList, heading: 'Your daily plan', intro: 'Choose the actions that fit your schedule and see their projected impact.' },
  { id: 'indoor', label: 'Indoor air', icon: House, heading: 'Cleaner air at home', intro: 'Reduce indoor particle sources and make the most of the equipment you have.' },
  { id: 'community', label: 'Community', icon: Users, heading: 'Plan with your community', intro: 'Give neighbours, school groups and building teams a plan they can use together.' },
  { id: 'evidence', label: 'Sources & methods', icon: BookOpen, heading: 'Sources & methods', intro: 'Trace the recommendations, forecast and impact estimates back to their sources.' }
];

const pageById = id => PAGES.find(page => page.id === id);

/** Desktop sidebar and mobile bottom navigation. */
export function Sidebar({ page, household, onNavigate, onEditProfile }) {
  const rail = useSlidingIndicator(page, 'button[aria-current="page"]');
  return (
    <div className="sidebar">
      <button className="brand-button" aria-label="Airshift home" onClick={() => onNavigate('overview')}><Brand /></button>
      <nav aria-label="Main navigation" ref={rail} className="sliding-rail">
        <span className="sliding-thumb" aria-hidden="true" />
        {PAGES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={page === id ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate(id)}
            aria-label={label}
            title={label}
            aria-current={page === id ? 'page' : undefined}
          >
            <Icon size={19} strokeWidth={1.65} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-foot" onClick={onEditProfile} aria-label="Household settings" title="Household settings">
          <span className="side-avatar"><Users size={17} /></span>
          <span><strong>My household</strong><small>{householdNames[household]}</small></span>
          <ChevronRight size={15} className="profile-chevron" />
        </button>
      </div>
    </div>
  );
}

/** Top bar with the city picker and assistant button. */
export function Topbar({ page, cityName, onNavigate, onPickCity, onAsk }) {
  return (
    <header className="topbar">
      {page === 'overview'
        ? <span className="atlas-wordmark">airshift<span>.</span></span>
        : <div className="breadcrumb"><span>Airshift</span><ChevronRight size={13} /><strong>{pageById(page).label}</strong></div>}
      <button className="mobile-brand" onClick={() => onNavigate('overview')} aria-label="Airshift home"><Brand /></button>
      <div className="top-actions">
        <button className="quiet-btn city-button" onClick={onPickCity}><MapPin size={16} /> {cityName} <ChevronDown size={14} /></button>
        <button className="primary-btn ask-btn" onClick={onAsk}><AirMark className="button-mark" /> Ask Airshift</button>
      </div>
    </header>
  );
}

/** Title, introduction and data status for every page except the overview. */
export function PageHeader({ page, mode, dataStatus, onCustomize }) {
  const { heading, intro } = pageById(page);
  return (
    <>
      <header className="page-header">
        <div><h1>{heading}</h1><p>{intro}</p></div>
        {page !== 'evidence' && (
          <button className="quiet-btn customize" onClick={onCustomize}><SlidersHorizontal size={16} /> Customize plan</button>
        )}
      </header>
      {page !== 'evidence' && (
        <div className="data-status" role="status"><span className={`status-dot ${mode}`} />{dataStatus}</div>
      )}
    </>
  );
}

/** Data attribution and a link to the assumptions. */
export function Footer({ mode, onShowMethod }) {
  return (
    <footer className="main-footer">
      <span><LocateFixed size={14} /> India · Local time (IST)</span>
      <span>
        {mode === 'live'
          ? <><a href={sources.meteo.url} target="_blank" rel="noreferrer">Open-Meteo</a><a href={sources.cams.url} target="_blank" rel="noreferrer">CAMS</a></>
          : 'Synthetic winter scenario'}
        <button onClick={onShowMethod}>Data & assumptions <ArrowUpRight size={12} /></button>
      </span>
    </footer>
  );
}
