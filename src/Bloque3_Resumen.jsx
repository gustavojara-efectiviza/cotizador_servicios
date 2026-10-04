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
    // Usar items ya procesados por el motor financiero (tienen costoFee, costoAmort, precioVentaNeto, etc.)
    // Si no hay equiposProcesados, hacer fallback al adaptador legacy
    const serviciosAdaptados = (resultadosSSTT?.equiposProcesados && resultadosSSTT.equiposProcesados.length > 0)
      ? resultadosSSTT.equiposProcesados.map(item => ({
          ...item,
          descripcion: item.equipo || item.nombre || item.descripcion || 'Servicio Especializado',
          moneda: 'PYG',
          // Asegurar que los campos del excelExport.js existan con los nombres correctos
          Costo_Tecnologia_Item: item.Costo_Tecnologia_Item || item.Costo_Tecnologia || 0,
          Costo_MO_Item: item.Costo_MO_Item || 0,
          Costo_Subcontrato_Item: item.Costo_Subcontrato_Item || 0,
          // costoFee y costoAmort ya vienen del motor con esos nombres exactos
          is_tercerizado: item.isTercerizado,
          precioVentaNeto: item.precio_total_final / 1.10,
          precioVentaConIVA: item.precio_total_final,
          adminAsignado: item.adminAsignado || 0,
          ssmaAsignado: item.ssmaAsignado || 0,
          logAsignada: item.logAsignada || 0,
          impAsignado: item.impAsignado || 0,
        }))
      : detalleServicios.map(item => {
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
            ssmaAsignado: item.ssmaAsignado || 0,
            moneda: 'PYG',
            estrategia: item.estrategia || 'Normal',
            Costo_Tecnologia_Item: Number(item.Costo_Tecnologia_Item) || 0,
            Costo_MO_Item: Number(item.Costo_MO_Item) || 0,
            Costo_Subcontrato_Item: Number(item.Costo_Subcontrato_Item) || 0,
            costoFee: Number(item.costoServiceFee || item.costoFee) || 0,
            costoAmort: Number(item.costoAmortizacion || item.costoAmort) || 0,
            horas_equipo: (item.is_tercerizado || item.estrategia === 'Subcontrato') ? 0 : (item.horas_equipo ?? 0),
            horas_servicio: (item.is_tercerizado || item.estrategia === 'Subcontrato') ? 0 : (item.horas_servicio ?? 0),
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
      costoSSMA: Number(resultadosSSTT?.Costo_SSMA_Consumibles) || 0,
      gananciaSSMA: Number(resultadosSSTT?.Ganancia_SSMA_Consumibles) || 0,
      precioVentaSSMA: Number(resultadosSSTT?.Precio_SSMA_Consumibles) || 0,
      aplicarSSMAProvision: resultadosSSTT?.aplicarSSMAProvision ?? true,
      porcentajeSSMAProvision: resultadosSSTT?.porcentajeSSMAProvision ?? 5,
      gastosAdminSSTT: Number(resultadosSSTT?.Gastos_Administrativos) || 0,
      precioVentaFinalSSTT: Number(resultadosSSTT?.Precio_Venta_Final) || 0,
      viaticos: Number(resultadosSSTT?.Costo_Viaticos_Total) || 0,
      hospedaje: Number(resultadosSSTT?.Costo_Hospedaje_Total) || 0,
      movilidad: Number(resultadosSSTT?.Costo_Movilidad_Total) || 0,
      esLicitacion,
      poolLogistica: resultadosSSTT?.Pool_Logistica_Tabla || [],
        diasObra: Number(resultadosSSTT?.Dias_Reales_Obra) || 0,
        personalSimultaneo: Number(resultadosSSTT?.Personal_Simultaneo) || 0,
        gastosAdminFinancieroPct: Number(resultadosSSTT?.gastosAdminFinancieroPct) || 6,
        moneda: monedaTrabajo,
      tasaCambio: tipoCambio
    };
    console.log('DEBUG EXPORT - equiposProcesados count:', resultadosSSTT?.equiposProcesados?.length, 'serviciosAdaptados count:', serviciosAdaptados.length, 'first item costoFee:', serviciosAdaptados[0]?.costoFee, 'first item costoAmort:', serviciosAdaptados[0]?.costoAmort, 'first item precioVentaNeto:', serviciosAdaptados[0]?.precioVentaNeto, 'first item margen:', serviciosAdaptados[0]?.margen);
    await exportarAExcelAuditable(estadoGlobal);
    
    if (copilotRef && copilotRef.current) {
      copilotRef.current.celebrarExito('¡Exportación Exitosa! Excel generado.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* CABECERA BLOQUE 3 CON BOTÓN DE EXPORTACIÓN AUDITABLE */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="m-0 text-base font-bold text-slate-900">Bloque 3: Consolidación EPC, Garantías & Matriz de Riesgos</h2>
              <p className="m-0 text-xs text-slate-500">
                Consolidación unificada de la oferta comercial (Procura Bloque 1 + Servicios SSTT Bloque 2)
              </p>
            </div>
          </div>

          {/* BOTÓN SECUNDARIO ELEGANTE: EXPORTAR ENTREGABLE */}
          <div className="flex gap-2.5">
            <button 
              type="button"
              onClick={handleExportExcel}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              title="Descargar planilla Excel técnica auditable con todas las memorias de cálculo"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              <span>Exportar Entregable Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS CONSOLIDADAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* TARJETA 1: PROCURA */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Suministros & Procura (B1)
            </span>
            <div className="bg-blue-50 p-1.5 rounded-md text-blue-600">
              <Layers size={18} />
            </div>
          </div>
          <h3 className="m-0 mb-2 text-2xl font-extrabold text-slate-900">
            {formatMoneda(totalProcura * tipoCambio)}
          </h3>
          <p className="m-0 text-xs text-slate-500">
            {detalleProcura.length} equipo(s) auditables en planilla de importación.
          </p>
        </div>

        {/* TARJETA 2: SERVICIOS */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Servicios Especializados & SSTT (B2)
            </span>
            <div className="bg-emerald-50 p-1.5 rounded-md text-emerald-600">
              <Calculator size={18} />
            </div>
          </div>
          <h3 className="m-0 mb-2 text-2xl font-extrabold text-slate-900">
            {formatMoneda(totalServicios)}
          </h3>
          <p className="m-0 text-xs text-slate-500">
            {detalleServicios.length} servicio(s) auditables en carrito técnico V1.
          </p>
        </div>

        {/* TARJETA 3: GRAN TOTAL CONSOLIDADO */}
        <div className="bg-[#0B0F17] border border-slate-800 text-white shadow-sm rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Oferta Comercial Gran Total EPC
            </span>
            <div className="bg-slate-800/80 p-1.5 rounded-md text-purple-300">
              <Award size={18} />
            </div>
          </div>
          <h3 className="m-0 mb-2 text-2xl font-extrabold text-sky-400">
            {formatMoneda(granTotal)}
          </h3>
          <p className="m-0 text-xs text-slate-400">
            Suma total consolidada de la propuesta llave en mano (Procura + SSTT).
          </p>
        </div>

      </div>

      {/* MATRIZ ADICIONAL DE GARANTÍAS Y CONTINGENCIAS PRELIMINAR */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
        <h3 className="m-0 mb-4 text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-purple-600" /> Desglose de Pólizas y Estructura de Contingencias
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Póliza de Fiel Cumplimiento (5%)</span>
            <span className="text-base font-bold text-slate-900">{formatMoneda(granTotal * 0.05)}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Póliza de Anticipo Financiero (20%)</span>
            <span className="text-base font-bold text-slate-900">{formatMoneda(granTotal * 0.20)}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 block mb-1">Fondo de Contingencia EPC (3%)</span>
            <span className="text-base font-bold text-purple-700">{formatMoneda(granTotal * 0.03)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
