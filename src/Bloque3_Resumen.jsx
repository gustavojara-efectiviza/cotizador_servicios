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
  esLicitacion = true,
  onGuardar,
  isSaving
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
      const fleteTotal = eq.tipoFlete === 'porcentaje' ? fobTotal * ((eq.valorFlete || 0) / 100) : (eq.valorFlete || 0) * qty;
      const seguroTotal = (fobTotal + fleteTotal) * ((eq.porcentajeSeguro || 0) / 100);
      const cifTotal = fobTotal + fleteTotal + seguroTotal;
      const arancelTotal = cifTotal * ((eq.porcentajeArancel || 0) / 100);
      const despachoTotal = cifTotal * ((eq.porcentajeDespacho || 0) / 100);
      const fleteLocalTotal = eq.aplicarFleteLocal ? ((eq.montoFleteLocal || 0) * qty) : 0;
      const finTotal = cifTotal * ((eq.porcentajeFinanciero || 0) / 100);
      const adminTotal = cifTotal * ((eq.porcentajeAdmin || 0) / 100);
      
      const landedCostTotal = cifTotal + arancelTotal + despachoTotal + fleteLocalTotal + finTotal + adminTotal;
      const landedCostUnit = qty > 0 ? landedCostTotal / qty : 0;
      
      const margenDecimal = Math.min(0.99, (eq.margenPorcentaje || 0) / 100);

      return {
        descripcion: eq.nombre || 'Suministro sin nombre',
        cantidad: qty,
        costoBase: landedCostUnit,
        margen: margenDecimal,
        moneda: 'USD'
      };
    });

    // 2. ADAPTADOR DE SERVICIOS
    const serviciosAdaptados = detalleServicios.map(item => {
      const qty = item.cantidad || 1;
      const costoDirUnitario = item.costo_directo_unitario || 0;
      const precioFinalUnitario = item.precio_unitario_final || 0;
      
      let margenCalc = 0;
      if (precioFinalUnitario > costoDirUnitario && precioFinalUnitario > 0) {
         margenCalc = 1 - (costoDirUnitario / precioFinalUnitario);
      }

      return {
        descripcion: item.equipo || item.nombre || 'Servicio Especializado',
        cantidad: qty,
        costoBase: costoDirUnitario,
        margen: margenCalc,
        moneda: 'PYG'
      };
    });

    // 3. NORMALIZAR MONEDA DE COSTOS GLOBALES
    // granTotal está siempre en PYG.
    const contingenciaPYG = granTotal * 0.03;
    const riesgosNormalizados = monedaTrabajo === 'USD' ? (contingenciaPYG / tipoCambio) : contingenciaPYG;

    const estadoGlobal = {
      equipos: procuraAdaptada,
      servicios: serviciosAdaptados,
      viaticos: 0,
      riesgos: riesgosNormalizados,
      logistica: 0,
      financieros: 0,
      margenGlobal: 0.15,
      esLicitacion,
      moneda: monedaTrabajo,
      tasaCambio: tipoCambio
    };
    await exportarAExcelAuditable(estadoGlobal);
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
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #0d2d5e 0%, #1a4f8a 100%)',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(13,45,94,0.35)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              <FileSpreadsheet size={20} /> Exportar Entregable Excel (.xlsx)
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
