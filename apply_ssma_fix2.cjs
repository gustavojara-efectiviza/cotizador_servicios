const fs = require('fs');
const enginePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/financialEngine.js';
let lines = fs.readFileSync(enginePath, 'utf8').split(/\r?\n/);

const idxPaso2 = lines.findIndex(l => l.includes('const subtotal_antes_admin = precio_servicio_total + cuota_log_pv + cuota_imp_pv + ssmaAsignado;'));
if (idxPaso2 !== -1) {
    lines.splice(idxPaso2, 1, 
        '    // Cuota de SSMA con margen (divisor 0.70)',
        '    const cuota_ssma_pv = ssmaAsignado > 0 ? (ssmaAsignado / 0.70) : 0;',
        '    const subtotal_antes_admin = precio_servicio_total + cuota_log_pv + cuota_imp_pv + cuota_ssma_pv;'
    );
    console.log('OK: Replaced Paso 2');
}

const idxUtilidad = lines.findIndex(l => l.includes('const utilidad_total_item = ganancia_servicio + ganancia_log_item + ganancia_imp_item;'));
if (idxUtilidad !== -1) {
    lines.splice(idxUtilidad, 1, 
        '    const ganancia_ssma_item = (typeof cuota_ssma_pv !== "undefined" ? cuota_ssma_pv : 0) - ssmaAsignado;',
        '    const utilidad_total_item = ganancia_servicio + ganancia_log_item + ganancia_imp_item + ganancia_ssma_item;'
    );
    console.log('OK: Replaced Utilidad');
}

fs.writeFileSync(enginePath, lines.join('\r\n'), 'utf8');
