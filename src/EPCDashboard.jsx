import React, { useState, useEffect, useRef } from 'react';
import Bloque0_Setup from './Bloque0_Setup';
import Bloque1_Procura from './Bloque1_Procura';
import Bloque2_SSTT from './Bloque2_SSTT';
import Bloque3_Resumen from './Bloque3_Resumen';
import SavedQuotesPanel from './SavedQuotesPanel';
import ZunzCopilot from './ZunzCopilot';
import { upsertCotizacionV2 } from './services/dbService';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './Login';
import { 
  Zap, 
  Building2, 
  Briefcase, 
  Layers, 
  ShoppingCart, 
  Wrench, 
  ShieldCheck, 
  ChevronRight, 
  Package, 
  Sliders, 
  Lock, 
  TrendingUp, 
  Sun, 
  Truck, 
  Boxes,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function EPCDashboard() {
  const copilotRef = useRef(null);

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

  // Estado Global V2
  const [perfilComercial, setPerfilComercial] = useState('b2b'); // 'b2b' vs 'epc'
  const [rubro, setRubro] = useState('subestaciones'); // 'subestaciones', 'solar', 'movilidad'
  const [activeBlock, setActiveBlock] = useState(1); // Bloque activo para la secuencia (1, 2, 3)

  // ESTADOS GLOBALES CONSOLIDADOS (Single Source of Truth — FASE 1)
  const [totalProcura, setTotalProcura] = useState(0);
  const [totalServicios, setTotalServicios] = useState(0);

  // FUENTE DE VERDAD: Array completo de equipos de Procura (elevado desde Bloque1)
  const [equiposProcura, setEquiposProcura] = useState(() => [{
    id: crypto.randomUUID(),
    nombre: 'Transformador de Potencia 80 MVA 220/23 kV',
    cantidad: 1,
    costoBase: 450000,
    modalidad: 'FOB/EXW',
    ncm: '8504.23.00',
    porcentajeArancel: undefined,
    valorFlete: undefined,
    porcentajeSeguro: undefined,
    porcentajeDespacho: undefined,
    aplicarFleteLocal: true,
    montoFleteLocal: 3500,
    porcentajeFinanciero: undefined,
    porcentajeAdmin: undefined,
    margenPorcentaje: undefined
  }]);

  // Variables globales de costo de procura (elevado desde Bloque1)
  const [procuraDefaults, setProcuraDefaults] = useState({
    fleteBase: 5,
    seguroBase: 2,
    despachoBase: 6,
    financieroBase: 3,
    adminBase: 3,
    arancelBase: 0,
    margenBase: 30
  });

  const [detalleServicios, setDetalleServicios] = useState([]);

  // FUENTE DE VERDAD: Estados de Servicios SSTT (elevado desde Bloque2 — FASE 2)
  const [cartServicios, setCartServicios] = useState([]);
  const [alquileresServicios, setAlquileresServicios] = useState([]);
  const [distanciaKm, setDistanciaKm] = useState(100);
  const [diasPermitidosCorte, setDiasPermitidosCorte] = useState(3);
  const [gastosImprevistos, setGastosImprevistos] = useState(0);
  const [margenImprevistosPorcentaje, setMargenImprevistosPorcentaje] = useState(0);
  const [condicionTrabajo, setCondicionTrabajo] = useState(1.0);

  // Estado Global Bloque 0
  const [nombreCliente, setNombreCliente] = useState('');
  const [nombreProyecto, setNombreProyecto] = useState('');
  const [monedaTrabajo, setMonedaTrabajo] = useState('USD'); // 'USD' vs 'PYG'
  const [tipoCambioCompra, setTipoCambioCompra] = useState(7400);
  const [tipoCambioVenta, setTipoCambioVenta] = useState(7500);
  const [cotizacionId, setCotizacionId] = useState(null);
  
  // Estado de guardado y Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isSaving, setIsSaving] = useState(false);

  // Estado del panel de cotizaciones guardadas
  const [showSavedQuotesPanel, setShowSavedQuotesPanel] = useState(false);

  // Estado Colapsable UX TDAH
  const [isBloque0Open, setIsBloque0Open] = useState(true);

  // Auto-colapsar Bloque 0 al avanzar a otros bloques
  useEffect(() => {
    if (activeBlock > 1) {
      setIsBloque0Open(false);
    }
  }, [activeBlock]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const guardarCotizacionMaestra = async () => {
    if (!nombreCliente.trim() || !nombreProyecto.trim()) {
      showToast('Por favor, ingresa el Cliente y Nombre del Proyecto en el Bloque 0.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const dataToSave = {
        datosGenerales: {
          nombreCliente,
          nombreProyecto,
          monedaTrabajo,
          tipoCambioCompra,
          tipoCambioVenta
        },
        detalleProcura: equiposProcura,
        detalleServicios,
        // DATOS ELEVADOS FASE 2
        serviciosSST: {
          cart: cartServicios,
          alquileres: alquileresServicios,
          distanciaKm,
          diasPermitidosCorte,
          gastosImprevistos,
          margenImprevistosPorcentaje,
          condicionTrabajo
        },
        totales: {
          totalProcura,
          totalServicios,
          granTotalGs: (totalProcura * tipoCambioVenta) + totalServicios,
          granTotalUSD: totalProcura + (totalServicios / tipoCambioVenta)
        }
      };

      const returnedId = await upsertCotizacionV2(cotizacionId, dataToSave);
      setCotizacionId(returnedId);
      showToast(cotizacionId ? 'Borrador actualizado con éxito' : 'Borrador guardado exitosamente');
      if (copilotRef.current) {
        copilotRef.current.celebrarExito('¡Guardado impecable! Cotización asegurada en la DB.');
      }
    } catch (error) {
      console.error(error);
      showToast('Error al intentar guardar la cotización.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // FASE 3: REHIDRATACIÓN COMPLETA — Inyecta una cotización guardada en todos los estados centralizados
  const handleLoadCotizacionV2 = (quote) => {
    // --- Datos Generales (Bloque 0) ---
    const dg = quote.datosGenerales || {};
    setNombreCliente(dg.nombreCliente || quote.Cliente || '');
    setNombreProyecto(dg.nombreProyecto || quote.NombreObra || '');
    setMonedaTrabajo(dg.monedaTrabajo || 'USD');
    setTipoCambioCompra(dg.tipoCambioCompra || 7400);
    setTipoCambioVenta(dg.tipoCambioVenta || 7500);

    // --- Procura (Bloque 1) — Elevado en FASE 1 ---
    if (Array.isArray(quote.detalleProcura) && quote.detalleProcura.length > 0) {
      setEquiposProcura(quote.detalleProcura);
    }

    // --- Servicios SSTT (Bloque 2) — Elevado en FASE 2 ---
    const sstt = quote.serviciosSST || {};
    if (Array.isArray(sstt.cart) && sstt.cart.length > 0) {
      setCartServicios(sstt.cart);
    }
    if (Array.isArray(sstt.alquileres)) {
      setAlquileresServicios(sstt.alquileres);
    }
    setDistanciaKm(sstt.distanciaKm ?? 100);
    setDiasPermitidosCorte(sstt.diasPermitidosCorte ?? 3);
    setGastosImprevistos(sstt.gastosImprevistos ?? 0);
    setMargenImprevistosPorcentaje(sstt.margenImprevistosPorcentaje ?? 0);
    setCondicionTrabajo(sstt.condicionTrabajo ?? 1.0);

    // Restaurar el ID para que el próximo guardado haga UPDATE, no INSERT
    setCotizacionId(quote.id || null);

    // Navegar al Bloque 1 para que el usuario vea el estado cargado
    setActiveBlock(1);
    setShowSavedQuotesPanel(false);
    showToast(`✅ Cotización "${dg.nombreProyecto || quote.NombreObra || 'Sin nombre'}" cargada.`);
  };

  // Nombres descriptivos para la UI
  const perfiles = {
    b2b: { title: 'Suministro Privado B2B', badge: 'B2B Private', color: '#3b82f6', desc: 'Cotización orientada a venta directa de suministros y proyectos privados sin burocracia licitatoria.' },
    epc: { title: 'Licitación Corporativa / EPC', badge: 'Corporate EPC', color: '#8b5cf6', desc: 'Llave en mano integral para grandes cuentas, pliegos públicos y estructuras de contingencia avanzada.' }
  };

  const rubros = {
    subestaciones: { name: 'Subestaciones de Potencia AT/MT', icon: Zap, detail: 'Transformación, Celdas GIS/Metalclad y Patios de Maniobra' },
    solar: { name: 'Parques Fotovoltaicos / Solar', icon: Sun, detail: 'Inversores centralizados, campos de paneles y BESS' },
    movilidad: { name: 'Movilidad Eléctrica / Infraestructura EV', icon: Truck, detail: 'Electrolineras de carga rápida y subestaciones dedicadas' }
  };

  const RubroIcon = rubros[rubro].icon;

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px', height: '100vh', background: '#0f172a', color: '#ffffff' }}>
        <Zap color="#3b82f6" size={48} className="animate-pulse" />
        <h2>Verificando credenciales...</h2>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      
      {/* 1. CABECERA MAESTRA CON CONTROLES GLOBALMENTE SINCRONIZADOS */}
      <header className="header" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        padding: '20px 40px', 
        background: '#ffffff', 
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <Zap color="#2563eb" size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Módulo EPC Integrado</h1>
                <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>V2 SPA</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Consolidador Maestro Procura + Servicios SSTT + Matriz de Riesgos</p>
            </div>
          </div>

          {/* SELECTOR DE RUBRO + ACCIONES GLOBALES */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            {/* Selector de rubro */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Boxes size={18} color="#475569" />
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rubro / Sector:</label>
              <select 
                value={rubro} 
                onChange={(e) => setRubro(e.target.value)}
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  fontWeight: 700, 
                  color: '#0f172a', 
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  outline: 'none',
                  padding: '4px 8px'
                }}
              >
                <option value="subestaciones">Subestaciones de Potencia AT/MT</option>
                <option value="solar">Parques Fotovoltaicos / Solar</option>
                <option value="movilidad">Movilidad Eléctrica / Electrolineras</option>
              </select>
            </div>

            {/* Botón Guardar global persistente (Fast Save) */}
            <button
              onClick={guardarCotizacionMaestra}
              disabled={isSaving}
              style={{
                border: 'none',
                background: isSaving ? '#94a3b8' : '#10b981',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isSaving ? 'none' : '0 4px 14px rgba(16,185,129,0.4)',
                transition: 'all 0.2s',
                transform: isSaving ? 'scale(0.98)' : 'scale(1)'
              }}
              onMouseEnter={e => !isSaving && (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => !isSaving && (e.currentTarget.style.transform = 'scale(1)')}
            >
              💾 {isSaving ? 'Guardando...' : 'Guardar Cotización'}
            </button>

            {/* Botón Mis Cotizaciones */}
            <button
              onClick={() => setShowSavedQuotesPanel(true)}
              style={{
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              📂 Mis Cotizaciones
            </button>

          </div>
        </div>

        {/* SWITCH INTERACTIVO DE PERFIL COMERCIAL */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: '#f8fafc', 
          padding: '12px 20px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={20} color={perfiles[perfilComercial].color} />
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Perfil Comercial Seleccionado: <span style={{ color: perfiles[perfilComercial].color }}>{perfiles[perfilComercial].title}</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{perfiles[perfilComercial].desc}</span>
            </div>
          </div>

          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '25px', padding: '4px' }}>
            <button 
              onClick={() => setPerfilComercial('b2b')}
              style={{
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: perfilComercial === 'b2b' ? '#3b82f6' : 'transparent',
                color: perfilComercial === 'b2b' ? '#ffffff' : '#475569',
                boxShadow: perfilComercial === 'b2b' ? '0 2px 4px rgba(59,130,246,0.3)' : 'none'
              }}
            >
              🏢 Suministro Privado B2B
            </button>
            <button 
              onClick={() => setPerfilComercial('epc')}
              style={{
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: perfilComercial === 'epc' ? '#8b5cf6' : 'transparent',
                color: perfilComercial === 'epc' ? '#ffffff' : '#475569',
                boxShadow: perfilComercial === 'epc' ? '0 2px 4px rgba(139,92,246,0.3)' : 'none'
              }}
            >
              🏛️ Licitación Corporativa / EPC
            </button>
          </div>
        </div>

      </header>

      {/* 2. BARRA DE NAVEGACIÓN SECUENCIAL (STEPPER DE 3 BLOQUES) */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 40px' }}>
        <div style={{ display: 'flex', gap: '15px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {[
            { id: 1, title: 'Bloque 1: Procura & Landed Cost', subtitle: 'Equipos principales e Importación', icon: ShoppingCart },
            { id: 2, title: 'Bloque 2: Servicios & SSTT', subtitle: 'Encapsulamiento Motor V1', icon: Wrench },
            { id: 3, title: 'Bloque 3: Consolidación & Riesgos', subtitle: 'Margen EPC, Imprevistos y Garantías', icon: ShieldCheck }
          ].map((block) => {
            const Icon = block.icon;
            const isActive = activeBlock === block.id;
            return (
              <div 
                key={block.id} 
                onClick={() => setActiveBlock(block.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isActive ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isActive ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  background: isActive ? '#2563eb' : '#cbd5e1', 
                  color: '#ffffff', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {block.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? '#1e40af' : '#334155' }}>{block.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{block.subtitle}</div>
                </div>
                <Icon size={20} color={isActive ? '#2563eb' : '#94a3b8'} />
              </div>
            );
          })}

        </div>
      </div>

      {/* 3. ÁREA PRINCIPAL CON RENDERIZADO SECUENCIAL DE LOS 3 BLOQUES */}
      <main style={{ padding: '30px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1 }}>
        
        {/* PASO 1: CONFIGURACIÓN Y PROCURA */}
        {activeBlock === 1 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* BLOQUE 0: SETUP */}
            <div className="odoo-card" style={{ borderTop: '4px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                  <Sliders size={20} color="#475569" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 700 }}>
                  Configuración General del Proyecto
                </h2>
              </div>
              <Bloque0_Setup
                nombreCliente={nombreCliente}
                setNombreCliente={setNombreCliente}
                nombreProyecto={nombreProyecto}
                setNombreProyecto={setNombreProyecto}
                monedaTrabajo={monedaTrabajo}
                setMonedaTrabajo={setMonedaTrabajo}
                tipoCambioCompra={tipoCambioCompra}
                setTipoCambioCompra={setTipoCambioCompra}
                tipoCambioVenta={tipoCambioVenta}
                setTipoCambioVenta={setTipoCambioVenta}
              />
            </div>
            
            {/* BANNER INFORMATIVO DE SECTOR */}
            <div className="odoo-card" style={{ borderLeft: '4px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <RubroIcon size={28} color="#2563eb" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Sector Activo: {rubros[rubro].name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{rubros[rubro].detail}</p>
                </div>
              </div>
              <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                Modo: {perfiles[perfilComercial].badge}
              </span>
            </div>

            {/* BLOQUE 1: PROCURA */}
            <Bloque1_Procura 
              equipos={equiposProcura}
              setEquipos={setEquiposProcura}
              defaults={procuraDefaults}
              setDefaults={setProcuraDefaults}
              setTotalProcura={setTotalProcura}
              tipoCambio={tipoCambioVenta} 
              setTipoCambio={setTipoCambioVenta} 
              monedaTrabajo={monedaTrabajo}
              onGuardar={guardarCotizacionMaestra}
              isSaving={isSaving}
            />

            {/* NAVEGACIÓN PASO 1 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                className="primary-btn animate-fade-in" 
                onClick={() => setActiveBlock(2)}
                style={{ width: 'auto', padding: '12px 28px', background: '#2563eb', fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
              >
                Siguiente: Servicios Técnicos (SSTT) <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: SERVICIOS Y SSTT */}
        {activeBlock === 2 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="odoo-card" style={{ 
              background: '#ffffff', 
              border: '2px solid #3b82f6', 
              boxShadow: '0 10px 25px -5px rgba(59,130,246,0.1)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ color: '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench color="#2563eb" size={24} /> Bloque 2: Servicios Especializados & SSTT
                </h2>
                <span style={{ 
                  background: '#dbeafe', 
                  color: '#1e40af', 
                  padding: '6px 14px', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #bfdbfe'
                }}>
                  ⚡ Suite V1 Activa
                </span>
              </div>
              
              <div style={{ margin: '20px 0' }}>
                <Bloque2_SSTT 
                  cart={cartServicios}
                  setCart={setCartServicios}
                  alquileres={alquileresServicios}
                  setAlquileres={setAlquileresServicios}
                  distanciaKm={distanciaKm}
                  setDistanciaKm={setDistanciaKm}
                  diasPermitidosCorte={diasPermitidosCorte}
                  setDiasPermitidosCorte={setDiasPermitidosCorte}
                  gastosImprevistos={gastosImprevistos}
                  setGastosImprevistos={setGastosImprevistos}
                  margenImprevistosPorcentaje={margenImprevistosPorcentaje}
                  setMargenImprevistosPorcentaje={setMargenImprevistosPorcentaje}
                  condicionTrabajo={condicionTrabajo}
                  setCondicionTrabajo={setCondicionTrabajo}
                  setTotalServicios={setTotalServicios} 
                  setDetalleServicios={setDetalleServicios} 
                  monedaTrabajo={monedaTrabajo}
                  tipoCambio={tipoCambioVenta}
                  nombreCliente={nombreCliente}
                  nombreProyecto={nombreProyecto}
                  onGuardar={guardarCotizacionMaestra}
                  isSaving={isSaving}
                />
              </div>

              {/* NAVEGACIÓN PASO 2 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <button 
                  onClick={() => setActiveBlock(1)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.95rem' }}
                >
                  ← Atrás (Procura)
                </button>
                <button 
                  className="primary-btn" 
                  onClick={() => setActiveBlock(3)}
                  style={{ width: 'auto', padding: '12px 28px', background: '#2563eb', fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
                >
                  Siguiente: Resumen de Cotización <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: CONSOLIDACIÓN Y EXPORTACIÓN */}
        {activeBlock === 3 && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Bloque3_Resumen 
              totalProcura={totalProcura} 
              totalServicios={totalServicios} 
              detalleProcura={equiposProcura}
              detalleServicios={detalleServicios}
              tipoCambio={tipoCambioVenta}
              monedaTrabajo={monedaTrabajo}
              onGuardar={guardarCotizacionMaestra}
              isSaving={isSaving}
              copilotRef={copilotRef}
            />
            
            {/* NAVEGACIÓN PASO 3 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button 
                onClick={() => setActiveBlock(2)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.95rem' }}
              >
                ← Atrás (Servicios Técnicos)
              </button>
              <button 
                className="primary-btn" 
                onClick={guardarCotizacionMaestra}
                disabled={isSaving}
                style={{ 
                  width: 'auto', 
                  padding: '12px 30px', 
                  background: '#10b981', 
                  fontSize: '1.05rem', 
                  boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                💾 {isSaving ? 'Guardando...' : 'Finalizar y Guardar Cotización'}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* PANEL LATERAL DE COTIZACIONES GUARDADAS */}
      <SavedQuotesPanel
        isOpen={showSavedQuotesPanel}
        onClose={() => setShowSavedQuotesPanel(false)}
        onLoadQuote={handleLoadCotizacionV2}
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '25px',
          right: '25px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '14px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 9999,
          fontWeight: 700,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      {/* COMPONENTE ZUNZ COPILOT (ADHD UX) */}
      <ZunzCopilot ref={copilotRef} activeBlock={activeBlock} />

    </div>
  );
}
