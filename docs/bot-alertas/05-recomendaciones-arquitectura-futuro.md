# 05 - Recomendaciones de Arquitectura Futura

**Fecha:** 2025-11-18
**Objetivo:** Diseñar integraciones futuras con ERP y contador de servicios
**Contexto:** Después de refactorización TypeScript completa

---

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Integración con ERP vía API](#integración-con-erp-vía-api)
3. [Contador de Servicios Integrado](#contador-de-servicios-integrado)
4. [Otras Integraciones Futuras](#otras-integraciones-futuras)
5. [Arquitectura de Microservicios (Opcional)](#arquitectura-de-microservicios-opcional)
6. [Roadmap de Features](#roadmap-de-features)
7. [Consideraciones de Seguridad](#consideraciones-de-seguridad)
8. [Escalabilidad y Performance](#escalabilidad-y-performance)

---

## Visión General

### Estado Actual (Post-Refactorización)

Después de la refactorización completa a TypeScript, el sistema tendrá:

✅ **Arquitectura limpia** (Domain / Application / Infrastructure)
✅ **Inversión de dependencias** (fácil agregar nuevas integraciones)
✅ **Interfaces bien definidas** (Ports & Adapters)
✅ **Estado persistente** en MongoDB
✅ **Logging y monitoreo** básico

### Visión Futura (Fase 3+)

El sistema evolucionará para convertirse en una **plataforma integrada de operaciones**:

```
┌─────────────────────────────────────────────────────────┐
│              BOT DE ALERTAS (Core)                      │
│  - Alertas periódicas                                   │
│  - Registro de maniobras                                │
│  - Reportes automáticos                                 │
│  - Gestión de permisos                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────────┐
│     ERP      │      │ CONTADOR DE      │
│  (API REST)  │      │   SERVICIOS      │
│              │      │  (Integrado)     │
│ - Servicios  │      │                  │
│ - Alertas    │      │ - Conteo manual  │
│ - Usuarios   │      │ - Estadísticas   │
│ - Reportes   │      │ - Histórico      │
└──────────────┘      └──────────────────┘
```

### Principio Clave: Modularidad

Cada integración debe ser:
- **Opcional:** Sistema funciona sin ella
- **Pluggable:** Se activa con feature flag
- **Independiente:** No afecta otras integraciones
- **Testeable:** Tests de integración completos

---

## Integración con ERP vía API

### Objetivo

Permitir que el ERP:
1. **Envíe servicios** automáticamente al bot para generar alertas
2. **Consulte maniobras** registradas en el bot
3. **Sincronice usuarios** y permisos
4. **Reciba reportes** automáticos

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────┐
│               ERP System                    │
│  (Sistema externo, REST API)                │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
                   │ Authentication: API Key
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Bot Alertas - API Gateway           │
│  (Express.js routes)                        │
│                                             │
│  POST   /api/v1/services        (crear)     │
│  GET    /api/v1/maniobras       (listar)    │
│  POST   /api/v1/users           (sync)      │
│  GET    /api/v1/reports/weekly  (obtener)   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       Application Layer (Use Cases)         │
│  - CreateServiceFromERP                     │
│  - SyncUsersFromERP                         │
│  - SendManiobraToERP                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Infrastructure (ERP Client Service)      │
│  - HTTP client para llamadas al ERP         │
│  - Webhooks para recibir eventos del ERP    │
└─────────────────────────────────────────────┘
```

### Implementación

#### 1. Domain Layer

**Nueva entidad:**

```typescript
// src/domain/entities/service.entity.ts
import { ChatId } from '@domain/value-objects/chat-id.vo';

export enum ServiceStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Service {
  id: string;
  erpServiceId: string;         // ID del servicio en el ERP
  chatId: ChatId;
  serviceType: string;           // Tipo de servicio (ej: "mantenimiento")
  description: string;
  status: ServiceStatus;
  createdAt: Date;
  assignedTo?: number;           // User ID del operador asignado
  completedAt?: Date;
}

export class ServiceEntity implements Service {
  constructor(
    public readonly id: string,
    public readonly erpServiceId: string,
    public readonly chatId: ChatId,
    public readonly serviceType: string,
    public readonly description: string,
    public status: ServiceStatus,
    public readonly createdAt: Date,
    public assignedTo: number | undefined,
    public completedAt: Date | undefined
  ) {}

  assign(userId: number): void {
    if (this.status !== ServiceStatus.PENDING) {
      throw new Error('Cannot assign service that is not pending');
    }
    this.assignedTo = userId;
    this.status = ServiceStatus.IN_PROGRESS;
  }

  complete(): void {
    if (this.status !== ServiceStatus.IN_PROGRESS) {
      throw new Error('Cannot complete service that is not in progress');
    }
    this.status = ServiceStatus.COMPLETED;
    this.completedAt = new Date();
  }

  cancel(): void {
    if (this.status === ServiceStatus.COMPLETED) {
      throw new Error('Cannot cancel completed service');
    }
    this.status = ServiceStatus.CANCELLED;
  }
}
```

**Repository interface:**

```typescript
// src/domain/repositories/service.repository.ts
import { Service } from '@domain/entities/service.entity';
import { ChatId } from '@domain/value-objects/chat-id.vo';

export interface IServiceRepository {
  save(service: Service): Promise<void>;
  findById(id: string): Promise<Service | null>;
  findByErpServiceId(erpServiceId: string): Promise<Service | null>;
  findByChatId(chatId: ChatId): Promise<Service[]>;
  findPending(): Promise<Service[]>;
  findByStatus(status: string): Promise<Service[]>;
  updateStatus(id: string, status: string): Promise<void>;
}
```

#### 2. Application Layer

**Use Case:**

```typescript
// src/application/use-cases/service/create-service-from-erp.use-case.ts
import { injectable, inject } from 'tsyringe';
import { IServiceRepository } from '@domain/repositories/service.repository';
import { ServiceEntity, ServiceStatus } from '@domain/entities/service.entity';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { TelegramBotService } from '@infrastructure/external/telegram/telegram-bot.service';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { v4 as uuidv4 } from 'uuid';

export interface CreateServiceFromERPDTO {
  erpServiceId: string;
  chatId: string;
  serviceType: string;
  description: string;
}

@injectable()
export class CreateServiceFromERPUseCase {
  constructor(
    @inject('IServiceRepository') private serviceRepo: IServiceRepository,
    @inject(TelegramBotService) private telegram: TelegramBotService,
    @inject(LoggerService) private logger: LoggerService
  ) {}

  async execute(dto: CreateServiceFromERPDTO): Promise<ServiceEntity> {
    // Verificar si ya existe
    const existing = await this.serviceRepo.findByErpServiceId(dto.erpServiceId);
    if (existing) {
      this.logger.warn(`Service ${dto.erpServiceId} already exists`);
      return existing as ServiceEntity;
    }

    // Crear servicio
    const service = new ServiceEntity(
      uuidv4(),
      dto.erpServiceId,
      new ChatId(dto.chatId),
      dto.serviceType,
      dto.description,
      ServiceStatus.PENDING,
      new Date(),
      undefined,
      undefined
    );

    await this.serviceRepo.save(service);

    // Notificar en Telegram
    await this.telegram.sendMessage(
      dto.chatId,
      `🔔 *Nuevo Servicio del ERP*\n\n` +
        `📋 *Tipo:* ${dto.serviceType}\n` +
        `📝 *Descripción:* ${dto.description}\n` +
        `🆔 *ID ERP:* ${dto.erpServiceId}\n\n` +
        `_Estado: Pendiente_`,
      { parse_mode: 'Markdown' }
    );

    this.logger.info(`Service created from ERP: ${dto.erpServiceId}`);

    return service;
  }
}
```

**Service para comunicación con ERP:**

```typescript
// src/application/services/erp-integration.service.ts
import { injectable, inject } from 'tsyringe';
import { ERPClientService } from '@infrastructure/external/erp/erp-client.service';
import { Maniobra } from '@domain/entities/maniobra.entity';
import { Service } from '@domain/entities/service.entity';
import { LoggerService } from '@infrastructure/logging/winston.logger';

@injectable()
export class ERPIntegrationService {
  constructor(
    @inject(ERPClientService) private erpClient: ERPClientService,
    @inject(LoggerService) private logger: LoggerService
  ) {}

  async sendManiobraToERP(maniobra: Maniobra): Promise<void> {
    try {
      await this.erpClient.postManiobra({
        chatId: maniobra.chatId.getValue(),
        groupName: maniobra.groupName,
        alertManagerId: maniobra.alertManagerId,
        cantidad: maniobra.cantidad,
        descripcion: maniobra.descripcion,
        fecha: maniobra.fecha.toISOString(),
      });

      this.logger.info(`Maniobra sent to ERP: ${maniobra.id}`);
    } catch (error) {
      this.logger.error(`Failed to send maniobra to ERP:`, error);
      // No lanzar error - integración con ERP es opcional
    }
  }

  async updateServiceStatus(erpServiceId: string, status: string): Promise<void> {
    try {
      await this.erpClient.updateServiceStatus(erpServiceId, status);
      this.logger.info(`Service status updated in ERP: ${erpServiceId} -> ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update service status in ERP:`, error);
    }
  }
}
```

#### 3. Infrastructure Layer

**ERP Client:**

```typescript
// src/infrastructure/external/erp/erp-client.service.ts
import axios, { AxiosInstance } from 'axios';
import { injectable } from 'tsyringe';
import { LoggerService } from '@infrastructure/logging/winston.logger';

export interface ERPManiobraDTO {
  chatId: string;
  groupName: string;
  alertManagerId: number;
  cantidad: number;
  descripcion: string;
  fecha: string;
}

@injectable()
export class ERPClientService {
  private client: AxiosInstance;
  private isEnabled: boolean;

  constructor(private logger: LoggerService) {
    const erpBaseUrl = process.env.ERP_API_BASE_URL;
    const erpApiKey = process.env.ERP_API_KEY;

    this.isEnabled = !!(erpBaseUrl && erpApiKey);

    if (!this.isEnabled) {
      this.logger.warn('ERP integration disabled: missing ERP_API_BASE_URL or ERP_API_KEY');
      this.client = axios.create(); // Cliente dummy
      return;
    }

    this.client = axios.create({
      baseURL: erpBaseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': erpApiKey,
      },
    });

    this.logger.info(`ERP client initialized: ${erpBaseUrl}`);
  }

  async postManiobra(data: ERPManiobraDTO): Promise<void> {
    if (!this.isEnabled) {
      return; // Silently skip
    }

    await this.client.post('/api/v1/maniobras', data);
  }

  async updateServiceStatus(erpServiceId: string, status: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    await this.client.patch(`/api/v1/services/${erpServiceId}`, { status });
  }

  async syncUsers(): Promise<any[]> {
    if (!this.isEnabled) {
      return [];
    }

    const response = await this.client.get('/api/v1/users');
    return response.data.users;
  }
}
```

#### 4. Presentation Layer (API Routes)

**Express routes para recibir peticiones del ERP:**

```typescript
// src/presentation/routes/api.route.ts
import { Router } from 'express';
import { container } from 'tsyringe';
import { CreateServiceFromERPUseCase } from '@application/use-cases/service/create-service-from-erp.use-case';
import { IManiobraRepository } from '@domain/repositories/maniobra.repository';
import { apiKeyMiddleware } from '@presentation/middlewares/api-key.middleware';

const router = Router();

// Middleware de autenticación
router.use(apiKeyMiddleware);

// POST /api/v1/services - Crear servicio desde ERP
router.post('/services', async (req, res) => {
  try {
    const useCase = container.resolve(CreateServiceFromERPUseCase);

    const service = await useCase.execute({
      erpServiceId: req.body.erpServiceId,
      chatId: req.body.chatId,
      serviceType: req.body.serviceType,
      description: req.body.description,
    });

    res.status(201).json({
      success: true,
      data: {
        id: service.id,
        erpServiceId: service.erpServiceId,
        status: service.status,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/v1/maniobras - Listar maniobras
router.get('/maniobras', async (req, res) => {
  try {
    const maniobraRepo = container.resolve<IManiobraRepository>('IManiobraRepository');

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // TODO: Agregar método findByDateRange al repo
    const maniobras = await maniobraRepo.findAll(); // Placeholder

    res.json({
      success: true,
      data: maniobras,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
```

**Middleware de autenticación:**

```typescript
// src/presentation/middlewares/api-key.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key',
    });
    return;
  }

  next();
}
```

### Feature Flags

```typescript
// src/infrastructure/config/feature-flags.ts
export class FeatureFlags {
  static get erpIntegrationEnabled(): boolean {
    return process.env.FEATURE_ERP_INTEGRATION === 'true';
  }

  static get serviceCounterEnabled(): boolean {
    return process.env.FEATURE_SERVICE_COUNTER === 'true';
  }

  static get autoReportsEnabled(): boolean {
    return process.env.FEATURE_AUTO_REPORTS === 'true';
  }
}
```

### Variables de Entorno

```bash
# .env (nuevo)

# ERP Integration
FEATURE_ERP_INTEGRATION=true
ERP_API_BASE_URL=https://erp.example.com
ERP_API_KEY=your-secret-api-key-here

# API (para recibir peticiones del ERP)
API_KEY=bot-api-key-secret
```

---

## Contador de Servicios Integrado

### Objetivo

Permitir que operadores y managers:
1. **Registren servicios** manualmente desde el bot
2. **Consulten estadísticas** de servicios por período
3. **Generen reportes** de servicios en Excel
4. **Vinculen servicios** con maniobras

### Arquitectura

```
┌─────────────────────────────────────────────┐
│         Telegram Bot Interface              │
│                                             │
│  Botones:                                   │
│  - 📊 SERVICIOS                            │
│    ├─ ➕ Registrar Servicio                │
│    ├─ 📈 Ver Estadísticas                  │
│    └─ 📋 Reporte Mensual                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       Application Layer (Use Cases)         │
│  - RegisterServiceUseCase                   │
│  - GetServiceStatsUseCase                   │
│  - GenerateServiceReportUseCase             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│    Domain Layer (Service Entity)            │
│  - Service                                  │
│  - ServiceStats                             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Infrastructure (ServiceRepository)         │
│  - MongoDB                                  │
└─────────────────────────────────────────────┘
```

### Implementación

#### 1. Flujo Conversacional

```typescript
// src/application/services/service-counter.service.ts
import { injectable, inject } from 'tsyringe';
import { IServiceRepository } from '@domain/repositories/service.repository';
import { ServiceEntity, ServiceStatus } from '@domain/entities/service.entity';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import { LoggerService } from '@infrastructure/logging/winston.logger';
import { v4 as uuidv4 } from 'uuid';

export interface UserServiceFlowState {
  chatId: string;
  step: 'awaiting_type' | 'awaiting_description' | 'confirming';
  data: {
    serviceType?: string;
    description?: string;
  };
}

@injectable()
export class ServiceCounterService {
  private userFlows: Map<number, UserServiceFlowState> = new Map();

  constructor(
    @inject('IServiceRepository') private serviceRepo: IServiceRepository,
    @inject(LoggerService) private logger: LoggerService
  ) {}

  startServiceRegistration(userId: number, chatId: string): void {
    this.userFlows.set(userId, {
      chatId,
      step: 'awaiting_type',
      data: {},
    });
  }

  async handleUserInput(userId: number, input: string): Promise<string> {
    const flow = this.userFlows.get(userId);
    if (!flow) {
      return '';
    }

    switch (flow.step) {
      case 'awaiting_type':
        flow.data.serviceType = input;
        flow.step = 'awaiting_description';
        return '📝 *Describe el servicio realizado:*';

      case 'awaiting_description':
        flow.data.description = input;
        flow.step = 'confirming';
        return (
          `✅ *Confirma el registro:*\n\n` +
          `🏷️ *Tipo:* ${flow.data.serviceType}\n` +
          `📝 *Descripción:* ${flow.data.description}\n\n` +
          `¿Confirmar registro?`
        );

      case 'confirming':
        if (input === '✅ Confirmar') {
          const service = new ServiceEntity(
            uuidv4(),
            '', // No es del ERP
            new ChatId(flow.chatId),
            flow.data.serviceType!,
            flow.data.description!,
            ServiceStatus.COMPLETED,
            new Date(),
            userId,
            new Date()
          );

          await this.serviceRepo.save(service);

          this.userFlows.delete(userId);
          return '✅ *Servicio registrado exitosamente*';
        } else {
          this.userFlows.delete(userId);
          return '❌ *Registro cancelado*';
        }

      default:
        return '';
    }
  }

  clearUserFlow(userId: number): void {
    this.userFlows.delete(userId);
  }
}
```

#### 2. Estadísticas

```typescript
// src/application/use-cases/service/get-service-stats.use-case.ts
import { injectable, inject } from 'tsyringe';
import { IServiceRepository } from '@domain/repositories/service.repository';
import { ChatId } from '@domain/value-objects/chat-id.vo';
import moment from 'moment-timezone';

export interface ServiceStats {
  totalServices: number;
  byType: Record<string, number>;
  byOperator: Record<number, number>;
  period: {
    start: Date;
    end: Date;
  };
}

@injectable()
export class GetServiceStatsUseCase {
  constructor(@inject('IServiceRepository') private serviceRepo: IServiceRepository) {}

  async execute(chatId: ChatId, days: number = 30): Promise<ServiceStats> {
    const endDate = moment.tz('America/Mexico_City').endOf('day').toDate();
    const startDate = moment
      .tz('America/Mexico_City')
      .subtract(days, 'days')
      .startOf('day')
      .toDate();

    const services = await this.serviceRepo.findByChatId(chatId);

    // Filtrar por rango de fechas
    const filtered = services.filter(
      (s) => s.createdAt >= startDate && s.createdAt <= endDate
    );

    // Agrupar por tipo
    const byType: Record<string, number> = {};
    filtered.forEach((s) => {
      byType[s.serviceType] = (byType[s.serviceType] || 0) + 1;
    });

    // Agrupar por operador
    const byOperator: Record<number, number> = {};
    filtered.forEach((s) => {
      if (s.assignedTo) {
        byOperator[s.assignedTo] = (byOperator[s.assignedTo] || 0) + 1;
      }
    });

    return {
      totalServices: filtered.length,
      byType,
      byOperator,
      period: { start: startDate, end: endDate },
    };
  }
}
```

#### 3. Teclado Actualizado

```typescript
// src/shared/constants/keyboards.constant.ts
export function getPersistentKeyboard(): any {
  return {
    keyboard: [
      [{ text: '📞 CONFERENCIA' }, { text: '🚗 MANIOBRAS' }],
      [{ text: '📊 SERVICIOS' }, { text: '📋 REPORTES' }], // Nueva fila
    ],
    resize_keyboard: true,
    persistent: true,
    one_time_keyboard: false,
  };
}

export function getServiceMenuKeyboard(): any {
  return {
    keyboard: [
      [{ text: '➕ Registrar Servicio' }],
      [{ text: '📈 Ver Estadísticas' }],
      [{ text: '📋 Reporte Mensual' }],
      [{ text: '🔙 Volver al Menú' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}
```

---

## Otras Integraciones Futuras

### 1. Panel de Administración Web

**Tecnología sugerida:** Next.js + TypeScript + tRPC

```
┌─────────────────────────────────────────────┐
│         Web Admin Panel (Next.js)           │
│  - Dashboard de alertas activas             │
│  - Gestión de usuarios y permisos           │
│  - Visualización de reportes                │
│  - Configuración del bot                    │
└──────────────────┬──────────────────────────┘
                   │ HTTP/tRPC
                   ▼
┌─────────────────────────────────────────────┐
│    Bot Backend (TypeScript)                 │
│  - Expone API REST/tRPC                     │
│  - Comparte tipos con frontend              │
└─────────────────────────────────────────────┘
```

**Ventajas de tRPC:**
- Comparte tipos entre backend y frontend
- Type-safe end-to-end
- Autocompletado en frontend
- No necesita generar schemas

### 2. Notificaciones Push

**Cuando:**
- Alerta no se ha cancelado en X minutos
- Servicio del ERP lleva mucho tiempo pendiente
- Reporte automático falló

**Tecnología:**
- **Telegram:** Ya disponible (mensajes directos)
- **Email:** Nodemailer
- **SMS:** Twilio
- **Slack:** Webhook

```typescript
// src/infrastructure/external/notifications/notification.service.ts
export interface NotificationService {
  sendCritical(message: string, recipients: string[]): Promise<void>;
  sendWarning(message: string, recipients: string[]): Promise<void>;
  sendInfo(message: string, recipients: string[]): Promise<void>;
}

export class TelegramNotificationService implements NotificationService {
  async sendCritical(message: string, recipients: string[]): Promise<void> {
    // Enviar mensaje directo a cada admin
    for (const chatId of recipients) {
      await this.telegram.sendMessage(chatId, `🚨 *CRÍTICO*\n\n${message}`, {
        parse_mode: 'Markdown',
      });
    }
  }
  // ...
}
```

### 3. Multi-Idioma (i18n)

**Librería:** i18next

```typescript
// src/infrastructure/localization/i18n.service.ts
import i18next from 'i18next';

export class I18nService {
  constructor() {
    i18next.init({
      lng: 'es',
      fallbackLng: 'es',
      resources: {
        es: {
          translation: {
            'alert.started': '⚠️ Alerta iniciada por {{userName}}',
            'alert.canceled': '✅ Alerta cancelada',
            'maniobra.registered': '✅ Maniobra registrada: {{cantidad}}',
          },
        },
        en: {
          translation: {
            'alert.started': '⚠️ Alert started by {{userName}}',
            'alert.canceled': '✅ Alert canceled',
            'maniobra.registered': '✅ Maniobra registered: {{cantidad}}',
          },
        },
      },
    });
  }

  t(key: string, params?: any): string {
    return i18next.t(key, params);
  }

  changeLanguage(lang: string): void {
    i18next.changeLanguage(lang);
  }
}
```

### 4. Cache con Redis

**Cuando el sistema crece:**

```typescript
// src/infrastructure/cache/redis-cache.service.ts
import Redis from 'ioredis';

export class RedisCacheService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
```

**Uso:**

```typescript
// Cache de permisos de usuario (evitar query a MongoDB cada vez)
const cacheKey = `user:${userId}:roles`;
let roles = await cache.get<string[]>(cacheKey);

if (!roles) {
  const user = await userRepo.findByUserId(userId);
  roles = user?.roles || [];
  await cache.set(cacheKey, roles, 3600); // 1 hora TTL
}
```

---

## Arquitectura de Microservicios (Opcional)

**Cuando el sistema sea MUY grande:**

```
┌─────────────────────────────────────────────┐
│           API Gateway (Kong / NGINX)        │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┬────────────┐
        │                     │            │
        ▼                     ▼            ▼
┌──────────────┐      ┌──────────────┐   ┌──────────────┐
│ Alert Service│      │User Service  │   │Report Service│
│ (TypeScript) │      │(TypeScript)  │   │(TypeScript)  │
│              │      │              │   │              │
│ - Alertas    │      │ - Permisos   │   │ - Excel      │
│ - Intervals  │      │ - Auth       │   │ - Scheduler  │
└──────┬───────┘      └──────┬───────┘   └──────┬───────┘
       │                     │                  │
       └─────────────────────┴──────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  MongoDB Shared  │
                   │   (o separadas)  │
                   └──────────────────┘
```

**Message Queue (RabbitMQ / Kafka):**

```typescript
// Alert Service publica evento
await messageQueue.publish('alert.started', {
  alertId: alert.id,
  userId: alert.userId,
  chatId: alert.chatId.getValue(),
});

// Report Service se suscribe
messageQueue.subscribe('alert.started', async (event) => {
  // Actualizar estadísticas en tiempo real
  await statsService.incrementAlertCount(event.chatId);
});
```

**⚠️ Recomendación:** NO implementar microservicios hasta que:
- Haya >100 grupos activos
- >10 tipos de alerta diferentes
- >1000 servicios por día
- Equipo de >5 desarrolladores

---

## Roadmap de Features

### Q1 2026 (Fase 3 - Después de Refactorización)

| Semana | Feature | Prioridad |
|--------|---------|-----------|
| 1-2 | Integración con ERP (recibir servicios) | Alta |
| 3 | Contador de servicios manual | Alta |
| 4 | Health checks + Monitoreo (Sentry) | Media |

### Q2 2026

| Semana | Feature | Prioridad |
|--------|---------|-----------|
| 1-2 | Panel de administración web (MVP) | Alta |
| 3 | Notificaciones push (email) | Media |
| 4 | Reportes avanzados (gráficos) | Baja |

### Q3 2026

| Semana | Feature | Prioridad |
|--------|---------|-----------|
| 1 | Multi-idioma (español/inglés) | Baja |
| 2-3 | Cache con Redis | Media |
| 4 | Integración con Slack | Baja |

### Q4 2026

| Semana | Feature | Prioridad |
|--------|---------|-----------|
| 1-4 | Evaluación de microservicios (si aplica) | TBD |

---

## Consideraciones de Seguridad

### 1. Autenticación de API

**Opciones:**

**Opción A: API Key (simple)**
```typescript
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.API_KEY) {
  throw new UnauthorizedException();
}
```

**Opción B: JWT (más robusto)**
```typescript
import jwt from 'jsonwebtoken';

const token = req.headers.authorization?.replace('Bearer ', '');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

**Opción C: OAuth 2.0 (para ERP empresarial)**

### 2. Rate Limiting

```typescript
// src/presentation/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Too many requests from this IP',
});

// Aplicar a rutas de API
app.use('/api/v1', apiLimiter);
```

### 3. Validación de Input

```typescript
// src/presentation/validators/create-service.validator.ts
import Joi from 'joi';

export const createServiceSchema = Joi.object({
  erpServiceId: Joi.string().required().max(100),
  chatId: Joi.string().required(),
  serviceType: Joi.string().required().max(50),
  description: Joi.string().required().max(500),
});

// Uso en route
router.post('/services', async (req, res) => {
  const { error } = createServiceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  // ...
});
```

### 4. Secrets Management

**NO hardcodear secretos en código:**

```typescript
// ❌ MAL
const apiKey = 'sk-12345678';

// ✅ BIEN
const apiKey = process.env.ERP_API_KEY;

// ✅ MEJOR (Railway Secrets)
// Variables de entorno encriptadas en Railway
```

---

## Escalabilidad y Performance

### 1. Horizontal Scaling

**Railway permite múltiples instancias:**

```
┌─────────────────────────────────────────────┐
│           Load Balancer (Railway)           │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┬
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│ Bot Instance │      │ Bot Instance │
│      #1      │      │      #2      │
└──────┬───────┘      └──────┬───────┘
       │                     │
       └─────────┬───────────┘
                 │
                 ▼
        ┌──────────────────┐
        │    MongoDB       │
        └──────────────────┘
```

**Problema:** Alertas activas en memoria → no compartidas entre instancias

**Solución:** Redis como estado compartido

```typescript
// Guardar intervalId en Redis en lugar de Map en memoria
await redis.set(`interval:${alertId}`, 'active', 20); // TTL de 20 seg

// Cada instancia lee de Redis
const isActive = await redis.get(`interval:${alertId}`);
```

### 2. Database Indexing

```typescript
// Asegurar índices en MongoDB
AlertSchema.index({ chatId: 1, userId: 1, alertType: 1 }, { unique: true });
ManiobraSchema.index({ fecha: -1 }); // Para queries de rango
ManiobraSchema.index({ chatId: 1, fecha: -1 }); // Compuesto
UserSchema.index({ userId: 1 }, { unique: true });
ServiceSchema.index({ erpServiceId: 1 }, { unique: true });
ServiceSchema.index({ chatId: 1, createdAt: -1 }); // Estadísticas
```

### 3. Query Optimization

```typescript
// ❌ MAL: N+1 queries
for (const maniobra of maniobras) {
  const user = await userRepo.findByUserId(maniobra.alertManagerId);
  // ...
}

// ✅ BIEN: Batch query
const userIds = maniobras.map((m) => m.alertManagerId);
const users = await userRepo.findByUserIds(userIds);
const userMap = new Map(users.map((u) => [u.userId, u]));

for (const maniobra of maniobras) {
  const user = userMap.get(maniobra.alertManagerId);
  // ...
}
```

### 4. Caching Strategy

**Niveles de cache:**

```
┌─────────────────────────────────────────────┐
│ L1: In-Memory (Map/LRU Cache)               │
│ TTL: 5 min                                  │
│ Uso: Permisos de usuario, config           │
└──────────────────┬──────────────────────────┘
                   │ Miss
                   ▼
┌─────────────────────────────────────────────┐
│ L2: Redis (shared between instances)        │
│ TTL: 1 hora                                 │
│ Uso: Permisos, estadísticas, sessions      │
└──────────────────┬──────────────────────────┘
                   │ Miss
                   ▼
┌─────────────────────────────────────────────┐
│ L3: MongoDB (source of truth)               │
│ No TTL                                      │
│ Uso: Todo                                   │
└─────────────────────────────────────────────┘
```

---

## Resumen

### Arquitectura Final Propuesta

```
┌─────────────────────────────────────────────────────────┐
│                  TELEGRAM BOT (Core)                    │
│  TypeScript + Clean Architecture                        │
│  - Alertas periódicas                                   │
│  - Maniobras                                            │
│  - Reportes automáticos                                 │
│  - Contador de servicios                               │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴────────────┬──────────────┐
        │                        │              │
        ▼                        ▼              ▼
┌──────────────┐      ┌──────────────────┐   ┌─────────────┐
│ ERP System   │      │ Admin Panel      │   │ Monitoring  │
│ (API REST)   │      │ (Next.js)        │   │ (Sentry)    │
│              │      │                  │   │             │
│ ← Servicios  │      │ → Dashboard      │   │ → Alertas   │
│ → Maniobras  │      │ → Gestión users  │   │ → Métricas  │
│ → Usuarios   │      │ → Reportes       │   │             │
└──────────────┘      └──────────────────┘   └─────────────┘
```

### Principios Clave

1. **Modularidad:** Cada feature es un módulo independiente
2. **Feature Flags:** Activar/desactivar integraciones sin redeploy
3. **Clean Architecture:** Fácil agregar nuevas integraciones
4. **Type Safety:** TypeScript en todo el stack
5. **Testing:** Coverage >80% en módulos críticos
6. **Monitoring:** Observabilidad en producción
7. **Security:** Autenticación, validación, rate limiting
8. **Performance:** Cache, índices, queries optimizadas

### Próximos Pasos

1. ✅ **Completar refactorización TypeScript** (documento 04)
2. ✅ **Aplicar hotfixes críticos** (documento 03)
3. ⏳ **Implementar integración ERP** (este documento)
4. ⏳ **Desarrollar contador de servicios** (este documento)
5. ⏳ **Crear panel de administración** (futuro)

---

**Fin del Documento 05**
**Fin de la Auditoría Completa**
