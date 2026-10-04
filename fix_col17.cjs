const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

// Fix 1: Col 17 (Q) debe incluir V (Admin) en la formula
const col17Idx = lines.findIndex(l => l.includes("row.getCell(17).value = { formula: `M${r}+N${r}+O${r}+P${r}`"));
if(col17Idx > -1) {
    lines[col17Idx] = lines[col17Idx]
        .replace(
            "formula: `M${r}+N${r}+O${r}+P${r}`, result: item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0)",
            "formula: `M${r}+N${r}+O${r}+P${r}+V${r}`, result: item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + (item.adminAsignado || 0)"
        );
    console.log('OK: Col 17 formula updated to M+N+O+P+V');
} else {
    console.log('FAIL: Col 17 not found');
}

// Fix 2: El cache del Blended en _costoRealItem ya incluye admin (correcto)
// Solo necesitamos confirmar que la formula W-Q ahora es consistente
// Col 24 (X) usa formula W${r}-Q${r} que ahora Q incluye admin. Correcto.

// Fix 3: Actualizar el numFmt para incluir col 17 en las celdas de dinero (ya estaba: 17 en el array)
// Verificar que 17 esta en el array de formato
const fmtIdx = lines.findIndex(l => l.includes('[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26]'));
if(fmtIdx > -1) {
    console.log('OK: Col 17 ya esta en el formato de moneda');
} else {
    console.log('CHECK: buscar el formato');
}

// Fix 4: Totals row - col 17 formula tambien debe incluir admin (V)
const total17Idx = lines.findIndex(l => l.includes(`totalRow3.getCell(17).value = { formula: \`SUM(Q\${startRowSSTTAudit}`));
if(total17Idx > -1) {
    console.log('Total 17 found at line:', total17Idx+1, ':', lines[total17Idx].trim());
} else {
    // buscar
    lines.forEach((l, i) => { if(l.includes('totalRow3.getCell(17)')) console.log(i+1, l.trim()); });
}

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('Done.');
