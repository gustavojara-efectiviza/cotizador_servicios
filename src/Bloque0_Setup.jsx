import React, { useState } from 'react';
import { 
  Edit2, 
  ChevronUp, 
  Settings
} from 'lucide-react';

export default function Bloque0_Setup({
  nombreCliente,
  setNombreCliente,
  nombreProyecto,
  setNombreProyecto,
  monedaTrabajo,
  setMonedaTrabajo,
  tipoCambioCompra,
  setTipoCambioCompra,
  tipoCambioVenta,
  setTipoCambioVenta,
  isOpen,
  setIsOpen
}) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isExpanded = isOpen !== undefined ? isOpen : localIsOpen;
  const toggleOpen = setIsOpen || setLocalIsOpen;

  // Estado contraído: Barra de transición horizontal Vercel / Linear style
  if (!isExpanded) {
    return (
      <div className="w-full bg-[#0f172a] border-b border-slate-800/60 px-6 py-2.5 flex items-center justify-between shadow-sm select-none">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-3 flex-wrap font-mono">
          <span>
            CLIENTE: <span className="text-slate-200 font-bold">{nombreCliente ? nombreCliente : '—'}</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            OBRA: <span className="text-slate-200 font-bold">{nombreProyecto ? nombreProyecto : '—'}</span>
          </span>
          <span className="text-slate-600">•</span>
          <span>
            MONEDA: <span className="text-slate-200 font-bold">{monedaTrabajo}</span>{' '}
            <span className="text-slate-400 font-normal">(TC: {tipoCambioVenta ? tipoCambioVenta.toLocaleString('es-PY') : '7.500'})</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => toggleOpen(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          title="Editar datos del cliente, proyecto o tasas de cambio"
        >
          <Edit2 size={12} />
          <span>Editar Datos</span>
        </button>
      </div>
    );
  }

  // Estado expandido: Formulario limpio y plano
  return (
    <div className="w-full bg-[#0f172a] border-b border-slate-800/80 px-6 py-4 shadow-md space-y-4 animate-fadeIn text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider font-mono">
          <Settings size={14} className="text-blue-400" />
          <span>Configuración del Proyecto & Divisas</span>
        </div>

        <button
          type="button"
          onClick={() => toggleOpen(false)}
          className="text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
          title="Contraer barra"
        >
          <span>Ocultar Datos</span>
          <ChevronUp size={13} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Cliente */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Cliente / Empresa
          </label>
          <input
            type="text"
            placeholder="Ej: ANDE, Consorcio..."
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            className="w-full bg-[#0B0F17] border border-slate-700/80 text-slate-100 placeholder-slate-500 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* 2. Proyecto */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Nombre del Proyecto / Obra
          </label>
          <input
            type="text"
            placeholder="Ej: Ampliación SE Limpio"
            value={nombreProyecto}
            onChange={(e) => setNombreProyecto(e.target.value)}
            className="w-full bg-[#0B0F17] border border-slate-700/80 text-slate-100 placeholder-slate-500 rounded-md px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* 3. Moneda de Trabajo */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Moneda de Trabajo
          </label>
          <select
            value={monedaTrabajo}
            onChange={(e) => setMonedaTrabajo(e.target.value)}
            className="w-full bg-[#0B0F17] border border-slate-700/80 text-slate-100 rounded-md px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer transition"
          >
            <option value="USD">USD - Dólares Americanos</option>
            <option value="PYG">Gs. - Guaraníes Paraguayos</option>
          </select>
        </div>

        {/* 4. Tasas de Cambio */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 font-mono">
            Tasa Cambio (Compra / Venta)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[10px] text-slate-500 font-bold select-none pointer-events-none">C</span>
              <input
                type="number"
                placeholder="7400"
                value={tipoCambioCompra}
                onChange={(e) => setTipoCambioCompra(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0B0F17] border border-slate-700/80 text-slate-100 rounded-md pl-6 pr-2 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500 transition"
                title="Tasa de cambio para compras"
              />
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-[10px] text-slate-500 font-bold select-none pointer-events-none">V</span>
              <input
                type="number"
                placeholder="7500"
                value={tipoCambioVenta}
                onChange={(e) => setTipoCambioVenta(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0B0F17] border border-slate-700/80 text-slate-100 rounded-md pl-6 pr-2 py-2 text-xs font-mono font-medium focus:outline-none focus:border-blue-500 transition"
                title="Tasa de cambio para ventas"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
