import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Zap } from 'lucide-react';

const ZunzCopilot = forwardRef(({ activeBlock }, ref) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Expose methods to the parent
  useImperativeHandle(ref, () => ({
    celebrarExito: (mensajeCustom) => {
      // Trigger canvas-confetti
      const duration = 1500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#3b82f6', '#8b5cf6', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#3b82f6', '#8b5cf6', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Show success message
      setToastMessage(mensajeCustom || '¡Excelente! Bloque completado con éxito.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }));

  // Work memory anchor (ADHD friendly)
  useEffect(() => {
    if (!activeBlock) return;
    
    const blockNames = {
      1: 'Configuración y Procura',
      2: 'Servicios Técnicos',
      3: 'Consolidación Final'
    };

    setToastMessage(`¡De vuelta! Estás en: ${blockNames[activeBlock]}`);
    setShowToast(true);
    
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [activeBlock]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 50,
      pointerEvents: 'none', // Wrapper is non-intrusive
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px'
    }}>
      
      {/* Toast Balloon */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '10px 16px',
              borderRadius: '12px 12px 0 12px',
              color: '#f8fafc',
              fontSize: '0.9rem',
              fontWeight: 500,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              marginBottom: '15px'
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar HUD */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '2px solid rgba(56, 189, 248, 0.5)',
          boxShadow: '0 0 15px rgba(56, 189, 248, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto' // Avatar is clickable
        }}
        onClick={() => {
          setToastMessage('Sistema ZUNZ Copilot Activo ⚡');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        }}
      >
        <Zap size={24} color="#38bdf8" />
      </motion.div>
    </div>
  );
});

export default ZunzCopilot;
