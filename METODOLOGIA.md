# Estándares de Desarrollo para Bots Escalables (Mini-ERP)

> **OBLIGATORIO DESDE EL DÍA 0** — No existe implementación "incremental". Todo bot inicia con esta arquitectura completa, sin excepciones. El bot de hoy es el ERP de mañana.

---

## Filosofía Central

```
┌────────────────────────────────────────────────────────────────────────────┐
│  "El bot más simple hoy debe estar preparado para ser un ERP mañana"       │
│  "Telegram hoy, WhatsApp mañana, App móvil después"                        │
│  "Si no puedes explicar la arquitectura, no escribas código"               │
│  "ESM-first: El futuro es ahora, CommonJS es el pasado"                    │
└────────────────────────────────────────────────────────────────────────────┘
```

**Cualquier desviación requiere aprobación escrita del Lead Tech.**

---

## Reglas de Oro (Inmutables)

### ✅ SIEMPRE HACER

| # | Regla | Razón |
|---|-------|-------|
| 1 | **Analizar arquitectura ANTES de escribir código** | Sin análisis = deuda técnica garantizada |
| 2 | **Migraciones SOLO a través del ORM (Prisma)** | Consistencia, versionado, rollback |
| 3 | **Redis desde el día 0** | Sesiones, cache, colas — base del escalamiento |
| 4 | **Tests que validen comportamiento real** | Tests decorativos = peor que no tener tests |
| 5 | **Investigar errores en fuentes oficiales** | Docs oficiales → GitHub Issues → StackOverflow |
| 6 | **Documentar decisiones arquitectónicas** | El "por qué" es más importante que el "qué" |
| 7 | **Separar responsabilidades desde el inicio** | Un archivo = una responsabilidad |
| 8 | **Pensar en multi-plataforma** | Telegram hoy, WhatsApp/App mañana |
| 9 | **Usar librerías consolidadas y mantenidas** | +1000 stars, updates recientes, comunidad activa |
| 10 | **Docker y Kubernetes ready desde día 0** | Railway hoy, infraestructura propia mañana |
| 11 | **Si un error no se resuelve, buscar en la web** | Google el error exacto antes de inventar soluciones |
| 12 | **Centralizar TODO** | Config, constantes, tipos, utilidades en un solo lugar |
| 13 | **ESM-first siempre** | CommonJS es legacy, ESM es el estándar |

### ❌ PROHIBIDO (Sin Excepciones)

| # | Prohibición | Consecuencia de Violar |
|---|-------------|------------------------|
| 1 | **Migraciones manuales SQL fuera del ORM** | Bloqueo de PR + rollback obligatorio |
| 2 | **Código sin análisis previo de arquitectura** | Rechazo de PR |
| 3 | **Simulaciones o mocks que no reflejen realidad** | Tests inválidos, bugs en producción |
| 4 | **Parches temporales o "hotfixes" permanentes** | Refactorización obligatoria en sprint actual |
| 5 | **Hacks para bypasear validaciones/reglas** | Revisión disciplinaria |
| 6 | **God Classes (+300 líneas o +5 responsabilidades)** | División obligatoria antes de merge |
| 7 | **Librerías abandonadas o experimentales** | Rechazo de dependencia |
| 8 | **Lógica de negocio en adaptadores** | Mover a Use Cases |
| 9 | **Secrets en código o commits** | Rotación inmediata de credenciales |
| 10 | **Ignorar errores o usar catch vacíos** | Implementar manejo apropiado |
| 11 | **any types en TypeScript** | Tipar correctamente |
| 12 | **console.log en código productivo** | Usar logger estructurado |
| 13 | **Polling en producción** | Solo webhooks |
| 14 | **SQL raw directo** | Todo via Prisma |
| 15 | **Copiar-pegar código (duplicación)** | Extraer a utilidad compartida |
| 16 | **Implementar sin entender el problema** | Analizar primero |
| 17 | **Librerías "pasajeras" o de moda** | Solo librerías consolidadas |
| 18 | **CommonJS (require/module.exports)** | Solo ESM (import/export) |
| 19 | **Frameworks atados a CommonJS (NestJS)** | Solo frameworks ESM-native |

---

