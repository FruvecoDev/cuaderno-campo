# FRUVECO - Roadmap Tecnico y Guia de Deploy

## Documento para Programadores Externos
**Ultima actualizacion:** 10 Abril 2026  
**Version:** 2.0 Production-Ready

---

## 1. VISION GENERAL DEL PROYECTO

### Que es FRUVECO?
FRUVECO es una aplicacion web completa de **Cuaderno de Campo Digital** para el sector agricola. Permite gestionar toda la operativa de una explotacion agraria: contratos, parcelas, fincas, visitas, tareas, cosechas, tratamientos fitosanitarios, irrigaciones, recetas, albaranes, maquinaria, tecnicos aplicadores, evaluaciones de campo, RRHH y mas.

### Usuarios Objetivo
- **Administradores**: Control total del sistema, configuracion RBAC, gestion de usuarios
- **Managers/Tecnicos**: Gestion de campo, evaluaciones, tratamientos, visitas
- **Operarios**: Consulta de tareas, fichaje horario (NFC), portal empleado
- **Agentes Comerciales**: Gestion de contratos, clientes, comisiones

---

## 2. STACK TECNOLOGICO

| Capa | Tecnologia | Version |
|------|-----------|---------|
| **Frontend** | React | 19.x |
| **UI Components** | Shadcn/UI (Radix) + Lucide Icons | Latest |
| **Routing** | React Router DOM | 7.x |
| **Mapas** | Leaflet + React-Leaflet + Leaflet-Draw | 1.9.x / 5.x |
| **Graficos** | Recharts | 3.x |
| **i18n** | i18next + react-i18next | 25.x / 16.x |
| **DnD** | @dnd-kit/core + sortable | 6.x / 10.x |
| **Backend** | FastAPI (Python) | 0.110.x |
| **Base de Datos** | MongoDB (Motor async driver) | 6.x+ |
| **Auth** | JWT (PyJWT) + bcrypt | Custom RBAC |
| **AI** | OpenAI GPT-4o via emergentintegrations | - |
| **PDF** | ReportLab | - |
| **Excel** | openpyxl | - |
| **CSS** | Tailwind CSS + CSS Variables | 3.x |

---

## 3. ARQUITECTURA DEL PROYECTO

