# Guía de Despliegue desde VS Code - HUELLA BLE PWA

## 📋 Pre-requisitos

1. **Visual Studio Code** con las siguientes extensiones instaladas:
   - Azure App Service
   - Azure Account
   - Azure Resources

2. **Node.js 20 LTS** instalado localmente
   ```bash
   node --version  # Debe mostrar v20.x.x
   ```

3. **Cuenta de Azure** con suscripción activa

## 🚀 Pasos para Desplegar

### 1. Preparar el proyecto

1. **Verificar archivos críticos**:
   - ✅ `package.json` con `"node": ">=20.0.0"`
   - ✅ `server.js` presente
   - ✅ `web.config` presente
   - ❌ NO debe existir `.deployment` (o debe tener `SCM_DO_BUILD_DURING_DEPLOYMENT=true`)

2. **Instalar dependencias localmente** (para verificar):
   ```bash
   npm install
   npm start  # Probar que funcione en http://localhost:8080
   ```

### 2. Configurar Azure en VS Code

1. **Abrir VS Code** en la carpeta del proyecto

2. **Iniciar sesión en Azure**:
   - Presionar `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
   - Escribir "Azure: Sign In"
   - Seguir el proceso de autenticación

3. **Verificar conexión**:
   - En la barra lateral, hacer clic en el ícono de Azure
   - Deberías ver tu suscripción listada

### 3. Crear recursos en Azure (si no existen)

#### Opción A: Desde VS Code

1. En el panel de Azure, expandir tu suscripción
2. Click derecho en "App Services"
3. Seleccionar "Create New Web App..."
4. Configurar:
   - **Nombre**: `huella-ble-control` (debe ser único globalmente)
   - **Runtime**: Node 20 LTS
   - **Sistema operativo**: Linux
   - **Plan**: B1 Basic (o superior)
   - **Región**: East US (o la más cercana)

#### Opción B: Usar recursos existentes

Si ya tienes el App Service creado, continúa al siguiente paso.

### 4. Desplegar desde VS Code

1. **En el explorador de archivos de VS Code**:
   - Click derecho en la carpeta raíz del proyecto
   - Seleccionar "Deploy to Web App..."

2. **Seleccionar opciones**:
   - Suscripción: Tu suscripción de Azure
   - Web App: `huella-ble-control`
   - Confirmar despliegue: "Deploy"

3. **Monitorear el progreso**:
   - Se abrirá el panel de Output
   - Seleccionar "Azure App Service" en el dropdown
   - Esperar mensaje "Deployment successful"

### 5. Configuración post-despliegue

1. **En el panel de Azure de VS Code**:
   - Expandir App Services > tu-app > Application Settings
   - Click derecho y "Add New Setting"
   - Agregar si es necesario:
     ```
     WEBSITE_NODE_DEFAULT_VERSION = 20-lts
     SCM_DO_BUILD_DURING_DEPLOYMENT = true
     ```

2. **Configurar HTTPS Only**:
   - En Application Settings, agregar:
     ```
     HTTPS_ONLY = true
     ```

### 6. Verificar despliegue

1. **Ver logs en tiempo real**:
   - En el panel de Azure, click derecho en tu app
   - Seleccionar "Start Streaming Logs"

2. **Abrir sitio web**:
   - Click derecho en tu app
   - Seleccionar "Browse Website"
   - URL: `https://huella-ble-control.azurewebsites.net`

## 🐛 Solución de problemas

### Error 503 - Service Unavailable

1. **Verificar logs**:
   ```bash
   # En VS Code Terminal
   az webapp log tail --name huella-ble-control --resource-group rg-huella-ble
   ```

2. **Verificar configuración de Node.js**:
   - En Azure Portal > App Service > Configuration > General settings
   - Asegurar que Node version sea 20 LTS

3. **Reiniciar App Service**:
   - En VS Code, click derecho en la app > "Restart"

### Error durante el despliegue

1. **Limpiar y redesplegar**:
   ```bash
   # En la terminal de VS Code
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

2. **Desplegar manualmente**:
   - En VS Code: `Ctrl+Shift+P` > "Azure App Service: Deploy to Web App"

### La app no carga archivos estáticos

1. **Verificar `web.config`** está presente
2. **Verificar estructura de carpetas** en Kudu:
   - `https://huella-ble-control.scm.azurewebsites.net`
   - Debug Console > CMD
   - Navegar a `/home/site/wwwroot`

## 📊 Monitoreo

### Desde VS Code

1. **Logs en tiempo real**:
   - Panel Azure > App > "Start Streaming Logs"

2. **Métricas**:
   - Panel Azure > App > "Open in Portal"
   - Navegar a Monitoring > Metrics

3. **SSH al contenedor** (para debugging avanzado):
   ```bash
   # En terminal de VS Code
   az webapp ssh --name huella-ble-control --resource-group rg-huella-ble
   ```

## ⚡ Tips para despliegue rápido

1. **Crear tarea en VS Code** (`.vscode/tasks.json`):
   ```json
   {
     "version": "2.0.0",
     "tasks": [
       {
         "label": "Deploy to Azure",
         "type": "shell",
         "command": "echo 'Deploying...' && npm test",
         "problemMatcher": []
       }
     ]
   }
   ```

2. **Usar la extensión "Azure App Service"**:
   - Permite ver logs, configuración, y métricas directamente en VS Code

3. **Configurar auto-deploy** desde GitHub:
   - En Azure Portal > Deployment Center
   - Conectar con tu repositorio GitHub

## ✅ Checklist final

- [ ] Node.js 20 configurado en `package.json`
- [ ] No existe `.deployment` o está configurado correctamente
- [ ] `server.js` usa `process.env.PORT || 8080`
- [ ] Probado localmente con `npm start`
- [ ] Extensiones de Azure instaladas en VS Code
- [ ] Sesión iniciada en Azure
- [ ] App Service creado con Node 20 LTS
- [ ] Despliegue exitoso sin errores
- [ ] HTTPS funcionando
- [ ] Logs sin errores 503

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en VS Code
2. Consultar [Azure App Service documentation](https://docs.microsoft.com/azure/app-service/)
3. Abrir issue en GitHub
4. Contactar: support@symbiot.tech

---

**Última actualización**: Enero 2025 - Compatible con Node.js 20 LTS