## Proceso Obligatorio de Desarrollo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE DESARROLLO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ANÁLISIS (Obligatorio antes de escribir código)                        │
│     ├── ¿Dónde encaja en la arquitectura Clean?                            │
│     ├── ¿Qué capas se ven afectadas?                                       │
│     ├── ¿Requiere migración de DB? → Solo via Prisma                       │
│     ├── ¿Afecta otros módulos? → Documentar impacto                        │
│     └── ¿Es escalable a WhatsApp/App? → Desacoplar de Telegram             │
│                                                                             │
│  2. DISEÑO                                                                  │
│     ├── Crear/actualizar ADR (Architecture Decision Record)                │
│     ├── Definir interfaces antes de implementaciones                       │
│     └── Revisar con Lead Tech si hay dudas                                 │
│                                                                             │
│  3. IMPLEMENTACIÓN                                                          │
│     ├── TDD: Test primero, código después                                  │
│     ├── Una clase = una responsabilidad                                    │
│     ├── Máximo 200 líneas por archivo                                      │
│     └── Commits atómicos con Conventional Commits                          │
│                                                                             │
│  4. VALIDACIÓN                                                              │
│     ├── Tests pasan (100% cobertura)                                       │
│     ├── Lint sin warnings                                                  │
│     ├── Build exitoso                                                      │
│     └── PR review aprobado                                                 │
│                                                                             │
│  5. DOCUMENTACIÓN                                                           │
│     ├── Actualizar docs/working/                                           │
│     ├── Mover de docs/pending/ si aplica                                   │
│     └── JSDoc en código público                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estructura del Proyecto

```
bot-name/
├── src/
│   ├── adapters/                    # Capa de Interface (Telegram/WhatsApp/HTTP)
│   │   ├── telegram/
│   │   │   ├── handlers/
│   │   │   │   ├── commands/
│   │   │   │   │   └── start.handler.ts
│   │   │   │   ├── callbacks/
│   │   │   │   │   └── menu.callback.ts
│   │   │   │   └── index.ts
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   ├── session.middleware.ts
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── keyboards/
│   │   │   │   └── main.keyboard.ts
│   │   │   └── telegram.adapter.ts
│   │   │
│   │   ├── whatsapp/                # PREPARADO para expansión futura
│   │   │   └── .gitkeep
│   │   │
│   │   ├── messaging/               # Abstracción multi-plataforma
│   │   │   ├── interfaces/
│   │   │   │   ├── message-sender.interface.ts
│   │   │   │   ├── message-receiver.interface.ts
│   │   │   │   └── platform-adapter.interface.ts
│   │   │   └── messaging.factory.ts
│   │   │
│   │   └── http/
│   │       ├── routes/
│   │       │   ├── webhook.route.ts
│   │       │   ├── health.route.ts
│   │       │   └── index.ts
│   │       └── server.ts            # Hono server setup
│   │
│   ├── application/                 # Capa de Casos de Uso (NEGOCIO AQUÍ)
│   │   ├── use-cases/
│   │   │   ├── user/
│   │   │   │   ├── register-user.use-case.ts
│   │   │   │   ├── get-user.use-case.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   └── index.ts
│   │   ├── dtos/
│   │   │   ├── user.dto.ts
│   │   │   └── index.ts
│   │   └── interfaces/
│   │       └── use-case.interface.ts
│   │
│   ├── domain/                      # Capa de Dominio (NÚCLEO PURO)
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── repositories/
│   │   │   └── user.repository.interface.ts
│   │   ├── value-objects/
│   │   │   ├── telegram-id.vo.ts
│   │   │   └── phone-number.vo.ts
│   │   ├── events/
│   │   │   └── user-registered.event.ts
│   │   ├── errors/
│   │   │   ├── domain.error.ts
│   │   │   └── user-not-found.error.ts
│   │   └── constants/
│   │       └── user.constants.ts
│   │
│   ├── infrastructure/              # Capa de Infraestructura
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── migrations/      # SOLO via `prisma migrate`
│   │   │   │   └── seed.ts
│   │   │   ├── repositories/
│   │   │   │   └── user.repository.ts
│   │   │   └── prisma.client.ts
│   │   │
│   │   ├── cache/                   # REDIS - OBLIGATORIO DESDE DÍA 0
│   │   │   ├── redis.client.ts
│   │   │   ├── session.store.ts
│   │   │   ├── cache.service.ts
│   │   │   └── keys/
│   │   │       └── redis-keys.constant.ts
│   │   │
│   │   ├── queues/                  # BULLMQ - OBLIGATORIO DESDE DÍA 0
│   │   │   ├── queue.client.ts
│   │   │   ├── processors/
│   │   │   │   └── notification.processor.ts
│   │   │   └── jobs/
│   │   │       └── send-report.job.ts
│   │   │
│   │   ├── logging/
│   │   │   └── logger.ts
│   │   │
│   │   ├── monitoring/
│   │   │   ├── sentry.ts
│   │   │   └── metrics.ts
│   │   │
│   │   └── external/
│   │       └── payment.gateway.ts
│   │
│   ├── container/                   # AWILIX - Inyección de Dependencias
│   │   ├── container.ts             # Configuración principal del container
│   │   ├── modules/
│   │   │   ├── database.module.ts
│   │   │   ├── cache.module.ts
│   │   │   ├── queues.module.ts
│   │   │   ├── repositories.module.ts
│   │   │   ├── services.module.ts
│   │   │   ├── use-cases.module.ts
│   │   │   └── index.ts
│   │   └── types.ts                 # Tipos del container
│   │
│   ├── shared/                      # Utilidades Centralizadas
│   │   ├── constants/
│   │   │   ├── app.constants.ts
│   │   │   └── messages.constants.ts
│   │   ├── utils/
│   │   │   ├── date.util.ts
│   │   │   ├── string.util.ts
│   │   │   └── validation.util.ts
│   │   ├── middlewares/             # Middlewares de Hono
│   │   │   ├── error-handler.middleware.ts
│   │   │   └── logging.middleware.ts
│   │   └── types/
│   │       ├── context.type.ts
│   │       └── common.types.ts
│   │
│   ├── config/                      # Configuración Centralizada
│   │   ├── index.ts                 # Exporta toda la config
│   │   ├── env.ts                   # Validación con Zod
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── telegram.config.ts
│   │   └── queue.config.ts
│   │
│   ├── app.ts                       # Composición de la aplicación Hono
│   └── main.ts                      # Entry point
│
├── tests/
│   ├── unit/
│   │   ├── use-cases/
│   │   │   └── register-user.use-case.spec.ts
│   │   ├── repositories/
│   │   ├── services/
│   │   └── utils/
│   ├── integration/
│   │   ├── database/
│   │   │   └── user.repository.integration.spec.ts
│   │   ├── redis/
│   │   │   └── session.store.integration.spec.ts
│   │   └── queues/
│   │       └── notification.processor.integration.spec.ts
│   ├── e2e/
│   │   └── bot-flows/
│   │       └── user-registration.e2e.spec.ts
│   ├── fixtures/
│   │   └── user.fixture.ts
│   ├── mocks/
│   │   └── repository.mock.ts
│   └── setup/
│       ├── test-database.ts
│       └── test-redis.ts
│
├── docs/                            # DOCUMENTACIÓN ORGANIZADA
│   ├── architecture/
│   │   ├── README.md
│   │   ├── decisions/               # ADRs
│   │   │   ├── template.md
│   │   │   ├── 001-use-grammy.md
│   │   │   ├── 002-use-hono.md
│   │   │   ├── 003-use-awilix.md
│   │   │   └── 004-esm-first.md
│   │   └── diagrams/
│   │       └── system-context.puml
│   │
│   ├── working/                     # EN USO ACTUAL
│   │   ├── README.md
│   │   ├── setup/
│   │   ├── deployment/
│   │   ├── features/
│   │   ├── troubleshooting/
│   │   └── runbooks/
│   │
│   ├── pending/                     # PENDIENTE DE IMPLEMENTAR
│   │   ├── README.md
│   │   ├── whatsapp-integration.md
│   │   └── mobile-app-backend.md
│   │
│   └── archive/                     # OBSOLETO (histórico)
│       └── README.md
│
├── scripts/
│   ├── setup-dev.sh
│   ├── generate-migration.sh
│   └── health-check.sh
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── docker-compose.test.yml
│
├── k8s/                             # KUBERNETES READY
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   └── hpa.yaml
│   ├── overlays/
│   │   ├── staging/
│   │   │   └── kustomization.yaml
│   │   └── production/
│   │       └── kustomization.yaml
│   └── kustomization.yaml
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── .husky/
│   ├── pre-commit
│   └── commit-msg
│
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── vitest.config.ts
├── .env.example
├── package.json
└── README.md
```

