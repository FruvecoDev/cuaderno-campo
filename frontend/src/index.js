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
  
  // Also clear any service worker caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
        console.log('Cache deleted:', name);
      });
    }).catch(err => {
      console.log('Error clearing caches:', err);
    });
  }
}

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