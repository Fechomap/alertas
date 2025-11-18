# 04 - Plan de Refactorización Completa: Migración a TypeScript

**Fecha:** 2025-11-18
**Objetivo:** Migración completa a TypeScript con arquitectura limpia y escalable
**Duración Estimada:** 3-4 semanas
**Resultado Final:** Sistema 100% mantenible, testeable y listo para futuras integraciones

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Objetivos de la Refactorización](#objetivos-de-la-refactorización)
3. [Nueva Arquitectura Propuesta](#nueva-arquitectura-propuesta)
4. [Stack Tecnológico Actualizado](#stack-tecnológico-actualizado)
5. [Configuración de Herramientas](#configuración-de-herramientas)
6. [Nueva Estructura de Directorios](#nueva-estructura-de-directorios)
7. [Plan de Migración por Fases](#plan-de-migración-por-fases)
8. [Guías de Implementación](#guías-de-implementación)
9. [Plan de Testing](#plan-de-testing)
10. [Deployment](#deployment)

---

## Resumen Ejecutivo

### ¿Por Qué Refactorizar?

**Problemas actuales del código JavaScript:**
- ❌ Sin tipos estáticos → errores en runtime
- ❌ Estado volátil en memoria → pérdida de datos al reiniciar
- ❌ Código acoplado → difícil de testear y extender
- ❌ Sin separación clara de responsabilidades
- ❌ Configuración de permisos hardcoded
- ❌ Logging inconsistente
- ❌ Sin estrategia de testing completa

**Beneficios de TypeScript + Nueva Arquitectura:**
- ✅ **Seguridad de tipos:** Errores detectados en compilación
- ✅ **Autocompletado:** Mejor experiencia de desarrollo
- ✅ **Refactoring seguro:** IDE detecta breaking changes
- ✅ **Documentación viva:** Tipos son documentación
- ✅ **Testing robusto:** Fácil mockear dependencias
- ✅ **Arquitectura escalable:** Preparada para ERP y nuevas features
- ✅ **Mantenibilidad:** Código limpio y organizado
- ✅ **Onboarding rápido:** Nuevo equipo entiende estructura fácilmente

### Alcance de la Refactorización

**✅ SE HARÁ:**
- Migración completa a TypeScript
- Implementación de Clean Architecture (Hexagonal)
- Sistema de persistencia para alertas activas
- Modelo de permisos flexible en MongoDB
- Logging estructurado con Winston
- Configuración profesional de ESLint + Prettier
- Tests unitarios e integración (80%+ coverage)
- Documentación completa con TSDoc
- Health checks y monitoreo básico
- Scripts de migración de datos

**❌ NO SE HARÁ (queda para Fase 3):**
- Integración con ERP (ver documento 05)
- Contador de servicios integrado
- Panel de administración web
- Notificaciones push
- Multi-idioma

---

## Objetivos de la Refactorización

### Objetivos Técnicos

1. **Migración a TypeScript**
   - 100% del código en `.ts`
   - Configuración estricta de TypeScript
   - Tipos personalizados para entidades de dominio

2. **Arquitectura Limpia**
   - Separación Domain / Application / Infrastructure
   - Inversión de dependencias (DI)
   - Repositorios para acceso a datos
   - Servicios de aplicación para lógica de negocio

3. **Persistencia de Estado**
   - Alertas activas en MongoDB
   - Estados de flujo en MongoDB o callbacks
   - Recuperación automática al reiniciar bot

4. **Testing Robusto**
   - Tests unitarios para servicios
   - Tests de integración para repositorios
   - Tests E2E para flujos críticos
   - Coverage mínimo: 80%

5. **Observabilidad**
   - Logging estructurado (Winston)
   - Health check endpoint
   - Métricas básicas (opcional: Prometheus)
   - Integración con Sentry (opcional)

### Objetivos de Negocio

1. **Estabilidad**
   - Sistema NO requiere reinicio manual
   - Alertas sobreviven a reinicios
   - Reportes siempre correctos (timezone)

2. **Escalabilidad**
   - Preparado para 100+ grupos simultáneos
   - Fácil agregar nuevos tipos de alerta
   - Arquitectura lista para integración ERP

3. **Mantenibilidad**
   - Código autodocumentado con tipos
   - Fácil onboarding de nuevos desarrolladores
   - Cambios localizados (bajo acoplamiento)

4. **Operación**
   - Gestión de permisos sin redeploy
   - Comandos de administración
   - Monitoreo de salud del sistema

---

## Nueva Arquitectura Propuesta

### Patrón: Clean Architecture (Hexagonal)

**Inspiración:** Uncle Bob's Clean Architecture + Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Entities (ActiveAlert, Maniobra, User, etc.)      │  │
│  │ Value Objects (AlertType, UserRole, ChatId)       │  │
│  │ Domain Services (puros, sin dependencias)         │  │
│  │ Interfaces (repositorios, puertos)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ (depende solo de domain)
                          │
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Use Cases (StartAlertUseCase, etc.)               │  │
│  │ Application Services (AlertService, etc.)         │  │
│  │ DTOs (Data Transfer Objects)                      │  │
│  │ Mappers (Entity ↔ DTO)                            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ (usa application)
                          │
┌─────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Repositories (Mongoose implementations)           │  │
│  │ External Services (Telegram, MongoDB, Redis)      │  │
│  │ Controllers (Telegram handlers)                   │  │
│  │ Config (DB, Environment, etc.)                    │  │
│  │ Utils (Logger, File helpers, etc.)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │ (orquesta todo)
                          │
┌─────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Bot Handlers (Commands, Messages, Callbacks)      │  │
│  │ Express Routes (Health checks, webhooks)          │  │
│  │ Dependency Injection Container                    │  │
│  │ Main (app.ts)                                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Principios SOLID

1. **Single Responsibility**
   - Cada clase tiene una sola razón para cambiar
   - Ejemplo: `AlertRepository` solo maneja persistencia de alertas

2. **Open/Closed**
   - Abierto para extensión, cerrado para modificación
   - Ejemplo: Agregar nuevo tipo de alerta sin modificar `AlertService`

3. **Liskov Substitution**
   - Interfaces bien definidas
   - Ejemplo: Cualquier implementación de `IAlertRepository` es intercambiable

4. **Interface Segregation**
   - Interfaces específicas, no genéricas
   - Ejemplo: `IAlertRepository` separado de `IManiobraRepository`

5. **Dependency Inversion**
   - Depender de abstracciones, no de implementaciones
   - Ejemplo: `AlertService` depende de `IAlertRepository`, no de `MongoAlertRepository`

### Flujo de Dependencias

```
┌─────────────────────────────────────────────────────┐
│ Handlers (Presentation)                             │
│   ↓ depende de                                      │
│ Use Cases / Services (Application)                  │
│   ↓ depende de                                      │
│ Interfaces de Repositorios (Domain)                 │
│   ↑ implementado por                                │
│ Repositorios concretos (Infrastructure)             │
└─────────────────────────────────────────────────────┘
```

**Clave:** Infraestructura depende de Domain, NO al revés (inversión de dependencias)

---

## Stack Tecnológico Actualizado

### Core Technologies

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 20.x LTS | Runtime |
| **TypeScript** | 5.3.x | Lenguaje principal |
| **node-telegram-bot-api** | 0.66.0 | Framework bot |
| **Express** | 4.18.x | Servidor HTTP |
| **Mongoose** | 8.1.x | ODM MongoDB |
| **MongoDB** | 6.x | Base de datos |

### Development Tools

| Tool | Versión | Propósito |
|------|---------|-----------|
| **ESLint** | 8.x | Linting |
| **Prettier** | 3.x | Formateo |
| **ts-node** | 10.x | Ejecutar TS directamente |
| **nodemon** | 3.x | Auto-reload en dev |
| **ts-node-dev** | 2.x | ts-node + nodemon |

### Testing

| Tool | Versión | Propósito |
|------|---------|-----------|
| **Jest** | 29.x | Framework de testing |
| **ts-jest** | 29.x | Jest para TypeScript |
| **@types/jest** | 29.x | Tipos para Jest |
| **supertest** | 6.x | Testing HTTP |

### Utilities

| Tool | Versión | Propósito |
|------|---------|-----------|
| **winston** | 3.x | Logging estructurado |
| **moment-timezone** | 0.5.x | Manejo de timezones |
| **joi** | 17.x | Validación de datos |
| **tsyringe** | 4.x | Dependency Injection |
| **reflect-metadata** | 0.1.x | Decoradores (DI) |

### Opcionales (Fase 3)

| Tool | Propósito |
|------|-----------|
| **@sentry/node** | Monitoreo de errores |
| **prom-client** | Métricas Prometheus |
| **ioredis** | Redis client (cache) |

---

## Configuración de Herramientas

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    // Strict mode (máxima seguridad de tipos)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Modules
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    // Output
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Paths (alias)
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@application/*": ["application/*"],
      "@infrastructure/*": ["infrastructure/*"],
      "@presentation/*": ["presentation/*"],
      "@shared/*": ["shared/*"]
    },

    // Decorators (para DI con tsyringe)
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,

    // Extra checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    // Type checking
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### ESLint (`.eslintrc.json`)

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "rules": {
    // TypeScript specific
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",

    // General
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],

    // Prettier
    "prettier/prettier": "error"
  },
  "env": {
    "node": true,
    "es2022": true
  },
  "ignorePatterns": ["dist", "node_modules", "coverage", "*.js"]
}
```

### Prettier (`.prettierrc.json`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxBracketSameLine": false
}
```

### Jest (`jest.config.ts`)

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/presentation/index.ts', // Entry point
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  verbose: true,
};

export default config;
```

### Package.json Scripts

```json
{
  "scripts": {
    // Development
    "dev": "ts-node-dev --respawn --transpile-only --exit-child src/presentation/index.ts",
    "start": "node dist/presentation/index.js",

    // Build
    "build": "tsc",
    "build:watch": "tsc --watch",
    "clean": "rm -rf dist",

    // Linting & Formatting
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "format:check": "prettier --check 'src/**/*.ts'",

    // Testing
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e",

    // Type checking
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",

    // Validation (pre-commit)
    "validate": "npm run lint && npm run type-check && npm run test",

    // Database
    "db:migrate": "ts-node scripts/migrate.ts",
    "db:seed": "ts-node scripts/seed.ts",

    // Production
    "prod": "npm run clean && npm run build && npm start"
  }
}
```

### Husky (Pre-commit Hooks)

```bash
# Instalar husky
npm install --save-dev husky lint-staged

# Inicializar
npx husky install
```

**.husky/pre-commit:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**lint-staged (.lintstagedrc.json):**
```json
{
  "*.ts": [
    "eslint --fix",
    "prettier --write",
    "jest --bail --findRelatedTests --passWithNoTests"
  ]
}
```

---

## Nueva Estructura de Directorios

```
alertas/
├── src/
│   ├── domain/                          # ⚡ CAPA DE DOMINIO
│   │   ├── entities/                    # Entidades de negocio
│   │   │   ├── active-alert.entity.ts
│   │   │   ├── maniobra.entity.ts
│   │   │   ├── user.entity.ts
│   │   │   ├── group.entity.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── value-objects/               # Value objects (inmutables)
│   │   │   ├── alert-type.vo.ts
│   │   │   ├── user-role.vo.ts
│   │   │   ├── chat-id.vo.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── repositories/                # Interfaces de repositorios
│   │   │   ├── alert.repository.ts
│   │   │   ├── maniobra.repository.ts
│   │   │   ├── user.repository.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── services/                    # Servicios de dominio
│   │   │   ├── alert-validation.service.ts
│   │   │   └── index.ts
│   │   │
│   │   └── exceptions/                  # Excepciones de dominio
│   │       ├── domain.exception.ts
│   │       ├── alert-not-found.exception.ts
│   │       └── index.ts
│   │
│   ├── application/                     # ⚙️ CAPA DE APLICACIÓN
│   │   ├── use-cases/                   # Casos de uso
│   │   │   ├── alert/
│   │   │   │   ├── start-alert.use-case.ts
│   │   │   │   ├── stop-alert.use-case.ts
│   │   │   │   ├── cancel-all-alerts.use-case.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── maniobra/
│   │   │   │   ├── register-maniobra.use-case.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── report/
│   │   │       ├── generate-weekly-report.use-case.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── services/                    # Servicios de aplicación
│   │   │   ├── alert.service.ts
│   │   │   ├── maniobra.service.ts
│   │   │   ├── report.service.ts
│   │   │   ├── permission.service.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── dtos/                        # Data Transfer Objects
│   │   │   ├── start-alert.dto.ts
│   │   │   ├── register-maniobra.dto.ts
│   │   │   └── index.ts
│   │   │
│   │   └── mappers/                     # Mappers (Entity ↔ DTO)
│   │       ├── alert.mapper.ts
│   │       ├── maniobra.mapper.ts
│   │       └── index.ts
│   │
│   ├── infrastructure/                  # 🔧 CAPA DE INFRAESTRUCTURA
│   │   ├── persistence/                 # Persistencia (MongoDB)
│   │   │   ├── models/                  # Schemas Mongoose
│   │   │   │   ├── alert.model.ts
│   │   │   │   ├── maniobra.model.ts
│   │   │   │   ├── user.model.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── repositories/            # Implementaciones
│   │   │   │   ├── mongo-alert.repository.ts
│   │   │   │   ├── mongo-maniobra.repository.ts
│   │   │   │   ├── mongo-user.repository.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── database.ts              # Conexión MongoDB
│   │   │
│   │   ├── external/                    # Servicios externos
│   │   │   ├── telegram/
│   │   │   │   ├── telegram-bot.service.ts
│   │   │   │   ├── telegram-message.sender.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── excel/
│   │   │       ├── excel-generator.service.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── schedulers/                  # Cron jobs
│   │   │   ├── weekly-report.scheduler.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── config/                      # Configuraciones
│   │   │   ├── env.config.ts
│   │   │   ├── env.validator.ts
│   │   │   └── index.ts
│   │   │
│   │   └── logging/                     # Logging
│   │       ├── winston.logger.ts
│   │       └── index.ts
│   │
│   ├── presentation/                    # 🖥️ CAPA DE PRESENTACIÓN
│   │   ├── handlers/                    # Handlers Telegram
│   │   │   ├── command.handler.ts
│   │   │   ├── message.handler.ts
│   │   │   ├── callback-query.handler.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── middlewares/                 # Middlewares
│   │   │   ├── permission.middleware.ts
│   │   │   ├── logging.middleware.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── routes/                      # Express routes
│   │   │   ├── health.route.ts
│   │   │   ├── webhook.route.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── di/                          # Dependency Injection
│   │   │   ├── container.ts
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                     # Entry point (main)
│   │
│   ├── shared/                          # 🛠️ COMPARTIDO
│   │   ├── utils/                       # Utilidades
│   │   │   ├── file.util.ts
│   │   │   ├── text.util.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── constants/                   # Constantes
│   │   │   ├── messages.constant.ts
│   │   │   ├── keyboards.constant.ts
│   │   │   └── index.ts
│   │   │
│   │   └── types/                       # Tipos compartidos
│   │       ├── telegram.types.ts
│   │       └── index.ts
│   │
│   └── __tests__/                       # 🧪 TESTS
│       ├── unit/
│       │   ├── domain/
│       │   ├── application/
│       │   └── infrastructure/
│       │
│       ├── integration/
│       │   ├── repositories/
│       │   └── services/
│       │
│       ├── e2e/
│       │   └── flows/
│       │
│       ├── fixtures/                    # Datos de prueba
│       └── setup.ts                     # Configuración Jest
│
├── scripts/                             # 📜 SCRIPTS
│   ├── migrate.ts                       # Migración de datos
│   ├── seed.ts                          # Seed de datos iniciales
│   └── migrate-users.ts                 # Migrar usuarios hardcoded
│
├── docs/                                # 📚 DOCUMENTACIÓN
│   └── bot-alertas/                     # Auditoría actual
│
├── dist/                                # 📦 BUILD (generado)
├── coverage/                            # 📊 COVERAGE (generado)
├── logs/                                # 📋 LOGS (generado)
│
├── .env.example                         # Plantilla de variables
├── .gitignore
├── .eslintrc.json
├── .prettierrc.json
├── tsconfig.json
├── jest.config.ts
├── package.json
├── package-lock.json
├── Procfile                             # Railway
└── README.md
```

**Total:** ~80-100 archivos TypeScript

---

## Plan de Migración por Fases

### FASE 1: Setup Inicial (2-3 días)

#### Día 1: Configuración Base

**✅ Tareas:**

1. **Instalar dependencias TypeScript**
   ```bash
   npm install --save-dev typescript @types/node ts-node ts-node-dev
   npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
   npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
   npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
   npm install --save-dev husky lint-staged
   ```

2. **Instalar dependencias de producción TypeScript**
   ```bash
   npm install tsyringe reflect-metadata
   npm install winston
   npm install joi
   npm install moment-timezone
   ```

3. **Crear archivos de configuración**
   - `tsconfig.json`
   - `.eslintrc.json`
   - `.prettierrc.json`
   - `jest.config.ts`

4. **Configurar Git hooks (Husky)**
   ```bash
   npx husky install
   npx husky add .husky/pre-commit "npx lint-staged"
   ```

5. **Crear estructura de carpetas vacía**
   ```bash
   mkdir -p src/{domain,application,infrastructure,presentation,shared}/__tests__
   mkdir -p src/domain/{entities,value-objects,repositories,services,exceptions}
   mkdir -p src/application/{use-cases,services,dtos,mappers}
   mkdir -p src/infrastructure/{persistence,external,schedulers,config,logging}
   mkdir -p src/presentation/{handlers,middlewares,routes,di}
   mkdir -p src/shared/{utils,constants,types}
   mkdir -p scripts logs
   ```

**Deliverable:** Setup completo de TypeScript + herramientas

---

#### Día 2-3: Migrar Tipos y Domain Layer

**✅ Tareas:**

1. **Crear Value Objects**

```typescript
// src/domain/value-objects/alert-type.vo.ts
export enum AlertType {
  CONFERENCIA = 'Conferencia',
}

export const ALERT_MESSAGES: Record<AlertType, string> = {
  [AlertType.CONFERENCIA]: '⚠️⚠️ Cabina, por favor apóyame con una conferencia. ¡Gracias! 📞',
};

export const CANCELLATION_MESSAGES: Record<AlertType, string> = {
  [AlertType.CONFERENCIA]: '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
};
```

```typescript
// src/domain/value-objects/user-role.vo.ts
export enum UserRole {
  OPERATOR = 'operator',
  ALERT_MANAGER = 'alert_manager',
  SUPER_ADMIN = 'super_admin',
}
```

```typescript
// src/domain/value-objects/chat-id.vo.ts
export class ChatId {
  private readonly value: string;

  constructor(value: string | number) {
    this.value = value.toString();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: ChatId): boolean {
    return this.value === other.value;
  }
}
```

2. **Crear Entities**

```typescript
// src/domain/entities/active-alert.entity.ts
import { AlertType } from '@domain/value-objects/alert-type.vo';
import { ChatId } from '@domain/value-objects/chat-id.vo';

export interface ActiveAlert {
  id: string;
  chatId: ChatId;
  userId: number;
  alertType: AlertType;
  message: string;
  userName: string;
  startedAt: Date;
  lastSentAt: Date;
}

export class ActiveAlertEntity implements ActiveAlert {
  constructor(
    public readonly id: string,
    public readonly chatId: ChatId,
    public readonly userId: number,
    public readonly alertType: AlertType,
    public readonly message: string,
    public readonly userName: string,
    public readonly startedAt: Date,
    public lastSentAt: Date
  ) {}

  updateLastSent(): void {
    this.lastSentAt = new Date();
  }
}
```

```typescript
// src/domain/entities/user.entity.ts
import { UserRole } from '@domain/value-objects/user-role.vo';

export interface User {
  userId: number;
  roles: UserRole[];
  addedAt: Date;
  addedBy?: number;
  isActive: boolean;
}

export class UserEntity implements User {
  constructor(
    public readonly userId: number,
    public roles: UserRole[],
    public readonly addedAt: Date,
    public readonly addedBy: number | undefined,
    public isActive: boolean
  ) {}

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  addRole(role: UserRole): void {
    if (!this.hasRole(role)) {
      this.roles.push(role);
    }
  }

  removeRole(role: UserRole): void {
    this.roles = this.roles.filter((r) => r !== role);
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }
}
```

```typescript
// src/domain/entities/maniobra.entity.ts
import { ChatId } from '@domain/value-objects/chat-id.vo';

export interface Maniobra {
  id?: string;
  chatId: ChatId;
  groupName: string;
  alertManagerId: number;
  cantidad: number;
  descripcion: string;
  fecha: Date;
}

export class ManiobraEntity implements Maniobra {
  constructor(
    public id: string | undefined,
    public readonly chatId: ChatId,
    public readonly groupName: string,
    public readonly alertManagerId: number,
    public readonly cantidad: number,
    public readonly descripcion: string,
    public readonly fecha: Date
  ) {
    if (cantidad < 1 || cantidad > 10) {
      throw new Error('Cantidad de maniobras debe estar entre 1 y 10');
    }
  }
}
```

3. **Crear Repository Interfaces**

```typescript
// src/domain/repositories/alert.repository.ts
import { ActiveAlert } from '@domain/entities/active-alert.entity';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { AlertType } from '@domain/value-objects/alert-type.vo';

export interface IAlertRepository {
  save(alert: ActiveAlert): Promise<void>;
  findById(id: string): Promise<ActiveAlert | null>;
  findByChatId(chatId: ChatId): Promise<ActiveAlert[]>;
  findByUserIdAndType(userId: number, chatId: ChatId, alertType: AlertType): Promise<ActiveAlert | null>;
  deleteById(id: string): Promise<void>;
  deleteAllForChat(chatId: ChatId): Promise<void>;
  updateLastSent(id: string): Promise<void>;
}
```

```typescript
// src/domain/repositories/user.repository.ts
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/value-objects/user-role.vo';

export interface IUserRepository {
  save(user: User): Promise<void>;
  findByUserId(userId: number): Promise<User | null>;
  hasRole(userId: number, role: UserRole): Promise<boolean>;
  addRole(userId: number, role: UserRole): Promise<void>;
  removeRole(userId: number, role: UserRole): Promise<void>;
  findAll(): Promise<User[]>;
}
```

4. **Crear Excepciones de Dominio**

```typescript
// src/domain/exceptions/domain.exception.ts
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

// src/domain/exceptions/alert-not-found.exception.ts
export class AlertNotFoundException extends DomainException {
  constructor(alertId: string) {
    super(`Alert with ID ${alertId} not found`);
    this.name = 'AlertNotFoundException';
  }
}

// src/domain/exceptions/user-not-authorized.exception.ts
export class UserNotAuthorizedException extends DomainException {
  constructor(userId: number, requiredRole: string) {
    super(`User ${userId} does not have role ${requiredRole}`);
    this.name = 'UserNotAuthorizedException';
  }
}
```

**Deliverable:** Domain layer completo con tipos, entidades e interfaces

---

### FASE 2: Infrastructure Layer (5-7 días)

#### Día 4-5: Persistencia (MongoDB)

**✅ Tareas:**

1. **Crear Modelos Mongoose**

```typescript
// src/infrastructure/persistence/models/alert.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertDocument extends Document {
  chatId: string;
  userId: number;
  alertType: string;
  message: string;
  userName: string;
  startedAt: Date;
  lastSentAt: Date;
}

const AlertSchema = new Schema<IAlertDocument>({
  chatId: { type: String, required: true, index: true },
  userId: { type: Number, required: true },
  alertType: { type: String, required: true },
  message: { type: String, required: true },
  userName: { type: String, required: true },
  startedAt: { type: Date, required: true, default: Date.now },
  lastSentAt: { type: Date, required: true, default: Date.now },
});

AlertSchema.index({ chatId: 1, userId: 1, alertType: 1 }, { unique: true });

export const AlertModel = mongoose.model<IAlertDocument>('ActiveAlert', AlertSchema);
```

```typescript
// src/infrastructure/persistence/models/user.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  userId: number;
  roles: string[];
  addedAt: Date;
  addedBy?: number;
  isActive: boolean;
}

const UserSchema = new Schema<IUserDocument>({
  userId: { type: Number, required: true, unique: true, index: true },
  roles: [{ type: String, enum: ['operator', 'alert_manager', 'super_admin'], required: true }],
  addedAt: { type: Date, required: true, default: Date.now },
  addedBy: { type: Number },
  isActive: { type: Boolean, default: true },
});

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
```

2. **Implementar Repositorios**

```typescript
// src/infrastructure/persistence/repositories/mongo-alert.repository.ts
import { injectable } from 'tsyringe';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { ActiveAlert, ActiveAlertEntity } from '@domain/entities/active-alert.entity';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { AlertType } from '@domain/value-objects/alert-type.vo';
import { AlertModel } from '@infrastructure/persistence/models/alert.model';

@injectable()
export class MongoAlertRepository implements IAlertRepository {
  async save(alert: ActiveAlert): Promise<void> {
    await AlertModel.findOneAndUpdate(
      {
        chatId: alert.chatId.getValue(),
        userId: alert.userId,
        alertType: alert.alertType,
      },
      {
        chatId: alert.chatId.getValue(),
        userId: alert.userId,
        alertType: alert.alertType,
        message: alert.message,
        userName: alert.userName,
        startedAt: alert.startedAt,
        lastSentAt: alert.lastSentAt,
      },
      { upsert: true, new: true }
    );
  }

  async findById(id: string): Promise<ActiveAlert | null> {
    const doc = await AlertModel.findById(id);
    if (!doc) {
      return null;
    }
    return this.mapToEntity(doc);
  }

  async findByChatId(chatId: ChatId): Promise<ActiveAlert[]> {
    const docs = await AlertModel.find({ chatId: chatId.getValue() });
    return docs.map((doc) => this.mapToEntity(doc));
  }

  async findByUserIdAndType(
    userId: number,
    chatId: ChatId,
    alertType: AlertType
  ): Promise<ActiveAlert | null> {
    const doc = await AlertModel.findOne({
      userId,
      chatId: chatId.getValue(),
      alertType,
    });
    if (!doc) {
      return null;
    }
    return this.mapToEntity(doc);
  }

  async deleteById(id: string): Promise<void> {
    await AlertModel.findByIdAndDelete(id);
  }

  async deleteAllForChat(chatId: ChatId): Promise<void> {
    await AlertModel.deleteMany({ chatId: chatId.getValue() });
  }

  async updateLastSent(id: string): Promise<void> {
    await AlertModel.findByIdAndUpdate(id, { lastSentAt: new Date() });
  }

  private mapToEntity(doc: any): ActiveAlert {
    return new ActiveAlertEntity(
      doc._id.toString(),
      new ChatId(doc.chatId),
      doc.userId,
      doc.alertType as AlertType,
      doc.message,
      doc.userName,
      doc.startedAt,
      doc.lastSentAt
    );
  }
}
```

3. **Configurar Database**

```typescript
// src/infrastructure/persistence/database.ts
import mongoose from 'mongoose';
import { injectable } from 'tsyringe';
import { LoggerService } from '@infrastructure/logging/winston.logger';

@injectable()
export class Database {
  constructor(private logger: LoggerService) {}

  async connect(uri: string): Promise<void> {
    try {
      await mongoose.connect(uri, {
        // Opciones recomendadas
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.logger.info('MongoDB connected successfully');

      // Event listeners
      mongoose.connection.on('error', (error) => {
        this.logger.error('MongoDB error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected');
      });

    } catch (error) {
      this.logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    this.logger.info('MongoDB disconnected');
  }

  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }
}
```

**Deliverable:** Persistencia completa en MongoDB

---

#### Día 6-7: External Services

**✅ Tareas:**

1. **Crear Logger Service**

```typescript
// src/infrastructure/logging/winston.logger.ts
import winston from 'winston';
import { injectable } from 'tsyringe';

@injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
            })
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],
    });
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }
}
```

2. **Telegram Service**

```typescript
// src/infrastructure/external/telegram/telegram-bot.service.ts
import TelegramBot from 'node-telegram-bot-api';
import { injectable } from 'tsyringe';
import { LoggerService } from '@infrastructure/logging/winston.logger';

