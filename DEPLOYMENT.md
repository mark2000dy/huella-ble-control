# Guía de Despliegue - HUELLA BLE PWA

## 🚨 Solución al Error 503 en Azure

### Causa del problema

El error 503 "Service Unavailable" ocurre porque:
1. El archivo `.deployment` tenía `SCM_DO_BUILD_DURING_DEPLOYMENT=false`
2. Las dependencias de Node.js no se instalaban
3. El servidor no podía iniciar sin las dependencias

### Solución paso a paso

#### 1. Eliminar archivo `.deployment`
```bash
rm .deployment
```

#### 2. Verificar `package.json`
Asegurarse de que tenga:
```json
{
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

#### 3. Crear archivo `.deployment` correcto (opcional)
Si necesitas personalizar el despliegue:
```ini
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
WEBSITE_NODE_DEFAULT_VERSION=20-lts
```

#### 4. Configurar Azure Web App

##### Usando Azure Portal:
1. Ir a **Configuration** → **General settings**
2. Establecer:
   - **Stack**: Node
   - **Major version**: 20 LTS
   - **Startup Command**: `node server.js`

##### Usando Azure CLI:
```bash
# Configurar Node.js version
az webapp config set \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --linux-fx-version "NODE|20-lts"

# Configurar comando de inicio
az webapp config set \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --startup-file "node server.js"

# Habilitar logging
az webapp log config \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --application-logging filesystem \
  --level information
```

#### 5. Desplegar correctamente

##### Opción A: ZIP Deploy (Recomendado)
```bash
# Crear ZIP sin node_modules
zip -r deploy.zip . -x "node_modules/*" ".git/*" "*.log" ".env"

# Desplegar
az webapp deployment source config-zip \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --src deploy.zip
```

##### Opción B: Git Deploy
```bash
# Agregar remote de Azure
az webapp deployment source config-local-git \
  --name huella-ble-control \
  --resource-group rg-huella-ble

# Obtener URL del repositorio
az webapp deployment source show \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --query url

# Agregar remote y push
git remote add azure <URL_DEL_REPOSITORIO>
git push azure main
```

#### 6. Verificar despliegue

```bash
# Ver logs en tiempo real
az webapp log tail \
  --name huella-ble-control \
  --resource-group rg-huella-ble

# Verificar estado
az webapp show \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --query state
```

### Checklist de verificación

- [ ] No existe `.deployment` o tiene `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- [ ] `package.json` tiene script `start`
- [ ] `server.js` usa `process.env.PORT || 8080`
- [ ] `web.config` está configurado correctamente
- [ ] Node.js 20 LTS está configurado en Azure
- [ ] Las dependencias se instalaron correctamente
- [ ] El sitio responde en HTTPS

### Comandos útiles de debugging

```bash
# Ver configuración actual
az webapp config show \
  --name huella-ble-control \
  --resource-group rg-huella-ble

# Ver variables de entorno
az webapp config appsettings list \
  --name huella-ble-control \
  --resource-group rg-huella-ble

# Reiniciar aplicación
az webapp restart \
  --name huella-ble-control \
  --resource-group rg-huella-ble

# SSH al contenedor (si está en Linux)
az webapp ssh \
  --name huella-ble-control \
  --resource-group rg-huella-ble
```

### Configuración adicional recomendada

```bash
# Habilitar Always On (evita que la app duerma)
az webapp config set \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --always-on true

# Configurar HTTPS Only
az webapp update \
  --name huella-ble-control \
  --resource-group rg-huella-ble \
  --https-only true

# Agregar dominio personalizado (opcional)
az webapp config hostname add \
  --webapp-name huella-ble-control \
  --resource-group rg-huella-ble \
  --hostname www.huella-ble.com
```

## 🔧 Troubleshooting adicional

### Si el error persiste:

1. **Verificar Kudu Console**
   - Ir a: `https://huella-ble-control.scm.azurewebsites.net`
   - Navegar a **Debug Console** → **CMD**
   - Verificar que existan todos los archivos
   - Ejecutar: `npm install` manualmente

2. **Revisar Application Insights**
   ```bash
   az monitor app-insights component create \
     --app huella-ble-insights \
     --location eastus \
     --resource-group rg-huella-ble \
     --application-type Node.JS
   ```

3. **Usar App Service Editor**
   - Ir a: `https://huella-ble-control.scm.azurewebsites.net/dev`
   - Editar archivos directamente
   - Verificar permisos y estructura

### Estructura esperada en Azure:

```
/home/site/wwwroot/
├── node_modules/     # Debe existir después del deploy
├── package.json
├── server.js
├── web.config
├── index.html
├── manifest.json
├── service-worker.js
├── css/
├── js/
├── icons/
└── ...
```

## 📞 Soporte

Si continúas teniendo problemas:

1. **Revisar logs detallados**
2. **Contactar soporte de Azure**
3. **Abrir issue en GitHub**
4. **Email**: support@symbiot.com.mx

---

**Última actualización**: Julio 2025
