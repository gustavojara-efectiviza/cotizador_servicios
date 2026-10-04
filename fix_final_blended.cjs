const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let content = fs.readFileSync(filePath, 'utf8');

// ====================================================
// FIX DEFINITIVO: 
// 1. SSMA NO tiene margen propio - va a costo en el precio (P, no P/0.70)
// 2. Top-Down: usar precio_total_final del motor directamente
// 3. Consistencia: _pvNeto usa la misma formula que col W
// ====================================================

// Reemplazar bloque de formulas de fila (cols 18-25)
const oldBlock = `    row.getCell(18).value = { formula: \`M\${r}/\${divServ}\`, result: item.subtotalDirectoTotal / divServ };
    row.getCell(19).value = { formula: \`N\${r}/0.70\`, result: item.logAsignada / 0.70 };
    row.getCell(20).value = { formula: \`O\${r}/0.70\`, result: item.impAsignado / 0.70 };
    row.getCell(21).value = { formula: \`P\${r}/0.70\`, result: (item.ssmaAsignado || 0) / 0.70 };
    row.getCell(23).value = { formula: \`R\${r}+S\${r}+T\${r}+U\${r}+V\${r}\`, result: (item.subtotalDirectoTotal/divServ) + (item.logAsignada/0.7) + (item.impAsignado/0.7) + (item.ssmaAsignado||0) + item.adminAsignado };
    // Blended calculado con los mismos valores que aparecen en las columnas del Excel
    // Columna W (PV Neto) = PV servicio + PV logística + PV imprevistos + PV SSMA + Admin
    const _pvNeto = (item.subtotalDirectoTotal / divServ) + (item.logAsignada / 0.7) + (item.impAsignado / 0.7) + (item.ssmaAsignado || 0) + item.adminAsignado;
    // Columna Q (Costo Total Real) = CostoDirecto + Costo Logística + Costo Imprevistos + SSMA
    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + (item.adminAsignado || 0);
    const _utilidad = _pvNeto - _costoRealItem;
    const _margenBlended = _pvNeto > 0 ? _utilidad / _pvNeto : 0;
    row.getCell(24).value = { formula: \`W\${r}-Q\${r}\`, result: _utilidad };
    row.getCell(25).value = { formula: \`X\${r}/W\${r}\`, result: _margenBlended };`;

const newBlock = `    // TOP-DOWN: El precio de venta se inyecta desde el mercado (precio_total_final del motor)
    // Para top-down: PV_neto = precio_total_final (ya incluye admin absorbido)
    // Para Normal/Subcontrato: PV_neto = reconstruido desde costos con margenes
    const isTopDown = item.estrategia === 'Top-Down' || item.isTopDown === true;
    const adminRate = 0.06;

    // PV Servicio (col R): 
    // - Normal/Subcontrato: Costo / (1-margen)
    // - Top-Down: ingeniería inversa = precio_total_final_servicio / (1+adminRate) - log_pv - imp_pv - ssma_costo
    let pvServicio, pvLog, pvImp, pvSSMA;
    if (isTopDown && item.precio_total_final > 0) {
      // Ingeniería inversa desde el precio de mercado
      const pvTotalMotor = item.precio_total_final; // ya es el PV neto (sin IVA)
      // Descontar admin para obtener el subtotal antes de admin
      const subtotalAntesAdmin = pvTotalMotor / (1 + adminRate);
      // Log y Imp se reconstruyen desde sus costos reales
      pvLog = item.logAsignada / 0.70;
      pvImp = item.impAsignado / 0.70;
      pvSSMA = item.ssmaAsignado || 0; // SSMA va a costo en el motor, sin margen adicional
      // Servicio puro = subtotal - lo demas
      pvServicio = subtotalAntesAdmin - pvLog - pvImp - pvSSMA;
      // Admin = pvTotalMotor - subtotalAntesAdmin
      const adminTopDown = pvTotalMotor - subtotalAntesAdmin;
      row.getCell(18).value = { formula: \`M\${r}/\${divServ}\`, result: pvServicio };
      row.getCell(19).value = { formula: \`N\${r}/0.70\`, result: pvLog };
      row.getCell(20).value = { formula: \`O\${r}/0.70\`, result: pvImp };
      row.getCell(21).value = { formula: \`P\${r}\`, result: pvSSMA };
      row.getCell(23).value = { formula: \`R\${r}+S\${r}+T\${r}+U\${r}+V\${r}\`, result: pvServicio + pvLog + pvImp + pvSSMA + adminTopDown };
    } else {
      // Normal y Subcontrato: reconstruccion desde costos
      pvServicio = item.subtotalDirectoTotal / divServ;
      pvLog = item.logAsignada / 0.70;
      pvImp = item.impAsignado / 0.70;
      pvSSMA = item.ssmaAsignado || 0; // SSMA va a costo (sin margen adicional), consistente con motor
      row.getCell(18).value = { formula: \`M\${r}/\${divServ}\`, result: pvServicio };
      row.getCell(19).value = { formula: \`N\${r}/0.70\`, result: pvLog };
      row.getCell(20).value = { formula: \`O\${r}/0.70\`, result: pvImp };
      row.getCell(21).value = { formula: \`P\${r}\`, result: pvSSMA }; // SSMA sin markup extra
      row.getCell(23).value = { formula: \`R\${r}+S\${r}+T\${r}+U\${r}+V\${r}\`, result: pvServicio + pvLog + pvImp + pvSSMA + item.adminAsignado };
    }

    // Blended: (PV_neto - Costo_Total_Real) / PV_neto
    // Costo Total Real (col Q = M+N+O+P+V) = Directo + Log_costo + Imp_costo + SSMA_costo + Admin_costo
    // PV Neto (col W = R+S+T+U+V) = PV_servicio + PV_log + PV_imp + SSMA_costo + Admin_costo
    // => Utilidad (X = W-Q) = ganancia sobre el servicio + ganancia sobre log + ganancia sobre imp
    const _pvNeto = parseFloat(row.getCell(23).value.result || 0);
    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + (item.adminAsignado || 0);
    const _utilidad = _pvNeto - _costoRealItem;
    const _margenBlended = _pvNeto > 0 ? _utilidad / _pvNeto : 0;
    row.getCell(24).value = { formula: \`W\${r}-Q\${r}\`, result: _utilidad };
    row.getCell(25).value = { formula: \`X\${r}/W\${r}\`, result: _margenBlended };`;

if (content.includes(oldBlock.substring(0, 60))) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('OK: Row rendering block replaced');
} else {
  console.log('FAIL: Pattern not found. Looking for...');
  console.log(oldBlock.substring(0, 80));
}
