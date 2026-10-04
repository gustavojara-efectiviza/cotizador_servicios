const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// Fix: Total row 17 - tambien debe incluir Admin en el total de Costo Real
const idx = lines.findIndex(l => l.includes("totalRow3.getCell(17).value = { formula: `SUM(Q${startRowSSTTAudit}"));
if(idx > -1) {
    lines[idx] = "    totalRow3.getCell(17).value = { formula: `SUM(Q${startRowSSTTAudit}:Q${endRowSSTTAudit})`, result: sumSSTTSubDirectoTotal + sumSSTTLog + sumSSTTImp + sumSSTTSSMA + sumSSTTAdmin };";
    console.log('OK: Total row 17 updated to include Admin');
} else {
    console.log('FAIL');
}

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
