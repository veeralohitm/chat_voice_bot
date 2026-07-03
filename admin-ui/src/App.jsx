import { useEffect, useState } from 'react';
import { Overview } from './pages/Overview';
import { Sessions } from './pages/Sessions';
import { ClientConfig } from './pages/ClientConfig';
import { LanguagesProvider } from './languagesContext';

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20V10M12 20V4M20 20v-6" />
    </svg>
  );
}

function SessionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ConfigIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', Icon: OverviewIcon, Component: Overview, subtitle: 'Volume and quality at a glance' },
  { id: 'sessions', label: 'Sessions', Icon: SessionsIcon, Component: Sessions, subtitle: 'Every call and chat, with full transcripts' },
  { id: 'clients', label: 'Client Config', Icon: ConfigIcon, Component: ClientConfig, subtitle: 'Languages, fallback, and overflow behavior per account' },
];

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const active = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = active.Component;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <LanguagesProvider>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">VB</div>
            <div className="brand-text">
              <span className="brand-title">Voice/Chat Bot</span>
              <span className="brand-subtitle">Admin</span>
            </div>
          </div>

          <nav className="nav-list">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`nav-item${tab.id === activeTab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.Icon />
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            className="nav-item"
            style={{ marginTop: 'auto' }}
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </aside>

        <div className="main">
          <div className="topbar">
            <div>
              <h1 className="topbar-title">{active.label}</h1>
              <div className="topbar-subtitle">{active.subtitle}</div>
            </div>
            <span className="live-pill">
              <span className="live-dot" />
              Live
            </span>
          </div>

          <div className="content">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </LanguagesProvider>
  );
}

export default App;