---

## Stack Tecnológico (ESM-First, Solo Librerías Consolidadas)

### Stack Principal

| Categoría | Tecnología | Versión | Razón |
|-----------|------------|---------|-------|
| Runtime | **Node.js** | 22 LTS | ESM nativo, soporte largo plazo |
| Lenguaje | **TypeScript** | 5.5+ | ESM nativo, tipado estricto |
| HTTP Framework | **Hono** | 4+ | ESM nativo, Web Standards, 3.5x más rápido que Express, multi-runtime |
| DI Container | **Awilix** | 10+ | ESM support (`esModules: true`), sin decoradores, strict mode |
| Bot Framework | **grammY** | 1.20+ | ESM nativo, TypeScript-first, muy activo |
| Base de Datos | **PostgreSQL** | 16+ | ACID, maduro, escalable |
| ORM | **Prisma** | 5+ | ESM compatible, type-safe, migraciones |
| Cache | **Redis** | 7+ | Estándar industria |
| Cliente Redis | **ioredis** | 5+ | ESM compatible, +12k stars |
| Colas | **BullMQ** | 5+ | ESM compatible, basado en Redis |
| Validación | **Zod** | 3+ | ESM nativo, TypeScript-first |
| Logging | **Pino** | 9+ | ESM nativo, más rápido |
| Testing | **Vitest** | 2+ | ESM nativo, rápido |

### Stack Infraestructura

| Categoría | Tecnología | Versión | Razón |
|-----------|------------|---------|-------|
| Contenedores | **Docker** | 25+ | Estándar industria |
| Orquestación | **Kubernetes** | 1.28+ | Escalabilidad horizontal |
| Hosting | **Railway** | - | Webhooks, fácil deploy |
| Monitoreo | **Sentry** | - | Error tracking |
| Métricas | **Prometheus + Grafana** | - | Estándar open-source |

