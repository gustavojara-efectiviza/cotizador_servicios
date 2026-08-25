import React from 'react';
import { ShieldCheck, TrendingUp, DollarSign, Award, Calculator, ArrowRight, Layers, FileSpreadsheet } from 'lucide-react';
import { exportarAExcelAuditable } from './utils/excelExport';
import * as XLSX from 'xlsx';

export default function Bloque3_Resumen({ 
  totalProcura = 0, 
  totalServicios = 0, 
  detalleProcura = [], 
  detalleServicios = [],
  tipoCambio = 7500,
  monedaTrabajo = 'USD',
  nombreCliente = '',
  nombreProyecto = '',
  alquileres = [],
  gastosImprevistos = 0,
  esLicitacion = true,
  resultadosSSTT = null,
  onGuardar,
  isSaving,
  copilotRef
}) {
  const granTotal = (Number(totalProcura) * tipoCambio || 0) + (Number(totalServicios) || 0);

  const formatMoneda = (valGs) => {
    if (monedaTrabajo === 'USD') {
      const valUSD = valGs / tipoCambio;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(valUSD);
    }
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(valGs);
  };

  const handleExportExcel = async () => {
    // 1. ADAPTADOR DE PROCURA (Calculando Landed Cost como Costo Directo Base)
    const procuraAdaptada = detalleProcura.map(eq => {
      const qty = eq.cantidad || 1;
      const fobUnit = eq.costoBase || 0;
      const fobTotal = fobUnit * qty;
      const mod = eq.modalidad || 'FOB/EXW';
      
      const fletePct = eq.valorFlete !== undefined ? eq.valorFlete : 5; // 5% default
      const seguroPct = eq.porcentajeSeguro !== undefined ? eq.porcentajeSeguro : 2; // 2% default
      
      const fleteTotal = mod === 'FOB/EXW' ? fobTotal * (fletePct / 100) : 0;
      const seguroTotal = mod === 'FOB/EXW' ? (fobTotal + fleteTotal) * (seguroPct / 100) : 0;
      
      const cifTotal = fobTotal + fleteTotal + seguroTotal;
      
      const arancelPct = eq.porcentajeArancel !== undefined ? eq.porcentajeArancel : 0;
      const despachoPct = eq.porcentajeDespacho !== undefined ? eq.porcentajeDespacho : 6;
      
      const arancelTotal = mod !== 'Local' ? cifTotal * (arancelPct / 100) : 0;
      const despachoTotal = mod !== 'Local' ? cifTotal * (despachoPct / 100) : 0;
      
      const fleteLocalTotal = eq.aplicarFleteLocal ? ((eq.montoFleteLocal || 0) * qty) : 0;
      
      const finPct = eq.porcentajeFinanciero !== undefined ? eq.porcentajeFinanciero : 3;
      const adminPct = eq.porcentajeAdmin !== undefined ? eq.porcentajeAdmin : 3;
      
      const finTotal = cifTotal * (finPct / 100);
      const adminTotal = cifTotal * (adminPct / 100);
      
      const landedCostTotal = cifTotal + arancelTotal + despachoTotal + fleteLocalTotal + finTotal + adminTotal;
      const landedCostUnit = qty > 0 ? landedCostTotal / qty : 0;
      
      const margenDecimal = Math.min(0.99, (eq.margenPorcentaje || 0) / 100);

      return {
        descripcion: eq.nombre || 'Suministro sin nombre',
        cantidad: qty,
        costoBase: landedCostUnit, // Costo total base (Landed Cost Unitario)
        margen: margenDecimal,
        moneda: 'USD',
        // --- Variables de Desglose para Auditoría ---
        fobUnit: fobUnit,
        fleteTotal: fleteTotal,
        seguroTotal: seguroTotal,
        cifTotal: cifTotal,
        arancelTotal: arancelTotal,
        despachoTotal: despachoTotal,
        fleteLocalTotal: fleteLocalTotal,
        finTotal: finTotal,
        adminTotal: adminTotal
      };
    });

    // 2. ADAPTADOR DE SERVICIOS
    const serviciosAdaptados = detalleServicios.map(item => {
      const qty = item.cantidad || 1;
      const costoDirUnitario = item.costo_directo_unitario || 0;
      const precioFinalUnitario = item.precio_unitario_final || 0;
      const precioFinalTotal = item.precio_total_final || (precioFinalUnitario * qty);
      const costoTotalReal = item.costo_total_real || (costoDirUnitario * qty);
      
      const margenReal = item.margen !== undefined 
        ? item.margen 
        : (precioFinalTotal > 0 && precioFinalTotal > costoTotalReal 
            ? (1 - (costoTotalReal / precioFinalTotal)) 
            : 0.30);

      return {
        descripcion: item.equipo || item.nombre || 'Servicio Especializado',
        cantidad: qty,
        costoBase: costoDirUnitario,
        margen: margenReal,
        precio_unitario_final: precioFinalUnitario,
        precio_total_final: precioFinalTotal,
        costo_total_real: costoTotalReal,
        logAsignada: item.logAsignada || 0,
        impAsignado: item.impAsignado || 0,
        adminAsignado: item.adminAsignado || 0,
        moneda: 'PYG',
        estrategia: item.estrategia || 'Normal',
        Costo_Tecnologia_Item: Number(item.Costo_Tecnologia_Item) || 0,
        Costo_MO_Item: Number(item.Costo_MO_Item) || 0,
        Costo_Subcontrato_Item: Number(item.Costo_Subcontrato_Item) || 0,
        Margen_Subcontrato_Item: Number(item.Margen_Subcontrato_Item) || 0,
        costoServiceFee: Number(item.costoServiceFee) || 0,
        margenServiceFee: Number(item.margenServiceFee) || 0,
        costoAmortizacion: Number(item.costoAmortizacion) || 0,
        horas_equipo: (item.is_tercerizado || item.estrategia === 'Subcontrato') ? 0 : (item.horas_equipo ?? item.overrides?.horas_equipo ?? 0),
        horas_servicio: (item.is_tercerizado || item.estrategia === 'Subcontrato') ? 0 : (item.horas_servicio ?? item.overrides?.horas_servicio ?? 0),
        modo_subcontrato: item.modo_subcontrato || item.overrides?.modo_subcontrato || 'fijo',
        sub_esp_cant: Number(item.sub_esp_cant || item.overrides?.sub_esp_cant) || 0,
        sub_esp_costo_dia: Number(item.sub_esp_costo_dia || item.overrides?.sub_esp_costo_dia) || 0,
        sub_esp_dias: Number(item.sub_esp_dias || item.overrides?.sub_esp_dias) || 0,
        sub_aux_cant: Number(item.sub_aux_cant || item.overrides?.sub_aux_cant) || 0,
        sub_aux_costo_dia: Number(item.sub_aux_costo_dia || item.overrides?.sub_aux_costo_dia) || 0,
        sub_aux_dias: Number(item.sub_aux_dias || item.overrides?.sub_aux_dias) || 0
      };
    });

    // 3. ADAPTADOR DE ALQUILERES ESPECIALES (Partida Visible e Independiente)
    const alquileresAdaptados = (resultadosSSTT?.alquileresProcesados || alquileres || []).map(alq => {
      const costo = Number(alq.costo || alq.costo_directo_unitario || alq.costoBase) || 0;
      const precio = Number(alq.precio_unitario_final) || (costo * 1.30);
      const margen = (precio > 0 && precio > costo) ? (1 - (costo / precio)) : 0.30;
      return {
        descripcion: alq.nombre || alq.descripcion || alq.equipo || 'Alquiler Especial / Equipo de Apoyo',
        cantidad: Number(alq.cantidad) || 1,
        costoBase: costo,
        margen: margen,
        precioFinal: precio,
        moneda: 'PYG'
      };
    });

    // 4. DATOS COMPLETOS PARA EXPORTACIÓN AUDITABLE
    const estadoGlobal = {
      cliente: nombreCliente,
      proyecto: nombreProyecto,
      equipos: procuraAdaptada,
      servicios: serviciosAdaptados,
      alquileres: alquileresAdaptados,
      logisticaGlobal: Number(resultadosSSTT?.Logistica_Global_Total) || 0,
      gananciaLogistica: Number(resultadosSSTT?.Ganancia_Logistica) || 0,
      precioVentaLogistica: Number(resultadosSSTT?.Precio_Venta_Logistica) || 0,
      gastosImprevistos: Number(resultadosSSTT?.Gastos_Imprevistos ?? gastosImprevistos) || 0,
      gananciaImprevistos: Number(resultadosSSTT?.Ganancia_Imprevistos) || 0,
      gastosAdminSSTT: Number(resultadosSSTT?.Gastos_Administrativos) || 0,
      precioVentaFinalSSTT: Number(resultadosSSTT?.Precio_Venta_Final) || 0,
      viaticos: Number(resultadosSSTT?.Costo_Viaticos_Total) || 0,
      hospedaje: Number(resultadosSSTT?.Costo_Hospedaje_Total) || 0,
      movilidad: Number(resultadosSSTT?.Costo_Movilidad_Total) || 0,
      esLicitacion,
      moneda: monedaTrabajo,
      tasaCambio: tipoCambio
    };
    await exportarAExcelAuditable(estadoGlobal);
    
    if (copilotRef && copilotRef.current) {
      copilotRef.current.celebrarExito('¡Exportación Exitosa! Excel generado.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* CABECERA BLOQUE 3 CON BOTÓN DE EXPORTACIÓN AUDITABLE */}
      <div className="odoo-card" style={{ background: '#ffffff', borderLeft: '4px solid #8b5cf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: '#f3e8ff', padding: '12px', borderRadius: '10px', border: '1px solid #d8b4fe' }}>
              <ShieldCheck color="#8b5cf6" size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>Bloque 3: Consolidación EPC, Garantías & Matriz de Riesgos</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Consolidación unificada de la oferta comercial (Procura Bloque 1 + Servicios SSTT Bloque 2)
              </p>
            </div>
          </div>

          {/* BOTÓN ÚNICO DE ACCIÓN: EXPORTAR ENTREGABLE */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleExportExcel}
              style={{
                width: 'auto',
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                color: '#ffffff',
                borderRadius: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 6px 20px rgba(234, 88, 12, 0.4)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.05rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(234, 88, 12, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(234, 88, 12, 0.4)';
              }}
            >
              <FileSpreadsheet size={22} /> Exportar Entregable Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS CONSOLIDADAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* TARJETA 1: PROCURA */}
        <div className="odoo-card" style={{ background: '#ffffff', borderTop: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
              Suministros & Procura (B1)
            </span>
            <div style={{ background: '#eff6ff', padding: '6px', borderRadius: '6px' }}>
              <Layers size={20} color="#2563eb" />
            </div>
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            {formatMoneda(totalProcura * tipoCambio)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            {detalleProcura.length} equipo(s) auditables en planilla de importación.
          </p>
        </div>

        {/* TARJETA 2: SERVICIOS */}
        <div className="odoo-card" style={{ background: '#ffffff', borderTop: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>
              Servicios Especializados & SSTT (B2)
            </span>
            <div style={{ background: '#d1fae5', padding: '6px', borderRadius: '6px' }}>
              <Calculator size={20} color="#10b981" />
            </div>
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            {formatMoneda(totalServicios)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            {detalleServicios.length} servicio(s) auditables en carrito técnico V1.
          </p>
        </div>

        {/* TARJETA 3: GRAN TOTAL CONSOLIDADO */}
        <div className="odoo-card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', borderTop: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
              Oferta Comercial Gran Total EPC
            </span>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px' }}>
              <Award size={20} color="#c084fc" />
            </div>
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>
            {formatMoneda(granTotal)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            Suma total consolidada de la propuesta llave en mano (Procura + SSTT).
          </p>
        </div>

      </div>

      {/* MATRIZ ADICIONAL DE GARANTÍAS Y CONTINGENCIAS PRELIMINAR */}
      <div className="odoo-card" style={{ background: '#ffffff' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#0f172a', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={20} color="#8b5cf6" /> Desglose de Pólizas y Estructura de Contingencias
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Póliza de Fiel Cumplimiento (5%)</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{formatMoneda(granTotal * 0.05)}</span>
          </div>
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Póliza de Anticipo Financiero (20%)</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{formatMoneda(granTotal * 0.20)}</span>
          </div>
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Fondo de Contingencia EPC (3%)</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6' }}>{formatMoneda(granTotal * 0.03)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
