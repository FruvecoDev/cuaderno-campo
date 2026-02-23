import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

const LanguageSelector = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    setIsOpen(false);
  };
  
  if (variant === 'minimal') {
    return (
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.5rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '6px',
            color: 'hsl(var(--foreground))'
          }}
          title="Cambiar idioma"
          data-testid="language-selector-btn"
        >
          <Globe size={18} />
          <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{currentLanguage.code.toUpperCase()}</span>
        </button>
        
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.25rem',
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '160px',
              overflow: 'hidden'
            }}
            data-testid="language-dropdown"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  background: lang.code === currentLanguage.code ? 'hsl(var(--accent))' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: 'hsl(var(--foreground))',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (lang.code !== currentLanguage.code) {
                    e.target.style.backgroundColor = 'hsl(var(--muted))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (lang.code !== currentLanguage.code) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
                data-testid={`language-option-${lang.code}`}
              >
                <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.name}</span>
                {lang.code === currentLanguage.code && (
                  <Check size={16} style={{ color: 'hsl(var(--primary))' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Default variant with full dropdown
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem'
        }}
        data-testid="language-selector-btn"
      >
        <Globe size={18} />
        <span style={{ fontSize: '1rem' }}>{currentLanguage.flag}</span>
        <span>{currentLanguage.name}</span>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
      </button>
      
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '180px',
            overflow: 'hidden'
          }}
          data-testid="language-dropdown"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 1rem',
                background: lang.code === currentLanguage.code ? 'hsl(var(--accent))' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.9rem',
                color: 'hsl(var(--foreground))',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => {
                if (lang.code !== currentLanguage.code) {
                  e.target.style.backgroundColor = 'hsl(var(--muted))';
                }
              }}
              onMouseLeave={(e) => {
                if (lang.code !== currentLanguage.code) {
                  e.target.style.backgroundColor = 'transparent';
                }
              }}
              data-testid={`language-option-${lang.code}`}
            >
              <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
              <span style={{ flex: 1 }}>{lang.name}</span>
              {lang.code === currentLanguage.code && (
                <Check size={18} style={{ color: 'hsl(var(--primary))' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
