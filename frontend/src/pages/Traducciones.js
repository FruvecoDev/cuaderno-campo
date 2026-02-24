import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Check, X, Search, Filter, 
  Globe, Book, ChevronDown, ChevronUp, Download, Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Language flags mapping
const LANGUAGE_FLAGS = {
  es: '🇪🇸',
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹'
};

const LANGUAGE_NAMES = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano'
};

const CATEGORY_ICONS = {
  crops: '🌱',
  pests: '🐛',
  diseases: '🦠',
  treatments: '💊',
  machinery: '🚜',
  measurements: '📏',
  soil: '🌍',
  irrigation: '💧',
  harvest: '🌾',
  general: '📋'
};

const CATEGORY_LABELS = {
  crops: { es: 'Cultivos', en: 'Crops', fr: 'Cultures', de: 'Kulturen', it: 'Colture' },
  pests: { es: 'Plagas', en: 'Pests', fr: 'Ravageurs', de: 'Schädlinge', it: 'Parassiti' },
  diseases: { es: 'Enfermedades', en: 'Diseases', fr: 'Maladies', de: 'Krankheiten', it: 'Malattie' },
  treatments: { es: 'Tratamientos', en: 'Treatments', fr: 'Traitements', de: 'Behandlungen', it: 'Trattamenti' },
  machinery: { es: 'Maquinaria', en: 'Machinery', fr: 'Machines', de: 'Maschinen', it: 'Macchinari' },
  measurements: { es: 'Medidas', en: 'Measurements', fr: 'Mesures', de: 'Maße', it: 'Misure' },
  soil: { es: 'Suelo', en: 'Soil', fr: 'Sol', de: 'Boden', it: 'Suolo' },
  irrigation: { es: 'Riego', en: 'Irrigation', fr: 'Irrigation', de: 'Bewässerung', it: 'Irrigazione' },
  harvest: { es: 'Cosecha', en: 'Harvest', fr: 'Récolte', de: 'Ernte', it: 'Raccolta' },
  general: { es: 'General', en: 'General', fr: 'Général', de: 'Allgemein', it: 'Generale' }
};

