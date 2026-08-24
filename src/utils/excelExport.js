import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Función para exportar la cotización a Excel (Formato Beigel SRL)
 * @param {Object} estadoGlobal - Estado global de la cotización
 */
export const exportarAExcelAuditable = async (estadoGlobal) => {
  const {
    equipos = [],        // Equipos de procura
    servicios = [],      // Servicios / SSTT
    viaticos = [],       // Viáticos (arreglo o monto)
    riesgos = 0,         // Bolsa de riesgos
    logistica = 0,       // Bolsa de logística
    financieros = 0,     // Costos financieros
    margenGlobal = 0.15, // Margen por defecto si no viene por ítem
    esLicitacion = false,
    moneda = 'USD',      // Moneda seleccionada para la oferta final
    tasaCambio = 7500    // Tasa de cambio (Ej: 7500 PYG/USD)
  } = estadoGlobal;

  // --- 1. MATEMÁTICA Y PRORRATEO ---
  
  // Función auxiliar para convertir a la moneda seleccionada
  const convertir = (monto, monedaOrigen) => {
    if (!monto) return 0;
    if (!monedaOrigen || monedaOrigen === moneda) return monto;
    if (moneda === 'PYG' && monedaOrigen === 'USD') return monto * tasaCambio;
    if (moneda === 'USD' && monedaOrigen === 'PYG') return monto / tasaCambio;
    return monto;
  };

  // Consolidar ítems directos (Procura + Servicios)
  const itemsDirectos = [
    ...equipos.map(item => ({ ...item, tipo: 'Equipo' })),
    ...servicios.map(item => ({ ...item, tipo: 'Servicio' }))
  ].map(item => {
    // Manejar diferentes posibles nombres de propiedades según la estructura
    const costoUnitarioOrig = item.costoBase || item.costoDirectoBase || item.costoUnitario || 0;
    const cantidad = item.cantidad || 1;
    const monedaItem = item.moneda || moneda;
    
    const costoUnitarioConvertido = convertir(costoUnitarioOrig, monedaItem);
    const costoTotalBase = costoUnitarioConvertido * cantidad;

    return {
      ...item,
      costoUnitarioConvertido,
      cantidad,
      costoTotalBase,
      // Usar margen del ítem o el global
      margen: item.margen !== undefined ? item.margen : margenGlobal
    };
  });

  // Calcular la suma de costos directos SOLO para ítems de tipo 'Servicio' (SSTT)
  // Paso 3: El Uso de Equipos (Tecnología) ya viene dentro de costoTotalBase del ítem.
  // Al sumarlo aquí, se consolida como costo directo de SSTT y NO como indirecto.
  const sumaCostosDirectosSSTT = itemsDirectos
    .filter(item => item.tipo === 'Servicio')
    .reduce((acc, item) => acc + item.costoTotalBase, 0);

  // Paso 2: La Bolsa de Prorrateo Exclusiva de SSTT
  // Capturamos las variables del estadoGlobal (excluimos 'riesgos' para obviar la contingencia global por el momento)
  const apoyosYAlquileres = Number(estadoGlobal.apoyosYAlquileres || estadoGlobal.alquileres || 0);
  const gastosImprevistos = Number(estadoGlobal.gastosImprevistos || estadoGlobal.imprevistos || 0);
  const logisticaGlobal = Number(estadoGlobal.logisticaGlobal || estadoGlobal.logistica || 0);
  
  // Gastos Administrativos: Calculados EXCLUSIVAMENTE sobre el subtotal de costos directos de SSTT
  // (Si viene el porcentaje del estado global se usa, si no, se asume un 3% estándar)
  const porcentajeAdminSSTT = Number(estadoGlobal.porcentajeAdminSSTT || 0.03);
  const gastosAdminSSTT = sumaCostosDirectosSSTT * porcentajeAdminSSTT;

  // Bolsa estricta de indirectos para SSTT
  const sumaCostosIndirectos = apoyosYAlquileres + gastosImprevistos + logisticaGlobal + gastosAdminSSTT;

  // Calcular prorrateo y precios finales por ítem
  const itemsProcesados = itemsDirectos.map(item => {
    let pesoRelativo = 0;
    let prorrateoAsignado = 0;

    if (item.tipo === 'Servicio') {
      // Prorrateo exclusivo para SSTT
      pesoRelativo = sumaCostosDirectosSSTT > 0 ? (item.costoTotalBase / sumaCostosDirectosSSTT) : 0;
      prorrateoAsignado = sumaCostosIndirectos * pesoRelativo;
    } else {
      // Paso 4: Blindaje Matemático de Procura
      // Los ítems de Procura mantienen su estructura Landed Cost.
      pesoRelativo = 0;
      prorrateoAsignado = 0;
    }

    const costoTotalReal = item.costoTotalBase + prorrateoAsignado;
    
    // Precio Venta Neto (fórmula de margen sobre venta: Precio = Costo / (1 - Margen))
    const precioVentaNeto = costoTotalReal / (1 - (item.margen || 0.15));
    const precioVentaConIVA = precioVentaNeto * 1.10; // IVA 10% Ley Paraguaya
    
    // Valores unitarios para la vista cliente
    const precioUnitarioConIVA = precioVentaConIVA / item.cantidad;

    return {
      ...item,
      pesoRelativo,
      prorrateoAsignado,
      costoTotalReal,
      precioVentaNeto,
      precioVentaConIVA,
      precioUnitarioConIVA
    };
  });

  // --- 2. GENERACIÓN DEL EXCEL ---
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Beigel SRL';
  workbook.created = new Date();

  // Estilos corporativos Beigel SRL
  const blueFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF003366' } // Azul institucional profundo
  };
  const whiteFont = {
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 12,
    name: 'Calibri'
  };
  const blackFontBold = {
    color: { argb: 'FF000000' },
    bold: true,
    size: 11,
    name: 'Calibri'
  };
  const moneyFormat = '#,##0.00';
  const percentFormat = '0.00%';

  // =========================================================================
  // HOJA 1: Propuesta Comercial (Vista Cliente)
  // =========================================================================
  const sheet1 = workbook.addWorksheet('Propuesta Comercial');

  // Banner y Título
  sheet1.mergeCells('A1:E2');
  const title1 = sheet1.getCell('A1');
  title1.value = 'PROPUESTA COMERCIAL - BEIGEL SRL';
  title1.fill = blueFill;
  title1.font = { ...whiteFont, size: 16 };
  title1.alignment = { vertical: 'middle', horizontal: 'center' };

  // Espacio
  sheet1.addRow([]);

  // Encabezados
  const headerRow1 = sheet1.addRow([
    'Ítem', 
    'Descripción', 
    'Cant', 
    `PU c/ IVA (${moneda})`, 
    `PT c/ IVA (${moneda})`
  ]);
  
  headerRow1.eachCell(cell => {
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let indexGeneral = 1;

  // A. SUMINISTRO DE EQUIPOS (PROCURA)
  const rowA = sheet1.addRow(['', 'A. SUMINISTRO DE EQUIPOS (PROCURA)', '', '', '']);
  rowA.getCell(2).font = blackFontBold;

  let totalPropuestaProcura = 0;
  itemsProcesados.filter(i => i.tipo === 'Equipo').forEach(item => {
    const row = sheet1.addRow([
      indexGeneral++,
      item.descripcion || item.item || 'Ítem sin nombre',
      item.cantidad,
      item.precioUnitarioConIVA,
      item.precioVentaConIVA
    ]);
    row.getCell(4).numFmt = moneyFormat;
    row.getCell(5).numFmt = moneyFormat;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    totalPropuestaProcura += item.precioVentaConIVA;
  });

  const rowSubProcura = sheet1.addRow(['', '', '', 'Subtotal Suministros:', totalPropuestaProcura]);
  rowSubProcura.getCell(4).font = blackFontBold;
  rowSubProcura.getCell(5).font = blackFontBold;
  rowSubProcura.getCell(5).numFmt = moneyFormat;

  sheet1.addRow([]);

  // B. SERVICIOS TÉCNICOS Y MANO DE OBRA (SSTT)
  const rowB = sheet1.addRow(['', 'B. SERVICIOS TÉCNICOS Y MANO DE OBRA (SSTT)', '', '', '']);
  rowB.getCell(2).font = blackFontBold;

  let totalPropuestaSSTT = 0;
  itemsProcesados.filter(i => i.tipo === 'Servicio').forEach(item => {
    const row = sheet1.addRow([
      indexGeneral++,
      item.descripcion || item.item || 'Ítem sin nombre',
      item.cantidad,
      item.precioUnitarioConIVA,
      item.precioVentaConIVA
    ]);
    row.getCell(4).numFmt = moneyFormat;
    row.getCell(5).numFmt = moneyFormat;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    totalPropuestaSSTT += item.precioVentaConIVA;
  });

  const rowSubSSTT = sheet1.addRow(['', '', '', 'Subtotal Servicios:', totalPropuestaSSTT]);
  rowSubSSTT.getCell(4).font = blackFontBold;
  rowSubSSTT.getCell(5).font = blackFontBold;
  rowSubSSTT.getCell(5).numFmt = moneyFormat;

  // Total Final
  sheet1.addRow([]); // Espacio
  const totalGeneral = totalPropuestaProcura + totalPropuestaSSTT;
  const totalRow1 = sheet1.addRow(['', '', '', 'TOTAL GENERAL DE LA OFERTA:', totalGeneral]);
  totalRow1.getCell(4).font = blackFontBold;
  totalRow1.getCell(5).font = blackFontBold;
  totalRow1.getCell(5).numFmt = moneyFormat;

  // Ajustar anchos Hoja 1
  sheet1.columns = [
    { width: 8 },  // Ítem
    { width: 60 }, // Descripción
    { width: 10 }, // Cant
    { width: 20 }, // PU
    { width: 25 }  // PT
  ];

  // =========================================================================
  // HOJA 2: Auditoría Procura (Método de Control Total)
  // =========================================================================
  const sheet2 = workbook.addWorksheet('Auditoría Procura');

  sheet2.mergeCells('A1:P2');
  const title2 = sheet2.getCell('A1');
  title2.value = 'AUDITORÍA GERENCIAL - PROCURA Y SUMINISTROS (DESGLOSE COMPLETO)';
  title2.fill = blueFill;
  title2.font = { ...whiteFont, size: 16 };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet2.addRow([]);

  // Encabezados Procura
  const headersSheet2 = [
    'Ítem',
    'Descripción',
    'Cant',
    `FOB/EXW (${moneda})`,
    `Flete Int. (${moneda})`,
    `Seguro (${moneda})`,
    `CIF (${moneda})`,
    `Arancel (${moneda})`,
    `Despacho (${moneda})`,
    `Flete Local (${moneda})`,
    `Financiero (${moneda})`,
    `Admin (${moneda})`,
    `Landed Cost/Costo Directo Base (${moneda})`,
    'Margen (%)',
    `Precio Venta Neto (${moneda})`,
    `Precio Venta c/ IVA (${moneda})`
  ];
  
  const headerRow2 = sheet2.addRow(headersSheet2);
  headerRow2.eachCell(cell => {
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  headerRow2.height = 40;

  let totFob = 0, totFleteInt = 0, totSeg = 0, totCif = 0, totArancel = 0;
  let totDespacho = 0, totFleteLoc = 0, totFin = 0, totAdmin = 0, totLanded = 0;
  let totProcuraNeto = 0, totProcuraIVA = 0;
  let indexProcura = 1;

  itemsProcesados.filter(i => i.tipo === 'Equipo').forEach(item => {
    // Si viene la info desglosada, la usamos; si no, ponemos 0 y el total base.
    const qty = item.cantidad || 1;
    const cFob = item.fobUnit ? item.fobUnit * qty : 0;
    const cFleteInt = item.fleteTotal || 0;
    const cSeg = item.seguroTotal || 0;
    const cCif = item.cifTotal || 0;
    const cArancel = item.arancelTotal || 0;
    const cDesp = item.despachoTotal || 0;
    const cFleteLoc = item.fleteLocalTotal || 0;
    const cFin = item.finTotal || 0;
    const cAdmin = item.adminTotal || 0;
    const cLanded = item.costoTotalBase; // Este es el garantizado

    const row = sheet2.addRow([
      indexProcura++,
      item.descripcion || item.item || 'Ítem sin nombre',
      qty,
      cFob,
      cFleteInt,
      cSeg,
      cCif,
      cArancel,
      cDesp,
      cFleteLoc,
      cFin,
      cAdmin,
      cLanded,
      item.margen,
      item.precioVentaNeto,
      item.precioVentaConIVA
    ]);

    // Formato
    [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16].forEach(col => row.getCell(col).numFmt = moneyFormat);
    row.getCell(14).numFmt = percentFormat;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };

    totFob += cFob;
    totFleteInt += cFleteInt;
    totSeg += cSeg;
    totCif += cCif;
    totArancel += cArancel;
    totDespacho += cDesp;
    totFleteLoc += cFleteLoc;
    totFin += cFin;
    totAdmin += cAdmin;
    totLanded += cLanded;
    totProcuraNeto += item.precioVentaNeto;
    totProcuraIVA += item.precioVentaConIVA;
  });

  sheet2.addRow([]);
  const totalRow2 = sheet2.addRow([
    '', 'TOTALES PROCURA:', '', 
    totFob, totFleteInt, totSeg, totCif, totArancel, totDespacho, 
    totFleteLoc, totFin, totAdmin, totLanded, '', totProcuraNeto, totProcuraIVA
  ]);
  totalRow2.eachCell(cell => { cell.font = blackFontBold; });
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16].forEach(col => totalRow2.getCell(col).numFmt = moneyFormat);

  sheet2.columns = [
    { width: 8 },  // Ítem
    { width: 45 }, // Descripción
    { width: 8 },  // Cantidad
    { width: 18 }, // FOB
    { width: 15 }, // Flete
    { width: 15 }, // Seguro
    { width: 18 }, // CIF
    { width: 15 }, // Arancel
    { width: 15 }, // Despacho
    { width: 15 }, // Flete Local
    { width: 15 }, // Financiero
    { width: 15 }, // Admin
    { width: 22 }, // Landed Cost
    { width: 12 }, // Margen
    { width: 20 }, // Venta Neto
    { width: 20 }  // Venta c/ IVA
  ];

  // =========================================================================
  // HOJA 3: Auditoría SSTT (Método de Control Total)
  // =========================================================================
  const sheet3 = workbook.addWorksheet('Auditoría SSTT');

  sheet3.columns = [
    { width: 8 },  // Ítem
    { width: 45 }, // Descripción
    { width: 20 }, // Tipo Estimación
    { width: 20 }, // Costo Equipos/Tecnología
    { width: 18 }, // Costo MO
    { width: 18 }, // Subcontratista
    { width: 15 }, // Margen Tercerizado
    { width: 15 }, // Service Fee (%)
    { width: 18 }, // Service Fee Monto
    { width: 18 }, // Amortización
    { width: 22 }, // Subtotal Costo Directo
    { width: 20 }, // Logística/Viáticos
    { width: 20 }, // Imprevistos
    { width: 20 }, // Apoyos/Alq.
    { width: 25 }, // Gastos Admin Globales
    { width: 20 }, // Costo Total Real
    { width: 12 }, // Margen (%)
    { width: 20 }, // Precio Venta Neto
    { width: 20 }  // Precio Venta c/ IVA
  ];

  sheet3.mergeCells('A1:S2');
  const title3 = sheet3.getCell('A1');
  title3.value = 'AUDITORÍA GERENCIAL - SERVICIOS Y MANO DE OBRA (SSTT)';
  title3.fill = blueFill;
  title3.font = { ...whiteFont, size: 16 };
  title3.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet3.addRow([]);

  const headersSheet3 = [
    'Ítem',
    'Descripción',
    'Tipo Estimación',
    `Costo Equipos/Mat. (${moneda})`,
    `Costo MO (${moneda})`,
    `Subcontratista (${moneda})`,
    `Margen Tercerizado (%)`,
    `Service Fee (%)`,
    `Service Fee Monto (${moneda})`,
    `Amortización (${moneda})`,
    `Subtotal Costo Directo (${moneda})`,
    `Logística/Viáticos (${moneda})`,
    `Imprevistos (${moneda})`,
    `Apoyos/Alq. (${moneda})`,
    `Gastos Admin Globales (${moneda})`,
    `Costo Total Real (${moneda})`,
    'Margen (%)',
    `Precio Venta Neto (${moneda})`,
    `Precio Venta c/ IVA (${moneda})`
  ];
  
  const headerRow3 = sheet3.addRow(headersSheet3);
  headerRow3.eachCell(cell => {
    cell.fill = blueFill;
    cell.font = whiteFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  headerRow3.height = 40;

  let totEquiposSSTT = 0, totMOSSTT = 0, totSubSSTT = 0, totFeeMontoSSTT = 0;
  let totAmortSSTT = 0, totSubtotalDirSSTT = 0, totLogSSTT = 0, totImpSSTT = 0;
  let totAlqSSTT = 0, totAdminSSTT = 0, totRealSSTT = 0;
  let totNetoSSTT = 0, totIVASSTT = 0;
  let indexSSTT = 1;

  itemsProcesados.filter(i => i.tipo === 'Servicio').forEach(item => {
    // Salvaguarda: Convertimos los costos base brutos a la moneda seleccionada (convertir() ya hace monedaTrabajo === 'USD' ? val / tipoCambio : val)
    const cTecnologia = convertir(item.Costo_Tecnologia_Item || 0);
    const cMO = convertir(item.Costo_MO_Item || 0);
    const cSubcontrato = convertir(item.Costo_Subcontrato_Item || 0);
    const mSubcontrato = (item.Margen_Subcontrato_Item || 0) / 100;
    const mServiceFee = (item.margenServiceFee || 0) / 100;
    const cServiceFeeMonto = convertir(item.costoServiceFee || 0);
    const cAmort = convertir(item.costoAmortizacion || 0);
    
    // Subtotal Costo Directo = Tec + MO + Sub + ServiceFeeMonto + Amortización
    const cSubtotalDirecto = cTecnologia + cMO + cSubcontrato + cServiceFeeMonto + cAmort;

    // Prorrateo SSTT global (el prorrateoAsignado ya viene convertido por excelExport en líneas superiores si aplica, aunque la bolsa es independiente)
    // Wait, let's keep propLog exact logic as before to avoid breaking the isolation
    const propLog = sumaCostosIndirectos > 0 ? logisticaGlobal / sumaCostosIndirectos : 0;
    const propImp = sumaCostosIndirectos > 0 ? gastosImprevistos / sumaCostosIndirectos : 0;
    const propAlq = sumaCostosIndirectos > 0 ? apoyosYAlquileres / sumaCostosIndirectos : 0;
    const propAdmin = sumaCostosIndirectos > 0 ? gastosAdminSSTT / sumaCostosIndirectos : 0;

    const cLog = item.prorrateoAsignado * propLog;
    const cImp = item.prorrateoAsignado * propImp;
    const cAlq = (item.prorrateoAsignado * propAlq) + (item.Total_Alquileres || 0); // Total_Alquileres ya venía convertido si aplica
    const cAdminGlobal = item.prorrateoAsignado * propAdmin; // Antes sumaba costoServiceFee, ahora lo separamos

    const row = sheet3.addRow([
      indexSSTT++,
      item.descripcion || item.item || 'Ítem sin nombre',
      item.estrategia || 'Normal',
      cTecnologia,
      cMO,
      cSubcontrato,
      mSubcontrato,
      mServiceFee,
      cServiceFeeMonto,
      cAmort,
      cSubtotalDirecto,
      cLog,
      cImp,
      cAlq,
      cAdminGlobal,
      item.costoTotalReal,
      item.margen,
      item.precioVentaNeto,
      item.precioVentaConIVA
    ]);

    [4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19].forEach(col => row.getCell(col).numFmt = moneyFormat);
    [7, 8, 17].forEach(col => row.getCell(col).numFmt = percentFormat);
    row.getCell(1).alignment = { horizontal: 'center' };

    totEquiposSSTT += cTecnologia;
    totMOSSTT += cMO;
    totSubSSTT += cSubcontrato;
    totFeeMontoSSTT += cServiceFeeMonto;
    totAmortSSTT += cAmort;
    totSubtotalDirSSTT += cSubtotalDirecto;
    totLogSSTT += cLog;
    totImpSSTT += cImp;
    totAlqSSTT += cAlq;
    totAdminSSTT += cAdminGlobal;
    totRealSSTT += item.costoTotalReal;
    totNetoSSTT += item.precioVentaNeto;
    totIVASSTT += item.precioVentaConIVA;
  });

  sheet3.addRow([]);
  const totalRow3 = sheet3.addRow([
    '', 'TOTALES SSTT:', '',
    totEquiposSSTT, totMOSSTT, totSubSSTT, '', '', totFeeMontoSSTT, totAmortSSTT, totSubtotalDirSSTT,
    totLogSSTT, totImpSSTT, totAlqSSTT, totAdminSSTT, totRealSSTT, '', totNetoSSTT, totIVASSTT
  ]);
  
  totalRow3.eachCell(cell => { cell.font = blackFontBold; });
  [4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19].forEach(col => totalRow3.getCell(col).numFmt = moneyFormat);

  // Lógica de Pólizas para Licitación
  if (esLicitacion) {
    sheet3.addRow([]); // Espacio
    const polizasTitle = sheet3.addRow(['', 'PÓLIZAS REQUERIDAS DEL PROYECTO GLOBAL (LICITACIÓN)', '', '', '', '', '', '', '', '', '', '', '']);
    polizasTitle.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };
    
    // Se calculan sobre el Total General (Procura + SSTT)
    const granTotalIVA = totProcuraIVA + totIVASSTT;
    const fielCumplimiento = granTotalIVA * 0.05;
    const anticipo = granTotalIVA * 0.20;

    const rowFiel = sheet3.addRow(['', 'Póliza Fiel Cumplimiento (5%)', '', '', '', '', '', '', '', '', '', '', fielCumplimiento]);
    const rowAnticipo = sheet3.addRow(['', 'Póliza de Anticipo (20%)', '', '', '', '', '', '', '', '', '', '', anticipo]);
    
    rowFiel.getCell(13).numFmt = moneyFormat;
    rowAnticipo.getCell(13).numFmt = moneyFormat;
  }

  sheet3.columns = [
    { width: 8 },  // Ítem
    { width: 45 }, // Descripción
    { width: 20 }, // Equipos
    { width: 18 }, // MO
    { width: 20 }, // Logística
    { width: 18 }, // Imprevistos
    { width: 18 }, // Alquileres
    { width: 18 }, // Fee
    { width: 18 }, // Amortización
    { width: 20 }, // Costo Real
    { width: 15 }, // Margen
    { width: 22 }, // Venta Neto
    { width: 22 }  // Venta c/ IVA
  ];

  // =========================================================================
  // HOJA 4: Condiciones Comerciales
  // =========================================================================
  const sheet4 = workbook.addWorksheet('Condiciones Comerciales');

  sheet4.mergeCells('A1:B2');
  const title4 = sheet4.getCell('A1');
  title4.value = 'CONDICIONES COMERCIALES';
  title4.fill = blueFill;
  title4.font = { ...whiteFont, size: 16 };
  title4.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet4.addRow([]);

  const condiciones = [
    ['Validez de la Oferta:', '30 días calendario a partir de la fecha de emisión.'],
    ['Plazo de Entrega:', 'A convenir según cronograma de obra y disponibilidad de equipos.'],
    ['Lugar de Entrega:', 'Incoterm DDP / Obra (según lo acordado).'],
    ['Garantía:', '12 meses contra defectos de fabricación. No cubre mala operación.'],
    ['Forma de Pago:', esLicitacion ? 'Según pliego de bases y condiciones (Anticipo 20%, saldo contra avance).' : '30% Anticipo, 70% contra entrega de equipos.'],
    ['Impuestos:', 'Los precios indicados en la Propuesta Comercial INCLUYEN IVA (10%).'],
    ['Moneda:', `Oferta expresada en ${moneda}.`]
  ];

  condiciones.forEach(cond => {
    const row = sheet4.addRow(cond);
    row.getCell(1).font = blackFontBold;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.height = 30;
  });

  sheet4.columns = [
    { width: 30 }, // Título condición
    { width: 90 }  // Descripción condición
  ];

  // --- 3. EXPORTAR ARCHIVO ---
  const buffer = await workbook.xlsx.writeBuffer();
  const fecha = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const sufijo = esLicitacion ? 'Licitacion' : 'Privado';
  const fileName = `Cotizacion_Beigel_${sufijo}_${fecha}.xlsx`;
  
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
};
