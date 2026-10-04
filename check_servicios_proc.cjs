const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// Fix 1: Costo_Tecnologia_Item should also check Costo_Tecnologia (field name from engine)
// Fix 2: esTercerizado should also check isTercerizado
// Fix 3: subtotalDirectoUnit should use Costo_Directo_Unitario if subtotalDirectoUnit is 0

const startIdx = lines.findIndex(l => l.includes('const serviciosProcesados = servicios.map'));
let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('});\n') || (i > startIdx && l.trim() === '});'));
// Find by looking for the closing of the map
let depth = 0, started = false;
endIdx = startIdx;
for(let i = startIdx; i < lines.length; i++) {
    for(const ch of lines[i]) {
        if(ch === '(' || ch === '{') { depth++; started = true; }
        if(ch === ')' || ch === '}') depth--;
    }
    if(started && depth <= 0) { endIdx = i; break; }
}

console.log('Block from', startIdx+1, 'to', endIdx+1);
for(let i=startIdx; i<=endIdx; i++) console.log(i+1 + ': ' + lines[i]);