### ¿Por qué este Stack?

#### Hono sobre NestJS
```
NestJS:
  ❌ Atado a CommonJS
  ❌ Soporte ESM "experimental" con problemas
  ❌ Overhead de abstracción
  ❌ Más lento

Hono:
  ✅ ESM nativo desde el día 0
  ✅ Web Standards (Request/Response)
  ✅ 3.5x más rápido que Express
  ✅ Mismo código funciona en Node, Deno, Bun, Cloudflare Workers
  ✅ ~12KB, cero dependencias
  ✅ TypeScript-first
```

#### Awilix sobre TSyringe/Inversify
```
TSyringe/Inversify:
  ❌ Requieren decoradores experimentales
  ❌ Dependen de reflect-metadata
  ❌ Problemas con ESM puro

Awilix:
  ✅ ESM support nativo (opción esModules: true)
  ✅ No requiere decoradores
  ✅ Strict mode para detectar problemas de lifetime
  ✅ Convention-over-configuration
  ✅ +280k descargas semanales, muy maduro
```

### Checklist para Nuevas Librerías

```
┌─────────────────────────────────────────────────────────────────┐
│  CHECKLIST OBLIGATORIO - NUEVAS DEPENDENCIAS                   │
├─────────────────────────────────────────────────────────────────┤
│  ☐ +1000 estrellas en GitHub                                   │
│  ☐ Último commit < 3 meses                                     │
│  ☐ Issues activamente respondidos                              │
│  ☐ Documentación completa                                      │
│  ☐ ESM nativo o compatible                                     │
│  ☐ TypeScript nativo o @types disponibles                      │
│  ☐ No tiene alternativa ya incluida en el stack                │
│  ☐ Licencia compatible (MIT, Apache 2.0)                       │
│  ☐ Sin vulnerabilidades conocidas (npm audit)                  │
│  ☐ NO es "librería de moda" o experimental                     │
│  ☐ Historial de mantenimiento >2 años                          │
│  ☐ NO depende de CommonJS exclusivamente                       │
└─────────────────────────────────────────────────────────────────┘

⚠️ Si no cumple TODOS los criterios → NO SE AGREGA
```

---

## Arquitectura Clean + Multi-Plataforma

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           PLATAFORMAS                                      │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│    │   Telegram   │    │   WhatsApp   │    │   Mobile     │               │
│    │    (Hoy)     │    │   (Futuro)   │    │   (Futuro)   │               │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│           └───────────────────┴───────────────────┘                        │
│                               │                                            │
│                               ▼                                            │
│    ┌──────────────────────────────────────────────────────────────────┐   │
│    │                  MESSAGING ABSTRACTION                           │   │
│    │         (IPlatformAdapter, IMessageSender, IMessageReceiver)     │   │
│    └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         ADAPTER LAYER (Hono + grammY)                      │
│  ⚠️  PROHIBIDO: Lógica de negocio                                         │
│  ✅  PERMITIDO: Validación de input, transformación, routing              │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                                    │
│  ✅  AQUÍ VA LA LÓGICA DE NEGOCIO                                         │
│  ✅  Independiente de plataforma (Telegram/WhatsApp/App)                  │
│  ✅  Inyectado via Awilix                                                 │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         DOMAIN LAYER                                       │
│  ⚠️  CERO dependencias externas                                           │
│  ✅  Reglas de negocio puras, entidades, value objects                    │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                                  │
│  PostgreSQL (Prisma) │ Redis (ioredis) │ BullMQ (Jobs) │ External         │
│  ✅  Implementaciones concretas, intercambiables via Awilix               │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementación Base: Hono + Awilix + grammY

### Entry Point (src/main.ts)

```typescript
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createContainer } from './container/container.js';
import { env } from './config/env.js';
import { logger } from './infrastructure/logging/logger.js';

async function bootstrap(): Promise<void> {
  // 1. Crear container de dependencias
  const container = await createContainer();

  // 2. Crear aplicación Hono con dependencias inyectadas
  const app = createApp(container);

  // 3. Iniciar servidor
  serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info(`🚀 Server running on http://localhost:${info.port}`);
      logger.info(`📡 Webhook endpoint: ${env.TELEGRAM_WEBHOOK_URL}`);
    }
  );
}

