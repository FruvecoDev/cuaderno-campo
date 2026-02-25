import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Upload, Trash2, Image, Check, AlertCircle, RefreshCw, Palette, RotateCcw, Clock, Bell, Mail, Play } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Logo Uploader Component
const LogoUploader = ({ type, currentLogo, onUpload, onDelete, loading }) => {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const title = type === 'login' ? 'Logo de Login' : 'Logo de Dashboard';
  const description = type === 'login' 
    ? 'Este logo aparecerá en la pantalla de inicio de sesión'
    : 'Este logo aparecerá en el menú lateral del dashboard';

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    setError('');
    setUploading(true);

    try {
      await onUpload(type, file);
      setPreview(null);
    } catch (err) {
      setError(err.message || 'Error al subir el logo');
    } finally {
      setUploading(false);
    }
  }, [type, onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
      'image/svg+xml': ['.svg']
    },
    maxFiles: 1,
    disabled: uploading || loading
  });

  const handleDelete = async () => {
    if (window.confirm(`¿Está seguro de eliminar el logo de ${title.toLowerCase()}?`)) {
      try {
        await onDelete(type);
      } catch (err) {
        setError(err.message || 'Error al eliminar el logo');
      }
    }
  };

  const displayLogo = preview || (currentLogo ? `${API_URL}${currentLogo}` : null);

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
          {title}
        </h3>
        <p className="text-muted text-sm">{description}</p>
      </div>

      {error && (
        <div style={{
          background: 'hsl(var(--destructive) / 0.1)',
          border: '1px solid hsl(var(--destructive))',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} style={{ color: 'hsl(var(--destructive))' }} />
          <span style={{ color: 'hsl(var(--destructive))', fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{
          width: '180px',
          height: '120px',
          border: '2px dashed hsl(var(--border))',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'hsl(var(--muted))',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {displayLogo ? (
            <img 
              src={displayLogo} 
              alt={title}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '0.5rem' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              <Image size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p className="text-xs">Sin logo personalizado</p>
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              borderRadius: '0.5rem',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              background: isDragActive ? 'hsl(var(--primary) / 0.05)' : 'transparent',
              transition: 'all 0.2s'
            }}
            data-testid={`logo-dropzone-${type}`}
          >
            <input {...getInputProps()} data-testid={`logo-input-${type}`} />
            {uploading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} className="animate-spin" />
                <span>Subiendo...</span>
              </div>
            ) : (
              <>
                <Upload size={24} style={{ marginBottom: '0.5rem', color: 'hsl(var(--primary))' }} />
                <p style={{ marginBottom: '0.25rem' }}>
                  {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-muted">PNG, JPG, WebP o SVG (máx. 5MB)</p>
              </>
            )}
          </div>

          {currentLogo && (
            <button
              onClick={handleDelete}
              disabled={loading || uploading}
              className="btn"
              style={{
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
                border: '1px solid hsl(var(--destructive) / 0.3)'
              }}
              data-testid={`delete-logo-${type}`}
            >
              <Trash2 size={16} />
              Eliminar logo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Theme Selector Component
const ThemeSelector = ({ currentTheme, themes, onSelectTheme, onCustomColor, onReset, loading }) => {
  const [showCustom, setShowCustom] = useState(currentTheme?.is_custom || false);
  const [customPrimary, setCustomPrimary] = useState('#2d5a27');
  const [customAccent, setCustomAccent] = useState('#7cb518');

  // Convert HSL string to hex for color picker
  const hslToHex = (hslStr) => {
    if (!hslStr) return '#2d5a27';
    const [h, s, l] = hslStr.split(' ').map(v => parseFloat(v.replace('%', '')));
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lNorm - c / 2;
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
        default: h = 0;
      }
    }
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  useEffect(() => {
    if (currentTheme?.primary) {
      setCustomPrimary(hslToHex(currentTheme.primary));
    }
    if (currentTheme?.accent) {
      setCustomAccent(hslToHex(currentTheme.accent));
    }
  }, [currentTheme]);

  const handleApplyCustom = () => {
    onCustomColor(hexToHsl(customPrimary), hexToHsl(customAccent));
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Palette size={20} />
          Tema de Colores
        </h3>
        <p className="text-muted text-sm">Personaliza los colores de la aplicación</p>
      </div>

      {/* Predefined Themes Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
          Temas Predefinidos
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
          gap: '0.75rem' 
        }}>
          {themes.map((theme) => {
            const isSelected = currentTheme?.theme_id === theme.id && !currentTheme?.is_custom;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                disabled={loading}
                style={{
                  padding: '0.75rem',
                  border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  background: isSelected ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                data-testid={`theme-${theme.id}`}
              >
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: `hsl(${theme.primary})`,
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: `hsl(${theme.accent})`,
                    border: '2px solid white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>{theme.name}</span>
                {isSelected && (
                  <Check size={14} style={{ float: 'right', color: 'hsl(var(--primary))' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors Section */}
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))' }}>
            Colores Personalizados
          </h4>
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
          >
            {showCustom ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {showCustom && (
          <div style={{ 
            background: 'hsl(var(--muted))', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Color Primario
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    style={{ 
                      width: '50px', 
                      height: '40px', 
                      border: 'none', 
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                    data-testid="custom-primary-color"
                  />
                  <input
                    type="text"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    style={{
                      width: '90px',
                      padding: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Color Acento
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    style={{ 
                      width: '50px', 
                      height: '40px', 
                      border: 'none', 
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                    data-testid="custom-accent-color"
                  />
                  <input
                    type="text"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    style={{
                      width: '90px',
                      padding: '0.5rem',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8125rem' }}>Vista previa:</span>
              <div style={{
                display: 'flex',
                gap: '0.25rem',
                padding: '0.5rem 1rem',
                background: `linear-gradient(135deg, ${customPrimary} 0%, ${customAccent} 100%)`,
                borderRadius: '0.5rem',
                color: 'white',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}>
                Botón de Ejemplo
              </div>
            </div>

            <button
              onClick={handleApplyCustom}
              disabled={loading}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              data-testid="apply-custom-theme"
            >
              <Check size={16} />
              Aplicar Colores Personalizados
            </button>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1rem' }}>
        <button
          onClick={onReset}
          disabled={loading || currentTheme?.theme_id === 'verde'}
          className="btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'transparent',
            border: '1px solid hsl(var(--border))'
          }}
          data-testid="reset-theme"
        >
          <RotateCcw size={16} />
          Restaurar Tema Predeterminado
        </button>
      </div>
    </div>
  );
};

// Main Configuration Page
const Configuracion = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logos, setLogos] = useState({ login_logo: null, dashboard_logo: null });
  const [currentTheme, setCurrentTheme] = useState(null);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchLogos();
    fetchTheme();
    fetchThemes();
  }, []);

  const fetchLogos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config/logos`);
      const data = await response.json();
      if (data.success) {
        setLogos({ login_logo: data.login_logo, dashboard_logo: data.dashboard_logo });
      }
    } catch (err) {
      console.error('Error fetching logos:', err);
    }
  };

  const fetchTheme = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config/theme`);
      const data = await response.json();
      if (data.success) {
        setCurrentTheme(data);
        applyThemeToDOM(data.primary, data.accent);
      }
    } catch (err) {
      console.error('Error fetching theme:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThemes = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config/themes`);
      const data = await response.json();
      if (data.success) {
        setThemes(data.themes);
      }
    } catch (err) {
      console.error('Error fetching themes:', err);
    }
  };

  const applyThemeToDOM = (primary, accent) => {
    if (primary) {
      document.documentElement.style.setProperty('--primary', primary);
      document.documentElement.style.setProperty('--ring', primary);
      document.documentElement.style.setProperty('--chart-1', primary);
    }
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent);
      document.documentElement.style.setProperty('--chart-2', accent);
    }
  };

  const handleLogoUpload = async (type, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/config/logo/${type}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Error al subir el logo');

    setLogos(prev => ({ ...prev, [`${type}_logo`]: data.logo_url }));
    setMessage({ type: 'success', text: data.message });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleLogoDelete = async (type) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/config/logo/${type}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Error al eliminar el logo');

    setLogos(prev => ({ ...prev, [`${type}_logo`]: null }));
    setMessage({ type: 'success', text: data.message });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSelectTheme = async (themeId) => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/config/theme?theme_id=${themeId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al aplicar el tema');

      setCurrentTheme(data);
      applyThemeToDOM(data.primary, data.accent);
      setMessage({ type: 'success', text: data.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomColor = async (primary, accent) => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/config/theme?primary=${encodeURIComponent(primary)}&accent=${encodeURIComponent(accent)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al aplicar el tema');

      setCurrentTheme(data);
      applyThemeToDOM(data.primary, data.accent);
      setMessage({ type: 'success', text: 'Colores personalizados aplicados correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetTheme = async () => {
    if (!window.confirm('¿Restaurar el tema predeterminado (Verde)?')) return;

    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/config/theme`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Error al restaurar el tema');

      // Reset to default
      const defaultTheme = { theme_id: 'verde', primary: '122 37% 27%', accent: '74 85% 40%', is_custom: false };
      setCurrentTheme(defaultTheme);
      applyThemeToDOM(defaultTheme.primary, defaultTheme.accent);
      setMessage({ type: 'success', text: data.message });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'Admin') return null;

  return (
    <div className="page-container" data-testid="configuracion-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={28} />
            Configuración de la Aplicación
          </h1>
          <p className="text-muted">Personaliza los logos y colores de la aplicación</p>
        </div>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'success' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--destructive) / 0.1)',
          border: `1px solid ${message.type === 'success' ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))'}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={18} style={{ color: message.type === 'success' ? 'hsl(142 76% 36%)' : 'hsl(var(--destructive))' }} />
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Theme Selector */}
        <ThemeSelector
          currentTheme={currentTheme}
          themes={themes}
          onSelectTheme={handleSelectTheme}
          onCustomColor={handleCustomColor}
          onReset={handleResetTheme}
          loading={loading}
        />

        {/* Logo Uploaders */}
        <LogoUploader
          type="login"
          currentLogo={logos.login_logo}
          onUpload={handleLogoUpload}
          onDelete={handleLogoDelete}
          loading={loading}
        />

        <LogoUploader
          type="dashboard"
          currentLogo={logos.dashboard_logo}
          onUpload={handleLogoUpload}
          onDelete={handleLogoDelete}
          loading={loading}
        />
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', background: 'hsl(var(--muted))' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Información</h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
          <li>Los cambios de tema se aplican inmediatamente a toda la aplicación.</li>
          <li>Los logos se actualizarán inmediatamente después de subirlos.</li>
          <li>Se recomienda usar imágenes con fondo transparente (PNG o SVG).</li>
          <li>El tamaño máximo de archivo para logos es de 5MB.</li>
        </ul>
      </div>
    </div>
  );
};

export default Configuracion;
