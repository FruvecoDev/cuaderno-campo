import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Documentos = () => {
  const { t } = useTranslation();
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => { fetchDocumentos(); }, []);
  
  const fetchDocumentos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/documentos`);
      const data = await res.json();
      setDocumentos(data.documentos || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entidad_tipo', 'general');
      formData.append('entidad_id', 'general');
      
      await fetch(`${BACKEND_URL}/api/documentos/upload`, { method: 'POST', body: formData });
      fetchDocumentos();
    } catch (err) { console.error(err); }
    setUploading(false);
  };
  
  return (
    <div data-testid="documentos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('documents.title')}</h1>
        <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
          <Upload size={18} />
          {uploading ? t('common.loading') : t('common.upload')}
          <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>
      <div className="card">
        {loading ? <p>{t('common.loading')}</p> : documentos.length === 0 ? <p className="text-muted">{t('common.noData')}</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {documentos.map(doc => (
              <div key={doc._id} style={{ border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <FileText size={48} style={{ margin: '0 auto 0.5rem' }} />
                <div className="font-semibold text-sm" style={{ marginBottom: '0.25rem' }}>{doc.nombre}</div>
                <div className="text-xs text-muted">{(doc.size / 1024).toFixed(1)} KB</div>
                <div className="text-xs text-muted">{new Date(doc.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Documentos;