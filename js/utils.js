/**
 * HUELLA BLE PWA - Utilidades comunes
 * Version: 2.0.1
 */

const Utils = {
    /**
     * Formatear timestamp a hora legible
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Hora formateada HH:MM:SS
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    /**
     * Formatear fecha completa
     * @param {number} timestamp - Unix timestamp
     * @returns {string} Fecha y hora formateada
     */
    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('es-ES');
    },

    /**
     * Generar UUID v4
     * @returns {string} UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Debounce function
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en ms
     * @returns {Function} Función con debounce
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Función a ejecutar
     * @param {number} limit - Límite de tiempo en ms
     * @returns {Function} Función con throttle
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Convertir ArrayBuffer a String hexadecimal
     * @param {ArrayBuffer} buffer - Buffer a convertir
     * @returns {string} String hexadecimal
     */
    bufferToHex(buffer) {
        return [...new Uint8Array(buffer)]
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
    },

    /**
     * Convertir String hexadecimal a ArrayBuffer
     * @param {string} hex - String hexadecimal
     * @returns {ArrayBuffer} ArrayBuffer
     */
    hexToBuffer(hex) {
        const bytes = hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16));
        return new Uint8Array(bytes).buffer;
    },

    /**
     * Parsear datos del acelerómetro (24-bit signed)
     * @param {DataView} dataView - DataView con los datos
     * @param {number} offset - Offset inicial
     * @returns {number} Valor parseado
     */
    parse24BitSigned(dataView, offset) {
        const byte1 = dataView.getUint8(offset);
        const byte2 = dataView.getUint8(offset + 1);
        const byte3 = dataView.getUint8(offset + 2);
        
        let value = (byte1 << 16) | (byte2 << 8) | byte3;
        
        // Convertir a signed si es necesario
        if (value & 0x800000) {
            value |= 0xFF000000;
        }
        
        return value;
    },

    /**
     * Convertir valor raw del acelerómetro a g
     * @param {number} rawValue - Valor raw del sensor
     * @param {number} factor - Factor de calibración (default: 3.814697266E-06)
     * @returns {number} Valor en g
     */
    rawToG(rawValue, factor = 3.814697266E-06) {
        return rawValue * factor;
    },

    /**
     * Descargar datos como archivo
     * @param {string} filename - Nombre del archivo
     * @param {string} content - Contenido del archivo
     * @param {string} type - Tipo MIME
     */
    downloadFile(filename, content, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Convertir datos a CSV
     * @param {Array} data - Array de objetos con datos
     * @param {Array} headers - Headers del CSV
     * @returns {string} String CSV
     */
    toCSV(data, headers) {
        if (!data || data.length === 0) return '';
        
        // Si no se especifican headers, usar las keys del primer objeto
        if (!headers) {
            headers = Object.keys(data[0]);
        }
        
        // Crear CSV
        let csv = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                // Escapar valores que contengan comas
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value ?? '';
            });
            csv += values.join(',') + '\n';
        });
        
        return csv;
    },

    /**
     * Sleep/delay async
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise} Promesa que se resuelve después del delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Retry function con exponential backoff
     * @param {Function} fn - Función a ejecutar
     * @param {number} retries - Número de reintentos
     * @param {number} delay - Delay inicial en ms
     * @returns {Promise} Resultado de la función
     */
    async retry(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries <= 0) throw error;
            
            console.warn(`Retry attempt ${4 - retries}/3 after ${delay}ms`);
            await this.sleep(delay);
            
            return this.retry(fn, retries - 1, delay * 2);
        }
    },

    /**
     * Validar PIN (6 dígitos)
     * @param {string} pin - PIN a validar
     * @returns {boolean} True si es válido
     */
    validatePin(pin) {
        return /^\d{6}$/.test(pin);
    },

    /**
     * Formatear bytes a tamaño legible
     * @param {number} bytes - Cantidad de bytes
     * @param {number} decimals - Decimales a mostrar
     * @returns {string} Tamaño formateado
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Clonar objeto profundamente
     * @param {Object} obj - Objeto a clonar
     * @returns {Object} Objeto clonado
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Verificar si el navegador soporta Web Bluetooth
     * @returns {boolean} True si soporta
     */
    isWebBluetoothSupported() {
        return navigator.bluetooth !== undefined;
    },

    /**
     * Verificar si está en modo PWA
     * @returns {boolean} True si está en modo standalone
     */
    isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    },

    /**
     * Obtener información del navegador
     * @returns {Object} Información del navegador
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (ua.includes('Chrome')) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Firefox')) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Safari')) {
            browser = 'Safari';
            version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Edge')) {
            browser = 'Edge';
            version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
        }
        
        return {
            browser,
            version,
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language
        };
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
