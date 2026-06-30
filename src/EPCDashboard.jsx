import React, { useState } from 'react';
import Bloque1_Procura from './Bloque1_Procura';
import Bloque2_SSTT from './Bloque2_SSTT';
import Bloque3_Resumen from './Bloque3_Resumen';
import { 
  Zap, 
  Building2, 
  Briefcase, 
  Layers, 
  ShoppingCart, 
  Wrench, 
  ShieldCheck, 
  ChevronRight, 
  Package, 
  Sliders, 
  Lock, 
  TrendingUp, 
  Sun, 
  Truck, 
  Boxes
} from 'lucide-react';

export default function EPCDashboard() {
  // Estado Global V2
  const [perfilComercial, setPerfilComercial] = useState('b2b'); // 'b2b' vs 'epc'
  const [rubro, setRubro] = useState('subestaciones'); // 'subestaciones', 'solar', 'movilidad'
  const [activeBlock, setActiveBlock] = useState(1); // Bloque activo para la secuencia (1, 2, 3)

  // ESTADOS GLOBALES CONSOLIDADOS (State Lifting)
  const [totalProcura, setTotalProcura] = useState(0);
  const [totalServicios, setTotalServicios] = useState(0);
  const [detalleProcura, setDetalleProcura] = useState([]);
  const [detalleServicios, setDetalleServicios] = useState([]);

  // Nombres descriptivos para la UI
  const perfiles = {
    b2b: { title: 'Suministro Privado B2B', badge: 'B2B Private', color: '#3b82f6', desc: 'Cotización orientada a venta directa de suministros y proyectos privados sin burocracia licitatoria.' },
    epc: { title: 'Licitación Corporativa / EPC', badge: 'Corporate EPC', color: '#8b5cf6', desc: 'Llave en mano integral para grandes cuentas, pliegos públicos y estructuras de contingencia avanzada.' }
  };

  const rubros = {
    subestaciones: { name: 'Subestaciones de Potencia AT/MT', icon: Zap, detail: 'Transformación, Celdas GIS/Metalclad y Patios de Maniobra' },
    solar: { name: 'Parques Fotovoltaicos / Solar', icon: Sun, detail: 'Inversores centralizados, campos de paneles y BESS' },
    movilidad: { name: 'Movilidad Eléctrica / Infraestructura EV', icon: Truck, detail: 'Electrolineras de carga rápida y subestaciones dedicadas' }
  };

  const RubroIcon = rubros[rubro].icon;

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b' }}>
      
      {/* 1. CABECERA MAESTRA CON CONTROLES GLOBALMENTE SINCRONIZADOS */}
      <header className="header" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        padding: '20px 40px', 
        background: '#ffffff', 
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <Zap color="#2563eb" size={30} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Módulo EPC Integrado</h1>
                <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>V2 SPA</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Consolidador Maestro Procura + Servicios SSTT + Matriz de Riesgos</p>
            </div>
          </div>

          {/* SELECTOR DE RUBRO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Boxes size={18} color="#475569" />
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rubro / Sector:</label>
            <select 
              value={rubro} 
              onChange={(e) => setRubro(e.target.value)}
              style={{ 
                border: 'none', 
                background: 'transparent', 
                fontWeight: 700, 
                color: '#0f172a', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                outline: 'none',
                padding: '4px 8px'
              }}
            >
              <option value="subestaciones">Subestaciones de Potencia AT/MT</option>
              <option value="solar">Parques Fotovoltaicos / Solar</option>
              <option value="movilidad">Movilidad Eléctrica / Electrolineras</option>
            </select>
          </div>
        </div>

        {/* SWITCH INTERACTIVO DE PERFIL COMERCIAL */}
        <div style={{ 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          background: '#f8fafc', 
          padding: '12px 20px', 
          borderRadius: '8px', 
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={20} color={perfiles[perfilComercial].color} />
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Perfil Comercial Seleccionado: <span style={{ color: perfiles[perfilComercial].color }}>{perfiles[perfilComercial].title}</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{perfiles[perfilComercial].desc}</span>
            </div>
          </div>

          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '25px', padding: '4px' }}>
            <button 
              onClick={() => setPerfilComercial('b2b')}
              style={{
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: perfilComercial === 'b2b' ? '#3b82f6' : 'transparent',
                color: perfilComercial === 'b2b' ? '#ffffff' : '#475569',
                boxShadow: perfilComercial === 'b2b' ? '0 2px 4px rgba(59,130,246,0.3)' : 'none'
              }}
            >
              🏢 Suministro Privado B2B
            </button>
            <button 
              onClick={() => setPerfilComercial('epc')}
              style={{
                border: 'none',
                padding: '8px 18px',
                borderRadius: '20px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: perfilComercial === 'epc' ? '#8b5cf6' : 'transparent',
                color: perfilComercial === 'epc' ? '#ffffff' : '#475569',
                boxShadow: perfilComercial === 'epc' ? '0 2px 4px rgba(139,92,246,0.3)' : 'none'
              }}
            >
              🏛️ Licitación Corporativa / EPC
            </button>
          </div>
        </div>

      </header>

      {/* 2. BARRA DE NAVEGACIÓN SECUENCIAL (STEPPER DE 3 BLOQUES) */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 40px' }}>
        <div style={{ display: 'flex', gap: '15px', maxWidth: '1200px', margin: '0 auto' }}>
          
          {[
            { id: 1, title: 'Bloque 1: Procura & Landed Cost', subtitle: 'Equipos principales e Importación', icon: ShoppingCart },
            { id: 2, title: 'Bloque 2: Servicios & SSTT', subtitle: 'Encapsulamiento Motor V1', icon: Wrench },
            { id: 3, title: 'Bloque 3: Consolidación & Riesgos', subtitle: 'Margen EPC, Imprevistos y Garantías', icon: ShieldCheck }
          ].map((block) => {
            const Icon = block.icon;
            const isActive = activeBlock === block.id;
            return (
              <div 
                key={block.id} 
                onClick={() => setActiveBlock(block.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: isActive ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isActive ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  background: isActive ? '#2563eb' : '#cbd5e1', 
                  color: '#ffffff', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {block.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? '#1e40af' : '#334155' }}>{block.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{block.subtitle}</div>
                </div>
                <Icon size={20} color={isActive ? '#2563eb' : '#94a3b8'} />
              </div>
            );
          })}

        </div>
      </div>

      {/* 3. ÁREA PRINCIPAL CON RENDERIZADO SECUENCIAL DE LOS 3 BLOQUES */}
      <main style={{ padding: '30px 40px', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1 }}>
        
        {/* BANNER INFORMATIVO DE SECTOR */}
        <div className="odoo-card" style={{ marginBottom: '25px', borderLeft: '4px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <RubroIcon size={28} color="#2563eb" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Sector Activo: {rubros[rubro].name}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{rubros[rubro].detail}</p>
            </div>
          </div>
          <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
            Modo: {perfiles[perfilComercial].badge}
          </span>
        </div>

        {/* BLOQUE 1: PROCURA & LANDED COST (COMPONENTIZADO) */}
        {activeBlock === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Bloque1_Procura setTotalProcura={setTotalProcura} setDetalleProcura={setDetalleProcura} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                className="primary-btn" 
                onClick={() => setActiveBlock(2)}
                style={{ width: 'auto', padding: '10px 24px', background: '#2563eb' }}
              >
                Continuar al Bloque 2: Servicios SSTT <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ESQUELETO BLOQUE 2: SERVICIOS & SSTT (CONTENEDOR V1 RESERVADO) */}
        {activeBlock === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="odoo-card" style={{ 
              background: '#ffffff', 
              border: '2px solid #3b82f6', 
              boxShadow: '0 10px 25px -5px rgba(59,130,246,0.1)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 style={{ color: '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench color="#2563eb" size={24} /> Bloque 2: Servicios Especializados & SSTT
                </h2>
                <span style={{ 
                  background: '#dbeafe', 
                  color: '#1e40af', 
                  padding: '6px 14px', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #bfdbfe'
                }}>
                  ⚡ Suite V1 Activa
                </span>
              </div>
              
              <div style={{ margin: '20px 0' }}>
                <Bloque2_SSTT setTotalServicios={setTotalServicios} setDetalleServicios={setDetalleServicios} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button 
                  className="primary-btn" 
                  onClick={() => setActiveBlock(1)}
                  style={{ width: 'auto', padding: '10px 24px', background: '#64748b' }}
                >
                  Regresar a Bloque 1
                </button>
                <button 
                  className="primary-btn" 
                  onClick={() => setActiveBlock(3)}
                  style={{ width: 'auto', padding: '10px 24px', background: '#2563eb' }}
                >
                  Continuar al Bloque 3: Consolidación <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BLOQUE 3: CONSOLIDACIÓN & RIESGOS (COMPONENTIZADO) */}
        {activeBlock === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Bloque3_Resumen 
              totalProcura={totalProcura} 
              totalServicios={totalServicios} 
              detalleProcura={detalleProcura}
              detalleServicios={detalleServicios}
            />
            <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-start' }}>
              <button 
                className="primary-btn" 
                onClick={() => setActiveBlock(2)}
                style={{ width: 'auto', padding: '10px 24px', background: '#64748b' }}
              >
                Regresar a Bloque 2
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
