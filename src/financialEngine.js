// ============================================================================
// MOTOR FINANCIERO Y LOGÍSTICO (Modelo de Absorción Total - Full Absorption)
// Fórmula de Rentabilidad Core: Precio_Venta = Costo_Total_Absorbido / (1 - Margen)
// ============================================================================

export const Maestro_Precios_Mercado = {
  Transformadores: {
    'Cat_A_Menor_30MVA': { Preventivo: 25000000, Integral: 50000000 },
    'Cat_B_30_a_100MVA': { Preventivo: 38000000, Integral: 75000000 },
    'Cat_C_Mayor_100MVA': { Preventivo: 55000000, Integral: 110000000 }
  }
};

// 1. Constantes Financieras Inamovibles
export const COSTO_ESPECIALISTA_DIA = 374500;
export const COSTO_AUXILIAR_DIA = 208056;
export const COSTO_EXTERNO_DIA = 250000; // Tarifa plana sin cargas sociales
export const TARIFA_EQUIPOS_HORA = 312500;
export const TARIFA_VIATICO_DIA = 120000;
export const TARIFA_HOSPEDAJE_DIA = 200000;

export const Variables_Globales = {
  Gastos_Administrativos_Porcentaje: 3,
  Margen_Ganancia_MO_Propia: 50, // 50% margen sobre venta (equivalente a 100% markup sobre costo)
  Margen_Ganancia_Logistica: 30, // 30% margen sobre venta
  MARGEN_TECNOLOGIA: 0.40, // 40% margen sobre venta
};

