const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Header
content = content.replace(
    "    \PRECIO TOTAL c/ IVA (\)\\n  ];",
    "    \PRECIO TOTAL c/ IVA (\)\,\n    'Margen s/Venta Aplic. (%)'\n  ];"
);

// Format and result
content = content.replace(
    "    row.getCell(24).value = { formula: \W\-Q\\, result: 0 };\n    row.getCell(25).value = { formula: \X\/W\\, result: 0 };\n    row.getCell(26).value = item.precioVentaConIVA;\n\n    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26].forEach(col => row.getCell(col).numFmt = moneyFormat);\n    row.getCell(25).numFmt = percentFormat;",
    "    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0);\n    const _utilidad = item.precioVentaNeto - _costoRealItem;\n    const _margenBlended = item.precioVentaNeto > 0 ? _utilidad / item.precioVentaNeto : 0;\n    row.getCell(24).value = { formula: \W\-Q\\, result: _utilidad };\n    row.getCell(25).value = { formula: \X\/W\\, result: _margenBlended };\n    row.getCell(26).value = item.precioVentaConIVA;\n\n    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26].forEach(col => row.getCell(col).numFmt = moneyFormat);\n    row.getCell(25).numFmt = percentFormat;\n    row.getCell(27).value = item.margen || 0;\n    row.getCell(27).numFmt = percentFormat;"
);

// Totals
content = content.replace(
    "    totalRow3.getCell(17).value = { formula: \SUM(Q\:Q\)\, result: sumSSTTAdmin };\n    totalRow3.getCell(18).value = { formula: \SUM(R\:R\)\, result: sumSSTTCostoReal };\n    totalRow3.getCell(21).value = { formula: \SUM(U\:U\)\, result: sumSSTTVentaIVA };",
    "    totalRow3.getCell(17).value = { formula: \SUM(Q\:Q\)\, result: sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA };\n    totalRow3.getCell(18).value = { formula: \SUM(R\:R\)\, result: sumSSTTCostoReal };\n    totalRow3.getCell(19).value = { formula: \SUM(S\:S\)\, result: sumSSTTLog / 0.70 };\n    totalRow3.getCell(20).value = { formula: \SUM(T\:T\)\, result: sumSSTTImp / 0.70 };\n    totalRow3.getCell(21).value = { formula: \SUM(U\:U\)\, result: sumSSTTSSMA / 0.70 };\n    totalRow3.getCell(22).value = { formula: \SUM(V\:V\)\, result: sumSSTTAdmin };\n    totalRow3.getCell(23).value = { formula: \SUM(W\:W\)\, result: sumSSTTVentaNeto };\n    const _sumUtilidad = sumSSTTVentaNeto - (sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA);\n    totalRow3.getCell(24).value = { formula: \SUM(X\:X\)\, result: _sumUtilidad };\n    const _margenBlenTotal = sumSSTTVentaNeto > 0 ? _sumUtilidad / sumSSTTVentaNeto : 0;\n    totalRow3.getCell(25).value = { formula: \X\/W\\, result: _margenBlenTotal };\n    totalRow3.getCell(25).numFmt = percentFormat;\n    totalRow3.getCell(26).value = { formula: \SUM(Z\:Z\)\, result: sumSSTTVentaIVA };"
);

content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log("Cambios aplicados.");