@injectable()
export class TelegramBotService {
  private bot: TelegramBot;

  constructor(private logger: LoggerService) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      this.bot = new TelegramBot(token, { webHook: true });
      this.setupWebhook();
    } else {
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.info('Telegram bot initialized with POLLING mode');
    }

    this.setupErrorHandlers();
  }

  private setupWebhook(): void {
    const url = process.env.PUBLIC_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN;
    if (!url) {
      throw new Error('PUBLIC_DOMAIN or RAILWAY_PUBLIC_DOMAIN required for webhook');
    }

    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const webhookPath = `/bot${token}`;
    const fullUrl = `https://${url}${webhookPath}`;

    this.bot.setWebHook(fullUrl).then(() => {
      this.logger.info(`Telegram webhook set to: ${fullUrl}`);
    });
  }

  private setupErrorHandlers(): void {
    this.bot.on('polling_error', (error) => {
      this.logger.error('Telegram polling error:', error);
    });

    this.bot.on('webhook_error', (error) => {
      this.logger.error('Telegram webhook error:', error);
    });
  }

  getBot(): TelegramBot {
    return this.bot;
  }

  async sendMessage(chatId: string | number, text: string, options?: any): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text, options);
    } catch (error) {
      this.logger.error(`Failed to send message to chat ${chatId}:`, error);
      throw error;
    }
  }

  async sendDocument(chatId: string | number, filePath: string, options?: any): Promise<void> {
    try {
      await this.bot.sendDocument(chatId, filePath, options);
    } catch (error) {
      this.logger.error(`Failed to send document to chat ${chatId}:`, error);
      throw error;
    }
  }
}
```

3. **Excel Generator Service**

```typescript
// src/infrastructure/external/excel/excel-generator.service.ts
import XLSX from 'xlsx';
import { injectable } from 'tsyringe';
import moment from 'moment-timezone';
import { ManiobraEntity } from '@domain/entities/maniobra.entity';

