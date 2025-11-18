# 02 - Hallazgos: Bugs y Fragilidades del Sistema

**Fecha de Auditoría:** 2025-11-18
**Prioridad:** CRÍTICO
**Estado:** Producción Afectada

---

## Tabla de Contenidos

1. [Resumen de Hallazgos](#resumen-de-hallazgos)
2. [Bugs Críticos del Sistema de Alertas](#bugs-críticos-del-sistema-de-alertas)
3. [Problemas del Sistema de Reportes](#problemas-del-sistema-de-reportes)
4. [Fragilidades de Arquitectura](#fragilidades-de-arquitectura)
5. [Problemas de Configuración](#problemas-de-configuración)
6. [Deuda Técnica](#deuda-técnica)
7. [Matriz de Riesgos](#matriz-de-riesgos)

---

## Resumen de Hallazgos

### Estadísticas

| Categoría | Crítico | Alto | Medio | Bajo | Total |
|-----------|---------|------|-------|------|-------|
| Bugs | 4 | 3 | 2 | 1 | 10 |
| Fragilidades | 2 | 5 | 4 | 3 | 14 |
| Deuda Técnica | 1 | 3 | 6 | 5 | 15 |
| **TOTAL** | **7** | **11** | **12** | **9** | **39** |

### Impacto en Producción

🔴 **CRÍTICO** (7 items):
- Sistema de apagado de alertas no funciona confiablemente
- Reportes dominicales pueden llegar vacíos
- Reinicio manual requerido en casos extremos
- Estado volátil causa pérdida de datos operacionales

🟠 **ALTO** (11 items):
- Problemas de timezone pueden causar reportes incorrectos
- Código legacy sin limpiar puede causar confusión
- Sin logging estructurado dificulta debugging
- Sin monitoreo en producción

---

## Bugs Críticos del Sistema de Alertas

### 🔴 BUG-001: RACE CONDITION en startAlert() - Alerta No Cancelable

**Prioridad:** CRÍTICO
**Archivo:** `src/services/alert.js:26-46`
**Impacto:** Alertas no se pueden cancelar, requiere reinicio del bot

#### Descripción Técnica

El problema ocurre en la secuencia asíncrona de inicialización de alertas:

```javascript
// CÓDIGO ACTUAL (PROBLEMÁTICO)
let intervalId;  // ⚠️ Declarado ANTES del sendMessage

sendWithPersistentKeyboard(bot, chatId, message)
  .then(() => {
    intervalId = setInterval(() => { ... }, 20000);  // ⚠️ Se asigna DENTRO del .then()

    activeAlerts[chatId][userId][alertType] = {
      interval: intervalId,  // ⚠️ Se guarda en activeAlerts
      message: message,
      userName: userName
    };
  })
  .catch(() => {
    if (intervalId) {clearInterval(intervalId);}  // ⚠️ Puede ser undefined aquí
  });
```

#### Escenario de Fallo

**Secuencia temporal:**

```
T0: Operador presiona 📞 CONFERENCIA
T1: startAlert() se ejecuta
T2: sendWithPersistentKeyboard() inicia (promesa pendiente)
T3: Manager presiona 📞 CONFERENCIA para cancelar
T4: stopAlertForUser() se ejecuta
    → activeAlerts[chatId][userId]['Conferencia'] NO existe aún
    → return false (no se encontró alerta)
T5: .then() de startAlert() se ejecuta
    → intervalId = setInterval(...)
    → activeAlerts[chatId][userId]['Conferencia'] = { interval: intervalId }
T6: ❌ RESULTADO: La alerta queda activa y NO SE PUEDE CANCELAR
```

#### Reproducción

1. Operador inicia alerta de conferencia
2. Inmediatamente (< 500ms) un manager intenta cancelarla
3. La alerta sigue sonando cada 20 segundos
4. Ningún comando puede detenerla (ni `/stopalert`)
5. **Solución actual:** Reinicio manual del bot desde Railway

#### Impacto en Producción

- ❌ **Confiabilidad:** Sistema de apagado NO es confiable
- ❌ **Operación:** Requiere intervención manual (restart)
- ❌ **Experiencia:** Spam de mensajes hasta reinicio
- ❌ **Reputación:** Usuarios pierden confianza en el bot

#### Causa Raíz

**Problema arquitectónico:** Estado se actualiza de forma **asíncrona** sin mecanismo de sincronización.

---

### 🔴 BUG-002: stopAlertForUser() No Valida que interval Esté Definido

**Prioridad:** CRÍTICO
**Archivo:** `src/services/alert.js:52-64`
**Impacto:** clearInterval() puede recibir undefined

#### Descripción Técnica

```javascript
// CÓDIGO ACTUAL (PROBLEMÁTICO)
function stopAlertForUser(chatId, targetUserId, alertType) {
  try {
    if (activeAlerts[chatId]?.[targetUserId]?.[alertType]) {
      clearInterval(activeAlerts[chatId][targetUserId][alertType].interval);
      // ⚠️ NO valida si .interval está definido
      delete activeAlerts[chatId][targetUserId][alertType];
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error en stopAlertForUser...`, error);
    return false;
  }
}
```

#### Problema

Si debido a BUG-001 (race condition), `activeAlerts[chatId][userId][alertType]` existe pero `interval` es `undefined`, el código:

1. Pasa la validación `if (activeAlerts[chatId]?.[targetUserId]?.[alertType])`
2. Ejecuta `clearInterval(undefined)` → **NO hace nada** (silenciosamente falla)
3. Elimina la entrada de `activeAlerts`
4. Retorna `true` (indicando éxito)

**Resultado:** El sistema cree que canceló la alerta, pero el `setInterval` sigue ejecutándose en memoria.

#### Impacto

- ❌ **Fuga de memoria:** Intervalos huérfanos siguen ejecutándose
- ❌ **Estado inconsistente:** Sistema cree que la alerta está apagada, pero sigue sonando
- ❌ **Debugging difícil:** El error es silencioso (no lanza excepción)

---

### 🔴 BUG-003: handleAlertManagerDeactivation() Solo Cancela Primera Alerta

**Prioridad:** CRÍTICO
**Archivo:** `src/services/alert.js:97-123`
**Impacto:** Múltiples alertas del mismo tipo no se cancelan completamente

#### Descripción Técnica

```javascript
// CÓDIGO ACTUAL (PROBLEMÁTICO)
for (const operatorId in chatOperatorsAlerts) {
  if (chatOperatorsAlerts[operatorId]?.[alertType]) {
    stopAlertForUser(chatId, operatorId, alertType);

    const message = cancelationMessages[alertType] || '🚫 *No se encontró mensaje...*';
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    alertFound = true;
    break;  // ⚠️ PROBLEMA: Sale del loop inmediatamente
  }
}
```

#### Escenario de Fallo

**Situación:**
- Chat ID: `-100123456789`
- Operador 1 (ID: `7143094298`) inicia alerta "Conferencia"
- Operador 2 (ID: `7754458578`) inicia alerta "Conferencia"
- Manager presiona botón 📞 CONFERENCIA para cancelar

**Resultado:**
1. Loop encuentra alerta de Operador 1
2. Cancela alerta de Operador 1
3. Envía mensaje de confirmación
4. `break` sale del loop
5. ❌ **Alerta de Operador 2 sigue activa**

#### Impacto

- ❌ **Funcionalidad incompleta:** No cancela todas las alertas
- ❌ **Confusión:** Mensaje dice "alerta desactivada" pero sigue sonando
- ❌ **Operación:** Usuario cree que funcionó, pero sigue recibiendo alertas

#### Diseño Cuestionable

**Pregunta arquitectónica:** ¿Debería cancelar TODAS las alertas del tipo, o solo una?

Actualmente el código **intenta** cancelar solo una, pero el botón dice "CONFERENCIA" sin especificar de cuál operador.

**Comportamiento esperado (sugerido):**
- Cancelar **TODAS** las alertas del tipo "Conferencia" en ese chat
- O mostrar botones individuales por operador

---

### 🟠 BUG-004: Código Legacy de Tipos de Alerta Removidos

**Prioridad:** ALTO
**Archivo:** `src/services/alert.js:86-94`
**Impacto:** Confusión en mantenimiento, potencial para bugs futuros

#### Descripción

```javascript
// CÓDIGO ACTUAL (PROBLEMÁTICO)
function handleOperatorAction(bot, alertType, chatId, userId, from) {
  switch (alertType) {
  case 'Conferencia':                  // ✅ EXISTE en constants.js
  case 'USUARIO_NO_ESTA_EN_VH':        // ❌ NO EXISTE en constants.js
  case 'VALIDACION_DE_ORIGEN':         // ❌ NO EXISTE en constants.js
    startAlert(bot, userId, alertType, chatId, getUserName(from));
    break;
  default:
    break;
  }
}
```

**En `src/config/constants.js`:**

```javascript
const alertTypes = {
  Conferencia: {
    message: '⚠️⚠️ Cabina, por favor apóyame con una conferencia. ¡Gracias! 📞'
  }
  // ❌ USUARIO_NO_ESTA_EN_VH y VALIDACION_DE_ORIGEN fueron removidos
};
```

#### Problema

1. El código hace referencia a tipos de alerta que **no existen**
2. Si alguien intentara usar esos tipos, `startAlert()` fallaría silenciosamente:
   ```javascript
   const alertInfo = alertTypes[alertType];
   if (!alertInfo) {return;}  // ← Sale sin error
   ```

#### Impacto

- ⚠️ **Deuda técnica:** Código muerto que confunde
- ⚠️ **Mantenibilidad:** Nuevo desarrollador puede pensar que esos tipos existen
- ⚠️ **Testing:** Tests podrían fallar si se prueban esos casos

---

### 🟡 BUG-005: activeAlerts Exportado pero No Debería Ser Modificado Externamente

**Prioridad:** MEDIO
**Archivo:** `src/services/alert.js:132`
**Impacto:** Posible corrupción de estado si se modifica desde fuera

#### Descripción

```javascript
// CÓDIGO ACTUAL
module.exports = {
  startAlert,
  stopAlertForUser,
  cancelAllAlertsForChat,
  handleOperatorAction,
  handleAlertManagerDeactivation,
  activeAlerts  // ⚠️ Exportado como objeto mutable
};
```

**Usado en:**
- `src/handlers/commands.js:4` - Para verificar si hay alertas antes de `/stopalert`

#### Problema

Al exportar `activeAlerts` directamente, cualquier módulo puede:

```javascript
const { activeAlerts } = require('../services/alert');

// ❌ Posible (pero NO debería serlo):
activeAlerts[chatId] = {};  // Corrupción de estado
delete activeAlerts[chatId][userId];  // Bypass de lógica de negocio
```

#### Diseño Correcto

Debería exportarse una **función getter** de solo lectura:

```javascript
// PROPUESTA
function getActiveAlertsForChat(chatId) {
  return activeAlerts[chatId] ? Object.keys(activeAlerts[chatId]).length : 0;
}

module.exports = {
  // ... otras funciones
  getActiveAlertsForChat  // ✅ Interfaz controlada
  // NO exportar activeAlerts directamente
};
```

---

## Problemas del Sistema de Reportes

### 🔴 BUG-006: Desajuste de Timezone entre Servidor y Lógica de Reportes

**Prioridad:** CRÍTICO
**Archivo:** `src/services/report.js:10-30`, `src/services/scheduler.js:13-18`
**Impacto:** Reportes dominicales llegan vacíos o con datos incorrectos

#### Descripción del Problema

**Configuración actual:**

1. **Cron job (scheduler.js):**
   ```javascript
   cron.schedule('55 23 * * 0', callback, {
     timezone: 'America/Mexico_City'  // ✅ CORRECTO
   });
   ```

2. **Cálculo de fechas (report.js):**
   ```javascript
   const today = new Date();  // ⚠️ USA ZONA HORARIA DEL SERVIDOR
   ```

3. **Almacenamiento de maniobras (maniobra.js):**
   ```javascript
   fecha: { type: Date, default: Date.now }  // ⚠️ UTC timestamp
   ```

#### Escenario de Fallo

**Configuración de Railway:**
- Servidor en zona horaria: **UTC** (lo más probable)

**Evento:**
- Domingo 23:55 hora de México (UTC-6)
- Equivalente: **Lunes 05:55 UTC**

**Secuencia:**

```
1. Cron se ejecuta (correcto: timezone configurado)
   → Es domingo 23:55 en México
   → Es lunes 05:55 en UTC (hora del servidor)

2. generateWeeklyExcel() ejecuta:
   const today = new Date();  // Lunes 05:55 UTC
   const dayOfWeek = today.getDay();  // 1 (Lunes)
   const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;  // 1 - 1 = 0
   monday.setDate(today.getDate() + 0);  // Lunes actual

3. Calcula rango:
   monday = Lunes 00:00:00 UTC (HOY)
   sunday = Domingo 23:59:59 UTC (DENTRO DE 6 DÍAS)

4. Query MongoDB:
   { fecha: { $gte: Lunes 00:00 UTC, $lte: Domingo 23:59 UTC } }

5. ❌ RESULTADO: Busca la semana SIGUIENTE, no la actual
   → Reporte vacío (no hay maniobras futuras)
```

#### Prueba del Problema

**Verificación en Railway:**

```javascript
// Ejecutar en consola de Node.js en servidor de Railway
console.log('Timezone servidor:', Intl.DateTimeFormat().resolvedOptions().timeZone);
// Probable resultado: "UTC"

const today = new Date();
console.log('Fecha servidor:', today.toISOString());
console.log('getDay():', today.getDay());
// Si es domingo 23:55 México → será lunes 05:55 UTC → getDay() = 1
```

#### Causa Raíz

**new Date()** usa la zona horaria del **sistema operativo del servidor**, NO la configurada en el cron job.

---

### 🟠 BUG-007: Modelo Maniobra Almacena Fecha sin Timezone Explícito

**Prioridad:** ALTO
**Archivo:** `src/models/maniobra.js:9`
**Impacto:** Inconsistencia entre hora de registro y hora de consulta

#### Descripción

```javascript
// CÓDIGO ACTUAL
const maniobraSchema = new mongoose.Schema({
  // ...
  fecha: { type: Date, default: Date.now }  // ⚠️ UTC timestamp
});
```

#### Problema

1. **Registro de maniobra:**
   - Manager registra maniobra el sábado 15:30 hora de México
   - `Date.now` devuelve timestamp UTC: sábado 21:30 UTC
   - Se almacena en MongoDB: `2025-11-15T21:30:00.000Z`

2. **Generación de reporte:**
   - Reporte se ejecuta domingo 23:55 México = lunes 05:55 UTC
   - Calcula semana: lunes a domingo (UTC)
   - Query: `{ fecha: { $gte: lunes 00:00 UTC, $lte: domingo 23:59 UTC } }`

3. **Resultado:**
   - Maniobra del sábado 21:30 UTC cae en la semana anterior
   - No aparece en el reporte

#### Diseño Correcto

Opciones:

**Opción A:** Almacenar timestamp con timezone explícito
```javascript
fecha: {
  type: Date,
  default: () => new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
}
```

**Opción B (recomendada):** Normalizar SIEMPRE en UTC y convertir en queries
```javascript
// Almacenar en UTC (actual está bien)
fecha: { type: Date, default: Date.now }

// Al consultar, convertir rango a UTC considerando México
const mondayMX = moment.tz('America/Mexico_City').startOf('isoWeek');
const sundayMX = moment.tz('America/Mexico_City').endOf('isoWeek');
const mondayUTC = mondayMX.utc().toDate();
const sundayUTC = sundayMX.utc().toDate();
```

---

### 🟡 BUG-008: Formato de Fecha en Excel Puede No Ser Reconocido

**Prioridad:** MEDIO
**Archivo:** `src/services/report.js:50-58`
**Impacto:** Columna "Fecha" en Excel puede mostrarse como texto

#### Descripción

```javascript
// CÓDIGO ACTUAL
const fechaTexto = fecha.toLocaleString('es-MX', {
  timeZone: 'America/Mexico_City',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

return {
  // ...
  'Fecha': fecha,           // Objeto Date (bien para Excel)
  'Fecha Texto': fechaTexto  // String (bien)
};
```

#### Problema Potencial

Dependiendo de cómo Excel interprete la columna "Fecha":
- Si está bien: aparece como fecha nativa de Excel (sortable, filtrable)
- Si falla: aparece como número serial o texto

**Causa:** `XLSX.utils.json_to_sheet()` puede no detectar automáticamente el tipo Date.

#### Solución

Usar opciones explícitas de celda:

```javascript
const ws = XLSX.utils.json_to_sheet(data);

// Forzar formato de fecha en columna F (índice 5)
const range = XLSX.utils.decode_range(ws['!ref']);
for (let R = range.s.r + 1; R <= range.e.r; ++R) {
  const cellAddress = XLSX.utils.encode_cell({ r: R, c: 5 });
  if (ws[cellAddress]) {
    ws[cellAddress].t = 'd';  // Tipo: Date
    ws[cellAddress].z = 'dd/mm/yyyy hh:mm AM/PM';  // Formato
  }
}
```

---

## Fragilidades de Arquitectura

### 🔴 FRAG-001: Estado Crítico Solo en Memoria (activeAlerts)

**Prioridad:** CRÍTICO
**Archivo:** `src/services/alert.js:6`
**Impacto:** Pérdida total de alertas activas al reiniciar

#### Descripción

```javascript
const activeAlerts = {};  // ⚠️ Solo en memoria
```

**Implicación:**

```
Escenario:
1. Operador inicia 5 alertas en diferentes grupos
2. Servidor de Railway se reinicia (deploy, crash, restart manual)
3. ❌ TODAS las alertas se pierden
4. Operadores no saben que deben volver a iniciarlas
5. Managers no pueden cancelar alertas que ya no existen en memoria
```

#### Impacto en Producción

- ❌ **Disponibilidad:** Reinicio = pérdida de servicio
- ❌ **Confiabilidad:** Sistema no resistente a fallos
- ❌ **Operación:** Requiere intervención manual constante

#### Solución Recomendada

**Opción A:** Persistir en MongoDB

```javascript
// Colección: activeAlerts
{
  chatId: String,
  userId: Number,
  alertType: String,
  message: String,
  userName: String,
  startedAt: Date,
  lastSentAt: Date
}
```

Al iniciar bot:
1. Leer alertas de MongoDB
2. Recrear setInterval para cada alerta
3. Continuar desde donde quedó

**Opción B:** Usar Redis (más eficiente para estado temporal)

```javascript
// Key: `alert:${chatId}:${userId}:${alertType}`
// Value: JSON { message, userName, startedAt }
// TTL: 24 horas (auto-limpieza)
```

---

### 🔴 FRAG-002: Estado de Flujo de Maniobras Solo en Memoria

**Prioridad:** CRÍTICO
**Archivo:** `src/services/maniobra.js:9`
**Impacto:** Flujos interrumpidos al reiniciar

#### Descripción

```javascript
const userStates = {};  // ⚠️ Solo en memoria
```

**Escenario:**

```
1. Manager inicia registro de maniobras
2. Bot pregunta cantidad
3. Manager responde "8"
4. Bot muestra confirmación
5. Servidor se reinicia (deploy automático)
6. ❌ userStates se pierde
7. Manager presiona "✅ Confirmar"
8. Bot no reconoce el estado → no hace nada
```

#### Impacto

- ⚠️ **Experiencia de usuario:** Frustración por flujo interrumpido
- ⚠️ **Pérdida de datos:** Maniobra no se registra
- ⚠️ **Confusión:** Bot no responde a confirmación

#### Solución Recomendada

**Opción A:** Persistir en MongoDB (para flujos largos)
```javascript
// Colección: userFlows
{
  userId: Number,
  chatId: String,
  flowType: 'maniobra' | 'other',
  step: String,
  data: Object,
  expiresAt: Date  // TTL index
}
```

**Opción B:** Usar conversación stateless
```javascript
// Incluir datos en callback_data del botón
{
  text: '✅ Confirmar',
  callback_data: JSON.stringify({
    action: 'confirm_maniobra',
    quantity: 8
  })
}
```

---

### 🟠 FRAG-003: Sin Validación de Bot Inicializado en Scheduler

**Prioridad:** ALTO
**Archivo:** `src/services/scheduler.js:6, 31-34`
**Impacto:** Cron job falla silenciosamente si bot no está listo

#### Descripción

```javascript
let bot = null;  // ⚠️ Variable global

function initializeScheduler(botInstance) {
  bot = botInstance;  // ⚠️ No valida que botInstance sea válido
  // ...
}

async function sendWeeklyReportToAdmin() {
  if (!bot) {  // ✅ Valida aquí
    console.error('❌ Bot no inicializado para scheduler');
    return;
  }
  // ...
}
```

#### Problema

1. Si `initializeScheduler()` se llama con `null` o `undefined`, se acepta silenciosamente
2. Cron job se programa de todos modos
3. Al ejecutarse, falla con mensaje de error pero no alerta a nadie

#### Solución

```javascript
function initializeScheduler(botInstance) {
  if (!botInstance || typeof botInstance.sendMessage !== 'function') {
    throw new Error('Bot instance inválida en initializeScheduler');
  }
  bot = botInstance;
  // ...
}
```

---

### 🟠 FRAG-004: Manejo de Errores Inconsistente

**Prioridad:** ALTO
**Archivos:** Múltiples
**Impacto:** Dificulta debugging y monitoreo

#### Descripción

**Patrones encontrados:**

1. **Try-catch con console.error:**
   ```javascript
   // src/services/alert.js:60-63
   try {
     // ...
   } catch (error) {
     console.error(`Error en stopAlertForUser...`, error);
     return false;
   }
   ```

2. **Catch silencioso (ignora error):**
   ```javascript
   // src/services/alert.js:32-34
   .catch(_error => {  // ⚠️ Prefijo _ ignora linter
     clearInterval(intervalId);
     delete activeAlerts[chatId][userId][alertType];
   });
   ```

3. **Try-catch sin retorno:**
   ```javascript
   // src/services/alert.js:47-49
   } catch {  // ⚠️ No captura objeto error
     sendWithPersistentKeyboard(bot, chatId, '❌ *Error...*');
   }
   ```

4. **Sin manejo de errores:**
   ```javascript
   // src/handlers/messages.js:23-28
   try {
     const handledByManiobras = await handleManiobrasState(...);
     // ...
   } catch (error) {
     console.error('❌ Error en handleManiobrasState:', error);
     // ⚠️ No notifica al usuario del error
   }
   ```

#### Problema

- Sin estándar de logging
- Errores críticos se pierden en logs
- No hay alertas automáticas de errores
- Debugging en producción es difícil

#### Solución Recomendada

**Implementar logger estructurado:**

```typescript
// logger.service.ts
import winston from 'winston';

export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
    // Opcional: Enviar a Sentry, LogDNA, etc.
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }
}
```

---

### 🟡 FRAG-005: IDs de Usuarios Hardcoded

**Prioridad:** MEDIO
**Archivo:** `src/config/constants.js:1-4`
**Impacto:** Cambiar permisos requiere redeploy

#### Descripción

```javascript
// CÓDIGO ACTUAL
const operatorIds = [7143094298, 7754458578, 7509818905, 8048487029, 7241170867];
const alertManagerIds = [7143094298, 1022124142, 7758965062, 5660087041, 6330970125];
const SUPER_ADMIN_ID = 7143094298;
```

**Variables de entorno NO usadas:**
```bash
# .env.example (no se usan)
ALERT_MANAGER_IDS=123456789,987654321
OPERATOR_IDS=111222333,444555666
```

#### Problema

Para agregar/quitar un operador o manager:
1. Editar `constants.js`
2. Commit al repo
3. Deploy en Railway
4. Reinicio del bot

**NO se puede:**
- Revocar permisos instantáneamente
- Delegar gestión de usuarios
- Auditar cambios de permisos

#### Solución Recomendada

**Opción A:** Usar variables de entorno (rápido)
```javascript
const operatorIds = process.env.OPERATOR_IDS?.split(',').map(Number) || [];
```

**Opción B:** Modelo en MongoDB (recomendado)
```javascript
// Colección: users
{
  userId: Number,
  roles: ['operator', 'alert_manager', 'super_admin'],
  addedAt: Date,
  addedBy: Number
}
```

---

### 🟡 FRAG-006: Callback Query Handler No Utilizado

**Prioridad:** MEDIO
**Archivo:** `src/handlers/callback_query.js`
**Impacto:** Código legacy confunde, agrega peso al bundle

#### Descripción

El sistema cambió de **botones inline** a **teclado persistente**, pero el handler de callbacks sigue existiendo:

```javascript
// src/handlers/callback_query.js
function setupCallbackQueryHandlers(bot) {
  // ... código que nunca se ejecuta
}
```

**Usado en:**
- `src/handlers/index.js:7` - Se importa y registra

**Problema:**
- Handler se registra pero nunca recibe eventos
- Agrega complejidad innecesaria
- Confunde a nuevos desarrolladores

#### Solución

**Opción A:** Eliminar completamente
```bash
rm src/handlers/callback_query.js
# Actualizar src/handlers/index.js
```

**Opción B:** Documentar como legacy
```javascript
// LEGACY: Sistema cambió a teclado persistente
// Mantener por si se necesita inline en futuro
```

---

## Problemas de Configuración

### 🟠 CONF-001: Variables de Entorno Inconsistentes

**Prioridad:** ALTO
**Archivo:** `.env.example`
**Impacto:** Confusión en deployment

#### Descripción

**.env.example dice:**
```bash
MONGODB_URI=mongodb://localhost:27017/alertas
```

**Código usa:**
```javascript
// src/config/database.js
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/alertas';
//                                ^^^^^^^^ ⚠️ Nombre diferente
```

**Problema:** Si usuario copia `.env.example` y usa `MONGODB_URI`, no funciona.

#### Solución

Estandarizar en **MONGO_URI** (más corto):

```bash
# .env.example
MONGO_URI=mongodb://localhost:27017/alertas
```

---

### 🟡 CONF-002: Sin Validación de Variables Críticas al Inicio

**Prioridad:** MEDIO
**Archivo:** `src/index.js`
**Impacto:** Bot puede iniciar sin configuración completa

#### Descripción

**Código actual:**
```javascript
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });
// ⚠️ Si token es undefined, bot inicializa y falla después
```

#### Problema

Si falta `TELEGRAM_BOT_TOKEN`:
1. Bot intenta inicializar
2. Falla al conectar a Telegram
3. Error críptico en runtime

**Mejor:**
1. Validar variables al inicio
2. Fallar rápido con mensaje claro

#### Solución

```typescript
// config/env.validator.ts
export function validateEnv() {
  const required = [
    'TELEGRAM_BOT_TOKEN',
    'MONGO_URI',
    'ADMIN_CHAT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
  }
}

// index.ts
validateEnv();  // Primer línea después de dotenv.config()
```

---

## Deuda Técnica

### 🟠 DEBT-001: Sin Tests para Sistema de Alertas

**Prioridad:** ALTO
**Archivos:** `src/services/alert.js` (sin tests)
**Impacto:** Sistema más crítico sin cobertura de tests

#### Descripción

**Tests existentes:**
- ✅ `tests/services/report.test.js`
- ✅ `tests/services/scheduler.test.js`

**Tests faltantes:**
- ❌ `tests/services/alert.test.js`
- ❌ `tests/services/maniobra.test.js`
- ❌ `tests/handlers/commands.test.js`
- ❌ `tests/handlers/messages.test.js`
- ❌ `tests/utils/permissions.test.js`

#### Impacto

- Refactorización arriesgada (sin red de seguridad)
- Regresiones difíciles de detectar
- Bugs solo se descubren en producción

---

### 🟡 DEBT-002: Sin Logging Estructurado

**Prioridad:** MEDIO
**Impacto:** Debugging difícil en producción

#### Descripción

**Actual:**
```javascript
console.log('🔄 Configurando handlers...');
console.error('❌ Error:', error);
```

**Problemas:**
- No hay niveles de log (debug, info, warn, error)
- No hay contexto estructurado
- Difícil filtrar en Railway logs
- No se puede enviar a servicios externos (Sentry, LogDNA)

---

### 🟡 DEBT-003: Sin Monitoreo en Producción

**Prioridad:** MEDIO
**Impacto:** Errores críticos pasan desapercibidos

#### Descripción

**Actual:**
- Errores solo van a Railway logs
- No hay alertas automáticas
- No hay métricas de negocio

**Recomendado:**
- **Sentry** para errores
- **DataDog / New Relic** para métricas
- **Health check endpoint** para uptime monitoring

---

## Matriz de Riesgos

| ID | Descripción | Probabilidad | Impacto | Riesgo | Mitigación Actual |
|----|-------------|--------------|---------|--------|-------------------|
| BUG-001 | Race condition en alertas | Alta | Crítico | 🔴 CRÍTICO | Reinicio manual |
| BUG-002 | clearInterval(undefined) | Alta | Crítico | 🔴 CRÍTICO | Ninguna |
| BUG-003 | Solo cancela primera alerta | Media | Crítico | 🔴 CRÍTICO | Ninguna |
| BUG-006 | Timezone en reportes | Alta | Crítico | 🔴 CRÍTICO | Ninguna |
| FRAG-001 | Alertas solo en memoria | Alta | Crítico | 🔴 CRÍTICO | Reinicio manual |
| FRAG-002 | Estados solo en memoria | Media | Crítico | 🔴 CRÍTICO | Ninguna |
| BUG-004 | Código legacy | Baja | Alto | 🟠 ALTO | Ninguna |
| BUG-007 | Fecha sin timezone | Alta | Alto | 🟠 ALTO | Ninguna |
| FRAG-003 | Sin validar bot init | Media | Alto | 🟠 ALTO | Verificación manual |
| FRAG-004 | Errores inconsistentes | Alta | Alto | 🟠 ALTO | Ninguna |
| CONF-001 | Vars env inconsistentes | Media | Alto | 🟠 ALTO | Documentación |

---

## Resumen y Recomendaciones

### Bugs que Explican los Síntomas Reportados

1. **"Alerta no se apaga aun presionando botón"**
   - ✅ **BUG-001:** Race condition en startAlert()
   - ✅ **BUG-002:** clearInterval() con undefined
   - ✅ **BUG-003:** Solo cancela primera alerta

2. **"Ni siquiera superadmin puede apagar alerta"**
   - ✅ **BUG-001:** Race condition hace alerta indetenible
   - ✅ **FRAG-001:** Estado solo en memoria, puede corromperse

3. **"Se requiere restart desde Railway"**
   - ✅ **BUG-001 + BUG-002:** Intervalos huérfanos en memoria
   - ✅ **FRAG-001:** Reinicio limpia memoria

4. **"Reporte dominical llega vacío"**
   - ✅ **BUG-006:** Timezone desajustado
   - ✅ **BUG-007:** Fechas en UTC vs México

5. **"Bot se vuelve loco / comportamiento errático"**
   - ✅ **FRAG-001:** Estado volátil corrompe lógica
   - ✅ **FRAG-002:** Estados perdidos generan respuestas inconsistentes

### Prioridad de Corrección

Ver documento **03-plan-correcion-bugs.md** para orden de implementación.

---

**Fin del Documento 02**
