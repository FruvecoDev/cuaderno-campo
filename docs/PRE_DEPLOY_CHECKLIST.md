# Pre-Deploy Checklist

Run BEFORE clicking **Deploy to Production** on Emergent.

## 🚀 Quick run (1 command)

```bash
bash /app/scripts/pre-deploy-check.sh
```

Exits with **0** → safe to deploy. Exits with **1** → DO NOT deploy, fix the
failing step first.

### What it verifies

| # | Check                                  | Why                                                      |
|---|----------------------------------------|----------------------------------------------------------|
| 1 | Frontend ESLint (`no-undef`, syntax)   | Catches latent ReferenceError bugs                       |
| 2 | Backend `py_compile server.py`         | Catches Python syntax errors                             |
| 3 | Playwright charts smoke tests          | Detects Recharts silently failing to render              |
| 4 | Frontend `yarn build` (production)     | Confirms the bundle compiles without errors              |
| 5 | List-fetch static audit                | Detects `setX(data)` bugs that show empty lists silently |
| 6 | i18n key audit                         | Detects missing translation keys (avoids raw "ns.key" UI)|
| 7 | `tipo_operacion` permission audit      | Catches POST/PUT endpoints handling Compra/Venta that forget to call `ensure_tipo_operacion(current_user, tipo)` — security gap |
| 8 | Smoke test CRUD                        | Catches Pydantic model regressions & broken endpoints    |

#### Suppressing false positives in the `tipo_operacion` audit

Some endpoints legitimately mention `Compra`/`Venta`/`.tipo` without needing
per-user enforcement (e.g. report generators, notification dispatchers, batch
admin tools, or ERP API-key endpoints with no end-user). Mark them with an
inline comment **inside the handler**:

```python
@router.post("/some-endpoint")
async def my_handler(...):
    # noqa: tipo_operacion — short reason why this is exempt
    ...
```

Files exempt at the file level (in `audit_tipo_operacion.py`):
`routes_auth.py`, `routes_clientes.py`, `routes_catalogos.py`,
`routes_erp_integration.py`.

## 🤖 CI Integration (GitHub)

When pushed via **Save to GitHub**, the workflow at
`.github/workflows/charts-visual-tests.yml` runs on any PR that touches
chart-related files. Failed PRs cannot be merged to `main`.

## 🧪 Manual test commands

```bash
# Just the chart tests
cd /app/tests && npm run test:charts

# Just ESLint
cd /app/frontend && npx eslint src

# Just production build
cd /app/frontend && yarn build
```

## 🐛 When chart tests fail

1. Open the HTML report for the failing run:
   ```bash
   cd /app/tests && npx playwright show-report
   ```
2. Each failure includes a screenshot + console logs.
3. Most common cause: `chartStyles.js` export renamed without updating the
   consumer (`Dashboard.js`, `InformesGastos.js`, `InformesIngresos.js`).
