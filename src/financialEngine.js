// ============================================================================
// MOTOR FINANCIERO Y LOGÍSTICO (Arquitectura Bottom-Up Pura)
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
  Margen_Ganancia_MO_Propia: 100, // 100% markup
  Margen_Ganancia_Logistica: 30, // 30% markup
  MARGEN_TECNOLOGIA: 0.40, // 40% markup sobre equipos
};

export const calcularCotizacionActiva = (cotizacion) => {
  const Dias_Permitidos_Corte = Math.max(1, Number(cotizacion.Dias_Permitidos_Corte) || 1);
  const Distancia_Ida_Vuelta_km = Number(cotizacion.Distancia_Ida_Vuelta_km) || 0;
  
  const Gastos_Imprevistos = Number(cotizacion.Gastos_Imprevistos) || 0;
  const Margen_Imprevistos_Porcentaje = Number(cotizacion.Margen_Imprevistos_Porcentaje) || 0;
  const Precio_Mercado_Aplicado = Number(cotizacion.Precio_Mercado_Aplicado) || 0;

  const equiposCotizados = cotizacion.equiposCotizados || [];
  const alquileres = cotizacion.alquileres || [];

  // Acumuladores de Costo Directo Técnico
  let Costo_Tecnologia_Total = 0;
  let Costo_MO_Especialistas_Total = 0;
  let Costo_MO_Auxiliares_Total = 0;
  let Costo_MO_Externos_Total = 0;
  let Ganancia_MO_Externa_Total = 0;
  let Costo_Subcontratistas_Total = 0;
  let Ganancia_Tercerizados_Nuevos = 0;
  
  let Costo_ServiceFee_Total = 0;
  let Ganancia_ServiceFee_Total = 0;
  let Costo_Amortizacion_Total = 0;
  let Ganancia_Amortizacion_Total = 0;
  
  // Acumulador de Esfuerzo Logístico
  let Total_Dias_Esfuerzo = 0;
  let Cantidad_Trafos = 0;
  let Cantidad_Equipos_TopDown = 0;
  let Precio_Mercado_Total_Trafos = 0;

  let Utilidad_Oculta_TopDown = 0;
  let Ganancia_Tecnologia_Total = 0;
  const equiposProcesados = [];

  equiposCotizados.forEach(item => {
    const isTercerizado = item.overrides?.is_tercerizado === true;
    const isTopDown = item.overrides?.top_down_enabled === true; 
    
    const qty = item.cantidad || 1;
    let Precio_Unitario_Final = 0;
    let costo_directo_unitario = 0;
    let admin_unitario = 0;
    let utilidad_neta_unitaria = 0;
    let estrategia = 'Normal';
    
    // Identificar si es transformador (para lógica de UI o agrupación)
    const textoBusqueda = `${item.baseData?.equipo || ''} ${item.equipo || ''}`.toLowerCase();
    const esInstrumentoOParche = textoBusqueda.includes('potencial') || textoBusqueda.includes('corriente') || textoBusqueda.includes('medida') || textoBusqueda.includes('tensión') || textoBusqueda.includes('tension') || textoBusqueda.includes('servicios') || textoBusqueda.includes('reactor') || textoBusqueda.includes('batería') || textoBusqueda.includes('bateria');
    const esRealmenteTrafo = (textoBusqueda.includes('transformador') || textoBusqueda.includes('autotransformador')) && !esInstrumentoOParche;
    
    // Variables Base
    const costoFee = item.overrides?.costoServiceFee ?? 0;
    const margenFeePerc = item.overrides?.margenServiceFee ?? 0;
    const costoAmort = item.overrides?.costoAmortizacion ?? 0;
    const margenAmortPerc = item.overrides?.margenAmortizacion ?? 0;
    
    const precioFee = costoFee * (margenFeePerc / 100);
    const precioAmort = costoAmort * (margenAmortPerc / 100);

    // Sumamos a globales adicionales
    Costo_ServiceFee_Total += costoFee * qty;
    Ganancia_ServiceFee_Total += precioFee * qty;
    Costo_Amortizacion_Total += costoAmort * qty;
    Ganancia_Amortizacion_Total += precioAmort * qty;
    
    // Variables de Costo Operativo
    const horas_equipo = item.overrides?.horas_equipo ?? item.baseData?.horas_equipo ?? 0;
    const especialistas_internos = item.overrides?.interno ?? item.baseData?.interno ?? 1;
    const auxiliares = item.overrides?.ayudante ?? item.baseData?.ayudante ?? 1;
    const externos = item.overrides?.externo ?? item.baseData?.externo ?? 0;

    const Costo_Tecnologia = horas_equipo * TARIFA_EQUIPOS_HORA;
    const Costo_MO_Esp = (horas_equipo / 8) * especialistas_internos * COSTO_ESPECIALISTA_DIA;
    const Costo_MO_Aux = (horas_equipo / 8) * auxiliares * COSTO_AUXILIAR_DIA;
    const Costo_MO_Ext = (horas_equipo / 8) * externos * COSTO_EXTERNO_DIA;
    
    const Utilidad_Tecnologia = Costo_Tecnologia * Variables_Globales.MARGEN_TECNOLOGIA;
    const Utilidad_MO_Propia = (Costo_MO_Esp + Costo_MO_Aux) * (Variables_Globales.Margen_Ganancia_MO_Propia / 100);
    const Utilidad_MO_Externa = Costo_MO_Ext * 0.30;
    
    const valorInyectadoItem = Number(item.overrides?.valor_inyectado) || 0;

    if (isTercerizado) {
      estrategia = 'Subcontrato';
      const costoSubcontratista = item.overrides?.costo_total_base ?? item.baseData?.costo_total_base ?? 0;
      const margenPerc = item.overrides?.margen_tercerizado ?? 30;
      const margenSubcontratista = costoSubcontratista * (margenPerc / 100);
      
      const Costo_Directo_Base = costoSubcontratista;
      const Costo_Directo_Total_Item = Costo_Directo_Base + costoFee + costoAmort;
      const Precio_Venta_Base = Costo_Directo_Base + margenSubcontratista;
      const Precio_Venta_Total_Item = Precio_Venta_Base + precioFee + precioAmort;
      
      costo_directo_unitario = Costo_Directo_Total_Item;
      Precio_Unitario_Final = Precio_Venta_Total_Item;
      utilidad_neta_unitaria = Precio_Unitario_Final - costo_directo_unitario;
      
      Costo_Subcontratistas_Total += Costo_Directo_Base * qty;
      Ganancia_Tercerizados_Nuevos += margenSubcontratista * qty;
      
    } else if (isTopDown && valorInyectadoItem > 0) {
      estrategia = 'Top-Down';
      
      const Costo_Directo_Base = Costo_Tecnologia + Costo_MO_Esp + Costo_MO_Aux + Costo_MO_Ext;
      const Costo_Directo_Total_Item = Costo_Directo_Base + costoFee + costoAmort;
      
      const Precio_Venta_Total_Item = valorInyectadoItem;
      
      costo_directo_unitario = Costo_Directo_Total_Item;
      Precio_Unitario_Final = Precio_Venta_Total_Item;
      utilidad_neta_unitaria = Precio_Unitario_Final - costo_directo_unitario;
      
      Precio_Mercado_Total_Trafos += Precio_Venta_Total_Item * qty;
      Cantidad_Equipos_TopDown += qty;
      if (esRealmenteTrafo) Cantidad_Trafos += qty;
      Utilidad_Oculta_TopDown += utilidad_neta_unitaria * qty;
      
      Total_Dias_Esfuerzo += ((horas_equipo / 8) * (especialistas_internos + auxiliares + externos)) * qty;
      
    } else {
      estrategia = 'Normal';
      const Costo_Directo_Base = Costo_Tecnologia + Costo_MO_Esp + Costo_MO_Aux + Costo_MO_Ext;
      const Costo_Directo_Total_Item = Costo_Directo_Base + costoFee + costoAmort;
      
      const margenBottomUp = Utilidad_Tecnologia + Utilidad_MO_Propia + Utilidad_MO_Externa;
      const Precio_Venta_Base = Costo_Directo_Base + margenBottomUp;
      const Precio_Venta_Total_Item = Precio_Venta_Base + precioFee + precioAmort;
      
      costo_directo_unitario = Costo_Directo_Total_Item;
      Precio_Unitario_Final = Precio_Venta_Total_Item;
      utilidad_neta_unitaria = Precio_Unitario_Final - costo_directo_unitario;
      
      Costo_Tecnologia_Total += Costo_Tecnologia * qty;
      Costo_MO_Especialistas_Total += Costo_MO_Esp * qty;
      Costo_MO_Auxiliares_Total += Costo_MO_Aux * qty;
      Costo_MO_Externos_Total += Costo_MO_Ext * qty;
      Ganancia_Tecnologia_Total += Utilidad_Tecnologia * qty;
      Ganancia_MO_Externa_Total += Utilidad_MO_Externa * qty;
      
      Total_Dias_Esfuerzo += ((horas_equipo / 8) * (especialistas_internos + auxiliares + externos)) * qty;
      if (esRealmenteTrafo) Cantidad_Trafos += qty;
    }
    
    admin_unitario = 0;
    
    equiposProcesados.push({
      ...item,
      estrategia,
      costo_directo_unitario,
      costoServiceFee: costoFee,
      margenServiceFee: margenFeePerc,
      costoAmortizacion: costoAmort,
      margenAmortizacion: margenAmortPerc,
      admin_unitario,
      utilidad_neta_unitaria,
      precio_unitario_final: Precio_Unitario_Final,
      precio_total_final: Precio_Unitario_Final * qty
    });
  });

  const Costo_Mano_Obra_Total = Costo_MO_Especialistas_Total + Costo_MO_Auxiliares_Total + Costo_MO_Externos_Total;

  // 4. Logística Global y Reglas de Seguridad
  const Personal_Calculado = Math.ceil(Total_Dias_Esfuerzo / Dias_Permitidos_Corte);
  // Regla de Seguridad (Piso Mínimo)
  const Personal_Simultaneo = Math.max(2, Personal_Calculado);
  
  const Dias_Reales_Obra = Math.max(1, Math.ceil(Total_Dias_Esfuerzo / Personal_Simultaneo));
  
  let Dias_Viatico = 0;
  let Noches_Hotel = 0;
  
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
  const Costo_Viaticos_Total = final_viaticos_qty * final_viaticos_dias * final_viaticos_rate;

  const final_hospedaje_qty = isLogisticsOverridden ? (lO.hospedaje_qty ?? Personal_Simultaneo) : Personal_Simultaneo;
  const final_hospedaje_noches = isLogisticsOverridden ? (lO.hospedaje_noches ?? Noches_Hotel) : Noches_Hotel;
  const final_hospedaje_rate = isLogisticsOverridden ? (lO.hospedaje_rate ?? TARIFA_HOSPEDAJE_DIA) : TARIFA_HOSPEDAJE_DIA;
  const Costo_Hospedaje_Total = final_hospedaje_qty * final_hospedaje_noches * final_hospedaje_rate;

  // 5. Movilidad de Vehículos
  // Costo_Viaje_Base = Combustible + Peaje
  const Consumo_Litros_100km = 14;
  const Precio_Litro_Combustible = 10500;
  let Peajes_Cantidad = 0;
  if (Distancia_Ida_Vuelta_km > 0) {
      if (Distancia_Ida_Vuelta_km < 200) Peajes_Cantidad = 2;
      else if (Distancia_Ida_Vuelta_km < 400) Peajes_Cantidad = 4;
      else Peajes_Cantidad = 8;
  }
  const Costo_Peajes_Viaje = Peajes_Cantidad * 18000;
  const Costo_Viaje_Base = ((Distancia_Ida_Vuelta_km / 100) * Consumo_Litros_100km * Precio_Litro_Combustible) + Costo_Peajes_Viaje;

  const Cantidad_Vehiculos = Math.ceil(Personal_Simultaneo / 4);
  const final_vehiculos_qty = isLogisticsOverridden ? (lO.vehiculos_qty ?? Cantidad_Vehiculos) : Cantidad_Vehiculos;
  const final_vehiculos_rate = isLogisticsOverridden ? (lO.vehiculos_rate ?? Costo_Viaje_Base) : Costo_Viaje_Base;
  const Costo_Movilidad_Total = final_vehiculos_qty * final_vehiculos_rate;

  const Logistica_Global_Total = Costo_Viaticos_Total + Costo_Hospedaje_Total + Costo_Movilidad_Total;
  const Total_Alquileres = alquileres.reduce((sum, alq) => sum + (Number(alq.costo) || 0), 0);

  // Subtotales de Costo Directo
  const Costo_Directo_Total = Costo_Tecnologia_Total + Costo_Mano_Obra_Total + Logistica_Global_Total + Total_Alquileres + Costo_Subcontratistas_Total + Gastos_Imprevistos + Costo_ServiceFee_Total + Costo_Amortizacion_Total;

  // 6. Márgenes Comerciales Diferenciados
  const Ganancia_Ingenieria = (Costo_MO_Especialistas_Total + Costo_MO_Auxiliares_Total) * (Variables_Globales.Margen_Ganancia_MO_Propia / 100) + Ganancia_MO_Externa_Total;
  const Ganancia_Logistica = Logistica_Global_Total * (Variables_Globales.Margen_Ganancia_Logistica / 100);
  const Ganancia_Imprevistos = Gastos_Imprevistos * (Margen_Imprevistos_Porcentaje / 100);
  const Ganancia_Alquileres = Total_Alquileres * 0.30;
  const Gastos_Administrativos = Costo_Directo_Total * (Variables_Globales.Gastos_Administrativos_Porcentaje / 100);
  
  // Precio Logística Pura Exportable (Logística + 30%)
  const Precio_Venta_Logistica = Logistica_Global_Total + Ganancia_Logistica;

  // Alquileres Procesados
  const alquileresProcesados = alquileres.map(alq => {
      const costo = Number(alq.costo) || 0;
      const adminProp = 0; // Removido por regla de subtotal global
      const utilidadAlquiler = costo * 0.30;
      return { 
        ...alq, 
        estrategia: 'Alquiler Especial',
        costo_directo_unitario: costo,
        admin_unitario: adminProp, // Mantener en 0
        utilidad_neta_unitaria: utilidadAlquiler,
        precio_unitario_final: costo + utilidadAlquiler 
      };
  });

  // PRECIO FINAL SUMATORIO
  const Precio_Venta_BottomUp = Costo_Directo_Total + Gastos_Administrativos + Ganancia_Ingenieria + Ganancia_Tecnologia_Total + Ganancia_Logistica + Ganancia_Imprevistos + Ganancia_Tercerizados_Nuevos + Ganancia_Alquileres + Ganancia_ServiceFee_Total + Ganancia_Amortizacion_Total;
  
  // Agregar directamente el valor inyectado Top-Down
  let Precio_Venta_Final = Precio_Venta_BottomUp + Precio_Mercado_Total_Trafos;
  
  // La ganancia neta ahora suma estrictamente las utilidades puras
  const Ganancia_Neta_Esperada = Ganancia_Ingenieria + Ganancia_Tecnologia_Total + Ganancia_Logistica + Ganancia_Imprevistos + Ganancia_Tercerizados_Nuevos + Ganancia_Alquileres + Ganancia_ServiceFee_Total + Ganancia_Amortizacion_Total + Utilidad_Oculta_TopDown;
  const Margen_Real_Porcentaje = Precio_Venta_Final > 0 ? (Ganancia_Neta_Esperada / Precio_Venta_Final) * 100 : 0;

  return {
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
    Costo_Directo_Total,
    Ganancia_Ingenieria,
    Ganancia_Logistica,
    Ganancia_Imprevistos,
    Ganancia_Alquileres,
    Ganancia_Tercerizados_Nuevos,
    Ganancia_ServiceFee_Total,
    Ganancia_Amortizacion_Total,
    Gastos_Administrativos,
    Ganancia_Neta_Esperada,
    Precio_Venta_Final,
    Margen_Real_Porcentaje,
    Cantidad_Trafos,
    Cantidad_Equipos_TopDown,
    Precio_Mercado_Aplicado,
    Precio_Mercado_Total_Trafos,
    Ganancia_Tecnologia_Total,
    Utilidad_Oculta_TopDown,
    Precio_Venta_Logistica,
    equiposProcesados,
    alquileresProcesados
  };
};
