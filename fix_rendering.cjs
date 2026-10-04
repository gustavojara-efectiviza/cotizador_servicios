const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

// Reemplazar líneas 807-820 (1-indexed) = 806-819 (0-indexed)
const newLines = [
    "    // TOP-DOWN: precio inyectado del mercado => ingenieria inversa para transparencia",
    "    // Normal/Subcontrato: PV reconstruido desde costos con margenes",
    "    // SSMA: va al costo en el motor (sin markup adicional), consistente con financialEngine.js",
    "    const isTopDown = item.estrategia === 'Top-Down' || item.isTopDown === true;",
    "    let pvServicio, pvLog, pvImp, pvSSMA, pvAdmin;",
    "    if (isTopDown && item.precio_total_final > 0) {",
    "      // Ingenieria inversa: precio de mercado es el PV neto total",
    "      // Admin 6%: PV_total = subtotal * 1.06 => subtotal = PV_total/1.06",
    "      const pvTotalMercado = item.precio_total_final;",
    "      const subtotalAntesAdmin = pvTotalMercado / 1.06;",
    "      pvLog = item.logAsignada / 0.70;",
    "      pvImp = item.impAsignado / 0.70;",
    "      pvSSMA = item.ssmaAsignado || 0;",
    "      pvServicio = subtotalAntesAdmin - pvLog - pvImp - pvSSMA;",
    "      pvAdmin = pvTotalMercado - subtotalAntesAdmin;",
    "    } else {",
    "      pvServicio = item.subtotalDirectoTotal / divServ;",
    "      pvLog = item.logAsignada / 0.70;",
    "      pvImp = item.impAsignado / 0.70;",
    "      pvSSMA = item.ssmaAsignado || 0;  // SSMA al costo, sin markup extra",
    "      pvAdmin = item.adminAsignado || 0;",
    "    }",
    "    row.getCell(18).value = { formula: `M${r}/${divServ}`, result: pvServicio };",
    "    row.getCell(19).value = { formula: `N${r}/0.70`, result: pvLog };",
    "    row.getCell(20).value = { formula: `O${r}/0.70`, result: pvImp };",
    "    row.getCell(21).value = { formula: `P${r}`, result: pvSSMA };",
    "    // Col W = PV Neto total: R+S+T+U+V (V=admin absorbido en precio)",
    "    const _pvNeto = pvServicio + pvLog + pvImp + pvSSMA + pvAdmin;",
    "    row.getCell(23).value = { formula: `R${r}+S${r}+T${r}+U${r}+V${r}`, result: _pvNeto };",
    "    // Blended: Utilidad = W - Q, Margen = X/W",
    "    // Q (col 17) = M+N+O+P+V = directo+log_costo+imp_costo+ssma_costo+admin_costo",
    "    const _costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + pvAdmin;",
    "    const _utilidad = _pvNeto - _costoRealItem;",
    "    const _margenBlended = _pvNeto > 0 ? _utilidad / _pvNeto : 0;",
    "    row.getCell(24).value = { formula: `W${r}-Q${r}`, result: _utilidad };",
    "    row.getCell(25).value = { formula: `X${r}/W${r}`, result: _margenBlended };"
];

// Lines 807-820 are indices 806-819
lines.splice(806, 14, ...newLines);

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('DONE. Total lines now:', lines.length);

// Verify
const newContent = fs.readFileSync(filePath, 'utf8');
if(newContent.includes('pvTotalMercado')) {
    console.log('OK: TopDown ingenieria inversa aplicada');
} else {
    console.log('FAIL: verificar');
}
