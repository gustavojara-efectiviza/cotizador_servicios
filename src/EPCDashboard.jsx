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
  ChevronUp,
  Copy,
  RotateCcw,
  Save,
  Folder,
  FlaskConical,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function EPCDashboard({ version = 'v2', onSwitchVersion, onOpenLab }) {
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

  // ESTADOS GLOBALES CONSOLIDADOS (Single Source of Truth)
  const [totalProcura, setTotalProcura] = useState(0);
  const [totalServicios, setTotalServicios] = useState(0);

  // FUENTE DE VERDAD: Array completo de equipos de Procura (elevado desde Bloque1)
  const [equiposProcura, setEquiposProcura] = useState([]);

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
  const [resultadosSSTT, setResultadosSSTT] = useState(null);

  // FUENTE DE VERDAD: Estados de Servicios SSTT (elevado desde Bloque2)
  const [cartServicios, setCartServicios] = useState([]);
  const [alquileresServicios, setAlquileresServicios] = useState([]);
  const [distanciaKm, setDistanciaKm] = useState(100);
  const [diasPermitidosCorte, setDiasPermitidosCorte] = useState(3);
  const [gastosImprevistos, setGastosImprevistos] = useState(0);
  const [margenImprevistosPorcentaje, setMargenImprevistosPorcentaje] = useState(0);
  const [condicionTrabajo, setCondicionTrabajo] = useState(1.0);
  const [aplicarGastosIndirectos, setAplicarGastosIndirectos] = useState(true);
  const [aplicarSSMAProvision, setAplicarSSMAProvision] = useState(true);
  const [porcentajeSSMAProvision, setPorcentajeSSMAProvision] = useState(5);
  const [gastosAdminFinancieroPct, setGastosAdminFinancieroPct] = useState(6);
  const [logisticsOverrides, setLogisticsOverrides] = useState({ enabled: false });

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

  // Estado Colapsable UX TDAH para Bloque 0
  const [isBloque0Open, setIsBloque0Open] = useState(false);

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
      setIsBloque0Open(true);
      showToast('Por favor, ingresa el Cliente y Nombre del Proyecto en los Datos Generales.', 'error');
      return;
    }
    if (!tipoCambioVenta || Number(tipoCambioVenta) <= 0) {
      setIsBloque0Open(true);
      showToast('El tipo de cambio USD/PYG no puede ser 0. Verificá los Datos Generales.', 'error');
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
        serviciosSST: {
          cart: cartServicios,
          alquileres: alquileresServicios,
          distanciaKm,
          diasPermitidosCorte,
          gastosImprevistos,
          margenImprevistosPorcentaje,
          condicionTrabajo,
          aplicarGastosIndirectos,
          aplicarSSMAProvision,
          porcentajeSSMAProvision,
          gastosAdminFinancieroPct,
          logisticsOverrides
        },
        totales: {
          totalProcura,
          totalServicios,
          granTotalGs: (totalProcura * tipoCambioVenta) + totalServicios,
          granTotalUSD: totalProcura + (totalServicios / tipoCambioVenta)
        },
        tipoCambioSnapshot: {
          compra: tipoCambioCompra,
          venta: tipoCambioVenta,
          fechaSnapshot: new Date().toISOString()
        }
      };

      const returnedId = await upsertCotizacionV2(cotizacionId, dataToSave);
      setCotizacionId(returnedId);
      showToast(cotizacionId ? 'Oferta actualizada con éxito' : 'Cotización guardada exitosamente');
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

  const guardarComoCopia = async () => {
    if (!nombreCliente.trim() || !nombreProyecto.trim()) {
      setIsBloque0Open(true);
      showToast('Por favor, ingresa el Cliente y Nombre del Proyecto en los Datos Generales.', 'error');
      return;
    }
    if (!tipoCambioVenta || Number(tipoCambioVenta) <= 0) {
      setIsBloque0Open(true);
      showToast('El tipo de cambio USD/PYG no puede ser 0. Verificá los Datos Generales.', 'error');
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
        serviciosSST: {
          cart: cartServicios,
          alquileres: alquileresServicios,
          distanciaKm,
          diasPermitidosCorte,
          gastosImprevistos,
          margenImprevistosPorcentaje,
          condicionTrabajo,
          aplicarGastosIndirectos,
          aplicarSSMAProvision,
          porcentajeSSMAProvision,
          logisticsOverrides
        },
        totales: {
          totalProcura,
          totalServicios,
          granTotalGs: (totalProcura * tipoCambioVenta) + totalServicios,
          granTotalUSD: totalProcura + (totalServicios / tipoCambioVenta)
        },
        tipoCambioSnapshot: {
          compra: tipoCambioCompra,
          venta: tipoCambioVenta,
          fechaSnapshot: new Date().toISOString()
        }
      };

      const newId = await upsertCotizacionV2(null, dataToSave);
      setCotizacionId(newId);
      showToast(`¡Copia independiente guardada! (ID: ${newId.slice(0, 8)}...)`, 'success');
      if (copilotRef.current) {
        copilotRef.current.celebrarExito('¡Copia duplicada y guardada exitosamente!');
      }
    } catch (error) {
      console.error(error);
      showToast('Error al intentar guardar la copia.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Rehidratación completa de cotizaciones
  const handleLoadCotizacionV2 = (quote) => {
    const dg = quote.datosGenerales || {};
    setNombreCliente(dg.nombreCliente || quote.Cliente || '');
    setNombreProyecto(dg.nombreProyecto || quote.NombreObra || '');
    setMonedaTrabajo(dg.monedaTrabajo || 'USD');
    setTipoCambioCompra(dg.tipoCambioCompra || 7400);
    setTipoCambioVenta(dg.tipoCambioVenta || 7500);

    const procuraList = quote.detalleProcura || quote.equiposProcura || quote.procura || [];
    setEquiposProcura(Array.isArray(procuraList) ? procuraList : []);

    const sstt = quote.serviciosSST || {};
    const cartList = sstt.cart || quote.cart || quote.equiposCotizados || quote.detalleServicios || quote.servicios || [];
    setCartServicios(Array.isArray(cartList) ? cartList : []);

    const alqList = sstt.alquileres || quote.alquileres || [];
    setAlquileresServicios(Array.isArray(alqList) ? alqList : []);

    setDistanciaKm(sstt.distanciaKm ?? quote.Distancia_Ida_Vuelta_km ?? 100);
    setDiasPermitidosCorte(sstt.diasPermitidosCorte ?? quote.Dias_Permitidos_Corte ?? 3);
    setGastosImprevistos(sstt.gastosImprevistos ?? quote.Gastos_Imprevistos ?? 0);
    setMargenImprevistosPorcentaje(sstt.margenImprevistosPorcentaje ?? quote.Margen_Imprevistos_Porcentaje ?? 0);
    setCondicionTrabajo(sstt.condicionTrabajo ?? quote.condicionTrabajo ?? 1.0);
    setAplicarGastosIndirectos(sstt.aplicarGastosIndirectos !== undefined ? sstt.aplicarGastosIndirectos : (quote.aplicarGastosIndirectos ?? true));
    setAplicarSSMAProvision(sstt.aplicarSSMAProvision !== undefined ? sstt.aplicarSSMAProvision : (quote.aplicarSSMAProvision ?? true));
    setPorcentajeSSMAProvision(sstt.porcentajeSSMAProvision ?? quote.porcentajeSSMAProvision ?? 5);
    setGastosAdminFinancieroPct(sstt.gastosAdminFinancieroPct ?? quote.gastosAdminFinancieroPct ?? 6);
    setLogisticsOverrides(sstt.logisticsOverrides ?? quote.logisticsOverrides ?? { enabled: false });

    setCotizacionId(quote.id || null);
    setActiveBlock(1);
    setIsBloque0Open(false);
    setShowSavedQuotesPanel(false);
    showToast(`Cotización "${dg.nombreProyecto || quote.NombreObra || 'Sin nombre'}" cargada.`);
  };

  const nuevaCotizacion = () => {
    setCotizacionId(null);
    setNombreCliente('');
    setNombreProyecto('');
    setEquiposProcura([]);
    setCartServicios([]);
    setAlquileresServicios([]);
    setGastosImprevistos(0);
    setMargenImprevistosPorcentaje(0);
    setDistanciaKm(100);
    setDiasPermitidosCorte(3);
    setCondicionTrabajo(1.0);
    setAplicarGastosIndirectos(true);
    setAplicarSSMAProvision(true);
    setPorcentajeSSMAProvision(5);
    setGastosAdminFinancieroPct(6);
    setLogisticsOverrides({ enabled: false });
    setTotalProcura(0);
    setTotalServicios(0);
    setActiveBlock(1);
    setIsBloque0Open(true);
    showToast('Nueva cotización en blanco iniciada.');
  };

  const rubros = {
    subestaciones: { name: 'Subestaciones', icon: Zap },
    solar: { name: 'Solar / FV', icon: Sun },
    movilidad: { name: 'Movilidad EV', icon: Truck }
  };

  const RubroIcon = rubros[rubro].icon;

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-screen bg-[#090d16] text-white font-sans">
        <Zap color="#3b82f6" size={48} className="animate-pulse" />
        <h2 className="text-sm font-semibold text-slate-300">Verificando credenciales...</h2>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* ========================================================================= */}
      {/* 1. EL HEADER MAESTRO (BARRA OSCURA, MATE Y PLANA — VERCEL/LINEAR STYLE) */}
      {/* ========================================================================= */}
      <header className="h-16 w-full bg-[#090d16] border-b border-slate-800 px-6 flex items-center justify-between select-none z-50 sticky top-0">
        
        {/* [ ZONA IZQUIERDA: MARCA Y CONTEXTO ] */}
        <div className="flex items-center gap-4 shrink-0">
          
          {/* Logo & Marca */}
          <div className="flex items-center gap-2.5">
            <div className="bg-white px-2 py-0.5 rounded-sm flex items-center shadow-xs">
              <img 
                src="/logo-beigel.png" 
                alt="Beigel" 
                className="h-5 w-auto block object-contain" 
              />
            </div>
            <div className="hidden xl:flex flex-col justify-center leading-none">
              <span className="text-xs font-bold text-white tracking-wide">Cotizador</span>
              <span className="text-[9px] font-medium text-slate-400">by Efectiviza</span>
            </div>
          </div>

          <span className="text-slate-700 hidden sm:inline select-none">/</span>

          {/* Selector de Rubro (Texto Plano Sutil) */}
          <div className="flex items-center gap-1">
            <RubroIcon size={13} className="text-slate-400 shrink-0" />
            <select 
              value={rubro} 
              onChange={(e) => setRubro(e.target.value)}
              className="text-slate-400 hover:text-slate-200 text-xs font-medium bg-transparent border-none focus:ring-0 cursor-pointer pr-1 transition-colors"
            >
              <option value="subestaciones" className="bg-[#090d16] text-slate-200">Subestaciones</option>
              <option value="solar" className="bg-[#090d16] text-slate-200">Solar / FV</option>
              <option value="movilidad" className="bg-[#090d16] text-slate-200">Movilidad EV</option>
            </select>
          </div>

        </div>

        {/* [ ZONA CENTRO: PESTAÑAS DE NAVEGACIÓN PLANAS (TABS) ] */}
        <div className="flex items-center h-full gap-8">
          <button
            type="button"
            onClick={() => setActiveBlock(1)}
            className={`h-full flex items-center gap-2 text-sm transition-colors cursor-pointer border-b-2 ${
              activeBlock === 1
                ? 'text-white font-semibold border-blue-500'
                : 'text-slate-400 hover:text-slate-200 font-medium border-transparent'
            }`}
          >
            <ShoppingCart size={14} className={activeBlock === 1 ? 'text-blue-400' : 'text-slate-400'} />
            <span>1. Procura</span>
            {equiposProcura.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                {equiposProcura.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveBlock(2)}
            className={`h-full flex items-center gap-2 text-sm transition-colors cursor-pointer border-b-2 ${
              activeBlock === 2
                ? 'text-white font-semibold border-blue-500'
                : 'text-slate-400 hover:text-slate-200 font-medium border-transparent'
            }`}
          >
            <Wrench size={14} className={activeBlock === 2 ? 'text-blue-400' : 'text-slate-400'} />
            <span>2. Servicios SSTT</span>
            {cartServicios.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                {cartServicios.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveBlock(3)}
            className={`h-full flex items-center gap-2 text-sm transition-colors cursor-pointer border-b-2 ${
              activeBlock === 3
                ? 'text-white font-semibold border-blue-500'
                : 'text-slate-400 hover:text-slate-200 font-medium border-transparent'
            }`}
          >
            <ShieldCheck size={14} className={activeBlock === 3 ? 'text-blue-400' : 'text-slate-400'} />
            <span>3. Consolidación</span>
          </button>
        </div>

        {/* [ ZONA DERECHA: ACCIONES GLOBALES ] */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Selector de versión sutil */}
          {onSwitchVersion && (
            <button
              type="button"
              onClick={() => onSwitchVersion('v1')}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors hidden md:flex items-center gap-1 cursor-pointer"
              title="Cambiar a Versión 1 Tradicional"
            >
              <Sliders size={12} />
              <span>V1</span>
            </button>
          )}

          {/* Enlace fantasma: Mis Cotizaciones */}
          <button
            type="button"
            onClick={() => setShowSavedQuotesPanel(true)}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Abrir historial de cotizaciones"
          >
            <Folder size={14} className="shrink-0" />
            <span className="hidden sm:inline">Mis Cotizaciones</span>
          </button>

          {/* Enlace fantasma: Lab Precios */}
          {onOpenLab && (
            <button
              type="button"
              onClick={onOpenLab}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50 px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Abrir Laboratorio de Costo de Activos"
            >
              <FlaskConical size={14} className="shrink-0" />
              <span className="hidden sm:inline">Lab Precios</span>
            </button>
          )}

          {/* ÚNICO BOTÓN SÓLIDO (Guardar) */}
          <button
            type="button"
            onClick={guardarCotizacionMaestra}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-all ml-2 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            title={cotizacionId ? 'Actualizar oferta existente' : 'Guardar nueva cotización'}
          >
            <Save size={14} className="shrink-0" />
            <span>{isSaving ? 'Guardando...' : (cotizacionId ? 'Actualizar' : 'Guardar')}</span>
          </button>

          {/* Enlace fantasma Copia si cotizacionId existe */}
          {cotizacionId && (
            <button
              type="button"
              onClick={guardarComoCopia}
              disabled={isSaving}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/50 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors hidden xl:flex items-center gap-1 cursor-pointer"
              title="Guardar como nueva copia independiente"
            >
              <Copy size={12} />
              <span>Copia</span>
            </button>
          )}

          {/* Botón Reset / Nuevo */}
          <button
            type="button"
            onClick={nuevaCotizacion}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 p-2 rounded-md transition-colors cursor-pointer ml-1"
            title="Iniciar nueva cotización en blanco"
          >
            <RotateCcw size={14} />
          </button>

        </div>

      </header>

      {/* ========================================================================= */}
      {/* 2. BARRA DE RESUMEN DEL PROYECTO (BLOQUE 0 TRANSICIÓN ELEGANTE) */}
      {/* ========================================================================= */}
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
        isOpen={isBloque0Open}
        setIsOpen={setIsBloque0Open}
      />

      {/* ========================================================================= */}
      {/* 3. ARMONÍA DEL LIENZO (BODY & MAIN CONTENT) */}
      {/* ========================================================================= */}
      <main className="pt-6 pb-16 px-6 mx-auto max-w-screen-2xl w-full flex-1 flex flex-col gap-6">
        
        {/* ================= PASO 1: PROCURA & LANDED COST ================= */}
        {activeBlock === 1 && (
          <div className="animate-fade-in flex flex-col gap-6">
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

            <div className="flex justify-end pt-2 w-full">
              <button 
                type="button"
                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer" 
                onClick={() => setActiveBlock(2)}
              >
                <span>Siguiente: Servicios Técnicos (SSTT)</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= PASO 2: SERVICIOS Y SSTT ================= */}
        {activeBlock === 2 && (
          <div className="animate-fade-in flex flex-col gap-6">
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-700">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900 m-0 leading-tight">Servicios Especializados & SSTT</h1>
                    <p className="text-xs text-slate-500 m-0">Carrito técnico, logística e indirectos con cálculo financiero en vivo</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-white text-slate-600 text-xs px-2.5 py-1 rounded-md font-medium border border-slate-200 shadow-sm">
                  <Zap size={12} className="text-blue-600" /> Motor V1 activo
                </span>
              </div>
              
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
                aplicarGastosIndirectos={aplicarGastosIndirectos}
                setAplicarGastosIndirectos={setAplicarGastosIndirectos}
                aplicarSSMAProvision={aplicarSSMAProvision}
                setAplicarSSMAProvision={setAplicarSSMAProvision}
                porcentajeSSMAProvision={porcentajeSSMAProvision}
                setPorcentajeSSMAProvision={setPorcentajeSSMAProvision}
                gastosAdminFinancieroPct={gastosAdminFinancieroPct}
                setGastosAdminFinancieroPct={setGastosAdminFinancieroPct}
                logisticsOverrides={logisticsOverrides}
                setLogisticsOverrides={setLogisticsOverrides}
                setTotalServicios={setTotalServicios} 
                setDetalleServicios={setDetalleServicios} 
                setResultadosSSTT={setResultadosSSTT}
                monedaTrabajo={monedaTrabajo}
                tipoCambio={tipoCambioVenta}
                nombreCliente={nombreCliente}
                nombreProyecto={nombreProyecto}
                onGuardar={guardarCotizacionMaestra}
                isSaving={isSaving}
              />

              <div className="flex justify-between items-center gap-3 mt-8 pt-4 border-t border-slate-200 w-full">
                <button 
                  type="button"
                  onClick={() => setActiveBlock(1)}
                  className="bg-transparent text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                >
                  ← Atrás (Procura)
                </button>
                <button 
                  type="button"
                  className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-2" 
                  onClick={() => setActiveBlock(3)}
                >
                  <span>Siguiente: Resumen de Cotización</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PASO 3: CONSOLIDACIÓN Y CIERRE ================= */}
        {activeBlock === 3 && (
          <div className="animate-fade-in flex flex-col gap-6">
            <Bloque3_Resumen 
              totalProcura={totalProcura} 
              totalServicios={totalServicios} 
              detalleProcura={equiposProcura}
              detalleServicios={detalleServicios}
              tipoCambio={tipoCambioVenta}
              monedaTrabajo={monedaTrabajo}
              nombreCliente={nombreCliente}
              nombreProyecto={nombreProyecto}
              alquileres={alquileresServicios}
              gastosImprevistos={gastosImprevistos}
              esLicitacion={perfilComercial === 'epc'}
              resultadosSSTT={resultadosSSTT}
              onGuardar={guardarCotizacionMaestra}
              isSaving={isSaving}
              copilotRef={copilotRef}
            />
            
            <div className="flex justify-between items-center pt-6 mt-8 border-t border-slate-200 w-full px-2">
              <button 
                type="button"
                onClick={() => setActiveBlock(2)}
                className="bg-transparent text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              >
                ← Atrás (Servicios Técnicos)
              </button>
              <button 
                type="button"
                onClick={guardarCotizacionMaestra}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-base font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={18} />
                <span>{isSaving ? 'Guardando...' : 'Finalizar y Guardar Cotización'}</span>
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
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl font-medium text-sm flex items-center gap-2.5 border border-slate-700 animate-fade-in">
          {toast.type === 'error'
            ? <XCircle size={16} className="text-red-400 shrink-0" />
            : <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* COMPONENTE ZUNZ COPILOT (ADHD UX) */}
      <ZunzCopilot ref={copilotRef} activeBlock={activeBlock} />

    </div>
  );
}
