import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AuditHistory from '../components/AuditHistory';
import ContratoFormFields from '../components/contratos/ContratoFormFields';
import ContratoFilters from '../components/contratos/ContratoFilters';
import ContratoTable from '../components/contratos/ContratoTable';
import ContratoColumnConfig from '../components/contratos/ContratoColumnConfig';
import '../App.css';

const parseFormattedNumber = (value) => {
  if (!value && value !== 0) return '';
  return String(value).replace(/\./g, '').replace(',', '.');
};

const DEFAULT_COLUMNS = [
  { id: 'numero', label: 'Numero Contrato', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'campana', label: 'Campana', visible: true },
  { id: 'proveedor_cliente', label: 'Proveedor/Cliente', visible: true },
  { id: 'cultivo', label: 'Cultivo', visible: true },
  { id: 'cantidad', label: 'Cantidad (kg)', visible: true },
  { id: 'precio', label: 'Precio (EUR/kg)', visible: true },
  { id: 'total', label: 'Total (EUR)', visible: true },
  { id: 'fecha', label: 'Fecha', visible: true },
];

const Contratos = () => {
  const navigate = useNavigate();
  const { id: urlId } = useParams();
  const location = useLocation();
  
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [generatingCuaderno, setGeneratingCuaderno] = useState(null);
  const { token, canDoOperacion } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();
  
  const isFormMode = location.pathname.includes('/nuevo') || location.pathname.includes('/editar/');
  const puedeCompra = canDoOperacion('compra');
  const puedeVenta = canDoOperacion('venta');
  
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [filters, setFilters] = useState({ search: '', proveedor: '', cultivo: '', campana: '', tipo: '', fecha_desde: '', fecha_hasta: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnConfig, setColumnConfig] = useState(() => {
    const saved = localStorage.getItem('contratos_column_config');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  
  const initialFormData = {
    numero_contrato: '', tipo: puedeCompra ? 'Compra' : 'Venta', campana: '2025/26', procedencia: 'Campo',
    fecha_contrato: new Date().toISOString().split('T')[0], proveedor_id: '', cliente_id: '', cultivo_id: '',
    cantidad: '', precio: '', periodo_desde: '', periodo_hasta: '', moneda: 'EUR', observaciones: '',
    precios_calidad: [], agente_compra: '', agente_venta: '',
    comision_compra_tipo: 'porcentaje', comision_compra_valor: '',
    comision_venta_tipo: 'porcentaje', comision_venta_valor: '',
    forma_pago: '', forma_cobro: '', descuento_destare: '',
    condiciones_entrega: '', transporte_por_cuenta: '', envases_por_cuenta: '', cargas_granel: false
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [agentesCompra, setAgentesCompra] = useState([]);
  const [agentesVenta, setAgentesVenta] = useState([]);
  
  const selectedCultivo = cultivos.find(c => c._id === formData.cultivo_id);
  const isGuisante = selectedCultivo?.nombre?.toLowerCase().includes('guisante');
  
  useEffect(() => { fetchContratos(); fetchProveedores(); fetchClientes(); fetchCultivos(); fetchAgentes(); }, []);
  
  const fetchAgentes = async () => {
    try {
      const dataC = await api.get('/api/agentes?tipo=compra');
      setAgentesCompra(dataC.agentes || []);
      const dataV = await api.get('/api/agentes?tipo=venta');
      setAgentesVenta(dataV.agentes || []);
    } catch (error) { console.error('Error fetching agentes:', error); }
  };
  const fetchProveedores = async () => {
    try { const data = await api.get('/api/proveedores'); setProveedores(data.proveedores || []); }
    catch (error) { console.error('Error fetching proveedores:', error); }
  };
  const fetchClientes = async () => {
    try { const data = await api.get('/api/clientes'); setClientes(data.clientes || []); }
    catch (error) { console.error('Error fetching clientes:', error); }
  };
  const fetchCultivos = async () => {
    try { const data = await api.get('/api/cultivos'); setCultivos(data.cultivos || []); }
    catch (error) { console.error('Error fetching cultivos:', error); }
  };
  const fetchContratos = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/contratos');
      setContratos(data.contratos || []);
    } catch (error) {
      console.error('Error fetching contratos:', error);
      setError(api.getErrorMessage(error) || t('messages.errorLoading'));
    } finally { setLoading(false); }
  };
  
  const generarNumeroContrato = () => {
    const year = new Date().getFullYear();
    const contratosDelAno = contratos.filter(c => (c.numero_contrato || '').includes(`MP-${year}`));
    return `MP-${year}-${String(contratosDelAno.length + 1).padStart(6, '0')}`;
  };
  
  // Filter logic
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const clearFilters = () => setFilters({ search: '', proveedor: '', cultivo: '', campana: '', tipo: '', fecha_desde: '', fecha_hasta: '' });
  
  const saveColumnConfig = () => {
    localStorage.setItem('contratos_column_config', JSON.stringify(columnConfig));
    setShowColumnConfig(false);
  };
  const resetColumnConfig = () => { setColumnConfig(DEFAULT_COLUMNS); };
  
  const filterOptions = useMemo(() => ({
    proveedores: [...new Set(contratos.map(c => c.proveedor).filter(Boolean))].sort(),
    cultivos: [...new Set(contratos.map(c => c.cultivo).filter(Boolean))].sort(),
    campanas: [...new Set(contratos.map(c => c.campana).filter(Boolean))].sort(),
    tipos: [...new Set(contratos.map(c => c.tipo).filter(Boolean))].sort()
  }), [contratos]);
  
  const filteredContratos = useMemo(() => {
    return contratos.filter(c => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const match = [c.numero_contrato, c.proveedor, c.cliente, c.cultivo, c.campana, c.observaciones]
          .some(f => (f || '').toLowerCase().includes(s));
        if (!match) return false;
      }
      if (filters.proveedor && c.proveedor !== filters.proveedor) return false;
      if (filters.cultivo && c.cultivo !== filters.cultivo) return false;
      if (filters.campana && c.campana !== filters.campana) return false;
      if (filters.tipo && c.tipo !== filters.tipo) return false;
      if (filters.fecha_desde && c.fecha_contrato < filters.fecha_desde) return false;
      if (filters.fecha_hasta && c.fecha_contrato > filters.fecha_hasta) return false;
      return true;
    });
  }, [contratos, filters]);
  
  // Tenderometria handlers
  const addPrecioTenderometria = () => {
    setFormData({ ...formData, precios_calidad: [...(formData.precios_calidad || []), { min_tenderometria: '', max_tenderometria: '', precio: '' }] });
  };
  const updatePrecioTenderometria = (idx, field, value) => {
    const updated = [...(formData.precios_calidad || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData({ ...formData, precios_calidad: updated });
  };
  const removePrecioTenderometria = (idx) => {
    setFormData({ ...formData, precios_calidad: (formData.precios_calidad || []).filter((_, i) => i !== idx) });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        cantidad: parseFloat(parseFormattedNumber(formData.cantidad)) || 0,
        precio: parseFloat(parseFormattedNumber(formData.precio)) || 0,
        comision_compra_valor: formData.comision_compra_valor ? parseFloat(formData.comision_compra_valor) : null,
        comision_venta_valor: formData.comision_venta_valor ? parseFloat(formData.comision_venta_valor) : null,
        descuento_destare: formData.descuento_destare ? parseFloat(formData.descuento_destare) : null,
        precios_calidad: (formData.precios_calidad || []).map(pc => ({
          min_tenderometria: parseFloat(pc.min_tenderometria) || 0,
          max_tenderometria: parseFloat(pc.max_tenderometria) || 0,
          precio: parseFloat(parseFormattedNumber(pc.precio)) || 0
        }))
      };
      const proveedor = proveedores.find(p => p._id === formData.proveedor_id);
      const cliente = clientes.find(c => c._id === formData.cliente_id);
      const cultivo = cultivos.find(c => c._id === formData.cultivo_id);
      if (proveedor) payload.proveedor = proveedor.nombre;
      if (cliente) payload.cliente = cliente.nombre;
      if (cultivo) payload.cultivo = cultivo.nombre;
      
      if (editingId) {
        await api.put(`/api/contratos/${editingId}`, payload);
      } else {
        payload.numero_contrato = generarNumeroContrato();
        await api.post('/api/contratos', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchContratos();
      if (isFormMode) navigate('/contratos');
    } catch (error) {
      if (error.status === 403) { handlePermissionError(error); return; }
      setError(api.getErrorMessage(error) || 'Error al guardar');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (contrato) => {
    setEditingId(contrato._id);
    setFormData({
      numero_contrato: contrato.numero_contrato || '', tipo: contrato.tipo || 'Compra',
      campana: contrato.campana || '2025/26', procedencia: contrato.procedencia || 'Campo',
      fecha_contrato: contrato.fecha_contrato || '', proveedor_id: contrato.proveedor_id || '',
      cliente_id: contrato.cliente_id || '', cultivo_id: contrato.cultivo_id || '',
      cantidad: contrato.cantidad ? String(contrato.cantidad) : '',
      precio: contrato.precio ? String(contrato.precio).replace('.', ',') : '',
      periodo_desde: contrato.periodo_desde || '', periodo_hasta: contrato.periodo_hasta || '',
      moneda: contrato.moneda || 'EUR', observaciones: contrato.observaciones || '',
      precios_calidad: contrato.precios_calidad || [],
      agente_compra: contrato.agente_compra || '', agente_venta: contrato.agente_venta || '',
      comision_compra_tipo: contrato.comision_compra_tipo || 'porcentaje',
      comision_compra_valor: contrato.comision_compra_valor || '',
      comision_venta_tipo: contrato.comision_venta_tipo || 'porcentaje',
      comision_venta_valor: contrato.comision_venta_valor || '',
      forma_pago: contrato.forma_pago || '', forma_cobro: contrato.forma_cobro || '',
      descuento_destare: contrato.descuento_destare || '',
      condiciones_entrega: contrato.condiciones_entrega || '',
      transporte_por_cuenta: contrato.transporte_por_cuenta || '',
      envases_por_cuenta: contrato.envases_por_cuenta || '',
      cargas_granel: contrato.cargas_granel || false
    });
    setShowForm(true);
    if (!isFormMode) navigate(`/contratos/editar/${contrato._id}`);
  };
  
  const handleEditFromUrl = (contrato) => {
    handleEdit(contrato);
  };
  
  const handleNewContrato = () => {
    setEditingId(null);
    setFormData({ ...initialFormData, numero_contrato: generarNumeroContrato() });
    setShowForm(true);
    navigate('/contratos/nuevo');
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData(initialFormData);
    if (isFormMode) navigate('/contratos');
  };
  
  const handleDelete = async (contratoId) => {
    if (!window.confirm(t('messages.confirmDelete'))) return;
    try {
      await api.delete(`/api/contratos/${contratoId}`);
      fetchContratos();
    } catch (error) {
      if (error.status === 403) { handlePermissionError(error); return; }
      setError(api.getErrorMessage(error) || 'Error al eliminar');
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleGenerateCuaderno = async (contratoId) => {
    setGeneratingCuaderno(contratoId);
    setError(null);
    try {
      const data = await api.post(`/api/contratos/${contratoId}/cuaderno`, {});
      if (data.success && data.download_url) {
        window.open(data.download_url, '_blank');
      }
    } catch (error) {
      setError(api.getErrorMessage(error) || t('fieldNotebook.errorGenerating'));
      setTimeout(() => setError(null), 5000);
    } finally { setGeneratingCuaderno(null); }
  };
  
  // URL-based editing
  useEffect(() => {
    if (urlId && contratos.length > 0 && !editingId) {
      const contrato = contratos.find(c => c._id === urlId);
      if (contrato) handleEditFromUrl(contrato);
    }
  }, [urlId, contratos]);
  
  useEffect(() => {
    if (location.pathname.includes('/nuevo') && !editingId && !showForm) {
      setFormData({ ...initialFormData, numero_contrato: generarNumeroContrato() });
      setShowForm(true);
    }
  }, [location.pathname]);
  
  // Shared form props
  const formProps = {
    formData, setFormData, proveedores, clientes, cultivos,
    agentesCompra, agentesVenta, puedeCompra, puedeVenta,
    isGuisante, addPrecioTenderometria, updatePrecioTenderometria,
    removePrecioTenderometria, editingId
  };
  
  // Full-page form mode
  if (isFormMode) {
    return (
      <div data-testid="contratos-form-page">
        <div className="flex justify-between items-center mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleCancelEdit} data-testid="btn-volver-lista">
              <ArrowLeft size={18} /> Volver a la lista
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>
              {editingId ? 'Editar Contrato' : 'Nuevo Contrato'}
            </h1>
          </div>
        </div>
        
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Editar Contrato' : 'Nuevo Contrato'}</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
            <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
              <label className="form-label">Numero de Contrato *</label>
              <input type="text" className="form-input" value={formData.numero_contrato} readOnly
                style={{ backgroundColor: 'hsl(var(--muted))', cursor: 'not-allowed', fontWeight: '600' }} data-testid="input-numero-contrato" />
              <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                {editingId ? 'Este campo no se puede modificar' : 'Se genera automaticamente'}
              </small>
            </div>
            
            <ContratoFormFields {...formProps} />
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-contrato">
                {editingId ? t('common.edit') : t('common.save')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>{t('common.cancel')}</button>
            </div>
          </form>
        </div>
        
        {editingId && <AuditHistory entityType="contratos" entityId={editingId} />}
      </div>
    );
  }
  
  // List view
  return (
    <div data-testid="contratos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('contracts.title')}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn ${showColumnConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowColumnConfig(!showColumnConfig)}
            title="Configurar columnas"
            data-testid="btn-config-contratos"
          >
            <Settings size={18} />
          </button>
          <PermissionButton permission="create" onClick={handleNewContrato} className="btn btn-primary" data-testid="btn-nuevo-contrato">
            <Plus size={18} /> {t('contracts.newContract')}
          </PermissionButton>
        </div>
      </div>
      
      <ContratoColumnConfig
        show={showColumnConfig}
        onClose={() => setShowColumnConfig(false)}
        columns={columnConfig}
        setColumns={setColumnConfig}
        onSave={saveColumnConfig}
        onReset={resetColumnConfig}
      />
      
      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      <ContratoFilters
        filters={filters} setFilters={setFilters}
        showFilters={showFilters} setShowFilters={setShowFilters}
        hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
        filterOptions={filterOptions}
        filteredCount={filteredContratos.length} totalCount={contratos.length}
        token={token}
      />
      
      {showForm && (
        <div className="card mb-6" data-testid="contrato-form">
          <h2 className="card-title">{editingId ? t('common.edit') + ' ' + t('contracts.title') : t('common.new') + ' ' + t('contracts.title')}</h2>
          <form onSubmit={handleSubmit}>
            <ContratoFormFields {...formProps} />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-contrato">
                {editingId ? t('common.edit') : t('common.save')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">{t('contracts.title')}</h2>
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : contratos.length === 0 ? (
          <p className="text-muted">{t('common.noData')}</p>
        ) : (
          <ContratoTable
            contratos={filteredContratos}
            puedeCompra={puedeCompra} puedeVenta={puedeVenta}
            canEdit={canEdit} canDelete={canDelete}
            onEdit={handleEdit} onDelete={handleDelete}
            onGenerateCuaderno={handleGenerateCuaderno}
            generatingCuaderno={generatingCuaderno}
            columnConfig={columnConfig}
          />
        )}
      </div>
    </div>
  );
};

export default Contratos;
