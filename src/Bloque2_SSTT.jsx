import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Calculator, FileText, Plus, Trash2, Zap, Layout, Database as DatabaseIcon, Edit2, ShieldAlert, ShieldCheck, PackagePlus, Users, DollarSign, Calendar, Truck, Sparkles, Search, Layers, ListPlus, Check } from 'lucide-react';
import UnifilarConfigurator from './UnifilarConfigurator';
import CRMFinancialPanelV2 from './CRMFinancialPanelV2';
import { fetchEquiposMaestros, getTensionsFromData, getEquipmentsByTensionFromData, addEquipoMaestro } from './services/dbService';
import { calcularCotizacionActiva, Maestro_Precios_Mercado, COSTO_ESPECIALISTA_DIA, COSTO_AUXILIAR_DIA, COSTO_EXTERNO_DIA, TARIFA_EQUIPOS_HORA } from './financialEngine';
import { CATALOGOS_SERVICIOS_FRECUENTES, buildMacroPaqueteTrafo, buildMacroPCPCompleto, buildItemFromCatalogEntry } from './catalogoMacros';
import LogisticsModal from './LogisticsModal';
import './index.css';

const DEDUCTED_HOSPEDAJE_RATE = 200000;
const DEDUCTED_VIATICO_RATE = 100000;

