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
  ShieldAlert, 
  Truck, 
  Building, 
  Search,
  Check
} from 'lucide-react';

// DICCIONARIO NCM (Mock Local)
const diccionarioNCM = [
  { ncm: '8504.23.00', desc: 'Transformadores de potencia (> 10 MVA)', arancel: 0 },
  { ncm: '8535.21.00', desc: 'Interruptores de SF6 para Alta Tensión', arancel: 14 },
  { ncm: '8504.40.90', desc: 'Inversores fotovoltaicos / Convertidores', arancel: 10 },
  { ncm: '8537.20.00', desc: 'Celdas y tableros de mando (> 1000 V)', arancel: 12 },
  { ncm: '8504.34.00', desc: 'Transformadores de medida y auxiliares', arancel: 6 }
];

export default function Bloque1_Procura({ setTotalProcura, setDetalleProcura }) {
  // ESTADO GLOBAL DE MONEDA (Única fuente de la verdad en USD)
  const [moneda, setMoneda] = useState('USD'); // 'USD' vs 'Gs.'
  const [tipoCambio, setTipoCambio] = useState(7500); // 1 USD = 7500 Gs. por defecto

  // LISTA DE EQUIPOS A IMPORTAR
  const [equipos, setEquipos] = useState([
    {
      id: crypto.randomUUID(),
      nombre: 'Transformador de Potencia 80 MVA 220/23 kV',
      cantidad: 1,
      costoBase: 450000, // USD FOB
      tipoFlete: 'porcentaje', // 'monto' vs 'porcentaje'
      valorFlete: 5, // 5% de flete marítimo/terrestre
      porcentajeSeguro: 2, // 2% seguro internacional
      ncm: '8504.23.00',
      porcentajeArancel: 0,
      porcentajeDespacho: 6,
      aplicarFleteLocal: true,
      montoFleteLocal: 3500, // USD flete interno a obra
      porcentajeFinanciero: 3,
      porcentajeAdmin: 3,
      margenPorcentaje: 30
    }
  ]);

  // ESTADO DE MODAL DE EDICIÓN / ADICIÓN
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const initialFormState = {
    nombre: '',
    cantidad: 1,
    costoBase: 0,
    tipoFlete: 'porcentaje',
    valorFlete: 4,
    porcentajeSeguro: 2,
    ncm: '8504.23.00',
    porcentajeArancel: 0,
    porcentajeDespacho: 6,
    aplicarFleteLocal: false,
    montoFleteLocal: 1500,
    porcentajeFinanciero: 3,
    porcentajeAdmin: 3,
    margenPorcentaje: 30
  };

  const [formData, setFormData] = useState(initialFormState);

  // MANEJADOR DEL CAMBIO DE MONEDA CON PROMPT VIRTUAL / VISUAL
  const handleToggleMoneda = () => {
    if (moneda === 'USD') {
      const tc = window.prompt('Ingresa el Tipo de Cambio del Día (Gs. por 1 USD):', tipoCambio);
      if (tc !== null && !isNaN(parseFloat(tc)) && parseFloat(tc) > 0) {
        setTipoCambio(parseFloat(tc));
        setMoneda('Gs.');
      }
    } else {
      setMoneda('USD');
    }
  };

  // HELPER PARA FORMATEAR MONEDAS SINCRO (CONVERSIÓN SOLO VISUAL)
  const formatMoneda = (valUSD) => {
    if (moneda === 'Gs.') {
      const valGs = valUSD * tipoCambio;
      return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(valGs);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(valUSD);
  };

  // MATRIZ DE CÁLCULO FINANCIERO (CASCADA LANDED COST + MARGEN REAL)
  const calcularMetricasEquipo = (eq) => {
    const qty = Math.max(1, parseInt(eq.cantidad) || 1);
    const baseUnit = parseFloat(eq.costoBase) || 0;
    const baseTotal = baseUnit * qty;

    // Flete Internacional
    const montoFleteTotal = eq.tipoFlete === 'porcentaje' 
      ? baseTotal * ((parseFloat(eq.valorFlete) || 0) / 100)
      : (parseFloat(eq.valorFlete) || 0) * qty;

    // Seguro Internacional
    const montoSeguroTotal = (baseTotal + montoFleteTotal) * ((parseFloat(eq.porcentajeSeguro) || 0) / 100);

    // Subtotal CIF
    const cifTotal = baseTotal + montoFleteTotal + montoSeguroTotal;

    // Nacionalización & Aranceles
    const montoArancelTotal = cifTotal * ((parseFloat(eq.porcentajeArancel) || 0) / 100);
    const montoDespachoTotal = cifTotal * ((parseFloat(eq.porcentajeDespacho) || 0) / 100);

    // IVA Aduanero (Base Imponible = CIF + Arancel). 10% Fijo. No suma a costo directo (Crédito Fiscal)
    const baseImponibleIVA = cifTotal + montoArancelTotal;
    const montoIVATotal = baseImponibleIVA * 0.10;

    // Logística Interna
    const montoFleteLocalTotal = eq.aplicarFleteLocal ? ((parseFloat(eq.montoFleteLocal) || 0) * qty) : 0;

    // Gastos Financieros y Administrativos
    const montoFinancieroTotal = cifTotal * ((parseFloat(eq.porcentajeFinanciero) || 0) / 100);
    const montoAdminTotal = cifTotal * ((parseFloat(eq.porcentajeAdmin) || 0) / 100);

    // COSTO TOTAL IMPORTACIÓN (Landed Cost DDP)
    const landedCostTotal = cifTotal + montoArancelTotal + montoDespachoTotal + montoFleteLocalTotal + montoFinancieroTotal + montoAdminTotal;
    const landedCostUnitario = landedCostTotal / qty;

    // Precio de Venta (Margen Real) -> Fórmula Estricta: Precio = LandedCost / (1 - Margen)
    const margenDecimal = Math.min(0.99, Math.max(0, (parseFloat(eq.margenPorcentaje) || 0) / 100));
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
      gananciaTotal
    };
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
    if (parseFloat(formData.costoBase) <= 0) return alert('Ingresa un costo base (FOB/EXW) válido.');

    if (editingId) {
      setEquipos(prev => prev.map(item => item.id === editingId ? { ...formData } : item));
    } else {
      setEquipos(prev => [...prev, { ...formData, id: crypto.randomUUID() }]);
    }
    setShowModal(false);
  };

  const handleRemoveEquipo = (id) => {
    if (window.confirm('¿Deseas quitar este equipo de la planilla de procura?')) {
      setEquipos(prev => prev.filter(e => e.id !== id));
    }
  };

  // RESUMEN CONSOLIDADO DEL BLOQUE
  const resTotales = equipos.reduce((acc, eq) => {
    const m = calcularMetricasEquipo(eq);
    acc.cif += m.cifTotal;
    acc.landed += m.landedCostTotal;
    acc.precio += m.precioVentaTotal;
    acc.ganancia += m.gananciaTotal;
    acc.iva += m.montoIVATotal;
    return acc;
  }, { cif: 0, landed: 0, precio: 0, ganancia: 0, iva: 0 });

  // EMISOR DE ESTADO GLOBAL PARA EL DASHBOARD (State Lifting)
  useEffect(() => {
    if (setTotalProcura) {
      setTotalProcura(resTotales.precio);
    }
    if (setDetalleProcura) {
      setDetalleProcura(equipos);
    }
  }, [resTotales.precio, equipos, setTotalProcura, setDetalleProcura]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* PANEL SUPERIOR CON CONTROLES Y SWAP DE MONEDA */}
      <div className="odoo-card" style={{ background: '#ffffff', borderLeft: '4px solid #2563eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <Globe color="#2563eb" size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Gestión de Procura & Landed Cost (Importación EPC)</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Costeo de Suministros FOB/CIF, Aranceles Nacionalización, Gastos Locales y Rentabilidad DDP
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            
            {/* TOGGLE MONEDA CON FEEDBACK DE TIPO DE CAMBIO */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              background: '#f8fafc', 
              padding: '6px 14px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1' 
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Visualización:</span>
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
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <ArrowRightLeft size={14} /> {moneda}
              </button>
              {moneda === 'Gs.' && (
                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
                  (T.C: {tipoCambio.toLocaleString('es-PY')} Gs/$)
                </span>
              )}
            </div>

            <button 
              className="primary-btn" 
              onClick={openModalNew}
              style={{ width: 'auto', padding: '10px 20px', background: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={18} /> Agregar Equipo Procura
            </button>

          </div>

        </div>
      </div>

      {/* TARJETAS DE EQUIPOS (DESGLOSE EN 4 COLUMNAS POR CADA ÍTEM) */}
      {equipos.length === 0 ? (
        <div className="odoo-card" style={{ padding: '50px 20px', textAlign: 'center', background: '#ffffff', border: '2px dashed #e2e8f0' }}>
          <Package size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ color: '#334155', margin: '0 0 8px 0' }}>Planilla de Procura Vacía</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0' }}>Haz clic en "Agregar Equipo Procura" para calcular el costo de importación DDP.</p>
          <button className="primary-btn" onClick={openModalNew} style={{ width: 'auto', margin: '0 auto', background: '#2563eb' }}>
            <Plus size={18} /> Añadir Primer Equipo
          </button>
        </div>
      ) : (
        equipos.map((eq) => {
          const m = calcularMetricasEquipo(eq);
          return (
            <div 
              key={eq.id} 
              className="odoo-card" 
              style={{ 
                background: '#ffffff', 
                padding: '20px', 
                borderLeft: '4px solid #10b981',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}
            >
              
              {/* HEADER TARJETA EQUIPO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.85rem', padding: '4px 10px', borderRadius: '6px' }}>
                    {eq.cantidad}x Cant.
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{eq.nombre}</h3>
                  <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                    NCM: {eq.ncm}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => openModalEdit(eq)} 
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <Edit2 size={15} color="#2563eb" /> Editar Costos
                  </button>
                  <button 
                    onClick={() => handleRemoveEquipo(eq.id)} 
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* MATRIZ DE 4 COLUMNAS DE CÁLCULO FINANCIERO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '15px' }}>
                
                {/* COLUMNA 1: DATOS BASE & LOGÍSTICA INT. */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#1e40af', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Ship size={16} /> 1. Datos Base & Flete/Seguro
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Costo FOB (Unit):</span>
                      <span style={{ fontWeight: 600 }}>{formatMoneda(eq.costoBase)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Flete Int. ({eq.tipoFlete === 'porcentaje' ? `${eq.valorFlete}%` : 'Fijo'}):</span>
                      <span>{formatMoneda(m.montoFleteTotal / m.qty)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Seguro Int. ({eq.porcentajeSeguro}%):</span>
                      <span>{formatMoneda(m.montoSeguroTotal / m.qty)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#0f172a' }}>
                      <span>Subtotal CIF (Unit):</span>
                      <span style={{ color: '#2563eb' }}>{formatMoneda(m.cifTotal / m.qty)}</span>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 2: NACIONALIZACIÓN & ARANCELES */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#b45309', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Building size={16} /> 2. Nacionalización Aduana
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Arancel Aduanero ({eq.porcentajeArancel}%):</span>
                      <span>{formatMoneda(m.montoArancelTotal / m.qty)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gastos Despacho ({eq.porcentajeDespacho}%):</span>
                      <span>{formatMoneda(m.montoDespachoTotal / m.qty)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <span>IVA Aduanero (10% Créd. Fiscal):</span>
                      <span style={{ fontStyle: 'italic' }}>{formatMoneda(m.montoIVATotal / m.qty)}</span>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 3: COSTOS LOCALES Y FINANCIEROS */}
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#6b21a8', fontWeight: 700, fontSize: '0.85rem' }}>
                    <Truck size={16} /> 3. Costos Locales & Admin
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Flete Local / Destino:</span>
                      <span>{eq.aplicarFleteLocal ? formatMoneda(eq.montoFleteLocal) : 'N/A (0)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Financiero ({eq.porcentajeFinanciero}%):</span>
                      <span>{formatMoneda(m.montoFinancieroTotal / m.qty)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gastos Admin ({eq.porcentajeAdmin}%):</span>
                      <span>{formatMoneda(m.montoAdminTotal / m.qty)}</span>
                    </div>
                  </div>
                </div>

                {/* COLUMNA 4: RESULTADO COMERCIAL (LANDED COST & PRECIO DE VENTA) */}
                <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#1e40af', fontWeight: 700, fontSize: '0.85rem' }}>
                    <TrendingUp size={16} /> 4. Resultado Comercial DDP
                  </div>
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                      <span>Landed Cost Unitario:</span>
                      <span style={{ fontWeight: 700 }}>{formatMoneda(m.landedCostUnitario)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                      <span>Margen Aplicado:</span>
                      <span>{eq.margenPorcentaje}% Real</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid #93c5fd', fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a' }}>
                      <span>Precio Venta Unit:</span>
                      <span>{formatMoneda(m.precioVentaUnitario)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#2563eb', textAlign: 'right', fontWeight: 600 }}>
                      Total Lote ({m.qty}x): {formatMoneda(m.precioVentaTotal)}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          );
        })
      )}

      {/* TARJETA RESUMEN CONSOLIDADO EPC PROCURA */}
      {equipos.length > 0 && (
        <div className="odoo-card" style={{ background: '#0f172a', color: '#ffffff', border: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Total CIF Importaciones</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#38bdf8' }}>{formatMoneda(resTotales.cif)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Costo Directo Landed (DDP)</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>{formatMoneda(resTotales.landed)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Ganancia Bruta Procura</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34d399' }}>{formatMoneda(resTotales.ganancia)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Precio Venta Final Procura</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60a5fa' }}>{formatMoneda(resTotales.precio)}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN / ADICIÓN DE EQUIPO */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div className="odoo-card modal-content" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff' }}>
            
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#0f172a' }}>
              <Calculator size={24} color="#2563eb" /> {editingId ? 'Editar Formulación de Importación' : 'Agregar Equipo a Procura'}
            </h2>

            {/* SECCIÓN 1: IDENTIFICACIÓN & FOB */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>1. Identificación y Costo Base</h4>
              <div className="config-grid" style={{ marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Nombre del Equipo / Suministro</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Inversor Centralizado 2.5 MW" 
                    value={formData.nombre} 
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Cantidad</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.cantidad} 
                    onChange={e => setFormData({ ...formData, cantidad: Math.max(1, parseInt(e.target.value) || 1) })} 
                  />
                </div>
              </div>

              <div className="config-grid">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Autocompletar NCM (Arancel Aduanero)</label>
                  <select value={formData.ncm} onChange={e => handleSelectNCM(e.target.value)}>
                    {diccionarioNCM.map(item => (
                      <option key={item.ncm} value={item.ncm}>
                        {item.ncm} - {item.desc} ({item.arancel}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Costo Base Unitario (USD FOB/EXW)</label>
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

            {/* SECCIÓN 2: LOGÍSTICA INTERNACIONAL */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>2. Logística Internacional & Seguro CIF</h4>
              <div className="config-grid" style={{ marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Modalidad de Flete</label>
                  <select value={formData.tipoFlete} onChange={e => setFormData({ ...formData, tipoFlete: e.target.value })}>
                    <option value="porcentaje">Porcentaje (%) sobre FOB</option>
                    <option value="monto">Monto Fijo (USD Unitario)</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{formData.tipoFlete === 'porcentaje' ? 'Porcentaje de Flete (%)' : 'Monto Flete USD (Unit)'}</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.valorFlete} 
                    onChange={e => setFormData({ ...formData, valorFlete: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Seguro Internacional (%) sobre (FOB + Flete)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.5" 
                  value={formData.porcentajeSeguro} 
                  onChange={e => setFormData({ ...formData, porcentajeSeguro: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>

            {/* SECCIÓN 3: NACIONALIZACIÓN & COSTOS LOCALES */}
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>3. Nacionalización & Gastos Locales</h4>
              <div className="config-grid" style={{ marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Arancel Aduanero (% sobre CIF)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.porcentajeArancel} 
                    onChange={e => setFormData({ ...formData, porcentajeArancel: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Gastos Despachante y Puerto (% CIF)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.porcentajeDespacho} 
                    onChange={e => setFormData({ ...formData, porcentajeDespacho: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#334155', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={formData.aplicarFleteLocal} 
                    onChange={e => setFormData({ ...formData, aplicarFleteLocal: e.target.checked })} 
                    style={{ width: 'auto', transform: 'scale(1.2)' }}
                  />
                  ¿Aplicar Flete Local Interno hasta la Obra?
                </label>
                {formData.aplicarFleteLocal && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Monto Flete Local Estimado (USD Unitario)</label>
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
                  <label>Gastos Financieros (% CIF)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.porcentajeFinanciero} 
                    onChange={e => setFormData({ ...formData, porcentajeFinanciero: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Gastos Administrativos (% CIF)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.porcentajeAdmin} 
                    onChange={e => setFormData({ ...formData, porcentajeAdmin: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: MARGEN REAL & RESULTADO */}
            <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e40af', fontSize: '0.9rem' }}>4. Margen Comercial y Resultado DDP</h4>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ color: '#1e40af', fontWeight: 700 }}>Margen de Ganancia Comercial Real (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="99" 
                  value={formData.margenPorcentaje} 
                  onChange={e => setFormData({ ...formData, margenPorcentaje: parseFloat(e.target.value) || 0 })} 
                  style={{ borderColor: '#3b82f6', background: '#ffffff', fontWeight: 700, color: '#1e3a8a' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Fórmula aplicada: Precio = LandedCost / (1 - Margen)
                </span>
              </div>
            </div>

            {/* BOTONES DEL MODAL */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="remove-btn" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569' }}>
                Cancelar
              </button>
              <button className="primary-btn" onClick={handleSaveEquipo} style={{ width: 'auto', padding: '10px 24px', background: '#2563eb' }}>
                {editingId ? 'Guardar Cambios' : 'Agregar a Procura'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
