const fs = require('fs');
const excelPath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let lines = fs.readFileSync(excelPath, 'utf8').split(/\r?\n/);

const target1 = "      row.getCell(21).value = { formula: `P${r}`, result: item.ssmaAsignado || 0 };";
const replace1 = "      row.getCell(21).value = { formula: `P${r}/0.70`, result: (item.ssmaAsignado || 0) / 0.70 };";

let c1 = 0;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes("formula: `P${r}`, result: item.ssmaAsignado || 0")) {
        lines[i] = replace1;
        c1++;
    }
}
console.log('OK: Replaced target 1, count:', c1);

const target2 = "      const pvSSMA = item.ssmaAsignado || 0;";
const replace2 = "      const pvSSMA = (item.ssmaAsignado || 0) / 0.70;";

let c2 = 0;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes("const pvSSMA = item.ssmaAsignado || 0;")) {
        lines[i] = replace2;
        c2++;
    }
}
console.log('OK: Replaced target 2, count:', c2);

fs.writeFileSync(excelPath, lines.join('\r\n'), 'utf8');
