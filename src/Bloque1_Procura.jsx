import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Ship, 
  DollarSign, 
  Percent, 
  Plus, 
  Trash2, 
  Edit2, 
  Package, 
  Calculator, 
  TrendingUp, 
  CheckCircle2, 
  FileText, 
  ArrowRightLeft, 
  Upload,
  Boxes
} from 'lucide-react';
import * as XLSX from 'xlsx';

// DICCIONARIO NCM (Mock Local)
const diccionarioNCM = [
  { ncm: '8504.23.00', desc: 'Transformadores de potencia (> 10 MVA)', arancel: 0 },
  { ncm: '8535.21.00', desc: 'Interruptores de SF6 para Alta Tensión', arancel: 14 },
  { ncm: '8504.40.90', desc: 'Inversores fotovoltaicos / Convertidores', arancel: 10 },
  { ncm: '8537.20.00', desc: 'Celdas y tableros de mando (> 1000 V)', arancel: 12 },
  { ncm: '8504.34.00', desc: 'Transformadores de medida y auxiliares', arancel: 6 }
];

export default function Bloque1_Procura({
  // DATOS ELEVADOS AL DASHBOARD (Single Source of Truth — FASE 1)
  equipos = [],
  setEquipos,
  defaults = { fleteBase: 5, seguroBase: 2, despachoBase: 6, financieroBase: 3, adminBase: 3, arancelBase: 0, margenBase: 30 },
  setDefaults,
  // CALLBACKS AL PADRE
  setTotalProcura,
  tipoCambio = 7500,
  setTipoCambio,
  monedaTrabajo = 'USD',
  onGuardar,
  isSaving
}) {
  // ESTADO VISUAL DE MONEDA LOCAL (solo UI, no es dato de negocio)
  const [moneda, setMoneda] = useState('USD');
  // Estado para edición inline del tipo de cambio (reemplaza window.prompt)
  const [editandoCambio, setEditandoCambio] = useState(false);
  const [valorCambioTemp, setValorCambioTemp] = useState('');

  // `defaults` y `equipos` son ahora props del EPCDashboard (Single Source of Truth).
  // Ver EPCDashboard.jsx → useState equiposProcura / procuraDefaults.

  // ESTADO DE MODAL DE ADICIÓN / EDICIÓN
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    nombre: '',
    cantidad: 1,
    costoBase: 0,
    modalidad: 'FOB/EXW',
    ncm: '8504.23.00',
    porcentajeArancel: undefined,
    valorFlete: undefined,
    porcentajeSeguro: undefined,
    porcentajeDespacho: undefined,
    aplicarFleteLocal: false,
    montoFleteLocal: 1500,
    porcentajeFinanciero: undefined,
    porcentajeAdmin: undefined,
    margenPorcentaje: undefined
  };

  const [formData, setFormData] = useState(initialFormState);

  // MANEJADOR DEL CAMBIO DE MONEDA VISUAL (sin window.prompt — input inline)
  const handleToggleMoneda = () => {
    if (moneda === 'USD') {
      setValorCambioTemp(String(tipoCambio));
      setEditandoCambio(true);
    } else {
      setMoneda('USD');
    }
  };

  const handleConfirmarCambio = () => {
    const val = parseFloat(valorCambioTemp);
    if (!isNaN(val) && val > 0) {
      setTipoCambio(val);
      setMoneda('Gs.');
    }
    setEditandoCambio(false);
  };

  // HELPER PARA FORMATEAR MONEDAS
  const formatMoneda = (valUSD) => {
    if (moneda === 'Gs.') {
      const valGs = valUSD * tipoCambio;
      return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(valGs);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(valUSD);
  };

  // MATRIZ DE CÁLCULO FINANCIERO (CASCADA CON CONDICIONAL DE MODALIDAD)
  const calcularMetricasEquipo = (eq) => {
    const qty = Math.max(1, parseInt(eq.cantidad) || 1);
    const baseUnit = parseFloat(eq.costoBase) || 0;
    const baseTotal = baseUnit * qty;
    const mod = eq.modalidad || 'FOB/EXW';

    // Flete Internacional
    const fletePct = eq.valorFlete !== undefined ? eq.valorFlete : defaults.fleteBase;
    const montoFleteTotal = mod === 'FOB/EXW' ? baseTotal * (fletePct / 100) : 0;

    // Seguro Internacional
    const seguroPct = eq.porcentajeSeguro !== undefined ? eq.porcentajeSeguro : defaults.seguroBase;
    const montoSeguroTotal = mod === 'FOB/EXW' ? (baseTotal + montoFleteTotal) * (seguroPct / 100) : 0;

    // Subtotal CIF
    const cifTotal = baseTotal + montoFleteTotal + montoSeguroTotal;

    // Nacionalización & Aranceles
    const arancelPct = eq.porcentajeArancel !== undefined ? eq.porcentajeArancel : defaults.arancelBase;
    const montoArancelTotal = mod !== 'Local' ? cifTotal * (arancelPct / 100) : 0;

    const despachoPct = eq.porcentajeDespacho !== undefined ? eq.porcentajeDespacho : defaults.despachoBase;
    const montoDespachoTotal = mod !== 'Local' ? cifTotal * (despachoPct / 100) : 0;

    // IVA Aduanero
    const baseImponibleIVA = cifTotal + montoArancelTotal;
    const montoIVATotal = mod !== 'Local' ? baseImponibleIVA * 0.10 : 0;

    // Logística Interna (Flete Local)
    const montoFleteLocalTotal = eq.aplicarFleteLocal ? ((parseFloat(eq.montoFleteLocal) || 0) * qty) : 0;

    // Gastos Financieros y Administrativos
    const finPct = eq.porcentajeFinanciero !== undefined ? eq.porcentajeFinanciero : defaults.financieroBase;
    const montoFinancieroTotal = cifTotal * (finPct / 100);

    const adminPct = eq.porcentajeAdmin !== undefined ? eq.porcentajeAdmin : defaults.adminBase;
    const montoAdminTotal = cifTotal * (adminPct / 100);

    // COSTO TOTAL IMPORTACIÓN (Landed Cost DDP)
    const landedCostTotal = cifTotal + montoArancelTotal + montoDespachoTotal + montoFleteLocalTotal + montoFinancieroTotal + montoAdminTotal;
    const landedCostUnitario = landedCostTotal / qty;

    // Precio de Venta (Margen Real)
    const margenPct = eq.margenPorcentaje !== undefined ? eq.margenPorcentaje : defaults.margenBase;
    const margenDecimal = Math.min(0.99, Math.max(0, margenPct / 100));
    const precioVentaTotal = landedCostTotal / (1 - margenDecimal);
    const precioVentaUnitario = precioVentaTotal / qty;
    const gananciaTotal = precioVentaTotal - landedCostTotal;

    return {
      qty,
      baseTotal,
      montoFleteTotal,
      montoSeguroTotal,
      cifTotal,
      montoArancelTotal,
      montoDespachoTotal,
      montoIVATotal,
      montoFleteLocalTotal,
      montoFinancieroTotal,
      montoAdminTotal,
      landedCostTotal,
      landedCostUnitario,
      precioVentaTotal,
      precioVentaUnitario,
      gananciaTotal,
      arancelPct
    };
  };

  // EDITADO INLINE EN LA TABLA (NCM y Arancel)
  const handleUpdateInline = (id, field, value) => {
    setEquipos(prev => prev.map(eq => {
      if (eq.id === id) {
        return {
          ...eq,
          [field]: value
        };
      }
      return eq;
    }));
  };

  // APERTURA DE MODAL
  const openModalNew = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowModal(true);
  };

  const openModalEdit = (eq) => {
    setFormData({ ...eq });
    setEditingId(eq.id);
    setShowModal(true);
  };

  const handleSelectNCM = (ncmCode) => {
    const found = diccionarioNCM.find(item => item.ncm === ncmCode);
    if (found) {
      setFormData(prev => ({
        ...prev,
        ncm: found.ncm,
        porcentajeArancel: found.arancel
      }));
    } else {
      setFormData(prev => ({ ...prev, ncm: ncmCode }));
    }
  };

  const handleSaveEquipo = () => {
    if (!formData.nombre.trim()) return alert('Por favor, ingresa el nombre del equipo.');
    if (parseFloat(formData.costoBase) <= 0) return alert('Ingresa un costo base válido.');

    if (editingId) {
      setEquipos(prev => prev.map(item => item.id === editingId ? { ...formData } : item));
    } else {
      setEquipos(prev => [...prev, { ...formData, id: crypto.randomUUID() }]);
    }
    setShowModal(false);
  };

  const handleRemoveEquipo = (id) => {
    setEquipos(prev => prev.filter(e => e.id !== id));
  };

  // IMPORTACIÓN DE EXCEL (XLSX)
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Leer el archivo como matriz 2D para mayor control sobre filas vacías y títulos
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length === 0) {
          alert('El archivo Excel está vacío.');
          return;
        }

        // Normalizador de cabeceras
        const normalizeHeader = (str) => {
          if (!str) return '';
          return String(str)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^a-z0-9]/g, ""); // Quitar caracteres especiales
        };

        // Buscar en qué fila están las cabeceras reales (analizando las primeras 15 filas)
        const keyWords = ['item', 'nombre', 'equipo', 'suministro', 'cantidad', 'cant', 'qty', 'modalidad', 'incoterm', 'costobase', 'fob', 'precio'];
        let headerRowIndex = -1;
        let bestMatchCount = 0;

        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (!Array.isArray(row)) continue;
          let matchCount = 0;
          row.forEach(cell => {
            const cellStr = normalizeHeader(cell);
            if (cellStr && keyWords.some(kw => cellStr.includes(kw))) {
              matchCount++;
            }
          });
          if (matchCount > bestMatchCount && matchCount >= 2) {
            bestMatchCount = matchCount;
            headerRowIndex = i;
          }
        }

        if (headerRowIndex === -1) {
          const firstFewRows = rows.slice(0, 3).map(r => r.join(', ')).join('\n');
          alert(`No se detectó la fila de cabeceras en el Excel. \n\nPrimeras filas leídas:\n${firstFewRows}\n\nAsegúrate de tener columnas llamadas Ítem, Cantidad, Modalidad y Costo Base.`);
          return;
        }

        const headers = rows[headerRowIndex].map(h => String(h || '').trim());
        const dataRowsRaw = rows.slice(headerRowIndex + 1);

        // Convertir la matriz 2D a objetos usando los headers encontrados
        const sheetData = dataRowsRaw
          .filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ''))
          .map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header] = row[idx];
            });
            return obj;
          });

        // Normalizar claves y resolver sinónimos usando coincidencia parcial (fuzzy matching)
        const normalizedData = sheetData.map(row => {
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            const rawValue = row[key];
            const normKey = normalizeHeader(key);

            // Coincidencia parcial para alta tolerancia de sinónimos
            if (normKey.includes('item') || normKey.includes('nombre') || normKey.includes('equipo') || normKey.includes('suministro') || normKey.includes('desc') || normKey.includes('prod') || normKey.includes('det')) {
              normalizedRow['Ítem'] = rawValue;
            } else if (normKey.includes('cant') || normKey.includes('qty') || normKey.includes('unid') || normKey.includes('nro') || normKey.includes('num') || normKey.includes('vol')) {
              normalizedRow['Cantidad'] = rawValue;
            } else if (normKey.includes('modal') || normKey.includes('tipo') || normKey.includes('incoterm') || normKey.includes('compra') || normKey.includes('entrega')) {
              normalizedRow['Modalidad'] = rawValue;
            } else if (normKey.includes('cost') || normKey.includes('fob') || normKey.includes('exw') || normKey.includes('prec') || normKey.includes('price') || normKey.includes('base') || normKey.includes('unit') || normKey.includes('valor')) {
              normalizedRow['Costo Base'] = rawValue;
            } else if (normKey.includes('ncm') || normKey.includes('cod')) {
              normalizedRow['NCM'] = rawValue;
            } else if (normKey.includes('aran') || normKey.includes('tax') || normKey.includes('imp')) {
              normalizedRow['Arancel %'] = rawValue;
            } else {
              normalizedRow[key.trim()] = rawValue;
            }
          });
          return normalizedRow;
        });

        // Validar columnas requeridas
        const requiredCols = ['Ítem', 'Cantidad', 'Modalidad', 'Costo Base'];
        if (normalizedData.length > 0) {
          const firstRowKeys = Object.keys(normalizedData[0]);
          const missing = requiredCols.filter(col => !firstRowKeys.includes(col));
          if (missing.length > 0) {
            alert(`El Excel no cumple con el formato requerido. \n\nColumnas detectadas: ${firstRowKeys.join(', ')} \nColumnas faltantes: ${missing.join(', ')} \n\nPor favor, verifica los nombres de tus columnas.`);
            return;
          }
        } else {
          alert('El archivo Excel no contiene filas de datos válidas.');
          return;
        }

        const newEquipos = normalizedData.map(row => {
          let modalidad = row['Modalidad'] ? String(row['Modalidad']).trim() : 'FOB/EXW';
          if (!['Local', 'FOB/EXW', 'CIP'].includes(modalidad)) {
            modalidad = 'FOB/EXW'; // Fallback
          }
          return {
            id: crypto.randomUUID(),
            nombre: row['Ítem'] || 'Equipo sin nombre',
            cantidad: Math.max(1, parseInt(row['Cantidad']) || 1),
            costoBase: parseFloat(row['Costo Base']) || 0,
            modalidad,
            ncm: row['NCM'] ? String(row['NCM']).trim() : '8504.23.00',
            porcentajeArancel: row['Arancel %'] !== undefined ? parseFloat(row['Arancel %']) : undefined,
            valorFlete: undefined,
            porcentajeSeguro: undefined,
            porcentajeDespacho: undefined,
            aplicarFleteLocal: false,
            montoFleteLocal: 1500,
            porcentajeFinanciero: undefined,
            porcentajeAdmin: undefined,
            margenPorcentaje: undefined
          };
        });

        setEquipos(prev => [...prev, ...newEquipos]);
        alert(`✅ Se importaron ${newEquipos.length} equipos desde el archivo Excel.`);
      } catch (err) {
        console.error(err);
        alert('Ocurrió un error al procesar el archivo Excel. Asegúrate de usar un archivo válido.');
      }
    };
    reader.readAsArrayBuffer(file);
    // Limpiar input
    e.target.value = null;
  };

  // RESUMEN CONSOLIDADO
  const resTotales = equipos.reduce((acc, eq) => {
    const m = calcularMetricasEquipo(eq);
    acc.cif += m.cifTotal;
    acc.landed += m.landedCostTotal;
    acc.precio += m.precioVentaTotal;
    acc.ganancia += m.gananciaTotal;
    acc.iva += m.montoIVATotal;
    return acc;
  }, { cif: 0, landed: 0, precio: 0, ganancia: 0, iva: 0 });

  // EMISOR DE TOTAL AL DASHBOARD (el array `equipos` ya vive en el padre — no necesita subir)
  useEffect(() => {
    if (setTotalProcura) {
      setTotalProcura(resTotales.precio);
    }
  }, [resTotales.precio, setTotalProcura]);

  // SINCRONIZACIÓN DE MONEDA CON BLOQUE 0
  useEffect(() => {
    setMoneda(monedaTrabajo === 'USD' ? 'USD' : 'Gs.');
  }, [monedaTrabajo]);

  // COLOR DEL BORDE SEGÚN MODALIDAD
  const getBordeColor = (modalidad) => {
    if (modalidad === 'Local') return '4px solid #10b981'; // Verde
    if (modalidad === 'CIP') return '4px solid #8b5cf6'; // Morado
    return '4px solid #3b82f6'; // Azul FOB
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* FASE 1: PANEL GLOBAL "SETEA Y OLVIDA" */}
      <div className="odoo-card" style={{ background: '#ffffff', borderLeft: '4px solid #475569', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚙️ Panel de Variables Globales ("Setea y Olvida")
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>% Flete Base</label>
            <input 
              type="number" 
              value={defaults.fleteBase} 
              onChange={e => setDefaults({...defaults, fleteBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>% Seguro Base</label>
            <input 
              type="number" 
              value={defaults.seguroBase} 
              onChange={e => setDefaults({...defaults, seguroBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>% Despacho</label>
            <input 
              type="number" 
              value={defaults.despachoBase} 
              onChange={e => setDefaults({...defaults, despachoBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>% Financiero</label>
            <input 
              type="number" 
              value={defaults.financieroBase} 
              onChange={e => setDefaults({...defaults, financieroBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>% Administrativo</label>
            <input 
              type="number" 
              value={defaults.adminBase} 
              onChange={e => setDefaults({...defaults, adminBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>Arancel Defecto (%)</label>
            <input 
              type="number" 
              value={defaults.arancelBase} 
              onChange={e => setDefaults({...defaults, arancelBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.78rem', color: '#64748b' }}>Margen Global (%)</label>
            <input 
              type="number" 
              value={defaults.margenBase} 
              onChange={e => setDefaults({...defaults, margenBase: parseFloat(e.target.value) || 0})}
              style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: 'bold', color: '#2563eb' }} 
            />
          </div>
        </div>
      </div>

      {/* CONTROLES DEL PANEL DE PROCURA */}
      <div className="odoo-card" style={{ background: '#ffffff', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <Globe color="#2563eb" size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Planilla de Importación y Procura DDP</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Gestión DDP integrada con soporte para compras Locales, FOB y CIP
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* TOGGLE MONEDA */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              background: '#f8fafc', 
              padding: '6px 14px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1' 
            }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Visualizar:</span>
              {editandoCambio ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    value={valorCambioTemp}
                    onChange={e => setValorCambioTemp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConfirmarCambio()}
                    autoFocus
                    placeholder="T.C Gs/USD"
                    style={{ width: '90px', padding: '4px 8px', fontSize: '0.85rem', border: '1px solid #3b82f6', borderRadius: '6px', outline: 'none' }}
                  />
                  <button onClick={handleConfirmarCambio} title="Confirmar" style={{ border: 'none', background: '#10b981', color: '#fff', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>✓</button>
                  <button onClick={() => setEditandoCambio(false)} title="Cancelar" style={{ border: 'none', background: '#f1f5f9', color: '#475569', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>✕</button>
                </div>
              ) : (
                <button
                  onClick={handleToggleMoneda}
                  style={{
                    border: 'none',
                    background: moneda === 'USD' ? '#2563eb' : '#10b981',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowRightLeft size={14} /> {moneda}
                </button>
              )}
            </div>

            {/* IMPORTADOR EXCEL */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              <Upload size={16} /> Importar XLSX
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportExcel} 
                style={{ display: 'none' }} 
              />
            </label>



            {/* AGREGAR EQUIPO */}
            <button 
              className="primary-btn" 
              onClick={openModalNew}
              style={{ width: 'auto', padding: '10px 20px', background: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} /> Agregar Equipo
            </button>

          </div>
        </div>
      </div>

      {/* FASE 3: DATAGRID (TABLA DE EDICIÓN DIRECTA) */}
      <div className="odoo-card" style={{ padding: '0', overflowX: 'auto', background: '#ffffff' }}>
        {equipos.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center' }}>
            <Package size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: '#334155', margin: '0 0 8px 0' }}>Planilla de Procura Vacía</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Agrega equipos manualmente o importa una planilla Excel (.xlsx).</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Ítem</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, width: '90px', textAlign: 'center' }}>Cantidad</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, width: '120px', textAlign: 'center' }}>Modalidad</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Costo Base Unit (USD)</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, width: '130px', textAlign: 'center' }}>NCM (Editable)</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, width: '110px', textAlign: 'center' }}>Arancel % (Editable)</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Costo DDP Unitario</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Precio Venta Lote</th>
                <th style={{ padding: '14px 16px', width: '100px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((eq) => {
                const m = calcularMetricasEquipo(eq);
                return (
                  <tr 
                    key={eq.id} 
                    style={{ 
                      borderBottom: '1px solid #f1f5f9', 
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* INDICADOR LATERAL SEGÚN MODALIDAD */}
                    <td style={{ padding: '14px 16px', borderLeft: getBordeColor(eq.modalidad), fontWeight: 600, color: '#0f172a' }}>
                      {eq.nombre}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                        {eq.cantidad}x
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ 
                        background: eq.modalidad === 'Local' ? '#d1fae5' : eq.modalidad === 'CIP' ? '#f3e8ff' : '#eff6ff',
                        color: eq.modalidad === 'Local' ? '#065f46' : eq.modalidad === 'CIP' ? '#6b21a8' : '#1e40af',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '12px'
                      }}>
                        {eq.modalidad}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(eq.costoBase)}
                    </td>
                    
                    {/* EDICIÓN INLINE: NCM */}
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <input 
                        type="text" 
                        value={eq.ncm} 
                        onChange={(e) => handleUpdateInline(eq.id, 'ncm', e.target.value)}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          border: '1px solid transparent',
                          background: 'transparent',
                          padding: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#cbd5e1';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.borderColor = 'transparent';
                        }}
                      />
                    </td>

                    {/* EDICIÓN INLINE: ARANCEL % */}
                    <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                      <input 
                        type="number" 
                        value={eq.porcentajeArancel !== undefined ? eq.porcentajeArancel : ''} 
                        placeholder={defaults.arancelBase}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                          handleUpdateInline(eq.id, 'porcentajeArancel', val);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          border: '1px solid transparent',
                          background: 'transparent',
                          padding: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: eq.porcentajeArancel !== undefined ? 'bold' : 'normal',
                          color: eq.porcentajeArancel !== undefined ? '#2563eb' : 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.borderColor = '#cbd5e1';
                        }}
                        onBlur={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.borderColor = 'transparent';
                        }}
                      />
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>
                      {formatMoneda(m.landedCostUnitario)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#1e3a8a' }}>
                      {formatMoneda(m.precioVentaTotal)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => openModalEdit(eq)} 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                          title="Ficha Completa / Costos Fijos"
                        >
                          <Edit2 size={16} color="#2563eb" />
                        </button>
                        <button 
                          onClick={() => handleRemoveEquipo(eq.id)} 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                          title="Quitar"
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* TARJETA RESUMEN CONSOLIDADO */}
      {equipos.length > 0 && (
        <div className="odoo-card" style={{ background: '#0f172a', color: '#ffffff', border: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Total CIF Planilla</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>{formatMoneda(resTotales.cif)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Costo Directo Landed (DDP)</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>{formatMoneda(resTotales.landed)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Ganancia Estimada Procura</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{formatMoneda(resTotales.ganancia)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Precio Venta Final Procura</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa' }}>{formatMoneda(resTotales.precio)}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN / ADICIÓN (CON RENDERIZADO CONDICIONAL ESTRICTO) */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="odoo-card modal-content" style={{ width: '750px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff' }}>
            
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#0f172a' }}>
              <Calculator size={24} color="#2563eb" /> {editingId ? 'Ficha de Costos: Editar Equipo' : 'Formulario de Procura: Agregar Equipo'}
            </h2>

            {/* SECCIÓN 1: IDENTIFICACIÓN & MODALIDAD */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>1. Configuración Básica del Suministro</h4>
              <div className="config-grid" style={{ marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Nombre del Equipo</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Transformador 80MVA" 
                    value={formData.nombre} 
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Modalidad de Compra</label>
                  <select 
                    value={formData.modalidad} 
                    onChange={e => setFormData({ ...formData, modalidad: e.target.value })}
                    style={{ fontWeight: 'bold' }}
                  >
                    <option value="FOB/EXW">FOB / EXW (Importación Completa)</option>
                    <option value="CIP">CIP (Llega a Aduana Destino)</option>
                    <option value="Local">Compra Local (Costo Directo sin Aduanas)</option>
                  </select>
                </div>
              </div>

              <div className="config-grid">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Cantidad</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.cantidad} 
                    onChange={e => setFormData({ ...formData, cantidad: Math.max(1, parseInt(e.target.value) || 1) })} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Costo Base Unitario (USD FOB/EXW/Local)</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder="Ej: 450000" 
                    value={formData.costoBase} 
                    onChange={e => setFormData({ ...formData, costoBase: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
            </div>

            {/* FASE 2: RENDERIZADO CONDICIONAL ESTRICTO */}
            
            {/* LOGÍSTICA INTERNACIONAL (Oculto totalmente en Local y CIP) */}
            {formData.modalidad === 'FOB/EXW' && (
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>2. Logística Internacional & Seguro CIF</h4>
                <div className="config-grid">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Flete Internacional Especial (% sobre FOB)</label>
                    <input 
                      type="number" 
                      min="0" 
                      placeholder={`Usa global (${defaults.fleteBase}%)`}
                      value={formData.valorFlete !== undefined ? formData.valorFlete : ''} 
                      onChange={e => setFormData({ ...formData, valorFlete: e.target.value === '' ? undefined : parseFloat(e.target.value) })} 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Seguro Internacional Especial (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      placeholder={`Usa global (${defaults.seguroBase}%)`}
                      value={formData.porcentajeSeguro !== undefined ? formData.porcentajeSeguro : ''} 
                      onChange={e => setFormData({ ...formData, porcentajeSeguro: e.target.value === '' ? undefined : parseFloat(e.target.value) })} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NACIONALIZACIÓN (Oculto totalmente en Local, visible en CIP y FOB) */}
            {formData.modalidad !== 'Local' && (
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>{formData.modalidad === 'CIP' ? '2. Nacionalización Aduanera DDP' : '3. Nacionalización Aduanera DDP'}</h4>
                
                <div className="config-grid" style={{ marginBottom: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Autocompletar NCM</label>
                    <select value={formData.ncm} onChange={e => handleSelectNCM(e.target.value)}>
                      {diccionarioNCM.map(item => (
                        <option key={item.ncm} value={item.ncm}>
                          {item.ncm} - {item.desc} ({item.arancel}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Arancel Específico (% sobre CIF)</label>
                    <input 
                      type="number" 
                      min="0" 
                      placeholder={`Usa global o NCM (${defaults.arancelBase}%)`}
                      value={formData.porcentajeArancel !== undefined ? formData.porcentajeArancel : ''} 
                      onChange={e => setFormData({ ...formData, porcentajeArancel: e.target.value === '' ? undefined : parseFloat(e.target.value) })} 
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Gastos de Despachante & Puerto Especial (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    placeholder={`Usa global (${defaults.despachoBase}%)`}
                    value={formData.porcentajeDespacho !== undefined ? formData.porcentajeDespacho : ''} 
                    onChange={e => setFormData({ ...formData, porcentajeDespacho: e.target.value === '' ? undefined : parseFloat(e.target.value) })} 
                  />
                </div>
              </div>
            )}

            {/* SECCIÓN FINAL: LOGÍSTICA INTERNA Y MARGEN (Siempre visible) */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>Gastos Locales & Rentabilidad DDP</h4>
              
              <div style={{ marginBottom: '12px', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#334155', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={formData.aplicarFleteLocal} 
                    onChange={e => setFormData({ ...formData, aplicarFleteLocal: e.target.checked })} 
                    style={{ width: 'auto', transform: 'scale(1.2)' }}
                  />
                  ¿Aplicar flete local interno hasta obra?
                </label>
                {formData.aplicarFleteLocal && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Costo Flete Local Estimado (USD Unitario)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={formData.montoFleteLocal} 
                      onChange={e => setFormData({ ...formData, montoFleteLocal: parseFloat(e.target.value) || 0 })} 
                    />
                  </div>
                )}
              </div>

              <div className="config-grid">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Gastos Financieros Específicos (% CIF)</label>
                  <input 
                    type="number" 
                    placeholder={`Usa global (${defaults.financieroBase}%)`}
                    value={formData.porcentajeFinanciero !== undefined ? formData.porcentajeFinanciero : ''}
                    onChange={e => setFormData({ ...formData, porcentajeFinanciero: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Gastos Administrativos Específicos (% CIF)</label>
                  <input 
                    type="number" 
                    placeholder={`Usa global (${defaults.adminBase}%)`}
                    value={formData.porcentajeAdmin !== undefined ? formData.porcentajeAdmin : ''}
                    onChange={e => setFormData({ ...formData, porcentajeAdmin: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: '12px 0 0 0' }}>
                <label style={{ color: '#2563eb', fontWeight: 700 }}>Margen de Ganancia Específico (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="99" 
                  placeholder={`Usa global (${defaults.margenBase}%)`}
                  value={formData.margenPorcentaje !== undefined ? formData.margenPorcentaje : ''} 
                  onChange={e => setFormData({ ...formData, margenPorcentaje: e.target.value === '' ? undefined : parseFloat(e.target.value) })} 
                  style={{ borderColor: '#3b82f6', background: '#ffffff', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* BOTONES DEL MODAL */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="remove-btn" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569' }}>
                Cancelar
              </button>
              <button className="primary-btn" onClick={handleSaveEquipo} style={{ width: 'auto', padding: '10px 24px', background: '#2563eb' }}>
                {editingId ? 'Guardar Cambios' : 'Añadir Equipo'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
