const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/Bloque3_Resumen.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// Find the block to replace:
// From "const serviciosAdaptados = detalleServicios.map..."
// To the closing "})" of the map + empty line after
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

console.log('Block to replace: lines ' + (startIdx+1) + ' to ' + (endIdx+1));
for(let i=startIdx; i<=endIdx; i++) console.log(i+1 + ': ' + lines[i]);
