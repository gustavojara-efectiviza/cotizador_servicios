const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

function replaceBlock(startPattern, endPattern, newLinesText) {
    const startIdx = lines.findIndex(l => l.includes(startPattern));
    if (startIdx === -1) {
        console.error('FAIL: Could not find start pattern: ' + startPattern);
        return;
    }
    
    let endIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].includes(endPattern)) {
            endIdx = i;
            break;
        }
    }
    
    if (endIdx === -1) {
        console.error('FAIL: Could not find end pattern: ' + endPattern);
        return;
    }

    const newLines = newLinesText.split('\n');
    lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
    console.log('OK: Replaced block from ' + startIdx + ' to ' + endIdx);
}

// 1. Header
replaceBlock(
    "`UTILIDAD NETA (${moneda})`,",
    "  ];",
    "    `UTILIDAD NETA (${moneda})`,\n    'Margen Real Blended (%)',\n    `PRECIO TOTAL c/ IVA (${moneda})`,\n    'Margen s/Venta Aplic. (%)'\n  ];"
);

// 2. Format and Result
replaceBlock(
    "row.getCell(24).value = { formula: `W${r}-Q${r}`, result: 0 };",
    "row.getCell(25).numFmt = percentFormat;",
    "    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0);\n    const _utilidad = item.precioVentaNeto - _costoRealItem;\n    const _margenBlended = item.precioVentaNeto > 0 ? _utilidad / item.precioVentaNeto : 0;\n    row.getCell(24).value = { formula: `W${r}-Q${r}`, result: _utilidad };\n    row.getCell(25).value = { formula: `X${r}/W${r}`, result: _margenBlended };\n    row.getCell(26).value = item.precioVentaConIVA;\n\n    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26].forEach(col => row.getCell(col).numFmt = moneyFormat);\n    row.getCell(25).numFmt = percentFormat;\n    row.getCell(27).value = item.margen || 0;\n    row.getCell(27).numFmt = percentFormat;"
);

// 3. Totals
replaceBlock(
    "totalRow3.getCell(17).value = { formula: `SUM(Q${startRowSSTTAudit}:Q${endRowSSTTAudit})`, result: sumSSTTAdmin };",
    "totalRow3.getCell(21).value = { formula: `SUM(U${startRowSSTTAudit}:U${endRowSSTTAudit})`, result: sumSSTTVentaIVA };",
    "    totalRow3.getCell(17).value = { formula: `SUM(Q${startRowSSTTAudit}:Q${endRowSSTTAudit})`, result: sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA };\n    totalRow3.getCell(18).value = { formula: `SUM(R${startRowSSTTAudit}:R${endRowSSTTAudit})`, result: sumSSTTCostoReal };\n    totalRow3.getCell(19).value = { formula: `SUM(S${startRowSSTTAudit}:S${endRowSSTTAudit})`, result: sumSSTTLog / 0.70 };\n    totalRow3.getCell(20).value = { formula: `SUM(T${startRowSSTTAudit}:T${endRowSSTTAudit})`, result: sumSSTTImp / 0.70 };\n    totalRow3.getCell(21).value = { formula: `SUM(U${startRowSSTTAudit}:U${endRowSSTTAudit})`, result: sumSSTTSSMA / 0.70 };\n    totalRow3.getCell(22).value = { formula: `SUM(V${startRowSSTTAudit}:V${endRowSSTTAudit})`, result: sumSSTTAdmin };\n    totalRow3.getCell(23).value = { formula: `SUM(W${startRowSSTTAudit}:W${endRowSSTTAudit})`, result: sumSSTTVentaNeto };\n    const _sumUtilidad = sumSSTTVentaNeto - (sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA);\n    totalRow3.getCell(24).value = { formula: `SUM(X${startRowSSTTAudit}:X${endRowSSTTAudit})`, result: _sumUtilidad };\n    const _margenBlenTotal = sumSSTTVentaNeto > 0 ? _sumUtilidad / sumSSTTVentaNeto : 0;\n    totalRow3.getCell(25).value = { formula: `X${totalRow3.number}/W${totalRow3.number}`, result: _margenBlenTotal };\n    totalRow3.getCell(25).numFmt = percentFormat;\n    totalRow3.getCell(26).value = { formula: `SUM(Z${startRowSSTTAudit}:Z${endRowSSTTAudit})`, result: sumSSTTVentaIVA };"
);

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log("Cambios aplicados exitosamente.");