@injectable()
export class ExcelGeneratorService {
  generate(maniobras: ManiobraEntity[]): Buffer {
    const maniobraData = maniobras.map((m) => {
      const fechaMX = moment(m.fecha).tz('America/Mexico_City');

      return {
        'ID del Grupo': m.chatId.getValue(),
        'Nombre del Grupo': m.groupName,
        'ID del Alert Manager': m.alertManagerId,
        'Cantidad de Maniobras': m.cantidad,
        'Descripción': m.descripcion,
        'Fecha': m.fecha,
        'Fecha Texto': fechaMX.format('DD/MM/YYYY hh:mm A'),
      };
    });

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const wsManiobras = XLSX.utils.json_to_sheet(maniobraData);
    XLSX.utils.book_append_sheet(wb, wsManiobras, 'Maniobras');

    // Crear hoja de grupos
    const uniqueGroups = new Map<string, string>();
    maniobras.forEach((m) => {
      uniqueGroups.set(m.chatId.getValue(), m.groupName);
    });

    const groupsData = Array.from(uniqueGroups.entries()).map(([chatId, groupName]) => ({
      'ID del Grupo': chatId,
      'Nombre para Mostrar': groupName,
    }));

    const wsGroups = XLSX.utils.json_to_sheet(groupsData);
    XLSX.utils.book_append_sheet(wb, wsGroups, 'Grupos');

    // Generar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }
}
```

**Deliverable:** Servicios externos listos (Telegram, Excel, Logger)

---

### FASE 3: Application Layer (4-5 días)

#### Día 8-10: Use Cases y Services

**✅ Tareas:**

1. **Crear DTOs**

```typescript
// src/application/dtos/start-alert.dto.ts
import { AlertType } from '@domain/value-objects/alert-type.vo';

export interface StartAlertDTO {
  chatId: string;
  userId: number;
  userName: string;
  alertType: AlertType;
}
```

2. **Crear Use Cases**

```typescript
// src/application/use-cases/alert/start-alert.use-case.ts
import { injectable, inject } from 'tsyringe';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { ActiveAlertEntity } from '@domain/entities/active-alert.entity';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { ALERT_MESSAGES } from '@domain/value-objects/alert-type.vo';
import { StartAlertDTO } from '@application/dtos/start-alert.dto';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class StartAlertUseCase {
  constructor(
    @inject('IAlertRepository') private alertRepo: IAlertRepository,
    @inject(LoggerService) private logger: LoggerService
  ) {}

  async execute(dto: StartAlertDTO): Promise<ActiveAlertEntity> {
    const chatId = new ChatId(dto.chatId);

    // Verificar si ya existe alerta activa
    const existingAlert = await this.alertRepo.findByUserIdAndType(
      dto.userId,
      chatId,
      dto.alertType
    );

    if (existingAlert) {
      this.logger.warn(`Alert already exists for user ${dto.userId} in chat ${dto.chatId}`);
      return existingAlert as ActiveAlertEntity;
    }

    // Verificar límite de 2 alertas por usuario
    const userAlerts = await this.alertRepo.findByChatId(chatId);
    const userActiveCount = userAlerts.filter((a) => a.userId === dto.userId).length;

    if (userActiveCount >= 2) {
      throw new Error(`User ${dto.userId} already has 2 active alerts`);
    }

    // Crear nueva alerta
    const alert = new ActiveAlertEntity(
      uuidv4(),
      chatId,
      dto.userId,
      dto.alertType,
      ALERT_MESSAGES[dto.alertType],
      dto.userName,
      new Date(),
      new Date()
    );

    await this.alertRepo.save(alert);

    this.logger.info(`Alert started: ${dto.alertType} by user ${dto.userId} in chat ${dto.chatId}`);

    return alert;
  }
}
```

3. **Crear Application Services**

```typescript
// src/application/services/alert.service.ts
import { injectable, inject } from 'tsyringe';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { TelegramBotService } from '@infrastructure/external/telegram/telegram-bot.service';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { AlertType } from '@domain/value-objects/alert-type.vo';
import { CANCELLATION_MESSAGES } from '@domain/value-objects/alert-type.vo';

@injectable()
export class AlertService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    @inject('IAlertRepository') private alertRepo: IAlertRepository,
    @inject(TelegramBotService) private telegram: TelegramBotService,
    @inject(LoggerService) private logger: LoggerService
  ) {}

  async startAlertInterval(alertId: string): Promise<void> {
    const alert = await this.alertRepo.findById(alertId);
    if (!alert) {
      this.logger.error(`Cannot start interval: Alert ${alertId} not found`);
      return;
    }

    // Enviar mensaje inicial
    await this.telegram.sendMessage(alert.chatId.getValue(), alert.message, {
      parse_mode: 'Markdown',
    });

    // Crear intervalo de 20 segundos
    const intervalId = setInterval(async () => {
      try {
        await this.telegram.sendMessage(alert.chatId.getValue(), alert.message, {
          parse_mode: 'Markdown',
        });
        await this.alertRepo.updateLastSent(alertId);
      } catch (error) {
        this.logger.error(`Error sending alert message for ${alertId}:`, error);
        await this.stopAlertInterval(alertId);
      }
    }, 20000);

    this.intervals.set(alertId, intervalId);
    this.logger.info(`Alert interval started for ${alertId}`);
  }

  async stopAlertInterval(alertId: string): Promise<void> {
    const intervalId = this.intervals.get(alertId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(alertId);
      this.logger.info(`Alert interval stopped for ${alertId}`);
    }

    await this.alertRepo.deleteById(alertId);
  }

  async cancelAllAlertsOfType(chatId: ChatId, alertType: AlertType): Promise<number> {
    const alerts = await this.alertRepo.findByChatId(chatId);
    const alertsToCancel = alerts.filter((a) => a.alertType === alertType);

    for (const alert of alertsToCancel) {
      await this.stopAlertInterval(alert.id);
    }

    if (alertsToCancel.length > 0) {
      const message =
        CANCELLATION_MESSAGES[alertType] +
        (alertsToCancel.length > 1 ? `\n\n_(${alertsToCancel.length} alertas canceladas)_` : '');

      await this.telegram.sendMessage(chatId.getValue(), message, {
        parse_mode: 'Markdown',
      });
    }

    return alertsToCancel.length;
  }

  async recoverAllAlerts(): Promise<void> {
    // Al iniciar bot, recuperar alertas de MongoDB y recrear intervals
    this.logger.info('Recovering active alerts from database...');

    const allAlerts = await this.alertRepo.findByChatId(new ChatId('')); // Obtener todas
    // TODO: Implementar findAll() en repo

    for (const alert of allAlerts) {
      await this.startAlertInterval(alert.id);
    }

    this.logger.info(`Recovered ${allAlerts.length} active alerts`);
  }
}
```

**Deliverable:** Use cases y servicios de aplicación completos

---

#### Día 11-12: Permission Service

**✅ Tareas:**

```typescript
// src/application/services/permission.service.ts
import { injectable, inject } from 'tsyringe';
import { IUserRepository } from '@domain/repositories/user.repository';
import { UserRole } from '@domain/value-objects/user-role.vo';
import { UserNotAuthorizedException } from '@domain/exceptions/user-not-authorized.exception';

