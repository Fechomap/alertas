# 03 - Plan de Corrección de Bugs

**Fecha:** 2025-11-18
**Objetivo:** Establecer orden y estrategia para corregir bugs críticos
**Contexto:** Sistema en producción, requiere corrección sin interrupciones

---

## Tabla de Contenidos

1. [Estrategia General](#estrategia-general)
2. [Fase 0: Hotfixes Críticos (Pre-Refactorización)](#fase-0-hotfixes-críticos-pre-refactorización)
3. [Fase 1: Correcciones Durante Refactorización](#fase-1-correcciones-durante-refactorización)
4. [Fase 2: Mejoras Post-Refactorización](#fase-2-mejoras-post-refactorización)
5. [Plan de Testing](#plan-de-testing)
6. [Plan de Rollback](#plan-de-rollback)
7. [Cronograma Estimado](#cronograma-estimado)

---

## Estrategia General

### Decisión Arquitectónica: Refactorización Completa vs. Hotfixes

**Decisión:** Combinación de ambos enfoques

```
┌─────────────────────────────────────────────────────────┐
│  FASE 0: Hotfixes Críticos (JavaScript Actual)          │
│  ↓ Corregir bugs que impiden operación normal           │
│  ↓ Duración: 1-2 días                                   │
│  ↓ Deploy inmediato a producción                        │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  FASE 1: Refactorización Completa (TypeScript)          │
│  ↓ Migrar todo el código a TypeScript                   │
│  ↓ Corregir bugs arquitectónicos durante migración      │
│  ↓ Duración: 2-3 semanas                                │
│  ↓ Deploy a staging → testing → producción              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  FASE 2: Mejoras Post-Refactorización                   │
│  ↓ Agregar features nuevas                              │
│  ↓ Optimizaciones de performance                        │
│  ↓ Integración con ERP                                  │
└─────────────────────────────────────────────────────────┘
```

### Justificación

**¿Por qué NO solo hotfixes?**
- Código JavaScript actual tiene deuda técnica acumulada
- Bugs son síntomas de problemas arquitectónicos
- Migrar a TypeScript evita regresiones futuras
- Configuración profesional (ESLint, Prettier) mejora mantenibilidad

**¿Por qué NO refactorizar directamente?**
- Sistema en producción con bugs críticos activos
- Usuarios afectados necesitan solución inmediata
- Refactorización requiere 2-3 semanas de trabajo
- Hotfixes permiten operar mientras se refactoriza

### Criterios de Priorización

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Impacto en producción** | 40% | ¿Afecta operación actual? |
| **Frecuencia** | 25% | ¿Qué tan seguido ocurre? |
| **Workaround disponible** | 20% | ¿Hay forma de evitarlo? |
| **Complejidad de fix** | 15% | ¿Cuánto esfuerzo requiere? |

---

## Fase 0: Hotfixes Críticos (Pre-Refactorización)

**Objetivo:** Estabilizar sistema en producción ANTES de refactorizar
**Duración:** 1-2 días
**Tecnología:** JavaScript (código actual)
**Branch:** `hotfix/critical-bugs-2025-11`

### Lista de Hotfixes

#### ✅ HOTFIX-01: Corregir Race Condition en startAlert()

**Bug:** BUG-001
**Prioridad:** 🔴 CRÍTICA
**Archivos:** `src/services/alert.js:26-46`
**Tiempo estimado:** 2 horas

**Solución:**

```javascript
// ANTES (PROBLEMÁTICO)
function startAlert(bot, userId, alertType, chatId, userName) {
  let intervalId;

  sendWithPersistentKeyboard(bot, chatId, message)
    .then(() => {
      intervalId = setInterval(() => { ... }, 20000);
      activeAlerts[chatId][userId][alertType] = {
        interval: intervalId,
        message: message,
        userName: userName
      };
    });
}

// DESPUÉS (CORREGIDO)
async function startAlert(bot, userId, alertType, chatId, userName) {
  const alertInfo = alertTypes[alertType];
  if (!alertInfo) return;

  if (!activeAlerts[chatId]) activeAlerts[chatId] = {};
  if (!activeAlerts[chatId][userId]) activeAlerts[chatId][userId] = {};

  // ✅ CANCELAR ALERTA EXISTENTE PRIMERO
  if (activeAlerts[chatId]?.[userId]?.[alertType]?.interval) {
    clearInterval(activeAlerts[chatId][userId][alertType].interval);
  }

  const userAlerts = activeAlerts[chatId][userId];
  const activeCount = Object.values(userAlerts).filter(alert => alert?.interval).length;
  if (activeCount >= 2 && !activeAlerts[chatId]?.[userId]?.[alertType]) return;

  const message = alertInfo.message;

  // ✅ CREAR PLACEHOLDER INMEDIATAMENTE (antes de enviar mensaje)
  activeAlerts[chatId][userId][alertType] = {
    interval: null,  // ← Placeholder, se asignará después
    message: message,
    userName: userName,
    isPending: true   // ← Flag para indicar que está inicializando
  };

  try {
    // ✅ AWAIT para completar antes de crear interval
    await sendWithPersistentKeyboard(bot, chatId, message);

    // ✅ VERIFICAR QUE NO SE CANCELÓ DURANTE EL AWAIT
    if (!activeAlerts[chatId]?.[userId]?.[alertType]) {
      console.log('⚠️ Alerta cancelada durante inicialización');
      return;
    }

    // ✅ AHORA SÍ CREAR INTERVAL
    const intervalId = setInterval(async () => {
      try {
        await sendWithPersistentKeyboard(bot, chatId, message);
      } catch (error) {
        console.error('Error enviando alerta:', error);
        stopAlertForUser(chatId, userId, alertType);
      }
    }, 20000);

    // ✅ ACTUALIZAR CON INTERVAL REAL
    activeAlerts[chatId][userId][alertType] = {
      interval: intervalId,
      message: message,
      userName: userName,
      isPending: false
    };

    console.log(`✅ Alerta iniciada: ${alertType} por ${userName} en chat ${chatId}`);

  } catch (error) {
    console.error('Error iniciando alerta:', error);
    // ✅ LIMPIAR PLACEHOLDER SI FALLA
    delete activeAlerts[chatId][userId][alertType];
    await sendWithPersistentKeyboard(bot, chatId, '❌ *Error al iniciar alerta. Por favor, intenta nuevamente.*');
  }
}
```

**Cambios clave:**
1. ✅ Función ahora es `async`
2. ✅ Se crea placeholder inmediatamente en `activeAlerts`
3. ✅ Se usa `await` para completar envío antes de crear interval
4. ✅ Se verifica que no se canceló durante el await
5. ✅ Manejo robusto de errores con limpieza

**Testing:**
```javascript
// Test: Cancelar alerta inmediatamente después de iniciarla
1. Operador presiona 📞 CONFERENCIA
2. En < 500ms, manager presiona 📞 CONFERENCIA
3. Verificar: alerta NO debe continuar sonando
```

---

#### ✅ HOTFIX-02: Validar interval en stopAlertForUser()

**Bug:** BUG-002
**Prioridad:** 🔴 CRÍTICA
**Archivos:** `src/services/alert.js:52-64`
**Tiempo estimado:** 30 minutos

**Solución:**

```javascript
// ANTES
function stopAlertForUser(chatId, targetUserId, alertType) {
  try {
    if (activeAlerts[chatId]?.[targetUserId]?.[alertType]) {
      clearInterval(activeAlerts[chatId][targetUserId][alertType].interval);
      delete activeAlerts[chatId][targetUserId][alertType];
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error en stopAlertForUser...`, error);
    return false;
  }
}

// DESPUÉS (CORREGIDO)
function stopAlertForUser(chatId, targetUserId, alertType) {
  try {
    const alert = activeAlerts[chatId]?.[targetUserId]?.[alertType];

    if (!alert) {
      return false;  // No existe la alerta
    }

    // ✅ VALIDAR QUE interval ESTÉ DEFINIDO
    if (alert.interval) {
      clearInterval(alert.interval);
      console.log(`✅ Interval cancelado para ${targetUserId}/${alertType} en chat ${chatId}`);
    } else {
      console.warn(`⚠️ Alerta existe pero interval es ${alert.interval} (isPending: ${alert.isPending})`);
    }

    // ✅ ELIMINAR SIEMPRE (incluso si interval era undefined)
    delete activeAlerts[chatId][targetUserId][alertType];

    // ✅ LIMPIAR ESTRUCTURAS VACÍAS
    if (Object.keys(activeAlerts[chatId][targetUserId]).length === 0) {
      delete activeAlerts[chatId][targetUserId];
    }
    if (Object.keys(activeAlerts[chatId]).length === 0) {
      delete activeAlerts[chatId];
    }

    return true;

  } catch (error) {
    console.error(`❌ Error en stopAlertForUser para ${chatId}/${targetUserId}/${alertType}:`, error);
    return false;
  }
}
```

**Cambios clave:**
1. ✅ Valida que `interval` esté definido antes de `clearInterval()`
2. ✅ Log warning si interval es undefined (ayuda a detectar race conditions)
3. ✅ Limpia estructuras vacías (evita memory leaks)
4. ✅ Siempre elimina entrada (incluso si interval era undefined)

---

#### ✅ HOTFIX-03: Cancelar TODAS las Alertas del Tipo

**Bug:** BUG-003
**Prioridad:** 🔴 CRÍTICA
**Archivos:** `src/services/alert.js:97-123`
**Tiempo estimado:** 1 hora

**Solución:**

```javascript
// ANTES
function handleAlertManagerDeactivation(bot, alertType, chatId) {
  try {
    let alertFound = false;
    const chatOperatorsAlerts = activeAlerts[chatId] || {};

    for (const operatorId in chatOperatorsAlerts) {
      if (chatOperatorsAlerts[operatorId]?.[alertType]) {
        stopAlertForUser(chatId, operatorId, alertType);

        const message = cancelationMessages[alertType] || '🚫 *No se encontró mensaje...*';
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        alertFound = true;
        break;  // ⚠️ PROBLEMA: Solo cancela la primera
      }
    }

    if (!alertFound) {
      bot.sendMessage(chatId, '🚫 *No se encontró una alerta activa para cancelar.*', { parse_mode: 'Markdown' });
    }

    return alertFound;
  } catch (error) {
    console.error(`Error en handleAlertManagerDeactivation...`, error);
    return false;
  }
}

// DESPUÉS (CORREGIDO)
async function handleAlertManagerDeactivation(bot, alertType, chatId) {
  try {
    const chatOperatorsAlerts = activeAlerts[chatId] || {};
    const canceledOperators = [];  // ✅ Lista de operadores cancelados

    // ✅ CANCELAR TODAS LAS ALERTAS DEL TIPO (no solo la primera)
    for (const operatorId in chatOperatorsAlerts) {
      if (chatOperatorsAlerts[operatorId]?.[alertType]) {
        const success = stopAlertForUser(chatId, operatorId, alertType);
        if (success) {
          canceledOperators.push(operatorId);
          console.log(`✅ Alerta ${alertType} cancelada para operador ${operatorId}`);
        }
      }
    }

    // ✅ MENSAJE SEGÚN CANTIDAD CANCELADA
    if (canceledOperators.length > 0) {
      const baseMessage = cancelationMessages[alertType] || '🚫 *Alerta desactivada.*';
      const countMessage = canceledOperators.length > 1
        ? `\n\n_(${canceledOperators.length} alertas canceladas)_`
        : '';

      await bot.sendMessage(chatId, baseMessage + countMessage, { parse_mode: 'Markdown' });

      return true;
    } else {
      await bot.sendMessage(chatId, '🚫 *No se encontró una alerta activa de este tipo para cancelar.*', { parse_mode: 'Markdown' });
      return false;
    }

  } catch (error) {
    console.error(`❌ Error en handleAlertManagerDeactivation para ${chatId}/${alertType}:`, error);
    return false;
  }
}
```

**Cambios clave:**
1. ✅ Función ahora es `async` (mejor manejo de bot.sendMessage)
2. ✅ Elimina `break` → cancela TODAS las alertas del tipo
3. ✅ Guarda lista de operadores cancelados
4. ✅ Mensaje indica cantidad de alertas canceladas
5. ✅ Logging mejorado para debugging

---

#### ✅ HOTFIX-04: Corregir Timezone en Reportes

**Bug:** BUG-006, BUG-007
**Prioridad:** 🔴 CRÍTICA
**Archivos:** `src/services/report.js:10-30`
**Tiempo estimado:** 3 horas
**Dependencia:** Requiere instalar `moment-timezone`

**Instalación:**
```bash
npm install moment-timezone
```

**Solución:**

```javascript
// ANTES
async function generateExcel(weeklyOnly = false) {
  let query = {};

  if (weeklyOnly) {
    const today = new Date();  // ⚠️ Usa timezone del servidor (UTC)
    const monday = new Date(today);

    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    query = {
      fecha: { $gte: monday, $lte: sunday }
    };
  }
  // ...
}

// DESPUÉS (CORREGIDO)
const moment = require('moment-timezone');  // ← Agregar al inicio del archivo

async function generateExcel(weeklyOnly = false) {
  let query = {};

  if (weeklyOnly) {
    // ✅ USAR MOMENT-TIMEZONE PARA MANEJAR MÉXICO
    const TZ = 'America/Mexico_City';

    // ✅ Obtener fecha/hora actual en México
    const todayMX = moment.tz(TZ);

    console.log(`📅 Generando reporte semanal (timezone: ${TZ})`);
    console.log(`📅 Fecha actual en México: ${todayMX.format('YYYY-MM-DD HH:mm:ss')}`);

    // ✅ Calcular lunes de la semana actual (en México)
    const mondayMX = todayMX.clone().startOf('isoWeek');  // Lunes 00:00:00
    const sundayMX = todayMX.clone().endOf('isoWeek');    // Domingo 23:59:59

    console.log(`📅 Rango México: ${mondayMX.format('YYYY-MM-DD HH:mm:ss')} - ${sundayMX.format('YYYY-MM-DD HH:mm:ss')}`);

    // ✅ Convertir a UTC para query de MongoDB
    const mondayUTC = mondayMX.utc().toDate();
    const sundayUTC = sundayMX.utc().toDate();

    console.log(`📅 Rango UTC: ${moment(mondayUTC).format('YYYY-MM-DD HH:mm:ss')} - ${moment(sundayUTC).format('YYYY-MM-DD HH:mm:ss')}`);

    query = {
      fecha: { $gte: mondayUTC, $lte: sundayUTC }
    };
  }

  const maniobras = await Maniobra.find(query).lean();
  console.log(`📊 Encontrados ${maniobras.length} registros de maniobras`);

  // ✅ FORMATEAR FECHAS CON MOMENT-TIMEZONE
  const maniobraData = maniobras.map(m => {
    const fechaMX = moment(m.fecha).tz('America/Mexico_City');
    const fechaTexto = fechaMX.format('DD/MM/YYYY hh:mm A');

    return {
      'ID del Grupo': m.chatId,
      'Nombre del Grupo': m.groupName,
      'ID del Alert Manager': m.alertManagerId,
      'Cantidad de Maniobras': m.maniobras,
      'Descripción': m.descripcion,
      'Fecha': m.fecha,  // Original (Date object para Excel)
      'Fecha Texto': fechaTexto  // Formateado para México
    };
  });

  // ... resto del código
}
```

**Cambios clave:**
1. ✅ Usa `moment-timezone` en lugar de `Date` nativo
2. ✅ Calcula rango de semana en timezone México
3. ✅ Convierte a UTC solo para query de MongoDB
4. ✅ Logging detallado para debugging
5. ✅ Formatea fechas con timezone México

**Actualizar también scheduler.js:**

```javascript
// src/services/scheduler.js:42-53

// ANTES
const today = new Date();
const monday = new Date(today);
const dayOfWeek = today.getDay();
const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
monday.setDate(today.getDate() + daysToMonday);

const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);

const fechaInicio = monday.toLocaleDateString('es-MX');
const fechaFin = sunday.toLocaleDateString('es-MX');

// DESPUÉS (CORREGIDO)
const moment = require('moment-timezone');  // ← Agregar al inicio
const TZ = 'America/Mexico_City';

const todayMX = moment.tz(TZ);
const mondayMX = todayMX.clone().startOf('isoWeek');
const sundayMX = todayMX.clone().endOf('isoWeek');

const fechaInicio = mondayMX.format('DD/MM/YYYY');
const fechaFin = sundayMX.format('DD/MM/YYYY');
```

**Testing:**
```javascript
// Test manual: ejecutar /testreport en diferentes días de la semana
- Lunes: debe incluir desde lunes 00:00 hasta domingo 23:59
- Domingo: debe incluir desde lunes de ESA semana hasta domingo 23:59
- Verificar que timezone sea correcto comparando con hora local
```

---

#### ✅ HOTFIX-05: Limpiar Código Legacy

**Bug:** BUG-004
**Prioridad:** 🟡 MEDIA (pero rápido de hacer)
**Archivos:** `src/services/alert.js:86-94`
**Tiempo estimado:** 15 minutos

**Solución:**

```javascript
// ANTES
function handleOperatorAction(bot, alertType, chatId, userId, from) {
  switch (alertType) {
  case 'Conferencia':
  case 'USUARIO_NO_ESTA_EN_VH':        // ❌ No existe
  case 'VALIDACION_DE_ORIGEN':         // ❌ No existe
    startAlert(bot, userId, alertType, chatId, getUserName(from));
    break;
  default:
    break;
  }
}

// DESPUÉS (CORREGIDO)
function handleOperatorAction(bot, alertType, chatId, userId, from) {
  // ✅ Solo tipos de alerta activos
  if (alertType === 'Conferencia') {
    startAlert(bot, userId, alertType, chatId, getUserName(from));
  } else {
    console.warn(`⚠️ Tipo de alerta no reconocido: ${alertType}`);
  }
}
```

**Cambios clave:**
1. ✅ Elimina referencias a tipos removidos
2. ✅ Simplifica lógica (if en lugar de switch para un solo caso)
3. ✅ Log warning si se recibe tipo no reconocido

---

### Deployment de Hotfixes

**Proceso:**

```bash
# 1. Crear branch de hotfix
git checkout -b hotfix/critical-bugs-2025-11

# 2. Aplicar HOTFIX-01 a HOTFIX-05
# Editar archivos según soluciones arriba

# 3. Instalar moment-timezone
npm install moment-timezone

# 4. Commit
git add .
git commit -m "hotfix: corrige race conditions, timezone y código legacy

- HOTFIX-01: Corrige race condition en startAlert() (BUG-001)
- HOTFIX-02: Valida interval en stopAlertForUser() (BUG-002)
- HOTFIX-03: Cancela TODAS las alertas del tipo (BUG-003)
- HOTFIX-04: Corrige timezone en reportes (BUG-006, BUG-007)
- HOTFIX-05: Limpia código legacy (BUG-004)

Dependencias: + moment-timezone@0.5.43"

# 5. Push a Railway
git push origin hotfix/critical-bugs-2025-11

# 6. Merge a main (después de testing)
git checkout main
git merge hotfix/critical-bugs-2025-11
git push origin main

# 7. Deploy automático en Railway
```

**Testing antes de merge:**

```bash
# En ambiente de desarrollo
NODE_ENV=development npm run dev

# Verificar:
1. ✅ Alerta se cancela correctamente
2. ✅ Múltiples alertas se cancelan
3. ✅ Reportes usan timezone correcto
4. ✅ /testreport funciona
5. ✅ No hay errores en logs
```

---

## Fase 1: Correcciones Durante Refactorización

**Objetivo:** Corregir bugs arquitectónicos mientras se migra a TypeScript
**Duración:** 2-3 semanas
**Tecnología:** TypeScript + nueva arquitectura
**Branch:** `feat/typescript-refactor-complete`

### Correcciones Incluidas en Refactorización

Estos bugs se corregirán **como parte natural** de la nueva arquitectura:

#### ✅ Durante Refactorización: Persistir Alertas en MongoDB

**Bug:** FRAG-001
**Solución:** Crear modelo `ActiveAlert` en MongoDB

```typescript
// src/domain/entities/active-alert.entity.ts
export interface ActiveAlert {
  id: string;
  chatId: string;
  userId: number;
  alertType: AlertType;
  message: string;
  userName: string;
  startedAt: Date;
  lastSentAt: Date;
}

// src/infrastructure/repositories/active-alert.repository.ts
export class ActiveAlertRepository {
  async save(alert: ActiveAlert): Promise<void>;
  async findByChatId(chatId: string): Promise<ActiveAlert[]>;
  async deleteById(id: string): Promise<void>;
  async deleteAllForChat(chatId: string): Promise<void>;
}
```

**Flujo:**
1. Al iniciar alerta → guardar en MongoDB
2. setInterval → actualizar `lastSentAt` cada 20 seg
3. Al cancelar → eliminar de MongoDB
4. Al iniciar bot → leer alertas de MongoDB y recrear intervals

---

#### ✅ Durante Refactorización: Persistir Estados de Maniobra

**Bug:** FRAG-002
**Solución:** Usar patrón Command + Event Sourcing simplificado

```typescript
// src/domain/entities/user-flow.entity.ts
export interface UserFlow {
  userId: number;
  chatId: string;
  flowType: 'maniobra';
  currentStep: string;
  data: Record<string, any>;
  expiresAt: Date;
}

// src/infrastructure/repositories/user-flow.repository.ts
export class UserFlowRepository {
  async save(flow: UserFlow): Promise<void>;
  async findByUserId(userId: number): Promise<UserFlow | null>;
  async deleteByUserId(userId: number): Promise<void>;
}
```

**O usar botones con callback_data:**

```typescript
// Alternativa más simple: stateless
bot.sendMessage(chatId, '¿Confirmas?', {
  reply_markup: {
    inline_keyboard: [[
      {
        text: '✅ Confirmar',
        callback_data: JSON.stringify({
          action: 'confirm_maniobra',
          quantity: 8,
          chatId: chatId
        })
      }
    ]]
  }
});
```

---

#### ✅ Durante Refactorización: Logging Estructurado

**Bug:** FRAG-004
**Solución:** Implementar `LoggerService` con Winston

```typescript
// src/infrastructure/services/logger.service.ts
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
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });
  }

  error(message: string, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }
}
```

---

#### ✅ Durante Refactorización: Modelo de Permisos Flexible

**Bug:** FRAG-005
**Solución:** Modelo `User` en MongoDB

```typescript
// src/domain/entities/user.entity.ts
export enum UserRole {
  OPERATOR = 'operator',
  ALERT_MANAGER = 'alert_manager',
  SUPER_ADMIN = 'super_admin'
}

