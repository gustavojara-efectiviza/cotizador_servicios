import { useState } from 'react';
import { Zap, Power, Activity, Plus, X, ChevronDown, ChevronUp, CheckCircle, Shield, Server } from 'lucide-react';

const equipmentZones = [
  {
    id: 'zona1_maniobra',
    title: 'Equipos de Maniobra (Patio AT)',
    icon: Zap,
    color: '#f59e0b',
    items: ['Interruptores de Potencia (SF6)', 'Seccionadores con PAT', 'Seccionadores Simples', 'Seccionadores Pantógrafos (solo 500kV)', 'Seccionadores Monopolares']
  },
  {
    id: 'zona1_medicion',
    title: 'Equipos de Medición y Protección (Patio AT)',
    icon: Shield,
    color: '#ef4444',
    items: ['Transformadores de Corriente (TC)', 'Transformadores de Potencial (TP/DCP)', 'Descargadores de Sobretensión', 'Trampas de Onda / Bobinas de Bloqueo']
  },
  {
    id: 'zona2',
    title: 'Transformación de Potencia',
    icon: Power,
    color: '#10b981',
    items: ['Autotransformadores Monofásicos (500kV)', 'Transformadores de Potencia Trifásicos (220kV/66kV)', 'Reactores de Barra/Línea']
  },
  {
    id: 'zona3',
    title: 'Distribución en Media Tensión (23kV / 6,6kV)',
    icon: Activity,
    color: '#8b5cf6',
    items: ['Celdas GIS / Metal-clad (Llegada, Acople y Salida)', 'Interruptores Extraíbles de Vacío', 'Bancos de Capacitores', 'Transformadores de Servicios Auxiliares de MT']
  },
  {
    id: 'zona_globales',
    title: 'Sistemas Globales (Sala de Control)',
    icon: Server,
    color: '#3b82f6',
    items: ['Paneles de Protección y Control (Relés/IEDs)', 'Bancos de Baterías y Cargadores Rectificadores', 'Tableros de Servicios Auxiliares (CA/CC)']
  }
];

