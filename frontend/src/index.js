import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';
import App from './App';
import { initializeTheme } from './services/themeService';
import { register as registerSW } from './serviceWorkerRegistration';

// Load theme on app start
initializeTheme();

// Validate localStorage token format to prevent issues
try {
  const token = localStorage.getItem('token');
  if (token && typeof token !== 'string') {
    localStorage.removeItem('token');
    console.log('Invalid token format cleared');
  }
} catch (err) {
  console.warn('Error validating localStorage:', err);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Register service worker for PWA
registerSW();