```
/app/
├── backend/                          # FastAPI Backend (Python 3.11)
│   ├── server.py                     # Entry point - registra todos los routers
│   ├── database.py                   # Conexion MongoDB + colecciones + helpers
│   ├── models.py                     # Modelos Pydantic principales
│   ├── models_auth.py                # Modelos de autenticacion
│   ├── models_catalogos.py           # Modelos de catalogos
│   ├── models_tratamientos.py        # Modelos tratamientos/maquinaria
│   │
│   ├── auth_utils.py                 # Utilidades JWT (crear/verificar tokens)
│   ├── rbac_config.py                # Configuracion de roles y permisos
│   ├── rbac_guards.py                # Guards de autenticacion (get_current_user)
│   │
│   ├── routes_auth.py                # Login, registro, gestion usuarios
│   ├── routes_dashboard.py           # Dashboard KPIs, configuracion widgets
│   ├── routes_contratos.py           # CRUD Contratos
│   ├── routes_parcelas.py            # CRUD Parcelas (multi-poligono)
│   ├── routes_fincas.py              # CRUD Fincas
│   ├── routes_visitas.py             # CRUD Visitas + export PDF/Excel
│   ├── routes_tareas.py              # CRUD Tareas + export PDF/Excel
│   ├── routes_cosechas.py            # CRUD Cosechas + export PDF/Excel
│   ├── routes_tratamientos.py        # CRUD Tratamientos + export PDF
│   ├── routes_irrigaciones.py        # CRUD Irrigaciones + export PDF
│   ├── routes_extended.py            # Recetas + Albaranes + export
│   ├── routes_evaluaciones.py        # Hojas de Evaluacion (cuestionarios)
│   ├── routes_tecnicos_aplicadores.py# Tecnicos Aplicadores + certificados
│   ├── routes_maquinaria.py          # Maquinaria + ITV + historial
│   ├── routes_clientes.py            # Clientes
│   ├── routes_agentes.py             # Agentes de compra/venta
│   ├── routes_articulos.py           # Articulos de explotacion
│   ├── routes_catalogos.py           # Cultivos, Proveedores
│   ├── routes_fitosanitarios.py      # Productos fitosanitarios
│   │
│   ├── routes_ai.py                  # AI: resumen contratos
│   ├── routes_ai_chat.py             # AI: chat agronomo interactivo
│   ├── routes_ai_suggestions.py      # AI: sugerencias + dashboard metricas
│   ├── routes_alertas.py             # Alertas inteligentes + crear tareas
│   ├── routes_exports.py             # Exportacion combinada multi-modulo
│   ├── routes_reports.py             # Informes avanzados
│   │
│   ├── routes_config.py              # Configuracion campos dinamicos
│   ├── routes_audit.py               # Auditoria de cambios
│   ├── routes_uploads.py             # Subida de archivos/imagenes
│   ├── routes_geo_import.py          # Importacion GeoJSON/KML poligonos
│   ├── routes_translations.py        # Traducciones personalizadas
│   ├── routes_notificaciones.py      # Notificaciones internas
│   ├── routes_resumen_diario.py      # Resumen diario automatico
│   ├── routes_cuaderno_campo.py      # Cuaderno de campo inteligente
│   ├── routes_erp_integration.py     # API sync ERP externo
│   │
│   ├── routes_comisiones.py          # Comisiones agentes
│   ├── routes_gastos.py              # Informes gastos
│   ├── routes_ingresos.py            # Informes ingresos
│   │
│   ├── email_service.py              # Servicio email (Resend)
│   ├── ai_service.py                 # Servicio AI (emergentintegrations)
│   ├── scheduler_service.py          # Tareas programadas (APScheduler)
│   │
│   ├── routes/                       # Sub-routers extraidos
│   │   ├── routes_rrhh.py            # Router principal RRHH
│   │   ├── rrhh_fichajes.py          # Fichajes + NFC
│   │   ├── rrhh_ausencias.py         # Ausencias
│   │   ├── rrhh_documentos.py        # Documentos empleados
│   │   ├── rrhh_productividad.py     # Productividad
│   │   ├── rrhh_prenominas.py        # Pre-nominas
│   │   └── routes_portal_empleado.py # Portal empleado
│   │
│   ├── tests/                        # Tests unitarios
│   ├── .env                          # Variables de entorno backend
│   └── requirements.txt              # Dependencias Python
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── App.js                    # Router principal + Layout
│   │   ├── App.css                   # Estilos globales + responsive
│   │   │
│   │   ├── pages/                    # Paginas principales (37 paginas)
│   │   │   ├── Dashboard.js          # Dashboard con widgets configurables
│   │   │   ├── Contratos.js          # Gestion contratos
│   │   │   ├── Parcelas.js           # Parcelas + mapa multi-poligono
│   │   │   ├── Evaluaciones.js       # Hojas evaluacion cuestionarios
│   │   │   ├── Maquinaria.js         # Catalogo maquinaria + ITV
│   │   │   ├── AsistenteIA.js        # Chat AI agronomo + historial
│   │   │   ├── RRHH.js              # Portal RRHH (tabs)
│   │   │   └── ... (30+ mas)
│   │   │
│   │   ├── components/               # Componentes reutilizables
│   │   │   ├── dashboard/            # 7 widgets Dashboard
│   │   │   ├── contratos/            # 3 subcomponentes
│   │   │   ├── parcelas/             # 5 subcomponentes
│   │   │   ├── evaluaciones/         # 3 subcomponentes
│   │   │   ├── maquinaria/           # 3 subcomponentes
│   │   │   ├── ui/                   # Shadcn/UI components
│   │   │   ├── Layout.js             # Sidebar + Header
│   │   │   ├── Pagination.js         # Paginacion reutilizable
│   │   │   └── AdvancedParcelMap.js  # Mapa Leaflet multi-poligono
│   │   │
│   │   ├── contexts/
│   │   │   └── AuthContext.js        # Contexto autenticacion global
│   │   │
│   │   ├── services/
│   │   │   └── api.js                # Cliente HTTP (axios) + download
│   │   │
│   │   ├── utils/
│   │   │   └── permissions.js        # Utilidades RBAC frontend
│   │   │
│   │   └── i18n/                     # Traducciones (es, en, fr, de, pt)
│   │
│   ├── .env                          # Variables de entorno frontend
│   └── package.json                  # Dependencias Node.js
│
├── memory/                           # Documentos del proyecto
│   ├── PRD.md                        # Requisitos del producto
│   └── test_credentials.md           # Credenciales de test
│
└── test_reports/                     # Reportes de testing automatizado
```

