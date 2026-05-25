import { useState } from 'react';
import { Variables_Globales } from './financialEngine';
import { Calculator, FileSpreadsheet, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CRMFinancialPanel({ resultados, cotizacion, equiposCotizados = [], alquileres = [] }) {
  const [showAuditoria, setShowAuditoria] = useState(false);

  const formatGs = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num);

  const exportToExcel = () => {
    const itemsParaExcel = resultados.equiposProcesados || [];
    const alquileresExcel = resultados.alquileresProcesados || [];
    
    // 3. Build Rows
    const rows = [];
    
    // Header
    rows.push([
      "Equipo / Servicio", 
      "Cantidad", 
      "Costo Directo Unitario", 
      "Estrategia", 
      "% Margen Real",
      "Gasto Admin Unitario", 
      "Utilidad Neta Unitaria", 
      "Precio Venta Unitario", 
      "Precio Venta Total"
    ]);
    
    let sumTotal = 0;
    
    // 1. Equipos Técnicos
    itemsParaExcel.forEach(item => {
      const precioUnitario = item.precio_unitario_final || 0;
      const precioTotal = precioUnitario * item.cantidad;
      sumTotal += precioTotal;
      
      const utilUnitaria = item.utilidad_neta_unitaria || 0;
      const margenReal = precioUnitario > 0 ? (utilUnitaria / precioUnitario) * 100 : 0;
      
      rows.push([
        item.equipo, 
        item.cantidad, 
        Math.round(item.costo_directo_unitario || 0),
        item.estrategia || 'Normal',
        `${margenReal.toFixed(1)}%`,
        Math.round(item.admin_unitario || 0),
        Math.round(utilUnitaria),
        Math.round(precioUnitario), 
        Math.round(precioTotal)
      ]);
    });

    // 2. Alquileres
    alquileresExcel.forEach(alq => {
      const precioUnitario = alq.precio_unitario_final || 0;
      sumTotal += precioUnitario; 
      const utilUnitaria = alq.utilidad_neta_unitaria || 0;
      const margenReal = precioUnitario > 0 ? (utilUnitaria / precioUnitario) * 100 : 0;
      
      rows.push([
        `Alquiler Especial: ${alq.descripcion}`, 
        1, 
        Math.round(alq.costo_directo_unitario || 0),
        alq.estrategia || 'Alquiler Especial',
        `${margenReal.toFixed(1)}%`,
        Math.round(alq.admin_unitario || 0),
        Math.round(utilUnitaria),
        Math.round(precioUnitario), 
        Math.round(precioUnitario)
      ]);
    });

    // 3. Logística
    if (resultados.Precio_Venta_Logistica > 0) {
      sumTotal += resultados.Precio_Venta_Logistica;
      
      const costoLogistica = resultados.Logistica_Global_Total || 0;
      const adminLogistica = costoLogistica * (Variables_Globales.Gastos_Administrativos_Porcentaje / 100);
      const utilidadLogistica = resultados.Ganancia_Logistica || 0;
      
      const margenReal = resultados.Precio_Venta_Logistica > 0 ? (utilidadLogistica / resultados.Precio_Venta_Logistica) * 100 : 0;
      
      rows.push([
        `Logística, Movilización y Despliegue`, 
        1, 
        Math.round(costoLogistica),
        "Logística Global",
        `${margenReal.toFixed(1)}%`,
        Math.round(adminLogistica),
        Math.round(utilidadLogistica),
        Math.round(resultados.Precio_Venta_Logistica), 
        Math.round(resultados.Precio_Venta_Logistica)
      ]);
    }
    
    // 4. Imprevistos (Gestión de Riesgos)
    if (resultados.Ganancia_Imprevistos > 0 || resultados.Gastos_Imprevistos > 0) {
      const costoImprevistos = resultados.Gastos_Imprevistos || 0;
      const adminImprevistos = costoImprevistos * (Variables_Globales.Gastos_Administrativos_Porcentaje / 100);
      const utilidadImprevistos = resultados.Ganancia_Imprevistos || 0;
      const precioImprevistos = costoImprevistos + adminImprevistos + utilidadImprevistos;
      
      sumTotal += precioImprevistos;
      
      const margenReal = precioImprevistos > 0 ? (utilidadImprevistos / precioImprevistos) * 100 : 0;
      
      rows.push([
        `Gestión de Riesgos y Contingencias Operativas`, 
        1, 
        Math.round(costoImprevistos),
        "Gestión de Riesgos",
        `${margenReal.toFixed(1)}%`,
        Math.round(adminImprevistos),
        Math.round(utilidadImprevistos),
        Math.round(precioImprevistos), 
        Math.round(precioImprevistos)
      ]);
    }
    
    // Subtotal y Finales
    rows.push(["", "", "", "", "", "", "", "", ""]); // Fila vacía
    rows.push(["", "", "", "", "", "", "", "SUBTOTAL", Math.round(sumTotal)]);
    rows.push(["", "", "", "", "", "", "", "IVA (10%)", Math.round(sumTotal * 0.1)]);
    rows.push(["", "", "", "", "", "", "", "GRAN TOTAL", Math.round(sumTotal * 1.1)]);

    // 4. Export
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cotización");
    
    let fileName = 'Cotizacion_SinNombre.xlsx';
    if (cotizacion.Cliente && cotizacion.NombreObra) {
      fileName = `Cotizacion_${cotizacion.Cliente}_${cotizacion.NombreObra}.xlsx`;
    } else if (cotizacion.Cliente) {
      fileName = `Cotizacion_${cotizacion.Cliente}.xlsx`;
    } else if (cotizacion.NombreObra) {
      fileName = `Cotizacion_${cotizacion.NombreObra}.xlsx`;
    }
    
    // Replace spaces with underscores for a clean filename
    fileName = fileName.replace(/\s+/g, '_');
    
    XLSX.writeFile(workbook, fileName);
  };

  const Gran_Total_Utilidad_Neta = (resultados.Ganancia_Ingenieria || 0) + 
    (resultados.Ganancia_Tecnologia_Total || 0) + 
    (resultados.Ganancia_Logistica || 0) + 
    (resultados.Ganancia_Imprevistos || 0) + 
    (resultados.Ganancia_Tercerizados_Nuevos || 0) + 
    (resultados.Ganancia_Alquileres || 0) + 
    (resultados.Utilidad_Oculta_TopDown || 0);

  const margenRealUI = resultados.Precio_Venta_Final > 0 
    ? (Gran_Total_Utilidad_Neta / resultados.Precio_Venta_Final) * 100 
    : 0;

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
    const topDownText = resultados.Utilidad_Oculta_TopDown > 0 ? `Activo en ${resultados.Cantidad_Trafos || 1} equipos` : 'No utilizado';

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
    alert("✅ Copiado al portapapeles (Formato ERP).");
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
            
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              <span>Total Costos Directos:</span>
              <span>{formatGs(resultados.Costo_Directo_Total)}</span>
            </div>

            <hr className="no-print" style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '15px 0' }}/>

            <h3 className="no-print" style={{ color: '#059669', fontSize: '1rem', marginBottom: '10px' }}>Rentabilidad y Margen</h3>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Gastos Administrativos (3%):</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatGs(resultados.Gastos_Administrativos)}</span>
            </div>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Ganancia Tecnología ({(Variables_Globales.MARGEN_TECNOLOGIA * 100).toFixed(0)}% Eq):</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Tecnologia_Total)}</span>
            </div>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Ganancia Ingeniería (100% MO):</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Ingenieria)}</span>
            </div>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Ganancia Logística (30%):</span>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Logistica)}</span>
            </div>
            {resultados.Ganancia_Imprevistos > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Ganancia Imprevistos:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Imprevistos)}</span>
              </div>
            )}
            {resultados.Ganancia_Tercerizados_Nuevos > 0 && (
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span style={{ color: '#7e22ce' }}>Ganancia de Subcontratistas:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>+{formatGs(resultados.Ganancia_Tercerizados_Nuevos)}</span>
              </div>
            )}

            {resultados.Precio_Mercado_Aplicado > 0 && (
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #10b981' }}>
                <strong>Estrategia Top-Down Activa:</strong> El precio fue fijado por valor de mercado.
                <div style={{ marginTop: '5px', color: '#064e3b', fontSize: '0.9rem' }}>
                  Valor Inyectado: <strong>{formatGs(cotizacion.Precio_Mercado_Aplicado)}</strong> (x {resultados.Cantidad_Trafos} unidades = {formatGs(resultados.Precio_Mercado_Total_Trafos)})
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
            
            <button 
              onClick={copyToClipboard}
              style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <Copy size={14} /> Copiar a CRM
            </button>
          </div>
          
          {showAuditoria && (
            <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>[RENTABILIDAD PURA]</strong>
                • Costo Directo Total: {formatGs(resultados.Costo_Directo_Total)}<br/>
                • Venta Total B2B: {formatGs(resultados.Precio_Venta_Final)}<br/>
                • Margen Real Neto: <strong style={{ color: '#059669' }}>{margenRealUI.toFixed(2)}%</strong>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>[RIESGO OPERATIVO EN CAMPO]</strong>
                • Ventana de Trabajo: {resultados.Dias_Permitidos_Corte} días<br/>
                • Personal Total: {resultados.Personal_Simultaneo} ({qtyInternos} Internos | {qtyExternos} Externos)<br/>
                • Huella Logística: {resultados.Cantidad_Vehiculos} Vehículos
              </div>
              
              <div style={{ marginBottom: '5px' }}>
                <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '5px' }}>[ESTRATEGIA COMERCIAL Y COBERTURA]</strong>
                • Fondo de Imprevistos: {formatGs(resultados.Gastos_Imprevistos)}<br/>
                • Inyección Top-Down: {resultados.Utilidad_Oculta_TopDown > 0 ? `Activo en ${resultados.Cantidad_Trafos || 1} equipos` : 'No utilizado'}<br/>
                • Gestión Logística: {cotizacion.logisticsOverrides?.enabled ? 'Sobrescritura Manual Activa' : 'Cálculo Automático'}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
