import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import '../App.css';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showInitAdmin, setShowInitAdmin] = useState(false);
  const { login, initializeAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setShowInitAdmin(true);
    }
    
    setLoading(false);
  };
  
  const handleInitAdmin = async () => {
    setLoading(true);
    const result = await initializeAdmin();
    
    if (result.success) {
      alert(`${t('auth.adminCreated')}!\n\nEmail: ${result.credentials.email}\nPassword: ${result.credentials.password}\n\n${t('auth.useCredentials')}`);
      setEmail(result.credentials.email);
      setPassword(result.credentials.password);
      setShowInitAdmin(false);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)',
      position: 'relative'
    }}>
      {/* Language selector in top right */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <LanguageSelector />
      </div>
      
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem'
      }}>
        <div className="card" style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img 
              src={logo} 
              alt="FRUVECO Logo" 
              style={{ 
                maxWidth: '180px', 
                height: 'auto',
                marginBottom: '0.5rem'
              }} 
            />
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }}>{t('auth.fieldNotebook')}</p>
            <p className="text-muted">{t('auth.loginTitle')}</p>
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
              <AlertCircle size={18} style={{ color: 'hsl(var(--destructive))' }} />
              <span style={{ color: 'hsl(var(--destructive))', fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@fruveco.com"
                  required
                  data-testid="login-email"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User size={18} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--muted-foreground))'
                }} />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="login-password"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={18} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'hsl(var(--muted-foreground))'
                }} />
              </div>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? `${t('common.loading')}` : t('auth.login')}
            </button>
          </form>
          
          {showInitAdmin && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                {t('auth.firstTime')}
              </p>
              <button
                onClick={handleInitAdmin}
                className="btn btn-secondary"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {t('auth.initAdmin')}
              </button>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem' }}>
            <p className="text-xs text-muted" style={{ marginBottom: '0.5rem' }}>
              <strong>{t('auth.defaultCredentials')}:</strong>
            </p>
            <p className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
              Email: admin@fruveco.com<br />
              Password: admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;