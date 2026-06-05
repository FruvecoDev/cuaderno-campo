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
log "Step 1/7 — Frontend ESLint (errors only)"
if ( cd /app/frontend && npx eslint src --quiet >/tmp/eslint.log 2>&1 ); then
  ok "ESLint clean (0 errors)"
else
  err "ESLint has errors — see /tmp/eslint.log"
fi

# 2. Backend syntax / import check
log "Step 2/7 — Backend Python syntax check"
if python3 -m py_compile /app/backend/server.py >/tmp/pycompile.log 2>&1; then
  ok "Backend compiles"
else
  err "Backend syntax error — see /tmp/pycompile.log"
fi

# 3. Playwright chart smoke tests (detects silent Recharts failures)
log "Step 3/7 — Playwright chart visual smoke tests"
if ( cd /app/tests && npx playwright test charts-visual.spec.ts \
        --reporter=line --workers=1 --retries=0 >/tmp/charts-test.log 2>&1 ); then
  ok "All chart tests passed"
else
  err "Chart tests failed — see /tmp/charts-test.log"
  tail -40 /tmp/charts-test.log || true
fi

# 4. Frontend production build (catches build-time errors)
log "Step 4/7 — Frontend production build"
if ( cd /app/frontend && CI=true yarn build >/tmp/build.log 2>&1 ); then
  ok "Production build succeeded"
else
  err "Production build failed — see /tmp/build.log"
  tail -30 /tmp/build.log || true
fi

# 5. List-fetch audit (catches setX(data) bugs that show empty lists silently)
log "Step 5/7 — Frontend list-fetch static audit"
if python3 /app/scripts/audit_list_fetch.py >/tmp/audit.log 2>&1; then
  ok "All list endpoints assigned correctly"
else
  err "List-fetch issues — see /tmp/audit.log"
  cat /tmp/audit.log || true
fi

# 6. i18n key audit (catches t('foo.bar') keys missing from es.json)
log "Step 6/7 — i18n translation key audit"
if python3 /app/scripts/audit_i18n_keys.py >/tmp/i18n.log 2>&1; then
  ok "All translation keys present in es.json"
else
  err "Missing translation keys — see /tmp/i18n.log"
  cat /tmp/i18n.log || true
fi

# 7. Smoke test CRUD - catches Pydantic model regressions and broken endpoints
log "Step 7/7 — Smoke test CRUD against live backend"
if ( cd /app/backend && REACT_APP_BACKEND_URL="$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)" \
       TEST_EMAIL=admin@fruveco.com TEST_PASSWORD=admin123 \
       python3 -m pytest tests/test_smoke_crud.py -q --tb=short >/tmp/smoke.log 2>&1 ); then
  ok "All CRUD smoke tests passed"
else
  err "Smoke tests failed — see /tmp/smoke.log"
  tail -40 /tmp/smoke.log || true
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  printf "\033[1;42m PRE-DEPLOY CHECK PASSED — safe to deploy \033[0m\n\n"
  exit 0
else
  printf "\033[1;41m PRE-DEPLOY CHECK FAILED — DO NOT deploy \033[0m\n\n"
  exit 1
fi
