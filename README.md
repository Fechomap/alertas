# Bot de Maniobras y Alertas

Bot de Telegram para gestión de maniobras y sistema de alertas. Permite el registro de maniobras, generación de reportes y manejo de alertas para diferentes grupos.

## Características

- Sistema de alertas con repetición automática
- Registro de maniobras con validación
- Reportes semanales
- Exportación/Importación de datos
- Sistema de nombres personalizados para grupos

## Requisitos

- Node.js v14 o superior
- MongoDB
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd bot-maniobras
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear archivo `.env` con:
```env
TELEGRAM_BOT_TOKEN=your_token_here
MONGO_URI=your_mongodb_uri
NODE_ENV=development
```

## Uso

### Comandos del Bot

- `/start` - Inicia el bot y muestra el menú principal
- `/report` - Genera reporte semanal de maniobras (solo Alert Managers)
- `/cancelar_alertas` - Cancela todas las alertas activas (solo Super Admin)
- `/restart` - Reinicia el bot (solo Super Admin)

### Scripts de Utilidad

Los scripts se encuentran en la carpeta `/scripts` y permiten gestionar la base de datos:

#### Exportar Datos
```bash
node scripts/exportData.js
```
- Genera archivo `data.xlsx` en la carpeta scripts
- Contiene dos hojas:
  - "Maniobras": Registro completo de maniobras
  - "Grupos": IDs de grupos y sus nombres personalizados

#### Importar Datos
```bash
node scripts/importData.js
```
- Lee `data.xlsx` de la carpeta scripts
- Actualiza la base de datos con la información del Excel
- Requiere formato específico en el Excel

#### Limpiar Base de Datos
```bash
node scripts/clearDatabase.js
```
- Elimina todos los registros de la base de datos
- Requiere confirmación explícita escribiendo "CONFIRMAR"

## Estructura de Datos

### Maniobras
```javascript
{
  chatId: String,         // ID del grupo
  groupName: String,      // Nombre del grupo
  alertManagerId: Number, // ID del Alert Manager
  maniobras: Number,      // Cantidad (1-10)
  descripcion: String,    // Descripción
  fecha: Date            // Fecha de registro
}
```

### Grupos
```javascript
{
  chatId: String,         // ID del grupo
  displayName: String     // Nombre personalizado
}
```

## Roles de Usuario

- **Super Admin**: Control total del sistema
- **Alert Managers**: Pueden registrar maniobras y ver reportes
- **Operadores**: Pueden iniciar alertas

## Flujo de Trabajo para Maniobras

1. Alert Manager selecciona "🚗 MANIOBRAS"
2. Ingresa cantidad (1-10)
3. Confirma el registro
4. Sistema guarda la maniobra y muestra confirmación

## Flujo de Trabajo para Alertas

1. Operador selecciona tipo de alerta
2. Sistema inicia alerta con repetición cada 20 segundos
3. Alert Manager puede cancelar la alerta
4. Sistema confirma cancelación

## Mantenimiento

### Respaldo de Datos
Se recomienda exportar datos regularmente:
```bash
node scripts/exportData.js
```

### Actualización de Nombres de Grupos
1. Exportar datos actuales
2. Modificar nombres en hoja "Grupos"
3. Importar datos actualizados

## Solución de Problemas

### Error de Conexión MongoDB
- Verificar MONGO_URI en variables de entorno
- Confirmar acceso a la base de datos

### Alertas no se Cancelan
- Usar `/cancelar_alertas` como Super Admin
- Reiniciar bot si persiste

## Deployment

### Heroku
1. Configurar variables de entorno:
```bash
heroku config:set TELEGRAM_BOT_TOKEN="your_token"
heroku config:set MONGO_URI="your_mongodb_uri"
heroku config:set NODE_ENV="production"
```

2. Deploy:
```bash
git push heroku main
```

## Contribuir

1. Fork del repositorio
2. Crear branch (`git checkout -b feature/mejora`)
3. Commit cambios (`git commit -am 'feat: nueva mejora'`)
4. Push al branch (`git push origin feature/mejora`)
5. Crear Pull Request

## Licencia

ISC

## Autor

Nombre del Autor