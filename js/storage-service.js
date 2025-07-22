/**
 * HUELLA BLE PWA - Servicio de almacenamiento
 * Version: 2.0.1
 * IndexedDB + localStorage para datos offline
 */

const StorageService = {
    // Configuración de la base de datos
    dbName: 'HuellaBLEDB',
    dbVersion: 2,
    db: null,
    
    // Nombres de las stores
    stores: {
        devices: 'devices',
        streamingData: 'streamingData',
        configurations: 'configurations',
        logs: 'logs'
    },
    
    // Límites de almacenamiento
    maxStreamingRecords: 10000,
    maxLogRecords: 1000,
    
    /**
     * Inicializar el servicio de almacenamiento
     */
    async init() {
        try {
            // Verificar soporte de IndexedDB
            if (!('indexedDB' in window)) {
                console.error('IndexedDB no está soportado');
                return false;
            }
            
            // Abrir base de datos
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Error abriendo IndexedDB:', request.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB inicializado correctamente');
                this.cleanupOldData();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear stores si no existen
                if (!db.objectStoreNames.contains(this.stores.devices)) {
                    const devicesStore = db.createObjectStore(this.stores.devices, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    devicesStore.createIndex('address', 'address', { unique: true });
                    devicesStore.createIndex('lastConnected', 'lastConnected', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.stores.streamingData)) {
                    const dataStore = db.createObjectStore(this.stores.streamingData, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    dataStore.createIndex('timestamp', 'timestamp', { unique: false });
                    dataStore.createIndex('sessionId', 'sessionId', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.stores.configurations)) {
                    const configStore = db.createObjectStore(this.stores.configurations, { 
                        keyPath: 'id' 
                    });
                    configStore.createIndex('deviceId', 'deviceId', { unique: false });
                    configStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains(this.stores.logs)) {
                    const logsStore = db.createObjectStore(this.stores.logs, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    logsStore.createIndex('level', 'level', { unique: false });
                }
                
                console.log('IndexedDB estructura actualizada');
            };
            
            return true;
        } catch (error) {
            console.error('Error inicializando StorageService:', error);
            return false;
        }
    },
    
    /**
     * Guardar dispositivo reciente
     */
    async saveDevice(device) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.stores.devices], 'readwrite');
            const store = transaction.objectStore(this.stores.devices);
            
            const deviceData = {
                address: device.id || device.address,
                name: device.name,
                lastConnected: Date.now(),
                rssi: device.rssi,
                firmwareVersion: device.firmwareVersion || null
            };
            
            // Buscar si ya existe
            const index = store.index('address');
            const existingDevice = await this.promisifyRequest(index.get(deviceData.address));
            
            if (existingDevice) {
                deviceData.id = existingDevice.id;
                deviceData.firstConnected = existingDevice.firstConnected;
            } else {
                deviceData.firstConnected = Date.now();
            }
            
            await this.promisifyRequest(store.put(deviceData));
            console.log('Dispositivo guardado:', deviceData.name);
            
        } catch (error) {
            console.error('Error guardando dispositivo:', error);
        }
    },
    
    /**
     * Obtener dispositivos recientes
     */
    async getRecentDevices(limit = 10) {
        if (!this.db) return [];
        
        try {
            const transaction = this.db.transaction([this.stores.devices], 'readonly');
            const store = transaction.objectStore(this.stores.devices);
            const index = store.index('lastConnected');
            
            const devices = [];
            const cursorRequest = index.openCursor(null, 'prev');
            
            return new Promise((resolve, reject) => {
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && devices.length < limit) {
                        devices.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(devices);
                    }
                };
                
                cursorRequest.onerror = () => reject(cursorRequest.error);
            });
            
        } catch (error) {
            console.error('Error obteniendo dispositivos:', error);
            return [];
        }
    },
    
    /**
     * Guardar datos de streaming
     */
    async addStreamingData(data) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.stores.streamingData], 'readwrite');
            const store = transaction.objectStore(this.stores.streamingData);
            
            const record = {
                timestamp: data.timestamp || Date.now(),
                sessionId: data.sessionId || this.getCurrentSessionId(),
                x: data.x,
                y: data.y,
                z: data.z,
                temperature: data.temperature,
                xG: Utils.rawToG(data.x),
                yG: Utils.rawToG(data.y),
                zG: Utils.rawToG(data.z)
            };
            
            await this.promisifyRequest(store.add(record));
            
            // Verificar límite de registros
            const count = await this.promisifyRequest(store.count());
            if (count > this.maxStreamingRecords) {
                this.cleanupStreamingData();
            }
            
        } catch (error) {
            console.error('Error guardando datos de streaming:', error);
        }
    },
    
    /**
     * Obtener datos de streaming
     */
    async getStreamingData(sessionId = null, limit = 1000) {
        if (!this.db) return [];
        
        try {
            const transaction = this.db.transaction([this.stores.streamingData], 'readonly');
            const store = transaction.objectStore(this.stores.streamingData);
            
            let request;
            if (sessionId) {
                const index = store.index('sessionId');
                request = index.getAll(sessionId);
            } else {
                // Obtener los últimos registros
                const data = [];
                const cursorRequest = store.openCursor(null, 'prev');
                
                return new Promise((resolve, reject) => {
                    cursorRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && data.length < limit) {
                            data.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve(data.reverse());
                        }
                    };
                    
                    cursorRequest.onerror = () => reject(cursorRequest.error);
                });
            }
            
            return await this.promisifyRequest(request);
            
        } catch (error) {
            console.error('Error obteniendo datos de streaming:', error);
            return [];
        }
    },
    
    /**
     * Guardar configuración
     */
    async saveConfiguration(config) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.stores.configurations], 'readwrite');
            const store = transaction.objectStore(this.stores.configurations);
            
            const configData = {
                id: `config_${config.deviceId}_${Date.now()}`,
                deviceId: config.deviceId,
                timestamp: Date.now(),
                config: config
            };
            
            await this.promisifyRequest(store.put(configData));
            console.log('Configuración guardada');
            
            // También guardar en localStorage para acceso rápido
            localStorage.setItem('lastConfig', JSON.stringify(config));
            
        } catch (error) {
            console.error('Error guardando configuración:', error);
        }
    },
    
    /**
     * Obtener última configuración
     */
    async getLastConfiguration(deviceId = null) {
        // Primero intentar desde localStorage
        const cached = localStorage.getItem('lastConfig');
        if (cached && !deviceId) {
            return JSON.parse(cached);
        }
        
        if (!this.db) return null;
        
        try {
            const transaction = this.db.transaction([this.stores.configurations], 'readonly');
            const store = transaction.objectStore(this.stores.configurations);
            
            if (deviceId) {
                const index = store.index('deviceId');
                const configs = await this.promisifyRequest(index.getAll(deviceId));
                return configs.length > 0 ? configs[configs.length - 1].config : null;
            } else {
                const configs = await this.promisifyRequest(store.getAll());
                return configs.length > 0 ? configs[configs.length - 1].config : null;
            }
            
        } catch (error) {
            console.error('Error obteniendo configuración:', error);
            return null;
        }
    },
    
    /**
     * Agregar log
     */
    async addLog(level, message, data = null) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.stores.logs], 'readwrite');
            const store = transaction.objectStore(this.stores.logs);
            
            const logEntry = {
                timestamp: Date.now(),
                level: level,
                message: message,
                data: data
            };
            
            await this.promisifyRequest(store.add(logEntry));
            
            // Verificar límite
            const count = await this.promisifyRequest(store.count());
            if (count > this.maxLogRecords) {
                this.cleanupLogs();
            }
            
        } catch (error) {
            console.error('Error guardando log:', error);
        }
    },
    
    /**
     * Obtener logs
     */
    async getLogs(limit = 100, level = null) {
        if (!this.db) return [];
        
        try {
            const transaction = this.db.transaction([this.stores.logs], 'readonly');
            const store = transaction.objectStore(this.stores.logs);
            
            const logs = [];
            let cursorRequest;
            
            if (level) {
                const index = store.index('level');
                cursorRequest = index.openCursor(level, 'prev');
            } else {
                cursorRequest = store.openCursor(null, 'prev');
            }
            
            return new Promise((resolve, reject) => {
                cursorRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && logs.length < limit) {
                        logs.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(logs);
                    }
                };
                
                cursorRequest.onerror = () => reject(cursorRequest.error);
            });
            
        } catch (error) {
            console.error('Error obteniendo logs:', error);
            return [];
        }
    },
    
    /**
     * Limpiar todos los datos
     */
    async clearAllData() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(
                Object.values(this.stores), 
                'readwrite'
            );
            
            for (const storeName of Object.values(this.stores)) {
                const store = transaction.objectStore(storeName);
                await this.promisifyRequest(store.clear());
            }
            
            console.log('Todos los datos han sido eliminados');
            
        } catch (error) {
            console.error('Error limpiando datos:', error);
        }
    },
    
    /**
     * Limpiar datos antiguos
     */
    async cleanupOldData() {
        // Limpiar datos de streaming antiguos (más de 7 días)
        await this.cleanupStreamingData(7 * 24 * 60 * 60 * 1000);
        
        // Limpiar logs antiguos (más de 30 días)
        await this.cleanupLogs(30 * 24 * 60 * 60 * 1000);
    },
    
    /**
     * Limpiar datos de streaming antiguos
     */
    async cleanupStreamingData(olderThan = null) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.stores.streamingData], 'readwrite');
            const store = transaction.objectStore(this.stores.streamingData);
            const index = store.index('timestamp');
            
            const cutoffTime = olderThan ? Date.now() - olderThan : 0;
            const range = IDBKeyRange.upperBound(cutoffTime);
            
            const cursorRequest = index.openCursor(range);
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
            
        } catch (error) {
            console.error('Error limpiando datos antiguos:', error);
        }
    },
    
    /**
     * Limpiar logs antiguos
     */
    async cleanupLogs(olderThan = null) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction([this.stores.logs], 'readwrite');
            const store = transaction.objectStore(this.stores.logs);
            const index = store.index('timestamp');
            
            const cutoffTime = olderThan ? Date.now() - olderThan : 0;
            const range = IDBKeyRange.upperBound(cutoffTime);
            
            const cursorRequest = index.openCursor(range);
            
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };
            
        } catch (error) {
            console.error('Error limpiando logs antiguos:', error);
        }
    },
    
    /**
     * Utilidad para convertir request a Promise
     */
    promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Obtener ID de sesión actual
     */
    getCurrentSessionId() {
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    },
    
    /**
     * Obtener estadísticas de almacenamiento
     */
    async getStorageStats() {
        if (!this.db) return null;
        
        try {
            const stats = {};
            const transaction = this.db.transaction(Object.values(this.stores), 'readonly');
            
            for (const storeName of Object.values(this.stores)) {
                const store = transaction.objectStore(storeName);
                const count = await this.promisifyRequest(store.count());
                stats[storeName] = count;
            }
            
            // Estimar uso de almacenamiento
            if ('estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                stats.usage = estimate.usage;
                stats.quota = estimate.quota;
                stats.percentage = (estimate.usage / estimate.quota * 100).toFixed(2);
            }
            
            return stats;
            
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return null;
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.StorageService = StorageService;
}
