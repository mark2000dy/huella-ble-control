# Changelog - HUELLA BLE PWA

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2025-01-19

### 🔧 Corregido
- **Error 503 en Azure**: Eliminado archivo `.deployment` problemático
- **Configuración de IIS**: Simplificado `web.config` para mejor compatibilidad
- **Service Worker**: Corregido manejo de cache para recursos externos
- **BLE Service**: Mejorado manejo de reconexión automática
- **Chart Service**: Optimizado rendimiento para alta frecuencia de datos

### 🚀 Mejorado
- **Estructura del proyecto**: Reorganización completa y limpia
- **Documentación**: README y guías de despliegue actualizadas
- **Seguridad**: Headers CSP actualizados
- **Performance**: Reducido bundle size en 15%

### 📝 Agregado
- **DEPLOYMENT.md**: Guía específica para Azure
- **Validación de PIN**: Mejor feedback visual
- **Logs de debug**: Sistema mejorado con exportación
- **Tema oscuro**: Mejor contraste y accesibilidad

## [2.0.0] - 2025-01-15

### 💥 Breaking Changes
- **Firmware v3**: Migración completa a firmware CTIM3 v2.3.016
- **UUIDs actualizados**: Nuevos identificadores de servicios BLE
- **API cambios**: Estructura de comandos modificada

### 🆕 Nuevo
- **PWA completa**: Instalable en todos los dispositivos
- **IndexedDB**: Almacenamiento offline robusto
- **Streaming mejorado**: Soporte para sesiones largas
- **Exportación CSV**: Con datos calibrados en g

### 🐛 Corregido
- **Conexión BLE**: Estabilidad mejorada
- **Memory leaks**: En visualización de gráficos
- **iOS Safari**: Compatibilidad parcial agregada

## [1.0.0] - 2024-12-01

### 🎉 Lanzamiento inicial
- **Conexión BLE básica**: Con dispositivos HUELLA
- **Control remoto**: START, STOP, STANDBY
- **Visualización**: Gráficos en tiempo real
- **Autenticación**: Sistema de PIN
- **Tema día/noche**: Cambio manual

### 📋 Características base
- Compatible con firmware v1
- Chrome/Edge en Android
- Interfaz Bootstrap 5
- Chart.js para gráficos

---

## Guía de versionado

- **MAJOR** (X.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0): Nueva funcionalidad compatible
- **PATCH** (0.0.X): Correcciones de bugs

## Enlaces

- [Repositorio](https://github.com/symbiot-technologies/huella-ble-pwa)
- [Issues](https://github.com/symbiot-technologies/huella-ble-pwa/issues)
- [Documentación](https://github.com/symbiot-technologies/huella-ble-pwa/wiki)
