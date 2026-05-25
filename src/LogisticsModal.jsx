import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Calculator, Users, Truck, Home } from 'lucide-react';

export default function LogisticsModal({ isOpen, onClose, resultados, currentOverrides, onSave }) {
  const [enabled, setEnabled] = useState(false);
  const [formData, setFormData] = useState({
    viaticos_qty: 0,
    viaticos_rate: 0,
    viaticos_dias: 0,
    hospedaje_qty: 0,
    hospedaje_rate: 0,
    hospedaje_noches: 0,
    vehiculos_qty: 0,
    vehiculos_rate: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setEnabled(currentOverrides?.enabled || false);
      setFormData({
        viaticos_qty: currentOverrides?.viaticos_qty ?? resultados.Personal_Simultaneo ?? 0,
        viaticos_rate: currentOverrides?.viaticos_rate ?? resultados.TARIFA_VIATICO_DIA ?? 0,
        viaticos_dias: currentOverrides?.viaticos_dias ?? resultados.Dias_Viatico ?? 0,
        hospedaje_qty: currentOverrides?.hospedaje_qty ?? resultados.Personal_Simultaneo ?? 0,
        hospedaje_rate: currentOverrides?.hospedaje_rate ?? resultados.TARIFA_HOSPEDAJE_DIA ?? 0,
        hospedaje_noches: currentOverrides?.hospedaje_noches ?? resultados.Noches_Hotel ?? 0,
        vehiculos_qty: currentOverrides?.vehiculos_qty ?? resultados.Cantidad_Vehiculos ?? 0,
        vehiculos_rate: currentOverrides?.vehiculos_rate ?? resultados.Costo_Viaje_Base ?? 0,
      });
    }
  }, [isOpen, currentOverrides, resultados]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const handleSave = () => {
    onSave({
      enabled,
      ...formData
    });
    onClose();
  };

  const formatGs = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num || 0);

  // Live calculations
  const totalViaticos = enabled 
    ? (formData.viaticos_qty * formData.viaticos_rate * formData.viaticos_dias)
    : (resultados.Costo_Viaticos_Total || 0);
  
  const totalHospedaje = enabled
    ? (formData.hospedaje_qty * formData.hospedaje_rate * formData.hospedaje_noches)
    : (resultados.Costo_Hospedaje_Total || 0);
    
  const totalMovilidad = enabled
    ? (formData.vehiculos_qty * formData.vehiculos_rate)
    : (resultados.Costo_Movilidad_Total || 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: 'var(--text-primary)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem' }}>
            <Calculator color="#f59e0b" />
            Configuración de Logística Global
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '15px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
            <AlertTriangle color="#2563eb" style={{ flexShrink: 0, marginTop: '3px' }}/>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Control Manual de Logística</strong><br/>
              Activa esta opción para anular los cálculos predeterminados del motor. Modifica la cantidad de personas o vehículos que viajarán, así como sus tarifas base, sin alterar el cálculo técnico de horas-equipo.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px', padding: '15px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <input 
              type="checkbox" 
              id="logisticsEnabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            <label htmlFor="logisticsEnabled" style={{ fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
              Habilitar Override Logístico
            </label>
          </div>

          <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none', transition: 'all 0.2s' }}>
            
            {/* Viáticos */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18}/> 1. Viáticos (Alimentación diaria)
              </h3>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Cantidad Personas <span style={{color: '#10b981'}}>(Motor: {resultados.Personal_Simultaneo})</span></label>
                  <input type="number" name="viaticos_qty" value={formData.viaticos_qty} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Cant. de Días <span style={{color: '#10b981'}}>(Motor: {resultados.Dias_Viatico})</span></label>
                  <input type="number" name="viaticos_dias" value={formData.viaticos_dias} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Tarifa por Día <span style={{color: '#10b981'}}>(Motor: {formatGs(resultados.TARIFA_VIATICO_DIA)})</span></label>
                  <input type="number" name="viaticos_rate" value={formData.viaticos_rate} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Subtotal (× {formData.viaticos_dias || 0} días): <strong style={{ color: 'var(--text-primary)' }}>{formatGs(totalViaticos)}</strong>
              </div>
            </div>

            {/* Hospedaje */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Home size={18}/> 2. Hospedaje (Hotel)
              </h3>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Cantidad Personas <span style={{color: '#10b981'}}>(Motor: {resultados.Personal_Simultaneo})</span></label>
                  <input type="number" name="hospedaje_qty" value={formData.hospedaje_qty} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Cant. de Noches <span style={{color: '#10b981'}}>(Motor: {resultados.Noches_Hotel})</span></label>
                  <input type="number" name="hospedaje_noches" value={formData.hospedaje_noches} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Tarifa por Noche <span style={{color: '#10b981'}}>(Motor: {formatGs(resultados.TARIFA_HOSPEDAJE_DIA)})</span></label>
                  <input type="number" name="hospedaje_rate" value={formData.hospedaje_rate} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Subtotal (× {formData.hospedaje_noches || 0} noches): <strong style={{ color: 'var(--text-primary)' }}>{formatGs(totalHospedaje)}</strong>
              </div>
            </div>

            {/* Movilidad */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18}/> 3. Movilidad y Traslado
              </h3>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Cantidad Vehículos <span style={{color: '#10b981'}}>(Motor: {resultados.Cantidad_Vehiculos})</span></label>
                  <input type="number" name="vehiculos_qty" value={formData.vehiculos_qty} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>Costo Viaje Base <span style={{color: '#10b981'}}>(Motor: {formatGs(resultados.Costo_Viaje_Base)})</span></label>
                  <input type="number" name="vehiculos_rate" value={formData.vehiculos_rate} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Subtotal: <strong style={{ color: 'var(--text-primary)' }}>{formatGs(totalMovilidad)}</strong>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <div style={{ fontSize: '1.1rem' }}>
            Total Logística: <strong style={{ color: '#10b981' }}>{formatGs(totalViaticos + totalHospedaje + totalMovilidad)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSave} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              <Save size={18} /> Guardar Configuración
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