export default function UnifilarConfigurator({ onAddToCart, dbEquipments = [], isOpen, onClose }) {
  const staticZones = [
    {
      id: 'zona1_maniobra',
      title: 'Equipos de Maniobra (Patio AT)',
      icon: Zap,
      color: '#f59e0b',
      items: ['Interruptores de Potencia (SF6)', 'Seccionadores con PAT', 'Seccionadores Simples', 'Seccionadores Pantógrafos (solo 500kV)', 'Seccionadores Monopolares']
    },
    {
      id: 'zona1_medicion',
      title: 'Equipos de Medición y Protección (Patio AT)',
      icon: Shield,
      color: '#ef4444',
      items: ['Transformadores de Corriente (TC)', 'Transformadores de Potencial (TP/DCP)', 'Descargadores de Sobretensión', 'Trampas de Onda / Bobinas de Bloqueo']
    },
    {
      id: 'zona2',
      title: 'Transformación de Potencia',
      icon: Power,
      color: '#10b981',
      items: ['Autotransformadores Monofásicos (500kV)', 'Transformadores de Potencia Trifásicos (220kV/66kV)', 'Reactores de Barra/Línea']
    },
    {
      id: 'zona3',
      title: 'Distribución en Media Tensión (23kV / 6,6kV)',
      icon: Activity,
      color: '#8b5cf6',
      items: ['Celdas GIS / Metal-clad (Llegada, Acople y Salida)', 'Interruptores Extraíbles de Vacío', 'Bancos de Capacitores', 'Transformadores de Servicios Auxiliares de MT']
    },
    {
      id: 'zona_globales',
      title: 'Sistemas Globales (Sala de Control)',
      icon: Server,
      color: '#3b82f6',
      items: ['Paneles de Protección y Control (Relés/IEDs)', 'Bancos de Baterías y Cargadores Rectificadores', 'Tableros de Servicios Auxiliares (CA/CC)']
    },
    {
      id: 'zona_otros',
      title: 'Otros Servicios',
      icon: Server,
      color: '#64748b',
      items: []
    }
  ];

  const [activeTab, setActiveTab] = useState(staticZones[0].id);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEquip, setSelectedEquip] = useState('');
  
  const [cantidad, setCantidad] = useState(1);
  const [tension, setTension] = useState('220 kV');

  const openModal = (equipName) => {
    setSelectedEquip(equipName);
    setCantidad(1);
    setTension('220 kV');
    setModalOpen(true);
  };

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart({ equipo: selectedEquip, cantidad: Number(cantidad), tension });
    }
    setModalOpen(false);
  };

  const standardNames = [
    "Interruptor", "Seccionador C/PAT", "Seccionador C/PAT Monopolar", "Seccionador", 
    "Seccionador Pantografo", "Transformador De Corriente", "Transformador De Tensión", 
    "Descargador", "Trampa de Onda", "Autotransformador Monofásico", "Transformador Trifásico", 
    "Seccionador Tripolar", "Seccionador Monopolar", "Seccionador Semi-Pantografo Vertical", 
    "Transformador Monofásico", "Celdas GIS 23kV", "Celda de Llegada", "Celda de Salida", 
    "Celda de Medición"
  ].map(n => n.toLowerCase());

  const dynamicZones = staticZones.map(zone => {
    const dbItemsForZone = dbEquipments.filter(item => {
      // Ignorar equipos estándar de la base de datos que no tienen categoría explícita
      const isStandardWithoutCategory = !item.categoria && standardNames.includes(item.equipo.toLowerCase());
      if (isStandardWithoutCategory) return false;

      const itemCat = item.categoria || 'zona_otros';
      if (zone.id === 'zona_otros') {
        return itemCat === 'zona_otros' || !staticZones.some(sz => sz.id === itemCat);
      }
      return itemCat === zone.id;
    });
    const dbNames = [...new Set(dbItemsForZone.map(item => item.equipo))];
    const mergedItems = [...new Set([...zone.items, ...dbNames])];
    return {
      ...zone,
      items: mergedItems
    };
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="odoo-card" style={{ width: '900px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
              <Zap size={24} color="#3b82f6" /> Catálogo de Equipos
            </h2>
            <p style={{ margin: '5px 0 0 34px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Selecciona una categoría y añade equipos a tu carrito técnico.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            <X size={24} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Tabs Header */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', background: '#ffffff', padding: '0 10px' }} className="custom-scrollbar">
          {dynamicZones.map(zone => {
            const isActive = activeTab === zone.id;
            return (
              <button 
                key={zone.id}
                onClick={() => setActiveTab(zone.id)}
                style={{
                  padding: '15px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${zone.color}` : '3px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  opacity: isActive ? 1 : 0.7
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                onMouseOut={(e) => { if (!isActive) e.currentTarget.style.opacity = 0.7; }}
              >
                <zone.icon size={18} color={isActive ? zone.color : 'var(--text-secondary)'} />
                {zone.title}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '25px', overflowY: 'auto', flex: 1, background: '#f1f5f9' }}>
          {dynamicZones.map(zone => {
            if (zone.id !== activeTab) return null;
            return (
              <div key={zone.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {zone.items.map(item => (
                  <div 
                    key={item}
                    style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default' }}
                    onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4' }}>{item}</span>
                    <button 
                      onClick={() => openModal(item)}
                      style={{ background: '#f8fafc', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s', width: '100%' }}
                      onMouseOver={(e) => { e.currentTarget.style.background = zone.color; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = zone.color; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    >
                      <Plus size={18} /> Añadir
                    </button>
                  </div>
                ))}
                {zone.items.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No hay equipos en esta categoría.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Configuration Modal (Nested) */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1010 }}>
          <div className="odoo-card" style={{ padding: '30px', width: '400px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)', margin: 0 }}>Configurar Equipo</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f1f5f9', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center', fontWeight: '600', fontSize: '1rem' }}>
              {selectedEquip}
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--text-secondary)' }}>Cantidad</label>
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--text-secondary)' }}>Nivel de Tensión</label>
              <select value={tension} onChange={(e) => setTension(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <option value="500 kV">500 kV</option>
                <option value="220 kV">220 kV</option>
                <option value="66 kV">66 kV</option>
                <option value="23 kV">23 kV</option>
              </select>
            </div>

            <button onClick={handleAdd} className="primary-btn" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' }}>
              Agregar al Carrito Técnico
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
