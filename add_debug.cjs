const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/Bloque3_Resumen.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

const idx = lines.findIndex(l => l.includes('await exportarAExcelAuditable(estadoGlobal)'));

// Insert debug log before the export call
const debugLine = `    console.log('DEBUG EXPORT - equiposProcesados count:', resultadosSSTT?.equiposProcesados?.length, 'serviciosAdaptados count:', serviciosAdaptados.length, 'first item costoFee:', serviciosAdaptados[0]?.costoFee, 'first item costoAmort:', serviciosAdaptados[0]?.costoAmort, 'first item precioVentaNeto:', serviciosAdaptados[0]?.precioVentaNeto, 'first item margen:', serviciosAdaptados[0]?.margen);`;

lines.splice(idx, 0, debugLine);
fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('Debug log inserted at line:', idx+1);
