import React, { useState } from 'react';
import App from './App';
import EPCDashboard from './EPCDashboard';
import LaboratorioPrecios from './LaboratorioPrecios';
import { Layers, Sliders, TestTube } from 'lucide-react';

export default function AppWrapper() {
  const [version, setVersion] = useState(() => {
    return localStorage.getItem('zunz_cotizador_version') || 'v2';
  });
  const [mostrarLab, setMostrarLab] = useState(false);

  const handleSwitchVersion = (ver) => {
    setVersion(ver);
    localStorage.setItem('zunz_cotizador_version', ver);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra de Selección de Versión */}
      <div className="no-print" style={{
        background: '#0f172a', // Slate dark premium background
        color: '#ffffff',
        padding: '10px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        zIndex: 2000,
        position: 'sticky',
        top: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            background: '#ffffff', 
            padding: '3px 10px', 
            borderRadius: '6px', 
            display: 'flex', 
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <img 
              src="/logo-beigel.png" 
              alt="Beigel" 
              style={{ height: '28px', width: 'auto', display: 'block', objectFit: 'contain' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1.1 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
              Cotizador
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.06em' }}>
              by Efectiviza
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#1e293b', borderRadius: '25px', padding: '3px', border: '1px solid #334155' }}>
          <button
            onClick={() => handleSwitchVersion('v1')}
            style={{
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: version === 'v1' ? '#3b82f6' : 'transparent',
              color: version === 'v1' ? '#ffffff' : '#94a3b8',
              boxShadow: version === 'v1' ? '0 2px 4px rgba(59, 130, 246, 0.4)' : 'none'
            }}
          >
            <Sliders size={14} /> Versión 1 (Tradicional)
          </button>
          <button
            onClick={() => handleSwitchVersion('v2')}
            style={{
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: version === 'v2' ? '#8b5cf6' : 'transparent',
              color: version === 'v2' ? '#ffffff' : '#94a3b8',
              boxShadow: version === 'v2' ? '0 2px 4px rgba(139, 92, 246, 0.4)' : 'none'
            }}
          >
            <Layers size={14} /> Versión 2 (Módulo EPC)
          </button>
          <button
            onClick={() => setMostrarLab(true)}
            style={{
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: 'transparent',
              color: '#94a3b8',
              boxShadow: 'none'
            }}
          >
            <TestTube size={14} /> Laboratorio de Precios
          </button>
        </div>
      </div>

      {/* Contenido Principal de la Aplicación */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {version === 'v1' && <App />}
        {version === 'v2' && <EPCDashboard />}
      </div>

      {/* Modal Laboratorio */}
      {mostrarLab && <LaboratorioPrecios onClose={() => setMostrarLab(false)} />}
    </div>
  );
}
