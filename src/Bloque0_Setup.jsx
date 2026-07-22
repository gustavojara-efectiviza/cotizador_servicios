import React from 'react';
import { Settings } from 'lucide-react';

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
  setTipoCambioVenta
}) {
  return (
    <div className="odoo-card" style={{ background: '#ffffff', borderLeft: '4px solid #3b82f6', marginBottom: '25px' }}>
      <h2 style={{ color: '#1e40af', margin: '0 0 20px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Settings color="#2563eb" size={24} /> Bloque 0: Configuración General del Proyecto
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* CLIENTE / EMPRESA */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Cliente / Empresa</label>
          <input
            type="text"
            placeholder="Ej: ANDE, Consorcio..."
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </div>

        {/* NOMBRE DEL PROYECTO */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Nombre del Proyecto</label>
          <input
            type="text"
            placeholder="Ej: Ampliación SE Limpio"
            value={nombreProyecto}
            onChange={(e) => setNombreProyecto(e.target.value)}
            style={{ width: '100%', marginTop: '6px' }}
          />
        </div>

        {/* MONEDA DE TRABAJO */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Moneda de Trabajo</label>
          <select
            value={monedaTrabajo}
            onChange={(e) => setMonedaTrabajo(e.target.value)}
            style={{ width: '100%', marginTop: '6px', cursor: 'pointer', fontWeight: 700 }}
          >
            <option value="USD">USD - Dólares Americanos</option>
            <option value="PYG">Gs. - Guaraníes Paraguayos</option>
          </select>
        </div>

        {/* TASAS DE CAMBIO */}
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>Tasa de Cambio (Compra / Venta)</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="number"
                placeholder="Compra"
                value={tipoCambioCompra}
                onChange={(e) => setTipoCambioCompra(parseFloat(e.target.value) || 0)}
                title="Tasa de cambio para compra"
                style={{ width: '100%', paddingLeft: '28px' }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>C</span>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="number"
                placeholder="Venta"
                value={tipoCambioVenta}
                onChange={(e) => setTipoCambioVenta(parseFloat(e.target.value) || 0)}
                title="Tasa de cambio para venta"
                style={{ width: '100%', paddingLeft: '28px' }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>V</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
