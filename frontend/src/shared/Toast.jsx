import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, showToast: addToast }}>
      {children}
      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '400px',
          width: 'calc(100% - 48px)',
        }}
      >
        {toasts.map((t) => {
          let bg = '#1b4332';
          let icon = <CheckCircle2 size={18} style={{ color: '#4ade80' }} />;
          if (t.type === 'error') {
            bg = '#7f1d1d';
            icon = <XCircle size={18} style={{ color: '#f87171' }} />;
          } else if (t.type === 'warning') {
            bg = '#78350f';
            icon = <AlertTriangle size={18} style={{ color: '#fbbf24' }} />;
          } else if (t.type === 'info') {
            bg = '#1e3a8a';
            icon = <Info size={18} style={{ color: '#60a5fa' }} />;
          }

          return (
            <div
              key={t.id}
              role="alert"
              style={{
                backgroundColor: bg,
                color: '#ffffff',
                padding: '12px 16px',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.86rem',
                fontWeight: 500,
                animation: 'slideIn 0.2s ease-out',
              }}
            >
              {icon}
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>{t.message}</div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Tutup notifikasi"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  opacity: 0.7,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: () => {},
      showToast: () => {},
    };
  }
  return ctx;
}

