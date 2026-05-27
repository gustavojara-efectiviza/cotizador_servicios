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

export default function UnifilarConfigurator({ onAddToCart, dbEquipments = [] }) {
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

  const [openZones, setOpenZones] = useState({ 
    zona1_maniobra: true, 
    zona1_medicion: false, 
    zona2: false, 
    zona3: false, 
    zona_globales: false,
    zona_otros: false
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEquip, setSelectedEquip] = useState('');
  
  const [cantidad, setCantidad] = useState(1);
  const [tension, setTension] = useState('220 kV');

  const toggleZone = (id) => {
    setOpenZones(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  return (
    <div className="unifilar-container" style={{ display: 'flex', gap: '20px' }}>
      {/* LEFT PANEL - ACCORDIONS */}
      <div className="left-panel" style={{ flex: '1.5', display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '10px' }}>
        <h2 style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={24} /> Configurador de Servicios
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>
          Selecciona los equipos de cada zona para añadirlos a tu carrito técnico.
        </p>

        {dynamicZones.map((zone) => {
          const Icon = zone.icon;
          const isOpen = openZones[zone.id];

          return (
            <div key={zone.id} style={{ background: '#ffffff', borderRadius: '12px', border: `1px solid ${isOpen ? zone.color : 'var(--border-color)'}`, overflow: 'hidden', transition: 'all 0.3s' }}>
              {/* Accordion Header */}
              <div 
                onClick={() => toggleZone(zone.id)}
                style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isOpen ? `rgba(${zone.color === '#f59e0b' ? '245,158,11' : zone.color === '#10b981' ? '16,185,129' : zone.color === '#139,92,246' ? '139,92,246' : '100,116,139'}, 0.1)` : 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={20} color={zone.color} />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{zone.title}</span>
                </div>
                {isOpen ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
              </div>

              {/* Accordion Body */}
              {isOpen && (
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', background: '#f8fafc' }}>
                  {zone.items.map(item => (
                    <div 
                      key={item}
                      style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', transition: 'box-shadow 0.2s, transform 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--card-shadow)'}
                      onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>{item}</span>
                      <button 
                        onClick={() => openModal(item)}
                        style={{ background: '#f1f5f9', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      >
                        <Plus size={16} /> Añadir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RIGHT PANEL - INSTRUCCIONES / ESTADO */}
      <div className="right-panel" style={{ flex: '1' }}>
        <div className="odoo-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px', position: 'sticky', top: '20px' }}>
          <CheckCircle size={48} color="#10b981" style={{ marginBottom: '20px' }} />
          <h3 style={{ color: 'var(--text-primary)' }}>Añade equipos desde las zonas</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
            Al hacer clic en un equipo, podrás seleccionar su cantidad y tensión. Automáticamente se sumará a tu Carrito Técnico global.
          </p>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="odoo-card" style={{ padding: '30px', width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>Configurar Equipo</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
              {selectedEquip}
            </div>

            <div className="form-group">
              <label>Cantidad</label>
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Nivel de Tensión</label>
              <select value={tension} onChange={(e) => setTension(e.target.value)}>
                <option value="500 kV">500 kV</option>
                <option value="220 kV">220 kV</option>
                <option value="66 kV">66 kV</option>
                <option value="23 kV">23 kV</option>
              </select>
            </div>

            <button onClick={handleAdd} className="primary-btn" style={{ marginTop: '10px', background: '#3b82f6' }}>
              Agregar al Carrito Técnico
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
