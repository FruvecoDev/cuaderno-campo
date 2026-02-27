import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';
import App from './App';
import { initializeTheme } from './services/themeService';

// Load theme on app start
initializeTheme();

// Unregister any existing service workers to prevent postMessage errors
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
      console.log('Service Worker unregistered:', registration.scope);
    });
  }).catch(err => {
    console.log('Error unregistering service workers:', err);
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);