export interface User {
  userId: number;
  roles: UserRole[];
  addedAt: Date;
  addedBy?: number;
  isActive: boolean;
}

// src/infrastructure/repositories/user.repository.ts
export class UserRepository {
  async findByUserId(userId: number): Promise<User | null>;
  async hasRole(userId: number, role: UserRole): Promise<boolean>;
  async addRole(userId: number, role: UserRole): Promise<void>;
  async removeRole(userId: number, role: UserRole): Promise<void>;
}

// src/application/services/permission.service.ts
export class PermissionService {
  constructor(private userRepo: UserRepository) {}

  async isOperator(userId: number): Promise<boolean> {
    return await this.userRepo.hasRole(userId, UserRole.OPERATOR);
  }

  async isAlertManager(userId: number): Promise<boolean> {
    return await this.userRepo.hasRole(userId, UserRole.ALERT_MANAGER);
  }

  async isSuperAdmin(userId: number): Promise<boolean> {
    return await this.userRepo.hasRole(userId, UserRole.SUPER_ADMIN);
  }
}
```

**Migración de datos:**
```typescript
// scripts/migrate-users.ts
const HARDCODED_OPERATORS = [7143094298, 7754458578, ...];
const HARDCODED_MANAGERS = [7143094298, 1022124142, ...];

