#!/usr/bin/env bash
# Pre-deploy verification checks.
# Run this script before hitting "Deploy to Production" on Emergent.
# Fails fast on any broken chart, lint error, or build error.
#
# Usage:
#   bash /app/scripts/pre-deploy-check.sh
#
# Exit codes:
#   0 - All checks passed, safe to deploy
#   1 - At least one check failed, DO NOT deploy

set -uo pipefail

FAIL=0
log()  { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m    ✓ %s\033[0m\n" "$1"; }
err()  { printf "\033[1;31m    ✗ %s\033[0m\n" "$1"; FAIL=1; }

# 1. Frontend lint (catches no-undef bugs Recharts silently swallows)
log "Step 1/4 — Frontend ESLint (errors only)"
if ( cd /app/frontend && npx eslint src --quiet >/tmp/eslint.log 2>&1 ); then
  ok "ESLint clean (0 errors)"
else
  err "ESLint has errors — see /tmp/eslint.log"
fi

# 2. Backend syntax / import check
log "Step 2/4 — Backend Python syntax check"
if python3 -m py_compile /app/backend/server.py >/tmp/pycompile.log 2>&1; then
  ok "Backend compiles"
else
  err "Backend syntax error — see /tmp/pycompile.log"
fi

# 3. Playwright chart smoke tests (detects silent Recharts failures)
log "Step 3/4 — Playwright chart visual smoke tests"
if ( cd /app/tests && npx playwright test charts-visual.spec.ts \
        --reporter=line --workers=1 --retries=0 >/tmp/charts-test.log 2>&1 ); then
  ok "All chart tests passed"
else
  err "Chart tests failed — see /tmp/charts-test.log"
  tail -40 /tmp/charts-test.log || true
fi

# 4. Frontend production build (catches build-time errors)
log "Step 4/4 — Frontend production build"
if ( cd /app/frontend && CI=true yarn build >/tmp/build.log 2>&1 ); then
  ok "Production build succeeded"
else
  err "Production build failed — see /tmp/build.log"
  tail -30 /tmp/build.log || true
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  printf "\033[1;42m PRE-DEPLOY CHECK PASSED — safe to deploy \033[0m\n\n"
  exit 0
else
  printf "\033[1;41m PRE-DEPLOY CHECK FAILED — DO NOT deploy \033[0m\n\n"
  exit 1
fi
