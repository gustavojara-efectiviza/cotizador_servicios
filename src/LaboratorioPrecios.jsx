import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Save, 
  Trash2, 
  CheckCircle, 
  Zap, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Wrench,
  Calendar,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

const STORAGE_KEY = 'zunz_lab_equipos_guardados_v2';

const DEFAULTS = {
  nombreEquipo: '',
  vInc: '',
  vrCont: '',
  vuCont: '',
  presetVu: 'custom',
  factorReposicion: '',
  tasaOpp: '',
  condicionTrabajo: 1.0, // Taller / Lab (1.0x)
  opexModo: 'absoluto',
  cCalib: '',
  cMaint: '',
  cSeg: '',
  opexPct: '',
  diasAno: '',
  horasDia: '',
  margen: ''
};

const LaboratorioPrecios = ({ onClose }) => {
  // Pestaña Activa (Chunking de Miller para reducción de carga cognitiva)
  const [activeTab, setActiveTab] = useState('inversion'); // 'inversion' | 'mantenimiento' | 'operacion'

  // A. Identificación y Equipos Guardados
  const [nombreEquipo, setNombreEquipo] = useState(DEFAULTS.nombreEquipo);
  const [equiposGuardados, setEquiposGuardados] = useState([]);
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState('');
  const [toastMensaje, setToastMensaje] = useState(null);

  // Modal Guía de Reposición
  const [showModalReposicion, setShowModalReposicion] = useState(false);

  // B. Datos Financieros y de Adquisición
  const [vInc, setVInc] = useState(DEFAULTS.vInc);
  const [vrCont, setVrCont] = useState(DEFAULTS.vrCont);
  const [vuCont, setVuCont] = useState(DEFAULTS.vuCont);
  const [presetVu, setPresetVu] = useState(DEFAULTS.presetVu);
  const [factorReposicion, setFactorReposicion] = useState(DEFAULTS.factorReposicion);
  const [tasaOpp, setTasaOpp] = useState(DEFAULTS.tasaOpp);

  // C. Severidad y OPEX
  const [condicionTrabajo, setCondicionTrabajo] = useState(DEFAULTS.condicionTrabajo);
  const [opexModo, setOpexModo] = useState(DEFAULTS.opexModo);
  const [cCalib, setCCalib] = useState(DEFAULTS.cCalib);
  const [cMaint, setCMaint] = useState(DEFAULTS.cMaint);
  const [cSeg, setCSeg] = useState(DEFAULTS.cSeg);
  const [opexPct, setOpexPct] = useState(DEFAULTS.opexPct);

  // D. Régimen de Utilización
  const [diasAno, setDiasAno] = useState(DEFAULTS.diasAno);
  const [horasDia, setHorasDia] = useState(DEFAULTS.horasDia);

  // E. Simulador Comercial
  const [margen, setMargen] = useState(DEFAULTS.margen);

  // Cargar equipos de localStorage al inicio
  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setEquiposGuardados(parsed);
        }
      }
    } catch (e) {
      console.error('Error al cargar equipos de localStorage', e);
    }
  }, []);

  const mostrarToast = (msg) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 3000);
  };

  // Guardar equipo actual
  const handleGuardarEquipo = () => {
    const cleanNombre = nombreEquipo.trim() || 'Equipo Sin Nombre';
    const nuevoRegistro = {
      id: equipoSeleccionadoId || `eq_${Date.now()}`,
      nombre: cleanNombre,
      fecha: new Date().toLocaleDateString('es-PY'),
      datos: {
        nombreEquipo: cleanNombre,
        vInc,
        vrCont,
        vuCont,
        presetVu,
        factorReposicion,
        tasaOpp,
        condicionTrabajo,
        opexModo,
        cCalib,
        cMaint,
        cSeg,
        opexPct,
        diasAno,
        horasDia,
        margen
      }
    };

    let listaActualizada;
    const existeIndex = equiposGuardados.findIndex(e => e.id === nuevoRegistro.id || e.nombre.toLowerCase() === cleanNombre.toLowerCase());
    if (existeIndex >= 0) {
      listaActualizada = [...equiposGuardados];
      listaActualizada[existeIndex] = { ...nuevoRegistro, id: equiposGuardados[existeIndex].id };
      setEquipoSeleccionadoId(listaActualizada[existeIndex].id);
    } else {
      listaActualizada = [nuevoRegistro, ...equiposGuardados];
      setEquipoSeleccionadoId(nuevoRegistro.id);
    }

    setEquiposGuardados(listaActualizada);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listaActualizada));
    mostrarToast(`✓ "${cleanNombre}" guardado con éxito`);
  };

  // Cargar equipo seleccionado
  const handleCargarEquipo = (id) => {
    setEquipoSeleccionadoId(id);
    if (!id) return;
    const item = equiposGuardados.find(e => e.id === id);
    if (item && item.datos) {
      const d = item.datos;
      setNombreEquipo(d.nombreEquipo || item.nombre || '');
      setVInc(d.vInc ?? '');
      setVrCont(d.vrCont ?? '');
      setVuCont(d.vuCont ?? '');
      setPresetVu(d.presetVu ?? 'custom');
      setFactorReposicion(d.factorReposicion ?? '');
      setTasaOpp(d.tasaOpp ?? '');
      setCondicionTrabajo(d.condicionTrabajo ?? 1.0);
      setOpexModo(d.opexModo ?? 'absoluto');
      setCCalib(d.cCalib ?? '');
      setCMaint(d.cMaint ?? '');
      setCSeg(d.cSeg ?? '');
      setOpexPct(d.opexPct ?? '');
      setDiasAno(d.diasAno ?? '');
      setHorasDia(d.horasDia ?? '');
      setMargen(d.margen ?? '');
      mostrarToast(`Plantilla "${item.nombre}" cargada`);
    }
  };

  // Eliminar equipo guardado
  const handleEliminarEquipo = (id, e) => {
    e.stopPropagation();
    const filtrados = equiposGuardados.filter(item => item.id !== id);
    setEquiposGuardados(filtrados);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados));
    if (equipoSeleccionadoId === id) {
      setEquipoSeleccionadoId('');
    }
    mostrarToast('Equipo eliminado de guardados');
  };

  // Reset a valores de fábrica en blanco
  const handleReset = () => {
    setNombreEquipo(DEFAULTS.nombreEquipo);
    setVInc(DEFAULTS.vInc);
    setVrCont(DEFAULTS.vrCont);
    setVuCont(DEFAULTS.vuCont);
    setPresetVu(DEFAULTS.presetVu);
    setFactorReposicion(DEFAULTS.factorReposicion);
    setTasaOpp(DEFAULTS.tasaOpp);
    setCondicionTrabajo(DEFAULTS.condicionTrabajo);
    setOpexModo(DEFAULTS.opexModo);
    setCCalib(DEFAULTS.cCalib);
    setCMaint(DEFAULTS.cMaint);
    setCSeg(DEFAULTS.cSeg);
    setOpexPct(DEFAULTS.opexPct);
    setDiasAno(DEFAULTS.diasAno);
    setHorasDia(DEFAULTS.horasDia);
    setMargen(DEFAULTS.margen);
    setEquipoSeleccionadoId('');
    setActiveTab('inversion');
    mostrarToast('Formulario restablecido');
  };

  // Manejo de Presets SET / DNIT (Res. 36/2020)
  const aplicarPresetVu = (tipo) => {
    setPresetVu(tipo);
    if (tipo === 'medicion_5') {
      setVuCont(5);
      setVrCont(10);
    } else if (tipo === 'maquinaria_10') {
      setVuCont(10);
      setVrCont(10);
    } else if (tipo === 'vehiculo_5') {
      setVuCont(5);
      setVrCont(20);
    }
  };

  // --- MOTOR MATEMÁTICO INTEGRAL ---
  const numVInc = Math.max(0, Number(vInc) || 0);
  const numVrCont = Math.max(0, Math.min(100, Number(vrCont) || 0));
  const numVuCont = Math.max(0.5, Number(vuCont) || 1);
  const numFactorReposicion = Math.max(0, Number(factorReposicion) || 0);
  const numTasaOpp = Math.max(0, Number(tasaOpp) || 0);
  const numCondicionTrabajo = Number(condicionTrabajo) || 1.0;

  const numCCalib = Math.max(0, Number(cCalib) || 0);
  const numCMaint = Math.max(0, Number(cMaint) || 0);
  const numCSeg = Math.max(0, Number(cSeg) || 0);
  const numOpexPct = Math.max(0, Number(opexPct) || 0);

  const numDiasAno = Math.max(0, Number(diasAno) || 0);
  const numHorasDia = Math.max(0, Number(horasDia) || 0);
  const numMargen = Math.max(0, Math.min(99, Number(margen) || 0));

  // 1. Depreciación Lineal y Cuota de Reposición
  const vrMonto = numVInc * (numVrCont / 100);
  const dAnualBase = numVuCont > 0 ? (numVInc - vrMonto) / numVuCont : 0;
  const cuotaReposicionAnual = numVuCont > 0 ? (numVInc * (numFactorReposicion / 100)) / numVuCont : 0;
  const dAnualTotal = dAnualBase + cuotaReposicionAnual;

  // 2. Costo de Oportunidad de Capital (WACC sobre capital promedio inmovilizado)
  const vPromedio = (numVInc + vrMonto) / 2;
  const ccAnual = vPromedio * (numTasaOpp / 100);

  // 3. OPEX Ajustado por Severidad
  const opexAnualAjustado = opexModo === 'absoluto'
    ? (numCCalib + (numCMaint * numCondicionTrabajo) + numCSeg)
    : (numVInc * (numOpexPct / 100)) * numCondicionTrabajo;

  // 4. Costo Total Anual de Posesión (CTA)
  const cta = dAnualTotal + ccAnual + opexAnualAjustado;

  // 5. Costo Unitario Técnico (Sin Margen)
  const diasValidos = Math.max(numDiasAno, 0.001); 
  const horasValidas = Math.max(numHorasDia, 0.001);
  const cpd = numDiasAno > 0 ? (cta / diasValidos) : 0;
  const cph = numHorasDia > 0 ? (cpd / horasValidas) : 0;

  // 6. Tarifa Comercial Sugerida (Margen sobre Venta: P = C / (1 - m))
  const margenDecimal = Math.min(numMargen / 100, 0.99); 
  const tarifaDiaSug = cpd > 0 ? (cpd / (1 - margenDecimal)) : 0;
  const tarifaHoraSug = cph > 0 ? (cph / (1 - margenDecimal)) : 0;

  // 7. Impacto Tributario IRE (Ley 6380/19 Paraguay - 10%)
  const utilidadBrutaDia = Math.max(0, tarifaDiaSug - cpd);
  const utilidadBrutaAnual = utilidadBrutaDia * numDiasAno;
  const TASA_IRE = 0.10;
  const ireDia = utilidadBrutaDia * TASA_IRE;
  const ireAnual = utilidadBrutaAnual * TASA_IRE;
  const utilidadNetaDia = utilidadBrutaDia - ireDia;
  const utilidadNetaAnual = utilidadBrutaAnual - ireAnual;
  const margenNetoRealPct = tarifaDiaSug > 0 ? (utilidadNetaDia / tarifaDiaSug) * 100 : 0;

  // 8. Análisis Financiero de Inversión (Payback & Break-Even)
  const ingresoAnual = tarifaDiaSug * numDiasAno;
  const flujoCajaAnual = (ingresoAnual - opexAnualAjustado) - ireAnual;
  const inversionNetaRecuperar = Math.max(0, numVInc - vrMonto);
  
  let paybackTexto = '—';
  let paybackAnosNum = 0;
  if (numVInc > 0 && numDiasAno > 0 && flujoCajaAnual > 0) {
    paybackAnosNum = inversionNetaRecuperar / flujoCajaAnual;
    const anos = Math.floor(paybackAnosNum);
    const meses = Math.round((paybackAnosNum - anos) * 12);
    if (anos === 0) {
      paybackTexto = `${meses} meses`;
    } else if (meses === 0) {
      paybackTexto = `${anos} año${anos > 1 ? 's' : ''}`;
    } else {
      paybackTexto = `${anos} a. y ${meses} m.`;
    }
  } else if (numVInc > 0 && numDiasAno > 0 && flujoCajaAnual <= 0) {
    paybackTexto = 'Inviable (>15 a)';
  } else {
    paybackTexto = '—';
  }

  const diasBreakEven = tarifaDiaSug > 0 ? Math.ceil(cta / tarifaDiaSug) : 0;
  const diasMargenSeguridad = numDiasAno - diasBreakEven;
  const pctMargenSeguridad = numDiasAno > 0 ? ((diasMargenSeguridad / numDiasAno) * 100).toFixed(1) : '0.0';

  // 9. Tasa de Utilización Anual
  const tasaUtilizacionPct = Math.min(100, (numDiasAno / 365) * 100);
  let statusUtilizacion = {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    texto: 'Rango Típico PY'
  };

  if (numDiasAno === 0) {
    statusUtilizacion = {
      badge: 'bg-[#131926] text-slate-500 border-slate-800',
      texto: 'Sin Días Asignados'
    };
  } else if (numDiasAno < 50) {
    statusUtilizacion = {
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      texto: 'Baja Utilización'
    };
  } else if (numDiasAno > 220) {
    statusUtilizacion = {
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      texto: 'Riesgo Sobrestimación'
    };
  } else if (numDiasAno > 140) {
    statusUtilizacion = {
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      texto: 'Alta Intensidad'
    };
  }

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1 }).format(val);

  return (
    <div className="lab-modal fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6 overflow-y-auto font-sans animate-fadeIn">
      
      {/* CONTENEDOR PRINCIPAL: INSPECTOR PRO (Dark Slate Mate #0B0F17) */}
      <div className="bg-[#0B0F17] text-slate-100 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-800/80 flex flex-col relative max-h-[95vh] overflow-y-auto">
        
        {/* TOAST FLOTANTE */}
        {toastMensaje && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/30 animate-fadeIn">
            <CheckCircle size={14} />
            <span>{toastMensaje}</span>
          </div>
        )}

        {/* HEADER LIMPIO & ESPACIOSO */}
        <div className="px-6 md:px-8 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-[#0B0F17]/90 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-400 shrink-0">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">Laboratorio de Costo de Activos</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#131926] text-slate-400 border border-slate-750">
                  🇵🇾 IRE 10% · SET
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Simulador de tarifas horarias, depreciación y rentabilidad</p>
            </div>
          </div>

          {/* ACCIONES SUPERIORES */}
          <div className="flex items-center gap-2 flex-wrap">
            {equiposGuardados.length > 0 && (
              <div className="relative">
                <select 
                  className="bg-[#131926] text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-750 focus:outline-none focus:border-blue-500 font-medium pr-7 cursor-pointer hover:bg-[#1a2334] transition"
                  value={equipoSeleccionadoId}
                  onChange={(e) => handleCargarEquipo(e.target.value)}
                >
                  <option value="">📂 Guardados ({equiposGuardados.length})...</option>
                  {equiposGuardados.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre} ({eq.fecha})
                    </option>
                  ))}
                </select>
                {equipoSeleccionadoId && (
                  <button 
                    onClick={(e) => handleEliminarEquipo(equipoSeleccionadoId, e)}
                    className="absolute -right-1.5 -top-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow transition cursor-pointer"
                    title="Eliminar activo guardado"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleGuardarEquipo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              title="Guardar equipo en este navegador"
            >
              <Save size={14} />
              <span>Guardar</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#131926] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-750 transition cursor-pointer"
              title="Restablecer formulario en blanco"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CUERPO PRINCIPAL: 2 COLUMNAS AMPLIAS (Inspector Pro Layout) */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ================= COLUMNA IZQUIERDA: SISTEMA POR PASOS / CHUNKING (7 cols) ================= */}
          <div className="lg:col-span-7 space-y-6">

            {/* Input Nombre del Activo (Siempre visible como ancla cognitiva) */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Nombre del Activo / Equipo de Ensayo
              </label>
              <input 
                type="text" 
                value={nombreEquipo} 
                onChange={(e) => setNombreEquipo(e.target.value)}
                className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                placeholder="Ej. Omicron CPC 100 + TD1, Megger S1-568, Fluke Ti480..."
              />
            </div>

            {/* BARRA DE NAVEGACIÓN TEMÁTICA (PESTAÑAS CHUNKING DE MILLER) */}
            <div className="bg-[#131926] p-1.5 rounded-xl border border-slate-800 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('inversion')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'inversion'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <DollarSign size={14} />
                <span>1. Inversión</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mantenimiento')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'mantenimiento'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Wrench size={14} />
                <span>2. OPEX</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('operacion')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'operacion'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Calendar size={14} />
                <span>3. Régimen</span>
              </button>
            </div>

            {/* CONTENEDOR DINÁMICO DE PESTAÑAS CON ESPACIO NEGATIVO */}
            <div className="bg-[#131926]/40 p-6 rounded-2xl border border-slate-800/80 min-h-[300px] flex flex-col justify-between">
              
              {/* TAB 1: INVERSIÓN & DEPRECIACIÓN */}
              {activeTab === 'inversion' && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Presets Rápidos SET */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400">Presets Tributarios SET / DNIT:</span>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => aplicarPresetVu('medicion_5')}
                        title="Instrumental de Medición y TI: 5 años (20% anual)"
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium cursor-pointer ${
                          presetVu === 'medicion_5' 
                            ? 'bg-blue-600/30 border-blue-500/80 text-blue-300 font-semibold' 
                            : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                        }`}
                      >
                        Medición (5a)
                      </button>
                      <button 
                        type="button"
                        onClick={() => aplicarPresetVu('maquinaria_10')}
                        title="Maquinarias y Equipos: 10 años (10% anual)"
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium cursor-pointer ${
                          presetVu === 'maquinaria_10' 
                            ? 'bg-blue-600/30 border-blue-500/80 text-blue-300 font-semibold' 
                            : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                        }`}
                      >
                        Máquina (10a)
                      </button>
                      <button 
                        type="button"
                        onClick={() => aplicarPresetVu('vehiculo_5')}
                        title="Vehículos Utilitarios: 5 años (VR 20%)"
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium cursor-pointer ${
                          presetVu === 'vehiculo_5' 
                            ? 'bg-blue-600/30 border-blue-500/80 text-blue-300 font-semibold' 
                            : 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700/50'
                        }`}
                      >
                        Flota (5a)
                      </button>
                    </div>
                  </div>

                  {/* Valor de Compra Protagonista */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                      Valor de Compra / Adquisición (USD)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-slate-400 font-mono text-base select-none pointer-events-none font-semibold">$</span>
                      <input 
                        type="number" 
                        placeholder="Ej. 60000"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={vInc} 
                        onChange={e => setVInc(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Grid 2x2 Limpio & Cómodo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1.5 block">Vida Útil (Años)</label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="Ej. 5"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={vuCont} 
                        onChange={e => { setVuCont(e.target.value); setPresetVu('custom'); }} 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1.5 block">Valor Residual (%)</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 10"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={vrCont} 
                        onChange={e => { setVrCont(e.target.value); setPresetVu('custom'); }} 
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300">Fondo Reposición (%)</label>
                        <button 
                          type="button" 
                          onClick={() => setShowModalReposicion(true)} 
                          className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer flex items-center gap-1"
                        >
                          <HelpCircle size={12} />
                          <span>¿Qué % usar?</span>
                        </button>
                      </div>
                      <input 
                        type="number" 
                        placeholder="Ej. 15"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={factorReposicion} 
                        onChange={e => setFactorReposicion(e.target.value)} 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1.5 block">Tasa WACC / Capital (%)</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 8.0"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={tasaOpp} 
                        onChange={e => setTasaOpp(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Navegación al Siguiente Paso */}
                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveTab('mantenimiento')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 transition cursor-pointer"
                    >
                      <span>Siguiente: Mantenimiento</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: MANTENIMIENTO OPEX */}
              {activeTab === 'mantenimiento' && (
                <div className="space-y-5 animate-fadeIn">
                  
                  {/* Selector de Modo */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Cálculo de Mantenimiento & Seguros
                    </span>
                    <select 
                      className="bg-[#131926] text-xs border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none cursor-pointer"
                      value={opexModo} 
                      onChange={e => setOpexModo(e.target.value)}
                    >
                      <option value="absoluto">Monto Detallado ($/año)</option>
                      <option value="porcentaje">% sobre Compra</option>
                    </select>
                  </div>

                  {/* Condición de Trabajo: Segmented Control Integrado */}
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-2 block">
                      Condición de Operación / Factor Ambiental
                    </label>
                    <div className="bg-[#131926] p-1.5 rounded-xl border border-slate-800 grid grid-cols-3 gap-1.5">
                      <button 
                        type="button"
                        onClick={() => setCondicionTrabajo(1.0)}
                        className={`py-2 text-xs text-center rounded-lg font-medium transition-all cursor-pointer ${
                          condicionTrabajo === 1.0 
                            ? 'bg-blue-600 text-white shadow-md font-semibold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Taller (1.0x)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCondicionTrabajo(1.15)}
                        className={`py-2 text-xs text-center rounded-lg font-medium transition-all cursor-pointer ${
                          condicionTrabajo === 1.15 
                            ? 'bg-blue-600 text-white shadow-md font-semibold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Subestación (1.15x)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCondicionTrabajo(1.30)}
                        className={`py-2 text-xs text-center rounded-lg font-medium transition-all cursor-pointer ${
                          condicionTrabajo === 1.30 
                            ? 'bg-blue-600 text-white shadow-md font-semibold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Chaco / Severo (1.30x)
                      </button>
                    </div>
                  </div>

                  {/* Inputs OPEX Cuadrícula Simétrica */}
                  {opexModo === 'absoluto' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="text-xs font-medium text-slate-300 mb-1.5 block">Calibración ($/a)</label>
                        <input 
                          type="number" 
                          placeholder="Ej. 600"
                          className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                          value={cCalib} 
                          onChange={e => setCCalib(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 mb-1.5 block">Preventivo ($/a)</label>
                        <input 
                          type="number" 
                          placeholder="Ej. 1400"
                          className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                          value={cMaint} 
                          onChange={e => setCMaint(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-300 mb-1.5 block">Seguros ($/a)</label>
                        <input 
                          type="number" 
                          placeholder="Ej. 400"
                          className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                          value={cSeg} 
                          onChange={e => setCSeg(e.target.value)} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <label className="text-xs font-medium text-slate-300 mb-1.5 block">% de OPEX Anual sobre Compra</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 4.5"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={opexPct} 
                        onChange={e => setOpexPct(e.target.value)} 
                      />
                    </div>
                  )}

                  {/* Navegación Anterior / Siguiente */}
                  <div className="pt-3 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab('inversion')}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Volver a Inversión</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('operacion')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 transition cursor-pointer"
                    >
                      <span>Siguiente: Régimen</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 3: RÉGIMEN DE USO & INTENSIDAD */}
              {activeTab === 'operacion' && (
                <div className="space-y-5 animate-fadeIn">
                  
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Régimen de Utilización Estimado
                    </span>
                    <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                      Total: {numDiasAno * numHorasDia} h/año
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1.5 block">Días Facturables / Año</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 110"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={diasAno} 
                        onChange={e => setDiasAno(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-300 mb-1.5 block">Horas Efectivas / Día</label>
                      <input 
                        type="number" 
                        placeholder="Ej. 8"
                        className="w-full bg-[#131926] border border-slate-700/70 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all font-mono"
                        value={horasDia} 
                        onChange={e => setHorasDia(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Barra suave de utilización */}
                  <div className="bg-[#131926] p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Tasa de Utilización Anual: <strong className="text-slate-100 font-mono font-bold">{tasaUtilizacionPct.toFixed(0)}%</strong></span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusUtilizacion.badge}`}>
                        {statusUtilizacion.texto}
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          tasaUtilizacionPct === 0 ? 'bg-slate-700' :
                          tasaUtilizacionPct < 15 ? 'bg-amber-500' :
                          tasaUtilizacionPct > 60 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, tasaUtilizacionPct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Navegación Anterior */}
                  <div className="pt-2 flex justify-start">
                    <button
                      type="button"
                      onClick={() => setActiveTab('mantenimiento')}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Volver a Mantenimiento</span>
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>


          {/* ================= COLUMNA DERECHA: CONSOLA DE SALIDA / INSPECTOR PRO (5 cols) ================= */}
          <div className="lg:col-span-5 space-y-5">

            {/* TARJETA 1: TARIFA SUGERIDA CON GLASSMORPHISM AZUL NOCHE */}
            <div className="bg-gradient-to-br from-[#131D31] to-[#0E1524] border border-blue-500/20 rounded-2xl p-6 shadow-xl space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <Sparkles size={14} /> Precio Sugerido de Venta
                </span>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-bold border border-blue-500/30">
                  Margen: {numMargen}%
                </span>
              </div>

              {/* Precios Principales */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B0F17]/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tarifa Sugerida / Día</span>
                  <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                    {formatUSD(tarifaDiaSug)}
                  </div>
                  <div className="text-xs text-blue-300/70 font-mono mt-1.5">
                    Costo Base: <span className="text-slate-300 font-semibold">{formatUSD(cpd)}</span>/d
                  </div>
                </div>

                <div className="bg-[#0B0F17]/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tarifa Sugerida / Hora</span>
                  <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                    {formatUSD(tarifaHoraSug)}
                  </div>
                  <div className="text-xs text-blue-300/70 font-mono mt-1.5">
                    Costo Base: <span className="text-slate-300 font-semibold">{formatUSD(cph)}</span>/h
                  </div>
                </div>
              </div>

              {/* Slider de Margen Pulido */}
              <div className="bg-[#0B0F17]/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Margen Comercial sobre Venta:</span>
                  <span className="text-blue-400 font-mono font-bold text-sm">{numMargen}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="60" 
                  step="1"
                  value={Number(margen) || 0} 
                  onChange={e => setMargen(e.target.value)}
                  className="w-full accent-blue-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* TARJETA 2: SALUD FINANCIERA & VIABILIDAD (PAYBACK) */}
            <div className="bg-[#131926]/70 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Salud Financiera & Retorno
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Flujo: {formatUSD(flujoCajaAnual)}/a
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B0F17]/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Se Paga en</span>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {paybackTexto}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Recupero inversión</span>
                </div>

                <div className="bg-[#0B0F17]/80 p-3.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Mínimo de Uso</span>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {numDiasAno > 0 ? `${diasBreakEven} días/año` : '—'}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Punto de equilibrio</span>
                </div>
              </div>

              {/* Badge Margen de Seguridad */}
              <div className="flex justify-center pt-0.5">
                <span className={`text-xs font-mono font-semibold px-3 py-1 rounded-full border ${
                  numDiasAno === 0
                    ? 'bg-[#131926] text-slate-400 border-slate-800'
                    : diasMargenSeguridad >= 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  Margen de Seguridad: {numDiasAno === 0 ? '0 días (0.0%)' : `${diasMargenSeguridad >= 0 ? `+${diasMargenSeguridad}` : diasMargenSeguridad} días (${diasMargenSeguridad >= 0 ? `+${pctMargenSeguridad}` : pctMargenSeguridad}%)`}
                </span>
              </div>
            </div>

            {/* DESPLEGABLE AUDITORÍA TÉCNICA Y FISCAL IRE */}
            <details className="group bg-[#131926]/40 rounded-xl border border-slate-800 transition-all overflow-hidden">
              <summary className="px-4 py-3 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer list-none flex items-center justify-between select-none hover:bg-[#131926]/70 transition">
                <span className="flex items-center gap-2">
                  <span className="text-slate-500 group-open:rotate-90 transition-transform duration-200">▶</span>
                  <span>Ver Auditoría Técnica y Fiscal IRE</span>
                </span>
                <span className="text-[11px] font-mono text-blue-400/80 group-open:hidden">
                  CTA: {formatUSD(cta)}
                </span>
              </summary>

              <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-3 text-xs">
                {/* CTA */}
                <div>
                  <div className="flex justify-between items-center text-slate-300 font-bold mb-1">
                    <span>Costo Técnico Anual (CTA)</span>
                    <span className="font-mono text-blue-400">{formatUSD(cta)}</span>
                  </div>
                  <div className="space-y-1 text-slate-400 text-[11px]">
                    <div className="flex justify-between">
                      <span>• Depreciación Anual (Base + Reposición):</span>
                      <span className="font-mono text-slate-300">{formatUSD(dAnualTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Costo de Capital / WACC ({numTasaOpp}%):</span>
                      <span className="font-mono text-slate-300">{formatUSD(ccAnual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• OPEX Anual (Ajustado {numCondicionTrabajo}x):</span>
                      <span className="font-mono text-slate-300">{formatUSD(opexAnualAjustado)}</span>
                    </div>
                  </div>
                </div>

                {/* IRE */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-slate-300 font-bold mb-1">
                    <span>Impacto Fiscal IRE (10% Paraguay)</span>
                    <span className="text-[10px] font-mono text-emerald-400">Neto: {margenNetoRealPct.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1 text-slate-400 text-[11px]">
                    <div className="flex justify-between">
                      <span>• Utilidad Bruta / Día (Pre-IRE):</span>
                      <span className="font-mono text-slate-300">{formatUSD(utilidadBrutaDia)}</span>
                    </div>
                    <div className="flex justify-between text-rose-400/90">
                      <span>• Provisión IRE 10% / Día:</span>
                      <span className="font-mono">- {formatUSD(ireDia)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>• Utilidad Neta en Bolsillo / Día:</span>
                      <span className="font-mono">{formatUSD(utilidadNetaDia)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>• Provisión Total IRE Anual:</span>
                      <span className="font-mono text-slate-300">{formatUSD(ireAnual)}/año</span>
                    </div>
                  </div>
                </div>
              </div>
            </details>

          </div>

        </div>

      </div>

      {/* ================= MODAL GUÍA DE REPOSICIÓN FUTURA ================= */}
      {showModalReposicion && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn font-sans">
          <div className="bg-[#0B0F17] text-slate-100 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-800 p-6 relative max-h-[90vh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => setShowModalReposicion(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Criterio Técnico para el Fondo de Reposición Futura</h3>
                <span className="text-xs text-slate-400">Protección contra descapitalización e inflación en USD</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-[#131926] p-3.5 rounded-xl border border-slate-800">
              Este porcentaje contrarresta la descapitalización por encarecimiento del reemplazo, inflación en origen (USD) y salto tecnológico al término de la vida útil.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-800 mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#131926] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Tipo de Activo</th>
                    <th className="p-3">Vida Útil</th>
                    <th className="p-3">% Sugerido</th>
                    <th className="p-3">Fundamento Técnico</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  <tr className="hover:bg-[#131926]/50 transition">
                    <td className="p-3 font-semibold text-slate-200">
                      Instrumental Electrónico y Medición (TI)
                    </td>
                    <td className="p-3 text-slate-400 font-mono whitespace-nowrap">5 - 7 años</td>
                    <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">15% - 20%</td>
                    <td className="p-3 text-[11px] text-slate-400 leading-tight">
                      Obsolescencia rápida, nuevas normativas y discontinuación de repuestos.
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFactorReposicion(15);
                            setShowModalReposicion(false);
                            mostrarToast('✓ Fondo configurado en 15%');
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/30 text-[10px] font-semibold transition cursor-pointer"
                        >
                          15%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFactorReposicion(20);
                            setShowModalReposicion(false);
                            mostrarToast('✓ Fondo configurado en 20%');
                          }}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-lg border border-emerald-500/30 text-[10px] font-semibold transition cursor-pointer"
                        >
                          20%
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#131926]/50 transition">
                    <td className="p-3 font-semibold text-slate-200">
                      Maquinaria Pesada / Electromecánica
                    </td>
                    <td className="p-3 text-slate-400 font-mono whitespace-nowrap">10 - 12 años</td>
                    <td className="p-3 font-mono font-bold text-amber-400 whitespace-nowrap">25% - 35%</td>
                    <td className="p-3 text-[11px] text-slate-400 leading-tight">
                      Ciclo prolongado; mayor exposición a inflación acumulada del bien de capital.
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFactorReposicion(25);
                            setShowModalReposicion(false);
                            mostrarToast('✓ Fondo configurado en 25%');
                          }}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg border border-amber-500/30 text-[10px] font-semibold transition cursor-pointer"
                        >
                          25%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFactorReposicion(35);
                            setShowModalReposicion(false);
                            mostrarToast('✓ Fondo configurado en 35%');
                          }}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg border border-amber-500/30 text-[10px] font-semibold transition cursor-pointer"
                        >
                          35%
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-[#131926]/50 transition">
                    <td className="p-3 font-semibold text-slate-200">
                      Flota / Vehículos Utilitarios
                    </td>
                    <td className="p-3 text-slate-400 font-mono whitespace-nowrap">5 años</td>
                    <td className="p-3 font-mono font-bold text-blue-400 whitespace-nowrap">10% - 15%</td>
                    <td className="p-3 text-[11px] text-slate-400 leading-tight">
                      Ajuste habitual de listas de precios y renovación programada.
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFactorReposicion(10);
                            setShowModalReposicion(false);
                            mostrarToast('✓ Fondo configurado en 10%');
                          }}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-[10px] font-semibold transition cursor-pointer"
                        >
                          10%
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFactorReposicion(15);
                            setShowModalReposicion(false);
                            mostrarToast('✓ Fondo configurado en 15%');
                          }}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg border border-blue-500/30 text-[10px] font-semibold transition cursor-pointer"
                        >
                          15%
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowModalReposicion(false)}
                className="px-4 py-2 bg-[#131926] hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-750 transition cursor-pointer"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LaboratorioPrecios;
