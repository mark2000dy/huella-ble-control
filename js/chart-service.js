/**
 * HUELLA BLE PWA - Servicio de gráficos en tiempo real
 * Version: 2.0.1
 * Chart.js para visualización de datos del acelerómetro
 */

const ChartService = {
    // Referencias
    chart: null,
    canvas: null,
    ctx: null,
    
    // Configuración
    maxDataPoints: 500,
    updateInterval: 100, // ms
    
    // Buffers de datos
    dataBuffer: {
        x: [],
        y: [],
        z: [],
        timestamps: []
    },
    
    // Control de actualización
    lastUpdate: 0,
    isUpdating: false,
    
    /**
     * Inicializar el servicio de gráficos
     */
    init(canvasId) {
        try {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                throw new Error(`Canvas ${canvasId} no encontrado`);
            }
            
            this.ctx = this.canvas.getContext('2d');
            
            // Configuración del gráfico
            const config = {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Eje X',
                            data: [],
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            borderWidth: 2,
                            tension: 0.1,
                            pointRadius: 0
                        },
                        {
                            label: 'Eje Y',
                            data: [],
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            borderWidth: 2,
                            tension: 0.1,
                            pointRadius: 0
                        },
                        {
                            label: 'Eje Z',
                            data: [],
                            borderColor: '#007bff',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            borderWidth: 2,
                            tension: 0.1,
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0 // Desactivar animaciones para mejor rendimiento
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'second',
                                displayFormats: {
                                    second: 'HH:mm:ss'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Tiempo'
                            },
                            ticks: {
                                source: 'auto',
                                autoSkip: true,
                                maxRotation: 0
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Aceleración (g)'
                            },
                            beginAtZero: false
                        }
                    }
                }
            };
            
            // Crear el gráfico
            this.chart = new Chart(this.ctx, config);
            
            // Aplicar tema
            this.updateTheme(document.body.getAttribute('data-theme') || 'light');
            
            console.log('Chart Service inicializado');
            return true;
            
        } catch (error) {
            console.error('Error inicializando Chart Service:', error);
            return false;
        }
    },
    
    /**
     * Agregar datos al gráfico
     */
    addData(x, y, z, timestamp = null) {
        const now = timestamp || Date.now();
        
        // Agregar a buffer
        this.dataBuffer.x.push(Utils.rawToG(x));
        this.dataBuffer.y.push(Utils.rawToG(y));
        this.dataBuffer.z.push(Utils.rawToG(z));
        this.dataBuffer.timestamps.push(now);
        
        // Mantener tamaño máximo del buffer
        if (this.dataBuffer.x.length > this.maxDataPoints) {
            this.dataBuffer.x.shift();
            this.dataBuffer.y.shift();
            this.dataBuffer.z.shift();
            this.dataBuffer.timestamps.shift();
        }
        
        // Actualizar gráfico con throttling
        const currentTime = Date.now();
        if (currentTime - this.lastUpdate > this.updateInterval && !this.isUpdating) {
            this.updateChart();
            this.lastUpdate = currentTime;
        }
    },
    
    /**
     * Actualizar el gráfico
     */
    updateChart() {
        if (!this.chart || this.isUpdating) return;
        
        this.isUpdating = true;
        
        try {
            // Actualizar labels
            this.chart.data.labels = this.dataBuffer.timestamps;
            
            // Actualizar datasets
            this.chart.data.datasets[0].data = this.dataBuffer.x;
            this.chart.data.datasets[1].data = this.dataBuffer.y;
            this.chart.data.datasets[2].data = this.dataBuffer.z;
            
            // Actualizar sin animación
            this.chart.update('none');
            
        } catch (error) {
            console.error('Error actualizando gráfico:', error);
        } finally {
            this.isUpdating = false;
        }
    },
    
    /**
     * Limpiar datos del gráfico
     */
    clearData() {
        // Limpiar buffers
        this.dataBuffer.x = [];
        this.dataBuffer.y = [];
        this.dataBuffer.z = [];
        this.dataBuffer.timestamps = [];
        
        // Limpiar gráfico
        if (this.chart) {
            this.chart.data.labels = [];
            this.chart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            this.chart.update('none');
        }
        
        console.log('Datos del gráfico limpiados');
    },
    
    /**
     * Actualizar tema del gráfico
     */
    updateTheme(theme) {
        if (!this.chart) return;
        
        const isDark = theme === 'dark';
        
        // Colores según el tema
        const textColor = isDark ? '#f0f0f0' : '#212529';
        const gridColor = isDark ? '#2d3748' : '#dee2e6';
        
        // Actualizar opciones del gráfico
        this.chart.options.plugins.legend.labels.color = textColor;
        this.chart.options.scales.x.title.color = textColor;
        this.chart.options.scales.x.ticks.color = textColor;
        this.chart.options.scales.x.grid.color = gridColor;
        this.chart.options.scales.y.title.color = textColor;
        this.chart.options.scales.y.ticks.color = textColor;
        this.chart.options.scales.y.grid.color = gridColor;
        
        this.chart.update();
    },
    
    /**
     * Cambiar rango del eje Y
     */
    setYRange(min, max) {
        if (!this.chart) return;
        
        this.chart.options.scales.y.min = min;
        this.chart.options.scales.y.max = max;
        this.chart.update();
    },
    
    /**
     * Auto-escalar eje Y
     */
    autoScale() {
        if (!this.chart || this.dataBuffer.x.length === 0) return;
        
        // Encontrar min y max de todos los datos
        const allData = [
            ...this.dataBuffer.x,
            ...this.dataBuffer.y,
            ...this.dataBuffer.z
        ];
        
        const min = Math.min(...allData);
        const max = Math.max(...allData);
        
        // Agregar margen del 10%
        const margin = (max - min) * 0.1;
        
        this.setYRange(min - margin, max + margin);
    },
    
    /**
     * Cambiar visibilidad de un dataset
     */
    toggleDataset(index) {
        if (!this.chart || !this.chart.data.datasets[index]) return;
        
        const dataset = this.chart.data.datasets[index];
        dataset.hidden = !dataset.hidden;
        this.chart.update();
    },
    
    /**
     * Obtener imagen del gráfico
     */
    getImage(type = 'png') {
        if (!this.canvas) return null;
        
        return this.canvas.toDataURL(`image/${type}`);
    },
    
    /**
     * Destruir el gráfico
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        
        this.clearData();
        console.log('Chart Service destruido');
    },
    
    /**
     * Redimensionar gráfico
     */
    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    },
    
    /**
     * Obtener estadísticas de los datos
     */
    getStats() {
        if (this.dataBuffer.x.length === 0) {
            return null;
        }
        
        const calculateStats = (data) => {
            const sum = data.reduce((a, b) => a + b, 0);
            const mean = sum / data.length;
            const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
            const stdDev = Math.sqrt(variance);
            
            return {
                min: Math.min(...data),
                max: Math.max(...data),
                mean: mean,
                stdDev: stdDev,
                rms: Math.sqrt(data.reduce((acc, val) => acc + val * val, 0) / data.length)
            };
        };
        
        return {
            x: calculateStats(this.dataBuffer.x),
            y: calculateStats(this.dataBuffer.y),
            z: calculateStats(this.dataBuffer.z),
            samples: this.dataBuffer.x.length
        };
    },
    
    /**
     * Configurar opciones del gráfico
     */
    setOptions(options) {
        if (!this.chart) return;
        
        // Merge opciones
        Object.assign(this.chart.options, options);
        this.chart.update();
    }
};

// Manejar cambios de tema global
window.addEventListener('theme-changed', (event) => {
    ChartService.updateTheme(event.detail.theme);
});

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ChartService = ChartService;
}