export const calcularCotizacionActiva = (cotizacion) => {
  const aplicarGastosIndirectos = cotizacion.aplicarGastosIndirectos !== false;
  const Dias_Permitidos_Corte = Math.max(1, Number(cotizacion.Dias_Permitidos_Corte) || 1);
  const Distancia_Ida_Vuelta_km = Number(cotizacion.Distancia_Ida_Vuelta_km) || 0;
  
  const condicionTrabajo = Number(cotizacion.condicionTrabajo) || 1.0;
  const Gastos_Imprevistos = aplicarGastosIndirectos ? ((Number(cotizacion.Gastos_Imprevistos) || 0) * condicionTrabajo) : 0;
  const Margen_Imprevistos_Porcentaje = aplicarGastosIndirectos ? (Number(cotizacion.Margen_Imprevistos_Porcentaje) || 0) : 0;
  const Precio_Mercado_Aplicado = Number(cotizacion.Precio_Mercado_Aplicado) || 0;

  const equiposCotizados = cotizacion.equiposCotizados || [];
  const alquileres = cotizacion.alquileres || [];

  // 1. ACUMULADORES DE COSTOS DIRECTOS BASE
  let Costo_Tecnologia_Total = 0;
  let Costo_MO_Especialistas_Total = 0;
  let Costo_MO_Auxiliares_Total = 0;
  let Costo_MO_Externos_Total = 0;
  let Costo_Subcontratistas_Total = 0;
  let Costo_ServiceFee_Total = 0;
  let Costo_Amortizacion_Total = 0;
  
  let Total_Dias_Esfuerzo = 0;
  let Cantidad_Trafos = 0;
  let Cantidad_Equipos_TopDown = 0;
  let Precio_Mercado_Total_Trafos = 0;

  // Paso 1.1: Pre-calcular costos directos puros por ítem
  const itemsDirectosCrudos = equiposCotizados.map(item => {
    const isTercerizado = item.overrides?.is_tercerizado === true;
    const isTopDown = item.overrides?.top_down_enabled === true; 
    const qty = Number(item.cantidad) || 1;

    const textoBusqueda = `${item.baseData?.equipo || ''} ${item.equipo || ''}`.toLowerCase();
    const esInstrumentoOParche = textoBusqueda.includes('potencial') || textoBusqueda.includes('corriente') || textoBusqueda.includes('medida') || textoBusqueda.includes('tensión') || textoBusqueda.includes('tension') || textoBusqueda.includes('servicios') || textoBusqueda.includes('reactor') || textoBusqueda.includes('batería') || textoBusqueda.includes('bateria');
    const esRealmenteTrafo = (textoBusqueda.includes('transformador') || textoBusqueda.includes('autotransformador')) && !esInstrumentoOParche;

    const costoFee = Number(item.overrides?.costoServiceFee ?? 0);
    const costoAmort = Number(item.overrides?.costoAmortizacion ?? 0);

    const horas_equipo = isTercerizado ? 0 : Number(item.overrides?.horas_equipo ?? item.baseData?.horas_equipo ?? 0);
    const horas_servicio = isTercerizado ? 0 : Number(item.overrides?.horas_servicio ?? item.baseData?.horas_servicio ?? item.overrides?.horas_equipo ?? item.baseData?.horas_equipo ?? 0);
    const especialistas_internos = item.overrides?.interno ?? item.baseData?.interno ?? 1;
    const auxiliares = item.overrides?.ayudante ?? item.baseData?.ayudante ?? 0;
    const externos = item.overrides?.externo ?? item.baseData?.externo ?? 0;

    const isReserva = item.overrides?.modoUso === 'Reserva';
    const factorReserva = isReserva ? 0.3 : 1.0;

    const Costo_Tecnologia = horas_equipo * TARIFA_EQUIPOS_HORA * factorReserva;
    const Costo_MO_Esp = isReserva ? 0 : (horas_servicio / 8) * especialistas_internos * COSTO_ESPECIALISTA_DIA;
    const Costo_MO_Aux = isReserva ? 0 : (horas_servicio / 8) * auxiliares * COSTO_AUXILIAR_DIA;
    const Costo_MO_Ext = isReserva ? 0 : (horas_servicio / 8) * externos * COSTO_EXTERNO_DIA;
    const Costo_MO_Item = Costo_MO_Esp + Costo_MO_Aux + Costo_MO_Ext;

    let Costo_Subcontrato_Item = 0;
    let modo_subcontrato = 'fijo';
    let sub_esp_cant = 0, sub_esp_costo_dia = 0, sub_esp_dias = 0;
    let sub_aux_cant = 0, sub_aux_costo_dia = 0, sub_aux_dias = 0;

    if (isTercerizado) {
      modo_subcontrato = item.overrides?.modo_subcontrato || 'fijo';
      if (modo_subcontrato === 'jornal') {
        sub_esp_cant = Number(item.overrides?.sub_esp_cant) || 0;
        sub_esp_costo_dia = Number(item.overrides?.sub_esp_costo_dia) || 0;
        sub_esp_dias = Number(item.overrides?.sub_esp_dias) || 0;
        sub_aux_cant = Number(item.overrides?.sub_aux_cant) || 0;
        sub_aux_costo_dia = Number(item.overrides?.sub_aux_costo_dia) || 0;
        sub_aux_dias = Number(item.overrides?.sub_aux_dias) || 0;
        Costo_Subcontrato_Item = (sub_esp_cant * sub_esp_costo_dia * sub_esp_dias) + (sub_aux_cant * sub_aux_costo_dia * sub_aux_dias);
      } else {
        Costo_Subcontrato_Item = Number(item.overrides?.costo_total_base ?? item.baseData?.costo_total_base) || 0;
      }
    }

    const valorInyectadoItem = Number(item.overrides?.valor_inyectado) || 0;

    const Costo_Directo_Unitario = isTercerizado 
      ? (Costo_Subcontrato_Item + costoFee + costoAmort)
      : (Costo_Tecnologia + Costo_MO_Item + costoFee + costoAmort);
    
    const Costo_Directo_Total_Item = Costo_Directo_Unitario * qty;

    // Acumuladores
    if (isTercerizado) {
      Costo_Subcontratistas_Total += Costo_Subcontrato_Item * qty;
    } else {
      Costo_Tecnologia_Total += Costo_Tecnologia * qty;
      Costo_MO_Especialistas_Total += Costo_MO_Esp * qty;
      Costo_MO_Auxiliares_Total += Costo_MO_Aux * qty;
      Costo_MO_Externos_Total += Costo_MO_Ext * qty;
      if (!isReserva) {
        Total_Dias_Esfuerzo += ((horas_servicio / 8) * (especialistas_internos + auxiliares + externos)) * qty;
      }
      if (esRealmenteTrafo) Cantidad_Trafos += qty;
    }

    Costo_ServiceFee_Total += costoFee * qty;
    Costo_Amortizacion_Total += costoAmort * qty;

    if (isTopDown && valorInyectadoItem > 0) {
      Precio_Mercado_Total_Trafos += valorInyectadoItem * qty;
      Cantidad_Equipos_TopDown += qty;
    }

    // Determinar margen decimal sobre venta
    let margenDecimal = 0.15;
    if (isTercerizado) {
      const rawMargen = item.overrides?.margen_tercerizado !== undefined ? Number(item.overrides.margen_tercerizado) : 30;
      // Convertir markup (ej: 30%) a margen sobre venta: M = 1 - 1/(1 + markup/100) = 28.5714%
      margenDecimal = rawMargen > 0 ? (1 - (1 / (1 + (rawMargen / 100)))) : 0;
    } else if (isTopDown) {
      margenDecimal = 0.20;
    } else {
      // Mano de obra propia: 50% margen sobre venta (duplica el costo real absorbido)
      const rawMargen = item.overrides?.margen !== undefined ? Number(item.overrides.margen) : 50;
      margenDecimal = rawMargen > 1 ? (rawMargen / 100) : rawMargen;
    }

    return {
      ...item,
      qty,
      isTercerizado,
      isTopDown,
      valorInyectadoItem,
      horas_equipo,
      horas_servicio,
      Costo_Tecnologia,
      Costo_MO_Item,
      Costo_Subcontrato_Item,
      costoFee,
      costoAmort,
      Costo_Directo_Unitario,
      Costo_Directo_Total_Item,
      margenDecimal,
      modo_subcontrato,
      sub_esp_cant,
      sub_esp_costo_dia,
      sub_esp_dias,
      sub_aux_cant,
      sub_aux_costo_dia,
      sub_aux_dias
    };
  });

  const Costo_Mano_Obra_Total = Costo_MO_Especialistas_Total + Costo_MO_Auxiliares_Total + Costo_MO_Externos_Total;

  // 2. LOGÍSTICA GLOBAL (Cálculo de Despliegue de Cuadrilla Propia)
  let Personal_Calculado = 0;
  let Personal_Simultaneo = 0;
  let Dias_Reales_Obra = 0;
  let Dias_Viatico = 0;
  let Noches_Hotel = 0;
  let Costo_Viaticos_Total = 0;
  let Costo_Hospedaje_Total = 0;
  let Peajes_Cantidad = 0;
  let Costo_Peajes_Viaje = 0;
  let Costo_Viaje_Base = 0;
  let Cantidad_Vehiculos = 0;
  let Costo_Movilidad_Total = 0;
  let Logistica_Global_Total = 0;

  if (aplicarGastosIndirectos) {
    Personal_Calculado = Math.ceil(Total_Dias_Esfuerzo / Dias_Permitidos_Corte);
    Personal_Simultaneo = Math.max(2, Personal_Calculado);
    Dias_Reales_Obra = Math.max(1, Math.ceil(Total_Dias_Esfuerzo / Personal_Simultaneo));
    
    if (Distancia_Ida_Vuelta_km > 200) {
      Dias_Viatico = Math.max(2, Dias_Reales_Obra);
      Noches_Hotel = Math.max(1, Dias_Reales_Obra - 1);
    } else {
      Dias_Viatico = Dias_Reales_Obra;
      Noches_Hotel = 0;
    }
    
    const isLogisticsOverridden = cotizacion.logisticsOverrides?.enabled;
    const lO = cotizacion.logisticsOverrides || {};
    
    const final_viaticos_qty = isLogisticsOverridden ? (lO.viaticos_qty ?? Personal_Simultaneo) : Personal_Simultaneo;
    const final_viaticos_dias = isLogisticsOverridden ? (lO.viaticos_dias ?? Dias_Viatico) : Dias_Viatico;
    const final_viaticos_rate = isLogisticsOverridden ? (lO.viaticos_rate ?? TARIFA_VIATICO_DIA) : TARIFA_VIATICO_DIA;
    Costo_Viaticos_Total = final_viaticos_qty * final_viaticos_dias * final_viaticos_rate;

    const final_hospedaje_qty = isLogisticsOverridden ? (lO.hospedaje_qty ?? Personal_Simultaneo) : Personal_Simultaneo;
    const final_hospedaje_noches = isLogisticsOverridden ? (lO.hospedaje_noches ?? Noches_Hotel) : Noches_Hotel;
    const final_hospedaje_rate = isLogisticsOverridden ? (lO.hospedaje_rate ?? TARIFA_HOSPEDAJE_DIA) : TARIFA_HOSPEDAJE_DIA;
    Costo_Hospedaje_Total = final_hospedaje_qty * final_hospedaje_noches * final_hospedaje_rate;

    const Consumo_Litros_100km = 14;
    const Precio_Litro_Combustible = 10500;
    if (Distancia_Ida_Vuelta_km > 0) {
      if (Distancia_Ida_Vuelta_km < 200) Peajes_Cantidad = 2;
      else if (Distancia_Ida_Vuelta_km < 400) Peajes_Cantidad = 4;
      else Peajes_Cantidad = 8;
    }
    Costo_Peajes_Viaje = Peajes_Cantidad * 18000;
    Costo_Viaje_Base = ((Distancia_Ida_Vuelta_km / 100) * Consumo_Litros_100km * Precio_Litro_Combustible) + Costo_Peajes_Viaje;

    Cantidad_Vehiculos = Math.ceil(Personal_Simultaneo / 4);
    const final_vehiculos_qty = isLogisticsOverridden ? (lO.vehiculos_qty ?? Cantidad_Vehiculos) : Cantidad_Vehiculos;
    const final_vehiculos_rate = isLogisticsOverridden ? (lO.vehiculos_rate ?? Costo_Viaje_Base) : Costo_Viaje_Base;
    Costo_Movilidad_Total = final_vehiculos_qty * final_vehiculos_rate;

    Logistica_Global_Total = Costo_Viaticos_Total + Costo_Hospedaje_Total + Costo_Movilidad_Total;
  }

  const Total_Alquileres = alquileres.reduce((sum, alq) => sum + (Number(alq.costo) || 0), 0);

  // Provisión Estándar de SSMA y Consumibles (Regla de Pareto 5% sobre Mano de Obra y Subcontratos)
  const aplicarSSMAProvision = cotizacion.aplicarSSMAProvision !== false && cotizacion.applySSMAProvision !== false;
  const porcentajeSSMA = Number(cotizacion.porcentajeSSMAProvision ?? 5);
  const baseCalculoSSMA = Costo_Mano_Obra_Total + Costo_Subcontratistas_Total;
  const Costo_SSMA_Consumibles = aplicarSSMAProvision ? (baseCalculoSSMA * (porcentajeSSMA / 100)) : 0;

  // Costo Directo Total Puro
  const Costo_Directo_Total = Costo_Tecnologia_Total + Costo_Mano_Obra_Total + Logistica_Global_Total + Total_Alquileres + Costo_Subcontratistas_Total + Gastos_Imprevistos + Costo_ServiceFee_Total + Costo_Amortizacion_Total + Costo_SSMA_Consumibles;

  // Gastos Administrativos (3% sobre Costo Directo Total)
  const Gastos_Administrativos = Costo_Directo_Total * (Variables_Globales.Gastos_Administrativos_Porcentaje / 100);

  // 3. ABSORCIÓN TOTAL DE COSTOS INDIRECTOS (Full Absorption Engine)
  const sumaMOPropia = itemsDirectosCrudos
    .filter(i => !i.isTercerizado)
    .reduce((acc, i) => acc + (i.Costo_MO_Item * i.qty), 0);

  const sumaCostoDirectoSSTTTotal = itemsDirectosCrudos
    .reduce((acc, i) => acc + i.Costo_Directo_Total_Item, 0);

  const equiposProcesados = [];
  let gananciaTercerizadosTotal = 0;
  let gananciaIngenieriaTotal = 0;
  let gananciaTecnologiaTotal = 0;
  let precioVentaServiciosTotal = 0;

  itemsDirectosCrudos.forEach(item => {
    const qty = item.qty;
    let logAsignada = 0;
    let impAsignado = 0;
    let adminAsignado = 0;
    let ssmaAsignado = 0;

    // Regla de Negocio: Logística e Imprevistos se absorben 100% en Mano de Obra Propia
    if (!item.isTercerizado && sumaMOPropia > 0) {
      const pesoMO = (item.Costo_MO_Item * qty) / sumaMOPropia;
      logAsignada = Logistica_Global_Total * pesoMO;
      impAsignado = Gastos_Imprevistos * pesoMO;
    }

    // Regla de Negocio: Provisión SSMA y Consumibles absorbida en Mano de Obra / Subcontrato
    if (baseCalculoSSMA > 0 && Costo_SSMA_Consumibles > 0) {
      const baseItem = item.isTercerizado ? (item.Costo_Subcontrato_Item * qty) : (item.Costo_MO_Item * qty);
      ssmaAsignado = Costo_SSMA_Consumibles * (baseItem / baseCalculoSSMA);
    }

    // Regla de Negocio: Gastos Administrativos (Overhead 3%) se prorratean en SSTT
    if (sumaCostoDirectoSSTTTotal > 0) {
      const pesoDirecto = item.Costo_Directo_Total_Item / sumaCostoDirectoSSTTTotal;
      adminAsignado = Gastos_Administrativos * pesoDirecto;
    }

    // Costo Total Real Absorbido
    const costo_total_real = item.Costo_Directo_Total_Item + logAsignada + impAsignado + adminAsignado + ssmaAsignado;
    
    // Ecuación de Rentabilidad Core: Precio_Venta = Costo_Total_Absorbido / (1 - Margen)
    const divisor = Math.max(0.01, 1 - Math.min(0.99, item.margenDecimal));
    const precio_total_final = item.isTopDown && item.valorInyectadoItem > 0 
      ? (item.valorInyectadoItem * qty) 
      : (costo_total_real / divisor);
    
    const precio_unitario_final = qty > 0 ? (precio_total_final / qty) : 0;
    const utilidad_total_item = precio_total_final - costo_total_real;
    const utilidad_neta_unitaria = qty > 0 ? (utilidad_total_item / qty) : 0;

    if (item.isTercerizado) {
      gananciaTercerizadosTotal += utilidad_total_item;
    } else {
      gananciaIngenieriaTotal += utilidad_total_item;
    }

    precioVentaServiciosTotal += precio_total_final;

    equiposProcesados.push({
      ...item,
      estrategia: item.isTercerizado ? 'Subcontrato' : (item.isTopDown ? 'Top-Down' : 'Normal'),
      costo_directo_unitario: item.Costo_Directo_Unitario,
      admin_unitario: qty > 0 ? (adminAsignado / qty) : 0,
      ssma_unitario: qty > 0 ? (ssmaAsignado / qty) : 0,
      utilidad_neta_unitaria,
      precio_unitario_final,
      precio_total_final,
      horas_equipo: item.horas_equipo,
      horas_servicio: item.horas_servicio,
      costo_total_real,
      logAsignada,
      impAsignado,
      adminAsignado,
      ssmaAsignado,
      margen: item.margenDecimal,
      // Desglose crudo para Auditoría
      Costo_Tecnologia_Item: item.Costo_Tecnologia,
      Costo_MO_Item: item.Costo_MO_Item,
      Costo_Subcontrato_Item: item.Costo_Subcontrato_Item,
      Margen_Subcontrato_Item: item.isTercerizado ? (Number(item.overrides?.margen_tercerizado ?? 30)) : 0,
      modo_subcontrato: item.modo_subcontrato,
      sub_esp_cant: item.sub_esp_cant,
      sub_esp_costo_dia: item.sub_esp_costo_dia,
      sub_esp_dias: item.sub_esp_dias,
      sub_aux_cant: item.sub_aux_cant,
      sub_aux_costo_dia: item.sub_aux_costo_dia,
      sub_aux_dias: item.sub_aux_dias
    });
  });

  // 4. PROCESAMIENTO DE ALQUILERES ESPECIALES (Full Absorption)
  let precioVentaAlquileresTotal = 0;
  let gananciaAlquileresTotal = 0;

  const alquileresProcesados = alquileres.map(alq => {
    const costo = Number(alq.costo) || 0;
    const qty = Number(alq.cantidad) || 1;
    const costoTotalAlq = costo * qty;
    
    // Margen Alquiler: 30% margen sobre venta (fórmula divisor: Costo / (1 - 0.30) = Costo * 1.42857)
    // O si se requiere precio base + 30% markup, divisor 1 - 0.230769
    const rawMargen = alq.margen !== undefined ? Number(alq.margen) : 30;
    const margenDecimal = rawMargen > 1 ? (rawMargen / 100) : rawMargen;
    const divisor = Math.max(0.01, 1 - Math.min(0.99, margenDecimal));
    
    const precio_total_final = costoTotalAlq / divisor;
    const precio_unitario_final = qty > 0 ? (precio_total_final / qty) : 0;
    const utilidad_total = precio_total_final - costoTotalAlq;
    const utilidad_neta_unitaria = qty > 0 ? (utilidad_total / qty) : 0;

    precioVentaAlquileresTotal += precio_total_final;
    gananciaAlquileresTotal += utilidad_total;

    return {
      ...alq,
      estrategia: 'Alquiler Especial',
      cantidad: qty,
      costo_directo_unitario: costo,
      admin_unitario: 0,
      margen: margenDecimal,
      utilidad_neta_unitaria,
      precio_unitario_final,
      precio_total_final
    };
  });

  // 5. PRECIO FINAL CONSOLIDADOR Y GANANCIA NETA TOTAL
  const Precio_Venta_Final = precioVentaServiciosTotal + precioVentaAlquileresTotal;
  
  // Ganancia Neta Real = Precio_Venta_Final - Costo_Directo_Total - Gastos_Administrativos
  const Ganancia_Neta_Esperada = Precio_Venta_Final - Costo_Directo_Total - Gastos_Administrativos;
  const Margen_Real_Porcentaje = Precio_Venta_Final > 0 ? (Ganancia_Neta_Esperada / Precio_Venta_Final) * 100 : 0;

  // Desglose de Ganancias para el Panel del CRM
  const Ganancia_Logistica = Logistica_Global_Total * (Variables_Globales.Margen_Ganancia_Logistica / 100);
  const Ganancia_Imprevistos = Gastos_Imprevistos * (Margen_Imprevistos_Porcentaje > 0 ? (Margen_Imprevistos_Porcentaje / 100) : 0.30);
  const Ganancia_SSMA = Costo_SSMA_Consumibles * 0.30;
  const Ganancia_Tecnologia_Total = Costo_Tecnologia_Total * (Variables_Globales.MARGEN_TECNOLOGIA || 0.40);
  const Ganancia_Ingenieria_Pura = Math.max(0, gananciaIngenieriaTotal - Ganancia_Tecnologia_Total - Ganancia_Logistica - Ganancia_Imprevistos - (aplicarSSMAProvision ? Ganancia_SSMA : 0));
  const Precio_Venta_Logistica = Logistica_Global_Total + Ganancia_Logistica;

  return {
    aplicarGastosIndirectos,
    Dias_Permitidos_Corte,
    Total_Dias_Esfuerzo,
    Personal_Simultaneo,
    Dias_Reales_Obra,
    Dias_Viatico,
    Noches_Hotel,
    Cantidad_Vehiculos,
    Costo_Viaje_Base,
    TARIFA_VIATICO_DIA,
    TARIFA_HOSPEDAJE_DIA,
    Costo_Tecnologia_Total,
    Costo_MO_Especialistas_Total,
    Costo_MO_Auxiliares_Total,
    Costo_Mano_Obra_Total,
    Costo_Viaticos_Total,
    Costo_Hospedaje_Total,
    Costo_Movilidad_Total,
    Logistica_Global_Total,
    Costo_Subcontratistas_Total,
    Total_Alquileres,
    Gastos_Imprevistos,
    Costo_SSMA_Consumibles,
    aplicarSSMAProvision,
    porcentajeSSMAProvision: porcentajeSSMA,
    Ganancia_SSMA_Consumibles: Ganancia_SSMA,
    Precio_SSMA_Consumibles: Costo_SSMA_Consumibles / 0.70,
    Costo_Directo_Total,
    Ganancia_Ingenieria: Ganancia_Ingenieria_Pura,
    Ganancia_Logistica,
    Ganancia_Imprevistos,
    Ganancia_Alquileres: gananciaAlquileresTotal,
    Ganancia_Tercerizados_Nuevos: gananciaTercerizadosTotal,
    Ganancia_ServiceFee_Total: 0,
    Ganancia_Amortizacion_Total: 0,
    Gastos_Administrativos,
    Ganancia_Neta_Esperada,
    Precio_Venta_Final,
    Margen_Real_Porcentaje,
    Cantidad_Trafos,
    Cantidad_Equipos_TopDown,
    Precio_Mercado_Aplicado,
    Precio_Mercado_Total_Trafos,
    Ganancia_Tecnologia_Total,
    Utilidad_Oculta_TopDown: 0,
    Precio_Venta_Logistica,
    equiposProcesados,
    alquileresProcesados
  };
};