---

## 4. BASE DE DATOS (MongoDB)

### Colecciones Principales (41 total)

| Coleccion | Descripcion | Registros |
|-----------|-------------|-----------|
| `users` | Usuarios del sistema (roles: Admin, Manager, Tecnico, Operario) | 13 |
| `contratos` | Contratos de compra/venta con proveedores | 12 |
| `parcelas` | Parcelas agricolas con geometrias multi-poligono (`recintos[]`) | 12 |
| `fincas` | Fincas/explotaciones agricolas | 7 |
| `visitas` | Visitas de campo programadas/realizadas | 25 |
| `tareas` | Tareas asignables con prioridad y estado | 2 |
| `cosechas` | Registros de cosecha por parcela/campana | 0 |
| `tratamientos` | Tratamientos fitosanitarios aplicados | 39 |
| `irrigaciones` | Registros de riego | 0 |
| `recetas` | Recetas fitosanitarias | 0 |
| `albaranes` | Albaranes de entrega (lineas, destare, firmas) | 25 |
| `evaluaciones` | Hojas de evaluacion con cuestionarios dinamicos | 1 |
| `tecnicos_aplicadores` | Tecnicos con certificados y carnets | 8 |
| `maquinaria` | Catalogo maquinaria con ITV/mantenimiento | 12 |
| `empleados` | Empleados para RRHH | 13 |
| `fichajes` | Registros de fichaje (NFC/manual) | 12 |
| `proveedores` | Proveedores/agricultores | 10 |
| `clientes` | Clientes | 7 |
| `agentes` | Agentes de compra/venta | 9 |
| `cultivos` | Catalogo de cultivos y variedades | 16 |
| `fitosanitarios` | Productos fitosanitarios registrados | 32 |
| `ai_chat_sessions` | Sesiones del chat AI agronomo | 3 |
| `ai_reports` | Informes generados por AI | 5 |
| `audit_logs` | Log de auditoria de cambios | 36 |
| `notificaciones` | Notificaciones internas del sistema | 6 |

### Campos Clave por Coleccion

**parcelas.recintos** (array de geometrias):
```json
{
  "recintos": [
    {
      "tipo": "Polygon",
      "coordenadas": [[lat, lng], ...],
      "nombre": "Zona 1",
      "superficie": 2.5,
      "uso": "cultivo"
    }
  ]
}
```

**maquinaria** (campos ITV/mantenimiento):
```json
{
  "nombre": "Tractor John Deere",
  "tipo": "Tractor",
  "fecha_proxima_itv": "2026-03-15",
  "fecha_ultimo_mantenimiento": "2025-10-01",
  "intervalo_mantenimiento_dias": 180
}
```

**tareas.alerta_origen** (vinculo alerta-tarea):
```json
{
  "nombre": "Pasar ITV - Tractor John Deere",
  "tipo_tarea": "mantenimiento",
  "prioridad": "alta",
  "alerta_origen": "alerta_itv_maquinaria_Tractor John Deere"
}
```

---

## 5. AUTENTICACION Y PERMISOS (RBAC)