bootstrap().catch((err) => {
  logger.error('Failed to start application', err);
  process.exit(1);
});
```

### Aplicación Hono (src/app.ts)

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { AwilixContainer } from 'awilix';
import { webhookRoute } from './adapters/http/routes/webhook.route.js';
import { healthRoute } from './adapters/http/routes/health.route.js';
import { errorHandler } from './shared/middlewares/error-handler.middleware.js';
import type { AppDependencies } from './container/types.js';

export function createApp(container: AwilixContainer<AppDependencies>): Hono {
  const app = new Hono();

  // Middlewares globales
  app.use('*', honoLogger());
  app.use('*', cors());
  app.use('*', secureHeaders());

  // Inyectar container en el contexto
  app.use('*', async (c, next) => {
    c.set('container', container);
    await next();
  });

  // Rutas
  app.route('/webhook', webhookRoute);
  app.route('/health', healthRoute);

  // Error handler global
  app.onError(errorHandler);

  return app;
}
```

### Container Awilix (src/container/container.ts)

```typescript
import {
  createContainer as createAwilixContainer,
  asClass,
  asFunction,
  asValue,
  InjectionMode,
  Lifetime,
} from 'awilix';
import type { AwilixContainer } from 'awilix';
import type { AppDependencies } from './types.js';

// Infrastructure
import { createPrismaClient } from '../infrastructure/database/prisma.client.js';
import { createRedisClient } from '../infrastructure/cache/redis.client.js';
import { SessionStore } from '../infrastructure/cache/session.store.js';
import { CacheService } from '../infrastructure/cache/cache.service.js';

// Repositories
import { UserRepository } from '../infrastructure/database/repositories/user.repository.js';

// Services
import { NotificationService } from '../application/services/notification.service.js';

// Use Cases
import { RegisterUserUseCase } from '../application/use-cases/user/register-user.use-case.js';
import { GetUserUseCase } from '../application/use-cases/user/get-user.use-case.js';

// Bot
import { createBot } from '../adapters/telegram/bot.js';

// Config
import { env } from '../config/env.js';
import { logger } from '../infrastructure/logging/logger.js';

export async function createContainer(): Promise<AwilixContainer<AppDependencies>> {
  const container = createAwilixContainer<AppDependencies>({
    injectionMode: InjectionMode.CLASSIC,
    strict: true, // Awilix 10 strict mode
  });

  // Config & Logger
  container.register({
    env: asValue(env),
    logger: asValue(logger),
  });

  // Infrastructure - Singletons
  container.register({
    prisma: asFunction(createPrismaClient).singleton(),
    redis: asFunction(createRedisClient).singleton(),
  });

  // Cache & Session
  container.register({
    sessionStore: asClass(SessionStore).singleton(),
    cacheService: asClass(CacheService).singleton(),
  });

  // Repositories
  container.register({
    userRepository: asClass(UserRepository).scoped(),
  });

  // Services
  container.register({
    notificationService: asClass(NotificationService).scoped(),
  });

  // Use Cases
  container.register({
    registerUserUseCase: asClass(RegisterUserUseCase).scoped(),
    getUserUseCase: asClass(GetUserUseCase).scoped(),
  });

  // Bot (singleton para mantener una instancia)
  container.register({
    bot: asFunction(createBot).singleton(),
  });

  // Verificar que todo está correctamente registrado
  logger.info('✅ DI Container initialized with strict mode');

  return container;
}
```

### Tipos del Container (src/container/types.ts)

```typescript
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Bot } from 'grammy';
import type { Logger } from 'pino';
import type { Env } from '../config/env.js';

// Repositories
import type { UserRepository } from '../infrastructure/database/repositories/user.repository.js';

// Services
import type { SessionStore } from '../infrastructure/cache/session.store.js';
import type { CacheService } from '../infrastructure/cache/cache.service.js';
import type { NotificationService } from '../application/services/notification.service.js';

// Use Cases
import type { RegisterUserUseCase } from '../application/use-cases/user/register-user.use-case.js';
import type { GetUserUseCase } from '../application/use-cases/user/get-user.use-case.js';

export interface AppDependencies {
  // Config
  env: Env;
  logger: Logger;

  // Infrastructure
  prisma: PrismaClient;
  redis: Redis;

  // Cache
  sessionStore: SessionStore;
  cacheService: CacheService;

  // Repositories
  userRepository: UserRepository;

  // Services
  notificationService: NotificationService;

  // Use Cases
  registerUserUseCase: RegisterUserUseCase;
  getUserUseCase: GetUserUseCase;

  // Bot
  bot: Bot;
}
```

### Bot grammY (src/adapters/telegram/bot.ts)

```typescript
import { Bot, session } from 'grammy';
import type { AwilixContainer } from 'awilix';
import type { AppDependencies } from '../../container/types.js';
import type { BotContext } from './context.js';
import { env } from '../../config/env.js';

// Handlers
import { startHandler } from './handlers/commands/start.handler.js';
import { helpHandler } from './handlers/commands/help.handler.js';

// Middlewares
import { authMiddleware } from './middlewares/auth.middleware.js';
import { rateLimitMiddleware } from './middlewares/rate-limit.middleware.js';
import { errorHandlerMiddleware } from './middlewares/error-handler.middleware.js';

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

  // Error handler global
  bot.catch(errorHandlerMiddleware);

  // Middlewares
  bot.use(rateLimitMiddleware);
  bot.use(authMiddleware);

  // Session (usando Redis via middleware)
  bot.use(session({
    initial: () => ({}),
    // El storage real se configura en el middleware de sesión
  }));

  // Comandos
  bot.command('start', startHandler);
  bot.command('help', helpHandler);

  return bot;
}
```

