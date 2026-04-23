# Integración con Sentry (monitoreo de errores)

Sentry captura automáticamente los errores que ocurren en la aplicación en
producción. Está **completamente desactivado por defecto** — la app funciona
idéntica sin él.

## 🚀 Activación en 4 pasos (5 minutos)

### 1. Crear cuenta gratuita
- Ve a <https://sentry.io/signup/>.
- El plan **Developer** es gratis (5.000 errores/mes, suficiente para esta app).

### 2. Crear un proyecto
- En el panel de Sentry: **Projects → Create Project**.
- Plataforma: **React**.
- Nombre sugerido: `campo-export-pro-frontend`.
- Click en **Create Project**.

### 3. Copiar el DSN
- Dentro del proyecto → **Settings → Client Keys (DSN)**.
- Copia la URL que aparece, con formato:
  ```
  https://xxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/0000000
  ```

### 4. Pegarlo en la app
Abre `/app/frontend/.env` y pega el DSN:

```bash
REACT_APP_SENTRY_DSN=https://xxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/0000000
```

Reinicia el frontend:
```bash
sudo supervisorctl restart frontend
```

¡Listo! A partir de ahora todos los errores aparecerán en tu dashboard de Sentry.

## 🔒 Qué captura

- **Errores de renderizado** de React (pantalla en blanco, etc.)
- **Excepciones no manejadas** (`throw` sin catch)
- **Promesas rechazadas** (`Promise.reject`)
- **Todos los `console.error`** de la app (los 221+ que ya añadimos en los catches)

## 🛡️ Qué NO se envía (privacidad)

- Headers HTTP (para no filtrar el JWT)
- Cookies
- IP del usuario (`sendDefaultPii: false`)
- Performance traces (no se recopilan métricas de velocidad)
- Session replays (no se graba la pantalla del trabajador)

## 🧪 Probar que funciona

1. Añade temporalmente un botón en cualquier página:
   ```jsx
   <button onClick={() => { throw new Error("Test Sentry"); }}>
     Test
   </button>
   ```
2. Haz click → error aparece en Sentry en ~10 segundos.
3. Elimina el botón.

## 💤 Desactivar temporalmente

Vacía la variable en `.env`:
```bash
REACT_APP_SENTRY_DSN=
```
La app no enviará nada más a Sentry y el bundle de producción incluso evitará
inicializar el SDK (ver `/app/frontend/src/instrument.js`).

## 📦 Bundle size

Impacto en producción: **~40 KB gzipped** (mínimo). Se evitan las integraciones
pesadas (performance, replay). Si en el futuro quieres tracing distribuido,
actívalo cambiando `tracesSampleRate: 0.1` en `instrument.js`.
