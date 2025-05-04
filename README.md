# Bot de Soporte Telegram

Bot de Telegram para gestión de alertas y maniobras en grupos de soporte.

## Descripción

Este bot permite a operadores enviar alertas a grupos de Telegram y a los gestores de alertas (Alert Managers) cancelar esas alertas y registrar maniobras.

## Requisitos Mínimos

- Node.js 14.x o superior
- MongoDB
- Token de bot de Telegram (obtenido a través de BotFather)
- Cuenta en Railway para despliegue
- Git instalado

## Configuración Rápida

1. Crea un archivo `.env` en la raíz del proyecto:

```
TELEGRAM_BOT_TOKEN=tu_token_de_telegram_aquí
MONGO_URI=tu_uri_de_mongodb_aquí
NODE_ENV=development
```

2. Instala las dependencias:

```bash
npm install
```

3. Inicia el bot en modo desarrollo:

```bash
npm run dev
```

## Comandos Esenciales

### Comandos del Bot

- `/start` - Inicia el bot y muestra el menú principal
- `/help` - Muestra instrucciones de ayuda
- `/stopalert` - (Solo Alert Managers) Cancela todas las alertas activas en el chat
- `/report` - (Solo Alert Managers) Genera y envía el reporte semanal en Excel

### Comandos de Terminal (Local)

```bash
# Desarrollo local (con auto-recarga)
npm run dev

# Iniciar en producción
npm start

# Exportar datos a Excel
npm run export

# Importar datos desde Excel
npm run import

# Limpiar base de datos
npm run clear-db
```

### Comandos Git y Railway

```bash
# Git - Guardar cambios locales
git add .
git commit -m "Descripción del cambio"

# Git - Empujar a repositorio remoto
git push origin main

# Railway - Desplegar aplicación
railway up

# Railway - Ver logs en vivo
railway logs

# Railway - Gestión de variables de entorno
railway variables set VARIABLE=valor

# Railway - Reiniciar servicio
railway restart

# Railway - Obtener URL de producción
railway status
```

## Despliegue en Railway

### 1. Configuración inicial

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Autenticarte en Railway
railway login

# Conectar proyecto con Railway
railway init
```

### 2. Variables de entorno necesarias

```env
TELEGRAM_BOT_TOKEN=tu_token
MONGO_URI=mongodb+srv://...
NODE_ENV=production
PORT=3000
```

### 3. Despliegue

```bash
# Desplegar aplicación
railway up

# Ver el estado
railway status

# Ver logs
railway logs --tail
```

## Funcionalidades Principales

1. **Alertas de Conferencia** - Operadores pueden solicitar apoyo mediante alertas
2. **Registro de Maniobras** - Alert Managers pueden registrar maniobras (1-10)
3. **Generación de Reportes** - Ver informes de maniobras registradas en formato Excel

## Tipos de Usuarios

- **Operadores**: Pueden iniciar alertas
- **Alert Managers**: Pueden cancelar alertas y registrar maniobras
- **Super Admin**: Privilegios especiales de administración

## Flujo de Uso Básico

1. Operador solicita apoyo usando el botón de Conferencia
2. El bot envía alertas periódicas al grupo
3. Alert Manager cancela la alerta cuando se atiende
4. Alert Manager registra maniobras realizadas

## Solución de Problemas Comunes

- **Bot no responde**: Verifica las credenciales en `.env`
- **Errores de MongoDB**: Asegúrate que MongoDB esté ejecutándose
- **Comandos no funcionan**: Verifica que el usuario tiene los permisos necesarios

## Problemas Comunes con Railway

Si el bot deja de responder en Railway:

1. Verifica los logs: `railway logs`
2. Reinicia la aplicación: `railway restart`
3. Verifica las variables de entorno: `railway variables`
4. Comprueba el estado del servicio: `railway status`
5. Asegúrate que el webhook está configurado: logs deben mostrar "⚙️ Bot iniciado en modo WEBHOOK (producción)"

## Variables de Configuración en Railway

```bash
# Ver todas las variables
railway variables

# Configurar variables
railway variables set VARIABLE=valor

# Eliminar una variable
railway variables delete VARIABLE
```

## Monitoreo

```bash
# Ver recursos utilizados
railway metrics

# Ver estado detallado
railway status -d

# Ver logs históricos
railway logs --limit 500
```