### Webhook Route (src/adapters/http/routes/webhook.route.ts)

```typescript
import { Hono } from 'hono';
import { webhookCallback } from 'grammy';
import type { AwilixContainer } from 'awilix';
import type { AppDependencies } from '../../../container/types.js';

export const webhookRoute = new Hono();

webhookRoute.post('/', async (c) => {
  const container = c.get('container') as AwilixContainer<AppDependencies>;
  const bot = container.resolve('bot');

  // Crear scope para esta request
  const scopedContainer = container.createScope();

  // Inyectar container en el contexto del bot
  bot.use(async (ctx, next) => {
    ctx.container = scopedContainer;
    await next();
  });

  // Procesar update
  const handleUpdate = webhookCallback(bot, 'hono');
  return handleUpdate(c);
});
```

### Use Case Ejemplo (src/application/use-cases/user/register-user.use-case.ts)

```typescript
import type { UserRepository } from '../../../infrastructure/database/repositories/user.repository.js';
import type { Logger } from 'pino';
import { UserAlreadyExistsError } from '../../../domain/errors/user-already-exists.error.js';
import type { User } from '../../../domain/entities/user.entity.js';

export interface RegisterUserInput {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: Logger
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    this.logger.info({ telegramId: input.telegramId }, 'Registering new user');

    // Verificar si usuario existe
    const existingUser = await this.userRepository.findByTelegramId(input.telegramId);
    if (existingUser) {
      throw new UserAlreadyExistsError(input.telegramId);
    }

    // Crear usuario
    const user = await this.userRepository.create({
      telegramId: input.telegramId,
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
    });

    this.logger.info({ userId: user.id }, 'User registered successfully');

    return user;
  }
}
```

---

## Redis: Implementación Obligatoria desde Día 0

### Cliente Redis (src/infrastructure/cache/redis.client.ts)

```typescript
import Redis from 'ioredis';
import type { Env } from '../../config/env.js';
import { logger } from '../logging/logger.js';

export function createRedisClient(env: Env): Redis {
  const client = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  client.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  client.on('error', (err) => {
    logger.error({ err }, '❌ Redis error');
  });

  return client;
}
```

### Estructura de Keys (src/infrastructure/cache/keys/redis-keys.constant.ts)

```typescript
export const REDIS_KEYS = {
  SESSION: (platform: string, odId: string) => 
    `session:${platform}:${odId}`,
  
  CACHE: {
    USER: (odId: string) => `cache:user:${odId}`,
    CONFIG: (key: string) => `cache:config:${key}`,
  },
  
  RATE_LIMIT: (odId: string, action: string) => 
    `ratelimit:${action}:${odId}`,
  
  LOCK: (resource: string) => `lock:${resource}`,
  
  FSM_STATE: (platform: string, odId: string) => 
    `fsm:${platform}:${odId}`,
  
  CHANNEL: {
    NOTIFICATIONS: 'channel:notifications',
    EVENTS: 'channel:events',
  },
} as const;
```

### Session Store (src/infrastructure/cache/session.store.ts)

```typescript
import type { Redis } from 'ioredis';
import { REDIS_KEYS } from './keys/redis-keys.constant.js';
import { APP_CONSTANTS } from '../../shared/constants/app.constants.js';

export interface SessionData {
  odId: string;
  platform: string;
  state: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionStore {
  constructor(private readonly redis: Redis) {}

  async get(platform: string, odId: string): Promise<SessionData | null> {
    const key = REDIS_KEYS.SESSION(platform, odId);
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(
    platform: string,
    odId: string,
    data: Partial<SessionData>
  ): Promise<void> {
    const key = REDIS_KEYS.SESSION(platform, odId);
    const existing = await this.get(platform, odId);

    const session: SessionData = {
      odId,
      platform,
      state: data.state ?? existing?.state ?? 'idle',
      data: { ...existing?.data, ...data.data },
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    await this.redis.setex(
      key,
      APP_CONSTANTS.TIMEOUTS.SESSION_TTL,
      JSON.stringify(session)
    );
  }

  async delete(platform: string, odId: string): Promise<void> {
    const key = REDIS_KEYS.SESSION(platform, odId);
    await this.redis.del(key);
  }
}
```

---

## Configuración ESM

### package.json

