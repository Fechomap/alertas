# Bot de Alertas Telegram

Bot de Telegram para gestión de alertas y maniobras en grupos de soporte técnico.

## Stack Tecnológico

- **Runtime:** Node.js 22 (ESM)
- **Framework HTTP:** Hono
- **Bot Framework:** grammY
- **DI Container:** Awilix
- **Base de Datos:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Testing:** Vitest
- **Linting:** ESLint (flat config) + Prettier

## Requisitos

- Node.js 22.x o superior
- PostgreSQL 15+
- Redis 7+
- Token de bot de Telegram (BotFather)
- Docker (opcional, para desarrollo local)

## Configuración

1. Copia el archivo de ejemplo de variables de entorno:

```bash
cp .env.example .env
```

2. Configura las variables en `.env`:

```env
NODE_ENV=development
PORT=3000
TELEGRAM_BOT_TOKEN=tu_token_aqui
DATABASE_URL=postgresql://user:pass@localhost:5432/alertas
REDIS_URL=redis://localhost:6379
ADMIN_CHAT_ID=tu_telegram_id
```

3. Instala dependencias y genera cliente Prisma:

```bash
npm install
npx prisma generate
npx prisma db push
```

4. Inicia en desarrollo:

```bash
npm run dev
```

## Comandos del Bot

| Comando | Rol Requerido | Descripción |
|---------|---------------|-------------|
| `/start` | Todos | Muestra menú principal |
| `/help` | Todos | Muestra ayuda |
| `/stopalert` | ALERT_MANAGER+ | Cancela alertas activas |
| `/report` | ALERT_MANAGER+ | Genera reporte semanal (Excel/ZIP) |
| `/users` | ADMIN | Gestiona roles de usuarios |

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| `USER` | Solo visualizar |
| `OPERATOR` | Iniciar alertas de conferencia |
| `ALERT_MANAGER` | Cancelar alertas, registrar maniobras, generar reportes |
| `ADMIN` | Todo + gestión de usuarios |

Los roles se gestionan desde el bot con `/users` (solo ADMIN).

## Scripts NPM

```bash
# Desarrollo
npm run dev          # Inicia con hot-reload

# Build
npm run build        # Compila TypeScript

# Producción
npm start            # Ejecuta build compilado

# Calidad de código
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # TypeScript check

# Testing
npm test             # Ejecuta tests
npm run test:coverage # Tests con coverage

# Base de datos
npx prisma generate  # Genera cliente Prisma
npx prisma db push   # Sincroniza schema
npx prisma studio    # UI para explorar datos
```

## Docker (Desarrollo Local)

```bash
# Levantar servicios (PostgreSQL + Redis)
cd docker
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## Despliegue en Railway

### Variables de Entorno Requeridas

```env
NODE_ENV=production
PORT=3000
TELEGRAM_BOT_TOKEN=tu_token
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
ADMIN_CHAT_ID=tu_telegram_id
```

### Opcional (para webhook automático)

```env
RAILWAY_PUBLIC_DOMAIN=tu-app.up.railway.app
```

Si no se configura, el bot usa polling mode.

### Despliegue

El proyecto usa Docker para el despliegue. Railway detecta automáticamente el `Dockerfile` y `railway.toml`.

```bash
git push origin main  # Railway despliega automáticamente
```

## Arquitectura

```
src/
├── adapters/          # Adaptadores externos (Telegram, HTTP)
├── application/       # Casos de uso y puertos
├── domain/            # Entidades y reglas de negocio
├── infrastructure/    # Implementaciones (DB, Cache, Logger)
├── container/         # Configuración de Awilix DI
├── config/            # Configuración y validación de env
└── main.ts            # Entry point
```

## Flujo de Uso

1. **Operador** solicita conferencia via botón
2. Bot envía alertas periódicas al grupo
3. **Alert Manager** cancela alerta cuando se atiende
4. **Alert Manager** registra maniobras realizadas (1-10)
5. **Alert Manager** genera reportes semanales

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| Bot no responde | Verificar `TELEGRAM_BOT_TOKEN` |
| Error de conexión DB | Verificar `DATABASE_URL` |
| Comandos no funcionan | Verificar rol del usuario con `/users` |
| Webhook no funciona | Agregar `RAILWAY_PUBLIC_DOMAIN` |

## Documentación Adicional

- `METODOLOGIA.md` - Guía de arquitectura y estándares de desarrollo
