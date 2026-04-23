"""
Sentry initialization for the backend.

MUST be imported and called BEFORE `FastAPI()` instance creation so that
Sentry can hook into Starlette / FastAPI middleware before routes are mounted.

Gracefully no-ops when `SENTRY_DSN_BACKEND` is empty or missing — the app
behaves identically without a Sentry account. Set the env var to activate.

Scope intentionally minimal to match the frontend configuration:
 - No performance tracing (traces_sample_rate = 0)
 - No default PII (no user emails, IPs, auth headers)
 - Captures every unhandled exception + 5xx responses automatically
"""
import os
import logging

logger = logging.getLogger(__name__)


def init_sentry_backend() -> bool:
    """Initialize Sentry if a DSN is configured. Returns True if enabled."""
    dsn = os.environ.get("SENTRY_DSN_BACKEND", "").strip()
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=os.environ.get("ENV", "production"),
            release=os.environ.get("APP_VERSION") or None,
            # Minimal: no tracing / profiling overhead
            traces_sample_rate=0,
            profiles_sample_rate=0,
            # Privacy: strip PII (user emails, IPs, auth headers)
            send_default_pii=False,
            # Drop noisy / non-actionable events
            ignore_errors=[KeyboardInterrupt],
            integrations=[
                StarletteIntegration(
                    transaction_style="endpoint",
                    # Report 5xx responses (not 4xx client errors)
                    failed_request_status_codes={*range(500, 600)},
                ),
                FastApiIntegration(
                    transaction_style="endpoint",
                    failed_request_status_codes={*range(500, 600)},
                ),
            ],
            before_send=_before_send,
        )
        logger.info("Sentry initialized for backend.")
        return True
    except Exception as exc:  # pragma: no cover - init must not crash the app
        logger.error("Failed to initialize Sentry: %s", exc)
        return False


def _before_send(event, _hint):
    """Strip sensitive headers / cookies before sending to Sentry."""
    request = event.get("request") or {}
    headers = request.get("headers")
    if isinstance(headers, dict):
        for sensitive in ("authorization", "cookie", "x-api-key"):
            headers.pop(sensitive, None)
            headers.pop(sensitive.title(), None)
    request.pop("cookies", None)
    return event
