import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Calculator, FileText, Plus, Trash2, Zap, Layout, Database as DatabaseIcon, Edit2, ShieldAlert, Save, PackagePlus, Users, DollarSign, Calendar, Truck } from 'lucide-react';
import UnifilarConfigurator from './UnifilarConfigurator';
import CRMFinancialPanelV2 from './CRMFinancialPanelV2';
import { fetchEquiposMaestros, getTensionsFromData, getEquipmentsByTensionFromData, addEquipoMaestro, saveCotizacion } from './services/dbService';
import { calcularCotizacionActiva, Maestro_Precios_Mercado, COSTO_ESPECIALISTA_DIA, COSTO_AUXILIAR_DIA, COSTO_EXTERNO_DIA, TARIFA_EQUIPOS_HORA } from './financialEngine';
import LogisticsModal from './LogisticsModal';
import SavedQuotesPanel from './SavedQuotesPanel';
import Login from './Login';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import './index.css';

const DEDUCTED_HOSPEDAJE_RATE = 200000;
const DEDUCTED_VIATICO_RATE = 100000;

function Bloque2_SSTT({ setTotalServicios, setDetalleServicios }) {
  const [tension, setTension] = useState('500 kV');
  const [equipo, setEquipo] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [activeTab, setActiveTab] = useState('cotizador'); // 'cotizador' or 'unifilar'
  
  // Global config
  const [distanciaKm, setDistanciaKm] = useState(100);
  const [diasPermitidosCorte, setDiasPermitidosCorte] = useState(3);
  const [cart, setCart] = useState([]);
  const [alquileres, setAlquileres] = useState([]);
  
  // Imprevistos (Elevados desde CRM)
  const [gastosImprevistos, setGastosImprevistos] = useState(0);
  const [margenImprevistosPorcentaje, setMargenImprevistosPorcentaje] = useState(0);

  // Logistics Overrides
  const [logisticsOverrides, setLogisticsOverrides] = useState({ enabled: false });
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  
  // Saved Quotes
  const [showSavedQuotesPanel, setShowSavedQuotesPanel] = useState(false);

  // Client Metadata
  const [cliente, setCliente] = useState('');
  const [nombreObra, setNombreObra] = useState('');
  
  // Nube: Estado de los datos maestros
  const [maestroData, setMaestroData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Escuchar estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Cargar desde Firestore al montar la app (Solo si hay usuario logueado)
  useEffect(() => {
    if (!user) return;
    async function loadCatalog() {
      setIsLoading(true);
      const data = await fetchEquiposMaestros();
      if (data && data.length > 0) {
        setMaestroData(data);
      } else {
        console.warn("No se pudo cargar de Firebase, asegúrate de haber migrado la base de datos.");
      }
      setIsLoading(false);
    }
    loadCatalog();
  }, [user]);

  const tensions = useMemo(() => getTensionsFromData(maestroData), [maestroData]);
  const availableEquipments = useMemo(() => getEquipmentsByTensionFromData(maestroData, tension), [maestroData, tension]);

  // Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [overrideState, setOverrideState] = useState({});

  // Ad-Hoc State
  const [showAdHocModal, setShowAdHocModal] = useState(false);
  const [adHocState, setAdHocState] = useState({
    equipo: '', tension: '500 kV', horas_equipo: 4, interno: 1, ayudante: 1, externo: 0,
    costo_total_base: 0, is_tercerizado: false, margen_tercerizado: 30, saveToDb: false,
    categoria: 'zona_otros', costoServiceFee: 0, margenServiceFee: 0, costoAmortizacion: 0, margenAmortizacion: 0
  });

  // Unsaved changes & Reset
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

  const resetQuote = () => {
    setCart([]);
    setAlquileres([]);
    setDistanciaKm(100);
    setDiasPermitidosCorte(3);
    setGastosImprevistos(0);
    setMargenImprevistosPorcentaje(0);
    setLogisticsOverrides({ enabled: false });
    setCliente('');
    setNombreObra('');
    setIsDirty(false);
  };

  const handleNewCosteo = () => {
    if (isDirty) {
      setShowUnsavedChangesModal(true);
    } else {
      resetQuote();
    }
  };

  // Set default equipment when tension changes
  React.useEffect(() => {
    if (availableEquipments.length > 0) {
      setEquipo(availableEquipments[0].equipo);
    }
  }, [tension, availableEquipments]);

  const isItemModified = (item) => {
    if (!item.overrides) return false;
    if (item.overrides.is_tercerizado || item.overrides.top_down_enabled) return false;
    const baseHoras = item.baseData?.horas_equipo ?? 4;
    const baseInterno = item.baseData?.interno ?? 1;
    const baseAyudante = item.baseData?.ayudante ?? 1;
    const baseExterno = item.baseData?.externo ?? 0;
    
    return (
      (item.overrides.horas_equipo !== undefined && item.overrides.horas_equipo !== baseHoras) ||
      (item.overrides.interno !== undefined && item.overrides.interno !== baseInterno) ||
      (item.overrides.ayudante !== undefined && item.overrides.ayudante !== baseAyudante) ||
      (item.overrides.externo !== undefined && item.overrides.externo !== baseExterno) ||
      (item.overrides.costoServiceFee || 0) > 0 ||
      (item.overrides.costoAmortizacion || 0) > 0
    );
  };

  const handleAdd = () => {
    const equipData = availableEquipments.find(e => e.equipo === equipo);
    if (!equipData) return;

    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      tension,
      equipo,
      cantidad: parseInt(cantidad) || 1,
      baseData: structuredClone(equipData)
    }]);
  };

  const handleAddToCartFromUnifilar = (item) => {
    const availables = getEquipmentsByTensionFromData(maestroData, item.tension);
    
    // Mapping from Unifilar names to exact Database names
    const nameMap = {
      'Interruptores de Potencia (SF6)': 'Interruptor',
      'Seccionadores con PAT': 'Seccionador C/PAT',
      'Seccionadores Simples': 'Seccionador',
      'Seccionadores Pantógrafos (solo 500kV)': 'Seccionador Pantografo',
      'Seccionadores Monopolares': 'Seccionador Monopolar',
      'Transformadores de Corriente (TC)': 'Transformador De Corriente',
      'Transformadores de Potencial (TP/DCP)': 'Transformador De Tensión',
      'Descargadores de Sobretensión': 'Descargador',
      'Trampas de Onda / Bobinas de Bloqueo': 'Trampa de Onda',
      'Autotransformadores Monofásicos (500kV)': 'Autotransformador Monofásico',
      'Transformadores de Potencia Trifásicos (220kV/66kV)': 'Transformador Trifásico',
      'Celdas GIS / Metal-clad (Llegada, Acople y Salida)': 'Celdas GIS 23kV',
      'Interruptores Extraíbles de Vacío': 'Interruptor',
      'Reactores de Barra/Línea': 'Transformador Monofásico', // Fallback aproximado
      'Bancos de Capacitores': 'Trampa de Onda', // Fallback aproximado
      'Transformadores de Servicios Auxiliares de MT': 'Transformador De Tensión', // Fallback aproximado
      'Paneles de Protección y Control (Relés/IEDs)': 'Celdas GIS 23kV', // Fallback aproximado
      'Bancos de Baterías y Cargadores Rectificadores': 'Transformador Monofásico', // Fallback aproximado
      'Tableros de Servicios Auxiliares (CA/CC)': 'Celda de Llegada' // Fallback aproximado
    };

    const mappedName = nameMap[item.equipo] || item.equipo;
    let equipData = availables.find(e => e.equipo.toLowerCase() === mappedName.toLowerCase());
    
    if (!equipData) {
      equipData = availables.find(e => e.equipo.toLowerCase().includes(mappedName.toLowerCase()) || mappedName.toLowerCase().includes(e.equipo.toLowerCase()));
    }
    
    // Si aún no encuentra, usar un genérico para no romper el flujo
    if (!equipData) {
      equipData = {
        tension: item.tension,
        equipo: item.equipo,
        horas_equipo: 4,
        interno: 1, ayudante: 1, costo_total_base: 1000000
      };
    }
    
    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      tension: item.tension,
      equipo: item.equipo, // Keep the unifilar name for UI
      cantidad: item.cantidad,
      baseData: structuredClone(equipData)
    }]);
    setIsDirty(true);
    alert(`✅ ${item.cantidad}x ${item.equipo} (${item.tension}) agregado al carrito.`);
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
    setIsDirty(true);
  };

  const updateQuantity = (id, newQty) => {
    const parsedQty = parseInt(newQty);
    if (isNaN(parsedQty) || parsedQty < 1) return;
    setCart(prev => prev.map(item => item.id === id ? { ...item, cantidad: parsedQty } : item));
    setIsDirty(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item.id);
    setOverrideState({
      horas_equipo: item.overrides?.horas_equipo ?? item.baseData?.horas_equipo ?? 4,
      interno: item.overrides?.interno ?? item.baseData?.interno ?? 1,
      ayudante: item.overrides?.ayudante ?? item.baseData?.ayudante ?? 1,
      externo: item.overrides?.externo ?? item.baseData?.externo ?? 0,
      costo_total_base: item.overrides?.costo_total_base ?? item.baseData?.costo_total_base ?? 0,
      is_tercerizado: item.overrides?.is_tercerizado ?? false,
      margen_tercerizado: item.overrides?.margen_tercerizado ?? 30,
      top_down_enabled: item.overrides?.top_down_enabled ?? false,
      valor_inyectado: item.overrides?.valor_inyectado ?? 0,
      costoServiceFee: item.overrides?.costoServiceFee ?? 0,
      margenServiceFee: item.overrides?.margenServiceFee ?? 0,
      costoAmortizacion: item.overrides?.costoAmortizacion ?? 0,
      margenAmortizacion: item.overrides?.margenAmortizacion ?? 0,
    });
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const saveOverrides = () => {
    const finalOverrides = {
      ...overrideState,
      top_down_enabled: overrideState.is_tercerizado ? false : overrideState.top_down_enabled,
      is_tercerizado: overrideState.top_down_enabled ? false : overrideState.is_tercerizado
    };
    setCart(prev => prev.map(item => 
      item.id === editingItem 
        ? { ...item, overrides: structuredClone(finalOverrides) } 
        : item
    ));
    setIsDirty(true);
    closeEditModal();
  };

  const handleSaveAdHoc = async () => {
    if (!adHocState.equipo) return alert("Ingresa un nombre para el equipo.");
    
    const baseData = {
      equipo: adHocState.equipo, 
      tension: adHocState.tension, 
      horas_equipo: adHocState.horas_equipo,
      interno: adHocState.interno, 
      ayudante: adHocState.ayudante, 
      externo: adHocState.externo,
      costo_total_base: adHocState.costo_total_base,
      categoria: adHocState.categoria || 'zona_otros'
    };

    if (adHocState.saveToDb) {
      await addEquipoMaestro(baseData);
      const data = await fetchEquiposMaestros();
      setMaestroData(data);
    }

    setCart(prev => [...prev, {
      id: crypto.randomUUID(),
      tension: adHocState.tension,
      equipo: adHocState.equipo,
      cantidad: 1,
      baseData: structuredClone(baseData),
      overrides: structuredClone({
        is_tercerizado: adHocState.is_tercerizado,
        costo_total_base: adHocState.costo_total_base,
        margen_tercerizado: adHocState.margen_tercerizado,
        costoServiceFee: adHocState.costoServiceFee,
        margenServiceFee: adHocState.margenServiceFee,
        costoAmortizacion: adHocState.costoAmortizacion,
        margenAmortizacion: adHocState.margenAmortizacion,
      })
    }]);

    setIsDirty(true);
    setShowAdHocModal(false);
  };

  const addAlquiler = () => {
    setAlquileres([...alquileres, { id: crypto.randomUUID(), descripcion: '', costo: 0 }]);
    setIsDirty(true);
  };

  const updateAlquiler = (id, field, value) => {
    setAlquileres(alquileres.map(a => a.id === id ? { ...a, [field]: value } : a));
    setIsDirty(true);
  };

  const removeAlquiler = (id) => {
    setAlquileres(alquileres.filter(a => a.id !== id));
    setIsDirty(true);
  };

  // Calculations
  const totalEsfuerzoHoras = cart.reduce((sum, item) => sum + (item.cantidad * (item.overrides?.horas_equipo ?? item.baseData.horas_equipo ?? 0)), 0);

  // Generar Cotización Consolidada para el Motor y el Panel Derecho
  const cotizacionGlobal = {
    Cliente: cliente,
    NombreObra: nombreObra,
    Distancia_Ida_Vuelta_km: distanciaKm,
    Dias_Permitidos_Corte: diasPermitidosCorte,
    Total_Dias_Trabajo: totalEsfuerzoHoras / 8, // Reference for the top level only
    Precio_Mercado_Aplicado: 0,
    Gastos_Imprevistos: gastosImprevistos,
    Margen_Imprevistos_Porcentaje: margenImprevistosPorcentaje,
    logisticsOverrides: logisticsOverrides
  };

  const resultadosCalculados = calcularCotizacionActiva({ ...cotizacionGlobal, equiposCotizados: structuredClone(cart), alquileres: structuredClone(alquileres) });

  const totalCostoTecnico = resultadosCalculados?.Precio_Venta_Final || 0;

  useEffect(() => {
    if (setTotalServicios) {
      setTotalServicios(totalCostoTecnico);
    }
    if (setDetalleServicios) {
      setDetalleServicios(resultadosCalculados?.equiposProcesados || []);
    }
  }, [totalCostoTecnico, resultadosCalculados?.equiposProcesados, setTotalServicios, setDetalleServicios]);

  const handleLoadCotizacion = (quote) => {
    setCart(quote.equiposCotizados || []);
    setAlquileres(quote.alquileres || []);
    setDistanciaKm(quote.distanciaKm || quote.Distancia_Ida_Vuelta_km || 100);
    setDiasPermitidosCorte(quote.diasPermitidosCorte || quote.Dias_Permitidos_Corte || 3);
    setGastosImprevistos(quote.Gastos_Imprevistos || 0);
    setMargenImprevistosPorcentaje(quote.Margen_Imprevistos_Porcentaje || 0);
    setLogisticsOverrides(quote.logisticsOverrides || { enabled: false });
    
    setCliente(quote.Cliente || '');
    setNombreObra(quote.NombreObra || '');
    setIsDirty(false);
  };

  const formatGs = (num) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(num);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px', height: '100vh', background: 'var(--bg-main)' }}>
        <Zap color="#3b82f6" size={48} className="animate-pulse" />
        <h2 style={{ color: '#60a5fa' }}>Verificando credenciales...</h2>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px' }}>
        <Zap color="#3b82f6" size={48} className="animate-pulse" />
        <h2 style={{ color: '#60a5fa' }}>Cargando Catálogo Maestro desde la nube...</h2>
      </div>
    );
  }

  const handleSaveCotizacion = async () => {
    if (!cliente || !nombreObra) return alert("Por favor, ingresa el Cliente y Nombre de la Obra.");
    try {
      await saveCotizacion({
        Cliente: cliente,
        NombreObra: nombreObra,
        distanciaKm,
        diasPermitidosCorte,
        equiposCotizados: cart,
        alquileres: alquileres,
        logisticsOverrides: logisticsOverrides,
        Gastos_Imprevistos: gastosImprevistos,
        Margen_Imprevistos_Porcentaje: margenImprevistosPorcentaje,
        Precio_Venta_Final: resultadosCalculados.Precio_Venta_Final
      });
      setIsDirty(false);
      alert("✅ Cotización guardada exitosamente en la base de datos.");
    } catch (e) {
      alert("Hubo un error al guardar la cotización.");
    }
  };

  return (
    <div className="app-container">
      {editingItem && (() => {
        const item = cart.find(i => i.id === editingItem);
        if (!item) return null;
        return (
          <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter: 'blur(4px)'}}>
            <div className="odoo-card modal-content" style={{width:'700px', maxHeight:'90vh', overflowY:'auto'}}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Edit2 size={24} color="#38bdf8" /> Override de Instancia: {item.equipo}
              </h2>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', color: overrideState.is_tercerizado ? '#a855f7' : '#94a3b8' }}>
                  <input 
                    type="checkbox" 
                    checked={overrideState.is_tercerizado} 
                    onChange={(e) => setOverrideState({...overrideState, is_tercerizado: e.target.checked})} 
                    style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                  />
                  ¿Ítem Tercerizado / Subcontratado?
                </label>
                {overrideState.is_tercerizado && (
                  <p style={{ fontSize: '0.85rem', color: '#a855f7', marginTop: '10px', marginLeft: '25px' }}>
                    Al activar esta opción, los campos de personal operativo y viáticos quedarán anulados (0). El costo ingresado se tomará como un <strong>Flat Rate</strong> (Costo de Subcontratista) que impactará directo al Costo Directo.
                  </p>
                )}
              </div>

              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Variable</th>
                    <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Valor Catálogo</th>
                    <th style={{ padding: '10px', color: 'var(--accent)' }}>Nuevo Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {/* OPERATIVO */}
                  <tr>
                    <td colSpan="3" style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-primary)', background: '#f1f5f9' }}>Métricas Operativas</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px' }}>Horas Equipo</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{item.baseData.horas_equipo ?? 4}</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" step="0.5" value={overrideState.horas_equipo} onChange={(e) => setOverrideState({...overrideState, horas_equipo: parseFloat(e.target.value)||0})} style={{ width: '100px' }} />
                    </td>
                  </tr>
                  {!overrideState.is_tercerizado && (
                    <>
                      <tr>
                        <td style={{ padding: '10px' }}>Especialistas Internos</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{item.baseData?.interno ?? 0}</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" value={overrideState.interno} onChange={(e) => setOverrideState({...overrideState, interno: parseInt(e.target.value)||0})} style={{ width: '100px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px' }}>Auxiliares (Ayudantes)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{item.baseData?.ayudante ?? 0}</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" value={overrideState.ayudante} onChange={(e) => setOverrideState({...overrideState, ayudante: parseInt(e.target.value)||0})} style={{ width: '100px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px' }}>Personal Externo (Local)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{item.baseData?.externo ?? 0}</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" value={overrideState.externo} onChange={(e) => setOverrideState({...overrideState, externo: parseInt(e.target.value)||0})} style={{ width: '100px' }} />
                        </td>
                      </tr>
                    </>
                  )}

                  {/* FINANCIERO */}
                  <tr>
                    <td colSpan="3" style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-primary)', background: '#f1f5f9' }}>Métricas Financieras</td>
                  </tr>
                  {overrideState.is_tercerizado ? (
                    <>
                      <tr>
                        <td style={{ padding: '10px' }}>Costo Subcontratista (Gs)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{formatGs(item.baseData.costo_total_base ?? 0)}</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" value={overrideState.costo_total_base} onChange={(e) => setOverrideState({...overrideState, costo_total_base: parseFloat(e.target.value)||0})} style={{ width: '150px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', color: '#a855f7', fontWeight: 'bold' }}>Margen de Ganancia (%)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>N/A</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" value={overrideState.margen_tercerizado} onChange={(e) => setOverrideState({...overrideState, margen_tercerizado: parseFloat(e.target.value)||0})} style={{ width: '100px', borderColor: '#a855f7' }} />
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td colSpan="3" style={{ padding: '15px 10px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Tecnología: {overrideState.horas_equipo ?? 4}h × Gs. {formatGs(TARIFA_EQUIPOS_HORA).replace('Gs.', '').trim()}</span>
                            <span>{formatGs((overrideState.horas_equipo ?? 4) * TARIFA_EQUIPOS_HORA)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Mano de Obra (Esp): {((overrideState.horas_equipo ?? 4)/8).toFixed(2)}d × {overrideState.interno ?? 1} × Gs. {formatGs(COSTO_ESPECIALISTA_DIA).replace('Gs.', '').trim()}</span>
                            <span>{formatGs(((overrideState.horas_equipo ?? 4)/8) * (overrideState.interno ?? 1) * COSTO_ESPECIALISTA_DIA)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', Math: '8px' }}>
                            <span>Mano de Obra (Aux): {((overrideState.horas_equipo ?? 4)/8).toFixed(2)}d × {overrideState.ayudante ?? 1} × Gs. {formatGs(COSTO_AUXILIAR_DIA).replace('Gs.', '').trim()}</span>
                            <span>{formatGs(((overrideState.horas_equipo ?? 4)/8) * (overrideState.ayudante ?? 1) * COSTO_AUXILIAR_DIA)}</span>
                          </div>
                          {(overrideState.externo > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Mano de Obra (Ext): {((overrideState.horas_equipo ?? 4)/8).toFixed(2)}d × {overrideState.externo} × Gs. {formatGs(COSTO_EXTERNO_DIA).replace('Gs.', '').trim()}</span>
                              <span>{formatGs(((overrideState.horas_equipo ?? 4)/8) * (overrideState.externo) * COSTO_EXTERNO_DIA)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>Costo Técnico Calculado (Gs.)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>
                          {formatGs((item.baseData.horas_equipo ?? 4) * TARIFA_EQUIPOS_HORA + ((item.baseData.horas_equipo ?? 4) / 8) * (item.baseData.interno ?? 1) * COSTO_ESPECIALISTA_DIA + ((item.baseData.horas_equipo ?? 4) / 8) * (item.baseData.ayudante ?? 1) * COSTO_AUXILIAR_DIA)}
                        </td>
                        <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>
                          {formatGs((overrideState.horas_equipo ?? 4) * TARIFA_EQUIPOS_HORA + ((overrideState.horas_equipo ?? 4) / 8) * (overrideState.interno ?? 1) * COSTO_ESPECIALISTA_DIA + ((overrideState.horas_equipo ?? 4) / 8) * (overrideState.ayudante ?? 1) * COSTO_AUXILIAR_DIA)}
                        </td>
                      </tr>
                    </>
                  )}
                  {/* NUEVOS COSTOS FINANCIEROS */}
                  <tr>
                    <td colSpan="3" style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-primary)', background: '#f1f5f9' }}>Costos Adicionales (Opcional)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px' }}>Costo Service Fee (Gs)</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>0</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" value={overrideState.costoServiceFee} onChange={(e) => setOverrideState({...overrideState, costoServiceFee: parseFloat(e.target.value)||0})} style={{ width: '150px' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px' }}>Margen Service Fee (%)</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>0</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" value={overrideState.margenServiceFee} onChange={(e) => setOverrideState({...overrideState, margenServiceFee: parseFloat(e.target.value)||0})} style={{ width: '100px' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px' }}>Costo Amortización (Gs)</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>0</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" value={overrideState.costoAmortizacion} onChange={(e) => setOverrideState({...overrideState, costoAmortizacion: parseFloat(e.target.value)||0})} style={{ width: '150px' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px' }}>Margen Amortización (%)</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>0</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" value={overrideState.margenAmortizacion} onChange={(e) => setOverrideState({...overrideState, margenAmortizacion: parseFloat(e.target.value)||0})} style={{ width: '100px' }} />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={overrideState.top_down_enabled} 
                    onChange={(e) => setOverrideState({...overrideState, top_down_enabled: e.target.checked})} 
                    style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                  />
                  Habilitar Precio Top-Down (Mercado)
                </label>
                {overrideState.top_down_enabled && (
                  <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                        Valor Inyectado Exclusivo (Precio Final de Mercado)
                      </label>
                      <input 
                        type="number" 
                        value={overrideState.valor_inyectado} 
                        onChange={(e) => setOverrideState({...overrideState, valor_inyectado: parseFloat(e.target.value)||0})} 
                        style={{ width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                        placeholder="Ej: 55000000"
                      />
                    </div>
                    <p style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Este valor sobrescribirá el precio final del ítem, calculando la rentabilidad por diferencia (Top-Down).
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button className="remove-btn" onClick={closeEditModal} style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                <button className="primary-btn" onClick={saveOverrides} style={{ background: '#38bdf8' }}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showAdHocModal && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter: 'blur(4px)'}}>
          <div className="odoo-card modal-content" style={{width:'700px', maxHeight:'90vh', overflowY:'auto'}}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <PackagePlus size={24} color="#10b981" /> Añadir Ítem No Contemplado
            </h2>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nombre del Equipo/Servicio</label>
                <input type="text" value={adHocState.equipo} onChange={e => setAdHocState({...adHocState, equipo: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Tensión</label>
                <select value={adHocState.tension} onChange={e => setAdHocState({...adHocState, tension: e.target.value})}>
                  {tensions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'bold', color: adHocState.is_tercerizado ? '#a855f7' : '#94a3b8' }}>
                <input 
                  type="checkbox" 
                  checked={adHocState.is_tercerizado} 
                  onChange={(e) => setAdHocState({...adHocState, is_tercerizado: e.target.checked})} 
                  style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                />
                ¿Ítem Tercerizado / Subcontratado?
              </label>
            </div>

            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '8px' }}>Horas Equipo</td>
                  <td><input type="number" step="0.5" value={adHocState.horas_equipo} onChange={e => setAdHocState({...adHocState, horas_equipo: parseFloat(e.target.value)||0})} /></td>
                </tr>
                {!adHocState.is_tercerizado && (
                  <>
                    <tr><td style={{ padding: '8px' }}>Esp. Internos</td><td><input type="number" value={adHocState.interno} onChange={e => setAdHocState({...adHocState, interno: parseInt(e.target.value)||0})} /></td></tr>
                    <tr><td style={{ padding: '8px' }}>Auxiliares</td><td><input type="number" value={adHocState.ayudante} onChange={e => setAdHocState({...adHocState, ayudante: parseInt(e.target.value)||0})} /></td></tr>
                    <tr><td style={{ padding: '8px' }}>Personal Externo</td><td><input type="number" value={adHocState.externo} onChange={e => setAdHocState({...adHocState, externo: parseInt(e.target.value)||0})} /></td></tr>
                  </>
                )}
                {adHocState.is_tercerizado && (
                  <>
                    <tr>
                      <td style={{ padding: '8px' }}>Costo Subcontratista (Gs)</td>
                      <td><input type="number" value={adHocState.costo_total_base} onChange={e => setAdHocState({...adHocState, costo_total_base: parseFloat(e.target.value)||0})} /></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px', color: '#a855f7' }}>Margen de Ganancia (%)</td>
                      <td><input type="number" value={adHocState.margen_tercerizado} onChange={e => setAdHocState({...adHocState, margen_tercerizado: parseFloat(e.target.value)||0})} style={{ borderColor: '#a855f7' }}/></td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan="2" style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-primary)', background: '#f1f5f9' }}>Costos Adicionales (Opcional)</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Costo Service Fee (Gs)</td>
                  <td><input type="number" value={adHocState.costoServiceFee} onChange={e => setAdHocState({...adHocState, costoServiceFee: parseFloat(e.target.value)||0})} /></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Margen Service Fee (%)</td>
                  <td><input type="number" value={adHocState.margenServiceFee} onChange={e => setAdHocState({...adHocState, margenServiceFee: parseFloat(e.target.value)||0})} /></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Costo Amortización (Gs)</td>
                  <td><input type="number" value={adHocState.costoAmortizacion} onChange={e => setAdHocState({...adHocState, costoAmortizacion: parseFloat(e.target.value)||0})} /></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Margen Amortización (%)</td>
                  <td><input type="number" value={adHocState.margenAmortizacion} onChange={e => setAdHocState({...adHocState, margenAmortizacion: parseFloat(e.target.value)||0})} /></td>
                </tr>
              </tbody>
            </table>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '20px', color: '#34d399' }}>
              <input type="checkbox" checked={adHocState.saveToDb} onChange={e => setAdHocState({...adHocState, saveToDb: e.target.checked})} style={{ marginRight: '10px' }} />
              Guardar en base de datos general (equipos_maestros)
            </label>

            {adHocState.saveToDb && (
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Categoría en Base de Datos</label>
                <select 
                  value={adHocState.categoria} 
                  onChange={e => setAdHocState({...adHocState, categoria: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#ffffff', color: 'var(--text-primary)' }}
                >
                  <option value="zona1_maniobra">Equipos de Maniobra (Patio AT)</option>
                  <option value="zona1_medicion">Equipos de Medición y Protección (Patio AT)</option>
                  <option value="zona2">Transformación de Potencia</option>
                  <option value="zona3">Distribución en Media Tensión</option>
                  <option value="zona_globales">Sistemas Globales (Sala de Control)</option>
                  <option value="zona_otros">Otros Servicios</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="remove-btn" onClick={() => setShowAdHocModal(false)}>Cancelar</button>
              <button className="primary-btn" style={{ background: '#10b981' }} onClick={handleSaveAdHoc}>Agregar al Carrito</button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        
        {/* COLUMNA IZQUIERDA: INPUTS OPERATIVOS */}
        <div className="left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* 1. Datos del Proyecto */}
          <div className="odoo-card" style={{ borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}><FileText size={20} /> Datos del Proyecto</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="primary-btn" 
                  onClick={() => setShowSavedQuotesPanel(true)} 
                  style={{ width: 'auto', padding: '8px 16px', background: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <DatabaseIcon size={16} /> Mis Cotizaciones
                </button>
                <button className="primary-btn" onClick={handleSaveCotizacion} style={{ width: 'auto', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Save size={16} /> Guardar
                </button>
              </div>
            </div>
            
            <div className="config-grid">
              <div className="form-group">
                <label>Cliente / Empresa</label>
                <input type="text" placeholder="Ej: ANDE, Consorcio..." value={cliente} onChange={(e) => { setCliente(e.target.value); setIsDirty(true); }} />
              </div>
              <div className="form-group">
                <label>Nombre del Proyecto</label>
                <input type="text" placeholder="Ej: Ampliación SE Limpio" value={nombreObra} onChange={(e) => { setNombreObra(e.target.value); setIsDirty(true); }} />
              </div>
            </div>
          </div>

          {/* 2. Catálogo y Selección */}
          <div className="odoo-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ margin: 0 }}><Layout size={20} /> Catálogo y Selección</h2>
            </div>
            <div style={{ padding: '20px' }}>
              <UnifilarConfigurator onAddToCart={handleAddToCartFromUnifilar} dbEquipments={maestroData} />
            </div>
          </div>

          {/* 3. Operaciones y Riesgos (Centro de Gastos Indirectos) */}
          <div className="odoo-card">
            <h2 style={{ marginBottom: '15px' }}><ShieldAlert size={20} /> Centro de Control de Gastos Indirectos</h2>
            
            {/* Parámetros Básicos */}
            <div className="config-grid" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label>Distancia ida/vuelta (km)</label>
                <input type="number" min="0" value={distanciaKm} onChange={(e) => { setDistanciaKm(parseFloat(e.target.value) || 0); setIsDirty(true); }} />
              </div>
              <div className="form-group">
                <label>Días Permitidos (Corte)</label>
                <input type="number" min="1" value={diasPermitidosCorte} onChange={(e) => { setDiasPermitidosCorte(parseInt(e.target.value) || 1); setIsDirty(true); }} />
              </div>
            </div>

            {/* Modal Logistico Button */}
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Auditoría Logística y RRHH</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ajusta viáticos, hospedaje y movilidad</span>
              </div>
              <button 
                className="primary-btn" 
                onClick={() => setShowLogisticsModal(true)} 
                style={{ width: 'auto', padding: '8px 16px', background: logisticsOverrides?.enabled ? '#10b981' : 'var(--accent)' }}
              >
                <Settings size={16} /> Configuración {logisticsOverrides?.enabled ? '(Manual)' : '(Auto)'}
              </button>
            </div>

            {/* Alquileres Especiales */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Servicios de Apoyo y Alquileres (Grúas, Fletes)</label>
              {alquileres.map((alq) => (
                <div key={alq.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input type="text" placeholder="Descripción" value={alq.descripcion} onChange={e => updateAlquiler(alq.id, 'descripcion', e.target.value)} style={{ flex: 2 }} />
                  <input type="number" placeholder="Costo (Gs)" value={alq.costo} onChange={e => updateAlquiler(alq.id, 'costo', parseFloat(e.target.value) || 0)} style={{ flex: 1 }} />
                  <button className="remove-btn" onClick={() => removeAlquiler(alq.id)}><Trash2 size={18}/></button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button className="primary-btn" onClick={addAlquiler} style={{ width: 'auto', padding: '6px 12px', background: '#64748b' }}><Plus size={16} /> Agregar</button>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Total: {formatGs(alquileres.reduce((sum, a) => sum + a.costo, 0))}</span>
              </div>
            </div>

            {/* Imprevistos */}
            <div className="config-grid">
              <div className="form-group">
                <label>Gastos Imprevistos Fijos (Gs.)</label>
                <input type="number" min="0" value={gastosImprevistos} onChange={(e) => { setGastosImprevistos(parseFloat(e.target.value) || 0); setIsDirty(true); }} />
              </div>
              <div className="form-group">
                <label>Margen Adicional Imprevistos (%)</label>
                <input type="number" min="0" value={margenImprevistosPorcentaje} onChange={(e) => { setMargenImprevistosPorcentaje(parseFloat(e.target.value) || 0); setIsDirty(true); }} />
              </div>
            </div>

          </div>
        </div>

        {/* COLUMNA DERECHA: OUTPUTS FINANCIEROS */}
        <div className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Carrito Técnico */}
          <div className="odoo-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}><Calculator size={20} /> Carrito Técnico</h2>
              <button className="primary-btn" onClick={() => setShowAdHocModal(true)} style={{ width: 'auto', padding: '8px 16px', background: '#10b981' }}>
                <PackagePlus size={16} /> Ítem Ad-Hoc
              </button>
            </div>
            
            <div style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: '5px' }}>
              {resultadosCalculados.equiposProcesados.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <PackagePlus size={32} color="#94a3b8" style={{ marginBottom: '10px' }} />
                  <p style={{ color: 'var(--text-secondary)', margin: 0 }}>El carrito está vacío. Agrega equipos desde el catálogo.</p>
                </div>
              ) : (
                resultadosCalculados.equiposProcesados.map(item => (
                  <div key={item.id} className="cart-item" style={{ borderLeft: `4px solid ${item.overrides?.is_tercerizado ? '#a855f7' : 'var(--accent)'}`, background: '#ffffff', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', marginBottom: '0', borderRadius: '0' }}>
                    <div className="cart-item-details" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                        <input 
                          type="number" 
                          value={item.cantidad} 
                          min="1"
                          onChange={(e) => updateQuantity(item.id, e.target.value)}
                          style={{ width: '60px', padding: '6px', borderRadius: '4px' }}
                        />
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                          x {item.equipo}
                          {item.overrides && item.overrides.is_tercerizado && (
                            <span style={{ fontSize: '0.7rem', background: '#a855f7', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Tercerizado</span>
                          )}
                          {item.overrides && item.overrides.top_down_enabled && (
                            <span style={{ fontSize: '0.7rem', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Top-Down</span>
                          )}
                          {isItemModified(item) && (
                            <span style={{ fontSize: '0.7rem', background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>Modificado</span>
                          )}
                        </h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{item.tension} <span style={{ color: 'var(--border-color)', margin: '0 8px' }}>|</span> {item.overrides?.is_tercerizado ? 'Costo Subcontratista' : 'Costo Directo Total'}: {formatGs(item.costo_directo_unitario)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="cart-item-price" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatGs(item.precio_total_final)}</span>
                      <button className="primary-btn" onClick={() => openEditModal(item)} style={{ padding: '8px', width: 'auto', background: '#f8fafc', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }} title="Editar Variables Base">
                        <Edit2 size={16} />
                      </button>
                      <button className="remove-btn" onClick={() => removeItem(item.id)} style={{ padding: '8px', borderRadius: '6px' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CRM Financial Panel */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <CRMFinancialPanelV2 
              resultados={resultadosCalculados} 
              cotizacion={cotizacionGlobal} 
              equiposCotizados={resultadosCalculados.equiposProcesados} 
              alquileres={alquileres} 
            />
          </div>

        </div>
      </main>

      <LogisticsModal 
        isOpen={showLogisticsModal} 
        onClose={() => setShowLogisticsModal(false)} 
        resultados={resultadosCalculados}
        currentOverrides={logisticsOverrides}
        onSave={(newOverrides) => { setLogisticsOverrides(newOverrides); setIsDirty(true); }}
      />

      <SavedQuotesPanel 
        isOpen={showSavedQuotesPanel}
        onClose={() => setShowSavedQuotesPanel(false)}
        onLoadQuote={handleLoadCotizacion}
      />

      {showUnsavedChangesModal && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter: 'blur(4px)'}}>
          <div className="odoo-card modal-content" style={{width:'500px', padding: '30px', textAlign: 'center'}}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '15px' }}>Cambios sin guardar</h3>
            <p style={{ color: 'var(--text-primary)', marginBottom: '25px' }}>
              Tienes cambios sin guardar en la cotización actual. ¿Deseas guardar la cotización actual antes de crear una nueva?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="primary-btn" 
                onClick={async () => {
                  if (!cliente || !nombreObra) {
                    alert("Por favor, ingresa el Cliente y Nombre de la Obra para poder guardar.");
                    return;
                  }
                  await handleSaveCotizacion();
                  setShowUnsavedChangesModal(false);
                  resetQuote();
                }}
                style={{ background: '#10b981' }}
              >
                Guardar y Crear Nueva
              </button>
              <button 
                className="primary-btn" 
                onClick={() => {
                  setShowUnsavedChangesModal(false);
                  resetQuote();
                }}
                style={{ background: '#ef4444' }}
              >
                Descartar cambios y Crear Nueva
              </button>
              <button 
                className="remove-btn" 
                onClick={() => setShowUnsavedChangesModal(false)}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Bloque2_SSTT;
