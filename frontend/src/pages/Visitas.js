import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Settings } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import syncService from '../services/syncService';
import offlineDB from '../services/offlineDB';
import api from '../services/api';
import { VisitasFieldsConfig, VisitasSearchFilters } from '../components/visitas/VisitasFilters';
import { VisitasForm } from '../components/visitas/VisitasForm';
import { VisitasTable } from '../components/visitas/VisitasTable';
import { VisitasDetailModal } from '../components/visitas/VisitasDetailModal';
import { VisitasAnalysisModal } from '../components/visitas/VisitasAnalysisModal';
import '../App.css';

// Default configs
const DEFAULT_FIELDS_CONFIG = {
  objetivo: true, fecha_visita: true, parcela_id: true,
  observaciones: true, cuestionario_plagas: true
};

const DEFAULT_TABLE_CONFIG = {
  objetivo: true, parcela: true, proveedor: true,
  cultivo: true, campana: true, fecha: true, estado: true
};

const PLAGAS_ENFERMEDADES = [
  { key: 'trips', label: 'Trips' }, { key: 'mosca_blanca', label: 'Mosca blanca' },
  { key: 'minador', label: 'Minador' }, { key: 'arana_roja', label: 'Arana roja' },
  { key: 'oruga', label: 'Oruga' }, { key: 'pulgon', label: 'Pulgon' },
  { key: 'botrytis', label: 'Botrytis' }, { key: 'mildiu', label: 'Mildiu' },
  { key: 'oidio', label: 'Oidio' }, { key: 'ascochyta', label: 'Ascochyta' }
];

