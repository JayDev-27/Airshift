import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Check } from 'lucide-react';
import { cities, demoForecast, getPlan } from './domain.mjs';
import { Assistant } from './components/Assistant.jsx';
import { Dialogs, ManualCopy } from './components/Dialogs.jsx';
import { Footer, PageHeader, Sidebar, Topbar } from './components/Layout.jsx';
import { useForecast } from './hooks/useForecast.js';
import { useGeminiStatus } from './hooks/useGeminiStatus.js';
import { useToast } from './hooks/useToast.js';
import { dataStatusLabel, groupMessage, toggleId } from './lib/planning.mjs';
import { loadPreferences, savePreferences } from './lib/preferences.mjs';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { CommunityPage, EvidencePage, IndoorPage, RoutinePage } from './pages/SubPages.jsx';

const SHARE_ACTION_IDS = ['community', 'home', 'transport'];

/** localStorage can throw in private windows or when site data is blocked. */
const browserStorage = () => {
  try { return window.localStorage; } catch { return undefined; }
};

/** Page change with a view transition when supported and motion is allowed. */
function transitionTo(update) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduced) {
    update();
    return;
  }
  const transition = document.startViewTransition(() => flushSync(update));
  // A newer navigation skips the running animation; the page still updates, so the rejection is expected.
  for (const step of [transition.ready, transition.updateCallbackDone, transition.finished]) step.catch(() => {});
}

export default function App() {
  const [preferences, setPreferences] = useState(() => loadPreferences(browserStorage()));
  const { profile, picked } = preferences;
  const city = cities.find(entry => entry.id === profile.city);
  const [page, setPage] = useState('overview');
  const [mode, setMode] = useState('demo');
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState(null);
  const [assistantTurns, setAssistantTurns] = useState([]);
  const [manualCopy, setManualCopy] = useState('');
  const [toast, setToast] = useToast();
  const gemini = useGeminiStatus();
  const forecast = useForecast(city, mode, reload);
  const air = forecast.air;
  const plan = getPlan(profile, air);
  const shareCards = SHARE_ACTION_IDS.map(id => plan.actions.find(action => action.id === id));
  const dataStatus = dataStatusLabel(air);

  useEffect(() => savePreferences(browserStorage(), preferences), [preferences]);

  const closeModal = () => setModal(null);
  const saveProfile = (value, actionIds) => {
    if (value.city !== city.id) setAssistantTurns([]);
    const planAir = value.city === city.id ? air : demoForecast(value.city);
    setPreferences({ profile: value, picked: actionIds ?? getPlan(value, planAir).initial });
  };
  const copy = async text => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Community plan copied');
    } catch {
      setManualCopy(text);
    }
  };

  const actions = {
    navigate: target => {
      // Every navigation goes through the same queue so the last click always wins.
      transitionTo(() => { setPage(target); window.scrollTo({ top: 0, behavior: 'instant' }); });
    },
    toggle: id => setPreferences(previous => ({ ...previous, picked: toggleId(previous.picked, id) })),
    showEvidence: action => setModal({ type: 'action', action }),
    showMethod: () => setModal({ type: 'method' }),
    editProfile: () => setModal({ type: 'profile' }),
    copy
  };
  const forecastControls = {
    loading: forecast.loading,
    error: forecast.error,
    setMode: value => {
      if (value === mode && value === 'live') setReload(previous => previous + 1);
      setMode(value);
    }
  };
  const shared = { plan, profile, picked, actions };

  return (
    <div className={page === 'overview' ? 'app-shell overview-shell' : 'app-shell'}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Sidebar page={page} household={profile.household} onNavigate={actions.navigate} onEditProfile={actions.editProfile} />
      <main className="main" id="main-content" tabIndex={-1}>
        <Topbar
          page={page}
          cityName={city.name}
          onNavigate={actions.navigate}
          onPickCity={() => setModal({ type: 'city' })}
          onAsk={() => setModal({ type: 'assistant' })}
        />
        <div className="main-content">
          {page !== 'overview' && <PageHeader page={page} mode={air.mode} dataStatus={dataStatus} onCustomize={actions.editProfile} />}
          {page === 'overview' && <OverviewPage {...shared} air={air} city={city} dataStatus={dataStatus} forecast={forecastControls} />}
          {page === 'routine' && <RoutinePage {...shared} />}
          {page === 'indoor' && <IndoorPage {...shared} />}
          {page === 'community' && <CommunityPage {...shared} shareCards={shareCards} briefing={groupMessage(city, air, shareCards)} />}
          {page === 'evidence' && <EvidencePage />}
          <Footer mode={air.mode} onShowMethod={actions.showMethod} />
        </div>
      </main>
      <Dialogs
        modal={modal}
        profile={profile}
        onClose={closeModal}
        onShowMethod={actions.showMethod}
        onSaveProfile={value => { saveProfile(value); closeModal(); setToast('Household plan updated'); }}
        onPickCity={id => { saveProfile({ ...profile, city: id }); closeModal(); }}
      />
      {modal?.type === 'assistant' && (
        <Assistant
          profile={profile}
          air={air}
          gemini={gemini}
          turns={assistantTurns}
          setTurns={setAssistantTurns}
          onClose={() => { setAssistantTurns(previous => previous.filter(turn => turn.result)); closeModal(); }}
          onApply={(value, ids) => { saveProfile(value, [...new Set([...picked, ...ids])]); setToast('Daily plan updated'); }}
          onCopy={copy}
        />
      )}
      {manualCopy && <ManualCopy text={manualCopy} onClose={() => setManualCopy('')} />}
      {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
    </div>
  );
}
