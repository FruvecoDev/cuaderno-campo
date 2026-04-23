import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';
import App from './App';
import { initializeTheme } from './services/themeService';
import { register as registerSW } from './serviceWorkerRegistration';

// Silence non-critical console output in production builds.
// Rationale:
//  - Prevents information leaks / noise to end users' browser devtools.
//  - Keeps `console.error` intact so production bugs remain visible
//    in Sentry / browser devtools for triage.
//  - In `development`, all logs pass through untouched.
if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
  // console.error intentionally preserved for real errors.
}

// Load theme on app start
initializeTheme();

// Validate localStorage token format to prevent issues
try {
  const token = localStorage.getItem('token');
  if (token && typeof token !== 'string') {
    localStorage.removeItem('token');
  }
} catch (err) { console.error('[index.js]', err); }

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Register service worker for PWA
registerSW();