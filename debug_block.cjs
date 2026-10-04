const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// === FIX 1: Row rendering - usar precio_total_final del motor para items con TopDown ===
// Encontrar bloque de row.getCell(18) hasta getCell(25) para reemplazarlo correctamente
const idx18 = lines.findIndex(l => l.trim().startsWith('row.getCell(18).value = { formula: `M'));
const idx25 = lines.findIndex((l, i) => i > idx18 && l.trim().startsWith('row.getCell(25).numFmt'));

console.log('Block to fix: lines', idx18+1, 'to', idx25+1);
for(let i=idx18; i<=idx25; i++) console.log(i+1 + ':', lines[i]);
