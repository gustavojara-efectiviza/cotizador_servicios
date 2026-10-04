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
    console.log('OK lines', startIdx+1, 'to', endIdx+1);
}

// El Precio Venta Neto (columna W) en Excel = PV_servicio + PV_log + PV_imp + PV_ssma + Admin
// = subtotalDirectoTotal/divServ + logAsignada/0.7 + impAsignado/0.7 + ssmaAsignado + adminAsignado
// El Costo Real (columna Q) = subtotalDirectoTotal + logAsignada + impAsignado + ssmaAsignada
// Blended = (W - Q) / W donde W y Q son los valores que ya calculamos arriba para el Excel

replaceBlock(
    '// Costo Real Total = Costo Directo Puro + Logística + Imprevistos + SSMA + Gastos Admin',
    "row.getCell(25).value = { formula: `X${r}/W${r}`, result: _margenBlended };",
`    // Blended calculado con los mismos valores que aparecen en las columnas del Excel
    // Columna W (PV Neto) = PV servicio + PV logística + PV imprevistos + PV SSMA + Admin
    const _pvNeto = (item.subtotalDirectoTotal / divServ) + (item.logAsignada / 0.7) + (item.impAsignado / 0.7) + (item.ssmaAsignado || 0) + item.adminAsignado;
    // Columna Q (Costo Total Real) = CostoDirecto + Costo Logística + Costo Imprevistos + SSMA
    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + (item.adminAsignado || 0);
    const _utilidad = _pvNeto - _costoRealItem;
    const _margenBlended = _pvNeto > 0 ? _utilidad / _pvNeto : 0;
    row.getCell(24).value = { formula: \`W\${r}-Q\${r}\`, result: _utilidad };
    row.getCell(25).value = { formula: \`X\${r}/W\${r}\`, result: _margenBlended };`
);

// Totals: mismo ajuste - usar sumSSTTVentaNeto que es la suma de los PV netos reales
replaceBlock(
    '// Utilidad neta real = Precio Venta Neto - TODOS los costos (incluye admin)',
    'totalRow3.getCell(25).numFmt = percentFormat;',
`    // PV Neto total = suma de columna W en el Excel
    // Costo total = CostoDirecto + Logística costo + Imprevistos costo + SSMA + Admin (costos puros)
    const _sumCostoReal = sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA + sumSSTTAdmin;
    const _sumUtilidad = sumSSTTVentaNeto - _sumCostoReal;
    const _margenBlenTotal = sumSSTTVentaNeto > 0 ? _sumUtilidad / sumSSTTVentaNeto : 0;
    totalRow3.getCell(24).value = { formula: \`SUM(X\${startRowSSTTAudit}:X\${endRowSSTTAudit})\`, result: _sumUtilidad };
    totalRow3.getCell(25).value = { formula: \`X\${totalRow3.number}/W\${totalRow3.number}\`, result: _margenBlenTotal };
    totalRow3.getCell(25).numFmt = percentFormat;`
);

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('Blended alineado con columnas W y Q del Excel');