@injectable()
export class PermissionService {
  constructor(@inject('IUserRepository') private userRepo: IUserRepository) {}

  async isOperator(userId: number): Promise<boolean> {
    return await this.userRepo.hasRole(userId, UserRole.OPERATOR);
  }

  async isAlertManager(userId: number): Promise<boolean> {
    return await this.userRepo.hasRole(userId, UserRole.ALERT_MANAGER);
  }

  async isSuperAdmin(userId: number): Promise<boolean> {
    return await this.userRepo.hasRole(userId, UserRole.SUPER_ADMIN);
  }

  async requireOperator(userId: number): Promise<void> {
    const hasRole = await this.isOperator(userId);
    if (!hasRole) {
      throw new UserNotAuthorizedException(userId, UserRole.OPERATOR);
    }
  }

  async requireAlertManager(userId: number): Promise<void> {
    const hasRole = await this.isAlertManager(userId);
    if (!hasRole) {
      throw new UserNotAuthorizedException(userId, UserRole.ALERT_MANAGER);
    }
  }

  async requireSuperAdmin(userId: number): Promise<void> {
    const hasRole = await this.isSuperAdmin(userId);
    if (!hasRole) {
      throw new UserNotAuthorizedException(userId, UserRole.SUPER_ADMIN);
    }
  }
}
```

**Deliverable:** Sistema de permisos flexible

---

### FASE 4: Presentation Layer (3-4 días)

#### Día 13-14: Dependency Injection + Handlers

**✅ Tareas:**

1. **Configurar DI Container**

```typescript
// src/presentation/di/container.ts
import 'reflect-metadata';
import { container } from 'tsyringe';

