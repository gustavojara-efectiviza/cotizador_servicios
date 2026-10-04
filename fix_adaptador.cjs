const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/Bloque3_Resumen.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('const serviciosAdaptados = detalleServicios.map'));
let endIdx = startIdx;
let depth = 0;
let started = false;
for(let i = startIdx; i < lines.length; i++) {
    for(const ch of lines[i]) {
        if(ch === '{' || ch === '(') { depth++; started = true; }
        if(ch === '}' || ch === ')') depth--;
    }
    if(started && depth <= 0) { endIdx = i; break; }
}

// Nueva logica: usar directamente equiposProcesados del motor si está disponible
const newBlock = `    // Usar items ya procesados por el motor financiero (tienen costoFee, costoAmort, precioVentaNeto, etc.)
    // Si no hay equiposProcesados, hacer fallback al adaptador legacy
    const serviciosAdaptados = (resultadosSSTT?.equiposProcesados && resultadosSSTT.equiposProcesados.length > 0)
      ? resultadosSSTT.equiposProcesados.map(item => ({
          ...item,
          descripcion: item.equipo || item.nombre || item.descripcion || 'Servicio Especializado',
          moneda: 'PYG',
          // Asegurar que los campos del excelExport.js existan con los nombres correctos
          Costo_Tecnologia_Item: item.Costo_Tecnologia_Item || item.Costo_Tecnologia || 0,
          Costo_MO_Item: item.Costo_MO_Item || 0,
          Costo_Subcontrato_Item: item.Costo_Subcontrato_Item || 0,
          // costoFee y costoAmort ya vienen del motor con esos nombres exactos
          is_tercerizado: item.isTercerizado,
          precioVentaNeto: item.precio_total_final / 1.10,
          precioVentaConIVA: item.precio_total_final,
          adminAsignado: item.adminAsignado || 0,
          ssmaAsignado: item.ssmaAsignado || 0,
          logAsignada: item.logAsignada || 0,
          impAsignado: item.impAsignado || 0,
        }))
      : detalleServicios.map(item => {
          const qty = item.cantidad || 1;
          const costoDirUnitario = item.costo_directo_unitario || 0;
          const precioFinalUnitario = item.precio_unitario_final || 0;
          const precioFinalTotal = item.precio_total_final || (precioFinalUnitario * qty);
          const costoTotalReal = item.costo_total_real || (costoDirUnitario * qty);
          const margenReal = item.margen !== undefined
            ? item.margen
            : (precioFinalTotal > 0 && precioFinalTotal > costoTotalReal
                ? (1 - (costoTotalReal / precioFinalTotal))
                : 0.30);
          return {
            descripcion: item.equipo || item.nombre || 'Servicio Especializado',
            cantidad: qty,
            costoBase: costoDirUnitario,
            margen: margenReal,
            precio_unitario_final: precioFinalUnitario,
            precio_total_final: precioFinalTotal,
            costo_total_real: costoTotalReal,
            logAsignada: item.logAsignada || 0,
            impAsignado: item.impAsignado || 0,
            adminAsignado: item.adminAsignado || 0,
            ssmaAsignado: item.ssmaAsignado || 0,
            moneda: 'PYG',
            estrategia: item.estrategia || 'Normal',
            Costo_Tecnologia_Item: Number(item.Costo_Tecnologia_Item) || 0,
            Costo_MO_Item: Number(item.Costo_MO_Item) || 0,
            Costo_Subcontrato_Item: Number(item.Costo_Subcontrato_Item) || 0,
            costoFee: Number(item.costoServiceFee || item.costoFee) || 0,
            costoAmort: Number(item.costoAmortizacion || item.costoAmort) || 0,
            horas_equipo: (item.is_tercerizado || item.estrategia === 'Subcontrato') ? 0 : (item.horas_equipo ?? 0),
            horas_servicio: (item.is_tercerizado || item.estrategia === 'Subcontrato') ? 0 : (item.horas_servicio ?? 0),
          };
        });`;

lines.splice(startIdx, endIdx - startIdx + 1, newBlock);
fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('REPLACEMENT DONE: lines ' + (startIdx+1) + ' to ' + (endIdx+1) + ' replaced.');
