import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isDesktopApp } from './lib/isDesktopApp';

const Router = isDesktopApp ? HashRouter : BrowserRouter;

// Apply persisted theme before React mounts to avoid flashes/inconsistency.
const savedTheme = localStorage.getItem('pwezacore-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const effectiveTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
document.documentElement.classList.remove('light', 'dark');
document.documentElement.classList.add(effectiveTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);