// Infrastructure
import { Database } from '@infrastructure/persistence/database';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { TelegramBotService } from '@infrastructure/external/telegram/telegram-bot.service';
import { ExcelGeneratorService } from '@infrastructure/external/excel/excel-generator.service';

// Repositories
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { IUserRepository } from '@domain/repositories/user.repository';
import { IManiobraRepository } from '@domain/repositories/maniobra.repository';
import { MongoAlertRepository } from '@infrastructure/persistence/repositories/mongo-alert.repository';
import { MongoUserRepository } from '@infrastructure/persistence/repositories/mongo-user.repository';
import { MongoManiobraRepository } from '@infrastructure/persistence/repositories/mongo-maniobra.repository';

// Services
import { AlertService } from '@application/services/alert.service';
import { PermissionService } from '@application/services/permission.service';
import { ReportService } from '@application/services/report.service';

// Use Cases
import { StartAlertUseCase } from '@application/use-cases/alert/start-alert.use-case';
import { StopAlertUseCase } from '@application/use-cases/alert/stop-alert.use-case';

export function setupDependencyInjection(): void {
  // Singletons
  container.registerSingleton(LoggerService);
  container.registerSingleton(Database);
  container.registerSingleton(TelegramBotService);
  container.registerSingleton(ExcelGeneratorService);

  // Repositories (interfaces)
  container.register<IAlertRepository>('IAlertRepository', {
    useClass: MongoAlertRepository,
  });

  container.register<IUserRepository>('IUserRepository', {
    useClass: MongoUserRepository,
  });

  container.register<IManiobraRepository>('IManiobraRepository', {
    useClass: MongoManiobraRepository,
  });

  // Services
  container.registerSingleton(AlertService);
  container.registerSingleton(PermissionService);
  container.registerSingleton(ReportService);

  // Use Cases
  container.registerSingleton(StartAlertUseCase);
  container.registerSingleton(StopAlertUseCase);
}
```

2. **Crear Handlers**

```typescript
// src/presentation/handlers/command.handler.ts
import { injectable, inject } from 'tsyringe';
import TelegramBot from 'node-telegram-bot-api';
import { PermissionService } from '@application/services/permission.service';
import { AlertService } from '@application/services/alert.service';
import { ReportService } from '@application/services/report.service';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { LoggerService } from '@infrastructure/logging/winston.logger';

