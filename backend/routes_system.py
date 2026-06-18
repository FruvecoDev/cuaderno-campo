"""
System / app metadata endpoints.

Exposes lightweight, public information about the running deployment so the
frontend can display a "version badge" in the header (last deploy date, commit
hash, etc.). Intentionally read-only and unauthenticated (only public metadata
is returned — no secrets, paths, or stack info).
"""

import os
import subprocess
from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter

router = APIRouter(prefix="/api/system", tags=["system"])

# Captured once at import time so a "deploy" pins a stable value.
_BOOTED_AT = datetime.now(timezone.utc).isoformat()


def _run_git(*args: str) -> str:
    """Run a git command and return stdout (stripped). Empty string on error."""
    try:
        out = subprocess.check_output(
            ["git", *args],
            cwd="/app",
            stderr=subprocess.DEVNULL,
            timeout=2,
        )
        return out.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""


@lru_cache(maxsize=1)
def _build_version_payload() -> dict:
    """Compute the version payload once and memoize for the process lifetime."""
    # Env-var overrides take precedence (useful when running in a deployed pod
    # where git history isn't reachable).
    commit_full = os.environ.get("APP_COMMIT_SHA") or _run_git("rev-parse", "HEAD")
    commit_short = (commit_full[:7] if commit_full else "") or os.environ.get("APP_COMMIT_SHORT", "")
    commit_date = os.environ.get("APP_COMMIT_DATE") or _run_git("log", "-1", "--pretty=format:%cI")
    commit_message = os.environ.get("APP_COMMIT_MESSAGE") or _run_git("log", "-1", "--pretty=format:%s")
    branch = os.environ.get("APP_BRANCH") or _run_git("rev-parse", "--abbrev-ref", "HEAD")
    version = os.environ.get("APP_VERSION", "1.0.0")

    return {
        "version": version,
        "commit": commit_full,
        "commit_short": commit_short,
        "commit_date": commit_date,
        "commit_message": commit_message,
        "branch": branch,
        "booted_at": _BOOTED_AT,
        "environment": os.environ.get("APP_ENV", "preview"),
    }


@router.get("/version")
async def get_version() -> dict:
    """Return public deploy metadata for the version badge."""
    return _build_version_payload()
