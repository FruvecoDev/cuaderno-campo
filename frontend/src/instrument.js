/**
 * Sentry initialization.
 *
 * MUST be imported as the very first line of `index.js` so that Sentry hooks
 * into the runtime before any React components load.
 *
 * Gracefully no-ops when `REACT_APP_SENTRY_DSN` is empty or missing — the app
 * works identically without a Sentry account. Set the env var to activate.
 *
 * Scope intentionally minimal:
 *  - No performance tracing (tracesSampleRate: 0)
 *  - No session replay (bundle size + PII concerns for field-worker mobile)
 *  - Captures ALL existing `console.error` calls via CaptureConsole integration
 *  - Captures unhandled exceptions + unhandled promise rejections (default)
 */

import * as Sentry from '@sentry/react';

const dsn = process.env.REACT_APP_SENTRY_DSN;
const isEnabled = typeof dsn === 'string' && dsn.trim().length > 0;

if (isEnabled) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.NODE_ENV,
    release: process.env.REACT_APP_VERSION || undefined,

    // Capture every console.error automatically — resolves the 221 catch
    // blocks that now log errors with context, without touching any file.
    integrations: [
      Sentry.captureConsoleIntegration({
        levels: ['error'],
      }),
    ],

    // Minimal overhead — no tracing, no replay
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Privacy: don't send IP / cookies / headers automatically
    sendDefaultPii: false,

    // Drop noisy events that aren't actionable
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
    ],

    beforeSend(event) {
      // Strip request headers / cookies that could contain JWT or PII
      if (event.request) {
        delete event.request.headers;
        delete event.request.cookies;
      }
      return event;
    },
  });
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
export const isSentryEnabled = isEnabled;
