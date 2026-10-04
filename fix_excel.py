import sys, re

with open('src/utils/excelExport.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'const colsSheet3 = \[[\s\S]*?\];',
    'const colsSheet3 = [6, 40, 13, 7, 10, 10, 15, 15, 15, 15, 15, 20, 20, 18, 18, 18, 20, 20, 18, 18, 18, 18, 20, 20, 15, 20];',
    code
)

code = re.sub(
    r\"sheet3\.mergeCells\('A1:U2'\);\",
    \"sheet3.mergeCells('A1:Z2');\",
    code
)

headers_str = '''const headersSheet3 = [
      'Ítem',
      'Descripción del Servicio',
      'Estrategia',
      'Cant.',
      'Horas Eq.',
      'Horas Serv.',
      'Costo Tecnol. Unit. (USD)',
      'Costo MO Unit. (USD)',
      'Subcontrato Unit. (USD)',
      'Fee Unit. (USD)',
      'Amort. Unit. (USD)',
      'Costo Directo Puro Unit. (USD)',
      'Costo Directo Puro Total (USD)',
      'Costo Logística Asignada (USD)',
      'Costo Imprevistos Asig. (USD)',
      'Costo SSMA Consumibles (USD)',
      'COSTO TOTAL REAL (USD)',
      'PV Servicio Puro (USD)',
      'PV Logística (USD)',
      'PV Imprevistos (USD)',
      'PV SSMA (USD)',
      'Costo Admin. (6%) (USD)',
      'PRECIO VENTA NETO (USD)',
      'UTILIDAD NETA (USD)',
      'Margen Real Blended (%)',
      'PRECIO TOTAL c/ IVA (USD)'
    ].map(h => h.replace('USD', moneda));'''
    
code = re.sub(
    r'const headersSheet3 = \[[\s\S]*?\];',
    headers_str,
    code
)

# SSTT Row Generation
sstt_row_pattern = r'itemsSSTT\.forEach\(item => \{[\s\S]*?endRowSSTTAudit = r;'

sstt_row_replace = '''itemsSSTT.forEach(item => {
      const row = sheet3.addRow([
        idxSSTT++, // 1
        nombreItem, // 2
        item.esTercerizado ? 'Subcontrato' : (item.estrategia || 'Normal'), // 3
        qty, // 4
        item.horas_equipo, // 5
        item.horas_servicio, // 6
        item.cTec, // 7
        item.cMO, // 8
        item.cSubc, // 9
        item.cFee, // 10
        item.cAmort, // 11
        0, // 12 L
        0, // 13 M
        item.logAsignada, // 14 N
        item.impAsignado, // 15 O
        item.ssmaAsignado || 0, // 16 P
        0, // 17 Q
        0, // 18 R
        0, // 19 S
        0, // 20 T
        0, // 21 U
        item.adminAsignado, // 22 V
        0, // 23 W
        0, // 24 X
        0, // 25 Y
        0  // 26 Z
      ]);

      const r = row.number;
      if (!startRowSSTTAudit) startRowSSTTAudit = r;
      endRowSSTTAudit = r;'''

code = re.sub(sstt_row_pattern, sstt_row_replace, code)

# SSTT Formulas
sstt_formulas_pattern = r'row\.getCell\(12\)\.value = \{ formula: G\$\{r\}\+[\s\S]*?row\.getCell\(4\)\.alignment = \{ horizontal: \'center\' \};'

sstt_formulas_replace = '''row.getCell(12).value = { formula: G+H+I+J+K, result: item.subtotalDirectoUnit };
      row.getCell(13).value = { formula: D*L, result: item.subtotalDirectoTotal };
      row.getCell(17).value = { formula: M+N+O+P+V, result: item.subtotalDirectoTotal + item.logAsignada + item.impAsignado + (item.ssmaAsignado || 0) + item.adminAsignado };
      
      const divServ = Math.max(0.01, 1 - Math.min(0.99, item.margen));
      row.getCell(18).value = { formula: M/, result: item.subtotalDirectoTotal / divServ };
      row.getCell(19).value = { formula: N/0.70, result: item.logAsignada / 0.70 };
      row.getCell(20).value = { formula: O/0.70, result: item.impAsignado / 0.70 };
      row.getCell(21).value = { formula: P, result: (item.ssmaAsignado || 0) };
      
      row.getCell(23).value = { formula: R+S+T+U+V, result: (item.subtotalDirectoTotal/divServ) + (item.logAsignada/0.7) + (item.impAsignado/0.7) + (item.ssmaAsignado||0) + item.adminAsignado };
      row.getCell(24).value = { formula: W-Q, result: 0 }; 
      row.getCell(25).value = { formula: X/W, result: 0 }; 
      row.getCell(26).value = item.precioVentaConIVA;

      [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26].forEach(col => row.getCell(col).numFmt = moneyFormat);
      row.getCell(25).numFmt = percentFormat;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).alignment = { horizontal: 'center' };'''

code = re.sub(sstt_formulas_pattern, sstt_formulas_replace, code)

# Alquileres Row
alq_row_pattern = r'itemsAlquileres\.forEach\(item => \{[\s\S]*?endRowAlqAudit = r;'

alq_row_replace = '''itemsAlquileres.forEach(item => {
        const row = sheet3.addRow([
          idxSSTT++, // 1
          item.descripcion || item.nombre || 'Alquiler Especial de Equipo', // 2
          'Alquiler Especial', // 3
          item.cantidad, // 4
          0, // 5
          0, // 6
          0, // 7
          0, // 8
          0, // 9
          0, // 10
          0, // 11
          item.costoUnitConvertido, // 12
          0, // 13
          0, // 14
          0, // 15
          0, // 16
          0, // 17
          0, // 18
          0, // 19
          0, // 20
          0, // 21
          0, // 22
          0, // 23
          0, // 24
          0, // 25
          0  // 26
        ]);
        const r = row.number;
        if (!startRowAlqAudit) startRowAlqAudit = r;
        endRowAlqAudit = r;'''

code = re.sub(alq_row_pattern, alq_row_replace, code)

# Alquileres formulas
alq_formulas_pattern = r'row\.getCell\(13\)\.value = \{ formula: D\$\{r\}\*L\$\{r\}[\s\S]*?row\.getCell\(3\)\.alignment = \{ horizontal: \'center\' \};'

alq_formulas_replace = '''const divServ = Math.max(0.01, 1 - Math.min(0.99, item.margen));
        row.getCell(13).value = { formula: D*L, result: item.costoTotal };
        row.getCell(17).value = { formula: M, result: item.costoTotal };
        row.getCell(18).value = { formula: M/, result: item.costoTotal / divServ };
        row.getCell(23).value = { formula: R, result: item.costoTotal / divServ };
        row.getCell(24).value = { formula: W-Q, result: 0 };
        row.getCell(25).value = { formula: X/W, result: 0 };
        row.getCell(26).value = item.precioVentaConIVA;

        [12, 13, 17, 18, 23, 24, 26].forEach(col => row.getCell(col).numFmt = moneyFormat);
        row.getCell(25).numFmt = percentFormat;
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };'''

code = re.sub(alq_formulas_pattern, alq_formulas_replace, code)


with open('src/utils/excelExport.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Phase 1 done')