async function migrateUsers() {
  for (const userId of HARDCODED_OPERATORS) {
    await userRepo.save({
      userId,
      roles: [UserRole.OPERATOR],
      addedAt: new Date(),
      isActive: true
    });
  }

  for (const userId of HARDCODED_MANAGERS) {
    const user = await userRepo.findByUserId(userId);
    if (user) {
      await userRepo.addRole(userId, UserRole.ALERT_MANAGER);
    } else {
      await userRepo.save({
        userId,
        roles: [UserRole.ALERT_MANAGER],
        addedAt: new Date(),
        isActive: true
      });
    }
  }
}
```

---

## Fase 2: Mejoras Post-Refactorización

**Objetivo:** Agregar features que mejoran observabilidad y operación
**Duración:** 1-2 semanas
**Tecnología:** TypeScript (ya refactorizado)

### Mejoras Propuestas

#### 📊 Monitoreo y Alertas

**Implementar:**
1. **Health check endpoint**
   ```typescript
   // GET /health
   {
     status: 'healthy',
     uptime: 3600,
     activeAlerts: 5,
     mongodb: 'connected',
     telegram: 'connected'
   }
   ```

2. **Sentry para errores**
   ```typescript
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV
   });
   ```

3. **Métricas de negocio**
   ```typescript
   // Prometheus metrics
   - alert_started_total (counter)
   - alert_canceled_total (counter)
   - alert_duration_seconds (histogram)
   - report_generation_duration_seconds (histogram)
   ```

---

#### 🧪 Tests Completos

**Agregar:**

```typescript
// tests/services/alert.service.test.ts
describe('AlertService', () => {
  describe('startAlert', () => {
    it('should create alert in memory and database');
    it('should not allow more than 2 alerts per user');
    it('should cancel existing alert before creating new one');
    it('should handle race condition correctly');
  });

  describe('stopAlert', () => {
    it('should cancel alert and clear interval');
    it('should return false if alert does not exist');
    it('should handle undefined interval gracefully');
  });

  describe('cancelAllAlerts', () => {
    it('should cancel all alerts of given type');
    it('should send confirmation message');
    it('should handle multiple operators correctly');
  });
});
```

**Coverage objetivo:** 80%+

---

#### 🔧 Comandos de Administración

**Agregar comandos:**

```typescript
// /addoperator <userId>
// Solo super admin
// Agrega usuario como operador

