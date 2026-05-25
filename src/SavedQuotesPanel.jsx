import React, { useEffect, useState } from 'react';
import { X, Clock, FileText, Download } from 'lucide-react';
import { fetchCotizacionesEmitidas } from './services/dbService';

export default function SavedQuotesPanel({ isOpen, onClose, onLoadQuote }) {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadQuotes = async () => {
    setIsLoading(true);
    const data = await fetchCotizacionesEmitidas();
    setQuotes(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadQuotes();
    }
  }, [isOpen]);

  const formatGs = (num) => new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(num || 0);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha desconocida';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-PY', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderLeft: '1px solid var(--border-color)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-5px 0 25px rgba(0,0,0,0.1)',
      color: 'var(--text-primary)'
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={24} color="var(--accent)" />
          Historial de Cotizaciones
        </h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando proyectos...</p>
        ) : quotes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay cotizaciones guardadas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {quotes.map(quote => (
              <div key={quote.id} style={{ 
                background: '#f8fafc', 
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '15px',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eff6ff';
                e.currentTarget.style.borderColor = '#93c5fd';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
              onClick={() => {
                onLoadQuote(quote);
                onClose();
              }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--accent)' }}>{quote.Cliente || 'Proyecto sin nombre'}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(quote.fecha_creacion)}</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  <FileText size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }}/>
                  {quote.NombreObra || 'Sin descripción'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                  <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {formatGs(quote.Precio_Venta_Final)}
                  </div>
                  <div style={{ color: 'var(--accent)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Download size={14} /> Cargar Proyecto
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
