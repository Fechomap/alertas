# 01 - Investigación General: Bot de Alertas Telegram

**Fecha de Auditoría:** 2025-11-18
**Versión del Sistema:** Producción (Railway)
**Auditor:** Claude Code - Análisis Integral de Arquitectura

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura General](#arquitectura-general)
4. [Estructura de Directorios](#estructura-de-directorios)
5. [Módulos Principales](#módulos-principales)
6. [Flujos Operacionales](#flujos-operacionales)
7. [Sistema de Permisos](#sistema-de-permisos)
8. [Manejo de Estado](#manejo-de-estado)
9. [Deployment y Configuración](#deployment-y-configuración)
10. [Conclusiones](#conclusiones)

---

## Resumen Ejecutivo

El Bot de Alertas es un sistema desarrollado en Node.js que opera sobre Telegram mediante webhooks (producción) o polling (desarrollo). Su propósito principal es:

1. **Gestionar alertas periódicas** que operadores envían cada 20 segundos a grupos de Telegram
2. **Permitir la cancelación** de estas alertas por parte de Alert Managers
3. **Registrar maniobras** autorizadas realizadas por los managers
4. **Generar reportes automáticos** en formato Excel todos los domingos a las 23:55 (hora de México)

El sistema está actualmente en **producción en Railway**, operando en múltiples grupos simultáneamente.

### Estado Actual del Sistema

✅ **Funcional en producción**
✅ **Tests básicos implementados** (report.js, scheduler.js)
⚠️ **Presenta bugs críticos** en sistema de alertas
⚠️ **Reportes dominicales con problemas** de timezone y datos incompletos
❌ **Requiere reinicio manual** en casos extremos (inaceptable)

---

## Stack Tecnológico

### Runtime y Lenguaje

- **Node.js**: v14.x+
- **JavaScript**: ES6+ (NO TypeScript)
- **Package Manager**: npm

### Dependencias Principales

| Dependencia | Versión | Propósito |
|------------|---------|-----------|
| `node-telegram-bot-api` | 0.66.0 | Framework principal del bot |
| `express` | 4.21.2 | Servidor HTTP (webhook) |
| `mongoose` | 8.10.1 | ODM para MongoDB |
| `mongodb` | 6.13.0 | Driver nativo MongoDB |
| `node-cron` | 4.2.1 | Programación de tareas |
| `xlsx` | 0.18.5 | Generación de archivos Excel |
| `exceljs` | 4.4.0 | Manipulación avanzada Excel |
| `body-parser` | 1.20.3 | Parsing de webhooks |
| `dotenv` | 16.4.7 | Variables de entorno |

### Dependencias de Desarrollo

- **jest**: 30.0.4 (testing)
- **eslint**: 9.31.0 (linting)
- **nodemon**: 3.1.0 (auto-reload)
- **prettier**: 3.6.2 (formateo)

### Base de Datos

- **MongoDB**: Usado para persistir maniobras y configuración de grupos
- **Conexión**: Configurada vía `MONGODB_URI` (puede ser local o MongoDB Atlas)

---

## Arquitectura General

### Patrón Arquitectónico

El sistema sigue una **arquitectura modular por capas**, aunque no completamente limpia:

```
┌─────────────────────────────────────────────┐
│     Telegram Bot API (Webhook/Polling)     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│   Express Server (Puerto 3000 - Railway)   │
│         Webhook: /bot{token}                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            HANDLERS LAYER                   │
│  ┌─────────────────────────────────────┐   │
│  │ - commands.js   (comandos /)        │   │
│  │ - messages.js   (mensajes/botones)  │   │
│  │ - callback_query.js (inline btns)   │   │
│  └─────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           SERVICES LAYER                    │
│  ┌─────────────────────────────────────┐   │
│  │ - alert.js      (alertas cíclicas)  │   │
│  │ - maniobra.js   (flujo registro)    │   │
│  │ - report.js     (Excel)             │   │
│  │ - scheduler.js  (cron jobs)         │   │
│  └─────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            MODELS LAYER                     │
│  ┌─────────────────────────────────────┐   │
│  │ - Maniobra   (mongoose schema)      │   │
│  │ - Group      (mongoose schema)      │   │
│  └─────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          MongoDB Database                   │
│  Colecciones:                               │
│  - maniobras (registros históricos)         │
│  - groups (nombres personalizados)          │
└─────────────────────────────────────────────┘
```

### Capas Transversales

```
┌─────────────────────────────────────────────┐
│              UTILS LAYER                    │
│  - permissions.js  (control de acceso)      │
│  - keyboard-helper.js (UI persistente)      │
│  - file-helper.js (fix Railway)             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│               UI LAYER                      │
│  - keyboards.js (teclados Telegram)         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│             CONFIG LAYER                    │
│  - constants.js (IDs, mensajes)             │
│  - database.js (conexión MongoDB)           │
└─────────────────────────────────────────────┘
```

---

## Estructura de Directorios

```
/home/user/alertas/
├── src/                              # Código fuente principal
│   ├── config/                       # ⚙️ Configuraciones
│   │   ├── constants.js              # IDs usuarios, tipos alertas, mensajes
│   │   ├── database.js               # Conexión MongoDB
│   │   └── index.js                  # Exportador de config
│   │
│   ├── handlers/                     # 📥 Manejadores de eventos Telegram
│   │   ├── commands.js               # /start, /help, /stopalert, /report, /testreport
│   │   ├── messages.js               # Mensajes de texto y botones
│   │   ├── callback_query.js         # Callbacks de botones inline (legacy)
│   │   └── index.js                  # Orquestador de handlers
│   │
│   ├── models/                       # 🗄️ Modelos Mongoose
│   │   ├── maniobra.js               # Esquema de maniobras
│   │   ├── group.js                  # Esquema de grupos
│   │   └── index.js                  # Exportador de modelos
│   │
│   ├── services/                     # 🔧 Lógica de negocio
│   │   ├── alert.js                  # Sistema de alertas (intervalos)
│   │   ├── maniobra.js               # Flujo de registro de maniobras
│   │   ├── report.js                 # Generación de Excel
│   │   └── scheduler.js              # Cron jobs automáticos
│   │
│   ├── ui/                           # 🖥️ Interfaces de usuario
│   │   └── keyboards.js              # Teclados Telegram
│   │
│   ├── utils/                        # 🛠️ Utilidades
│   │   ├── permissions.js            # Control de permisos (operators, managers)
│   │   ├── keyboard-helper.js        # Helper para teclados persistentes
│   │   ├── file-helper.js            # Helper para envío de archivos (fix Railway)
│   │   └── index.js                  # Exportador de utils
│   │
│   └── index.js                      # 🚀 PUNTO DE ENTRADA PRINCIPAL
│
├── scripts/                          # 📜 Scripts de mantenimiento
│   ├── exportData.js                 # Exportar BD → Excel
│   ├── importData.js                 # Importar Excel → BD
│   ├── clearDatabase.js              # Limpiar BD
│   └── config.js                     # Config para scripts
│
├── tests/                            # 🧪 Tests unitarios (Jest)
│   ├── services/
│   │   ├── report.test.js            # Tests de reportes
│   │   └── scheduler.test.js         # Tests de scheduler
│   └── setup.js                      # Configuración Jest
│
├── docs/                             # 📚 Documentación
│   └── bot-alertas/                  # Auditoría actual
│
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore                        # Archivos ignorados
├── Procfile                          # Config Railway/Heroku
├── package.json                      # Dependencias y scripts
├── jest.config.js                    # Configuración Jest
├── eslint.config.js                  # Configuración ESLint
├── bot.txt                           # Archivo histórico (versión monolítica)
└── README.md                         # Documentación general
```

---

## Módulos Principales

### 1. Sistema de Alertas (`src/services/alert.js`)

**Responsabilidad:** Gestionar alertas periódicas cada 20 segundos.

**Estado en Memoria:**
```javascript
activeAlerts = {
  [chatId]: {
    [userId]: {
      [alertType]: {
        interval: <intervalId>,
        message: "⚠️ Mensaje de alerta...",
        userName: "Nombre Usuario"
      }
    }
  }
}
```

**Funciones Principales:**
- `startAlert()` - Inicia alerta periódica (intervalo de 20 seg)
- `stopAlertForUser()` - Detiene alerta específica de un usuario
- `cancelAllAlertsForChat()` - Cancela todas las alertas de un chat
- `handleOperatorAction()` - Operadores inician alertas
- `handleAlertManagerDeactivation()` - Managers cancelan alertas

**Tipos de Alertas Activas:**
- **Conferencia**: Solicitud de apoyo telefónico de cabina

**Tipos Removidos** (legacy en código):
- ~~USUARIO_NO_ESTA_EN_VH~~
- ~~VALIDACION_DE_ORIGEN~~

**Limitaciones:**
- Máximo **2 alertas simultáneas** por usuario
- Intervalo **fijo de 20 segundos** (no configurable)
- Almacenamiento **solo en memoria** (se pierde al reiniciar)

---

### 2. Sistema de Reportes (`src/services/report.js`)

**Responsabilidad:** Generar reportes Excel de maniobras registradas.

**Funciones Principales:**
- `generateExcel(weeklyOnly)` - Genera Excel completo o semanal
- `generateWeeklyExcel()` - Wrapper para reporte de semana actual

**Estructura del Excel:**

**Hoja 1: "Maniobras"**
| Columna | Descripción |
|---------|-------------|
| ID del Grupo | Chat ID de Telegram |
| Nombre del Grupo | Nombre del grupo obtenido de Telegram |
| ID del Alert Manager | User ID que registró |
| Cantidad de Maniobras | Número entre 1-10 |
| Descripción | Texto auto-generado |
| Fecha | Objeto Date (timestamp) |
| Fecha Texto | Formato México (DD/MM/YYYY HH:mm AM/PM) |

**Hoja 2: "Grupos"**
| Columna | Descripción |
|---------|-------------|
| ID del Grupo | Chat ID único |
| Nombre para Mostrar | Nombre del grupo |

**Cálculo de Semana:**
```javascript
// Lunes 00:00:00 - Domingo 23:59:59 (semana actual)
const dayOfWeek = today.getDay();
const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;  // Fix domingo
```

**Timezone Configurado:** `America/Mexico_City`

**Librería:** `xlsx` (node-xlsx)

---

### 3. Sistema de Maniobras (`src/services/maniobra.js`)

**Responsabilidad:** Gestionar flujo conversacional para registrar maniobras.

**Estado en Memoria:**
```javascript
userStates = {
  [userId]: {
    chatId: <chatId>,
    step: 'awaiting_maniobras_quantity' | 'confirming_maniobras',
    data: { quantity: <number> }
  }
}
```

**Flujo de Registro:**
1. Manager presiona botón "🚗 MANIOBRAS"
2. Bot pregunta cantidad (1-10)
3. Usuario responde con número
4. Bot solicita confirmación (✅ Confirmar / ❌ Cancelar)
5. Usuario confirma
6. Registro se guarda en MongoDB
7. Estado se limpia de memoria

**Validaciones:**
- Solo **Alert Managers** pueden registrar
- Cantidad: **1-10 maniobras**
- Verificación de **conexión a MongoDB** activa

---

### 4. Programador de Tareas (`src/services/scheduler.js`)

**Responsabilidad:** Ejecutar reportes automáticos según cronograma.

**Jobs Configurados:**

```javascript
// Reporte Semanal Automático
Cron: '55 23 * * 0'
Frecuencia: Todos los domingos a las 23:55
Timezone: America/Mexico_City  ✅ CORRECTO
Acción: Envía Excel semanal a ADMIN_CHAT_ID
```

**Flujo del Job:**
1. Se ejecuta domingos 23:55 (hora México)
2. Genera Excel semanal (lunes-domingo)
3. Calcula período de la semana
4. Envía documento a `ADMIN_CHAT_ID`
5. Mensaje incluye: período, fecha generación, resumen
6. Si falla: envía mensaje de error al admin

**Fix para Railway:**
- Escribe buffer a `/tmp` antes de enviar (producción)
- Envía archivo desde disco (no desde buffer)
- Limpia archivo temporal después de envío
- **Razón:** Railway/Heroku no soporta envío directo de buffers grandes

---

### 5. Handlers de Telegram

#### `src/handlers/commands.js`

Maneja comandos con prefijo `/`:

| Comando | Acceso | Descripción |
|---------|--------|-------------|
| `/start` | Todos | Muestra menú principal con teclado persistente |
| `/help` | Todos | Lista de comandos disponibles |
| `/stopalert` | Alert Managers | Cancela TODAS las alertas en el chat |
| `/report` | Alert Managers | Genera y envía reporte semanal Excel |
| `/testreport` | Super Admin | Prueba envío automático de reporte |

#### `src/handlers/messages.js`

Maneja:
- Mensajes de texto de usuarios
- Botones del teclado persistente
- Estados conversacionales (flujo de maniobras)

**Flujo:**
1. Verifica si hay estado de maniobra activo → delega a `handleManiobrasState()`
2. Si no, procesa botones del teclado
3. Ejecuta acción según permisos del usuario

#### `src/handlers/callback_query.js`

Maneja callbacks de botones inline (actualmente **legacy**, no usado).

---

## Flujos Operacionales

### Flujo 1: Inicio de Alerta por Operador

```
┌─────────────────────────────────────────────┐
│ Usuario (Operador) presiona 📞 CONFERENCIA │
└───────────────┬─────────────────────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │ messages.js detecta botón │
    └───────────┬───────────────┘
                │
                ▼
    ┌──────────────────────────────┐
    │ Verifica: isOperator(userId) │
    └───────────┬──────────────────┘
                │ ✓
                ▼
    ┌──────────────────────────────────────┐
    │ alert.js → handleOperatorAction()    │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ alert.js → startAlert()              │
    │ - Envía mensaje inicial              │
    │ - Crea setInterval(20000)            │
    │ - Almacena en activeAlerts           │
    └──────────────────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ Cada 20 seg: envía mensaje de alerta│
    └──────────────────────────────────────┘
```

### Flujo 2: Cancelación de Alerta por Manager

```
┌──────────────────────────────────────────────┐
│ Manager presiona 📞 CONFERENCIA (para apagar)│
└───────────────┬──────────────────────────────┘
                │
                ▼
    ┌────────────────────────────────┐
    │ messages.js detecta botón      │
    └───────────┬────────────────────┘
                │
                ▼
    ┌──────────────────────────────────┐
    │ Verifica: isAlertManager(userId) │
    └───────────┬──────────────────────┘
                │ ✓
                ▼
    ┌────────────────────────────────────────────┐
    │ alert.js → handleAlertManagerDeactivation()│
    └───────────┬────────────────────────────────┘
                │
                ▼
    ┌────────────────────────────────────────┐
    │ Busca alerta activa en activeAlerts    │
    └───────────┬────────────────────────────┘
                │
                ▼
    ┌────────────────────────────────────────┐
    │ clearInterval(intervalId)              │
    │ delete activeAlerts[...][...][...]     │
    └───────────┬────────────────────────────┘
                │
                ▼
    ┌────────────────────────────────────────┐
    │ Envía mensaje de confirmación          │
    └────────────────────────────────────────┘
```

### Flujo 3: Registro de Maniobras

```
┌─────────────────────────────────────┐
│ Manager presiona 🚗 MANIOBRAS       │
└───────────────┬─────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ maniobra.js → startManiobrasFlow()   │
    │ - Verifica isAlertManager()          │
    │ - Pregunta cantidad (1-10)           │
    │ - Crea userStates[userId]            │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ Usuario responde: "5"                │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ handleManiobrasState()               │
    │ - Valida número (1-10)               │
    │ - Guarda en state.data.quantity      │
    │ - Muestra botones confirmación       │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ Usuario presiona ✅ Confirmar        │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ - Obtiene groupName de Telegram API  │
    │ - new Maniobra(...).save()           │
    │ - delete userStates[userId]          │
    │ - Mensaje de confirmación            │
    └──────────────────────────────────────┘
```

### Flujo 4: Reporte Automático Dominical

```
┌─────────────────────────────────────────┐
│ Domingo 23:55 (hora México)             │
└───────────────┬─────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ node-cron ejecuta callback           │
    │ (timezone: America/Mexico_City)      │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ scheduler.js →                       │
    │ sendWeeklyReportToAdmin()            │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ Calcula lunes-domingo actual         │
    │ (fix para domingo aplicado)          │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ report.js → generateWeeklyExcel()    │
    │ Query: { fecha: {$gte, $lte} }       │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ Genera Excel con XLSX.write()        │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ file-helper.js →                     │
    │ sendExcelAsDocument()                │
    │ - Escribe a /tmp/reporte_*.xlsx      │
    │ - bot.sendDocument(ADMIN_CHAT_ID)    │
    │ - fs.unlink() // Limpieza            │
    └───────────┬──────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────┐
    │ ✅ Reporte enviado al admin          │
    └──────────────────────────────────────┘
```

---

## Sistema de Permisos

### Tipos de Usuarios

Configurados en `src/config/constants.js` (hardcoded):

```javascript
// Operadores (pueden iniciar alertas)
operatorIds = [
  7143094298,   // Super Admin (también operador)
  7754458578,
  7509818905,
  8048487029,
  7241170867
];

// Alert Managers (pueden cancelar alertas y registrar maniobras)
alertManagerIds = [
  7143094298,   // Super Admin (también manager)
  1022124142,
  7758965062,
  5660087041,
  6330970125
];

// Super Admin
SUPER_ADMIN_ID = 7143094298;
```

### Matriz de Permisos

| Acción | Operador | Alert Manager | Super Admin |
|--------|----------|---------------|-------------|
| Iniciar alertas | ✅ | ❌ | ✅ |
| Cancelar alertas | ❌ | ✅ | ✅ |
| Registrar maniobras | ❌ | ✅ | ✅ |
| Ver reporte (`/report`) | ❌ | ✅ | ✅ |
| Probar reporte (`/testreport`) | ❌ | ❌ | ✅ |
| Comando `/stopalert` | ❌ | ✅ | ✅ |

### Funciones de Verificación

**Archivo:** `src/utils/permissions.js`

```javascript
isOperator(userId)      // Verifica si userId está en operatorIds
isAlertManager(userId)  // Verifica si userId está en alertManagerIds
isSuperAdmin(userId)    // Verifica si userId === SUPER_ADMIN_ID
getUserName(user)       // Obtiene nombre completo del usuario
normalizeText(text)     // Normaliza texto (útil para comparaciones)
```

---

## Manejo de Estado

El sistema utiliza **estado mixto** (memoria + persistencia):

### 1. Estado Volátil (Memoria)

⚠️ **SE PIERDE AL REINICIAR**

#### `activeAlerts` (src/services/alert.js)

```javascript
const activeAlerts = {
  [chatId]: {
    [userId]: {
      [alertType]: {
        interval: <setInterval ID>,
        message: "texto de alerta",
        userName: "Nombre Usuario"
      }
    }
  }
}
```

**Implicación:** Al reiniciar el bot, todas las alertas activas se pierden y NO se pueden recuperar.

#### `userStates` (src/services/maniobra.js)

```javascript
const userStates = {
  [userId]: {
    chatId: <chatId>,
    step: 'awaiting_maniobras_quantity' | 'confirming_maniobras',
    data: { quantity: <number> }
  }
}
```

**Implicación:** Al reiniciar el bot, los flujos de registro de maniobras en progreso se interrumpen.

### 2. Estado Persistente (MongoDB)

✅ **SOBREVIVE AL REINICIAR**

#### Colección: `maniobras`

```javascript
{
  _id: ObjectId,
  chatId: String,          // ID del grupo
  groupName: String,       // Nombre del grupo
  alertManagerId: Number,  // ID del manager que registró
  maniobras: Number,       // Cantidad (1-10)
  descripcion: String,     // Descripción auto-generada
  fecha: Date              // Timestamp (default: Date.now)
}
```

**Índices:** Solo `_id` (por defecto)

#### Colección: `groups`

```javascript
{
  _id: ObjectId,
  chatId: String,          // ID del grupo (unique)
  displayName: String      // Nombre personalizado
}
```

**Índices:** `chatId` (unique)

**Nota:** Esta colección existe pero está **subutilizada** en la versión actual.

---

## Deployment y Configuración

### Variables de Entorno

**Archivo:** `.env.example`

```bash
# Bot Telegram
TELEGRAM_BOT_TOKEN=tu_token_aqui

# Base de Datos
MONGODB_URI=mongodb://localhost:27017/alertas
# o mongodb+srv://... para MongoDB Atlas

# Servidor
NODE_ENV=production
PORT=3000

# Webhook (Railway/Heroku)
PUBLIC_DOMAIN=tu_dominio.railway.app
RAILWAY_PUBLIC_DOMAIN=tu_dominio.railway.app

# Permisos (opcional - ya hardcoded en constants.js)
ALERT_MANAGER_IDS=123456789,987654321
OPERATOR_IDS=111222333,444555666

# Admin para reportes automáticos
ADMIN_CHAT_ID=7143094298
```

**Variables Críticas:**
- ✅ `TELEGRAM_BOT_TOKEN` - **Obligatorio**
- ✅ `MONGODB_URI` - **Obligatorio**
- ✅ `ADMIN_CHAT_ID` - **Requerido para reportes automáticos**
- ⚠️ `PUBLIC_DOMAIN` - Solo en producción (webhook)

### Railway Configuration

**Archivo:** `Procfile`
```
web: node src/index.js
```

**Modo de Operación:**

| Entorno | `NODE_ENV` | Modo Bot | Puerto |
|---------|------------|----------|--------|
| Desarrollo | `development` | Polling | 3000 |
| Producción | `production` | Webhook | Asignado por Railway |

**Webhook Setup:**
```javascript
const url = process.env.PUBLIC_DOMAIN ||
            `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
const webhookPath = `/bot${token}`;
bot.setWebHook(`${url}${webhookPath}`);
```

**Express Server:**
```javascript
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT || 3000);
```

### Scripts NPM

```json
{
  "start": "node src/index.js",           // Producción
  "dev": "nodemon src/index.js",          // Desarrollo con auto-reload
  "export": "node scripts/exportData.js", // Exportar BD → Excel
  "import": "node scripts/importData.js", // Importar Excel → BD
  "clear-db": "node scripts/clearDatabase.js", // Limpiar BD
  "test": "jest",                         // Tests unitarios
  "test:watch": "jest --watch",           // Tests en modo watch
  "test:coverage": "jest --coverage",     // Coverage report
  "lint": "eslint src/**/*.js",           // Linting
  "lint:fix": "eslint src/**/*.js --fix", // Auto-fix linting
  "format": "prettier --write src/**/*.js" // Formatear código
}
```

---

## Conclusiones

### Fortalezas del Sistema

✅ **Arquitectura modular** clara por capas (handlers → services → models)
✅ **Separación de responsabilidades** básica implementada
✅ **Sistema de permisos** bien definido (operadores vs managers)
✅ **Reportes automáticos** programados con timezone correcto
✅ **Fix de Railway** implementado para envío de archivos grandes
✅ **Tests básicos** para módulos críticos (report, scheduler)
✅ **Teclado persistente** mejora experiencia de usuario

### Debilidades Críticas

❌ **Alertas en memoria volátil** - se pierden al reiniciar
❌ **Sistema de apagado de alertas** tiene bugs críticos (ver documento 02)
❌ **Reportes dominicales** pueden llegar vacíos por timezone (ver documento 02)
❌ **Estado de maniobras** se pierde al reiniciar
❌ **IDs de usuarios hardcoded** - dificulta gestión de permisos
❌ **Sin logging estructurado** - dificulta debugging en producción
❌ **Sin monitoring** - no hay alertas de errores críticos
❌ **Código legacy** sin limpiar (tipos de alerta removidos)
❌ **Tests incompletos** - falta coverage en módulos críticos

### Próximos Pasos

Ver documentos:
- **02-hallazgos-bugs-y-fragilidades.md** - Detalle de todos los bugs encontrados
- **03-plan-correcion-bugs.md** - Orden de corrección propuesto
- **04-plan-refactorizacion-fases.md** - Roadmap de refactorización
- **05-recomendaciones-arquitectura-futuro.md** - Diseño para futuras integraciones

---

**Fin del Documento 01**
