# HUELLA BLE PWA v2.0.1

Progressive Web App para control de dispositivos HUELLA via Bluetooth Low Energy

Compatible con **Firmware CTIM3 v2.3.016** - Huella Estructural - Symbiot Technologies

## 🚀 Características

- **Conexión BLE directa** con dispositivos ESP32-S3 HUELLA
- **PWA instalable** en dispositivos móviles y desktop
- **Interfaz moderna** con tema claro/oscuro
- **Visualización en tiempo real** de datos del acelerómetro ADXL355
- **Almacenamiento local** con IndexedDB para funcionamiento offline
- **Autenticación segura** con PIN de 6 dígitos
- **Exportación de datos** en formato CSV
- **Control completo** del dispositivo (START, STOP, STANDBY, RESTART)
- **Gráficos interactivos** con Chart.js
- **Compatible con Azure Web Apps**

## 📋 Requisitos

### Navegadores compatibles
- **Chrome/Edge 80+** (Windows, macOS, Linux, Android)
- **Safari 14+** (macOS, iOS) - *Soporte limitado*
- **Firefox 90+** - *Requiere habilitar Web Bluetooth*

### Requisitos del servidor
- **HTTPS obligatorio** (excepto localhost)
- **Node.js 20+** (para desarrollo/despliegue)
- **Azure Web Apps** o cualquier hosting con Node.js

### Hardware compatible
- **ESP32-S3-DEVKITC-1 (N8R8)**
- **Sensor ADXL355** (acelerómetro 3 ejes)
- **Firmware CTIM3 v2.3.016**

## 🛠️ Instalación

### Opción 1: Despliegue en Azure (Recomendado)

1. **Clonar el repositorio**
```bash
git clone https://github.com/symbiot-technologies/huella-ble-pwa.git
cd huella-ble-pwa
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Crear Web App en Azure**
```bash
# Instalar Azure CLI si no lo tienes
npm install -g @azure/cli

# Login en Azure
az login

# Crear resource group
az group create --name rg-huella-ble --location eastus

# Crear App Service Plan
az appservice plan create --name plan-huella-ble --resource-group rg-huella-ble --sku B1 --is-linux

# Crear Web App
az webapp create --name huella-ble-control --resource-group rg-huella-ble --plan plan-huella-ble --runtime "NODE:20-lts"
```

4. **Desplegar aplicación**
```bash
# Configurar despliegue desde ZIP
az webapp config appsettings set --name huella-ble-control --resource-group rg-huella-ble --settings WEBSITE_RUN_FROM_PACKAGE="1"

# Crear ZIP del proyecto (excluir node_modules)
zip -r deploy.zip . -x "node_modules/*" ".git/*" "*.log"