function Bloque2_SSTT({
  // DATOS ELEVADOS AL DASHBOARD (Single Source of Truth — FASE 2)
  cart = [],
  setCart,
  alquileres = [],
  setAlquileres,
  distanciaKm = 100,
  setDistanciaKm,
  diasPermitidosCorte = 3,
  setDiasPermitidosCorte,
  gastosImprevistos = 0,
  setGastosImprevistos,
  margenImprevistosPorcentaje = 0,
  setMargenImprevistosPorcentaje,
  condicionTrabajo = 1.0,
  setCondicionTrabajo,
  aplicarGastosIndirectos = true,
  setAplicarGastosIndirectos,
  aplicarSSMAProvision = true,
  setAplicarSSMAProvision,
  porcentajeSSMAProvision = 5,
  setPorcentajeSSMAProvision,
  gastosAdminFinancieroPct = 6,
  setGastosAdminFinancieroPct,
  logisticsOverrides = { enabled: false },
  setLogisticsOverrides,
  // CALLBACKS AL PADRE
  setTotalServicios,
  setDetalleServicios,
  setResultadosSSTT,
  monedaTrabajo = 'USD',
  tipoCambio = 7500,
  nombreCliente = '',
  nombreProyecto = '',
  onGuardar,
  isSaving
}) {
  const [tension, setTension] = useState('500 kV');
  const [equipo, setEquipo] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [activeTab, setActiveTab] = useState('carrito'); // 'carrito' | 'logistica'

  // Estado para Buscador Capa 2 (Catálogo a la Carta con datalist)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCantidad, setSearchCantidad] = useState(1);
  const [toastMsg, setToastMsg] = useState(null);

  const showFeedbackToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Logistics Overrides & Indirect Switch (Sincronizado con EPCDashboard)
  const [localLogisticsOverrides, setLocalLogisticsOverrides] = useState({ enabled: false });
  const activeLogisticsOverrides = logisticsOverrides || localLogisticsOverrides;
  const updateLogisticsOverrides = setLogisticsOverrides || setLocalLogisticsOverrides;

  const [localAplicarIndirectos, setLocalAplicarIndirectos] = useState(true);
  const activeAplicarIndirectos = aplicarGastosIndirectos !== undefined ? aplicarGastosIndirectos : localAplicarIndirectos;
  const updateAplicarIndirectos = setAplicarGastosIndirectos || setLocalAplicarIndirectos;

  // Toggle SSMA y Consumibles (5% Pareto)
  const [localAplicarSSMA, setLocalAplicarSSMA] = useState(true);
  const activeAplicarSSMA = aplicarSSMAProvision !== undefined ? aplicarSSMAProvision : localAplicarSSMA;
  const updateAplicarSSMA = setAplicarSSMAProvision || setLocalAplicarSSMA;

  const [showLogisticsModal, setShowLogisticsModal] = useState(false);

  // Catálogo Maestro desde Firestore
  const [maestroData, setMaestroData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar catálogo Maestro desde Firestore al montar
  useEffect(() => {
    async function loadCatalog() {
      setIsLoading(true);
      const data = await fetchEquiposMaestros();
      if (data && data.length > 0) {
        setMaestroData(data);
      } else {
        console.warn('No se pudo cargar el catálogo maestro desde Firebase.');
      }
      setIsLoading(false);
    }
    loadCatalog();
  }, []);

  const tensions = useMemo(() => getTensionsFromData(maestroData), [maestroData]);
  const availableEquipments = useMemo(() => getEquipmentsByTensionFromData(maestroData, tension), [maestroData, tension]);

  // Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [overrideState, setOverrideState] = useState({});

  // Ad-Hoc & Catalog State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showAdHocModal, setShowAdHocModal] = useState(false);
  const [adHocState, setAdHocState] = useState({
    equipo: '', tension: '500 kV', horas_equipo: 4, horas_servicio: 4, interno: 1, ayudante: 1, externo: 0,
    costo_total_base: 0, is_tercerizado: false, margen_tercerizado: 30, incluye_en_logistica: false, saveToDb: false,
    modo_subcontrato: 'fijo', // 'fijo' | 'jornal'
    sub_esp_cant: 1, sub_esp_costo_dia: 450000, sub_esp_dias: 1,
    sub_aux_cant: 1, sub_aux_costo_dia: 250000, sub_aux_dias: 1,
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

  // ============================================================================
  // CAPA 1: INGRESO MANUAL LIBRE (+ Ítem Manual / Partida Global)
  // ============================================================================
  const handleAddManualItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      tension: 'N/A',
      equipo: 'Nueva Partida Manual / Servicio',
      cantidad: 1,
      baseData: {
        equipo: 'Nueva Partida Manual / Servicio',
        tension: 'N/A',
        horas_equipo: 0,
        horas_servicio: 0,
        interno: 0,
        ayudante: 0,
        externo: 0,
        costo_total_base: 0
      },
      overrides: {
        is_tercerizado: true,
        modo_subcontrato: 'fijo',
        costo_total_base: 0,
        margen_tercerizado: 30
      }
    };
    setCart(prev => [...prev, newItem]);
    setIsDirty(true);
    showFeedbackToast('Ítem manual agregado al carrito.');
  };

  // Edición Inline directa de descripción y costo
  const updateItemName = (id, newName) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          equipo: newName,
          baseData: {
            ...item.baseData,
            equipo: newName
          }
        };
      }
      return item;
    }));
    setIsDirty(true);
  };

  const updateItemCosto = (id, newCosto) => {
    const val = Math.max(0, parseFloat(newCosto) || 0);
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          needsPriceReview: false, // P8: Limpiar el flag de advertencia al editar el costo
          baseData: {
            ...item.baseData,
            costo_total_base: val
          },
          overrides: {
            ...(item.overrides || {}),
            costo_total_base: val,
            is_tercerizado: item.overrides?.is_tercerizado ?? true
          }
        };
      }
      return item;
    }));
    setIsDirty(true);
  };

  // ============================================================================
  // CAPA 2: CATÁLOGO A LA CARTA (<datalist> y buscador individual)
  // ============================================================================
  const catalogoSugerencias = useMemo(() => {
    // Servicios frecuentes provienen del módulo centralizado catalogoMacros.js
    // Para actualizar precios, editar SOLO ese archivo.
    const serviciosFrecuentes = CATALOGOS_SERVICIOS_FRECUENTES;

    const dbItems = (maestroData || []).map(item => ({
      label: `${item.equipo} (${item.tension || 'N/A'})`,
      equipo: item.equipo,
      tension: item.tension,
      rawItem: item
    }));

    return { serviciosFrecuentes, dbItems };
  }, [maestroData]);

  const handleAddFromDatalist = () => {
    const query = searchQuery.trim();
    if (!query) return;

    const qty = Math.max(1, parseInt(searchCantidad) || 1);

    const normalizeString = (str) => {
      if (!str) return '';
      return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    const queryNorm = normalizeString(query);

    // 1. Buscar en servicios frecuentes
    const foundFreq = catalogoSugerencias.serviciosFrecuentes.find(
      s => normalizeString(s.label) === queryNorm || normalizeString(s.label).includes(queryNorm)
    );

    // 2. Buscar en catálogo de base de datos
    const foundDb = (maestroData || []).find(e => 
      normalizeString(e.equipo) === queryNorm || 
      normalizeString(`${e.equipo} (${e.tension})`) === queryNorm ||
      normalizeString(e.equipo).includes(queryNorm)
    );

    let newItem;
    if (foundFreq) {
      newItem = {
        id: crypto.randomUUID(),
        tension: foundFreq.tension || 'N/A',
        equipo: foundFreq.label,
        cantidad: qty,
        baseData: {
          equipo: foundFreq.label,
          tension: foundFreq.tension || 'N/A',
          horas_equipo: 0,
          horas_servicio: 0,
          interno: 0,
          ayudante: 0,
          externo: 0,
          costo_total_base: foundFreq.costo_total_base || 0
        },
        overrides: {
          is_tercerizado: true,
          modo_subcontrato: 'fijo',
          costo_total_base: foundFreq.costo_total_base || 0,
          margen_tercerizado: 30,
        incluye_en_logistica: false
        }
      };
    } else if (foundDb) {
      newItem = {
        id: crypto.randomUUID(),
        tension: foundDb.tension || '500 kV',
        equipo: foundDb.equipo,
        cantidad: qty,
        baseData: structuredClone(foundDb)
      };
    } else {
      // Texto libre en buscador
      newItem = {
        id: crypto.randomUUID(),
        tension: 'N/A',
        equipo: query,
        cantidad: qty,
        baseData: {
          equipo: query,
          tension: 'N/A',
          horas_equipo: 0,
          horas_servicio: 0,
          interno: 0,
          ayudante: 0,
          externo: 0,
          costo_total_base: 0
        },
        overrides: {
          is_tercerizado: true,
          modo_subcontrato: 'fijo',
          costo_total_base: 0,
          margen_tercerizado: 30
        }
      };
    }

    setCart(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchCantidad(1);
    setIsDirty(true);
    showFeedbackToast(`${qty}x ${newItem.equipo} agregado.`);
  };

  // ============================================================================
  // CAPA 3: BOTONES DE MACRO / PLANTILLAS FRONT-END
  // Los precios de estos templates se gestionan en catalogoMacros.js
  // ============================================================================
  const handleInjectMacroPaqueteTrafo = () => {
    const itemsMacro = buildMacroPaqueteTrafo(30);
    setCart(prev => [...prev, ...itemsMacro]);
    setIsDirty(true);
    showFeedbackToast(`Paquete Mantenimiento Trafo inyectado (${itemsMacro.length} ítems).`);
  };

  const handleInjectMacroPCPCompleto = () => {
    const itemsMacro = buildMacroPCPCompleto(30);
    setCart(prev => [...prev, ...itemsMacro]);
    setIsDirty(true);
    showFeedbackToast(`Mantenimiento Integral PCP (${itemsMacro.length} ítems) inyectado.`);
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
    
    // P8: Fallback explícito — costo en 0 y flag de revisión para que no pase desapercibido
    let needsPriceReview = false;
    if (!equipData) {
      needsPriceReview = true;
      equipData = {
        tension: item.tension,
        equipo: item.equipo,
        horas_equipo: 4,
        horas_servicio: 4,
        interno: 1,
        ayudante: 1,
        externo: 0,
        costo_total_base: 0  // 0 en lugar de 1.000.000 — fuerza al operador a revisar
      };
    }
    
    const newCartItem = {
      id: crypto.randomUUID(),
      tension: item.tension,
      equipo: item.equipo, // Keep the unifilar name for UI
      cantidad: item.cantidad,
      baseData: structuredClone(equipData),
      ...(needsPriceReview && { needsPriceReview: true }) // Flag para marcado visual
    };

    setCart(prev => [...prev, newCartItem]);
    setIsDirty(true);

    if (needsPriceReview) {
      // Toast de advertencia con instrucción clara — no bloquea el flujo
      showFeedbackToast(`${item.equipo} no está en el catálogo. Costo en Gs. 0 — revisá el precio en el modal de edición antes de cotizar.`);
    } else {
      showFeedbackToast(`${item.cantidad}x ${item.equipo} (${item.tension}) agregado al carrito.`);
    }
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
      horas_servicio: item.overrides?.horas_servicio ?? item.baseData?.horas_servicio ?? item.overrides?.horas_equipo ?? item.baseData?.horas_equipo ?? 4,
      interno: item.overrides?.interno ?? item.baseData?.interno ?? 1,
      ayudante: item.overrides?.ayudante ?? item.baseData?.ayudante ?? 1,
      externo: item.overrides?.externo ?? item.baseData?.externo ?? 0,
      costo_total_base: item.overrides?.costo_total_base ?? item.baseData?.costo_total_base ?? 0,
      is_tercerizado: item.overrides?.is_tercerizado ?? false,
      margen: item.overrides?.margen ?? 50,
      margen_tercerizado: item.overrides?.margen_tercerizado ?? 30,
      incluye_en_logistica: item.overrides?.incluye_en_logistica ?? false,
      modo_subcontrato: item.overrides?.modo_subcontrato ?? 'fijo',
      sub_esp_cant: item.overrides?.sub_esp_cant ?? 1,
      sub_esp_costo_dia: item.overrides?.sub_esp_costo_dia ?? 450000,
      sub_esp_dias: item.overrides?.sub_esp_dias ?? 1,
      sub_aux_cant: item.overrides?.sub_aux_cant ?? 1,
      sub_aux_costo_dia: item.overrides?.sub_aux_costo_dia ?? 250000,
      sub_aux_dias: item.overrides?.sub_aux_dias ?? 1,
      top_down_enabled: item.overrides?.top_down_enabled ?? false,
      valor_inyectado: item.overrides?.valor_inyectado ?? 0,
      costoServiceFee: item.overrides?.costoServiceFee ?? 0,
      margenServiceFee: item.overrides?.margenServiceFee ?? 0,
      costoAmortizacion: item.overrides?.costoAmortizacion ?? 0,
      margenAmortizacion: item.overrides?.margenAmortizacion ?? 0,
      modoUso: item.overrides?.modoUso ?? 'Activa'
    });
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const saveOverrides = () => {
    const costoSubcontratoEfectivo = overrideState.is_tercerizado && overrideState.modo_subcontrato === 'jornal'
      ? ((Number(overrideState.sub_esp_cant) || 0) * (Number(overrideState.sub_esp_costo_dia) || 0) * (Number(overrideState.sub_esp_dias) || 0)) +
        ((Number(overrideState.sub_aux_cant) || 0) * (Number(overrideState.sub_aux_costo_dia) || 0) * (Number(overrideState.sub_aux_dias) || 0))
      : Number(overrideState.costo_total_base) || 0;

    const finalOverrides = {
      ...overrideState,
      costo_total_base: overrideState.is_tercerizado ? costoSubcontratoEfectivo : overrideState.costo_total_base,
      top_down_enabled: overrideState.is_tercerizado ? false : overrideState.top_down_enabled,
      is_tercerizado: overrideState.top_down_enabled ? false : overrideState.is_tercerizado
    };
    setCart(prev => prev.map(item => 
      item.id === editingItem 
        ? { ...item, overrides: structuredClone(finalOverrides), needsPriceReview: false } 
        : item
    ));
    setIsDirty(true);
    closeEditModal();
  };

  const handleSaveAdHoc = async () => {
    if (!adHocState.equipo) {
      showFeedbackToast('Ingresá un nombre para el equipo antes de guardar.');
      return;
    }
    
    const costoSubcontratoEfectivo = adHocState.is_tercerizado && adHocState.modo_subcontrato === 'jornal'
      ? ((Number(adHocState.sub_esp_cant) || 0) * (Number(adHocState.sub_esp_costo_dia) || 0) * (Number(adHocState.sub_esp_dias) || 0)) +
        ((Number(adHocState.sub_aux_cant) || 0) * (Number(adHocState.sub_aux_costo_dia) || 0) * (Number(adHocState.sub_aux_dias) || 0))
      : Number(adHocState.costo_total_base) || 0;

    const baseData = {
      equipo: adHocState.equipo, 
      tension: adHocState.tension, 
      horas_equipo: adHocState.horas_equipo,
      horas_servicio: adHocState.horas_servicio,
      interno: adHocState.interno, 
      ayudante: adHocState.ayudante, 
      externo: adHocState.externo,
      costo_total_base: costoSubcontratoEfectivo,
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
        horas_equipo: adHocState.horas_equipo,
        horas_servicio: adHocState.horas_servicio,
        modo_subcontrato: adHocState.modo_subcontrato,
        sub_esp_cant: Number(adHocState.sub_esp_cant) || 0,
        sub_esp_costo_dia: Number(adHocState.sub_esp_costo_dia) || 0,
        sub_esp_dias: Number(adHocState.sub_esp_dias) || 0,
        sub_aux_cant: Number(adHocState.sub_aux_cant) || 0,
        sub_aux_costo_dia: Number(adHocState.sub_aux_costo_dia) || 0,
        sub_aux_dias: Number(adHocState.sub_aux_dias) || 0,
        costo_total_base: costoSubcontratoEfectivo,
        margen_tercerizado: adHocState.margen_tercerizado,
          incluye_en_logistica: adHocState.incluye_en_logistica ?? false,
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
    setAlquileres([...alquileres, { id: crypto.randomUUID(), descripcion: '', costo: 0, margen: 30 }]);
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
  const totalEsfuerzoHoras = cart.reduce((sum, item) => sum + (item.cantidad * (item.overrides?.horas_servicio ?? item.overrides?.horas_equipo ?? item.baseData?.horas_servicio ?? item.baseData?.horas_equipo ?? 0)), 0);

  // Generar Cotización Consolidada para el Motor y el Panel Derecho
  const cotizacionGlobal = {
    Cliente: nombreCliente,
    NombreObra: nombreProyecto,
    Distancia_Ida_Vuelta_km: distanciaKm,
    Dias_Permitidos_Corte: diasPermitidosCorte,
    Total_Dias_Trabajo: totalEsfuerzoHoras / 8, // Reference for the top level only
    Precio_Mercado_Aplicado: 0,
    Gastos_Imprevistos: gastosImprevistos,
    Margen_Imprevistos_Porcentaje: margenImprevistosPorcentaje,
    condicionTrabajo: condicionTrabajo,
    aplicarGastosIndirectos: activeAplicarIndirectos,
    aplicarSSMAProvision: activeAplicarSSMA,
    porcentajeSSMAProvision: porcentajeSSMAProvision || 5,
    logisticsOverrides: activeLogisticsOverrides
  };

  const resultadosCalculados = useMemo(() => {
    return calcularCotizacionActiva({
      ...cotizacionGlobal,
      equiposCotizados: structuredClone(cart),
      alquileres: structuredClone(alquileres)
    });
  }, [nombreCliente, nombreProyecto, distanciaKm, diasPermitidosCorte, gastosImprevistos, margenImprevistosPorcentaje, condicionTrabajo, activeAplicarIndirectos, activeAplicarSSMA, porcentajeSSMAProvision, activeLogisticsOverrides, cart, alquileres]);

  const totalCostoTecnico = resultadosCalculados?.Precio_Venta_Final || 0;

  useEffect(() => {
    if (setTotalServicios) {
      setTotalServicios(totalCostoTecnico);
    }
    if (setDetalleServicios) {
      setDetalleServicios(resultadosCalculados?.equiposProcesados || []);
    }
    if (setResultadosSSTT) {
      setResultadosSSTT(resultadosCalculados);
    }
  }, [totalCostoTecnico, resultadosCalculados, setTotalServicios, setDetalleServicios, setResultadosSSTT]);

  const formatGs = (num) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(num);
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '20px' }}>
        <Zap color="#3b82f6" size={48} className="animate-pulse" />
        <h2 style={{ color: '#60a5fa' }}>Cargando Catálogo Maestro desde la nube...</h2>
      </div>
    );
  }

  // Local save logic removed (Delegated to EPCDashboard)

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

              <div style={{ background: 'rgba(0,0,0,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Modo de Despliegue Operativo
                </label>
                <select 
                  value={overrideState.modoUso} 
                  onChange={(e) => setOverrideState({...overrideState, modoUso: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}
                >
                  <option value="Activa">Operación Activa</option>
                  <option value="Reserva">Standby / Reserva en Campo</option>
                </select>
                {overrideState.modoUso === 'Reserva' && (
                  <p style={{ fontSize: '0.85rem', color: '#1e40af', marginTop: '10px' }}>
                    <strong>Modo Reserva:</strong> El costo de tecnología se cobrará al 30% (Inmovilización de Capital). La mano de obra y viáticos no se duplicarán para este ítem.
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
                    <td style={{ padding: '10px' }}>Horas Equipo (Uso de Tecnología)</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{item.baseData.horas_equipo ?? 4}</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" step="0.5" value={overrideState.horas_equipo} onChange={(e) => setOverrideState({...overrideState, horas_equipo: parseFloat(e.target.value)||0})} style={{ width: '100px' }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px' }}>Horas de Servicio (Personal)</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{item.baseData?.horas_servicio ?? item.baseData?.horas_equipo ?? 4}</td>
                    <td style={{ padding: '10px' }}>
                      <input type="number" step="0.5" value={overrideState.horas_servicio} onChange={(e) => setOverrideState({...overrideState, horas_servicio: parseFloat(e.target.value)||0})} style={{ width: '100px' }} />
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
                        <td style={{ padding: '10px' }}>Modalidad de Subcontrato</td>
                        <td colSpan="2" style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              type="button"
                              onClick={() => setOverrideState({...overrideState, modo_subcontrato: 'fijo'})}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: overrideState.modo_subcontrato === 'fijo' ? '#a855f7' : '#cbd5e1',
                                background: overrideState.modo_subcontrato === 'fijo' ? '#f3e8ff' : '#ffffff',
                                color: overrideState.modo_subcontrato === 'fijo' ? '#7e22ce' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              Suma Alzada (Monto Fijo)
                            </button>
                            <button 
                              type="button"
                              onClick={() => setOverrideState({...overrideState, modo_subcontrato: 'jornal'})}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: '1px solid',
                                borderColor: overrideState.modo_subcontrato === 'jornal' ? '#a855f7' : '#cbd5e1',
                                background: overrideState.modo_subcontrato === 'jornal' ? '#f3e8ff' : '#ffffff',
                                color: overrideState.modo_subcontrato === 'jornal' ? '#7e22ce' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              Por Jornal (Especialista + Auxiliar)
                            </button>
                          </div>
                        </td>
                      </tr>

                      {overrideState.modo_subcontrato === 'jornal' ? (
                        <tr>
                          <td colSpan="3" style={{ padding: '12px', background: '#faf5ff', borderRadius: '8px', border: '1px dashed #d8b4fe' }}>
                            <div style={{ marginBottom: '10px', fontWeight: 700, color: '#7e22ce', fontSize: '0.9rem' }}>
                              Desglose de Personal Subcontratado
                            </div>
                            
                            {/* Especialista */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Téc. Especialista:</span>
                              <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Cant. Pers.</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={overrideState.sub_esp_cant} 
                                  onChange={e => setOverrideState({...overrideState, sub_esp_cant: parseInt(e.target.value) || 0})}
                                  style={{ width: '100%', padding: '6px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Gs. / Día</label>
                                <input 
                                  type="number" 
                                  step="10000"
                                  value={overrideState.sub_esp_costo_dia} 
                                  onChange={e => setOverrideState({...overrideState, sub_esp_costo_dia: parseFloat(e.target.value) || 0})}
                                  style={{ width: '100%', padding: '6px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Días</label>
                                <input 
                                  type="number" 
                                  step="0.5"
                                  value={overrideState.sub_esp_dias} 
                                  onChange={e => setOverrideState({...overrideState, sub_esp_dias: parseFloat(e.target.value) || 0})}
                                  style={{ width: '100%', padding: '6px' }}
                                />
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'right', marginBottom: '12px' }}>
                              Subtotal Especialistas: <strong>{formatGs((overrideState.sub_esp_cant || 0) * (overrideState.sub_esp_costo_dia || 0) * (overrideState.sub_esp_dias || 0))}</strong>
                            </div>

                            {/* Auxiliar */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Téc. Auxiliar / Ayudante:</span>
                              <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Cant. Pers.</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={overrideState.sub_aux_cant} 
                                  onChange={e => setOverrideState({...overrideState, sub_aux_cant: parseInt(e.target.value) || 0})}
                                  style={{ width: '100%', padding: '6px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Gs. / Día</label>
                                <input 
                                  type="number" 
                                  step="10000"
                                  value={overrideState.sub_aux_costo_dia} 
                                  onChange={e => setOverrideState({...overrideState, sub_aux_costo_dia: parseFloat(e.target.value) || 0})}
                                  style={{ width: '100%', padding: '6px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Días</label>
                                <input 
                                  type="number" 
                                  step="0.5"
                                  value={overrideState.sub_aux_dias} 
                                  onChange={e => setOverrideState({...overrideState, sub_aux_dias: parseFloat(e.target.value) || 0})}
                                  style={{ width: '100%', padding: '6px' }}
                                />
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'right', marginBottom: '12px' }}>
                              Subtotal Auxiliares: <strong>{formatGs((overrideState.sub_aux_cant || 0) * (overrideState.sub_aux_costo_dia || 0) * (overrideState.sub_aux_dias || 0))}</strong>
                            </div>

                            {/* Total Subcontratista Calculado */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3e8ff', padding: '8px 12px', borderRadius: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#7e22ce', fontSize: '0.9rem' }}>Costo Total Subcontratista Calculado:</span>
                              <span style={{ fontWeight: 800, color: '#581c87', fontSize: '1.05rem' }}>
                                {formatGs(
                                  ((overrideState.sub_esp_cant || 0) * (overrideState.sub_esp_costo_dia || 0) * (overrideState.sub_esp_dias || 0)) +
                                  ((overrideState.sub_aux_cant || 0) * (overrideState.sub_aux_costo_dia || 0) * (overrideState.sub_aux_dias || 0))
                                )}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td style={{ padding: '10px' }}>Costo Subcontratista (Gs)</td>
                          <td style={{ padding: '10px', color: '#64748b' }}>{formatGs(item.baseData.costo_total_base ?? 0)}</td>
                          <td style={{ padding: '10px' }}>
                            <input type="number" value={overrideState.costo_total_base} onChange={(e) => setOverrideState({...overrideState, costo_total_base: parseFloat(e.target.value)||0})} style={{ width: '150px' }} />
                          </td>
                        </tr>
                      )}

                      <tr>
                        <td style={{ padding: '10px', color: '#a855f7', fontWeight: 'bold' }}>
                          Markup sobre Costo (%)
                          <div style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginTop: '2px' }}>
                            Valor ingresado = ganancia sobre costo.<br/>
                            Margen s/venta ≈ {overrideState.margen_tercerizado > 0
                              ? ((1 - 1/(1 + overrideState.margen_tercerizado/100)) * 100).toFixed(1)
                              : '0.0'}%
                          </div>
                        </td>
                        <td style={{ padding: '10px', color: '#64748b' }}>N/A</td>
                        <td style={{ padding: '10px' }}>
                          <input type="number" value={overrideState.margen_tercerizado} onChange={(e) => setOverrideState({...overrideState, margen_tercerizado: parseFloat(e.target.value)||0})} style={{ width: '100px', borderColor: '#a855f7' }} />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="3" style={{ padding: '8px 10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="checkbox"
                              checked={overrideState.incluye_en_logistica ?? false}
                              onChange={(e) => setOverrideState({...overrideState, incluye_en_logistica: e.target.checked})}
                              style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                            />
                            <span style={{ color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={14} /> Incluir en prorrateo de logística</span>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>(default: NO)</span>
                          </label>
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
                            <span>Mano de Obra (Esp): {(((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4))/8).toFixed(2)}d × {overrideState.interno ?? 1} × Gs. {formatGs(COSTO_ESPECIALISTA_DIA).replace('Gs.', '').trim()}</span>
                            <span>{formatGs((((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4))/8) * (overrideState.interno ?? 1) * COSTO_ESPECIALISTA_DIA)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Mano de Obra (Aux): {(((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4))/8).toFixed(2)}d × {overrideState.ayudante ?? 1} × Gs. {formatGs(COSTO_AUXILIAR_DIA).replace('Gs.', '').trim()}</span>
                            <span>{formatGs((((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4))/8) * (overrideState.ayudante ?? 1) * COSTO_AUXILIAR_DIA)}</span>
                          </div>
                          {(overrideState.externo > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Mano de Obra (Ext): {(((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4))/8).toFixed(2)}d × {overrideState.externo} × Gs. {formatGs(COSTO_EXTERNO_DIA).replace('Gs.', '').trim()}</span>
                              <span>{formatGs((((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4))/8) * (overrideState.externo) * COSTO_EXTERNO_DIA)}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>Costo Técnico Calculado (Gs.)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>
                          {formatGs((item.baseData.horas_equipo ?? 4) * TARIFA_EQUIPOS_HORA + ((item.baseData.horas_servicio ?? item.baseData.horas_equipo ?? 4) / 8) * (item.baseData.interno ?? 1) * COSTO_ESPECIALISTA_DIA + ((item.baseData.horas_servicio ?? item.baseData.horas_equipo ?? 4) / 8) * (item.baseData.ayudante ?? 1) * COSTO_AUXILIAR_DIA)}
                        </td>
                        <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>
                          {formatGs((overrideState.horas_equipo ?? 4) * TARIFA_EQUIPOS_HORA + ((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4) / 8) * (overrideState.interno ?? 1) * COSTO_ESPECIALISTA_DIA + ((overrideState.horas_servicio ?? overrideState.horas_equipo ?? 4) / 8) * (overrideState.ayudante ?? 1) * COSTO_AUXILIAR_DIA)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>Margen de Ganancia Propia (%)</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>50% (Estándar)</td>
                        <td style={{ padding: '10px' }}>
                          <input 
                            type="number" 
                            value={overrideState.margen !== undefined ? overrideState.margen : 50} 
                            onChange={(e) => setOverrideState({...overrideState, margen: parseFloat(e.target.value)||0})} 
                            style={{ width: '100px', borderColor: '#10b981', fontWeight: 'bold' }} 
                          />
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
                  <td style={{ padding: '8px' }}>Horas Equipo (Tecnología)</td>
                  <td><input type="number" step="0.5" value={adHocState.horas_equipo} onChange={e => setAdHocState({...adHocState, horas_equipo: parseFloat(e.target.value)||0})} /></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px' }}>Horas de Servicio (Personal)</td>
                  <td><input type="number" step="0.5" value={adHocState.horas_servicio} onChange={e => setAdHocState({...adHocState, horas_servicio: parseFloat(e.target.value)||0})} /></td>
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
                      <td style={{ padding: '8px' }}>Modalidad Subcontrato</td>
                      <td style={{ padding: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button"
                            onClick={() => setAdHocState({...adHocState, modo_subcontrato: 'fijo'})}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: adHocState.modo_subcontrato === 'fijo' ? '#a855f7' : '#cbd5e1',
                              background: adHocState.modo_subcontrato === 'fijo' ? '#f3e8ff' : '#ffffff',
                              color: adHocState.modo_subcontrato === 'fijo' ? '#7e22ce' : '#64748b',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            Suma Alzada
                          </button>
                          <button 
                            type="button"
                            onClick={() => setAdHocState({...adHocState, modo_subcontrato: 'jornal'})}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: adHocState.modo_subcontrato === 'jornal' ? '#a855f7' : '#cbd5e1',
                              background: adHocState.modo_subcontrato === 'jornal' ? '#f3e8ff' : '#ffffff',
                              color: adHocState.modo_subcontrato === 'jornal' ? '#7e22ce' : '#64748b',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            Por Jornal (Personal)
                          </button>
                        </div>
                      </td>
                    </tr>

                    {adHocState.modo_subcontrato === 'jornal' ? (
                      <tr>
                        <td colSpan="2" style={{ padding: '10px', background: '#faf5ff', borderRadius: '8px', border: '1px dashed #d8b4fe' }}>
                          <div style={{ marginBottom: '8px', fontWeight: 700, color: '#7e22ce', fontSize: '0.85rem' }}>
                            Desglose de Personal Subcontratado
                          </div>
                          
                          {/* Especialista */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Téc. Especialista:</span>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Cant.</label>
                              <input 
                                type="number" 
                                min="0"
                                value={adHocState.sub_esp_cant} 
                                onChange={e => setAdHocState({...adHocState, sub_esp_cant: parseInt(e.target.value) || 0})}
                                style={{ width: '100%', padding: '4px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Gs./Día</label>
                              <input 
                                type="number" 
                                step="10000"
                                value={adHocState.sub_esp_costo_dia} 
                                onChange={e => setAdHocState({...adHocState, sub_esp_costo_dia: parseFloat(e.target.value) || 0})}
                                style={{ width: '100%', padding: '4px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Días</label>
                              <input 
                                type="number" 
                                step="0.5"
                                value={adHocState.sub_esp_dias} 
                                onChange={e => setAdHocState({...adHocState, sub_esp_dias: parseFloat(e.target.value) || 0})}
                                style={{ width: '100%', padding: '4px' }}
                              />
                            </div>
                          </div>

                          {/* Auxiliar */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Téc. Auxiliar:</span>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Cant.</label>
                              <input 
                                type="number" 
                                min="0"
                                value={adHocState.sub_aux_cant} 
                                onChange={e => setAdHocState({...adHocState, sub_aux_cant: parseInt(e.target.value) || 0})}
                                style={{ width: '100%', padding: '4px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Gs./Día</label>
                              <input 
                                type="number" 
                                step="10000"
                                value={adHocState.sub_aux_costo_dia} 
                                onChange={e => setAdHocState({...adHocState, sub_aux_costo_dia: parseFloat(e.target.value) || 0})}
                                style={{ width: '100%', padding: '4px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Días</label>
                              <input 
                                type="number" 
                                step="0.5"
                                value={adHocState.sub_aux_dias} 
                                onChange={e => setAdHocState({...adHocState, sub_aux_dias: parseFloat(e.target.value) || 0})}
                                style={{ width: '100%', padding: '4px' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3e8ff', padding: '6px 10px', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#7e22ce', fontSize: '0.85rem' }}>Total Calculado:</span>
                            <span style={{ fontWeight: 800, color: '#581c87', fontSize: '0.95rem' }}>
                              {formatGs(
                                ((adHocState.sub_esp_cant || 0) * (adHocState.sub_esp_costo_dia || 0) * (adHocState.sub_esp_dias || 0)) +
                                ((adHocState.sub_aux_cant || 0) * (adHocState.sub_aux_costo_dia || 0) * (adHocState.sub_aux_dias || 0))
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td style={{ padding: '8px' }}>Costo Subcontratista (Gs)</td>
                        <td><input type="number" value={adHocState.costo_total_base} onChange={e => setAdHocState({...adHocState, costo_total_base: parseFloat(e.target.value)||0})} /></td>
                      </tr>
                    )}

                    <tr>
                      <td style={{ padding: '8px', color: '#a855f7' }}>
                        Markup sobre Costo (%)
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                          Margen s/venta ≈ {adHocState.margen_tercerizado > 0
                            ? ((1 - 1/(1 + adHocState.margen_tercerizado/100)) * 100).toFixed(1)
                            : '0.0'}%
                        </div>
                      </td>
                      <td><input type="number" value={adHocState.margen_tercerizado} onChange={e => setAdHocState({...adHocState, margen_tercerizado: parseFloat(e.target.value)||0})} style={{ borderColor: '#a855f7' }}/></td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ padding: '6px 8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input
                            type="checkbox"
                            checked={adHocState.incluye_en_logistica ?? false}
                            onChange={e => setAdHocState({...adHocState, incluye_en_logistica: e.target.checked})}
                            style={{ width: '15px', height: '15px', accentColor: '#0284c7' }}
                          />
                          <span style={{ color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Truck size={14} /> Incluir en prorrateo de logística</span>
                        </label>
                      </td>
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

      <main className="main-content" style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '30px', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA: MESA DE TRABAJO (60-70%) */}
        <div className="left-panel flex flex-col gap-5">
          
          {/* NAVEGACIÓN DE PESTAÑAS INTERNAS (Segmented Control / Material Tabs) */}
          <div className="flex bg-slate-100 p-1 rounded-t-xl border border-slate-200 border-b-0 w-max mb-[-1px] relative z-10">
            <button
              type="button"
              onClick={() => setActiveTab('carrito')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'carrito'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Calculator size={16} />
              <span>Carrito Técnico y Ensayos</span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                activeTab === 'carrito' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {cart.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logistica')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'logistica'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Truck size={16} />
              <span>Logística e Indirectos</span>
              {activeAplicarIndirectos && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold">
                  {distanciaKm} km
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: CARRITO TÉCNICO Y ENSAYOS */}
          {activeTab === 'carrito' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-tl-none overflow-hidden p-6 relative">
              
              {/* Header con Acciones Principales */}
              <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Calculator size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 m-0">Carrito Técnico & Selección Rápida</h2>
                    <span className="text-xs text-slate-500">Sistema de 3 Capas: Macros, Catálogo a la Carta e Ingreso Manual</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    type="button"
                    onClick={handleAddManualItem} 
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Agregar una partida libre donde puedes tipear descripción y costo unitario pactado"
                  >
                    <Plus size={14} className="text-slate-500" /> + Ítem Manual
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCatalogModal(true)} 
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Abrir configurador visual por diagrama unifilar"
                  >
                    <Layout size={14} className="text-slate-500" /> Unifilar
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAdHocModal(true)} 
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Crear ítem con configuración completa y opción de guardar en Firestore"
                  >
                    <PackagePlus size={14} className="text-slate-500" /> Ítem Ad-Hoc
                  </button>
                </div>
              </div>

              {/* TOAST FEEDBACK NOTIFICATION */}
              {toastMsg && (
                <div className="absolute top-3 right-5 bg-slate-900 text-sky-400 px-4 py-2 rounded-lg text-xs font-semibold shadow-lg z-10 flex items-center gap-2 animate-fade-in">
                  <Sparkles size={15} /> {toastMsg}
                </div>
              )}

              {/* ========================================================================= */}
              {/* CAPA 3: BARRA DE PLANTILLAS RÁPIDAS (MACROS FRONT-END) */}
              {/* ========================================================================= */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-slate-200/70 flex items-center justify-center text-slate-700">
                    <Zap size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Plantillas Rápidas
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Inyección masiva de paquetes técnicos directo al estado
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleInjectMacroPaqueteTrafo}
                    className="bg-slate-800 hover:bg-slate-700 text-white shadow-sm rounded-lg text-xs font-semibold px-3.5 py-2 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Inyecta 1x Ensayo Físico-Químico, 1x Cromatografía y 1x Extracción de Muestra de Aceite"
                  >
                    <Zap size={14} className="text-amber-400" /> Paquete Mantenimiento Trafo
                  </button>

                  <button
                    type="button"
                    onClick={handleInjectMacroPCPCompleto}
                    className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-sm rounded-lg text-xs font-semibold px-3 py-2 flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Inyecta los 5 puntos del PCP: Ensayos, Cromatografía, Limpiezas, Pruebas y Toma de Muestra"
                  >
                    <Sparkles size={14} className="text-slate-500" /> Mantenimiento Integral PCP (5 Ptos)
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* CAPA 2: CATÁLOGO A LA CARTA (Buscador <datalist>) */}
              {/* ========================================================================= */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-slate-600 text-xs font-bold shrink-0">
                  <Search size={15} className="text-slate-500" />
                  <span>A la Carta:</span>
                </div>

                <div className="flex-1 min-w-[200px] relative">
                  <input
                    type="text"
                    list="sstt-catalog-datalist"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFromDatalist();
                      }
                    }}
                    placeholder="Busca: Ensayo Físico-Químico, Cromatografía, Aceite Dieléctrico..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-8"
                  />
                  <Search size={14} className="text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <datalist id="sstt-catalog-datalist">
                    <option value="Ensayo Físico - Químico de aceite aislante según normas ASTM y IEC" />
                    <option value="Análisis de gases disueltos por cromatografía" />
                    <option value="Extracción de muestra de aceite mineral aislante para ensayo" />
                    <option value="Limpiezas, mantenimientos, ajustes y controles de Trafo" />
                    <option value="Mediciones, verificaciones y pruebas eléctricas de Trafo" />
                    <option value="Tratamiento y Termovacío de Aceite Dieléctrico en Trafo" />
                    <option value="Suministro de Aceite Dieléctrico Mineral (Tambor 200L)" />
                    <option value="Inspección Termográfica Infrarroja de Subestación" />
                    {catalogoSugerencias.dbItems.map((dbIt, idx) => (
                      <option key={`db-${idx}`} value={dbIt.label} />
                    ))}
                  </datalist>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-medium">Cant:</span>
                    <input
                      type="number"
                      min="1"
                      value={searchCantidad}
                      onChange={(e) => setSearchCantidad(e.target.value)}
                      className="w-12 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 text-center font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFromDatalist}
                    disabled={!searchQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* LISTA DEL CARRITO TÉCNICO (CON EDICIÓN INLINE CAPA 1) */}
              {/* ========================================================================= */}
              <div style={{ maxHeight: '48vh', overflowY: 'auto' }} className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {resultadosCalculados.equiposProcesados.length === 0 ? (
                  <div className="py-10 px-4 text-center bg-slate-50/70 rounded-lg">
                    <PackagePlus size={36} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 mb-1">El carrito está vacío.</p>
                    <p className="text-xs text-slate-500 m-0">
                      Usa <strong>Paquete Mantenimiento Trafo</strong>, el buscador <strong>A la Carta</strong> o <strong>+ Ítem Manual</strong> para comenzar.
                    </p>
                  </div>
                ) : (
                  resultadosCalculados.equiposProcesados.map((item, index) => {
                    const isTerc = item.overrides?.is_tercerizado;
                    const costoDirecto = isTerc ? (item.overrides?.costo_total_base ?? item.baseData?.costo_total_base ?? 0) : item.costo_directo_unitario;

                    return (
                      <div 
                        key={item.id || index} 
                        className="bg-white p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Cantidad & Descripción */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <input 
                              type="number" 
                              value={item.cantidad} 
                              min="1"
                              onChange={(e) => updateQuantity(item.id, e.target.value)}
                              className="w-12 p-1 rounded border border-slate-300 text-center font-bold text-xs bg-white text-slate-800"
                              title="Cantidad de unidades"
                            />
                            
                            {/* Input de descripción editable inline */}
                            <input
                              type="text"
                              value={item.equipo}
                              onChange={(e) => updateItemName(item.id, e.target.value)}
                              className={`flex-1 font-bold text-sm px-2 py-0.5 rounded border transition-colors ${
                                item.needsPriceReview 
                                  ? 'border-orange-400 bg-orange-50 text-orange-800' 
                                  : 'border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent text-slate-800'
                              }`}
                              title="Haz clic para editar la descripción"
                            />

                            {/* Badges */}
                            <div className="flex gap-1.5 flex-wrap">
                              {isTerc && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                                  {item.overrides?.modo_subcontrato === 'jornal'
                                    ? `Jornal (${(item.overrides.sub_esp_cant || 0) + (item.overrides.sub_aux_cant || 0)}p)`
                                    : 'SSTT Flat'}
                                </span>
                              )}
                              {item.overrides?.top_down_enabled && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">Top-Down</span>
                              )}
                              {item.overrides?.modoUso === 'Reserva' && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">Reserva</span>
                              )}
                              {isItemModified(item) && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">Modificado</span>
                              )}
                              {item.needsPriceReview && (
                                <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1"
                                  title="Este ítem no está en el catálogo. El costo es Gs. 0 — abrí el modal de edición para ajustar el precio antes de enviar la cotización.">
                                  <ShieldAlert size={10} /> COSTO PENDIENTE
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Fila de Tensión y Costo Unitario Pactado */}
                          <div className="flex items-center gap-3 text-xs text-slate-500 pl-14">
                            <span>{item.tension || 'N/A'}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              <span>Costo Unit. Pactado:</span>
                              <input
                                type="number"
                                value={costoDirecto}
                                onChange={(e) => updateItemCosto(item.id, e.target.value)}
                                className="w-24 px-1.5 py-0.5 text-xs rounded border border-slate-300 bg-slate-50 font-semibold text-slate-800"
                                title="Costo unitario directo o de subcontratista pactado (Gs.)"
                              />
                              <span>Gs.</span>
                            </div>
                          </div>
                        </div>

                        {/* Total y Acciones */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="block text-sm font-extrabold text-slate-900">
                              {formatGs(item.precio_total_final)}
                            </span>
                            <span className="text-[11px] text-slate-500">P. Venta Total</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => openEditModal(item)} 
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer" 
                            title="Configuración avanzada / Override"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => removeItem(item.id)} 
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar del carrito"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* FOOTER DEL CARRITO: TOGGLE PROVISIÓN SSMA Y CONSUMIBLES (5% PARETO) */}
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex justify-between items-center flex-wrap gap-3 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeAplicarSSMA ? 'bg-emerald-100/70 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Aplicar Provisión Estándar de SSMA y Consumibles
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        5% Pareto
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {activeAplicarSSMA
                        ? `EPP, guantes, trapos y seguridad industrial calculados automáticamente (${formatGs(resultadosCalculados?.Costo_SSMA_Consumibles || 0)})`
                        : 'Provisión desactivada (0 Gs.)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeAplicarSSMA && (
                    <span className="text-xs font-bold text-emerald-700">
                      +{formatGs(resultadosCalculados?.Costo_SSMA_Consumibles || 0)}
                    </span>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer m-0">
                    <input
                      type="checkbox"
                      checked={activeAplicarSSMA}
                      onChange={(e) => {
                        updateAplicarSSMA(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: LOGÍSTICA E INDIRECTOS */}
          {activeTab === 'logistica' && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl rounded-tl-none overflow-hidden p-6 relative">
              
              {/* Cabecera con Switch On/Off */}
              <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeAplicarIndirectos ? 'bg-blue-50 border border-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 m-0">
                      Centro de Control de Gastos Indirectos
                    </h2>
                    <span className="text-xs text-slate-500">
                      {activeAplicarIndirectos ? 'Logística, viáticos, hospedaje, imprevistos y alquileres especiales' : 'Desactivado (0 Gs / 0 USD para cotizaciones de terceros)'}
                    </span>
                  </div>
                </div>

                {/* SWITCH / TOGGLE */}
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">
                    {activeAplicarIndirectos ? 'Gastos Indirectos Activos' : 'Centro en Cero'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer m-0">
                    <input
                      type="checkbox"
                      checked={activeAplicarIndirectos}
                      onChange={(e) => {
                        updateAplicarIndirectos(e.target.checked);
                        setIsDirty(true);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Banner explicativo cuando está en cero */}
              {!activeAplicarIndirectos && (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-3.5 rounded-lg mb-5 flex items-start gap-3">
                  <ShieldAlert size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong>Modo Servicios Tercerizados / Sin Despliegue Propio:</strong> La logística, viáticos, hospedajes, peajes e imprevistos están anulados en <strong>0 Gs.</strong> para que el precio de venta refleje exactamente la cotización directa de terceros sin recargos operativos internos.
                  </div>
                </div>
              )}
              
              {/* Contenido condicionado con opacidad visual */}
              <div className={`transition-opacity duration-200 ${activeAplicarIndirectos ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                {/* Parámetros Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Distancia ida/vuelta (km)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={distanciaKm} 
                      onChange={(e) => { setDistanciaKm(parseFloat(e.target.value) || 0); setIsDirty(true); }} 
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Días Permitidos (Corte)</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={diasPermitidosCorte} 
                      onChange={(e) => { setDiasPermitidosCorte(parseInt(e.target.value) || 1); setIsDirty(true); }} 
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Condición de Trabajo / Ventana de Corte (Multiplicador de Riesgo)</label>
                  <select 
                    value={condicionTrabajo} 
                    onChange={(e) => { setCondicionTrabajo(parseFloat(e.target.value)); setIsDirty(true); }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                  >
                    <option value={1.0}>Normal / Obra Nueva (1.0x)</option>
                    <option value={1.2}>Ventana Nocturna Estándar (1.2x)</option>
                    <option value={1.5}>Ventana Crítica / Tiempo Restringido (1.5x)</option>
                    <option value={2.0}>Instalación Energizada (2.0x)</option>
                  </select>
                </div>

                {/* Modal Logistico Button */}
                <div className="mb-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <strong className="block text-xs font-bold text-slate-800">Auditoría Logística y RRHH</strong>
                    <span className="text-[11px] text-slate-500">Ajusta viáticos, hospedaje y movilidad</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowLogisticsModal(true)} 
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Settings size={14} className="text-slate-500" /> Configuración {activeLogisticsOverrides?.enabled ? '(Manual)' : '(Auto)'}
                  </button>
                </div>

                {/* Imprevistos & Gastos Admin */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gastos Imprevistos Fijos (Gs.)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={gastosImprevistos} 
                      onChange={(e) => { setGastosImprevistos(parseFloat(e.target.value) || 0); setIsDirty(true); }} 
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Margen Adicional Imprevistos (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={margenImprevistosPorcentaje} 
                      onChange={(e) => { setMargenImprevistosPorcentaje(parseFloat(e.target.value) || 0); setIsDirty(true); }} 
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Gastos Adm. y Financieros (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={gastosAdminFinancieroPct}
                      onChange={(e) => { setGastosAdminFinancieroPct(parseFloat(e.target.value) || 0); setIsDirty(true); }}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                    />
                    <small className="text-[10px] text-slate-500 block mt-1 leading-tight">
                      S/ P. Venta. Default: 6%.
                    </small>
                  </div>
                </div>
              </div>

              {/* Alquileres Especiales (Siempre accesibles como partida independiente) */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <label className="block mb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">Servicios de Apoyo y Alquileres (Grúas, Fletes)</label>
                {alquileres.map((alq) => {
                  const margenDecimal = Math.min(0.99, Math.max(0, (alq.margen ?? 30) / 100));
                  const precioEstimado = margenDecimal < 1 ? (alq.costo / (1 - margenDecimal)) : alq.costo;
                  const margenSVenta = precioEstimado > 0 ? ((1 - alq.costo / precioEstimado) * 100) : 0;
                  return (
                    <div key={alq.id} className="mb-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        <input 
                          type="text" 
                          placeholder="Descripción (ej: Grúa, Flete, Andamio)" 
                          value={alq.descripcion} 
                          onChange={e => updateAlquiler(alq.id, 'descripcion', e.target.value)} 
                          className="flex-[2_1_180px] min-w-[140px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800"
                        />
                        <input 
                          type="number" 
                          placeholder="Costo (Gs)" 
                          value={alq.costo} 
                          onChange={e => updateAlquiler(alq.id, 'costo', parseFloat(e.target.value) || 0)} 
                          className="flex-[1_1_120px] min-w-[100px] px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold"
                        />
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              placeholder="30"
                              value={alq.margen ?? 30}
                              onChange={e => updateAlquiler(alq.id, 'margen', parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-center font-bold text-slate-800"
                              title="Margen sobre precio de venta (%)"
                            />
                            <span className="text-xs text-slate-500 font-bold">%</span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">Margen s/Venta</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeAlquiler(alq.id)} 
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {alq.costo > 0 && (
                        <div className="flex gap-4 mt-2 pt-2 border-t border-dashed border-slate-200 text-xs text-slate-600 flex-wrap">
                          <span>Costo: <strong className="text-slate-800">{formatGs(alq.costo)}</strong></span>
                          <span>P. Venta estimado: <strong className="text-blue-700">{formatGs(Math.round(precioEstimado))}</strong></span>
                          <span>Ganancia: <strong className="text-emerald-600">+{formatGs(Math.round(precioEstimado - alq.costo))}</strong></span>
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{margenSVenta.toFixed(1)}% margen</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                  <button 
                    type="button"
                    onClick={addAlquiler} 
                    className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} /> Agregar Alquiler
                  </button>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500">Costo total: <strong className="text-slate-800">{formatGs(alquileres.reduce((sum, a) => sum + (a.costo || 0), 0))}</strong></span>
                    <span className="text-blue-600">P. Venta total: <strong className="text-blue-700">{formatGs(alquileres.reduce((sum, a) => { const md = Math.min(0.99, Math.max(0, (a.margen ?? 30) / 100)); return sum + (md < 1 ? (a.costo / (1 - md)) : a.costo); }, 0))}</strong></span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: WORKFLOW / CÁLCULO FINAL (40%) */}
        <div className="right-panel sticky top-4 flex flex-col gap-5">
          
          {/* CRM Financial Panel */}
          <div>
            <CRMFinancialPanelV2 
              resultados={resultadosCalculados} 
              cotizacion={cotizacionGlobal} 
              equiposCotizados={resultadosCalculados.equiposProcesados} 
              alquileres={alquileres} 
            />
          </div>

        </div>
      </main>

      <UnifilarConfigurator 
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onAddToCart={handleAddToCartFromUnifilar} 
        dbEquipments={maestroData} 
      />

      <LogisticsModal 
        isOpen={showLogisticsModal} 
        onClose={() => setShowLogisticsModal(false)} 
        resultados={resultadosCalculados}
        currentOverrides={activeLogisticsOverrides}
        onSave={(newOverrides) => { updateLogisticsOverrides(newOverrides); setIsDirty(true); }}
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
                  if (!nombreCliente || !nombreProyecto) {
                    alert("Por favor, ingresa el Cliente y Nombre de la Obra para poder guardar.");
                    return;
                  }
                  await onGuardar();
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
