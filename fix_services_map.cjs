const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

function replaceBlock(startPattern, endPattern, newLinesText) {
    const startIdx = lines.findIndex(l => l.includes(startPattern));
    if (startIdx === -1) { console.error('FAIL start:', startPattern); return; }
    let endIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].includes(endPattern)) { endIdx = i; break; }
    }
    if (endIdx === -1) { console.error('FAIL end:', endPattern); return; }
    const newLines = newLinesText.split('\n');
    lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
    console.log('OK replaced lines', startIdx+1, 'to', endIdx+1);
}

// Fix the serviciosProcesados map to handle both naming conventions from engine
replaceBlock(
    'const serviciosProcesados = servicios.map',
    '  });',
`  const serviciosProcesados = servicios.map(item => {
    const qty = safeNum(item.cantidad) || 1;
    const esTercerizado = item.estrategia === 'Subcontrato' || item.is_tercerizado === true || item.isTercerizado === true || (safeNum(item.Costo_Subcontrato_Item) > 0 && safeNum(item.Costo_MO_Item) === 0);
    
    // Campos del motor: Costo_Tecnologia (sin _Item) o Costo_Tecnologia_Item (adaptado)
    const cTec = esTercerizado ? 0 : safeNum(convertir(item.Costo_Tecnologia_Item || item.Costo_Tecnologia, item.moneda || 'PYG'));
    const cMO = esTercerizado ? 0 : safeNum(convertir(item.Costo_MO_Item, item.moneda || 'PYG'));
    const cSubc = esTercerizado ? safeNum(convertir(item.Costo_Subcontrato_Item || item.costoBase, item.moneda || 'PYG')) : 0;
    // costoFee y costoAmort vienen del motor directamente
    const cFee = safeNum(convertir(item.costoFee || item.overrides?.costoServiceFee, item.moneda || 'PYG'));
    const cAmort = safeNum(convertir(item.costoAmort || item.overrides?.costoAmortizacion, item.moneda || 'PYG'));
    
    const subtotalDirectoUnit = cTec + cMO + cSubc + cFee + cAmort;
    const subtotalDirectoTotal = subtotalDirectoUnit * qty;

    const horas_equipo = esTercerizado ? 0 : (safeNum(item.horas_equipo));
    const horas_servicio = esTercerizado ? 0 : (safeNum(item.horas_servicio));

    // Campos pre-calculados por el motor (precioVentaNeto, logAsignada, etc.)
    const precioVentaNeto = item.precioVentaNeto || (item.precio_total_final ? item.precio_total_final / 1.10 : 0);
    const precioVentaConIVA = item.precioVentaConIVA || item.precio_total_final || 0;
    const logAsignada = item.logAsignada || 0;
    const impAsignado = item.impAsignado || 0;
    const ssmaAsignado = item.ssmaAsignado || 0;
    const adminAsignado = item.adminAsignado || 0;
    const margen = item.margen || item.margenDecimal || 0;

    return {
      ...item,
      tipo: 'Servicio',
      cantidad: qty,
      esTercerizado,
      horas_equipo,
      horas_servicio,
      cTec,
      cMO,
      cSubc,
      cFee,
      cAmort,
      subtotalDirectoUnit,
      subtotalDirectoTotal,
      precioVentaNeto,
      precioVentaConIVA,
      logAsignada,
      impAsignado,
      ssmaAsignado,
      adminAsignado,
      margen
    };
  });`
);

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('excelExport.js updated successfully');
