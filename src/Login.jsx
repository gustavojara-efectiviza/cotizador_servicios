import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { Lock, Zap } from 'lucide-react';
import './index.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El componente App.jsx escuchará el cambio de estado de onAuthStateChanged y redirigirá automáticamente.
    } catch (err) {
      console.error(err);
      setError('Credenciales incorrectas o usuario no autorizado.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
      <div className="odoo-card" style={{ width: '400px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ background: '#eff6ff', padding: '15px', borderRadius: '50%' }}>
            <Zap color="#2563eb" size={32} />
          </div>
        </div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>ZUNZ Cotizador B2B</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', textAlign: 'center' }}>Ingresa tus credenciales corporativas para acceder a la plataforma.</p>

        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Correo Electrónico</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="usuario@empresa.com" 
              required
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', marginTop: '5px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', marginTop: '5px' }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center', background: '#fef2f2', padding: '10px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
              <Lock size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="primary-btn" 
            disabled={isLoading}
            style={{ padding: '15px', width: '100%', display: 'flex', justifyContent: 'center', fontSize: '1.1rem', marginTop: '10px' }}
          >
            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
