import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Apply persisted theme before React mounts to avoid flashes/inconsistency.
const savedTheme = localStorage.getItem('pwezacore-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const effectiveTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
document.documentElement.classList.remove('light', 'dark');
document.documentElement.classList.add(effectiveTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);




