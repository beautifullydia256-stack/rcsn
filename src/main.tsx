import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isDesktopApp } from './lib/isDesktopApp';

const Router = isDesktopApp ? HashRouter : BrowserRouter;

// Apply persisted theme before React mounts to avoid flashes/inconsistency.
let savedTheme = localStorage.getItem('pwezacore-theme');
if (!savedTheme) {
  try {
    const rawUi = localStorage.getItem('pwezacore-ui-storage');
    if (rawUi) {
      const parsed = JSON.parse(rawUi);
      if (parsed?.state?.theme === 'dark' || parsed?.state?.theme === 'light') {
        savedTheme = parsed.state.theme;
      }
    }
  } catch {}
}
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const effectiveTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
const root = document.documentElement;
root.classList.remove('light', 'dark');
root.classList.add(effectiveTheme);
root.setAttribute('data-theme', effectiveTheme);
root.style.backgroundColor = effectiveTheme === 'dark' ? '#05080f' : '#F5F5F5';
root.style.colorScheme = effectiveTheme;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);




