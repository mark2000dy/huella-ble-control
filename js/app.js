/**
 * HUELLA BLE PWA - Controlador principal
 * Version: 2.0.1
 * Integración de todos los servicios
 */

const app = {
    // Estado de la aplicación
    currentDevice: null,
    currentTheme: 'light',
    isStreaming: false,
    streamingData: [],
    pinModal: null,
    
    // Elementos del DOM
    elements: {},
    
    /**
     * Inicializar la aplicación
     */
    async init() {
        console.log('Iniciando HUELLA BLE PWA v2.0.1...');
        
        // Verificar compatibilidad
        if (!this.checkCompatibility()) {
            return;
        }
        
        // Obtener referencias del DOM
        this.cacheElements();
        
        // Inicializar tema
        this.loadTheme();
        
        // Inicializar servicios
        await this.initializeServices();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar dispositivos recientes
        await this.loadRecentDevices();
        
        // Log inicial
        this.log('Aplicación iniciada correctamente', 'success');
        
        // Verificar parámetros URL
        this.handleUrlParams();
    },
    
    /**
     * Verificar compatibilidad del navegador
     */
    checkCompatibility() {
        // Web Bluetooth
        if (!Utils.isWebBluetoothSupported()) {
            this.showError('Web Bluetooth no está soportado en este navegador. Use Chrome 80+ o Edge 80+.');
            document.getElementById('scanBtn').disabled = true;
            return false;
        }
        
        // HTTPS
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            this.showError('La aplicación requiere HTTPS para funcionar correctamente.');
            return false;
        }
        
        return true;
    },
    
    /**
     * Cachear elementos del DOM
     */
    cacheElements() {
        this.elements = {
            // Conexión
            scanBtn: document.getElementById('scanBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            deviceInfo: document.getElementById('deviceInfo'),
            
            // Control
            controlButtons: document.querySelectorAll('#control button'),
            deviceState: document.getElementById('deviceState'),
            batteryLevel: document.getElementById('batteryLevel'),
            temperature: document.getElementById('temperature'),
            firmwareVersion: document.getElementById('firmwareVersion'),
            
            // Datos
            streamDuration: document.getElementById('streamDuration'),
            startStreamBtn: document.getElementById('startStreamBtn'),
            stopStreamBtn: document.getElementById('stopStreamBtn'),
            currentX: document.getElementById('currentX'),
            currentY: document.getElementById('currentY'),
            currentZ: document.getElementById('currentZ'),
            
            // Configuración
            configForm: document.getElementById('configForm'),
            sampleRate: document.getElementById('sampleRate'),
            measureRange: document.getElementById('measureRange'),
            operationMode: document.getElementById('operationMode'),
            saveInterval: document.getElementById('saveInterval'),
            
            // Debug
            debugConsole: document.getElementById('debugConsole'),
            
            // Modal
            pinModal: new bootstrap.Modal(document.getElementById('pinModal')),
            pinInput: document.getElementById('pinInput')
        };
    },
    
    /**
     * Inicializar servicios
     */
    async initializeServices() {
        // Storage Service
        const storageInit = await StorageService.init();
        if (!storageInit) {
            this.log('Error inicializando almacenamiento', 'error');
        }
        
        // BLE Service
        const bleInit = BLEService.init({
            onConnectionChange: (connected) => this.handleConnectionChange(connected),
            onDataReceived: (data) => this.handleDataReceived(data),
            onStatusUpdate: (status) => this.handleStatusUpdate(status),
            onError: (error) => this.handleBLEError(error)
        });
        
        if (!bleInit) {
            this.log('Error inicializando BLE Service', 'error');
        }
        
        // Chart Service
        const chartInit = ChartService.init('dataChart');
        if (!chartInit) {
            this.log('Error inicializando gráficos', 'error');
        }
    },
    
    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // PIN input
        this.elements.pinInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            e.target.classList.remove('is-invalid');
        });
        
        this.elements.pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitPin();
            }
        });
        
        // Prevenir cierre accidental
        window.addEventListener('beforeunload', (e) => {
            if (this.isStreaming || BLEService.isConnected) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
        
        // Cambios de visibilidad
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isStreaming) {
                this.log('Aplicación en background, streaming continúa', 'warn');
            }
        });
    },
    
    /**
     * Escanear dispositivos BLE
     */
    async scanDevices() {
        try {
            this.log('Iniciando escaneo de dispositivos...', 'info');
            this.elements.scanBtn.disabled = true;
            this.elements.scanBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Escaneando...';
            
            const device = await BLEService.scanDevices();
            
            if (device) {
                this.currentDevice = device;
                this.log(`Dispositivo seleccionado: ${device.name}`, 'success');
                await this.connect();
            }
            
        } catch (error) {
            this.log(`Error al escanear: ${error.message}`, 'error');
            this.showError(error.message);
        } finally {
            this.elements.scanBtn.disabled = false;
            this.elements.scanBtn.innerHTML = '<i class="bi bi-search"></i> Buscar Dispositivos';
        }
    },
    
    /**
     * Conectar al dispositivo
     */
    async connect() {
        try {
            this.log('Conectando al dispositivo...', 'info');
            await BLEService.connect(this.currentDevice);
            
            // Mostrar modal de PIN
            this.elements.pinModal.show();
            this.elements.pinInput.focus();
            
        } catch (error) {
            this.log(`Error al conectar: ${error.message}`, 'error');
            this.showError('No se pudo conectar al dispositivo');
        }
    },
    
    /**
     * Desconectar del dispositivo
     */
    async disconnect() {
        try {
            await BLEService.disconnect();
            this.currentDevice = null;
            this.log('Desconectado del dispositivo', 'info');
        } catch (error) {
            this.log(`Error al desconectar: ${error.message}`, 'error');
        }
    },
    
    /**
     * Enviar PIN de autenticación
     */
    async submitPin() {
        const pin = this.elements.pinInput.value;
        
        if (!Utils.validatePin(pin)) {
            this.elements.pinInput.classList.add('is-invalid');
            return;
        }
        
        try {
            this.log('Autenticando...', 'info');
            await BLEService.authenticate(pin);
            
            // Guardar PIN en sesión
            sessionStorage.setItem('devicePin', pin);
            
            this.elements.pinModal.hide();
            this.elements.pinInput.value = '';
            
            this.log('Autenticación exitosa', 'success');
            this.showSuccess('Conectado exitosamente');
            
            // Obtener información del dispositivo
            await this.getDeviceInfo();
            
        } catch (error) {
            this.log('PIN incorrecto', 'error');
            this.elements.pinInput.classList.add('is-invalid');
        }
    },
    
    /**
     * Cancelar autenticación
     */
    cancelAuth() {
        this.elements.pinModal.hide();
        this.elements.pinInput.value = '';
        this.disconnect();
    },
    
    /**
     * Obtener información del dispositivo
     */
    async getDeviceInfo() {
        try {
            const info = await BLEService.getDeviceInfo();
            this.elements.firmwareVersion.textContent = info.firmware || 'v2.3.016';
            
            const config = await BLEService.getConfiguration();
            this.updateConfigForm(config);
            
        } catch (error) {
            this.log('Error obteniendo información del dispositivo', 'error');
        }
    },
    
    /**
     * Enviar comando al dispositivo
     */
    async sendCommand(cmd) {
        try {
            this.log(`Enviando comando: ${cmd}`, 'info');
            await BLEService.sendCommand({ cmd });
            this.showSuccess(`Comando ${cmd} enviado`);
        } catch (error) {
            this.log(`Error enviando comando: ${error.message}`, 'error');
            this.showError('Error al enviar comando');
        }
    },
    
    /**
     * Iniciar streaming de datos
     */
    async startStreaming() {
        try {
            const duration = parseInt(this.elements.streamDuration.value);
            
            this.log(`Iniciando streaming por ${duration} segundos`, 'info');
            
            // Limpiar datos anteriores
            ChartService.clearData();
            this.streamingData = [];
            
            await BLEService.startStreaming(duration);
            
            this.isStreaming = true;
            this.elements.startStreamBtn.style.display = 'none';
            this.elements.stopStreamBtn.style.display = 'block';
            this.elements.stopStreamBtn.disabled = false;
            
            // Auto-detener después de la duración
            setTimeout(() => {
                if (this.isStreaming) {
                    this.stopStreaming();
                }
            }, duration * 1000);
            
        } catch (error) {
            this.log(`Error iniciando streaming: ${error.message}`, 'error');
            this.showError('Error al iniciar streaming');
        }
    },
    
    /**
     * Detener streaming de datos
     */
    async stopStreaming() {
        try {
            await BLEService.stopStreaming();
            
            this.isStreaming = false;
            this.elements.startStreamBtn.style.display = 'block';
            this.elements.stopStreamBtn.style.display = 'none';
            
            this.log('Streaming detenido', 'info');
            
            // Habilitar exportación si hay datos
            if (this.streamingData.length > 0) {
                document.querySelector('button[onclick="app.exportData()"]').disabled = false;
            }
            
        } catch (error) {
            this.log(`Error deteniendo streaming: ${error.message}`, 'error');
        }
    },
    
    /**
     * Guardar configuración
     */
    async saveConfig() {
        try {
            const config = {
                sampleRate: parseInt(this.elements.sampleRate.value),
                measureRange: parseInt(this.elements.measureRange.value),
                operationMode: this.elements.operationMode.value,
                saveInterval: parseInt(this.elements.saveInterval.value)
            };
            
            await BLEService.setConfiguration(config);
            this.showSuccess('Configuración guardada');
            this.log('Configuración actualizada', 'success');
            
        } catch (error) {
            this.log(`Error guardando configuración: ${error.message}`, 'error');
            this.showError('Error al guardar configuración');
        }
    },
    
    /**
     * Manejar cambio de conexión
     */
    handleConnectionChange(connected) {
        if (connected) {
            this.elements.connectionStatus.className = 'badge bg-success me-3';
            this.elements.connectionStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Conectado';
            this.elements.scanBtn.style.display = 'none';
            this.elements.disconnectBtn.style.display = 'inline-block';
            this.elements.deviceInfo.textContent = `Conectado a: ${this.currentDevice.name}`;
        } else {
            this.elements.connectionStatus.className = 'badge bg-danger me-3';
            this.elements.connectionStatus.innerHTML = '<i class="bi bi-circle-fill"></i> Desconectado';
            this.elements.scanBtn.style.display = 'inline-block';
            this.elements.disconnectBtn.style.display = 'none';
            this.elements.deviceInfo.textContent = 'No hay dispositivo conectado';
            
            // Deshabilitar controles
            this.disableControls();
        }
    },
    
    /**
     * Manejar datos recibidos
     */
    handleDataReceived(data) {
        // Actualizar valores actuales
        this.elements.currentX.textContent = data.x.toFixed(0);
        this.elements.currentY.textContent = data.y.toFixed(0);
        this.elements.currentZ.textContent = data.z.toFixed(0);
        
        // Agregar al gráfico
        ChartService.addData(data.x, data.y, data.z, data.timestamp);
        
        // Guardar para exportación
        if (this.isStreaming) {
            this.streamingData.push({
                timestamp: data.timestamp,
                x: data.x,
                y: data.y,
                z: data.z,
                xG: Utils.rawToG(data.x),
                yG: Utils.rawToG(data.y),
                zG: Utils.rawToG(data.z)
            });
        }
    },
    
    /**
     * Manejar actualización de estado
     */
    handleStatusUpdate(status) {
        // Actualizar estado del dispositivo
        if (status.state) {
            this.elements.deviceState.textContent = status.state;
            this.elements.deviceState.className = `badge bg-${this.getStatusColor(status.state)}`;
        }
        
        if (status.battery !== undefined) {
            this.elements.batteryLevel.textContent = status.battery;
        }
        
        if (status.temperature !== undefined) {
            this.elements.temperature.textContent = status.temperature.toFixed(1);
        }
        
        // Habilitar controles si está autenticado
        if (status.authenticated) {
            this.enableControls();
        }
    },
    
    /**
     * Manejar errores BLE
     */
    handleBLEError(error) {
        this.log(`Error BLE: ${error.message}`, 'error');
        this.showError(error.message);
    },
    
    /**
     * Exportar datos a CSV
     */
    exportData() {
        if (this.streamingData.length === 0) {
            this.showWarning('No hay datos para exportar');
            return;
        }
        
        const headers = ['timestamp', 'x_raw', 'y_raw', 'z_raw', 'x_g', 'y_g', 'z_g'];
        const csv = Utils.toCSV(this.streamingData, headers);
        
        const filename = `huella_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        Utils.downloadFile(filename, csv, 'text/csv');
        
        this.log(`Datos exportados: ${filename}`, 'success');
        this.showSuccess('Datos exportados exitosamente');
    },
    
    /**
     * Alternar tema
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },
    
    /**
     * Establecer tema
     */
    setTheme(theme) {
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Actualizar icono
        const icon = document.getElementById('themeIcon');
        icon.className = theme === 'light' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
        
        // Actualizar gráfico
        ChartService.updateTheme(theme);
        
        // Emitir evento
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    },
    
    /**
     * Cargar tema guardado
     */
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    },
    
    /**
     * Cargar dispositivos recientes
     */
    async loadRecentDevices() {
        try {
            const devices = await StorageService.getRecentDevices(5);
            // Aquí se podría mostrar una lista de dispositivos recientes
            if (devices.length > 0) {
                this.log(`${devices.length} dispositivos recientes encontrados`, 'info');
            }
        } catch (error) {
            this.log('Error cargando dispositivos recientes', 'error');
        }
    },
    
    /**
     * Log en consola de debug
     */
    log(message, level = 'info') {
        const timestamp = Utils.formatTime(Date.now());
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">${timestamp}</span><span class="log-level-${level}">[${level.toUpperCase()}]</span> ${message}`;
        
        this.elements.debugConsole.appendChild(logEntry);
        this.elements.debugConsole.scrollTop = this.elements.debugConsole.scrollHeight;
        
        // Guardar en storage
        StorageService.addLog(level, message);
        
        // También en consola del navegador
        console.log(`[${level.toUpperCase()}] ${message}`);
    },
    
    /**
     * Limpiar logs
     */
    clearLogs() {
        this.elements.debugConsole.innerHTML = '';
        this.log('Logs limpiados', 'info');
    },
    
    /**
     * Exportar logs
     */
    async exportLogs() {
        try {
            const logs = await StorageService.getLogs(1000);
            const csv = Utils.toCSV(logs, ['timestamp', 'level', 'message']);
            
            const filename = `huella_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
            Utils.downloadFile(filename, csv, 'text/csv');
            
            this.showSuccess('Logs exportados exitosamente');
        } catch (error) {
            this.showError('Error al exportar logs');
        }
    },
    
    /**
     * Mostrar mensaje de éxito
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    },
    
    /**
     * Mostrar mensaje de error
     */
    showError(message) {
        this.showToast(message, 'danger');
    },
    
    /**
     * Mostrar mensaje de advertencia
     */
    showWarning(message) {
        this.showToast(message, 'warning');
    },
    
    /**
     * Mostrar toast
     */
    showToast(message, type = 'info') {
        // Crear toast container si no existe
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '11';
            document.body.appendChild(toastContainer);
        }
        
        // Crear toast
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Mostrar toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Eliminar después de ocultar
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },
    
    /**
     * Habilitar controles
     */
    enableControls() {
        this.elements.controlButtons.forEach(btn => btn.disabled = false);
        this.elements.startStreamBtn.disabled = false;
        document.querySelectorAll('#configForm select, #configForm input').forEach(el => el.disabled = false);
        document.querySelector('button[onclick="app.saveConfig()"]').disabled = false;
    },
    
    /**
     * Deshabilitar controles
     */
    disableControls() {
        this.elements.controlButtons.forEach(btn => btn.disabled = true);
        this.elements.startStreamBtn.disabled = true;
        document.querySelectorAll('#configForm select, #configForm input').forEach(el => el.disabled = true);
        document.querySelector('button[onclick="app.saveConfig()"]').disabled = true;
        document.querySelector('button[onclick="app.exportData()"]').disabled = true;
    },
    
    /**
     * Actualizar formulario de configuración
     */
    updateConfigForm(config) {
        if (config.sampleRate) this.elements.sampleRate.value = config.sampleRate;
        if (config.measureRange) this.elements.measureRange.value = config.measureRange;
        if (config.operationMode) this.elements.operationMode.value = config.operationMode;
        if (config.saveInterval) this.elements.saveInterval.value = config.saveInterval;
    },
    
    /**
     * Obtener color según estado
     */
    getStatusColor(state) {
        const colors = {
            'IDLE': 'secondary',
            'READY': 'info',
            'RECORDING': 'success',
            'ERROR': 'danger',
            'STANDBY': 'warning'
        };
        return colors[state] || 'secondary';
    },
    
    /**
     * Manejar parámetros URL
     */
    handleUrlParams() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('action') === 'scan') {
            // Auto-escanear si viene de un shortcut
            setTimeout(() => this.scanDevices(), 1000);
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Exportar para uso global y debugging
window.app = app;
