import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Upload, Trash2, Image, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LogoUploader = ({ type, currentLogo, onUpload, onDelete, loading }) => {
  const { t } = useTranslation();
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

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    // Show preview
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
        {/* Current logo preview */}
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
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain',
                padding: '0.5rem'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              <Image size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p className="text-xs">Sin logo personalizado</p>
            </div>
          )}
        </div>

        {/* Upload area */}
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
              Eliminar logo y usar por defecto
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Configuracion = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logos, setLogos] = useState({ login_logo: null, dashboard_logo: null });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch current logos
  useEffect(() => {
    fetchLogos();
  }, []);

  const fetchLogos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config/logos`);
      const data = await response.json();
      if (data.success) {
        setLogos({
          login_logo: data.login_logo,
          dashboard_logo: data.dashboard_logo
        });
      }
    } catch (err) {
      console.error('Error fetching logos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (type, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/config/logo/${type}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Error al subir el logo');
    }

    // Update local state
    setLogos(prev => ({
      ...prev,
      [`${type}_logo`]: data.logo_url
    }));

    setMessage({ type: 'success', text: data.message });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleDelete = async (type) => {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/config/logo/${type}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Error al eliminar el logo');
    }

    // Update local state
    setLogos(prev => ({
      ...prev,
      [`${type}_logo`]: null
    }));

    setMessage({ type: 'success', text: data.message });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (user?.role !== 'Admin') {
    return null;
  }

  return (
    <div className="page-container" data-testid="configuracion-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={28} />
            Configuración de la Aplicación
          </h1>
          <p className="text-muted">Personaliza los logos y la apariencia de la aplicación</p>
        </div>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'success' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--destructive) / 0.1)',
          border: `1px solid ${message.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={18} style={{ color: message.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }} />
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <LogoUploader
          type="login"
          currentLogo={logos.login_logo}
          onUpload={handleUpload}
          onDelete={handleDelete}
          loading={loading}
        />

        <LogoUploader
          type="dashboard"
          currentLogo={logos.dashboard_logo}
          onUpload={handleUpload}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem', background: 'hsl(var(--muted))' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Información</h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
          <li>Los logos se actualizarán inmediatamente después de subirlos.</li>
          <li>Se recomienda usar imágenes con fondo transparente (PNG o SVG).</li>
          <li>El tamaño máximo de archivo es de 5MB.</li>
          <li>Para mejores resultados, use imágenes de al menos 200x100 píxeles.</li>
        </ul>
      </div>
    </div>
  );
};

export default Configuracion;