### Roles del Sistema
| Rol | Permisos |
|-----|---------|
| **Admin** | CRUD completo + configuracion + usuarios + auditoria |
| **Manager** | CRUD completo excepto gestion usuarios |
| **Tecnico** | Lectura + creacion + edicion (no eliminacion) |
| **Operario** | Solo lectura + fichaje propio |
| **Agente** | Acceso a contratos, clientes, comisiones |

### Flujo de Auth
1. `POST /api/auth/login` → devuelve `{ access_token: "JWT..." }`
2. Frontend almacena token en `localStorage`
3. Todas las peticiones incluyen `Authorization: Bearer <token>`
4. Backend valida con `get_current_user` dependency (Depends)
5. Permisos RBAC validados via `rbac_guards.py`

### Credenciales por defecto
- **Admin**: `admin@fruveco.com` / `admin123`

---

## 6. INTEGRACIONES DE TERCEROS

| Servicio | Uso | Clave Requerida |
|----------|-----|----------------|
| **OpenAI GPT-4o** | Chat agronomo, resumenes contratos, predicciones | `EMERGENT_LLM_KEY` (reemplazar por `OPENAI_API_KEY`) |
| **Resend** | Envio emails automaticos | `RESEND_API_KEY` (bloqueado - no configurado) |
| **OpenWeatherMap** | Alertas climaticas | `OPENWEATHERMAP_API_KEY` (bloqueado) |

### Nota sobre emergentintegrations
La libreria `emergentintegrations` es un wrapper de Emergent para acceso unificado a LLMs. Para deploy externo, **reemplazar** por llamadas directas a la API de OpenAI:

```python
# ACTUAL (Emergent):
from emergentintegrations.llm import chat, ChatMessage
result = await chat(api_key=EMERGENT_KEY, messages=[...], model="gpt-4o")

# REEMPLAZO (OpenAI directo):
from openai import AsyncOpenAI
client = AsyncOpenAI(api_key=OPENAI_API_KEY)
result = await client.chat.completions.create(model="gpt-4o", messages=[...])
```

Archivos a modificar:
- `/app/backend/ai_service.py`
- `/app/backend/routes_ai.py`
- `/app/backend/routes_ai_chat.py`
- `/app/backend/routes_ai_suggestions.py`

---

## 7. GUIA DE DEPLOY EXTERNO

### 7.1 Requisitos del Servidor

| Recurso | Minimo | Recomendado |
|---------|--------|-------------|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 2 GB | 4 GB |
| **Disco** | 10 GB | 20 GB (uploads) |
| **SO** | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 LTS |
| **Python** | 3.11+ | 3.12 |
| **Node.js** | 18+ | 20 LTS |
| **MongoDB** | 6.0+ | 7.0 |

### 7.2 Opcion A: Deploy en VPS (DigitalOcean, Hetzner, AWS EC2)

```bash
# 1. Clonar repositorio
git clone <repo-url> /opt/fruveco
cd /opt/fruveco

# 2. Instalar MongoDB
# Ubuntu:
sudo apt-get install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org
sudo systemctl start mongod && sudo systemctl enable mongod

# 3. Backend setup
cd /opt/fruveco/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Configurar .env backend
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=agricultural_management
SECRET_KEY=<genera-una-clave-secreta-larga>
CORS_ORIGINS=https://tu-dominio.com
OPENAI_API_KEY=<tu-api-key-openai>
RESEND_API_KEY=<tu-api-key-resend>
SENDER_EMAIL=no-reply@tu-dominio.com
EOF

# 5. Frontend setup
cd /opt/fruveco/frontend
npm install  # o yarn install

# 6. Configurar .env frontend
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://tu-dominio.com
EOF

# 7. Build frontend para produccion
npm run build  # genera /opt/fruveco/frontend/build/

# 8. Instalar y configurar Nginx
sudo apt install -y nginx

cat > /etc/nginx/sites-available/fruveco << 'NGINX'
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend (React build estatico)
    root /opt/fruveco/frontend/build;
    index index.html;

    # API Backend proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 50M;
    }

    # React Router SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/fruveco /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 9. SSL con Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com

# 10. Servicio systemd para el backend
cat > /etc/systemd/system/fruveco-backend.service << 'SERVICE'
[Unit]
Description=FRUVECO Backend (FastAPI)
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fruveco/backend
Environment=PATH=/opt/fruveco/backend/venv/bin
ExecStart=/opt/fruveco/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable fruveco-backend
sudo systemctl start fruveco-backend

# 11. Seed del admin (primera vez)
cd /opt/fruveco/backend
source venv/bin/activate
python3 -c "
from pymongo import MongoClient
import bcrypt
client = MongoClient('mongodb://localhost:27017')
db = client['agricultural_management']
if not db.users.find_one({'email': 'admin@fruveco.com'}):
    db.users.insert_one({
        'email': 'admin@fruveco.com',
        'username': 'admin',
        'full_name': 'Administrador',
        'password': bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode(),
        'role': 'Admin',
        'is_active': True,
    })
    print('Admin creado')
else:
    print('Admin ya existe')
"
```

