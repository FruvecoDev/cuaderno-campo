import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', 'true');
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, width: 'calc(100% - 32px)', maxWidth: 420,
      backgroundColor: '#1565c0', color: 'white', borderRadius: 12,
      padding: '0.75rem 1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      animation: 'slideUp 0.3s ease-out',
    }} data-testid="pwa-install-prompt">
      <Smartphone size={28} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Instalar FRUVECO</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Accede rapidamente desde tu pantalla de inicio</div>
      </div>
      <button onClick={handleInstall} style={{
        backgroundColor: 'white', color: '#1565c0', border: 'none',
        padding: '6px 14px', borderRadius: 8, fontWeight: 600,
        cursor: 'pointer', fontSize: '0.8rem', display: 'flex',
        alignItems: 'center', gap: 4, flexShrink: 0,
      }} data-testid="btn-install-pwa">
        <Download size={14} /> Instalar
      </button>
      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer', padding: 4, flexShrink: 0,
      }} data-testid="btn-dismiss-pwa">
        <X size={16} />
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
