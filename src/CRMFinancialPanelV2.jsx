import { useState } from 'react';
import { Variables_Globales } from './financialEngine';
import { Calculator, FileSpreadsheet, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CRMFinancialPanelV2({ resultados, cotizacion, equiposCotizados = [], alquileres = [] }) {
  const [showAuditoria, setShowAuditoria] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const formatGs = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num);

  const exportToExcel = () => {
    const itemsParaExcel = resultados.equiposProcesados || [];
    const alquileresExcel = resultados.alquileresProcesados || [];
    
    const formatNumber = (num) => Math.round(num || 0);
    const formatPercent = (num) => `${(num || 0).toFixed(1)}%`;

    // --- HOJA 1: RESUMEN EJECUTIVO ---
    const rowsResumen = [];
    rowsResumen.push(["Resumen Ejecutivo - Cotización de Servicios"]);
    rowsResumen.push([]);
    rowsResumen.push(["Datos del Proyecto"]);
    rowsResumen.push(["Cliente", cotizacion.Cliente || "N/A"]);
    rowsResumen.push(["Nombre de Obra", cotizacion.NombreObra || "N/A"]);
    rowsResumen.push(["Días Permitidos de Corte", cotizacion.Dias_Permitidos_Corte || 0]);
    rowsResumen.push(["Distancia Total (Ida y Vuelta)", `${cotizacion.Distancia_Ida_Vuelta_km || 0} km`]);
    rowsResumen.push([]);
    rowsResumen.push(["Macro-Partidas", "Costo", "Margen (%)", "Utilidad Neta", "Precio Venta"]);
    
    // Equipos
    let costoEquipos = 0, utilidadEquipos = 0, precioEquipos = 0;
    itemsParaExcel.forEach(item => {
      costoEquipos += (item.costo_directo_unitario || 0) * (item.cantidad || 1);
      utilidadEquipos += (item.utilidad_neta_unitaria || 0) * (item.cantidad || 1);
      precioEquipos += (item.precio_unitario_final || 0) * (item.cantidad || 1);
    });
    const margenEquipos = precioEquipos > 0 ? (utilidadEquipos / precioEquipos) * 100 : 0;
    rowsResumen.push([
      "Subtotal de Equipos y Servicios Técnicos",
      formatNumber(costoEquipos),
      formatPercent(margenEquipos),
      formatNumber(utilidadEquipos),
      formatNumber(precioEquipos)
    ]);

    // Logística
    const costoLogistica = resultados.Logistica_Global_Total || 0;
    const utilidadLogistica = resultados.Ganancia_Logistica || 0;
    const precioLogistica = resultados.Precio_Venta_Logistica || 0;
    const margenLogistica = precioLogistica > 0 ? (utilidadLogistica / precioLogistica) * 100 : 0;
    rowsResumen.push([
      "Logística, Movilización y Despliegue",
      formatNumber(costoLogistica),
      formatPercent(margenLogistica),
      formatNumber(utilidadLogistica),
      formatNumber(precioLogistica)
    ]);

    // Alquileres
    let costoAlquileres = 0, utilidadAlquileres = 0, precioAlquileres = 0;
    alquileresExcel.forEach(alq => {
      costoAlquileres += alq.costo_directo_unitario || 0;
      utilidadAlquileres += alq.utilidad_neta_unitaria || 0;
      precioAlquileres += alq.precio_unitario_final || 0;
    });
    const margenAlquileres = precioAlquileres > 0 ? (utilidadAlquileres / precioAlquileres) * 100 : 0;
    if (precioAlquileres > 0) {
      rowsResumen.push([
        "Alquileres Especiales",
        formatNumber(costoAlquileres),
        formatPercent(margenAlquileres),
        formatNumber(utilidadAlquileres),
        formatNumber(precioAlquileres)
      ]);
    }

    // Imprevistos
    const costoImprevistos = resultados.Gastos_Imprevistos || 0;
    const utilidadImprevistos = resultados.Ganancia_Imprevistos || 0;
    const precioImprevistos = costoImprevistos + utilidadImprevistos; // sin admin
    const margenImprevistos = precioImprevistos > 0 ? (utilidadImprevistos / precioImprevistos) * 100 : 0;
    if (precioImprevistos > 0) {
      rowsResumen.push([
        "Gestión de Riesgos y Contingencias",
        formatNumber(costoImprevistos),
        formatPercent(margenImprevistos),
        formatNumber(utilidadImprevistos),
        formatNumber(precioImprevistos)
      ]);
    }

    // SSMA y Consumibles
    const costoSSMA = resultados.Costo_SSMA_Consumibles || 0;
    const utilidadSSMA = resultados.Ganancia_SSMA_Consumibles || 0;
    const precioSSMA = resultados.Precio_SSMA_Consumibles || (costoSSMA + utilidadSSMA);
    const margenSSMA = precioSSMA > 0 ? (utilidadSSMA / precioSSMA) * 100 : 0;
    if (costoSSMA > 0) {
      rowsResumen.push([
        "Provisión de Seguridad Industrial (SSMA) y Consumibles",
        formatNumber(costoSSMA),
        formatPercent(margenSSMA),
        formatNumber(utilidadSSMA),
        formatNumber(precioSSMA)
      ]);
    }

    // Gastos Administrativos
    const gastosAdmin = resultados.Gastos_Administrativos || 0;
    rowsResumen.push([
      "Gastos Administrativos / Financieros (Corporate Overhead)",
      formatNumber(gastosAdmin),
      "0%",
      0,
      formatNumber(gastosAdmin)
    ]);

    // Totales
    const sumTotal = precioEquipos + precioLogistica + precioAlquileres + precioImprevistos + (costoSSMA > 0 ? precioSSMA : 0) + gastosAdmin;
    rowsResumen.push([]);
    rowsResumen.push(["", "", "", "SUBTOTAL", formatNumber(sumTotal)]);
    rowsResumen.push(["", "", "", "IVA (10%)", formatNumber(sumTotal * 0.1)]);
    rowsResumen.push(["", "", "", "GRAN TOTAL", formatNumber(sumTotal * 1.1)]);


    // --- HOJA 2: DETALLE DE EQUIPOS ---
    const rowsEquipos = [];
    rowsEquipos.push([
      "Equipo / Servicio",
      "Estrategia",
      "Cantidad",
      "Horas Unitarias Estimadas",
      "Horas Totales Estimadas",
      "Costo Directo Base",
      "Costo Service Fee",
      "Costo Amortización",
      "Costo Directo Total",
      "Utilidad Neta Unitaria",
      "Margen %",
      "Precio Venta Unitario",
      "Precio Venta Total del Ítem"
    ]);

    itemsParaExcel.forEach(item => {
      const horasUnitarias = (item.overrides?.horas_servicio ?? item.overrides?.horas_equipo ?? item.baseData?.horas_servicio ?? item.baseData?.horas_equipo ?? 0);
      const cantidad = item.cantidad || 1;
      const horasTotales = horasUnitarias * cantidad;
      
      const costoDirectoBase = (item.costo_directo_unitario || 0) - (item.costoServiceFee || 0) - (item.costoAmortizacion || 0);
      const precioUnitario = item.precio_unitario_final || 0;
      const utilUnitaria = item.utilidad_neta_unitaria || 0;
      const margenReal = precioUnitario > 0 ? (utilUnitaria / precioUnitario) * 100 : 0;

      rowsEquipos.push([
        item.equipo,
        item.estrategia || 'Normal',
        cantidad,
        horasUnitarias,
        horasTotales,
        formatNumber(costoDirectoBase),
        formatNumber(item.costoServiceFee || 0),
        formatNumber(item.costoAmortizacion || 0),
        formatNumber(item.costo_directo_unitario || 0),
        formatNumber(item.precio_servicio_unitario || 0),
        formatNumber(item.cuota_logistica_unitaria || 0),
        formatNumber(item.cuota_admin_unitaria || 0),
        formatNumber(utilUnitaria),
        formatPercent(margenReal),
        formatNumber(precioUnitario),
        formatNumber(precioUnitario * cantidad)
      ]);
    });


    // --- HOJA 3: LOGÍSTICA Y ALQUILERES ---
    const rowsLogistica = [];

    // === SECCIÓN A: CÁLCULO BASE DE LOGÍSTICA ===
    rowsLogistica.push(["SECCIÓN A: CÁLCULO BASE DE LOGÍSTICA Y MOVILIZACIÓN"]);
    rowsLogistica.push([]);
    rowsLogistica.push(["Concepto", "Valor"]);
    rowsLogistica.push(["Personal Simultáneo", resultados.Personal_Simultaneo || 0]);
    rowsLogistica.push(["Días Reales de Obra", resultados.Dias_Reales_Obra || 0]);
    rowsLogistica.push(["Viáticos (días × pers × tarifa)", resultados.Costo_Viaticos_Total || 0]);
    rowsLogistica.push(["Hospedaje (noches × pers × tarifa)", resultados.Costo_Hospedaje_Total || 0]);
    rowsLogistica.push(["Movilidad (vehículos × viaje)", resultados.Costo_Movilidad_Total || 0]);
    rowsLogistica.push([]);
    rowsLogistica.push(["TOTAL LOGÍSTICA (costo)", resultados.Logistica_Global_Total || 0]);
    rowsLogistica.push(["Margen Logística (30%)", resultados.Ganancia_Logistica || 0]);
    rowsLogistica.push(["PRECIO VENTA LOGÍSTICA", resultados.PV_Logistica_Total || (resultados.Precio_Venta_Logistica || 0)]);
    rowsLogistica.push([]);

    // === SECCIÓN B: DISTRIBUCIÓN POR ÍTEM ===
    rowsLogistica.push(["SECCIÓN B: DISTRIBUCIÓN DE LOGÍSTICA POR ÍTEM DE SERVICIO"]);
    rowsLogistica.push([]);
    const tablaPool = resultados.Pool_Logistica_Tabla || [];
    if (tablaPool.length === 0) {
      rowsLogistica.push(["Sin ítems en el pool de prorrateo", "", "", "", "", "", ""]);
    } else {
      rowsLogistica.push(["Ítem de Servicio", "Qty", "Base MO ($)", "Peso (%)", "Cuota Log. Costo", "Cuota Log. P.Venta", "Ganancia Log."]);
      let totalMO = 0, totalCuotaCosto = 0, totalCuotaPV = 0, totalGanLog = 0;
      tablaPool.forEach(row => {
        totalMO += row.MO_base || 0;
        totalCuotaCosto += row.cuota_log_costo || 0;
        totalCuotaPV += row.cuota_log_pv || 0;
        totalGanLog += row.ganancia_log_item || 0;
        rowsLogistica.push([
          row.equipo, row.qty || 1,
          formatNumber(row.MO_base || 0), formatPercent(row.peso_pct || 0),
          formatNumber(row.cuota_log_costo || 0), formatNumber(row.cuota_log_pv || 0),
          formatNumber(row.ganancia_log_item || 0),
        ]);
      });
      rowsLogistica.push(["TOTAL", "", formatNumber(totalMO), "100%", formatNumber(totalCuotaCosto), formatNumber(totalCuotaPV), formatNumber(totalGanLog)]);
    }
    rowsLogistica.push([]);

    // === GASTOS ADMINISTRATIVOS Y FINANCIEROS ===
    rowsLogistica.push(["GASTOS ADMINISTRATIVOS Y FINANCIEROS"]);
    rowsLogistica.push(["Porcentaje configurado", formatPercent(resultados.gastosAdminFinancieroPct || 6)]);
    rowsLogistica.push(["Total en precio de venta", formatNumber(resultados.Gastos_Admin_Financiero_Total || resultados.Gastos_Administrativos || 0)]);
    rowsLogistica.push([]);

    // === ALQUILERES ESPECIALES ===
    rowsLogistica.push(["ALQUILERES ESPECIALES Y SERVICIOS DE APOYO"]);
    rowsLogistica.push(["Descripción", "Cantidad", "Costo Directo Unitario", "Margen s/Venta %", "Utilidad Neta Unitaria", "Precio Venta Unitario", "Precio Venta Total"]);
    
    if (alquileresExcel.length === 0) {
      rowsLogistica.push(["Sin alquileres especiales", "-", "-", "-", "-", "-"]);
    } else {
      alquileresExcel.forEach(alq => {
        const utilUnitaria = alq.utilidad_neta_unitaria || 0;
        const precioUnitario = alq.precio_unitario_final || 0;
        const margenReal = precioUnitario > 0 ? (utilUnitaria / precioUnitario) * 100 : 0;
        rowsLogistica.push([
          alq.descripcion,
          alq.cantidad || 1,
          formatNumber(alq.costo_directo_unitario || 0),
          formatPercent(margenReal),
          formatNumber(utilUnitaria),
          formatNumber(precioUnitario),
          formatNumber(precioUnitario * (alq.cantidad || 1))
        ]);
      });
    }

    rowsLogistica.push([]);
    rowsLogistica.push(["Métricas de Logística"]);
    rowsLogistica.push(["Distancia Total (km)", cotizacion.Distancia_Ida_Vuelta_km || 0]);
    rowsLogistica.push(["Días Permitidos de Corte", cotizacion.Dias_Permitidos_Corte || 0]);
    rowsLogistica.push(["Personal Simultáneo Estimado", resultados.Personal_Simultaneo || 0]);
    rowsLogistica.push(["Cantidad de Vehículos", resultados.Cantidad_Vehiculos || 0]);


    // Crear libro y hojas
    const workbook = XLSX.utils.book_new();
    
    const wsResumen = XLSX.utils.aoa_to_sheet(rowsResumen);
    const wsEquipos = XLSX.utils.aoa_to_sheet(rowsEquipos);
    const wsLogistica = XLSX.utils.aoa_to_sheet(rowsLogistica);

    // Ajustar anchos
    wsResumen['!cols'] = [{wch: 50}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}];
    wsEquipos['!cols'] = [{wch: 35}, {wch: 15}, {wch: 10}, {wch: 22}, {wch: 20}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 20}, {wch: 20}, {wch: 12}, {wch: 20}, {wch: 22}];
    wsLogistica['!cols'] = [{wch: 45}, {wch: 10}, {wch: 18}, {wch: 12}, {wch: 18}, {wch: 20}, {wch: 20}];

    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen Ejecutivo");
    XLSX.utils.book_append_sheet(workbook, wsEquipos, "Detalle de Equipos");
    XLSX.utils.book_append_sheet(workbook, wsLogistica, "Logística y Alquileres");
    
    let fileName = 'Cotizacion_SinNombre.xlsx';
    if (cotizacion.Cliente && cotizacion.NombreObra) {
      fileName = `Cotizacion_${cotizacion.Cliente}_${cotizacion.NombreObra}.xlsx`;
    } else if (cotizacion.Cliente) {
      fileName = `Cotizacion_${cotizacion.Cliente}.xlsx`;
    } else if (cotizacion.NombreObra) {
      fileName = `Cotizacion_${cotizacion.NombreObra}.xlsx`;
    }
    
    fileName = fileName.replace(/\s+/g, '_');
    XLSX.writeFile(workbook, fileName);
  };

  const Gran_Total_Utilidad_Neta = resultados.Ganancia_Neta_Esperada !== undefined
    ? resultados.Ganancia_Neta_Esperada
    : ((resultados.Ganancia_Ingenieria || 0) + (resultados.Ganancia_Tercerizados_Nuevos || 0) + (resultados.Ganancia_Alquileres || 0));

  const margenRealUI = resultados.Margen_Real_Porcentaje !== undefined 
    ? resultados.Margen_Real_Porcentaje 
    : (resultados.Precio_Venta_Final > 0 ? (Gran_Total_Utilidad_Neta / resultados.Precio_Venta_Final) * 100 : 0);

  // Calculamos la proporción de internos vs externos para el Audit Trail
  let totalPersonasInternas = 0;
  let totalPersonasExternas = 0;
  equiposCotizados.forEach(item => {
    const qty = item.cantidad || 1;
    const internos = (item.overrides?.interno ?? item.baseData?.interno ?? 1) + (item.overrides?.ayudante ?? item.baseData?.ayudante ?? 1);
    const externos = item.overrides?.externo ?? item.baseData?.externo ?? 0;
    totalPersonasInternas += internos * qty;
    totalPersonasExternas += externos * qty;
  });
  
  let qtyExternos = 0;
  let qtyInternos = resultados.Personal_Simultaneo;
  if (totalPersonasInternas + totalPersonasExternas > 0) {
    const ratioExternos = totalPersonasExternas / (totalPersonasInternas + totalPersonasExternas);
    qtyExternos = Math.round(resultados.Personal_Simultaneo * ratioExternos);
    qtyInternos = resultados.Personal_Simultaneo - qtyExternos;
  }

  const generateERPMemory = () => {
    const logisticaText = cotizacion.logisticsOverrides?.enabled ? 'Sobrescritura Manual Activa' : 'Cálculo Automático';
    const topDownText = resultados.Utilidad_Oculta_TopDown > 0 ? `Activo en ${resultados.Cantidad_Equipos_TopDown || 1} equipos` : 'No utilizado';

    return `MEMORIA DE CÁLCULO - ZUNZ COTIZADOR
-----------------------------------------
[RENTABILIDAD PURA]
- Costo Directo Total: ${formatGs(resultados.Costo_Directo_Total)}
- Venta Total B2B: ${formatGs(resultados.Precio_Venta_Final)}
- Margen Real Neto: ${margenRealUI.toFixed(2)}%

[RIESGO OPERATIVO EN CAMPO]
- Ventana de Trabajo: ${resultados.Dias_Permitidos_Corte} días
- Personal Total: ${resultados.Personal_Simultaneo} (${qtyInternos} Internos | ${qtyExternos} Externos)
- Huella Logística: ${resultados.Cantidad_Vehiculos} Vehículos

[ESTRATEGIA COMERCIAL Y COBERTURA]
- Fondo de Imprevistos: ${formatGs(resultados.Gastos_Imprevistos)}
- Inyección Top-Down: ${topDownText}
- Gestión Logística: ${logisticaText}
-----------------------------------------`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateERPMemory());
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'sticky', top: '20px' }}>
      <div className="odoo-card" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ color: 'var(--text-primary)' }}><Calculator size={20} /> Workflow: Cálculo Final</h2>
          
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-secondary)' }}>
              <span>Días Permitidos de Corte:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{resultados.Dias_Permitidos_Corte} días</span>
            </div>
            
            <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '15px 0' }}/>

            <h3 className="no-print" style={{ color: 'var(--accent)', fontSize: '1rem', marginBottom: '10px' }}>Desglose de Costos Directos</h3>
            
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Uso de Equipos (Tecnología):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatGs(resultados.Costo_Tecnologia_Total)}</span>
            </div>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Mano de Obra (Especialistas + Auxiliares):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatGs(resultados.Costo_Mano_Obra_Total)}</span>
            </div>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Logística Global (Viajes/Estadía):</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formatGs(resultados.Logistica_Global_Total)}</span>
            </div>
            {resultados.Gastos_Imprevistos > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#f59e0b' }}>
                <span>Gastos Imprevistos Declarados:</span>
                <span>{formatGs(resultados.Gastos_Imprevistos)}</span>
              </div>
            )}
            {resultados.Costo_Subcontratistas_Total > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#a855f7' }}>
                <span>Subcontratos (Flat Rate):</span>
                <span>{formatGs(resultados.Costo_Subcontratistas_Total)}</span>
              </div>
            )}
            {resultados.Total_Alquileres > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#38bdf8' }}>
                <span>Alquileres Especiales:</span>
                <span>{formatGs(resultados.Total_Alquileres)}</span>
              </div>
            )}
            {resultados.Costo_SSMA_Consumibles > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#059669' }}>
                <span>Provisión SSMA y Consumibles ({resultados.porcentajeSSMAProvision || 5}%):</span>
                <span style={{ fontWeight: 'bold' }}>{formatGs(resultados.Costo_SSMA_Consumibles)}</span>
              </div>
            )}
            
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              <span>Total Costos Directos:</span>
              <span>{formatGs(resultados.Costo_Directo_Total)}</span>
            </div>

            <hr className="no-print" style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '15px 0' }}/>

            <h3 className="no-print" style={{ color: '#059669', fontSize: '1rem', marginBottom: '10px' }}>Rentabilidad y Margen</h3>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Gastos Adm. y Financieros ({(resultados.gastosAdminFinancieroPct ?? 6).toFixed(0)}% s/venta):</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatGs(resultados.Gastos_Administrativos)}</span>
            </div>
            {resultados.Ganancia_Tecnologia_Total > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Ganancia Tecnología ({(Variables_Globales.MARGEN_TECNOLOGIA * 100).toFixed(0)}% Eq):</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Tecnologia_Total)}</span>
              </div>
            )}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Ganancia Mano de Obra (Ingeniería):</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Ingenieria)}</span>
            </div>
            {resultados.Ganancia_Logistica > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Ganancia Logística (30%):</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Logistica)}</span>
              </div>
            )}
            {resultados.Ganancia_Imprevistos > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Ganancia Imprevistos:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Imprevistos)}</span>
              </div>
            )}
            {resultados.Costo_SSMA_Consumibles > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Ganancia SSMA y Consumibles:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_SSMA_Consumibles || 0)}</span>
              </div>
            )}
            {resultados.Ganancia_Tercerizados_Nuevos > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#7e22ce' }}>Ganancia de Subcontratistas:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Tercerizados_Nuevos)}</span>
              </div>
            )}

            {(resultados.Ganancia_Alquileres || 0) > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#0284c7' }}>Ganancia Servicios de Apoyo y Alquileres:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Alquileres)}</span>
              </div>
            )}

            {resultados.Precio_Mercado_Total_Trafos > 0 && (
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #10b981' }}>
                <strong>Estrategia Top-Down Activa:</strong> Precios fijados por valor de mercado.
                <div style={{ marginTop: '5px', color: '#064e3b', fontSize: '0.9rem' }}>
                  Total {resultados.Cantidad_Equipos_TopDown} unidades impactadas (Valor Acumulado: {formatGs(resultados.Precio_Mercado_Total_Trafos)})
                </div>
              </div>
            )}

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1rem', color: 'var(--text-primary)' }}>
              <span>Margen Real Neta:</span>
              <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{margenRealUI.toFixed(2)}%</span>
            </div>

            <div style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem' }}>SUBTOTAL (Sin IVA):</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>{formatGs(resultados.Precio_Venta_Final)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '15px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1.1rem' }}>IVA (10%):</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.2rem' }}>{formatGs(resultados.Precio_Venta_Final * 0.1)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '1.4rem' }}>PRECIO DE VENTA B2B:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '2rem' }}>{formatGs(resultados.Precio_Venta_Final * 1.1)}</span>
              </div>
              <small style={{ display: 'block', textAlign: 'right', color: 'var(--text-secondary)', marginTop: '5px' }}>Validez de la oferta: 15 días</small>
            </div>

            <button className="primary-btn no-print" onClick={exportToExcel} style={{ marginTop: '20px', padding: '18px', background: 'var(--accent)', color: 'white', width: '100%', display: 'flex', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s' }}>
              <FileSpreadsheet size={24} style={{ marginRight: '10px' }} /> Confirmar y Exportar Oferta
            </button>

          </div>
        </div>

        {/* NUEVA SECCIÓN: AUDITORÍA (No Imprimible) */}
        <div className="no-print" style={{ marginTop: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div 
            style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e2e8f0' }}
          >
            <div onClick={() => setShowAuditoria(!showAuditoria)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                🔍 Memoria de Cálculo (Audit Trail)
              </h3>
              <span style={{ color: 'var(--text-secondary)' }}>{showAuditoria ? '▲' : '▼'}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {copiedToast && (
                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
                  ✅ Copiado!
                </span>
              )}
              <button 
                onClick={copyToClipboard}
                style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              >
                <Copy size={14} /> Copiar a CRM
              </button>
            </div>
          </div>
          
          {showAuditoria && (
            <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>[RENTABILIDAD PURA]</strong>
                • Costo Directo Total: {formatGs(resultados.Costo_Directo_Total)}<br/>
                • Venta Total B2B: {formatGs(resultados.Precio_Venta_Final)}<br/>
                • Margen Real Neto: <strong style={{ color: '#059669' }}>{margenRealUI.toFixed(2)}%</strong>
              </div>
              
              {resultados.Pool_Logistica_Tabla && resultados.Pool_Logistica_Tabla.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#0284c7', display: 'block', marginBottom: '5px' }}>[DISTRIBUCIÓN DE LOGÍSTICA]</strong>
                  <div style={{ fontSize: '0.78rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem' }}>
                      <thead>
                        <tr style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Ítem</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Peso</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Cuota Costo</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Cuota P.Venta</th>
                          <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Ganancia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.Pool_Logistica_Tabla.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '3px 6px', color: 'var(--text-primary)', fontSize: '0.75rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.equipo}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{(row.peso_pct || 0).toFixed(1)}%</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', color: '#64748b' }}>{formatGs(Math.round(row.cuota_log_costo || 0))}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>{formatGs(Math.round(row.cuota_log_pv || 0))}</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>+{formatGs(Math.round(row.ganancia_log_item || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>[RIESGO OPERATIVO EN CAMPO]</strong>
                • Ventana de Trabajo: {resultados.Dias_Permitidos_Corte} días<br/>
                • Personal Total: {resultados.Personal_Simultaneo} ({qtyInternos} Internos | {qtyExternos} Externos)<br/>
                • Huella Logística: {resultados.Cantidad_Vehiculos} Vehículos
              </div>
              
              {alquileres && alquileres.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#0284c7', display: 'block', marginBottom: '5px' }}>[SERVICIOS DE APOYO Y ALQUILERES]</strong>
                  {alquileres.map(alq => {
                    const mPct = Math.min(99, Math.max(0, alq.margen ?? 30));
                    const mDec = mPct / 100;
                    const pv = mDec < 1 ? Math.round(alq.costo / (1 - mDec)) : alq.costo;
                    return (
                      <div key={alq.id} style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', fontSize: '0.82rem', borderBottom: '1px dashed #e2e8f0', paddingBottom: '3px', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--text-primary)', flex: 2 }}>{alq.descripcion || '(sin nombre)'}</span>
                        <span style={{ color: '#64748b' }}>{formatGs(alq.costo)}</span>
                        <span style={{ color: '#0284c7', fontWeight: 700 }}>{mPct.toFixed(0)}%</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{formatGs(pv)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ marginBottom: '5px' }}>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>[ESTRATEGIA COMERCIAL Y COBERTURA]</strong>
                • Fondo de Imprevistos: {formatGs(resultados.Gastos_Imprevistos)}<br/>
                • Inyección Top-Down: {resultados.Utilidad_Oculta_TopDown > 0 ? `Activo en ${resultados.Cantidad_Equipos_TopDown || 1} equipos` : 'No utilizado'}<br/>
                • Gestión Logística: {cotizacion.logisticsOverrides?.enabled ? 'Sobrescritura Manual Activa' : 'Cálculo Automático'}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