const Visitas = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingVisita, setViewingVisita] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  const [parcelas, setParcelas] = useState([]);
  const [selectedParcelaInfo, setSelectedParcelaInfo] = useState(null);
  const [parcelaSearch, setParcelaSearch] = useState({ proveedor: '', cultivo: '', campana: '' });
  const [parcelaFilterOptions, setParcelaFilterOptions] = useState({ proveedores: [], cultivos: [], campanas: [] });
  
  const [filters, setFilters] = useState({ proveedor: '', cultivo: '', campana: '', parcela: '' });
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('visitas_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  const [tableConfig, setTableConfig] = useState(() => {
    const saved = localStorage.getItem('visitas_table_config');
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_CONFIG;
  });
  const [filterOptions, setFilterOptions] = useState({ proveedores: [], cultivos: [], campanas: [], parcelas: [] });
  
  const [formData, setFormData] = useState({
    objetivo: 'Control Rutinario',
    fecha_visita: new Date().toISOString().split('T')[0],
    fecha_planificada: '',
    parcela_id: '',
    observaciones: ''
  });
  
  const [cuestionarioPlagas, setCuestionarioPlagas] = useState(() => {
    const initial = {};
    PLAGAS_ENFERMEDADES.forEach(p => { initial[p.key] = 0; });
    return initial;
  });
  
  // Photo state
  const [fotos, setFotos] = useState([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  
  // AI analysis state
  const [analyzingFoto, setAnalyzingFoto] = useState(null);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(null);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchVisitas(); fetchParcelas(); }, []);
  
  useEffect(() => {
    const proveedores = [...new Set(visitas.map(v => v.proveedor).filter(Boolean))];
    const cultivos = [...new Set(visitas.map(v => v.cultivo).filter(Boolean))];
    const campanas = [...new Set(visitas.map(v => v.campana).filter(Boolean))];
    const parcelasCodigos = [...new Set(visitas.map(v => v.codigo_plantacion).filter(Boolean))];
    setFilterOptions({ proveedores, cultivos, campanas, parcelas: parcelasCodigos });
  }, [visitas]);
  
  useEffect(() => {
    const proveedores = [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))];
    const cultivos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
    const campanas = [...new Set(parcelas.map(p => p.campana).filter(Boolean))];
    setParcelaFilterOptions({ proveedores, cultivos, campanas });
  }, [parcelas]);
  
  useEffect(() => { localStorage.setItem('visitas_fields_config', JSON.stringify(fieldsConfig)); }, [fieldsConfig]);
  useEffect(() => { localStorage.setItem('visitas_table_config', JSON.stringify(tableConfig)); }, [tableConfig]);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const verParam = searchParams.get('ver');
    const editarParam = searchParams.get('editar');
    if (verParam && visitas.length > 0) {
      const visita = visitas.find(v => v._id === verParam);
      if (visita) { setViewingVisita(visita); searchParams.delete('ver'); setSearchParams(searchParams); }
    }
    if (editarParam && visitas.length > 0) {
      const visita = visitas.find(v => v._id === editarParam);
      if (visita) { handleEdit(visita); searchParams.delete('editar'); setSearchParams(searchParams); }
    }
  }, [searchParams, visitas, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (formData.parcela_id) {
      const parcela = parcelas.find(p => p._id === formData.parcela_id);
      setSelectedParcelaInfo(parcela || null);
    } else {
      setSelectedParcelaInfo(null);
    }
  }, [formData.parcela_id, parcelas]);
  
  const fetchParcelas = async () => {
    try {
      if (navigator.onLine) {
        const data = await api.get('/api/parcelas');
        setParcelas(data.parcelas || []);
        return;
      }
      const cachedParcelas = await offlineDB.getCachedParcelas();
      if (cachedParcelas && cachedParcelas.length > 0) setParcelas(cachedParcelas);
    } catch (error) {

      try {
        const cachedParcelas = await offlineDB.getCachedParcelas();
        if (cachedParcelas && cachedParcelas.length > 0) setParcelas(cachedParcelas);
      } catch (cacheError) {

      }
    }
  };
  
  const fetchVisitas = async () => {
    try {
      setError(null);
      const data = await api.get('/api/visitas');
      setVisitas(data.visitas || []);
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'ver las visitas');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Photo handlers
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
      if (!validExtensions.includes(ext)) { setUploadError(`${file.name}: Formato no permitido`); return false; }
      if (file.size > 10 * 1024 * 1024) { setUploadError(`${file.name}: Excede 10MB`); return false; }
      return true;
    });
    if (validFiles.length === 0) return;
    if (editingId) {
      await uploadFotos(editingId, validFiles);
    } else {
      const newFotos = validFiles.map(file => ({ file, preview: URL.createObjectURL(file), filename: file.name, pending: true }));
      setFotos(prev => [...prev, ...newFotos]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const uploadFotos = async (visitaId, files) => {
    setUploadingFotos(true);
    setUploadError(null);
    try {
      const formDataUpload = new FormData();
      files.forEach(file => { formDataUpload.append('files', file); });
      const data = await api.upload(`/api/visitas/${visitaId}/fotos`, formDataUpload);
      setFotos(data.fotos || []);
      fetchVisitas();
      return data;
    } catch (error) {

      setUploadError(api.getErrorMessage(error));
      throw error;
    } finally {
      setUploadingFotos(false);
    }
  };
  
  const deleteFoto = async (visitaId, fotoIndex) => {
    if (!window.confirm('Eliminar esta foto?')) return;
    if (fotos[fotoIndex]?.pending) { setFotos(prev => prev.filter((_, i) => i !== fotoIndex)); return; }
    try {
      const data = await api.delete(`/api/visitas/${visitaId}/fotos/${fotoIndex}`);
      setFotos(data.fotos || []);
      fetchVisitas();
    } catch (error) {

      setUploadError(api.getErrorMessage(error));
    }
  };
  
  // AI analysis handlers
  const analyzeFoto = async (visitaId, fotoIndex) => {
    if (!visitaId) return;
    setAnalyzingFoto(fotoIndex);
    setUploadError(null);
    try {
      const data = await api.post(`/api/visitas/${visitaId}/fotos/${fotoIndex}/analizar`, {});
      setFotos(prev => {
        const updated = [...prev];
        if (updated[fotoIndex]) updated[fotoIndex] = data.foto;
        return updated;
      });
      setShowAnalysisModal(data.analysis);
      fetchVisitas();
    } catch (error) {

      setUploadError(api.getErrorMessage(error));
    } finally {
      setAnalyzingFoto(null);
    }
  };
  
  const analyzeAllFotos = async (visitaId) => {
    if (!visitaId) return;
    setAnalyzingAll(true);
    setUploadError(null);
    try {
      const data = await api.post(`/api/visitas/${visitaId}/fotos/analizar-todas`, {});
      setFotos(data.fotos || []);
      fetchVisitas();
      const detections = data.results.filter(r => r.analysis?.detected);
      if (detections.length > 0) {
        setShowAnalysisModal({ summary: true, total: data.total_analyzed, detections: detections.map(d => d.analysis) });
      } else {
        setShowAnalysisModal({ summary: true, total: data.total_analyzed, detections: [], message: 'No se detectaron plagas ni enfermedades en ninguna foto.' });
      }
    } catch (error) {

      setUploadError(api.getErrorMessage(error));
    } finally {
      setAnalyzingAll(false);
    }
  };
  
  // Filter logic
  const filteredVisitas = visitas.filter(v => {
    if (filters.proveedor && v.proveedor !== filters.proveedor) return false;
    if (filters.cultivo && v.cultivo !== filters.cultivo) return false;
    if (filters.campana && v.campana !== filters.campana) return false;
    if (filters.parcela && v.codigo_plantacion !== filters.parcela) return false;
    return true;
  });
  
  const clearFilters = () => { setFilters({ proveedor: '', cultivo: '', campana: '', parcela: '' }); };
  const toggleFieldConfig = (field) => { setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] })); };
  const toggleTableConfig = (field) => { setTableConfig(prev => ({ ...prev, [field]: !prev[field] })); };
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  const resetForm = () => {
    setFormData({ objetivo: 'Control Rutinario', fecha_visita: new Date().toISOString().split('T')[0], fecha_planificada: '', parcela_id: '', observaciones: '' });
    const initialPlagas = {};
    PLAGAS_ENFERMEDADES.forEach(p => { initialPlagas[p.key] = 0; });
    setCuestionarioPlagas(initialPlagas);
    setSelectedParcelaInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
    fotos.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFotos([]);
    setUploadError(null);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.parcela_id) { setError('Debe seleccionar una Parcela'); setTimeout(() => setError(null), 5000); return; }
    if (!formData.fecha_visita) { setError('La fecha de visita es obligatoria'); setTimeout(() => setError(null), 5000); return; }
    
    const payload = {
      objetivo: formData.objetivo, parcela_id: formData.parcela_id,
      fecha_visita: formData.fecha_visita, fecha_planificada: formData.fecha_planificada,
      observaciones: formData.observaciones
    };
    if (formData.objetivo === 'Plagas y Enfermedades') payload.cuestionario_plagas = cuestionarioPlagas;
    
    if (!navigator.onLine && !editingId) {
      try {
        const parcelaInfo = parcelas.find(p => p._id === formData.parcela_id);
        payload._offlineInfo = { parcelaNombre: parcelaInfo?.codigo_plantacion || 'Parcela', proveedor: parcelaInfo?.proveedor || '', cultivo: parcelaInfo?.cultivo || '' };
        const result = await syncService.saveVisitaOffline(payload);
        if (result.success) {
          setError(null); resetForm(); setShowForm(false);
          alert('Visita guardada localmente. Se sincronizara automaticamente cuando vuelva la conexion.');
        } else { setError('Error al guardar offline: ' + result.error); }
        return;
      } catch (error) { setError('Error al guardar offline'); return; }
    }
    
    try {
      setError(null);
      const url = editingId ? `/api/visitas/${editingId}` : `/api/visitas`;
      const data = editingId ? await api.put(url, payload) : await api.post(url, payload);
      if (data.success) {
        const pendingFotos = fotos.filter(f => f.pending);
        if (!editingId && pendingFotos.length > 0 && data.data?._id) {
          try { await uploadFotos(data.data._id, pendingFotos.map(f => f.file)); } catch (uploadError) { }
        }
        setShowForm(false); setEditingId(null); fetchVisitas(); resetForm();
      }
    } catch (error) {

      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la visita' : 'crear la visita');
      setError(errorMsg); setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (visita) => {
    setEditingId(visita._id);
    setFormData({
      objetivo: visita.objetivo || 'Control Rutinario',
      fecha_visita: visita.fecha_visita || new Date().toISOString().split('T')[0],
      fecha_planificada: visita.fecha_planificada || '',
      parcela_id: visita.parcela_id || '',
      observaciones: visita.observaciones || ''
    });
    if (visita.cuestionario_plagas) {
      setCuestionarioPlagas(visita.cuestionario_plagas);
    } else {
      const initialPlagas = {};
      PLAGAS_ENFERMEDADES.forEach(p => { initialPlagas[p.key] = 0; });
      setCuestionarioPlagas(initialPlagas);
    }
    setFotos(visita.fotos || []);
    setShowForm(true);
  };
  
  const handleCancelEdit = () => { setEditingId(null); setShowForm(false); resetForm(); };
  
  const handleDelete = async (visitaId) => {
    if (!canDelete) { setError('No tienes permisos para eliminar visitas'); setTimeout(() => setError(null), 5000); return; }
    if (!window.confirm('Estas seguro de que quieres eliminar esta visita?')) return;
    try {
      setError(null);
      await api.delete(`/api/visitas/${visitaId}`);
      fetchVisitas();
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'eliminar la visita');
      setError(errorMsg); setTimeout(() => setError(null), 5000);
    }
  };
  
  return (
    <div data-testid="visitas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('visits.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title={t('common.settings')}
            data-testid="btn-config-fields"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
            className="btn btn-primary"
            data-testid="btn-nueva-visita"
          >
            <Plus size={18} />
            {t('visits.newVisit')}
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      <VisitasFieldsConfig
        showFieldsConfig={showFieldsConfig} setShowFieldsConfig={setShowFieldsConfig}
        fieldsConfig={fieldsConfig} toggleFieldConfig={toggleFieldConfig}
        tableConfig={tableConfig} toggleTableConfig={toggleTableConfig}
      />
      
      <VisitasSearchFilters
        filters={filters} setFilters={setFilters}
        filterOptions={filterOptions}
        hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
        filteredCount={filteredVisitas.length} totalCount={visitas.length}
      />
      
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={handleCancelEdit}>
          <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '0', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <VisitasForm
              editingId={editingId} formData={formData} setFormData={setFormData}
              fieldsConfig={fieldsConfig} handleSubmit={handleSubmit} handleCancelEdit={handleCancelEdit}
              parcelas={parcelas} parcelaSearch={parcelaSearch} setParcelaSearch={setParcelaSearch}
              parcelaFilterOptions={parcelaFilterOptions} selectedParcelaInfo={selectedParcelaInfo}
              cuestionarioPlagas={cuestionarioPlagas} setCuestionarioPlagas={setCuestionarioPlagas}
              fotos={fotos} fileInputRef={fileInputRef}
              uploadingFotos={uploadingFotos} uploadError={uploadError}
              handleFileSelect={handleFileSelect} deleteFoto={deleteFoto}
              analyzeFoto={analyzeFoto} analyzeAllFotos={analyzeAllFotos}
              analyzingFoto={analyzingFoto} analyzingAll={analyzingAll}
              setShowAnalysisModal={setShowAnalysisModal}
            />
          </div>
        </div>
      )}
      
      <VisitasTable
        filteredVisitas={filteredVisitas} loading={loading} hasActiveFilters={hasActiveFilters}
        tableConfig={tableConfig} canEdit={canEdit} canDelete={canDelete}
        handleEdit={handleEdit} handleDelete={handleDelete} setViewingVisita={setViewingVisita}
      />
      
      <VisitasDetailModal
        viewingVisita={viewingVisita} setViewingVisita={setViewingVisita}
        canEdit={canEdit} handleEdit={handleEdit}
      />
      
      <VisitasAnalysisModal
        showAnalysisModal={showAnalysisModal} setShowAnalysisModal={setShowAnalysisModal}
      />
    </div>
  );
};

export default Visitas;
