import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Map as MapIcon, Eye, Settings, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GeoImportModal from '../components/GeoImportModal';
import { ParcelasFilters } from '../components/parcelas/ParcelasFilters';
import { ParcelasGeneralMap } from '../components/parcelas/ParcelasGeneralMap';
import { ParcelasForm } from '../components/parcelas/ParcelasForm';
import { ParcelasTable } from '../components/parcelas/ParcelasTable';
import { ParcelasHistorial } from '../components/parcelas/ParcelasHistorial';
import api, { BACKEND_URL } from '../services/api';
import '../App.css';

const DEFAULT_FIELDS_CONFIG = {
  contrato_id: true, codigo_plantacion: true, proveedor: true, finca: true,
  cultivo: true, variedad: true, superficie_total: true, num_plantas: true, campana: true
};

const Parcelas = () => {
  const { t } = useTranslation();
  const [parcelas, setParcelas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [zones, setZones] = useState([]);
  const [showGeneralMap, setShowGeneralMap] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [generatingCuaderno, setGeneratingCuaderno] = useState(null);

  const [showHistorial, setShowHistorial] = useState(false);
  const [historialParcela, setHistorialParcela] = useState(null);
  const [historialData, setHistorialData] = useState(null);
  const [historialLoading, setHistorialLoading] = useState(false);

  const [contratoSearch, setContratoSearch] = useState({ proveedor: '', cultivo: '', campana: '' });
  const [contratoFilterOptions, setContratoFilterOptions] = useState({ proveedores: [], cultivos: [], campanas: [] });

  const [filters, setFilters] = useState({ proveedor: '', cultivo: '', campana: '', codigo_plantacion: '' });
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('parcelas_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  const [filterOptions, setFilterOptions] = useState({ proveedores: [], cultivos: [], campanas: [], parcelas: [] });

  const [formData, setFormData] = useState({
    contrato_id: '', codigo_plantacion: '', proveedor: '', cultivo: '', variedad: '',
    superficie_total: '', num_plantas: '', campana: '', observaciones: '', finca: '',
    sigpac: { provincia: '', municipio: '', poligono: '', parcela: '', cod_agregado: '0', zona: '0', recinto: '1', cod_uso: '' }
  });

  const [sigpacLoading, setSigpacLoading] = useState(false);
  const [sigpacResult, setSigpacResult] = useState(null);
  const [sigpacError, setSigpacError] = useState(null);
  const [provincias, setProvincias] = useState([]);
  const [showGeoImport, setShowGeoImport] = useState(false);
  const [fincas, setFincas] = useState([]);
  const [cultivos, setCultivos] = useState([]);

  useEffect(() => {
    fetchParcelas();
    fetchContratos();
    fetchProvincias();
    fetchFincas();
    fetchCultivos();
  }, []);

  const fetchProvincias = async () => {
    try {
      const data = await api.get('/api/sigpac/provincias');
      if (data.success) setProvincias(data.provincias);
    } catch (err) { console.error('Error fetching provincias:', err); }
  };

  const fetchFincas = async () => {
    try {
      const data = await api.get('/api/fincas');
      setFincas(data.fincas || []);
    } catch (err) { console.error('Error fetching fincas:', err); }
  };

  const fetchCultivos = async () => {
    try {
      const data = await api.get('/api/cultivos');
      setCultivos(data.cultivos || []);
    } catch (err) { console.error('Error fetching cultivos:', err); }
  };

  const generarCodigoPlantacion = useCallback(() => {
    const proveedor = formData.proveedor || 'PRV';
    const cultivo = formData.cultivo || 'CUL';
    const campana = formData.campana || '2025/26';
    const proveedorCode = proveedor.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const cultivoCode = cultivo.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const yearCode = campana.split('/')[0].slice(-2);
    const prefix = `${proveedorCode}-${cultivoCode}-${yearCode}`;
    const existingCount = parcelas.filter(p => p.codigo_plantacion && p.codigo_plantacion.startsWith(prefix)).length;
    return `${prefix}-${String(existingCount + 1).padStart(3, '0')}`;
  }, [formData.proveedor, formData.cultivo, formData.campana, parcelas]);

  const getVariedadesParaCultivo = useCallback(() => {
    if (!formData.cultivo) return [];
    const cultivoObj = cultivos.find(c => c.nombre?.toLowerCase() === formData.cultivo.toLowerCase());
    return cultivoObj?.variedades || [];
  }, [formData.cultivo, cultivos]);

  useEffect(() => {
    if (formData.contrato_id) {
      const contrato = contratos.find(c => c._id === formData.contrato_id);
      if (contrato) {
        setFormData(prev => ({
          ...prev,
          proveedor: contrato.proveedor || prev.proveedor,
          cultivo: contrato.cultivo || prev.cultivo,
          variedad: contrato.variedad || prev.variedad,
          campana: contrato.campana || prev.campana
        }));
      }
    }
  }, [formData.contrato_id, contratos]);

  useEffect(() => {
    if (!editingId) {
      const codigo = generarCodigoPlantacion();
      setFormData(prev => ({ ...prev, codigo_plantacion: codigo }));
    }
  }, [formData.proveedor, formData.cultivo, formData.campana, editingId, generarCodigoPlantacion]);

  const updateSigpac = (field, value) => {
    setFormData(prev => ({ ...prev, sigpac: { ...prev.sigpac, [field]: value } }));
    setSigpacResult(null);
    setSigpacError(null);
  };

  const buscarEnSigpac = async () => {
    const { provincia, municipio, poligono, parcela } = formData.sigpac;
    if (!provincia || !municipio || !poligono || !parcela) {
      setSigpacError('Completa al menos Provincia, Municipio, Polígono y Parcela');
      return;
    }
    setSigpacLoading(true);
    setSigpacError(null);
    setSigpacResult(null);
    try {
      const params = new URLSearchParams({
        provincia, municipio, poligono, parcela,
        cod_agregado: formData.sigpac.cod_agregado || '0',
        zona: formData.sigpac.zona || '0',
        recinto: formData.sigpac.recinto || '1'
      });
      const data = await api.get(`/api/sigpac/parcela?${params.toString()}`);
      if (data.success && data.parcela) {
        setSigpacResult(data.parcela);
        if (data.parcela.geometria) {
          const coords = data.parcela.geometria.coordinates;
          if (coords && coords[0]) {
            const leafletCoords = coords[0].map(c => ({ lat: c[1], lng: c[0] }));
            setZones([leafletCoords]);
          }
        }
        if (data.parcela.superficie_ha) {
          setFormData(prev => ({ ...prev, superficie_total: data.parcela.superficie_ha.toFixed(4) }));
        }
        if (data.parcela.uso_sigpac) {
          updateSigpac('cod_uso', data.parcela.uso_sigpac);
        }
      } else {
        setSigpacError('Parcela no encontrada en SIGPAC');
      }
    } catch (err) {
      setSigpacError(api.getErrorMessage(err));
    } finally {
      setSigpacLoading(false);
    }
  };

  const fetchHistorialTratamientos = async (parcela) => {
    setShowHistorial(true);
    setHistorialParcela(parcela);
    setHistorialLoading(true);
    try {
      const data = await api.get(`/api/parcelas/${parcela._id}/historial-tratamientos`);
      setHistorialData(data);
    } catch (err) {
      console.error('Error fetching historial:', err);
      setHistorialData(null);
    } finally {
      setHistorialLoading(false);
    }
  };

  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/parcelas');
      setParcelas(data.parcelas || []);
      const p = data.parcelas || [];
      setFilterOptions({
        proveedores: [...new Set(p.map(x => x.proveedor).filter(Boolean))],
        cultivos: [...new Set(p.map(x => x.cultivo).filter(Boolean))],
        campanas: [...new Set(p.map(x => x.campana).filter(Boolean))],
        parcelas: [...new Set(p.map(x => x.codigo_plantacion).filter(Boolean))]
      });
    } catch (err) { console.error('Error:', err); } finally { setLoading(false); }
  };

  const fetchContratos = async () => {
    try {
      const data = await api.get('/api/contratos');
      const c = data.contratos || [];
      setContratos(c);
      setContratoFilterOptions({
        proveedores: [...new Set(c.map(x => x.proveedor).filter(Boolean))],
        cultivos: [...new Set(c.map(x => x.cultivo).filter(Boolean))],
        campanas: [...new Set(c.map(x => x.campana).filter(Boolean))]
      });
    } catch (err) { console.error('Error:', err); }
  };

  const clearFilters = () => setFilters({ proveedor: '', cultivo: '', campana: '', codigo_plantacion: '' });
  const toggleFieldConfig = (field) => {
    const newConfig = { ...fieldsConfig, [field]: !fieldsConfig[field] };
    setFieldsConfig(newConfig);
    localStorage.setItem('parcelas_fields_config', JSON.stringify(newConfig));
  };

  const filteredParcelas = parcelas.filter(p => {
    if (filters.proveedor && p.proveedor !== filters.proveedor) return false;
    if (filters.cultivo && p.cultivo !== filters.cultivo) return false;
    if (filters.campana && p.campana !== filters.campana) return false;
    if (filters.codigo_plantacion && p.codigo_plantacion !== filters.codigo_plantacion) return false;
    return true;
  });

  const handleZonesChanged = useCallback((newZones) => {
    setZones(newZones);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const recintos = zones.filter(z => z && z.length >= 3).map(z => ({ geometria: z }));
    const payload = {
      ...formData,
      superficie_total: parseFloat(formData.superficie_total) || 0,
      num_plantas: parseInt(formData.num_plantas) || 0,
      recintos: recintos.length > 0 ? recintos : undefined
    };
    try {
      if (editingId) {
        await api.put(`/api/parcelas/${editingId}`, payload);
      } else {
        await api.post('/api/parcelas', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setZones([]);
      setFormData({
        contrato_id: '', codigo_plantacion: '', proveedor: '', cultivo: '', variedad: '',
        superficie_total: '', num_plantas: '', campana: '', observaciones: '', finca: '',
        sigpac: { provincia: '', municipio: '', poligono: '', parcela: '', cod_agregado: '0', zona: '0', recinto: '1', cod_uso: '' }
      });
      setContratoSearch({ proveedor: '', cultivo: '', campana: '' });
      setSigpacResult(null);
      setSigpacError(null);
      fetchParcelas();
    } catch (err) { alert('Error: ' + api.getErrorMessage(err)); }
  };

  const handleEdit = (parcela) => {
    setEditingId(parcela._id);
    setShowForm(true);
    setFormData({
      contrato_id: parcela.contrato_id || '',
      codigo_plantacion: parcela.codigo_plantacion || '',
      proveedor: parcela.proveedor || '',
      cultivo: parcela.cultivo || '',
      variedad: parcela.variedad || '',
      superficie_total: parcela.superficie_total || '',
      num_plantas: parcela.num_plantas || '',
      campana: parcela.campana || '',
      observaciones: parcela.observaciones || '',
      finca: parcela.finca || '',
      sigpac: parcela.sigpac || { provincia: '', municipio: '', poligono: '', parcela: '', cod_agregado: '0', zona: '0', recinto: '1', cod_uso: '' }
    });
    if (parcela.recintos && parcela.recintos.length > 0) {
      setZones(parcela.recintos.map(r => r.geometria || r));
    } else if (parcela.geometria) {
      setZones([parcela.geometria]);
    } else {
      setZones([]);
    }
    setSigpacResult(null);
    setSigpacError(null);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setZones([]);
    setContratoSearch({ proveedor: '', cultivo: '', campana: '' });
    setFormData({
      contrato_id: '', codigo_plantacion: '', proveedor: '', cultivo: '', variedad: '',
      superficie_total: '', num_plantas: '', campana: '', observaciones: '', finca: '',
      sigpac: { provincia: '', municipio: '', poligono: '', parcela: '', cod_agregado: '0', zona: '0', recinto: '1', cod_uso: '' }
    });
    setSigpacResult(null);
    setSigpacError(null);
  };

  const handleDelete = async (parcelaId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta parcela?')) return;
    try {
      await api.delete(`/api/parcelas/${parcelaId}`);
      fetchParcelas();
    } catch (err) { alert('Error: ' + api.getErrorMessage(err)); }
  };

  const handleGenerateCuaderno = async (parcelaId, campana) => {
    setGeneratingCuaderno(parcelaId);
    try {
      await api.post(`/api/cuaderno-campo/generar/${parcelaId}`, { campana });
      fetchParcelas();
    } catch (err) { alert('Error: ' + api.getErrorMessage(err)); } finally { setGeneratingCuaderno(null); }
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div data-testid="parcelas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Parcelas</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${showGeneralMap ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowGeneralMap(!showGeneralMap)} data-testid="btn-general-map">
            <Eye size={18} /> {showGeneralMap ? 'Ocultar Mapa' : 'Ver Mapa'}
          </button>
          <button className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)} data-testid="btn-config-fields">
            <Settings size={18} />
          </button>
          <button className="btn btn-secondary" onClick={() => setShowGeoImport(true)} data-testid="btn-import-geo">
            <Upload size={18} /> Importar KML/GeoJSON
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} data-testid="btn-nueva-parcela">
            <Plus size={18} /> Nueva Parcela
          </button>
        </div>
      </div>

      <ParcelasGeneralMap filteredParcelas={filteredParcelas} showGeneralMap={showGeneralMap} />

      <ParcelasFilters
        filters={filters} setFilters={setFilters} filterOptions={filterOptions}
        hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
        showFieldsConfig={showFieldsConfig} setShowFieldsConfig={setShowFieldsConfig}
        fieldsConfig={fieldsConfig} toggleFieldConfig={toggleFieldConfig}
      />

      {showForm && (
        <ParcelasForm
          editingId={editingId} zones={zones} setZones={setZones}
          handleZonesChanged={handleZonesChanged} handleSubmit={handleSubmit}
          handleCancelEdit={handleCancelEdit} formData={formData} setFormData={setFormData}
          fieldsConfig={fieldsConfig} contratos={contratos} fincas={fincas}
          contratoSearch={contratoSearch} setContratoSearch={setContratoSearch}
          contratoFilterOptions={contratoFilterOptions} getVariedadesParaCultivo={getVariedadesParaCultivo}
          provincias={provincias} sigpacLoading={sigpacLoading} sigpacResult={sigpacResult}
          sigpacError={sigpacError} buscarEnSigpac={buscarEnSigpac} updateSigpac={updateSigpac}
        />
      )}

      <ParcelasTable
        filteredParcelas={filteredParcelas} loading={loading} hasActiveFilters={hasActiveFilters}
        fieldsConfig={fieldsConfig} contratos={contratos} handleEdit={handleEdit}
        handleDelete={handleDelete} handleGenerateCuaderno={handleGenerateCuaderno}
        generatingCuaderno={generatingCuaderno} fetchHistorialTratamientos={fetchHistorialTratamientos}
      />

      <ParcelasHistorial
        showHistorial={showHistorial} setShowHistorial={setShowHistorial}
        historialParcela={historialParcela} historialData={historialData}
        historialLoading={historialLoading}
      />

      <GeoImportModal
        isOpen={showGeoImport}
        onClose={() => setShowGeoImport(false)}
        onImportComplete={() => fetchParcelas()}
      />
    </div>
  );
};

export default Parcelas;