// /removeoperator <userId>
// Solo super admin
// Remueve rol de operador

// /listusers
// Solo super admin
// Lista todos los usuarios con roles

// /alertstatus
// Alert managers
// Muestra todas las alertas activas en el chat
```

---

## Plan de Testing

### Testing de Hotfixes (Fase 0)

**Ambiente:** Development + Staging

```bash
# 1. Tests manuales
npm run dev

# Verificar:
- ✅ HOTFIX-01: Iniciar y cancelar alerta inmediatamente
- ✅ HOTFIX-02: Cancelar alerta sin interval
- ✅ HOTFIX-03: Múltiples operadores → cancelar todos
- ✅ HOTFIX-04: Reporte dominical con datos correctos
- ✅ HOTFIX-05: No errores en logs

# 2. Tests automatizados (agregar después)
npm test
```

### Testing de Refactorización (Fase 1)

**Ambiente:** Development → Staging → Production

```bash
# 1. Tests unitarios
npm test

# 2. Tests de integración
npm run test:integration

# 3. Tests end-to-end
npm run test:e2e

# 4. Verificación manual en staging
- Crear grupo de prueba
- Probar todos los flujos
- Verificar reportes
- Simular reinicio
- Verificar recuperación de alertas
```

### Checklist de Deployment

```
□ Tests unitarios pasan (80%+ coverage)
□ Tests de integración pasan
□ ESLint sin errores
□ Prettier aplicado
□ Build de TypeScript exitoso
□ Variables de entorno documentadas
□ README actualizado
□ Changelog actualizado
□ Staging testeado por 48h sin errores
□ Aprobación del equipo
```

---

## Plan de Rollback

### Rollback de Hotfixes

**Si hotfixes causan problemas:**

```bash
# 1. Identificar commit previo estable
git log --oneline