@injectable()
export class CommandHandler {
  constructor(
    @inject(PermissionService) private permissionService: PermissionService,
    @inject(AlertService) private alertService: AlertService,
    @inject(ReportService) private reportService: ReportService,
    @inject(LoggerService) private logger: LoggerService
  ) {}

  setupHandlers(bot: TelegramBot): void {
    bot.onText(/\/start/, (msg) => this.handleStart(bot, msg));
    bot.onText(/\/help/, (msg) => this.handleHelp(bot, msg));
    bot.onText(/\/stopalert/, (msg) => this.handleStopAlert(bot, msg));
    bot.onText(/\/report/, (msg) => this.handleReport(bot, msg));
    bot.onText(/\/testreport/, (msg) => this.handleTestReport(bot, msg));
  }

  private async handleStart(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    this.logger.info(`/start command received from chat ${chatId}`);

    await bot.sendMessage(chatId, '🟢 Bot activado. Usa los botones de abajo para comenzar.', {
      reply_markup: this.getPersistentKeyboard(),
    });
  }

  private async handleStopAlert(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;

    try {
      await this.permissionService.requireAlertManager(userId);

      const canceled = await this.alertService.cancelAllAlertsOfType(
        new ChatId(chatId),
        /* AlertType.CONFERENCIA */
      );

      if (canceled === 0) {
        await bot.sendMessage(chatId, 'ℹ️ No hay alertas activas en este chat.');
      }
    } catch (error: any) {
      this.logger.error(`Error in /stopalert:`, error);
      await bot.sendMessage(chatId, '⛔ No tienes permisos para este comando.');
    }
  }

