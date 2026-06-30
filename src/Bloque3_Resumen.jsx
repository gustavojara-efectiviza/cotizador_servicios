import React from 'react';
import { ShieldCheck, TrendingUp, DollarSign, Award, Calculator, ArrowRight, Layers, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Bloque3_Resumen({ 
  totalProcura = 0, 
  totalServicios = 0, 
  detalleProcura = [], 
  detalleServicios = [] 
}) {
  const granTotal = (Number(totalProcura) || 0) + (Number(totalServicios) || 0);

  const formatMoneda = (val) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(val);
  };

  // EXPORTACIÓN EXCEL AUDITABLE CONSOLIDADA (MASTER DELIVERABLE)
  const exportarAExcelAuditable = () => {
    const workbook = XLSX.utils.book_new();
    const formatNum = (n) => Math.round(n || 0);
    const formatPct = (n) => `${(n || 0).toFixed(1)}%`;

    // -------------------------------------------------------------------------
    // HOJA 1: RESUMEN EJECUTIVO EPC CONSOLIDADO
    // -------------------------------------------------------------------------
    const rowsResumen = [
      ["CONSOLIDACIÓN COMERCIAL EPC - PROPUESTA LLAVE EN MANO"],
      [],
      ["Macro-Partida / Módulo", "Costo Directo (Gs.)", "Margen %", "Utilidad Neta (Gs.)", "Precio Venta (Gs.)"]
    ];

    // Calculamos totales de Procura para la tabla resumen
    let costoTotalProcura = 0, gananciaTotalProcura = 0, precioTotalProcura = 0;
    detalleProcura.forEach(eq => {
      const qty = eq.cantidad || 1;
      const fob = (eq.costoBase || 0) * qty;
      const flete = eq.tipoFlete === 'porcentaje' ? fob * ((eq.valorFlete || 0) / 100) : (eq.valorFlete || 0) * qty;
      const seguro = (fob + flete) * ((eq.porcentajeSeguro || 0) / 100);
      const cif = fob + flete + seguro;
      const arancel = cif * ((eq.porcentajeArancel || 0) / 100);
      const despacho = cif * ((eq.porcentajeDespacho || 0) / 100);
      const fleteLocal = eq.aplicarFleteLocal ? ((eq.montoFleteLocal || 0) * qty) : 0;
      const fin = cif * ((eq.porcentajeFinanciero || 0) / 100);
      const admin = cif * ((eq.porcentajeAdmin || 0) / 100);
      const landedCost = cif + arancel + despacho + fleteLocal + fin + admin;
      const margen = Math.min(0.99, (eq.margenPorcentaje || 0) / 100);
      const precioVenta = landedCost / (1 - margen);
      
      // Convertir a Gs (T.C 7500)
      const tc = 7500;
      costoTotalProcura += landedCost * tc;
      precioTotalProcura += precioVenta * tc;
      gananciaTotalProcura += (precioVenta - landedCost) * tc;
    });

    if (precioTotalProcura === 0 && totalProcura > 0) {
      precioTotalProcura = totalProcura;
      costoTotalProcura = totalProcura * 0.70;
      gananciaTotalProcura = totalProcura * 0.30;
    }

    const margenProcuraPct = precioTotalProcura > 0 ? (gananciaTotalProcura / precioTotalProcura) * 100 : 0;
    rowsResumen.push([
      "Procura de Equipos e Importación DDP (Bloque 1)",
      formatNum(costoTotalProcura),
      formatPct(margenProcuraPct),
      formatNum(gananciaTotalProcura),
      formatNum(precioTotalProcura)
    ]);

    // Calculamos totales de Servicios SSTT
    let costoTotalServicios = 0, gananciaTotalServicios = 0, precioTotalServicios = 0;
    detalleServicios.forEach(item => {
      const qty = item.cantidad || 1;
      costoTotalServicios += (item.costo_directo_unitario || 0) * qty;
      gananciaTotalServicios += (item.utilidad_neta_unitaria || 0) * qty;
      precioTotalServicios += (item.precio_unitario_final || 0) * qty;
    });

    if (precioTotalServicios === 0 && totalServicios > 0) {
      precioTotalServicios = totalServicios;
      costoTotalServicios = totalServicios * 0.60;
      gananciaTotalServicios = totalServicios * 0.40;
    }

    const margenServiciosPct = precioTotalServicios > 0 ? (gananciaTotalServicios / precioTotalServicios) * 100 : 0;
    rowsResumen.push([
      "Servicios Especializados y SSTT (Bloque 2)",
      formatNum(costoTotalServicios),
      formatPct(margenServiciosPct),
      formatNum(gananciaTotalServicios),
      formatNum(precioTotalServicios)
    ]);

    // Totales y Estructura Fiscal / Garantías
    const subtotalOferta = precioTotalProcura + precioTotalServicios;
    const iva10 = subtotalOferta * 0.10;
    const granTotalConIVA = subtotalOferta * 1.10;

    rowsResumen.push([]);
    rowsResumen.push(["", "", "", "SUBTOTAL CONSOLIDADO", formatNum(subtotalOferta)]);
    rowsResumen.push(["", "", "", "IVA (10%)", formatNum(iva10)]);
    rowsResumen.push(["", "", "", "OFERTA COMERCIAL GRAN TOTAL", formatNum(granTotalConIVA)]);
    rowsResumen.push([]);
    rowsResumen.push(["PÓLIZAS Y ESTRUCTURA DE GARANTÍAS EPC"]);
    rowsResumen.push(["Póliza de Fiel Cumplimiento (5%)", formatNum(subtotalOferta * 0.05)]);
    rowsResumen.push(["Póliza de Anticipo Financiero (20%)", formatNum(subtotalOferta * 0.20)]);
    rowsResumen.push(["Fondo de Contingencia Licitatoria (3%)", formatNum(subtotalOferta * 0.03)]);

    const wsResumen = XLSX.utils.aoa_to_sheet(rowsResumen);
    wsResumen['!cols'] = [{wch: 45}, {wch: 22}, {wch: 15}, {wch: 22}, {wch: 25}];
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen Ejecutivo EPC");

    // -------------------------------------------------------------------------
    // HOJA 2: AUDITORÍA DE PROCURA DDP (BLOQUE 1)
    // -------------------------------------------------------------------------
    const rowsProcura = [
      ["AUDITORÍA DE PROCURA DE EQUIPOS E IMPORTACIÓN (LANDED COST DDP)"],
      [],
      [
        "Equipo / Suministro", "Cant", "NCM", "FOB Unit (USD)", "Flete Int (USD)", 
        "Seguro Int (USD)", "CIF Unit (USD)", "Arancel (USD)", "Despacho (USD)", 
        "Flete Local (USD)", "Financiero (USD)", "Admin (USD)", "Landed Cost Unit (USD)", 
        "Landed Cost Total (USD)", "Margen %", "Precio Venta Unit (USD)", "Precio Venta Total (USD)"
      ]
    ];

    if (detalleProcura.length === 0) {
      rowsProcura.push(["Sin equipos cargados en procura", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
    } else {
      detalleProcura.forEach(eq => {
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
        const landedCostUnit = landedCostTotal / qty;
        const margen = Math.min(0.99, (eq.margenPorcentaje || 0) / 100);
        const precioVentaTotal = landedCostTotal / (1 - margen);
        const precioVentaUnit = precioVentaTotal / qty;

        rowsProcura.push([
          eq.nombre,
          qty,
          eq.ncm,
          formatNum(fobUnit),
          formatNum(fleteTotal / qty),
          formatNum(seguroTotal / qty),
          formatNum(cifTotal / qty),
          formatNum(arancelTotal / qty),
          formatNum(despachoTotal / qty),
          formatNum(fleteLocalTotal / qty),
          formatNum(finTotal / qty),
          formatNum(adminTotal / qty),
          formatNum(landedCostUnit),
          formatNum(landedCostTotal),
          formatPct(eq.margenPorcentaje),
          formatNum(precioVentaUnit),
          formatNum(precioVentaTotal)
        ]);
      });
    }

    const wsProcura = XLSX.utils.aoa_to_sheet(rowsProcura);
    wsProcura['!cols'] = [
      {wch: 35}, {wch: 8}, {wch: 12}, {wch: 16}, {wch: 15}, 
      {wch: 15}, {wch: 16}, {wch: 14}, {wch: 14}, {wch: 16}, 
      {wch: 15}, {wch: 14}, {wch: 20}, {wch: 22}, {wch: 12}, 
      {wch: 20}, {wch: 22}
    ];
    XLSX.utils.book_append_sheet(workbook, wsProcura, "Audit Procura DDP");

    // -------------------------------------------------------------------------
    // HOJA 3: AUDITORÍA DE SERVICIOS SSTT (BLOQUE 2)
    // -------------------------------------------------------------------------
    const rowsSSTT = [
      ["AUDITORÍA DE SERVICIOS ESPECIALIZADOS Y MONTAJE (SSTT V1)"],
      [],
      [
        "Equipo / Servicio", "Tensión / Cat", "Estrategia", "Cantidad", 
        "Costo Directo Base", "Costo Service Fee", "Costo Amortización", 
        "Costo Directo Total", "Utilidad Neta Unit", "Margen %", 
        "Precio Venta Unitario", "Precio Venta Total Ítem"
      ]
    ];

    if (detalleServicios.length === 0) {
      rowsSSTT.push(["Sin servicios cargados en carrito SSTT", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]);
    } else {
      detalleServicios.forEach(item => {
        const qty = item.cantidad || 1;
        const costoBase = (item.costo_directo_unitario || 0) - (item.costoServiceFee || 0) - (item.costoAmortizacion || 0);
        const precioUnit = item.precio_unitario_final || 0;
        const utilUnit = item.utilidad_neta_unitaria || 0;
        const margenReal = precioUnit > 0 ? (utilUnit / precioUnit) * 100 : 0;

        rowsSSTT.push([
          item.equipo,
          item.tension || 'N/A',
          item.estrategia || 'Normal',
          qty,
          formatNum(costoBase),
          formatNum(item.costoServiceFee || 0),
          formatNum(item.costoAmortizacion || 0),
          formatNum(item.costo_directo_unitario || 0),
          formatNum(utilUnit),
          formatPct(margenReal),
          formatNum(precioUnit),
          formatNum(precioUnit * qty)
        ]);
      });
    }

    const wsSSTT = XLSX.utils.aoa_to_sheet(rowsSSTT);
    wsSSTT['!cols'] = [
      {wch: 35}, {wch: 15}, {wch: 14}, {wch: 10}, 
      {wch: 18}, {wch: 18}, {wch: 18}, {wch: 20}, 
      {wch: 18}, {wch: 12}, {wch: 20}, {wch: 22}
    ];
    XLSX.utils.book_append_sheet(workbook, wsSSTT, "Audit SSTT Servicios");

    // DESCARGAR LIBRO AUDITABLE
    XLSX.writeFile(workbook, "Entregable_Consolidado_EPC_Auditable.xlsx");
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

          {/* BOTÓN DE EXPORTACIÓN EXCEL AUDITABLE */}
          <button 
            onClick={exportarAExcelAuditable}
            className="primary-btn"
            style={{
              width: 'auto',
              padding: '12px 24px',
              background: '#10b981',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 6px -1px rgba(16,185,129,0.2)'
            }}
          >
            <FileSpreadsheet size={20} /> Exportar Entregable Auditable Excel (.xlsx)
          </button>
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
            {formatMoneda(totalProcura)}
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
