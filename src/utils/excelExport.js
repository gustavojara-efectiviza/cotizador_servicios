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

  const sumaCostosDirectos = itemsDirectos.reduce((acc, item) => acc + item.costoTotalBase, 0);

  // Consolidar costos indirectos (logística, financieros, riesgos, viáticos)
  // Viáticos puede ser un número o un array de objetos
  let totalViaticos = 0;
  if (Array.isArray(viaticos)) {
    totalViaticos = viaticos.reduce((acc, v) => acc + convertir(v.total || v.costo || v.monto || 0, v.moneda), 0);
  } else if (typeof viaticos === 'number') {
    totalViaticos = viaticos;
  }

  // Convertimos las bolsas si es necesario (asumimos que ya vienen en moneda global, o las pasamos como están)
  // Si en tu estadoGlobal las bolsas tienen su propia moneda, deberías aplicar la función convertir().
  // Para este ejemplo, asumiremos que logistica, riesgos y financieros ya están en la moneda de trabajo 
  // o son montos en USD que la UI ya unificó. Si hace falta, ajustar aquí.
  const sumaCostosIndirectos = totalViaticos + Number(logistica) + Number(riesgos) + Number(financieros);

  // Calcular prorrateo y precios finales por ítem
  const itemsProcesados = itemsDirectos.map(item => {
    const pesoRelativo = sumaCostosDirectos > 0 ? (item.costoTotalBase / sumaCostosDirectos) : 0;
    const prorrateoAsignado = sumaCostosIndirectos * pesoRelativo;
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

  let totalPropuesta = 0;
  itemsProcesados.forEach((item, index) => {
    const row = sheet1.addRow([
      index + 1,
      item.descripcion || item.item || 'Ítem sin nombre',
      item.cantidad,
      item.precioUnitarioConIVA,
      item.precioVentaConIVA
    ]);
    row.getCell(4).numFmt = moneyFormat;
    row.getCell(5).numFmt = moneyFormat;
    
    // Alinear cantidades e importes
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    
    totalPropuesta += item.precioVentaConIVA;
  });

  // Total Final
  sheet1.addRow([]); // Espacio
  const totalRow1 = sheet1.addRow(['', '', '', 'TOTAL GENERAL:', totalPropuesta]);
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
  // HOJA 2: Auditoría Gerencial (Método de Control Total)
  // =========================================================================
  const sheet2 = workbook.addWorksheet('Auditoría Gerencial');

  sheet2.mergeCells('A1:I2');
  const title2 = sheet2.getCell('A1');
  title2.value = 'AUDITORÍA GERENCIAL (MÉTODO DE CONTROL TOTAL)';
  title2.fill = blueFill;
  title2.font = { ...whiteFont, size: 16 };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet2.addRow([]);

  const headersSheet2 = [
    'Ítem',
    'Descripción',
    `Costo Directo Base (${moneda})`,
    'Peso Relativo (%)',
    `Prorrateo Asignado (${moneda})`,
    `Costo Total Real (${moneda})`,
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
  headerRow2.height = 30;

  let totalCostoBase = 0, totalProrrateo = 0, totalReal = 0, totalNeto = 0, totalIVA = 0;

  itemsProcesados.forEach((item, index) => {
    const row = sheet2.addRow([
      index + 1,
      item.descripcion || item.item || 'Ítem sin nombre',
      item.costoTotalBase,
      item.pesoRelativo,
      item.prorrateoAsignado,
      item.costoTotalReal,
      item.margen, // En formato decimal (ej: 0.15)
      item.precioVentaNeto,
      item.precioVentaConIVA
    ]);
    
    // Formatos numéricos
    [3, 5, 6, 8, 9].forEach(col => row.getCell(col).numFmt = moneyFormat);
    row.getCell(4).numFmt = percentFormat;
    row.getCell(7).numFmt = percentFormat;

    // Alineaciones
    row.getCell(1).alignment = { horizontal: 'center' };

    totalCostoBase += item.costoTotalBase;
    totalProrrateo += item.prorrateoAsignado;
    totalReal += item.costoTotalReal;
    totalNeto += item.precioVentaNeto;
    totalIVA += item.precioVentaConIVA;
  });

  // Fila de Totales Generales
  const totalRow2 = sheet2.addRow([
    '', 'TOTALES DIRECTOS:', 
    totalCostoBase, 1, totalProrrateo, totalReal, '', totalNeto, totalIVA
  ]);
  totalRow2.eachCell(cell => { cell.font = blackFontBold; });
  [3, 5, 6, 8, 9].forEach(col => totalRow2.getCell(col).numFmt = moneyFormat);
  totalRow2.getCell(4).numFmt = percentFormat;

  // Lógica de Pólizas para Licitación (Hoja 2 - Final)
  if (esLicitacion) {
    sheet2.addRow([]); // Espacio
    const polizasTitle = sheet2.addRow(['', 'PÓLIZAS REQUERIDAS (LICITACIÓN)', '', '', '', '', '', '', '']);
    polizasTitle.getCell(2).font = { ...blackFontBold, color: { argb: 'FF003366' } };
    
    // Fiel cumplimiento (5% del total con IVA)
    const fielCumplimiento = totalIVA * 0.05;
    // Anticipo (20% del total con IVA)
    const anticipo = totalIVA * 0.20;

    const rowFiel = sheet2.addRow(['', 'Póliza Fiel Cumplimiento (5%)', '', '', '', '', '', '', fielCumplimiento]);
    const rowAnticipo = sheet2.addRow(['', 'Póliza de Anticipo (20%)', '', '', '', '', '', '', anticipo]);
    
    rowFiel.getCell(9).numFmt = moneyFormat;
    rowAnticipo.getCell(9).numFmt = moneyFormat;
  }

  // Ajustar anchos Hoja 2
  sheet2.columns = [
    { width: 8 },  // Ítem
    { width: 45 }, // Descripción
    { width: 20 }, // Costo Base
    { width: 18 }, // Peso
    { width: 22 }, // Prorrateo
    { width: 20 }, // Costo Real
    { width: 15 }, // Margen
    { width: 22 }, // Venta Neto
    { width: 22 }  // Venta c/ IVA
  ];

  // =========================================================================
  // HOJA 3: Condiciones Comerciales
  // =========================================================================
  const sheet3 = workbook.addWorksheet('Condiciones Comerciales');

  sheet3.mergeCells('A1:B2');
  const title3 = sheet3.getCell('A1');
  title3.value = 'CONDICIONES COMERCIALES';
  title3.fill = blueFill;
  title3.font = { ...whiteFont, size: 16 };
  title3.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet3.addRow([]);

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
    const row = sheet3.addRow(cond);
    row.getCell(1).font = blackFontBold;
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    row.height = 30; // Dar un poco de espacio por si envuelve texto
  });

  sheet3.columns = [
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
