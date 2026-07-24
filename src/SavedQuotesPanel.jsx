import React, { useEffect, useState } from 'react';
import { X, Clock, FileText, Download } from 'lucide-react';
import { fetchCotizacionesV2 } from './services/dbService';

export default function SavedQuotesPanel({ isOpen, onClose, onLoadQuote }) {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadQuotes = async () => {
    setIsLoading(true);
    const data = await fetchCotizacionesV2();
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
      width: '420px',
      height: '100vh',
      background: 'rgba(255, 255, 255, 0.97)',
      backdropFilter: 'blur(12px)',
      borderLeft: '1px solid #e2e8f0',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
      color: '#1e293b'
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
                  <strong style={{ fontSize: '1.05rem', color: '#2563eb' }}>
                    {quote.datosGenerales?.nombreCliente || quote.Cliente || 'Proyecto sin nombre'}
                  </strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatDate(quote.fecha_actualizacion || quote.fecha_creacion)}</span>
                </div>
                <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '5px' }}>
                  <FileText size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }}/>
                  {quote.datosGenerales?.nombreProyecto || quote.NombreObra || 'Sin descripción'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700 }}>
                    {quote.totales ? 
                      new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(quote.totales.granTotalGs || 0)
                      : formatGs(quote.Precio_Venta_Final)
                    }
                  </div>
                  <div style={{ color: '#2563eb', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
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