  private async handleReport(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from!.id;

    try {
      await this.permissionService.requireAlertManager(userId);

      await this.reportService.generateAndSendWeeklyReport(new ChatId(chatId));

      this.logger.info(`Weekly report sent to chat ${chatId}`);
    } catch (error: any) {
      this.logger.error(`Error in /report:`, error);
      await bot.sendMessage(chatId, '❌ Error al generar reporte.');
    }
  }

  private getPersistentKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [[{ text: '📞 CONFERENCIA' }, { text: '🚗 MANIOBRAS' }]],
      resize_keyboard: true,
      persistent: true,
      one_time_keyboard: false,
    };
  }

  // ... otros handlers
}
```

**Deliverable:** Handlers completos con DI

---

#### Día 15-16: Entry Point + Express Routes

**✅ Tareas:**

```typescript
// src/presentation/index.ts
import 'reflect-metadata';
import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import { container } from 'tsyringe';
import { setupDependencyInjection } from './di/container';
import { Database } from '@infrastructure/persistence/database';
import { TelegramBotService } from '@infrastructure/external/telegram/telegram-bot.service';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { CommandHandler } from './handlers/command.handler';
import { MessageHandler } from './handlers/message.handler';
import { AlertService } from '@application/services/alert.service';
import { validateEnv } from '@infrastructure/config/env.validator';

// Load environment variables
dotenv.config();

// Validate environment
validateEnv();

// Setup DI
setupDependencyInjection();

async function bootstrap(): Promise<void> {
  const logger = container.resolve(LoggerService);

  try {
    logger.info('Starting bot application...');

    // Connect to database
    const database = container.resolve(Database);
    await database.connect(process.env.MONGO_URI!);

    // Initialize Telegram bot
    const telegramService = container.resolve(TelegramBotService);
    const bot = telegramService.getBot();

    // Setup handlers
    const commandHandler = container.resolve(CommandHandler);
    const messageHandler = container.resolve(MessageHandler);
    commandHandler.setupHandlers(bot);
    messageHandler.setupHandlers(bot);

    // Recover active alerts
    const alertService = container.resolve(AlertService);
    await alertService.recoverAllAlerts();

    // Setup Express server
    const app = express();
    app.use(bodyParser.json());

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        mongodb: database.isConnected() ? 'connected' : 'disconnected',
      });
    });

    // Webhook endpoint
    if (process.env.NODE_ENV === 'production') {
      const token = process.env.TELEGRAM_BOT_TOKEN!;
      app.post(`/bot${token}`, (req, res) => {
        bot.processUpdate(req.body);
        res.sendStatus(200);
      });
    }

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info('Bot ready to receive messages');
    });

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
```

**Deliverable:** Aplicación completa lista para ejecutar

---

### FASE 5: Testing (3-4 días)

#### Día 17-19: Unit Tests

**✅ Tareas:**

```typescript
// src/__tests__/unit/application/use-cases/start-alert.use-case.test.ts
import 'reflect-metadata';
import { StartAlertUseCase } from '@application/use-cases/alert/start-alert.use-case';
import { IAlertRepository } from '@domain/repositories/alert.repository';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { AlertType } from '@domain/value-objects/alert-type.vo';

describe('StartAlertUseCase', () => {
  let useCase: StartAlertUseCase;
  let mockAlertRepo: jest.Mocked<IAlertRepository>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    mockAlertRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByChatId: jest.fn(),
      findByUserIdAndType: jest.fn(),
      deleteById: jest.fn(),
      deleteAllForChat: jest.fn(),
      updateLastSent: jest.fn(),
    };

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      http: jest.fn(),
    } as any;

    useCase = new StartAlertUseCase(mockAlertRepo, mockLogger);
  });

  it('should create new alert when no existing alert', async () => {
    mockAlertRepo.findByUserIdAndType.mockResolvedValue(null);
    mockAlertRepo.findByChatId.mockResolvedValue([]);

    const dto = {
      chatId: '-100123456',
      userId: 123456,
      userName: 'Test User',
      alertType: AlertType.CONFERENCIA,
    };

    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(result.userId).toBe(dto.userId);
    expect(result.alertType).toBe(dto.alertType);
    expect(mockAlertRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error when user has 2 active alerts', async () => {
    mockAlertRepo.findByUserIdAndType.mockResolvedValue(null);
    mockAlertRepo.findByChatId.mockResolvedValue([
      { userId: 123456 } as any,
      { userId: 123456 } as any,
    ]);

    const dto = {
      chatId: '-100123456',
      userId: 123456,
      userName: 'Test User',
      alertType: AlertType.CONFERENCIA,
    };

    await expect(useCase.execute(dto)).rejects.toThrow('already has 2 active alerts');
  });

  it('should return existing alert if already exists', async () => {
    const existingAlert = {
      id: 'alert-1',
      userId: 123456,
      alertType: AlertType.CONFERENCIA,
    };
    mockAlertRepo.findByUserIdAndType.mockResolvedValue(existingAlert as any);

    const dto = {
      chatId: '-100123456',
      userId: 123456,
      userName: 'Test User',
      alertType: AlertType.CONFERENCIA,
    };

    const result = await useCase.execute(dto);

    expect(result).toBe(existingAlert);
    expect(mockAlertRepo.save).not.toHaveBeenCalled();
  });
});
```

**Deliverable:** Tests unitarios completos

---

#### Día 20: Integration + E2E Tests

**✅ Tareas:**

```typescript
// src/__tests__/integration/repositories/mongo-alert.repository.test.ts
import 'reflect-metadata';
import mongoose from 'mongoose';
import { MongoAlertRepository } from '@infrastructure/persistence/repositories/mongo-alert.repository';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { AlertType } from '@domain/value-objects/alert-type.vo';
import { ActiveAlertEntity } from '@domain/entities/active-alert.entity';