### 7.3 Opcion B: Deploy con Docker

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    restart: always

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    env_file: ./backend/.env
    depends_on:
      - mongodb
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

volumes:
  mongo_data:
```

### 7.4 Opcion C: Deploy en Railway / Render / Fly.io

1. **Railway**: Soporta monorepos. Crear 2 servicios (backend + frontend). Usar MongoDB Atlas como DB.
2. **Render**: Crear Web Service (backend) + Static Site (frontend build).
3. **Fly.io**: Usar Dockerfiles. MongoDB Atlas obligatorio.

**Nota comun**: Para todas estas plataformas, usar **MongoDB Atlas** (gratis hasta 512MB) en lugar de MongoDB local.

---

## 8. CAMBIOS NECESARIOS PARA DEPLOY EXTERNO

### 8.1 Reemplazar emergentintegrations por OpenAI SDK

Instalar:
```bash
pip install openai
```

Archivos a modificar: `ai_service.py`, `routes_ai.py`, `routes_ai_chat.py`, `routes_ai_suggestions.py`

### 8.2 Variables de Entorno

**Backend (.env)**:
```env
MONGO_URL=mongodb://localhost:27017        # o MongoDB Atlas URI
DB_NAME=agricultural_management
SECRET_KEY=<clave-secreta-larga-aleatoria>
CORS_ORIGINS=https://tu-dominio.com
OPENAI_API_KEY=<tu-api-key>
RESEND_API_KEY=<tu-api-key>               # opcional
SENDER_EMAIL=no-reply@tu-dominio.com      # opcional
```

**Frontend (.env)**:
```env
REACT_APP_BACKEND_URL=https://tu-dominio.com
```

### 8.3 Uploads/Archivos
Las imagenes (placa CE maquinaria, certificados tecnicos) se almacenan en `/app/uploads/`. Para produccion:
- Montar un volumen persistente en Docker/VPS
- O migrar a S3/Cloudflare R2 para almacenamiento escalable

---

## 9. ENDPOINTS API PRINCIPALES

### Autenticacion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (devuelve access_token) |
| POST | `/api/auth/register` | Registro usuario |
| GET | `/api/auth/me` | Perfil del usuario actual |

### Modulos CRUD (patron comun: GET list, GET by id, POST, PUT, DELETE)
| Prefijo | Modulo |
|---------|--------|
| `/api/contratos` | Contratos |
| `/api/parcelas` | Parcelas |
| `/api/fincas` | Fincas |
| `/api/visitas` | Visitas |
| `/api/tareas` | Tareas |
| `/api/cosechas` | Cosechas |
| `/api/tratamientos` | Tratamientos |
| `/api/irrigaciones` | Irrigaciones |
| `/api/recetas` | Recetas |
| `/api/albaranes` | Albaranes |
| `/api/evaluaciones` | Evaluaciones |
| `/api/tecnicos-aplicadores` | Tecnicos Aplicadores |
| `/api/maquinaria` | Maquinaria |

### Exportaciones
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/{modulo}/export/excel` | Exportar modulo a Excel |
| GET | `/api/{modulo}/export/pdf` | Exportar modulo a PDF |
| GET | `/api/exports/modules` | Listar modulos disponibles |
| POST | `/api/exports/combined` | Exportacion combinada multi-modulo |

