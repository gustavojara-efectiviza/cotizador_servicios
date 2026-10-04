const fs = require('fs');
const filePath = 'C:/Users/gusta/.gemini/antigravity/scratch/zunz-cotizador/src/utils/excelExport.js';
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

const idxStart = lines.findIndex(l => l.includes('row.getCell(12).value = { formula: `G${r}'));
const idxEnd = lines.findIndex((l, i) => i > idxStart && l.includes('row.getCell(26).value = item.precioVentaConIVA;'));

console.log('Replacing from', idxStart, 'to', idxEnd);

const newLines = [
    "    row.getCell(12).value = { formula: `G${r}+H${r}+I${r}+J${r}+K${r}`, result: item.subtotalDirectoUnit };",
    "    row.getCell(13).value = { formula: `D${r}*L${r}`, result: item.subtotalDirectoTotal };",
    "",
    "    const divServ = Math.max(0.01, 1 - Math.min(0.99, item.margen));",
    "    const isTopDown = item.estrategia === 'Top-Down' || item.isTopDown === true;",
    "    const adminRate = 0.06;",
    "",
    "    if (isTopDown && item.precio_total_final > 0) {",
    "      // TOP-DOWN: El precio viene dado por el mercado (Z = con IVA). Todo se calcula hacia atrs.",
    "      const pvTotalMercadoNeto = item.precio_total_final;",
    "      // Z (Col 26) se mantiene fijo como valor (al final de este bloque).",
    "      // W (Col 23): PV Neto. Le damos el valor fijo del mercado.",
    "      row.getCell(23).value = pvTotalMercadoNeto;",
    "      ",
    "      // V (Col 22): Admin = W - (W / 1.06)",
    "      const adminTopDown = pvTotalMercadoNeto - (pvTotalMercadoNeto / (1 + adminRate));",
    "      row.getCell(22).value = { formula: `W${r}-(W${r}/${1 + adminRate})`, result: adminTopDown };",
    "",
    "      // S, T, U se calculan desde sus costos",
    "      row.getCell(19).value = { formula: `N${r}/0.70`, result: item.logAsignada / 0.70 };",
    "      row.getCell(20).value = { formula: `O${r}/0.70`, result: item.impAsignado / 0.70 };",
    "      row.getCell(21).value = { formula: `P${r}`, result: item.ssmaAsignado || 0 };",
    "",
    "      // R (Col 18): Servicio = W - (S + T + U + V) -> INGENIER?A INVERSA",
    "      const pvLog = item.logAsignada / 0.70;",
    "      const pvImp = item.impAsignado / 0.70;",
    "      const pvSSMA = item.ssmaAsignado || 0;",
    "      const pvServicio = pvTotalMercadoNeto - pvLog - pvImp - pvSSMA - adminTopDown;",
    "      row.getCell(18).value = { formula: `W${r}-S${r}-T${r}-U${r}-V${r}`, result: pvServicio };",
    "    } else {",
    "      // NORMAL: El precio se construye desde el costo hacia adelante.",
    "      row.getCell(18).value = { formula: `M${r}/${divServ}`, result: item.subtotalDirectoTotal / divServ };",
    "      row.getCell(19).value = { formula: `N${r}/0.70`, result: item.logAsignada / 0.70 };",
    "      row.getCell(20).value = { formula: `O${r}/0.70`, result: item.impAsignado / 0.70 };",
    "      row.getCell(21).value = { formula: `P${r}`, result: item.ssmaAsignado || 0 };",
    "",
    "      // V (Col 22): Admin = 6% de la suma de los PV anteriores",
    "      const pvServicio = item.subtotalDirectoTotal / divServ;",
    "      const pvLog = item.logAsignada / 0.70;",
    "      const pvImp = item.impAsignado / 0.70;",
    "      const pvSSMA = item.ssmaAsignado || 0;",
    "      const adminNormal = (pvServicio + pvLog + pvImp + pvSSMA) * adminRate;",
    "      row.getCell(22).value = { formula: `(R${r}+S${r}+T${r}+U${r})*${adminRate}`, result: adminNormal };",
    "",
    "      // W (Col 23): PV Neto = R + S + T + U + V",
    "      const pvNetoNormal = pvServicio + pvLog + pvImp + pvSSMA + adminNormal;",
    "      row.getCell(23).value = { formula: `R${r}+S${r}+T${r}+U${r}+V${r}`, result: pvNetoNormal };",
    "    }",
    "",
    "    // Q (Col 17): Costo Total Real = M + N + O + P + V",
    "    // NOTA: El costo admin real (V) est absorbido en el PV, por lo que su costo es igual a V.",
    "    const adminParaCosto = row.getCell(22).value.result || row.getCell(22).value;",
    "    const costoRealItem = item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + adminParaCosto;",
    "    row.getCell(17).value = { formula: `M${r}+N${r}+O${r}+P${r}+V${r}`, result: costoRealItem };",
    "",
    "    // X (Col 24): Utilidad = W - Q",
    "    const pvNetoFinal = row.getCell(23).value.result || row.getCell(23).value;",
    "    const utilidadFinal = pvNetoFinal - costoRealItem;",
    "    row.getCell(24).value = { formula: `W${r}-Q${r}`, result: utilidadFinal };",
    "",
    "    // Y (Col 25): Margen Blended = X / W",
    "    const blendedFinal = pvNetoFinal > 0 ? (utilidadFinal / pvNetoFinal) : 0;",
    "    row.getCell(25).value = { formula: `X${r}/W${r}`, result: blendedFinal };",
    "",
    "    // Z (Col 26): Precio con IVA = W * 1.10",
    "    row.getCell(26).value = { formula: `W${r}*1.10`, result: pvNetoFinal * 1.10 };"
];

lines.splice(idxStart, idxEnd - idxStart + 1, ...newLines);
fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('DONE');