# Desplegar
az webapp deployment source config-zip --name huella-ble-control --resource-group rg-huella-ble --src deploy.zip
```

5. **Verificar despliegue**
```
https://huella-ble-control.azurewebsites.net
```

### Opción 2: Servidor local

1. **Clonar e instalar**
```bash
git clone https://github.com/symbiot-technologies/huella-ble-pwa.git
cd huella-ble-pwa
npm install
```

2. **Iniciar servidor**
```bash
npm start
```

3. **Abrir en navegador**
```
http://localhost:8080
```

### Opción 3: Despliegue en otros servicios

La aplicación es compatible con:
- **Netlify**: Arrastrar carpeta al dashboard
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Con GitHub Actions
- **Heroku**: Con buildpack de Node.js

## 📱 Uso de la aplicación

### Primera conexión

1. **Abrir la aplicación** en un navegador compatible
2. **Click en "Buscar Dispositivos"**
3. **Seleccionar** dispositivo que empiece con "HUELLA_"
4. **Ingresar PIN** (default: 123456)
5. **¡Listo!** Ya puedes controlar el dispositivo

### Control del dispositivo

- **START**: Iniciar grabación de datos
- **STOP**: Detener grabación
- **STANDBY**: Modo de espera
- **RESTART**: Reiniciar dispositivo

### Streaming de datos

1. Ir a la pestaña **"Datos"**
2. Seleccionar duración (10, 30, 60, 300 segundos)
3. Click en **"Iniciar Streaming"**
4. Los datos se mostrarán en tiempo real
5. Click en **"Exportar CSV"** para descargar

### Configuración

- **Frecuencia de muestreo**: 62.5, 125, 250, 500 Hz
- **Rango de medición**: ±2g, ±4g, ±8g
- **Modo de operación**: Continuo, Trigger, Programado
- **Intervalo de guardado**: 1-3600 segundos

## 🔧 Solución de problemas

### Error 503 en Azure

Si encuentras el error "Service Unavailable":

1. **Verificar logs en Azure Portal**
```bash
az webapp log tail --name huella-ble-control --resource-group rg-huella-ble
```

2. **Verificar que Node.js esté configurado**
```bash
az webapp config show --name huella-ble-control --resource-group rg-huella-ble
```

3. **Reiniciar la aplicación**
```bash
az webapp restart --name huella-ble-control --resource-group rg-huella-ble
```

### "Web Bluetooth no soportado"

- Usar Chrome, Edge o Brave (no Firefox en iOS/macOS)
- Verificar que el sitio use HTTPS
- En Android: Habilitar Bluetooth y ubicación

### "No se encuentra el dispositivo"

1. Verificar que el dispositivo esté encendido
2. Confirmar que el LED BLE esté parpadeando
3. Acercar el dispositivo (< 10 metros)
4. Reiniciar Bluetooth en el teléfono/PC

### "Error de autenticación"

- PIN por defecto: `123456`
- El PIN distingue mayúsculas/minúsculas
- Reiniciar el dispositivo si persiste

## 🏗️ Estructura del proyecto

```
huella-ble-pwa/
├── package.json          # Configuración Node.js
├── server.js            # Servidor Express
├── web.config           # Configuración IIS/Azure
├── index.html           # Aplicación principal
├── manifest.json        # Manifiesto PWA
├── service-worker.js    # Service Worker
├── favicon.svg          # Icono vectorial
├── css/
│   ├── app.css         # Estilos principales
│   └── theme.css       # Sistema de temas
├── js/
│   ├── app.js          # Controlador principal
│   ├── ble-service.js  # Servicio BLE
│   ├── storage-service.js # Almacenamiento
│   ├── chart-service.js   # Gráficos
│   └── utils.js        # Utilidades
└── icons/              # Iconos PWA
```

## 🔐 Seguridad

- **HTTPS obligatorio** para Web Bluetooth API
- **Autenticación por PIN** de 6 dígitos
- **Datos locales** en IndexedDB (no se envían a servidores)
- **Sin tracking** ni analytics externos
- **Código open source** auditable

## 📊 Datos técnicos

### Formato de datos del acelerómetro

```javascript
{
  "x": 16777216,      // Valor raw (24-bit signed)
  "y": 16777216,      // Valor raw (24-bit signed)
  "z": 16777216,      // Valor raw (24-bit signed)
  "timestamp": 1234567890
}
```

### Conversión a valores g

```javascript
const CALIBRATION_FACTOR = 3.814697266E-06;
const xG = rawValue * CALIBRATION_FACTOR;
```

### UUIDs del servicio BLE

```javascript
SERVICE_UUID: '12345678-1234-5678-1234-56789abcdef0'
CMD_UUID:     '12345678-1234-5678-1234-56789abcdef1'
STATUS_UUID:  '12345678-1234-5678-1234-56789abcdef2'
DATA_UUID:    '12345678-1234-5678-1234-56789abcdef3'
CONFIG_UUID:  '12345678-1234-5678-1234-56789abcdef4'
INFO_UUID:    '12345678-1234-5678-1234-56789abcdef5'
PARAMS_UUID:  '12345678-1234-5678-1234-56789abcdef6'
SYNC_UUID:    '12345678-1234-5678-1234-56789abcdef7'
```

## 🚀 Desarrollo

### Requisitos de desarrollo

- Node.js 20+
- npm 10+
- Git

### Comandos disponibles

```bash
npm start        # Iniciar servidor de desarrollo
npm run dev      # Desarrollo con nodemon
npm test         # Ejecutar tests (no configurados aún)
npm run build    # Preparar para producción
```

### Variables de entorno

Crear archivo `.env` (opcional):

```env
NODE_ENV=production
PORT=8080
```

### Debugging

1. **Abrir DevTools** (F12)
2. **Ir a la pestaña "Debug"** en la aplicación
3. **Ver logs en tiempo real**
4. **Exportar logs** para análisis

## 📝 Licencia

Copyright © 2025 Symbiot Technologies. Todos los derechos reservados.

Este software es propietario y confidencial. La distribución no autorizada está prohibida.

## 👥 Soporte

- **Email**: support@symbiot.tech
- **GitHub Issues**: [Reportar problema](https://github.com/symbiot-technologies/huella-ble-pwa/issues)
- **Documentación**: [Wiki del proyecto](https://github.com/symbiot-technologies/huella-ble-pwa/wiki)

---

**HUELLA BLE PWA v2.0.1** - Compatible con Firmware CTIM3 v2.3.016

Desarrollado por Symbiot Technologies para Huella Estructural
