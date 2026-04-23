# Integración con Sentry (monitoreo de errores)

Sentry captura automáticamente los errores que ocurren en la aplicación en
producción — tanto en el **frontend React** como en el **backend FastAPI**.
Está **completamente desactivado por defecto** — la app funciona idéntica sin él.

## 🚀 Activación en 6 pasos (10 minutos)

### 1. Crear cuenta gratuita
- Ve a <https://sentry.io/signup/>.
- Plan **Developer**: gratis, 5.000 errores/mes (más que suficiente para esta app).

### 2. Crear proyecto para el FRONTEND
- **Projects → Create Project** → Platform **React**.
- Nombre sugerido: `campo-export-pro-frontend`.
- **Settings → Client Keys (DSN)** → copia la URL del DSN.

### 3. Crear proyecto para el BACKEND
- **Projects → Create Project** → Platform **Python / FastAPI**.
- Nombre sugerido: `campo-export-pro-backend`.
- **Settings → Client Keys (DSN)** → copia la URL del DSN (será **distinta** a la del frontend).

### 4. Pegar DSN del FRONTEND
Abre `/app/frontend/.env` y pega:
```bash
REACT_APP_SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/0000000
```

### 5. Pegar DSN del BACKEND
Abre `/app/backend/.env` y pega:
```bash
SENTRY_DSN_BACKEND=https://yyyyyyyyyyyyyyyy@o000000.ingest.sentry.io/1111111
```

### 6. Reiniciar ambos servicios
```bash
sudo supervisorctl restart frontend backend
```

¡Listo! Los dos proyectos recibirán errores de cada capa.

---

## 🔒 Qué captura

### Frontend (React)
- Errores de renderizado de React (pantalla en blanco, etc.)
- Excepciones no manejadas (`throw` sin catch)
- Promesas rechazadas (`Promise.reject`)
- **Todos los `console.error`** (los 221+ de los catches)

### Backend (FastAPI)
- Excepciones no manejadas en cualquier endpoint
- Respuestas **HTTP 5xx** (errores de servidor)
- Errores en background tasks
- Errores de conexión a MongoDB, APIs externas (SIGPAC, OpenWeatherMap, etc.)

## 🛡️ Qué NO se envía (privacidad)

- **Tokens JWT / cookies / API keys** (stripped en `before_send`)
- IPs de usuarios (`send_default_pii: false`)
- Performance traces (no hay overhead)
- Session replay (no se graba la pantalla del trabajador)

## 🧪 Probar que funciona

### Frontend
```jsx
<button onClick={() => { throw new Error("Test Sentry Frontend"); }}>Test</button>
```

### Backend
Añade temporalmente en cualquier router:
```python
@router.get("/sentry-debug")
async def sentry_debug():
    1 / 0  # ZeroDivisionError
```
Luego `curl $BACKEND_URL/api/sentry-debug` y verifica en Sentry.

Elimina los tests tras confirmar.

## 💤 Desactivar temporalmente

Vacía las variables en `.env`:
```bash
# frontend/.env
REACT_APP_SENTRY_DSN=
# backend/.env
SENTRY_DSN_BACKEND=
```
Reinicia y la app deja de enviar.

## 📦 Bundle size / overhead

- **Frontend**: +40 KB gzipped SOLO si DSN activo.
- **Backend**: overhead negligible (<1 ms por request cuando está activo).

## 🧩 Arquitectura

- Frontend: `/app/frontend/src/instrument.js` (init) + `App.js` (ErrorBoundary).
- Backend: `/app/backend/sentry_init.py` (init) invocado desde `server.py` **antes** de crear el FastAPI instance.

