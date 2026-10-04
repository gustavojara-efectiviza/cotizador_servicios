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

replaceBlock(
    "const cFee = safeNum(convertir(item.costoServiceFee, item.moneda || 'PYG'));",
    "const cAmort = safeNum(convertir(item.costoAmortizacion, item.moneda || 'PYG'));",
    "    const cFee = safeNum(convertir(item.costoFee || item.overrides?.costoServiceFee, item.moneda || 'PYG'));\n    const cAmort = safeNum(convertir(item.costoAmort || item.overrides?.costoAmortizacion, item.moneda || 'PYG'));"
);

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log("Bug de variables de Fee y Amortizacion corregido exitosamente.");
