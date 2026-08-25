import ExcelJS from 'exceljs';
import fileSaver from 'file-saver';

const saveAs = fileSaver.saveAs || fileSaver;

/**
 * Función para exportar la cotización a Excel (Formato Profesional Auditable Beigel SRL)
 * Precios con IVA (10%) INCLUIDO según Ley N° 6380/19 de la República del Paraguay.
 * @param {Object} estadoGlobal - Estado global de la cotización
 */
export const exportarAExcelAuditable = async (estadoGlobal) => {
  const {
    cliente = '',
    proyecto = '',
    equipos = [],        // Equipos de procura
    servicios = [],      // Servicios / SSTT
    alquileres = [],     // Alquileres especiales (grúas, equipos de apoyo)
    logisticaGlobal = 0, // Costo de logística y viáticos
    gananciaLogistica = 0,
    precioVentaLogistica = 0,
    gastosImprevistos = 0,
    gananciaImprevistos = 0,
    gastosAdminSSTT = 0,
    esLicitacion = false,
    moneda = 'USD',      // Moneda seleccionada para la oferta final
    tasaCambio = 7500    // Tasa de cambio (Ej: 7500 PYG/USD)
  } = estadoGlobal;

  // Sanitizador numérico para evitar NaN o undefined en el XML de Excel
  const safeNum = (v) => {
    const n = Number(v);
    return (!isNaN(n) && isFinite(n)) ? n : 0;
  };

  // Convertidor de moneda
  const convertir = (monto, monedaOrigen) => {
    const val = safeNum(monto);
    if (!val) return 0;
    if (!monedaOrigen || monedaOrigen === moneda) return val;
    if (moneda === 'PYG' && monedaOrigen === 'USD') return val * tasaCambio;
    if (moneda === 'USD' && monedaOrigen === 'PYG') return val / tasaCambio;
    return val;
  };

  // --- 1. PROCESAMIENTO DE PROCURA ---
  const itemsProcura = equipos.map(item => {
    const qty = safeNum(item.cantidad) || 1;
    const costoUnitOrig = safeNum(item.costoBase);
    const costoUnitConvertido = convertir(costoUnitOrig, item.moneda || 'USD');
    const costoTotalBase = costoUnitConvertido * qty;
    const margen = item.margen !== undefined ? safeNum(item.margen) : 0.15;
    
    // Venta Neto y con IVA 10%
    const divisor = Math.max(0.01, 1 - Math.min(0.99, margen));
    const precioVentaNeto = costoTotalBase / divisor;
    const precioVentaConIVA = precioVentaNeto * 1.10;
    const precioUnitarioConIVA = qty > 0 ? precioVentaConIVA / qty : 0;

    return {
      ...item,
      tipo: 'Equipo',
      cantidad: qty,
      costoUnitConvertido,
      costoTotalBase,
      margen,
      precioVentaNeto,
      precioVentaConIVA,
      precioUnitarioConIVA
    };
  });

  // --- 2. PROCESAMIENTO DE SERVICIOS SSTT (Regla de Imprevistos, Tercerizados y MO Propia) ---
  const serviciosProcesados = servicios.map(item => {
    const qty = safeNum(item.cantidad) || 1;
    const esTercerizado = item.estrategia === 'Subcontrato' || item.is_tercerizado === true || (safeNum(item.Costo_Subcontrato_Item) > 0 && safeNum(item.Costo_MO_Item) === 0);
    
    const cTec = esTercerizado ? 0 : safeNum(convertir(item.Costo_Tecnologia_Item, item.moneda || 'PYG'));
    const cMO = esTercerizado ? 0 : safeNum(convertir(item.Costo_MO_Item, item.moneda || 'PYG'));
    const cSubc = esTercerizado ? safeNum(convertir(item.Costo_Subcontrato_Item || item.costoBase, item.moneda || 'PYG')) : 0;
    const cFee = safeNum(convertir(item.costoServiceFee, item.moneda || 'PYG'));
    const cAmort = safeNum(convertir(item.costoAmortizacion, item.moneda || 'PYG'));
    
    const subtotalDirectoUnit = cTec + cMO + cSubc + cFee + cAmort;
    const subtotalDirectoTotal = subtotalDirectoUnit * qty;

    const horas_equipo = esTercerizado ? 0 : (safeNum(item.horas_equipo));
    const horas_servicio = esTercerizado ? 0 : (safeNum(item.horas_servicio));

    return {
      ...item,
      tipo: 'Servicio',
      cantidad: qty,
      esTercerizado,
      horas_equipo,
      horas_servicio,
      cTec,
      cMO,
      cSubc,
      cFee,
      cAmort,
      subtotalDirectoUnit,
      subtotalDirectoTotal
    };
  });

  // Suma de MO propia para distribuir logística e imprevistos SÓLO en personal propio
  const sumaMOPropia = serviciosProcesados
    .filter(s => !s.esTercerizado)
    .reduce((acc, s) => acc + (s.cMO * s.cantidad), 0);

  const sumaCostoDirectoSSTTTotal = serviciosProcesados
    .reduce((acc, s) => acc + s.subtotalDirectoTotal, 0);

  const logisticaConvertida = safeNum(convertir(logisticaGlobal, 'PYG'));
  const imprevistosConvertidos = safeNum(convertir(gastosImprevistos, 'PYG'));
  const adminSSTTConvertido = safeNum(convertir(gastosAdminSSTT, 'PYG'));

  const itemsSSTT = serviciosProcesados.map(item => {
    const qty = item.cantidad;
    let logAsignada = 0;
    let impAsignado = 0;
    let adminAsignado = 0;

    if (!item.esTercerizado && sumaMOPropia > 0) {
      // Regla de Negocio: Logística e Imprevistos se asignan al Personal Propio
      const pesoMO = (item.cMO * qty) / sumaMOPropia;
      logAsignada = logisticaConvertida * pesoMO;
      impAsignado = imprevistosConvertidos * pesoMO;
    } else {
      // Regla de Negocio: 0 Imprevistos y 0 Logística para subcontratos tercerizados
      logAsignada = 0;
      impAsignado = 0;
    }

    if (sumaCostoDirectoSSTTTotal > 0) {
      const pesoDirecto = item.subtotalDirectoTotal / sumaCostoDirectoSSTTTotal;
      adminAsignado = adminSSTTConvertido * pesoDirecto;
    }

    const costoTotalReal = item.costo_total_real 
      ? safeNum(convertir(item.costo_total_real, item.moneda || 'PYG')) 
      : (item.subtotalDirectoTotal + logAsignada + impAsignado + adminAsignado);
      
    const margen = item.margen !== undefined ? safeNum(item.margen) : 0.15;
    
    // Precio de Venta Neto y con IVA 10% (Usa el valor oficial del motor para paridad 1:1 absoluta)
    const divisor = Math.max(0.01, 1 - Math.min(0.99, margen));
    const precioVentaNeto = item.precio_total_final 
      ? safeNum(convertir(item.precio_total_final, item.moneda || 'PYG'))
      : (costoTotalReal / divisor);
      
    const precioVentaConIVA = precioVentaNeto * 1.10;
    const precioUnitarioConIVA = qty > 0 ? (precioVentaConIVA / qty) : 0;

    return {
      ...item,
      logAsignada: item.logAsignada || logAsignada,
      impAsignado: item.impAsignado || impAsignado,
      adminAsignado: item.adminAsignado || adminAsignado,
      costoTotalReal,
      margen,
      precioVentaNeto,
      precioVentaConIVA,
      precioUnitarioConIVA
    };
  });

  // --- 3. PROCESAMIENTO DE ALQUILERES ESPECIALES (Partida Independiente) ---
  const itemsAlquileres = (Array.isArray(alquileres) ? alquileres : []).map(alq => {
    const qty = safeNum(alq.cantidad) || 1;
    const costoUnitOrig = safeNum(alq.costoBase || alq.costo || alq.costo_directo_unitario);
    const costoUnitConvertido = convertir(costoUnitOrig, alq.moneda || 'PYG');
    const costoTotal = costoUnitConvertido * qty;
    const margen = alq.margen !== undefined ? safeNum(alq.margen) : 0.30;
    
    const divisor = Math.max(0.01, 1 - Math.min(0.99, margen));
    const precioVentaNeto = alq.precio_total_final 
      ? safeNum(convertir(alq.precio_total_final, alq.moneda || 'PYG'))
      : (alq.precioFinal ? safeNum(convertir(alq.precioFinal, alq.moneda || 'PYG')) : (costoTotal / divisor));
      
    const precioVentaConIVA = precioVentaNeto * 1.10;
    const precioUnitarioConIVA = qty > 0 ? (precioVentaConIVA / qty) : 0;

    return {
      ...alq,
      descripcion: alq.descripcion || alq.nombre || alq.equipo || 'Alquiler Especial / Equipo de Apoyo',
      cantidad: qty,
      costoUnitConvertido,
      costoTotal,
      margen,
      precioVentaNeto,
      precioVentaConIVA,
      precioUnitarioConIVA
    };
  });


  // --- 4. GENERACIÓN DE HOJAS CON EXCELJS ---
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Beigel SRL';
  workbook.created = new Date();

  // Estilos Corporativos
  const blueFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003366' }
  };
  const sectionFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEBF2FA' }
  };
  const whiteFont = {
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11,
    name: 'Calibri'
  };
  const blackFontBold = {
    color: { argb: 'FF000000' },
    bold: true,
    size: 11,
    name: 'Calibri'
  };
  const headerMetaFont = {
    color: { argb: 'FF003366' },
    bold: true,
    size: 10,
    name: 'Calibri'
  };
  const metaValFont = {
    color: { argb: 'FF333333' },
    size: 10,
    name: 'Calibri'
  };

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
  };

  const moneyFormat = '#,##0.00';
  const percentFormat = '0.00%';
  const fechaHoy = new Date().toLocaleDateString('es-PY', { year: 'numeric', month: '2-digit', day: '2-digit' });


  // =========================================================================
  // HOJA 1: Propuesta Comercial (Vista Cliente - Lista para Copiar y Pegar)
  // Precios con IVA (10%) INCLUIDO según Ley Paraguaya N° 6380/19
  // =========================================================================
  const sheet1 = workbook.addWorksheet('Propuesta Comercial');
  const colsSheet1 = [8, 65, 10, 26, 28];
  colsSheet1.forEach((w, i) => { sheet1.getColumn(i + 1).width = w; });

  // Banner
  sheet1.mergeCells('A1:E2');
  const title1 = sheet1.getCell('A1');
  title1.value = 'PROPUESTA COMERCIAL - BEIGEL SRL';
  title1.fill = blueFill;
  title1.font = { ...whiteFont, size: 15 };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet1.addRow([]);

  // Metadatos
  const rowMeta1 = sheet1.addRow(['CLIENTE:', cliente || 'A Convenir', '', 'FECHA:', fechaHoy]);
  rowMeta1.getCell(1).font = headerMetaFont;
  rowMeta1.getCell(2).font = metaValFont;
  rowMeta1.getCell(4).font = headerMetaFont;
  rowMeta1.getCell(5).font = metaValFont;

  const rowMeta2 = sheet1.addRow(['PROYECTO / OBRA:', proyecto || 'Suministros y Servicios EPC', '', 'MONEDA:', `${moneda} (IVA 10% Incluido)`]);
  rowMeta2.getCell(1).font = headerMetaFont;
  rowMeta2.getCell(2).font = metaValFont;
  rowMeta2.getCell(4).font = headerMetaFont;
  rowMeta2.getCell(5).font = metaValFont;

  if (moneda === 'USD') {
    const rowMeta3 = sheet1.addRow(['T.C. REFERENCIA:', `1 USD = ${Number(tasaCambio).toLocaleString('es-PY')} PYG`, '', 'RÉGIMEN:', esLicitacion ? 'Licitación Pública' : 'Sector Privado']);
    rowMeta3.getCell(1).font = headerMetaFont;
    rowMeta3.getCell(2).font = metaValFont;
    rowMeta3.getCell(4).font = headerMetaFont;
    rowMeta3.getCell(5).font = metaValFont;
  }

  sheet1.addRow([]);

  // Cabecera Tabla Comercial
  const headerRow1 = sheet1.addRow([
    'Ítem', 
    'Descripción del Suministro / Servicio', 
    'Cant.', 
    `PU c/ IVA (${moneda})`, 
    `PT c/ IVA (${moneda})`
  ]);
  headerRow1.eachCell(cell => {
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  headerRow1.height = 26;

  let indexGeneral = 1;
  let rowNumSubtotalA = null;
  let rowNumSubtotalB = null;
  let rowNumSubtotalC = null;

  // --- SECCIÓN A: PROCURA ---
  const rowA = sheet1.addRow(['', 'A. SUMINISTRO DE EQUIPOS (PROCURA)', '', '', '']);
  rowA.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };
  rowA.fill = sectionFill;

  let startRowProcura = null;
  let endRowProcura = null;

  if (itemsProcura.length > 0) {
    itemsProcura.forEach(item => {
      const row = sheet1.addRow([
        indexGeneral++,
        item.descripcion || item.item || 'Suministro sin nombre',
        item.cantidad,
        0,
        item.precioVentaConIVA
      ]);
      const cur = row.number;
      if (!startRowProcura) startRowProcura = cur;
      endRowProcura = cur;

      row.getCell(4).value = { formula: `E${cur}/C${cur}`, result: item.precioUnitarioConIVA };
      row.getCell(4).numFmt = moneyFormat;
      row.getCell(5).numFmt = moneyFormat;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.eachCell(c => c.border = thinBorder);
    });

    const sumProcuraIVA = itemsProcura.reduce((acc, i) => acc + i.precioVentaConIVA, 0);
    const rowSubA = sheet1.addRow([
      '', '', '', 
      'Subtotal Suministros c/ IVA:', 
      { formula: `SUM(E${startRowProcura}:E${endRowProcura})`, result: sumProcuraIVA }
    ]);
    rowNumSubtotalA = rowSubA.number;
    rowSubA.getCell(4).font = blackFontBold;
    rowSubA.getCell(5).font = blackFontBold;
    rowSubA.getCell(5).numFmt = moneyFormat;
    rowSubA.fill = sectionFill;
  } else {
    const emptyRowA = sheet1.addRow(['-', 'No incluye suministros en esta oferta', 0, 0, 0]);
    emptyRowA.eachCell(c => c.border = thinBorder);
    emptyRowA.getCell(4).numFmt = moneyFormat;
    emptyRowA.getCell(5).numFmt = moneyFormat;
  }

  sheet1.addRow([]);

  // --- SECCIÓN B: SSTT ---
  const rowB = sheet1.addRow(['', 'B. SERVICIOS TÉCNICOS Y MANO DE OBRA (SSTT)', '', '', '']);
  rowB.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };
  rowB.fill = sectionFill;

  let startRowSSTT = null;
  let endRowSSTT = null;

  if (itemsSSTT.length > 0) {
    itemsSSTT.forEach(item => {
      const row = sheet1.addRow([
        indexGeneral++,
        item.descripcion || item.item || item.equipo || 'Servicio Técnico Especializado',
        item.cantidad,
        0,
        item.precioVentaConIVA
      ]);
      const cur = row.number;
      if (!startRowSSTT) startRowSSTT = cur;
      endRowSSTT = cur;

      row.getCell(4).value = { formula: `E${cur}/C${cur}`, result: item.precioUnitarioConIVA };
      row.getCell(4).numFmt = moneyFormat;
      row.getCell(5).numFmt = moneyFormat;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.eachCell(c => c.border = thinBorder);
    });

    const sumSSTTIVA = itemsSSTT.reduce((acc, i) => acc + i.precioVentaConIVA, 0);
    const rowSubB = sheet1.addRow([
      '', '', '', 
      'Subtotal Servicios c/ IVA:', 
      { formula: `SUM(E${startRowSSTT}:E${endRowSSTT})`, result: sumSSTTIVA }
    ]);
    rowNumSubtotalB = rowSubB.number;
    rowSubB.getCell(4).font = blackFontBold;
    rowSubB.getCell(5).font = blackFontBold;
    rowSubB.getCell(5).numFmt = moneyFormat;
    rowSubB.fill = sectionFill;
  } else {
    const emptyRowB = sheet1.addRow(['-', 'No incluye servicios técnicos en esta oferta', 0, 0, 0]);
    emptyRowB.eachCell(c => c.border = thinBorder);
    emptyRowB.getCell(4).numFmt = moneyFormat;
    emptyRowB.getCell(5).numFmt = moneyFormat;
  }

  // --- SECCIÓN C: ALQUILERES ESPECIALES (SI EXISTEN) ---
  let startRowAlq = null;
  let endRowAlq = null;

  if (itemsAlquileres.length > 0) {
    sheet1.addRow([]);
    const rowC = sheet1.addRow(['', 'C. ALQUILERES ESPECIALES Y EQUIPOS DE APOYO PESADO', '', '', '']);
    rowC.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };
    rowC.fill = sectionFill;

    itemsAlquileres.forEach(item => {
      const row = sheet1.addRow([
        indexGeneral++,
        item.descripcion || item.nombre || 'Alquiler Especial de Maquinaria',
        item.cantidad,
        0,
        item.precioVentaConIVA
      ]);
      const cur = row.number;
      if (!startRowAlq) startRowAlq = cur;
      endRowAlq = cur;

      row.getCell(4).value = { formula: `E${cur}/C${cur}`, result: item.precioUnitarioConIVA };
      row.getCell(4).numFmt = moneyFormat;
      row.getCell(5).numFmt = moneyFormat;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.eachCell(c => c.border = thinBorder);
    });

    const sumAlqIVA = itemsAlquileres.reduce((acc, i) => acc + i.precioVentaConIVA, 0);
    const rowSubC = sheet1.addRow([
      '', '', '', 
      'Subtotal Alquileres c/ IVA:', 
      { formula: `SUM(E${startRowAlq}:E${endRowAlq})`, result: sumAlqIVA }
    ]);
    rowNumSubtotalC = rowSubC.number;
    rowSubC.getCell(4).font = blackFontBold;
    rowSubC.getCell(5).font = blackFontBold;
    rowSubC.getCell(5).numFmt = moneyFormat;
    rowSubC.fill = sectionFill;
  }

  // --- TOTAL GENERAL ---
  sheet1.addRow([]);

  const subtotalRefs = [rowNumSubtotalA, rowNumSubtotalB, rowNumSubtotalC].filter(Boolean);
  const formulaTotalGeneral = subtotalRefs.length > 0 ? subtotalRefs.map(r => `E${r}`).join('+') : '0';
  
  const totalEstimadoIVA = itemsProcura.reduce((acc, i) => acc + i.precioVentaConIVA, 0) +
                           itemsSSTT.reduce((acc, i) => acc + i.precioVentaConIVA, 0) +
                           itemsAlquileres.reduce((acc, i) => acc + i.precioVentaConIVA, 0);

  const totalRow1 = sheet1.addRow([
    '', '', '', 
    'TOTAL GENERAL DE LA OFERTA (c/ IVA):', 
    { formula: formulaTotalGeneral, result: totalEstimadoIVA }
  ]);
  const rowNumTotalGeneral = totalRow1.number;
  totalRow1.getCell(4).font = { ...blackFontBold, size: 12, color: { argb: 'FF003366' } };
  totalRow1.getCell(5).font = { ...blackFontBold, size: 12, color: { argb: 'FF003366' } };
  totalRow1.getCell(5).numFmt = moneyFormat;
  totalRow1.height = 24;

  // Liquidación Legal IVA 10% (Total / 11)
  const rowIVA1 = sheet1.addRow([
    '', '', '', 
    'Liquidación IVA (10% incluido - Ley 6380/19):', 
    { formula: `E${rowNumTotalGeneral}/11`, result: totalEstimadoIVA / 11 }
  ]);
  rowIVA1.getCell(4).font = { ...metaValFont, italic: true };
  rowIVA1.getCell(5).font = { ...metaValFont, italic: true };
  rowIVA1.getCell(5).numFmt = moneyFormat;

  sheet1.addRow([]);
  const notaLegal = sheet1.addRow([
    'Nota Legal:', 
    'Los precios unitarios y totales expresados en la presente propuesta comercial incluyen el Impuesto al Valor Agregado (IVA 10%) conforme a la legislación tributaria paraguaya vigente.'
  ]);
  notaLegal.getCell(1).font = { ...metaValFont, bold: true };
  notaLegal.getCell(2).font = { ...metaValFont, italic: true };


  // =========================================================================
  // HOJA 2: Auditoría Procura (Desglose Landed Cost & Fórmulas Vivas)
  // =========================================================================
  const sheet2 = workbook.addWorksheet('Auditoría Procura');
  const colsSheet2 = [8, 42, 14, 8, 18, 18, 14, 14, 18, 14, 14, 14, 14, 14, 22, 18, 12, 22, 22];
  colsSheet2.forEach((w, i) => { sheet2.getColumn(i + 1).width = w; });

  sheet2.mergeCells('A1:S2');
  const title2 = sheet2.getCell('A1');
  title2.value = 'AUDITORÍA GERENCIAL - PROCURA Y SUMINISTROS (DESGLOSE COMPLETO)';
  title2.fill = blueFill;
  title2.font = { ...whiteFont, size: 15 };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet2.addRow([]);

  const headersSheet2 = [
    'Ítem',
    'Descripción',
    'NCM',
    'Cant.',
    `FOB Unit. (${moneda})`,
    `FOB Total (${moneda})`,
    `Flete Int. (${moneda})`,
    `Seguro (${moneda})`,
    `CIF Total (${moneda})`,
    `Arancel (${moneda})`,
    `Despacho (${moneda})`,
    `Flete Local (${moneda})`,
    `Financiero (${moneda})`,
    `Admin (${moneda})`,
    `Landed Cost Total (${moneda})`,
    `Landed Unit. (${moneda})`,
    'Margen (%)',
    `Venta Neto Total (${moneda})`,
    `Venta Total c/ IVA (${moneda})`
  ];
  
  const headerRow2 = sheet2.addRow(headersSheet2);
  headerRow2.eachCell(cell => {
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  headerRow2.height = 36;

  let startRowProcuraAudit = null;
  let endRowProcuraAudit = null;
  let idxProcura = 1;

  let sumAuditFOB = 0, sumAuditFlete = 0, sumAuditSeg = 0, sumAuditCIF = 0;
  let sumAuditArancel = 0, sumAuditDesp = 0, sumAuditFleteLoc = 0, sumAuditFin = 0, sumAuditAdmin = 0;
  let sumAuditLanded = 0, sumAuditVentaNeto = 0, sumAuditVentaIVA = 0, sumAuditCant = 0;

  itemsProcura.forEach(item => {
    const qty = item.cantidad;
    const fobUnit = safeNum(item.fobUnit);
    const fobTotal = fobUnit * qty;
    const fleteInt = safeNum(item.fleteTotal);
    const seguro = safeNum(item.seguroTotal);
    const cifTotal = safeNum(item.cifTotal) || (fobTotal + fleteInt + seguro);
    const arancel = safeNum(item.arancelTotal);
    const despacho = safeNum(item.despachoTotal);
    const fleteLoc = safeNum(item.fleteLocalTotal);
    const finTotal = safeNum(item.finTotal);
    const adminTotal = safeNum(item.adminTotal);
    const landedTotal = safeNum(item.costoTotalBase) || (cifTotal + arancel + despacho + fleteLoc + finTotal + adminTotal);
    const landedUnit = qty > 0 ? (landedTotal / qty) : 0;
    const margen = item.margen;
    const ventaNeto = item.precioVentaNeto;
    const ventaIVA = item.precioVentaConIVA;

    sumAuditCant += qty;
    sumAuditFOB += fobTotal;
    sumAuditFlete += fleteInt;
    sumAuditSeg += seguro;
    sumAuditCIF += cifTotal;
    sumAuditArancel += arancel;
    sumAuditDesp += despacho;
    sumAuditFleteLoc += fleteLoc;
    sumAuditFin += finTotal;
    sumAuditAdmin += adminTotal;
    sumAuditLanded += landedTotal;
    sumAuditVentaNeto += ventaNeto;
    sumAuditVentaIVA += ventaIVA;

    const row = sheet2.addRow([
      idxProcura++,
      item.descripcion || item.item || 'Suministro sin nombre',
      item.ncm || '8504.23.00',
      qty,
      fobUnit,
      0,
      fleteInt,
      seguro,
      0,
      arancel,
      despacho,
      fleteLoc,
      finTotal,
      adminTotal,
      0,
      0,
      margen,
      0,
      0
    ]);

    const r = row.number;
    if (!startRowProcuraAudit) startRowProcuraAudit = r;
    endRowProcuraAudit = r;

    row.getCell(6).value = { formula: `D${r}*E${r}`, result: fobTotal };
    row.getCell(9).value = { formula: `F${r}+G${r}+H${r}`, result: cifTotal };
    row.getCell(15).value = { formula: `I${r}+J${r}+K${r}+L${r}+M${r}+N${r}`, result: landedTotal };
    row.getCell(16).value = { formula: `O${r}/D${r}`, result: landedUnit };
    row.getCell(18).value = { formula: `O${r}/(1-Q${r})`, result: ventaNeto };
    row.getCell(19).value = { formula: `R${r}*1.10`, result: ventaIVA };

    [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19].forEach(col => row.getCell(col).numFmt = moneyFormat);
    row.getCell(17).numFmt = percentFormat;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.eachCell(c => c.border = thinBorder);
  });

  if (startRowProcuraAudit && endRowProcuraAudit) {
    sheet2.addRow([]);
    const totalRow2 = sheet2.addRow(['', 'TOTALES PROCURA:', '']);
    
    totalRow2.getCell(4).value = { formula: `SUM(D${startRowProcuraAudit}:D${endRowProcuraAudit})`, result: sumAuditCant };
    totalRow2.getCell(6).value = { formula: `SUM(F${startRowProcuraAudit}:F${endRowProcuraAudit})`, result: sumAuditFOB };
    totalRow2.getCell(7).value = { formula: `SUM(G${startRowProcuraAudit}:G${endRowProcuraAudit})`, result: sumAuditFlete };
    totalRow2.getCell(8).value = { formula: `SUM(H${startRowProcuraAudit}:H${endRowProcuraAudit})`, result: sumAuditSeg };
    totalRow2.getCell(9).value = { formula: `SUM(I${startRowProcuraAudit}:I${endRowProcuraAudit})`, result: sumAuditCIF };
    totalRow2.getCell(10).value = { formula: `SUM(J${startRowProcuraAudit}:J${endRowProcuraAudit})`, result: sumAuditArancel };
    totalRow2.getCell(11).value = { formula: `SUM(K${startRowProcuraAudit}:K${endRowProcuraAudit})`, result: sumAuditDesp };
    totalRow2.getCell(12).value = { formula: `SUM(L${startRowProcuraAudit}:L${endRowProcuraAudit})`, result: sumAuditFleteLoc };
    totalRow2.getCell(13).value = { formula: `SUM(M${startRowProcuraAudit}:M${endRowProcuraAudit})`, result: sumAuditFin };
    totalRow2.getCell(14).value = { formula: `SUM(N${startRowProcuraAudit}:N${endRowProcuraAudit})`, result: sumAuditAdmin };
    totalRow2.getCell(15).value = { formula: `SUM(O${startRowProcuraAudit}:O${endRowProcuraAudit})`, result: sumAuditLanded };
    totalRow2.getCell(18).value = { formula: `SUM(R${startRowProcuraAudit}:R${endRowProcuraAudit})`, result: sumAuditVentaNeto };
    totalRow2.getCell(19).value = { formula: `SUM(S${startRowProcuraAudit}:S${endRowProcuraAudit})`, result: sumAuditVentaIVA };

    totalRow2.eachCell(c => { c.font = blackFontBold; c.border = thinBorder; });
    [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19].forEach(col => totalRow2.getCell(col).numFmt = moneyFormat);
    totalRow2.fill = sectionFill;
  }


  // =========================================================================
  // HOJA 3: Auditoría SSTT y Apoyos Especiales (Arquitectura Completa y Transparente)
  // =========================================================================
  const sheet3 = workbook.addWorksheet('Auditoría SSTT');
  const colsSheet3 = [6, 40, 13, 7, 10, 10, 18, 18, 18, 16, 16, 20, 20, 18, 18, 18, 20, 11, 20, 22];
  colsSheet3.forEach((w, i) => { sheet3.getColumn(i + 1).width = w; });

  sheet3.mergeCells('A1:T2');
  const title3 = sheet3.getCell('A1');
  title3.value = 'AUDITORÍA GERENCIAL - SERVICIOS TÉCNICOS Y EQUIPOS DE APOYO (SSTT)';
  title3.fill = blueFill;
  title3.font = { ...whiteFont, size: 15 };
  title3.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet3.addRow([]);

  const headersSheet3 = [
    'Ítem',
    'Descripción del Servicio',
    'Estrategia',
    'Cant.',
    'Horas Eq.',
    'Horas Serv.',
    `Costo Tecnol. Unit. (${moneda})`,
    `Costo MO Unit. (${moneda})`,
    `Subcontrato Unit. (${moneda})`,
    `Fee Unit. (${moneda})`,
    `Amort. Unit. (${moneda})`,
    `Subtotal Directo Unit. (${moneda})`,
    `Subtotal Directo Total (${moneda})`,
    `Logística Total (${moneda})`,
    `Imprevistos Total (${moneda})`,
    `Gastos Admin Total (${moneda})`,
    `Costo Total Real (${moneda})`,
    'Margen (%)',
    `PU c/ IVA (${moneda})`,
    `PT c/ IVA (${moneda})`
  ];
  
  const headerRow3 = sheet3.addRow(headersSheet3);
  headerRow3.eachCell(cell => {
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  headerRow3.height = 36;

  let startRowSSTTAudit = null;
  let endRowSSTTAudit = null;
  let idxSSTT = 1;

  let sumSSTTCant = 0;
  let sumSSTTHorasEq = 0, sumSSTTHorasServ = 0, sumSSTTTec = 0, sumSSTTMO = 0;
  let sumSSTTSubc = 0, sumSSTTFee = 0, sumSSTTAmort = 0;
  let sumSSTTSubDirectoUnit = 0, sumSSTTSubDirectoTotal = 0;
  let sumSSTTLog = 0, sumSSTTImp = 0, sumSSTTAdmin = 0;
  let sumSSTTCostoReal = 0, sumSSTTVentaNeto = 0, sumSSTTVentaIVA = 0;

  itemsSSTT.forEach(item => {
    const qty = item.cantidad;
    sumSSTTCant += qty;
    sumSSTTHorasEq += item.horas_equipo * qty;
    sumSSTTHorasServ += item.horas_servicio * qty;
    sumSSTTTec += item.cTec;
    sumSSTTMO += item.cMO;
    sumSSTTSubc += item.cSubc;
    sumSSTTFee += item.cFee;
    sumSSTTAmort += item.cAmort;
    sumSSTTSubDirectoUnit += item.subtotalDirectoUnit;
    sumSSTTSubDirectoTotal += item.subtotalDirectoTotal;
    sumSSTTLog += item.logAsignada;
    sumSSTTImp += item.impAsignado;
    sumSSTTAdmin += item.adminAsignado;
    sumSSTTCostoReal += item.costoTotalReal;
    sumSSTTVentaNeto += item.precioVentaNeto;
    sumSSTTVentaIVA += item.precioVentaConIVA;

    let nombreItem = item.descripcion || item.item || item.equipo || 'Servicio Técnico';
    if (item.esTercerizado && item.modo_subcontrato === 'jornal') {
      const cEspDia = safeNum(convertir(item.sub_esp_costo_dia || 0, 'PYG'));
      const cAuxDia = safeNum(convertir(item.sub_aux_costo_dia || 0, 'PYG'));
      const formatNum = (v) => Math.round(v).toLocaleString();
      nombreItem += ` [Subc: ${item.sub_esp_cant || 0} Esp @ ${moneda === 'USD' ? '$' : 'Gs.'}${formatNum(cEspDia)} + ${item.sub_aux_cant || 0} Aux @ ${moneda === 'USD' ? '$' : 'Gs.'}${formatNum(cAuxDia)}]`;
    }

    const row = sheet3.addRow([
      idxSSTT++,
      nombreItem,
      item.esTercerizado ? 'Subcontrato' : (item.estrategia || 'Normal'),
      qty,
      item.horas_equipo,
      item.horas_servicio,
      item.cTec,
      item.cMO,
      item.cSubc,
      item.cFee,
      item.cAmort,
      0, // Col 12: Subtotal Directo Unit
      0, // Col 13: Subtotal Directo Total
      item.logAsignada,
      item.impAsignado,
      item.adminAsignado,
      0, // Col 17: Costo Total Real
      item.margen,
      0, // Col 19: PU c/ IVA
      0  // Col 20: PT c/ IVA
    ]);

    const r = row.number;
    if (!startRowSSTTAudit) startRowSSTTAudit = r;
    endRowSSTTAudit = r;

    row.getCell(12).value = { formula: `G${r}+H${r}+I${r}+J${r}+K${r}`, result: item.subtotalDirectoUnit };
    row.getCell(13).value = { formula: `D${r}*L${r}`, result: item.subtotalDirectoTotal };
    row.getCell(17).value = { formula: `M${r}+N${r}+O${r}+P${r}`, result: item.costoTotalReal };
    row.getCell(19).value = { formula: `T${r}/D${r}`, result: item.precioUnitarioConIVA };
    row.getCell(20).value = { formula: `(Q${r}/(1-R${r}))*1.10`, result: item.precioVentaConIVA };

    [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20].forEach(col => row.getCell(col).numFmt = moneyFormat);
    row.getCell(18).numFmt = percentFormat;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.eachCell(c => c.border = thinBorder);
  });

  let rowNumTotalesSSTT = null;
  if (startRowSSTTAudit && endRowSSTTAudit) {
    sheet3.addRow([]);
    const totalRow3 = sheet3.addRow(['', 'TOTALES SERVICIOS TÉCNICOS:', '']);
    rowNumTotalesSSTT = totalRow3.number;

    totalRow3.getCell(4).value = { formula: `SUM(D${startRowSSTTAudit}:D${endRowSSTTAudit})`, result: sumSSTTCant };
    totalRow3.getCell(5).value = { formula: `SUM(E${startRowSSTTAudit}:E${endRowSSTTAudit})`, result: sumSSTTHorasEq };
    totalRow3.getCell(6).value = { formula: `SUM(F${startRowSSTTAudit}:F${endRowSSTTAudit})`, result: sumSSTTHorasServ };
    totalRow3.getCell(7).value = { formula: `SUM(G${startRowSSTTAudit}:G${endRowSSTTAudit})`, result: sumSSTTTec };
    totalRow3.getCell(8).value = { formula: `SUM(H${startRowSSTTAudit}:H${endRowSSTTAudit})`, result: sumSSTTMO };
    totalRow3.getCell(9).value = { formula: `SUM(I${startRowSSTTAudit}:I${endRowSSTTAudit})`, result: sumSSTTSubc };
    totalRow3.getCell(10).value = { formula: `SUM(J${startRowSSTTAudit}:J${endRowSSTTAudit})`, result: sumSSTTFee };
    totalRow3.getCell(11).value = { formula: `SUM(K${startRowSSTTAudit}:K${endRowSSTTAudit})`, result: sumSSTTAmort };
    totalRow3.getCell(12).value = { formula: `SUM(L${startRowSSTTAudit}:L${endRowSSTTAudit})`, result: sumSSTTSubDirectoUnit };
    totalRow3.getCell(13).value = { formula: `SUM(M${startRowSSTTAudit}:M${endRowSSTTAudit})`, result: sumSSTTSubDirectoTotal };
    totalRow3.getCell(14).value = { formula: `SUM(N${startRowSSTTAudit}:N${endRowSSTTAudit})`, result: sumSSTTLog };
    totalRow3.getCell(15).value = { formula: `SUM(O${startRowSSTTAudit}:O${endRowSSTTAudit})`, result: sumSSTTImp };
    totalRow3.getCell(16).value = { formula: `SUM(P${startRowSSTTAudit}:P${endRowSSTTAudit})`, result: sumSSTTAdmin };
    totalRow3.getCell(17).value = { formula: `SUM(Q${startRowSSTTAudit}:Q${endRowSSTTAudit})`, result: sumSSTTCostoReal };
    totalRow3.getCell(20).value = { formula: `SUM(T${startRowSSTTAudit}:T${endRowSSTTAudit})`, result: sumSSTTVentaIVA };

    totalRow3.eachCell(c => { c.font = blackFontBold; c.border = thinBorder; });
    [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20].forEach(col => totalRow3.getCell(col).numFmt = moneyFormat);
    totalRow3.fill = sectionFill;
  }

  // --- TABLA DE ALQUILERES ESPECIALES EN HOJA 3 ---
  let startRowAlqAudit = null;
  let endRowAlqAudit = null;

  if (itemsAlquileres.length > 0) {
    sheet3.addRow([]);
    const titleAlqRow = sheet3.addRow([]);
    titleAlqRow.getCell(2).value = 'DESGLOSE DE ALQUILERES ESPECIALES Y EQUIPOS DE APOYO PESADO';
    titleAlqRow.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };

    itemsAlquileres.forEach(item => {
      const row = sheet3.addRow([
        idxSSTT++,
        item.descripcion || item.nombre || 'Alquiler Especial de Equipo',
        'Alquiler Especial',
        item.cantidad,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        item.costoUnitConvertido, // Col 12: Subtotal Directo Unit
        0,                        // Col 13: Subtotal Directo Total
        0,                        // Col 14: Logística
        0,                        // Col 15: Imprevistos
        0,                        // Col 16: Admin
        0,                        // Col 17: Costo Total Real
        item.margen,              // Col 18: Margen
        0,                        // Col 19: PU c/ IVA
        0                         // Col 20: PT c/ IVA
      ]);

      const r = row.number;
      if (!startRowAlqAudit) startRowAlqAudit = r;
      endRowAlqAudit = r;

      row.getCell(13).value = { formula: `D${r}*L${r}`, result: item.costoTotal };
      row.getCell(17).value = { formula: `M${r}+N${r}+O${r}+P${r}`, result: item.costoTotal };
      row.getCell(19).value = { formula: `T${r}/D${r}`, result: item.precioUnitarioConIVA };
      row.getCell(20).value = { formula: `(Q${r}/(1-R${r}))*1.10`, result: item.precioVentaConIVA };

      [12, 13, 14, 15, 16, 17, 19, 20].forEach(col => row.getCell(col).numFmt = moneyFormat);
      row.getCell(18).numFmt = percentFormat;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };
      row.eachCell(c => c.border = thinBorder);
    });

    const sumAlqCant = itemsAlquileres.reduce((acc, i) => acc + i.cantidad, 0);
    const sumAlqCosto = itemsAlquileres.reduce((acc, i) => acc + i.costoTotal, 0);
    const sumAlqIVA = itemsAlquileres.reduce((acc, i) => acc + i.precioVentaConIVA, 0);

    const totalRowAlq = sheet3.addRow(['', 'TOTALES ALQUILERES ESPECIALES:', '']);
    totalRowAlq.getCell(4).value = { formula: `SUM(D${startRowAlqAudit}:D${endRowAlqAudit})`, result: sumAlqCant };
    totalRowAlq.getCell(13).value = { formula: `SUM(M${startRowAlqAudit}:M${endRowAlqAudit})`, result: sumAlqCosto };
    totalRowAlq.getCell(17).value = { formula: `SUM(Q${startRowAlqAudit}:Q${endRowAlqAudit})`, result: sumAlqCosto };
    totalRowAlq.getCell(20).value = { formula: `SUM(T${startRowAlqAudit}:T${endRowAlqAudit})`, result: sumAlqIVA };

    totalRowAlq.eachCell(c => { c.font = blackFontBold; c.border = thinBorder; });
    [4, 12, 13, 17, 20].forEach(col => totalRowAlq.getCell(col).numFmt = moneyFormat);
    totalRowAlq.fill = sectionFill;
  }

  // Pólizas de Licitación (Hoja 3)
  if (esLicitacion) {
    sheet3.addRow([]);
    const polizasTitle = sheet3.addRow([]);
    polizasTitle.getCell(2).value = 'PÓLIZAS REQUERIDAS DEL PROYECTO (LICITACIÓN PÚBLICA)';
    polizasTitle.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };

    const totalVentaSSTT_Alq_IVA = (itemsSSTT.reduce((acc, i) => acc + i.precioVentaConIVA, 0)) +
                                   (itemsAlquileres.reduce((acc, i) => acc + i.precioVentaConIVA, 0));

    const rowFiel = sheet3.addRow([]);
    rowFiel.getCell(2).value = 'Póliza Fiel Cumplimiento de Contrato (5% Total c/ IVA)';
    rowFiel.getCell(20).value = { 
      formula: rowNumTotalesSSTT && endRowAlqAudit 
        ? `(T${rowNumTotalesSSTT}+T${endRowAlqAudit + 1})*0.05` 
        : (rowNumTotalesSSTT ? `T${rowNumTotalesSSTT}*0.05` : '0'), 
      result: totalVentaSSTT_Alq_IVA * 0.05 
    };
    rowFiel.getCell(20).numFmt = moneyFormat;
    rowFiel.getCell(2).font = metaValFont;

    const rowAnticipo = sheet3.addRow([]);
    rowAnticipo.getCell(2).value = 'Póliza de Anticipo Financiero (20% Total c/ IVA)';
    rowAnticipo.getCell(20).value = { 
      formula: rowNumTotalesSSTT && endRowAlqAudit 
        ? `(T${rowNumTotalesSSTT}+T${endRowAlqAudit + 1})*0.20` 
        : (rowNumTotalesSSTT ? `T${rowNumTotalesSSTT}*0.20` : '0'), 
      result: totalVentaSSTT_Alq_IVA * 0.20 
    };
    rowAnticipo.getCell(20).numFmt = moneyFormat;
    rowAnticipo.getCell(2).font = metaValFont;
  }


  // =========================================================================
  // HOJA 4: Condiciones Comerciales
  // =========================================================================
  const sheet4 = workbook.addWorksheet('Condiciones Comerciales');
  const colsSheet4 = [32, 95];
  colsSheet4.forEach((w, i) => { sheet4.getColumn(i + 1).width = w; });

  sheet4.mergeCells('A1:B2');
  const title4 = sheet4.getCell('A1');
  title4.value = 'CONDICIONES COMERCIALES DE LA OFERTA';
  title4.fill = blueFill;
  title4.font = { ...whiteFont, size: 15 };
  title4.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet4.addRow([]);

  const condiciones = [
    ['Validez de la Oferta:', '30 días calendario a partir de la fecha de emisión.'],
    ['Plazo de Ejecución y Entrega:', 'A convenir según cronograma ejecutivo de obra y disponibilidad de equipos.'],
    ['Lugar de Entrega (Incoterm):', 'DDP / En Sitio de Obra (según lo acordado en especificaciones técnicas).'],
    ['Garantía Técnica:', '12 meses contra defectos de fabricación / vicios ocultos a partir de la puesta en servicio.'],
    ['Forma de Pago:', esLicitacion ? 'Según Pliego de Bases y Condiciones (Anticipo 20%, saldo contra certificados de avance mensual).' : '30% Anticipo a la orden de compra, 70% contra entrega de equipos y actas de servicio.'],
    ['Impuesto al Valor Agregado (IVA):', 'Todos los precios unitarios y totales de la presente oferta INCLUYEN IVA (10%) conforme a la Ley N° 6380/19.'],
    ['Moneda y Tipo de Cambio:', `Oferta expresada en ${moneda}.${moneda === 'USD' ? ` Tasa de cambio de referencia fijada en 1 USD = ${Number(tasaCambio).toLocaleString('es-PY')} PYG.` : ''}`],
    ['Propiedad Intelectual:', 'La presente cotización y sus anexos de ingeniería son de carácter estrictamente confidencial para uso exclusivo del cliente receptor.']
  ];

  condiciones.forEach(cond => {
    const row = sheet4.addRow(cond);
    row.getCell(1).font = blackFontBold;
    row.getCell(2).font = metaValFont;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.height = 28;
    row.eachCell(c => c.border = thinBorder);
  });

  // --- 5. EXPORTAR ARCHIVO CON NOMBRE DINÁMICO ---
  const buffer = await workbook.xlsx.writeBuffer();
  const fechaISO = new Date().toISOString().split('T')[0];
  const sanitizar = (str) => (str || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  
  let nombreArchivo = 'Cotizacion_Beigel';
  if (cliente && proyecto) {
    nombreArchivo = `Cotizacion_${sanitizar(cliente)}_${sanitizar(proyecto)}_${fechaISO}.xlsx`;
  } else if (cliente) {
    nombreArchivo = `Cotizacion_${sanitizar(cliente)}_${fechaISO}.xlsx`;
  } else {
    nombreArchivo = `Cotizacion_Beigel_${esLicitacion ? 'Licitacion' : 'Privado'}_${fechaISO}.xlsx`;
  }
  
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, nombreArchivo);
};