```json
{
  "name": "telegram-bot",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "tsx watch src/main.ts",
    "lint": "eslint src --ext .ts --max-warnings 0",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "prepare": "husky"
  },
  "dependencies": {
    "@hono/node-server": "^1.13.0",
    "@prisma/client": "^5.20.0",
    "awilix": "^10.0.0",
    "bullmq": "^5.20.0",
    "grammy": "^1.30.0",
    "hono": "^4.6.0",
    "ioredis": "^5.4.0",
    "pino": "^9.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@vitest/coverage-v8": "^2.1.0",
    "eslint": "^9.0.0",
    "eslint-plugin-import": "^2.30.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.3.0",
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

### tsconfig.json (ESM)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "baseUrl": "./src",
    "paths": {
      "@adapters/*": ["adapters/*"],
      "@application/*": ["application/*"],
      "@domain/*": ["domain/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@shared/*": ["shared/*"],
      "@config/*": ["config/*"],
      "@container/*": ["container/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### .eslintrc.json

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint", "import"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "no-console": "error",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ],
    "import/extensions": ["error", "ignorePackages"],
    "max-lines": ["error", { "max": 200 }],
    "max-lines-per-function": ["error", { "max": 50 }],
    "complexity": ["error", 10]
  },
  "settings": {
    "import/resolver": {
      "typescript": {
        "project": "./tsconfig.json"
      }
    }
  }
}
```

### Validación de Env (src/config/env.ts)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string(),
  TELEGRAM_WEBHOOK_URL: z.string().url(),
  TELEGRAM_WEBHOOK_SECRET: z.string(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),

  // App
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
```

---

## Docker

### Dockerfile (Producción)

```dockerfile
# ============================================
# STAGE 1: Dependencies
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate

# ============================================
# STAGE 2: Builder
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# ============================================
# STAGE 3: Production
# ============================================
FROM node:22-alpine AS production

RUN addgroup -g 1001 -S nodejs && adduser -S hono -u 1001

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=hono:nodejs /app/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/package*.json ./
COPY --from=builder --chown=hono:nodejs /app/prisma ./prisma

USER hono
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/botdb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: botdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit           # ZERO errors
      - run: npm run lint               # ZERO warnings
      - run: npm run format:check
      - run: npm run test:coverage      # 100% coverage
      - run: npm run build
      - run: npm audit --audit-level=high

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Reglas de Testing

### Tests Válidos vs Inválidos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TESTS VÁLIDOS VS INVÁLIDOS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ TESTS VÁLIDOS                        ❌ TESTS INVÁLIDOS                │
│                                                                             │
│  • Prueban comportamiento real           • Solo verifican que no crashea   │
│  • Usan datos representativos            • Usan datos triviales (1, "a")   │
│  • Cubren edge cases                     • Solo happy path                 │
│  • Mocks reflejan contratos reales       • Mocks que siempre retornan OK   │
│  • Fallan cuando el código falla         • Nunca fallan (falso positivo)   │
│  • Son mantenibles y legibles            • Copypaste sin entender          │
│  • Documentan el comportamiento          • Código muerto                   │
│  • Verifican estados y side effects      • Solo verifican return value     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', 'dist/'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
```

---

## Protocolo de Investigación de Errores

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           CUANDO UN ERROR NO SE PUEDE RESOLVER: BUSCAR EN LA WEB           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. COPIAR EL ERROR EXACTO                                                 │
│     └── Mensaje completo, código de error, stack trace                     │
│                                                                             │
│  2. BUSCAR EN DOCUMENTACIÓN OFICIAL (PRIMERO)                              │
│     ├── hono.dev                                                           │
│     ├── grammy.dev                                                         │
│     ├── prisma.io/docs                                                     │
│     ├── github.com/jeffijoe/awilix                                         │
│     └── GitHub Issues del proyecto                                         │
│                                                                             │
│  3. BUSCAR EN GOOGLE                                                       │
│     ├── "[mensaje de error exacto]"                                        │
│     ├── "[error] + [librería] + [versión]"                                 │
│     └── Filtrar: último año                                                │
│                                                                             │
│  4. SI NO SE RESUELVE                                                      │
│     ├── Escalar a Lead Tech con hallazgos                                  │
│     └── Documentar en docs/working/troubleshooting/                        │
│                                                                             │
│  ⛔ PROHIBIDO: Parches sin entender la causa raíz                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumen Final

### ✅ QUÉ HACER

1. ESM-first siempre (`"type": "module"`)
2. Analizar arquitectura antes de código
3. Migraciones solo via Prisma
4. Redis desde día 0
5. Tests que validen comportamiento real
6. Buscar errores en la web
7. Documentar decisiones (ADRs)
8. Separar responsabilidades
9. Pensar multi-plataforma
10. Librerías consolidadas y ESM-compatibles
11. Docker y Kubernetes ready
12. Centralizar config, constantes, tipos

### ❌ QUÉ NO HACER

1. CommonJS (`require`, `module.exports`)
2. Frameworks CommonJS (NestJS)
3. Migraciones SQL manuales
4. Código sin análisis
5. Simulaciones/mocks irreales
6. Parches temporales
7. Hacks para bypasear reglas
8. God Classes
9. Librerías abandonadas
10. any types
11. console.log en producción
12. Polling (solo webhooks)

---

## Docker y Railway: Deployment Production-Ready

### Arquitectura Docker Multi-Stage

El Dockerfile usa **3 stages** para optimizar el tamaño de la imagen:

```dockerfile
# ============================================
# STAGE 1: Dependencies (solo producción)
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# ============================================
# STAGE 2: Builder (compila TypeScript)
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ============================================
# STAGE 3: Production (imagen final mínima)
# ============================================
FROM node:22-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S botuser -u 1001
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/dist ./dist
COPY --from=builder --chown=botuser:nodejs /app/package*.json ./
COPY --from=builder --chown=botuser:nodejs /app/prisma ./prisma

