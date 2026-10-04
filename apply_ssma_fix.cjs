const fs = require('fs');
const enginePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/financialEngine.js';
const excelPath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';

// --- 1. Fix financialEngine.js ---
let engineContent = fs.readFileSync(enginePath, 'utf8');

const targetEngine = `    // PASO 2: Subtotal antes de Gastos Adm. y Financieros
    const subtotal_antes_admin = precio_servicio_total + cuota_log_pv + cuota_imp_pv + ssmaAsignado;`;
const replacementEngine = `    // PASO 1.5: Cuota SSMA con margen (divisor 0.70) para precio de venta
    const cuota_ssma_pv = ssmaAsignado > 0 ? (ssmaAsignado / 0.70) : 0;

    // PASO 2: Subtotal antes de Gastos Adm. y Financieros
    const subtotal_antes_admin = precio_servicio_total + cuota_log_pv + cuota_imp_pv + cuota_ssma_pv;`;

if(engineContent.includes(targetEngine)) {
    engineContent = engineContent.replace(targetEngine, replacementEngine);
} else {
    console.log('FAIL: targetEngine not found in financialEngine.js');
}

const targetEngine2 = `    const ganancia_imp_item = cuota_imp_pv - cuota_imp_costo;
    const utilidad_total_item = ganancia_servicio + ganancia_log_item + ganancia_imp_item;`;
const replacementEngine2 = `    const ganancia_imp_item = cuota_imp_pv - cuota_imp_costo;
    const ganancia_ssma_item = cuota_ssma_pv - ssmaAsignado;
    const utilidad_total_item = ganancia_servicio + ganancia_log_item + ganancia_imp_item + ganancia_ssma_item;`;

if(engineContent.includes(targetEngine2)) {
    engineContent = engineContent.replace(targetEngine2, replacementEngine2);
} else {
    console.log('FAIL: targetEngine2 not found in financialEngine.js');
}

fs.writeFileSync(enginePath, engineContent, 'utf8');
console.log('OK: financialEngine.js updated');

// --- 2. Fix excelExport.js ---
let excelContent = fs.readFileSync(excelPath, 'utf8');

const targetExcel1 = `      row.getCell(21).value = { formula: \`P\${r}\`, result: item.ssmaAsignado || 0 };`;
const replacementExcel1 = `      row.getCell(21).value = { formula: \`P\${r}/0.70\`, result: (item.ssmaAsignado || 0) / 0.70 };`;

// We have to replace it twice (once in top-down, once in normal)
excelContent = excelContent.split(targetExcel1).join(replacementExcel1);

const targetExcel2 = `      const pvSSMA = item.ssmaAsignado || 0;`;
const replacementExcel2 = `      const pvSSMA = (item.ssmaAsignado || 0) / 0.70;`;
excelContent = excelContent.split(targetExcel2).join(replacementExcel2);

fs.writeFileSync(excelPath, excelContent, 'utf8');
console.log('OK: excelExport.js updated');
