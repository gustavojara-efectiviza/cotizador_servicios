const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// Fix 1: data row - incluir adminAsignado en el costo real para el Margen Blended correcto
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

// Fix 1: Corregir cálculo de utilidad por item (incluir admin en costo real)
replaceBlock(
    'const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0);',
    'row.getCell(25).value = { formula: `X${r}/W${r}`, result: _margenBlended };',
`    // Costo Real Total = Costo Directo Puro + Logística + Imprevistos + SSMA + Gastos Admin
    // El PrecioVentaNeto ya absorbe el admin (6%), por lo que hay que incluirlo en el costo
    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + (item.adminAsignado || 0);
    const _utilidad = item.precioVentaNeto - _costoRealItem;
    const _margenBlended = item.precioVentaNeto > 0 ? _utilidad / item.precioVentaNeto : 0;
    row.getCell(24).value = { formula: \`W\${r}-Q\${r}\`, result: _utilidad };
    row.getCell(25).value = { formula: \`X\${r}/W\${r}\`, result: _margenBlended };`
);

// Fix 2: Corregir cálculo de Blended en la fila de TOTALES (incluir admin acumulado)
replaceBlock(
    'const _sumUtilidad = sumSSTTVentaNeto - (sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA);',
    'totalRow3.getCell(25).numFmt = percentFormat;',
`    // Utilidad neta real = Precio Venta Neto - TODOS los costos (incluye admin)
    const _sumUtilidad = sumSSTTVentaNeto - (sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA + sumSSTTAdmin);
    const _margenBlenTotal = sumSSTTVentaNeto > 0 ? _sumUtilidad / sumSSTTVentaNeto : 0;
    totalRow3.getCell(24).value = { formula: \`SUM(X\${startRowSSTTAudit}:X\${endRowSSTTAudit})\`, result: _sumUtilidad };
    totalRow3.getCell(25).value = { formula: \`X\${totalRow3.number}/W\${totalRow3.number}\`, result: _margenBlenTotal };
    totalRow3.getCell(25).numFmt = percentFormat;`
);

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('Blended corregido con admin incluido en costo real');
