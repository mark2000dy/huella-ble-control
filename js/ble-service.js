/**
 * HUELLA BLE PWA - Servicio de comunicación Bluetooth Low Energy
 * Version: 2.0.1
 * Compatible con firmware CTIM3 v2.3.016
 */

const BLEService = {
    // UUIDs del servicio y características (del firmware v3)
    SERVICE_UUID: '12345678-1234-5678-1234-56789abcdef0',
    CHARACTERISTICS: {
        CMD:    '12345678-1234-5678-1234-56789abcdef1',  // Write
        STATUS: '12345678-1234-5678-1234-56789abcdef2',  // Read/Notify
        DATA:   '12345678-1234-5678-1234-56789abcdef3',  // Notify
        CONFIG: '12345678-1234-5678-1234-56789abcdef4',  // Read/Write
        INFO:   '12345678-1234-5678-1234-56789abcdef5',  // Read
        PARAMS: '12345678-1234-5678-1234-56789abcdef6',  // Read/Write
        SYNC:   '12345678-1234-5678-1234-56789abcdef7'   // Read/Notify
    },
    
    // Estado del servicio
    device: null,
    server: null,
    service: null,
    characteristics: {},
    
    // Estados
    isConnected: false,
    isAuthenticated: false,
    isStreaming: false,
    
    // Callbacks
    onConnectionChange: null,
    onDataReceived: null,
    onStatusUpdate: null,
    onError: null,
    
    // Configuración
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,
    
    /**
     * Inicializar el servicio BLE
     */
    init(callbacks = {}) {
        // Verificar soporte de Web Bluetooth
        if (!navigator.bluetooth) {
            console.error('Web Bluetooth no está soportado en este navegador');
            return false;
        }
        
        // Configurar callbacks
        this.onConnectionChange = callbacks.onConnectionChange || (() => {});
        this.onDataReceived = callbacks.onDataReceived || (() => {});
        this.onStatusUpdate = callbacks.onStatusUpdate || (() => {});
        this.onError = callbacks.onError || (() => {});
        
        console.log('BLE Service inicializado');
        return true;
    },
    
    /**
     * Escanear dispositivos BLE
     */
    async scanDevices() {
        try {
            console.log('Iniciando escaneo BLE...');
            
            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'HUELLA_' }
                ],
                optionalServices: [this.SERVICE_UUID]
            });
            
            console.log('Dispositivo seleccionado:', device.name);
            this.device = device;
            
            // Configurar evento de desconexión
            device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });
            
            return device;
            
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error('No se encontraron dispositivos HUELLA');
            } else if (error.name === 'SecurityError') {
                throw new Error('Permiso denegado para acceder a Bluetooth');
            } else {
                throw error;
            }
        }
    },
    
    /**
     * Conectar al dispositivo
     */
    async connect(device = null) {
        try {
            if (device) {
                this.device = device;
            }
            
            if (!this.device) {
                throw new Error('No hay dispositivo seleccionado');
            }
            
            console.log('Conectando a GATT Server...');
            this.server = await this.device.gatt.connect();
            
            console.log('Obteniendo servicio principal...');
            this.service = await this.server.getPrimaryService(this.SERVICE_UUID);
            
            console.log('Obteniendo características...');
            await this.getCharacteristics();
            
            // Suscribirse a notificaciones
            await this.subscribeToNotifications();
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Guardar dispositivo en storage
            await StorageService.saveDevice(this.device);
            
            this.onConnectionChange(true);
            console.log('Conexión establecida exitosamente');
            
            return true;
            
        } catch (error) {
            console.error('Error al conectar:', error);
            this.onError(error);
            throw error;
        }
    },
    
    /**
     * Obtener todas las características
     */
    async getCharacteristics() {
        try {
            for (const [name, uuid] of Object.entries(this.CHARACTERISTICS)) {
                try {
                    const characteristic = await this.service.getCharacteristic(uuid);
                    this.characteristics[name] = characteristic;
                    console.log(`Característica ${name} obtenida`);
                } catch (error) {
                    console.warn(`Característica ${name} no disponible:`, error);
                }
            }
        } catch (error) {
            console.error('Error obteniendo características:', error);
            throw error;
        }
    },
    
    /**
     * Suscribirse a notificaciones
     */
    async subscribeToNotifications() {
        try {
            // Suscribirse a STATUS
            if (this.characteristics.STATUS) {
                await this.characteristics.STATUS.startNotifications();
                this.characteristics.STATUS.addEventListener('characteristicvaluechanged', 
                    (event) => this.handleStatusNotification(event));
                console.log('Suscrito a notificaciones de STATUS');
            }
            
            // Suscribirse a DATA
            if (this.characteristics.DATA) {
                await this.characteristics.DATA.startNotifications();
                this.characteristics.DATA.addEventListener('characteristicvaluechanged', 
                    (event) => this.handleDataNotification(event));
                console.log('Suscrito a notificaciones de DATA');
            }
            
            // Suscribirse a SYNC si está disponible
            if (this.characteristics.SYNC) {
                await this.characteristics.SYNC.startNotifications();
                this.characteristics.SYNC.addEventListener('characteristicvaluechanged', 
                    (event) => this.handleSyncNotification(event));
                console.log('Suscrito a notificaciones de SYNC');
            }
            
        } catch (error) {
            console.error('Error suscribiendo a notificaciones:', error);
            throw error;
        }
    },
    
    /**
     * Desconectar del dispositivo
     */
    async disconnect() {
        try {
            if (this.server && this.server.connected) {
                await this.server.disconnect();
            }
            
            this.cleanup();
            console.log('Desconectado del dispositivo');
            
        } catch (error) {
            console.error('Error al desconectar:', error);
        }
    },
    
    /**
     * Autenticar con PIN
     */
    async authenticate(pin) {
        if (!this.isConnected || !this.characteristics.CMD) {
            throw new Error('No conectado o característica CMD no disponible');
        }
        
        try {
            const command = {
                cmd: 'AUTH',
                pin: pin
            };
            
            const response = await this.sendCommand(command);
            
            if (response && response.status === 'authenticated') {
                this.isAuthenticated = true;
                console.log('Autenticación exitosa');
                return true;
            } else {
                throw new Error('PIN incorrecto');
            }
            
        } catch (error) {
            console.error('Error de autenticación:', error);
            throw error;
        }
    },
    
    /**
     * Enviar comando al dispositivo
     */
    async sendCommand(command) {
        if (!this.characteristics.CMD) {
            throw new Error('Característica CMD no disponible');
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(command));
            
            // Verificar tamaño máximo
            if (data.length > 512) {
                throw new Error('Comando demasiado grande');
            }
            
            await this.characteristics.CMD.writeValueWithResponse(data);
            console.log('Comando enviado:', command.cmd);
            
            // Esperar respuesta si es necesario
            if (command.cmd === 'AUTH' || command.cmd === 'GET_INFO') {
                return await this.waitForResponse(command.cmd, 5000);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error enviando comando:', error);
            throw error;
        }
    },
    
    /**
     * Obtener información del dispositivo
     */
    async getDeviceInfo() {
        if (!this.characteristics.INFO) {
            throw new Error('Característica INFO no disponible');
        }
        
        try {
            const value = await this.characteristics.INFO.readValue();
            const decoder = new TextDecoder();
            const info = JSON.parse(decoder.decode(value));
            
            console.log('Información del dispositivo:', info);
            return info;
            
        } catch (error) {
            console.error('Error obteniendo información:', error);
            throw error;
        }
    },
    
    /**
     * Obtener configuración actual
     */
    async getConfiguration() {
        if (!this.characteristics.CONFIG) {
            throw new Error('Característica CONFIG no disponible');
        }
        
        try {
            const value = await this.characteristics.CONFIG.readValue();
            const decoder = new TextDecoder();
            const config = JSON.parse(decoder.decode(value));
            
            console.log('Configuración actual:', config);
            return config;
            
        } catch (error) {
            console.error('Error obteniendo configuración:', error);
            throw error;
        }
    },
    
    /**
     * Establecer configuración
     */
    async setConfiguration(config) {
        if (!this.characteristics.CONFIG) {
            throw new Error('Característica CONFIG no disponible');
        }
        
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(config));
            
            if (data.length > 512) {
                throw new Error('Configuración demasiado grande');
            }
            
            await this.characteristics.CONFIG.writeValueWithResponse(data);
            console.log('Configuración actualizada');
            
            // Guardar en storage
            await StorageService.saveConfiguration(config);
            
            return true;
            
        } catch (error) {
            console.error('Error estableciendo configuración:', error);
            throw error;
        }
    },
    
    /**
     * Iniciar streaming de datos
     */
    async startStreaming(duration = 30) {
        try {
            const command = {
                cmd: 'STREAM_START',
                duration: duration
            };
            
            await this.sendCommand(command);
            this.isStreaming = true;
            
            console.log(`Streaming iniciado por ${duration} segundos`);
            
            // Auto-detener después de la duración
            setTimeout(() => {
                if (this.isStreaming) {
                    this.stopStreaming();
                }
            }, duration * 1000);
            
            return true;
            
        } catch (error) {
            console.error('Error iniciando streaming:', error);
            throw error;
        }
    },
    
    /**
     * Detener streaming de datos
     */
    async stopStreaming() {
        try {
            const command = {
                cmd: 'STREAM_STOP'
            };
            
            await this.sendCommand(command);
            this.isStreaming = false;
            
            console.log('Streaming detenido');
            return true;
            
        } catch (error) {
            console.error('Error deteniendo streaming:', error);
            throw error;
        }
    },
    
    /**
     * Manejar notificación de STATUS
     */
    handleStatusNotification(event) {
        try {
            const value = event.target.value;
            const decoder = new TextDecoder();
            const statusJson = decoder.decode(value);
            const status = JSON.parse(statusJson);
            
            console.log('Status recibido:', status);
            this.onStatusUpdate(status);
            
            // Emitir evento para promesas esperando
            if (this.responseCallbacks[status.response]) {
                this.responseCallbacks[status.response](status);
                delete this.responseCallbacks[status.response];
            }
            
        } catch (error) {
            console.error('Error procesando notificación de status:', error);
        }
    },
    
    /**
     * Manejar notificación de DATA
     */
    handleDataNotification(event) {
        try {
            const value = event.target.value;
            const dataView = new DataView(value.buffer);
            
            // Parsear datos del acelerómetro (formato del firmware)
            // 3 ejes * 3 bytes (24-bit) + 1 byte checksum = 10 bytes
            if (value.byteLength >= 10) {
                const x = Utils.parse24BitSigned(dataView, 0);
                const y = Utils.parse24BitSigned(dataView, 3);
                const z = Utils.parse24BitSigned(dataView, 6);
                
                const data = {
                    x: x,
                    y: y,
                    z: z,
                    timestamp: Date.now()
                };
                
                // Guardar en storage y emitir
                StorageService.addStreamingData(data);
                this.onDataReceived(data);
            }
            
        } catch (error) {
            console.error('Error procesando notificación de datos:', error);
        }
    },
    
    /**
     * Manejar notificación de SYNC
     */
    handleSyncNotification(event) {
        try {
            const value = event.target.value;
            const decoder = new TextDecoder();
            const syncData = JSON.parse(decoder.decode(value));
            
            console.log('Sync recibido:', syncData);
            // Procesar sincronización completa del dispositivo
            
        } catch (error) {
            console.error('Error procesando notificación de sync:', error);
        }
    },
    
    /**
     * Manejar desconexión
     */
    handleDisconnection() {
        console.log('Dispositivo desconectado');
        
        const wasAuthenticated = this.isAuthenticated;
        this.cleanup();
        
        // Intentar reconectar si estaba autenticado
        if (wasAuthenticated && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.reconnect();
            }, 2000);
        }
    },
    
    /**
     * Reconectar al dispositivo
     */
    async reconnect() {
        try {
            if (!this.device) {
                throw new Error('No hay dispositivo para reconectar');
            }
            
            await this.connect();
            
            // Re-autenticar si tenemos el PIN guardado
            const savedPin = sessionStorage.getItem('devicePin');
            if (savedPin) {
                await this.authenticate(savedPin);
            }
            
        } catch (error) {
            console.error('Error al reconectar:', error);
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.reconnect(), 5000);
            } else {
                this.onError(new Error('No se pudo reconectar al dispositivo'));
            }
        }
    },
    
    /**
     * Limpiar estado
     */
    cleanup() {
        this.isConnected = false;
        this.isAuthenticated = false;
        this.isStreaming = false;
        this.characteristics = {};
        this.service = null;
        this.server = null;
        
        this.onConnectionChange(false);
    },
    
    /**
     * Esperar respuesta con timeout
     */
    responseCallbacks: {},
    
    waitForResponse(command, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                delete this.responseCallbacks[command];
                reject(new Error(`Timeout esperando respuesta de ${command}`));
            }, timeout);
            
            this.responseCallbacks[command] = (response) => {
                clearTimeout(timer);
                resolve(response);
            };
        });
    },
    
    /**
     * Obtener estado del servicio
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            isAuthenticated: this.isAuthenticated,
            isStreaming: this.isStreaming,
            deviceName: this.device?.name || null,
            deviceId: this.device?.id || null
        };
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.BLEService = BLEService;
}