# 2. Revertir
git revert <commit-hash>
git push origin main

# 3. Railway hace auto-deploy del revert

# 4. Notificar al equipo
```

### Rollback de Refactorización

**Si refactorización tiene bugs críticos:**

```bash
# Opción A: Revertir a versión JavaScript
git checkout main  # Versión con hotfixes aplicados
railway up

# Opción B: Fix forward (preferido)
# Crear hotfix en rama TypeScript
git checkout feat/typescript-refactor-complete
# Aplicar fix
git commit -m "hotfix: corrige bug en refactor"
git push
```

**Estrategia de mitigación:**
1. Mantener rama `main` con hotfixes por 2 semanas
2. No eliminar hasta confirmar estabilidad de refactor
3. Usar feature flags para activar gradualmente nueva arquitectura

---

## Cronograma Estimado

### Semana 1: Hotfixes

| Día | Tarea | Estimado | Responsable |
|-----|-------|----------|-------------|
| L | HOTFIX-01: Race condition | 2h | Dev |
| L | HOTFIX-02: Validación interval | 30min | Dev |
| M | HOTFIX-03: Cancelar todas | 1h | Dev |
| M | HOTFIX-04: Timezone | 3h | Dev |
| M | HOTFIX-05: Código legacy | 15min | Dev |
| X | Testing en desarrollo | 4h | Dev + QA |
| J | Deploy a staging | 1h | Dev |
| J-V | Testing en staging | 8h | QA |
| V | Deploy a producción | 1h | Dev |

**Total:** 5 días

### Semanas 2-4: Refactorización

| Semana | Tarea | Estimado |
|--------|-------|----------|
| 2 | Setup TypeScript + arquitectura base | 3 días |
| 2 | Migrar modelos y repositorios | 2 días |
| 3 | Migrar servicios (alert, maniobra, report) | 4 días |
| 3 | Migrar handlers | 1 día |
| 4 | Tests + documentación | 3 días |
| 4 | Deploy staging + testing | 2 días |

**Total:** 15 días

### Semana 5: Post-Refactorización

| Día | Tarea | Estimado |
|-----|-------|----------|
| L-M | Monitoreo (Sentry, health checks) | 2 días |
| X | Comandos admin | 1 día |
| J | Métricas Prometheus | 1 día |
| V | Deploy producción | 1 día |

**Total:** 5 días

---

## Resumen

### Estrategia Híbrida

```
┌──────────────────────────────────────────────────┐
│ AHORA: Hotfixes (JavaScript)                     │
│ → Estabilizar producción                         │
│ → 5 días                                          │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ DESPUÉS: Refactorización (TypeScript)            │
│ → Nueva arquitectura                             │
│ → Correcciones arquitectónicas                   │
│ → 15 días                                         │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│ FINALMENTE: Mejoras (TypeScript)                 │
│ → Monitoreo                                       │
│ → Comandos admin                                  │
│ → 5 días                                          │
└──────────────────────────────────────────────────┘
```

**Total:** ~25 días laborales (5 semanas)

### Prioridades

🔴 **URGENTE (Semana 1):**
- HOTFIX-01 a HOTFIX-05
- Testing y deployment

🟠 **IMPORTANTE (Semanas 2-4):**
- Refactorización completa a TypeScript
- Correcciones arquitectónicas

🟡 **MEJORAS (Semana 5):**
- Monitoreo
- Comandos admin
- Métricas

---

**Siguiente:** Ver documento **04-plan-refactorizacion-fases.md** para detalles de la arquitectura TypeScript.

---

**Fin del Documento 03**
