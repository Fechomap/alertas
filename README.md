# Bot de Soporte Telegram

Bot de Telegram para gestión de alertas y maniobras en grupos de soporte.

## Descripción

Este bot permite a operadores enviar alertas a grupos de Telegram y a los gestores de alertas (Alert Managers) cancelar esas alertas y registrar maniobras. El sistema también incluye generación de reportes y gestión de grupos.

## Requisitos

- Node.js 14.x o superior
- MongoDB
- Cuenta de Telegram
- Token de bot de Telegram (obtenido a través de BotFather)
- Cuenta en Heroku (para despliegue en producción)

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
TELEGRAM_BOT_TOKEN=tu_token_de_telegram_aquí
MONGO_URI=tu_uri_de_mongodb_aquí
NODE_ENV=development
HEROKU_APP_URL=https://tu-app-en-heroku.herokuapp.com
```

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/bot-soporte.git
cd bot-soporte

# Instalar dependencias
npm install
```

## Estructura del Proyecto

```
/
├── src/                    # Código fuente principal
│   ├── index.js            # Punto de entrada
│   ├── config/             # Configuración 
│   │   ├── index.js        # Exporta toda la configuración
│   │   ├── database.js     # Configuración de MongoDB
│   │   └── constants.js    # Constantes (IDs, tipos de alertas, etc.)
│   ├── models/             # Modelos de datos
│   │   ├── index.js        # Exporta todos los modelos
│   │   ├── maniobra.js     # Modelo de maniobra
│   │   └── group.js        # Modelo de grupo
│   ├── services/           # Servicios y lógica de negocio
│   │   ├── alert.js        # Manejo de alertas
│   │   └── maniobra.js     # Manejo de maniobras
│   ├── utils/              # Funciones de utilidad
│   │   ├── index.js        # Exporta todas las utilidades
│   │   └── permissions.js  # Verificación de permisos
│   ├── handlers/           # Manejadores de comandos y mensajes
│   │   ├── index.js        # Exporta todos los manejadores
│   │   ├── commands.js     # Manejo de comandos (/start, etc.)
│   │   └── messages.js     # Manejo de mensajes de texto
│   └── ui/                 # Interfaz de usuario
│       └── keyboards.js    # Definición de teclados personalizados
├── scripts/                # Scripts utilitarios
│   ├── clearDatabase.js    # Limpiar base de datos
│   ├── exportData.js       # Exportar datos
│   └── importData.js       # Importar datos
├── .env                    # Variables de entorno
├── package.json            # Dependencias y scripts
```

## Comandos

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

## Gestión en Heroku

### Configuración de Heroku

Asegúrate de tener instalada la CLI de Heroku y estar autenticado:

```bash
# Instalar CLI de Heroku (si no la tienes)
brew install heroku/brew/heroku  # macOS con Homebrew
# o
npm install -g heroku            # Con npm

# Autenticar
heroku login
```

### Comandos de Gestión para la Aplicación

```bash
# Ver información de la aplicación
heroku apps:info -a alertas

# Ver logs en tiempo real
heroku logs --tail -a alertas

# Reiniciar la aplicación
heroku restart -a alertas

# Escalar dynos (cambiar el número de instancias)
heroku ps:scale web=1 -a alertas

# Detener la aplicación (escalar a 0)
heroku ps:scale web=0 -a alertas

# Iniciar la aplicación (escalar a 1 o más)
heroku ps:scale web=1 -a alertas

# Ver variables de configuración
heroku config -a alertas

# Establecer una variable de configuración
heroku config:set NOMBRE_VARIABLE=valor -a alertas

# Eliminar una variable de configuración
heroku config:unset NOMBRE_VARIABLE -a alertas
```

### Gestión de Despliegue

```bash
# Desplegar cambios (después de hacer commit)
git push heroku main

# Ejecutar comando en el servidor
heroku run npm run comando -a alertas

# Abrir la aplicación en el navegador
heroku open -a alertas
```

## Variables de Configuración Actuales

- **APP_URL**: https://alertas-5f770ceb3390.herokuapp.com
- **HEROKU_APP_URL**: https://alertas-5f770ceb3390.herokuapp.com
- **WEBHOOK_URL**: https://alertas-5f770ceb3390.herokuapp.com

## Seguridad

- Los IDs de usuarios con permisos especiales están definidos en `src/config/constants.js`
- Las credenciales de MongoDB y el token del bot deben mantenerse seguros
- Nunca compartas tus tokens o credenciales en repositorios públicos

## Mantenimiento

Para mantener el servicio funcionando correctamente:

1. Monitorea regularmente los logs con `heroku logs --tail -a alertas`
2. Realiza backups periódicos usando `npm run export`
3. Revisa que la aplicación esté activa con `heroku ps -a alertas`

## Problemas Comunes

Si el bot deja de responder:
1. Verifica los logs: `heroku logs --tail -a alertas`
2. Reinicia la aplicación: `heroku restart -a alertas`
3. Asegúrate de que los dynos estén activos: `heroku ps -a alertas`
4. Comprueba la conectividad con MongoDB y Telegram

## Licencia

ISC