import React, { useState } from 'react';
import { X } from 'lucide-react';

const LaboratorioPrecios = ({ onClose }) => {
  // A. Datos Financieros y de Adquisición
  const [vInc, setVInc] = useState(60000); 
  const [vrCont, setVrCont] = useState(10); 
  const [vuCont, setVuCont] = useState(7); 
  const [tasaOpp, setTasaOpp] = useState(8); 

  // B. Datos de Mantenimiento y Operación (OPEX)
  const [opexModo, setOpexModo] = useState('absoluto'); 
  const [cCalib, setCCalib] = useState(500);
  const [cMaint, setCMaint] = useState(1200);
  const [cSeg, setCSeg] = useState(300);
  const [opexPct, setOpexPct] = useState(3); 

  // C. Datos de Utilización
  const [diasAno, setDiasAno] = useState(120);
  const [horasDia, setHorasDia] = useState(8);

  // D. Simulador Comercial
  const [margen, setMargen] = useState(20); 

  // --- LÓGICA DE CÁLCULO ---
  const numVInc = Number(vInc) || 0;
  const numVrCont = Number(vrCont) || 0;
  const numVuCont = Number(vuCont) || 0;
  const numTasaOpp = Number(tasaOpp) || 0;
  const numCCalib = Number(cCalib) || 0;
  const numCMaint = Number(cMaint) || 0;
  const numCSeg = Number(cSeg) || 0;
  const numOpexPct = Number(opexPct) || 0;
  const numDiasAno = Number(diasAno) || 0;
  const numHorasDia = Number(horasDia) || 0;
  const numMargen = Number(margen) || 0;

  const vrMonto = numVInc * (numVrCont / 100);
  const dAnual = numVuCont > 0 ? (numVInc - vrMonto) / numVuCont : 0;

  const vPromedio = (numVInc + vrMonto) / 2;
  const ccAnual = vPromedio * (numTasaOpp / 100);

  const opexAnual = opexModo === 'absoluto' 
    ? (numCCalib + numCMaint + numCSeg)
    : (numVInc * (numOpexPct / 100));

  const cta = dAnual + ccAnual + opexAnual;

  const diasValidos = Math.max(numDiasAno, 0.001); 
  const horasValidas = Math.max(numHorasDia, 0.001);
  
  const cpd = cta / diasValidos;
  const cph = cpd / horasValidas;

  const margenDecimal = Math.min(numMargen / 100, 0.99); 
  const tarifaDiaSug = cpd / (1 - margenDecimal);
  const tarifaHoraSug = cph / (1 - margenDecimal);

  const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative">
        
        {/* BOTÓN CERRAR */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors z-10"
        >
          <X size={20} className="text-slate-700" />
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6 border-b pb-2 pr-10">🔬 Laboratorio de Precios de Activos (CpH/CpD)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* PANEL DE INPUTS */}
        <div className="space-y-6">
          {/* Bloque A */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-4">A. Datos Financieros</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Valor Incorporación (USD)</label>
                <input type="number" className="w-full p-2 border rounded" value={vInc} onChange={e => setVInc(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Valor Residual Contable (%)</label>
                <input type="number" className="w-full p-2 border rounded" value={vrCont} onChange={e => setVrCont(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Vida Útil (Años)</label>
                <input type="number" className="w-full p-2 border rounded" value={vuCont} onChange={e => setVuCont(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tasa Oportunidad/WACC (%)</label>
                <input type="number" className="w-full p-2 border rounded" value={tasaOpp} onChange={e => setTasaOpp(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Bloque B */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-700">B. OPEX Anual</h3>
              <select className="text-xs border rounded p-1" value={opexModo} onChange={e => setOpexModo(e.target.value)}>
                <option value="absoluto">Monto Absoluto (USD)</option>
                <option value="porcentaje">% sobre V. Inc.</option>
              </select>
            </div>
            
            {opexModo === 'absoluto' ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Calibración</label>
                  <input type="number" className="w-full p-2 border rounded" value={cCalib} onChange={e => setCCalib(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Mantenimiento</label>
                  <input type="number" className="w-full p-2 border rounded" value={cMaint} onChange={e => setCMaint(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Seguros</label>
                  <input type="number" className="w-full p-2 border rounded" value={cSeg} onChange={e => setCSeg(e.target.value)} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Porcentaje de OPEX Anual (%)</label>
                <input type="number" className="w-full p-2 border rounded" value={opexPct} onChange={e => setOpexPct(e.target.value)} />
              </div>
            )}
          </div>

          {/* Bloque C */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-700 mb-4">C. Utilización Estimada</h3>
            {(diasAno <= 0 || horasDia <= 0) && (
               <div className="mb-3 text-xs text-red-600 bg-red-100 p-2 rounded font-bold">⚠️ Los días y horas deben ser mayores a 0.</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Días Operativos / Año</label>
                <input type="number" className="w-full p-2 border rounded" value={diasAno} onChange={e => setDiasAno(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Horas de Trabajo / Día</label>
                <input type="number" className="w-full p-2 border rounded" value={horasDia} onChange={e => setHorasDia(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DE RESULTADOS (OUTPUTS) */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-lg shadow-md border border-slate-700">
            <h3 className="text-sm font-bold text-slate-400 mb-4 tracking-widest uppercase">Métricas Base del Activo</h3>
            <div className="space-y-2 text-sm border-b border-slate-700 pb-4 mb-4">
              <div className="flex justify-between"><span>Depreciación Anual:</span> <span className="font-mono">{formatUSD(dAnual)}</span></div>
              <div className="flex justify-between"><span>Costo de Capital (WACC):</span> <span className="font-mono">{formatUSD(ccAnual)}</span></div>
              <div className="flex justify-between"><span>OPEX Total Anual:</span> <span className="font-mono">{formatUSD(opexAnual)}</span></div>
              <div className="flex justify-between text-lg font-bold text-blue-400 mt-2 pt-2 border-t border-slate-700">
                <span>COSTO TOTAL ANUAL (CTA):</span> <span className="font-mono">{formatUSD(cta)}</span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-400 mb-4 tracking-widest uppercase">Costo Unitario Técnico (Sin Margen)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4 border-b border-slate-700 pb-4">
              <div className="bg-slate-800 p-3 rounded">
                <div className="text-xs text-slate-400">Costo por Día (CpD)</div>
                <div className="text-xl font-bold font-mono text-emerald-400">{formatUSD(cpd)}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded">
                <div className="text-xs text-slate-400">Costo por Hora (CpH)</div>
                <div className="text-xl font-bold font-mono text-emerald-400">{formatUSD(cph)}</div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-400 mb-4 tracking-widest uppercase">Simulador de Comercialización</h3>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Margen de Utilidad Deseado (%)</label>
              <input type="number" className="w-full p-2 border border-slate-600 rounded bg-slate-800 text-white" value={margen} onChange={e => setMargen(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-900/50 p-3 rounded border border-blue-500/30">
                <div className="text-xs text-blue-300">Tarifa Sugerida / Día</div>
                <div className="text-2xl font-bold font-mono text-white">{formatUSD(tarifaDiaSug)}</div>
              </div>
              <div className="bg-blue-900/50 p-3 rounded border border-blue-500/30">
                <div className="text-xs text-blue-300">Tarifa Sugerida / Hora</div>
                <div className="text-2xl font-bold font-mono text-white">{formatUSD(tarifaHoraSug)}</div>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaboratorioPrecios;