USER botuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

**Beneficios:**
- Imagen final ~150MB (vs ~800MB sin multi-stage)
- Usuario no-root para seguridad
- Healthcheck integrado
- Solo dependencias de producción

### Configuración Railway (railway.toml)

```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Auto-Detección de Webhook en Railway

El bot detecta automáticamente el dominio de Railway para webhooks:

```typescript
// src/main.ts
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const webhookUrl = env.TELEGRAM_WEBHOOK_URL ||
  (railwayDomain ? `https://${railwayDomain}/webhook` : null);

if (isDev || !webhookUrl) {
  // Polling para desarrollo local
  await telegramAdapter.startPolling();
} else {
  // Webhook para producción (Railway)
  await telegramAdapter.setupWebhook(webhookUrl, env.TELEGRAM_WEBHOOK_SECRET);
}
```

**Comportamiento:**
| Entorno | Variable | Modo |
|---------|----------|------|
| Local | `NODE_ENV=development` | Polling |
| Railway | `RAILWAY_PUBLIC_DOMAIN` auto-provisto | Webhook |
| Manual | `TELEGRAM_WEBHOOK_URL` | Webhook (override) |

### Variables de Entorno para Railway

```bash
# Requeridas
TELEGRAM_BOT_TOKEN=xxx
DATABASE_URL=${{Postgres.DATABASE_URL}}    # Referencia interna Railway
NODE_ENV=production
PORT=3000

# Opcionales
ADMIN_CHAT_ID=123456789                     # ID del administrador
REDIS_URL=${{Redis.REDIS_URL}}              # Si usas Redis en Railway

# Auto-detectadas (NO configurar manualmente)
# RAILWAY_PUBLIC_DOMAIN - Railway lo provee automáticamente
```

### Docker Compose para Desarrollo Local

```yaml
# docker/docker-compose.dev.yml
services:
  bot:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    env_file: ../.env
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: alertas
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Flujo de Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE DEPLOYMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LOCAL (Desarrollo)                                             │
│  ├── npm run dev (tsx watch)                                    │
│  ├── Modo: Polling                                              │
│  └── BD: Docker Compose (postgres + redis)                      │
│                                                                 │
│  DOCKER LOCAL (Testing)                                         │
│  ├── docker-compose up --build                                  │
│  ├── Modo: Polling (sin RAILWAY_PUBLIC_DOMAIN)                  │
│  └── BD: Servicios internos del compose                         │
│                                                                 │
│  RAILWAY (Producción)                                           │
│  ├── Push a main → Auto-deploy                                  │
│  ├── Railway detecta Dockerfile                                 │
│  ├── railway.toml configura healthcheck                         │
│  ├── RAILWAY_PUBLIC_DOMAIN auto-provisto                        │
│  ├── Modo: Webhook (auto-detectado)                             │
│  └── BD: Postgres/Redis internos de Railway                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Comandos Útiles

```bash
# Desarrollo local
npm run dev                           # Bot con hot-reload

# Docker local
docker-compose -f docker/docker-compose.dev.yml up --build

# Verificar build
npm run build && npm run type-check

# Railway
git push origin main                  # Auto-deploy
railway logs                          # Ver logs (CLI)
```

---

## Checklist Nuevo Proyecto

```
☐ Crear proyecto con "type": "module"
☐ Configurar tsconfig.json para ESM (NodeNext)
☐ Configurar .env
☐ Levantar Docker (PostgreSQL, Redis)
☐ Ejecutar migraciones (prisma migrate dev)
☐ Configurar Awilix container
☐ Verificar tests (npm run test)
☐ Verificar lint (npm run lint)
☐ Configurar CI/CD
☐ Crear ADR inicial (ESM-first decision)
☐ Configurar Sentry
☐ Configurar Railway/K8s
☐ Verificar webhook Telegram
☐ Documentar en docs/working/

⚠️ NO ESCRIBIR CÓDIGO DE NEGOCIO HASTA COMPLETAR TODO LO ANTERIOR
```

---

**Versión:** 3.0.0 (ESM-First)  
**Autor:** Havani Technologies  
**Última actualización:** Noviembre 2025  
**Revisión obligatoria:** Cada 6 meses