const Traducciones = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es';
  const [translations, setTranslations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { token, user } = useAuth();
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    approvedOnly: false
  });
  
  // Form data
  const [formData, setFormData] = useState({
    key: '',
    category: 'general',
    description: '',
    region: '',
    translations: {
      es: '',
      en: '',
      fr: '',
      de: '',
      it: ''
    }
  });
  
  // Expanded sections
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchTranslations();
  }, []);

  useEffect(() => {
    fetchTranslations();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/translations/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
      setLanguages(data.languages || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchTranslations = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.approvedOnly) params.append('approved_only', 'true');
      
      const queryString = params.toString();
      const url = queryString 
        ? `${BACKEND_URL}/api/translations/?${queryString}`
        : `${BACKEND_URL}/api/translations/`;
      const response = await fetch(url);
      const data = await response.json();
      setTranslations(data.translations || []);
    } catch (err) {
      console.error('Error fetching translations:', err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      key: '',
      category: 'general',
      description: '',
      region: '',
      translations: { es: '', en: '', fr: '', de: '', it: '' }
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.key.trim()) {
      setError(t('translations.keyRequired'));
      return;
    }
    
    // Check at least one translation
    const hasTranslation = Object.values(formData.translations).some(v => v.trim());
    if (!hasTranslation) {
      setError(t('translations.atLeastOneTranslation'));
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/translations/${editingId}`
        : `${BACKEND_URL}/api/translations`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Filter out empty translations
      const cleanTranslations = {};
      Object.entries(formData.translations).forEach(([lang, value]) => {
        if (value.trim()) cleanTranslations[lang] = value.trim();
      });
      
      const payload = editingId 
        ? { translations: cleanTranslations, description: formData.description, region: formData.region }
        : { ...formData, translations: cleanTranslations };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMsg(editingId ? t('messages.savedSuccessfully') : t('translations.created'));
        setShowForm(false);
        resetForm();
        fetchTranslations();
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(data.message || data.detail);
      }
    } catch (err) {
      console.error('Error saving translation:', err);
      setError(t('messages.errorSaving'));
    }
  };

  const handleEdit = (trans) => {
    setFormData({
      key: trans.key,
      category: trans.category,
      description: trans.description || '',
      region: trans.region || '',
      translations: {
        es: trans.translations.es || '',
        en: trans.translations.en || '',
        fr: trans.translations.fr || '',
        de: trans.translations.de || '',
        it: trans.translations.it || ''
      }
    });
    setEditingId(trans.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('translations.confirmDelete'))) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/translations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSuccessMsg(t('messages.deletedSuccessfully'));
        fetchTranslations();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error deleting:', err);
      setError(t('messages.errorDeleting'));
    }
  };

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/translations/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSuccessMsg(t('translations.approved'));
        fetchTranslations();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Error approving:', err);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm(t('translations.confirmSeed'))) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/translations/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMsg(data.message);
        fetchTranslations();
      } else {
        setError(data.message);
      }
      setTimeout(() => { setSuccessMsg(null); setError(null); }, 5000);
    } catch (err) {
      console.error('Error seeding:', err);
    }
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Group translations by category
  const groupedTranslations = translations.reduce((acc, trans) => {
    const cat = trans.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(trans);
    return acc;
  }, {});

  const isAdmin = user?.role === 'Admin';

  return (
    <div data-testid="traducciones-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={32} />
            {t('translations.title')}
          </h1>
          <p className="text-muted">{t('translations.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isAdmin && translations.length === 0 && (
            <button className="btn btn-secondary" onClick={handleSeedData}>
              <Download size={18} />
              {t('translations.loadDefaults')}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            data-testid="btn-nueva-traduccion"
          >
            <Plus size={18} />
            {t('translations.newTranslation')}
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="card mb-4" style={{ backgroundColor: 'hsl(142, 76%, 36%, 0.1)', border: '1px solid hsl(142, 76%, 36%)', padding: '1rem' }}>
          <p style={{ color: 'hsl(142, 76%, 36%)' }}>{successMsg}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>{t('common.filters')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('translations.category')}</label>
            <select
              className="form-select"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">{t('common.all')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]?.[currentLang] || cat}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('common.search')}</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder={t('translations.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.approvedOnly}
                onChange={(e) => setFilters({ ...filters, approvedOnly: e.target.checked })}
              />
              {t('translations.approvedOnly')}
            </label>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6" data-testid="traduccion-form">
          <h2 className="card-title">
            {editingId ? t('translations.editTranslation') : t('translations.newTranslation')}
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('translations.key')} *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="crop.tomato, pest.aphid..."
                  disabled={editingId}
                  required
                />
                <small className="text-muted">{t('translations.keyHelp')}</small>
              </div>
              <div className="form-group">
                <label className="form-label">{t('translations.category')} *</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={editingId}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]?.[currentLang] || cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('translations.description')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('translations.descriptionPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('translations.region')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder={t('translations.regionPlaceholder')}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ marginBottom: '1rem' }}>
                <Globe size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                {t('translations.translations')} *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {languages.map(lang => (
                  <div key={lang} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.875rem' }}>
                      {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang]}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.translations[lang] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        translations: { ...formData.translations, [lang]: e.target.value }
                      })}
                      placeholder={`${t('translations.translationIn')} ${LANGUAGE_NAMES[lang]}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingId ? t('common.update') : t('common.save')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Translations List by Category */}
      <div className="card">
        <h2 className="card-title">
          <Book size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {t('translations.dictionary')} ({translations.length})
        </h2>

        {loading ? (
          <p>{t('common.loading')}</p>
        ) : translations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Globe size={48} style={{ margin: '0 auto 1rem', color: 'hsl(var(--muted-foreground))' }} />
            <p className="text-muted">{t('translations.noTranslations')}</p>
            {isAdmin && (
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleSeedData}>
                {t('translations.loadDefaults')}
              </button>
            )}
          </div>
        ) : (
          <div>
            {Object.entries(groupedTranslations).map(([category, items]) => (
              <div key={category} style={{ marginBottom: '0.5rem', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleCategory(category)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: expandedCategories[category] ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <span>
                    {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]?.[currentLang] || category} ({items.length})
                  </span>
                  {expandedCategories[category] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedCategories[category] && (
                  <div style={{ padding: '1rem' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>{t('translations.key')}</th>
                            {languages.map(lang => (
                              <th key={lang}>{LANGUAGE_FLAGS[lang]}</th>
                            ))}
                            <th>{t('translations.region')}</th>
                            <th>{t('common.status')}</th>
                            <th>{t('common.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(trans => (
                            <tr key={trans.id}>
                              <td>
                                <div style={{ fontWeight: '600' }}>{trans.key}</div>
                                {trans.description && (
                                  <div className="text-xs text-muted">{trans.description}</div>
                                )}
                              </td>
                              {languages.map(lang => (
                                <td key={lang} style={{ fontSize: '0.875rem' }}>
                                  {trans.translations[lang] || '-'}
                                </td>
                              ))}
                              <td>
                                {trans.region && (
                                  <span className="badge badge-secondary">{trans.region}</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${trans.is_approved ? 'badge-success' : 'badge-warning'}`}>
                                  {trans.is_approved ? t('translations.approved') : t('translations.pending')}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  {isAdmin && !trans.is_approved && (
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() => handleApprove(trans.id)}
                                      title={t('translations.approve')}
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleEdit(trans)}
                                    title={t('common.edit')}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      className="btn btn-sm btn-error"
                                      onClick={() => handleDelete(trans.id)}
                                      title={t('common.delete')}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Traducciones;