### AI
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/ai/chat/message` | Chat con agronomo AI |
| POST | `/api/ai/summary` | Resumen AI de contratos |
| GET | `/api/ai/dashboard` | Metricas AI |

### Alertas
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/alertas/resumen` | Resumen de alertas activas |
| POST | `/api/alertas/crear-tarea` | Crear tarea desde alerta |
| GET | `/api/alertas/tareas-existentes` | Tareas vinculadas a alertas |

---

## 10. ESTADO ACTUAL Y BACKLOG

### Completado (100%)
- Todos los modulos CRUD (13 modulos principales)
- Dashboard configurable con 11 widgets
- Exportacion PDF/Excel para todos los modulos
- Centro de exportacion combinada
- Sistema de alertas inteligente con auto-tareas
- AI: Chat agronomo, resumenes, predicciones
- NFC para fichajes RRHH
- RBAC completo con 5 roles
- Mapas con multi-poligono (Leaflet)
- Responsive design mobile-first
- Paginacion server-side
- Auditoria de cambios
- i18n (5 idiomas)
- Portal empleado

### Backlog Futuro
- [ ] Alertas de proximas visitas programadas
- [ ] Notificaciones push en navegador (Service Worker)
- [ ] Informe semanal automatico por email
- [ ] Sync bidireccional con ERP externos
- [ ] App movil nativa (React Native)
- [ ] Dashboard personalizable drag-and-drop
- [ ] Integracion con SIGPAC (parcelas oficiales)

### Integraciones Bloqueadas (necesitan API keys)
- [ ] Email automatico (Resend) - `RESEND_API_KEY`
- [ ] Alertas meteorologicas (OpenWeatherMap) - `OPENWEATHERMAP_API_KEY`

---

## 11. TESTING

### Historial de Tests
| Iteracion | Ambito | Resultado |
|-----------|--------|-----------|
| 54 | Exportaciones P2 modulos | 15/15 (100%) |
| 55 | Centro exportacion combinada | 8/8 (100%) |
| 56 | Refactoring Evaluaciones + Maquinaria | 12/12 (100%) |
| 57 | Sistema alertas | 12/12 (100%) |
| 58 | Auto-tareas desde alertas | 17/17 (100%) |

### Como ejecutar tests
```bash
cd /opt/fruveco/backend
source venv/bin/activate
pytest tests/ -v
```

### Tests manuales rapidos
```bash
# Login y obtener token
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fruveco.com","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Verificar endpoints
curl -s http://localhost:8001/api/contratos -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
curl -s http://localhost:8001/api/alertas/resumen -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## 12. CONVENIOS DE CODIGO

### Backend (Python/FastAPI)
- Cada modulo tiene su propio archivo `routes_*.py`
- Todos los routers registrados en `server.py`
- Usar `serialize_docs()` / `serialize_doc()` para convertir ObjectId a string
- Excluir `_id` en proyecciones MongoDB o usar `{"_id": 0}`
- Usar `await collection.find().to_list(length)` antes de serializar
- Importar `StreamingResponse` para exports PDF/Excel

### Frontend (React)
- Paginas en `src/pages/` (export default)
- Componentes reutilizables en `src/components/` (export const)
- Maximo ~500 lineas por archivo; extraer subcomponentes
- Usar `data-testid` en todos los elementos interactivos
- `api.js` para todas las llamadas HTTP
- `useAuth()` para acceso al token y usuario
- `usePermissions()` para verificar permisos RBAC

---

*Documento generado automaticamente. Para preguntas: revisar `/app/memory/PRD.md` y `/app/test_reports/`*
