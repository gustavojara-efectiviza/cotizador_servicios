import { exportarAExcelAuditable } from './src/utils/excelExport.js';
import fs from 'fs';

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

global.window = {};
global.Blob = class Blob { 
    constructor(d) { this.buffer = d[0]; } 
};

// Mock fileSaver
let lastBuffer = null;
import fileSaver from 'file-saver';
fileSaver.saveAs = (blob, filename) => {
    console.log('Intercepted saveAs. Saving to disk as ' + filename);
    fs.writeFileSync(filename, Buffer.from(blob.buffer));
};

exportarAExcelAuditable(mockEstado)
  .then(() => console.log('Export succeeded'))
  .catch(e => {
     console.error('EXPORT FAILED:', e);
  });
