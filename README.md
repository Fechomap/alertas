# Bot de Soporte Telegram

Bot de Telegram para gestión de alertas y maniobras en grupos de soporte.

## Descripción

Este bot permite a operadores enviar alertas a grupos de Telegram y a los gestores de alertas (Alert Managers) cancelar esas alertas y registrar maniobras.

## Requisitos Mínimos

- Node.js 14.x o superior
- MongoDB
- Token de bot de Telegram (obtenido a través de BotFather)
- Cuenta en Heroku (para despliegue)
- Heroku CLI instalado

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

### Comandos Git y Heroku

```bash
# Git - Guardar cambios locales
git add .
git commit -m "Descripción del cambio"

# Git - Empujar a repositorio remoto
git push origin main

# Heroku - Empujar cambios y desplegar
git push heroku main

# Heroku - Ver logs en vivo
heroku logs --tail -a alertas

# Heroku - Gestión de dynos
heroku ps:scale web=1 -a alertas  # Escalar a 1 dyno
heroku ps:scale web=0 -a alertas  # Detener la aplicación
heroku ps:restart -a alertas      # Reiniciar dynos

# Heroku - Comprobar estado
heroku ps -a alertas
```

## Funcionalidades Principales

1. **Alertas de Conferencia** - Operadores pueden solicitar apoyo mediante alertas
2. **Registro de Maniobras** - Alert Managers pueden registrar maniobras (1-10)
3. **Generación de Reportes** - Ver informes de maniobras registradas

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

## Problemas Comunes con Heroku

Si el bot deja de responder en Heroku:

1. Verifica los logs: `heroku logs --tail -a alertas`
2. Reinicia la aplicación: `heroku restart -a alertas`
3. Asegúrate que los dynos estén activos: `heroku ps -a alertas`
4. Verifica las variables de entorno: `heroku config -a alertas`
5. Comprueba que el webhook está configurado: `heroku config:get WEBHOOK_URL -a alertas`

## Variables de Configuración en Heroku

```bash
# Ver todas las variables
heroku config -a alertas

# Configurar variables
heroku config:set TELEGRAM_BOT_TOKEN=nuevo_token -a alertas
heroku config:set MONGO_URI=nueva_uri -a alertas
heroku config:set NODE_ENV=production -a alertas

# Eliminar una variable
heroku config:unset NOMBRE_VARIABLE -a alertas
```