describe('MongoAlertRepository (Integration)', () => {
  let repository: MongoAlertRepository;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/alertas-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    repository = new MongoAlertRepository();
  });

  it('should save and retrieve alert', async () => {
    const alert = new ActiveAlertEntity(
      'alert-1',
      new ChatId('-100123456'),
      123456,
      AlertType.CONFERENCIA,
      'Test message',
      'Test User',
      new Date(),
      new Date()
    );

    await repository.save(alert);

    const retrieved = await repository.findById('alert-1');

    expect(retrieved).toBeDefined();
    expect(retrieved!.userId).toBe(123456);
    expect(retrieved!.alertType).toBe(AlertType.CONFERENCIA);
  });

  // ... más tests
});
```

**Deliverable:** Tests de integración y E2E

---

### FASE 6: Documentation + Migration (2-3 días)

#### Día 21-22: Documentation

**✅ Tareas:**

1. **TSDoc en todas las funciones públicas**
2. **README.md actualizado**
3. **CHANGELOG.md**
4. **API Documentation** (opcional: TypeDoc)

#### Día 23: Data Migration

**✅ Tareas:**

```typescript
// scripts/migrate-users.ts
import 'reflect-metadata';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserModel } from '@infrastructure/persistence/models/user.model';
import { UserRole } from '@domain/value-objects/user-role.vo';

dotenv.config();

const HARDCODED_OPERATORS = [7143094298, 7754458578, 7509818905, 8048487029, 7241170867];

const HARDCODED_MANAGERS = [7143094298, 1022124142, 7758965062, 5660087041, 6330970125];

const SUPER_ADMIN_ID = 7143094298;

async function migrateUsers(): Promise<void> {
  await mongoose.connect(process.env.MONGO_URI!);

  console.log('Migrating users from hardcoded IDs...');

  // Migrar operadores
  for (const userId of HARDCODED_OPERATORS) {
    const existing = await UserModel.findOne({ userId });
    if (!existing) {
      await UserModel.create({
        userId,
        roles: [UserRole.OPERATOR],
        addedAt: new Date(),
        isActive: true,
      });
      console.log(`✅ Created operator: ${userId}`);
    }
  }

  // Migrar managers
  for (const userId of HARDCODED_MANAGERS) {
    const existing = await UserModel.findOne({ userId });
    if (existing) {
      if (!existing.roles.includes(UserRole.ALERT_MANAGER)) {
        existing.roles.push(UserRole.ALERT_MANAGER);
        await existing.save();
        console.log(`✅ Added alert_manager role to: ${userId}`);
      }
    } else {
      await UserModel.create({
        userId,
        roles: [UserRole.ALERT_MANAGER],
        addedAt: new Date(),
        isActive: true,
      });
      console.log(`✅ Created alert manager: ${userId}`);
    }
  }

  // Migrar super admin
  const superAdmin = await UserModel.findOne({ userId: SUPER_ADMIN_ID });
  if (superAdmin) {
    if (!superAdmin.roles.includes(UserRole.SUPER_ADMIN)) {
      superAdmin.roles.push(UserRole.SUPER_ADMIN);
      await superAdmin.save();
      console.log(`✅ Added super_admin role to: ${SUPER_ADMIN_ID}`);
    }
  }

  console.log('✅ User migration complete');

  await mongoose.disconnect();
}

migrateUsers().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
```

**Deliverable:** Scripts de migración y documentación completa

---

## Plan de Testing

### Cobertura Objetivo

| Capa | Coverage Target | Prioridad |
|------|-----------------|-----------|
| Domain | 100% | Alta |
| Application | 90%+ | Alta |
| Infrastructure | 70%+ | Media |
| Presentation | 60%+ | Baja |

### Estrategia de Testing

1. **Unit Tests**
   - Todos los use cases
   - Todos los servicios de aplicación
   - Entidades de dominio
   - Value objects

2. **Integration Tests**
   - Repositorios con MongoDB real (en memoria)
   - Servicios externos con mocks

3. **E2E Tests**
   - Flujo completo de inicio de alerta
   - Flujo completo de registro de maniobra
   - Generación de reporte

---

## Deployment

### Pre-deployment Checklist

```
□ npm run validate (lint + type-check + test)
□ npm run build
□ Verificar variables de entorno en Railway
□ Ejecutar scripts de migración
□ Backup de base de datos
□ Documentación actualizada
□ CHANGELOG actualizado
```

### Deployment a Railway

```bash
# 1. Build
npm run build

# 2. Verificar dist/
ls -la dist/

# 3. Push a git
git add .
git commit -m "refactor: complete migration to TypeScript"
git push origin feat/typescript-refactor-complete

# 4. Railway auto-deploy

# 5. Verificar health check
curl https://tu-dominio.railway.app/health
```

### Rollback Plan

Si hay problemas críticos:

```bash
# Opción 1: Revertir a JavaScript
git checkout main  # Rama con hotfixes aplicados
railway up

# Opción 2: Fix forward
git checkout feat/typescript-refactor-complete
# Aplicar fix
git commit -m "hotfix: ..."
git push
```

---

## Cronograma Completo

| Fase | Duración | Días | Descripción |
|------|----------|------|-------------|
| **Fase 1** | 2-3 días | 1-3 | Setup TypeScript + Domain |
| **Fase 2** | 5-7 días | 4-10 | Infrastructure |
| **Fase 3** | 4-5 días | 11-15 | Application |
| **Fase 4** | 3-4 días | 13-16 | Presentation |
| **Fase 5** | 3-4 días | 17-20 | Testing |
| **Fase 6** | 2-3 días | 21-23 | Docs + Migration |

**Total:** 19-26 días (~4-5 semanas)

---

## Resumen

Esta refactorización convierte el sistema en:

✅ **100% TypeScript** con configuración estricta
✅ **Clean Architecture** con capas bien definidas
✅ **Estado persistente** en MongoDB
✅ **Sistema de permisos flexible** en BD
✅ **Logging estructurado** con Winston
✅ **80%+ test coverage**
✅ **Herramientas profesionales** (ESLint, Prettier, Husky)
✅ **Fácil de mantener** y extender
✅ **Listo para integraciones** futuras (ERP)

**Siguiente:** Ver documento **05-recomendaciones-arquitectura-futuro.md** para integraciones con ERP y features futuras.

---

**Fin del Documento 04**
