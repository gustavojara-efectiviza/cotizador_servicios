import { exportarAExcelAuditable } from './src/utils/excelExport.js';

const mockEstado = {
  cliente: 'Test',
  proyecto: 'Test',
  equipos: [],
  servicios: [
    {
      descripcion: 'Test Service',
      cantidad: 1,
      costoBase: 100,
      costoTotalReal: 100,
      precioVentaNeto: 120,
      precioVentaConIVA: 132,
      margen: 0.2,
      logAsignada: 10,
      impAsignado: 5,
      ssmaAsignado: 0,
      subtotalDirectoTotal: 85
    }
  ],
  alquileres: []
};

// Mock document and window if needed, but since it's just exceljs it might work in node, 
// except file-saver uses window.
// We can mock it:
global.window = {};
global.Blob = class Blob { constructor(d) { this.d = d; } };

exportarAExcelAuditable(mockEstado).then(() => console.log('Export succeeded')).catch(e => console.error('EXPORT FAILED:', e));
