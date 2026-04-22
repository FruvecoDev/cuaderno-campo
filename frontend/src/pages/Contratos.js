import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Settings, Search, X, FileText, Eye, Trash2, Edit2, Download, Users, CreditCard, Package, Truck, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import ContratoFilters from '../components/contratos/ContratoFilters';
import ContratoTable from '../components/contratos/ContratoTable';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import { useBulkSelect, BulkActionBar, bulkDeleteApi } from '../components/BulkActions';
import '../App.css';

const parseFormattedNumber = (value) => {
  if (!value && value !== 0) return '';
  return String(value).replace(/\./g, '').replace(',', '.');
};

const formatNumber = (value) => {
  if (!value && value !== 0) return '';
  const cleanValue = String(value).replace(/[^\d,]/g, '');
  const parts = cleanValue.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
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
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [generatingCuaderno, setGeneratingCuaderno] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [auditHistory, setAuditHistory] = useState([]);
  const { token, canDoOperacion, user } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();

  const puedeCompra = canDoOperacion('compra');
  const puedeVenta = canDoOperacion('venta');
  const canBulkDelete = !!user?.can_bulk_delete;

  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [agentesCompra, setAgentesCompra] = useState([]);
  const [agentesVenta, setAgentesVenta] = useState([]);
  const [filters, setFilters] = useState({ search: '', proveedor: '', cultivo: '', campana: '', tipo: '', fecha_desde: '', fecha_hasta: '' });
  const [showFilters, setShowFilters] = useState(false);
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('contratos_col_config', DEFAULT_COLUMNS);

  // Leer query-param "search" (p.ej. al venir desde Albaranes de Comisión)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setFilters(prev => ({ ...prev, search: q }));
      setShowFilters(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const selectedCultivo = cultivos.find(c => c._id === formData.cultivo_id);
  const isGuisante = selectedCultivo?.nombre?.toLowerCase().includes('guisante');

  useEffect(() => { fetchContratos(); fetchProveedores(); fetchClientes(); fetchCultivos(); fetchAgentes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAgentes = async () => {
    try {
      const dataC = await api.get('/api/agentes?tipo=compra');
      setAgentesCompra(dataC.agentes || []);
      const dataV = await api.get('/api/agentes?tipo=venta');
      setAgentesVenta(dataV.agentes || []);
    } catch (error) {}
  };
  const fetchProveedores = async () => { try { const data = await api.get('/api/proveedores'); setProveedores(data.proveedores || []); } catch (error) {} };
  const fetchClientes = async () => { try { const data = await api.get('/api/clientes'); setClientes(data.clientes || []); } catch (error) {} };
  const fetchCultivos = async () => { try { const data = await api.get('/api/cultivos'); setCultivos(data.cultivos || []); } catch (error) {} };
  const fetchContratos = async () => {
    try { setLoading(true); const data = await api.get('/api/contratos'); setContratos(data.contratos || []); }
    catch (error) { setError(api.getErrorMessage(error) || t('messages.errorLoading')); }
    finally { setLoading(false); }
  };

  const fetchAuditHistory = async (contratoId) => {
    try {
      const data = await api.get(`/api/audit/contratos/${contratoId}`);
      setAuditHistory(data.history || data.audit_history || []);
    } catch (error) { setAuditHistory([]); }
  };

  const generarNumeroContrato = () => {
    const year = new Date().getFullYear();
    const contratosDelAno = contratos.filter(c => (c.numero_contrato || '').includes(`MP-${year}`));
    return `MP-${year}-${String(contratosDelAno.length + 1).padStart(6, '0')}`;
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  const clearFilters = () => setFilters({ search: '', proveedor: '', cultivo: '', campana: '', tipo: '', fecha_desde: '', fecha_hasta: '' });

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

  // Bulk delete (seleccion multiple sobre la pagina visible)
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredContratos.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredContratos.length);
  const paginatedContratos = useMemo(() => filteredContratos.slice(pageStart, pageEnd), [filteredContratos, pageStart, pageEnd]);

  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(paginatedContratos);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await bulkDeleteApi('contratos', selectedIds);
      const r = res?.data ?? res;
      const deleted = new Set(selectedIds);
      setContratos(prev => prev.filter(c => !deleted.has(c._id)));
      clearSelection();
      if (r?.deleted_count != null) {
        window.alert(`${r.deleted_count} contrato${r.deleted_count > 1 ? 's' : ''} eliminado${r.deleted_count > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Error al eliminar masivamente');
    } finally {
      setBulkDeleting(false);
    }
  };

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
      closeModal();
      fetchContratos();
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
    setActiveTab('general');
    setShowForm(true);
  };

  const handleNewContrato = () => {
    setEditingId(null);
    setFormData({ ...initialFormData, numero_contrato: generarNumeroContrato() });
    setActiveTab('general');
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setActiveTab('general');
    setAuditHistory([]);
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
      await api.downloadWithPost(`/api/contratos/${contratoId}/cuaderno`, {}, `cuaderno_campo_${contratoId}.pdf`);
    } catch (error) {
      setError(api.getErrorMessage(error) || t('fieldNotebook.errorGenerating'));
      setTimeout(() => setError(null), 5000);
    } finally { setGeneratingCuaderno(null); }
  };

  return (
    <div data-testid="contratos-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('contracts.title')}</h1>
          <p className="text-muted">Gestiona contratos de compra y venta</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-contratos"><Settings size={18} /></button>
          <PermissionButton permission="create" onClick={handleNewContrato} className="btn btn-primary" data-testid="btn-nuevo-contrato">
            <Plus size={18} /> {t('contracts.newContract')}
          </PermissionButton>
        </div>
      </div>

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

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

      {/* Professional Tabbed Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={closeModal}>
          <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
                <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Contrato</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{formData.numero_contrato}</span></div>
              </div>
              <button onClick={closeModal} className="config-modal-close-btn"><X size={18} /></button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'general', label: 'Datos Generales', icon: <FileText size={14} /> },
                { key: 'precios', label: 'Precios y Cantidades', icon: <CreditCard size={14} /> },
                { key: 'condiciones', label: 'Condiciones', icon: <Truck size={14} /> },
                { key: 'historial', label: 'Historial', icon: <Eye size={14} /> }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); if (tab.key === 'historial' && editingId) fetchAuditHistory(editingId); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: activeTab === tab.key ? '700' : '500', color: activeTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
              {activeTab === 'general' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificacion del Contrato</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Numero Contrato</label><input type="text" className="form-input" value={formData.numero_contrato} readOnly style={{ backgroundColor: 'hsl(var(--muted))', fontWeight: '600', fontSize: '0.85rem' }} data-testid="input-numero-contrato" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tipo Contrato *</label><select className="form-input" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value, agente_compra: '', agente_venta: '' })} required data-testid="select-tipo-contrato">{puedeCompra && <option value="Compra">Compra</option>}{puedeVenta && <option value="Venta">Venta</option>}</select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Campana *</label><input type="text" className="form-input" value={formData.campana} onChange={e => setFormData({ ...formData, campana: e.target.value })} required /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fecha *</label><input type="date" className="form-input" value={formData.fecha_contrato} onChange={e => setFormData({ ...formData, fecha_contrato: e.target.value })} required /></div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Partes del Contrato</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {formData.tipo === 'Compra' ? (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Proveedor</label><select className="form-input" value={formData.proveedor_id} onChange={e => setFormData({ ...formData, proveedor_id: e.target.value, cliente_id: '' })} data-testid="select-proveedor"><option value="">-- Seleccionar --</option>{proveedores.map(p => <option key={p._id} value={p._id}>{p.nombre} {p.cif_nif ? `(${p.cif_nif})` : ''}</option>)}</select></div>
                    ) : (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Cliente</label><select className="form-input" value={formData.cliente_id} onChange={e => setFormData({ ...formData, cliente_id: e.target.value, proveedor_id: '' })} data-testid="select-cliente"><option value="">-- Seleccionar --</option>{clientes.map(c => <option key={c._id} value={c._id}>{c.nombre} {c.nif ? `(${c.nif})` : ''}</option>)}</select></div>
                    )}
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Cultivo</label><select className="form-input" value={formData.cultivo_id} onChange={e => setFormData({ ...formData, cultivo_id: e.target.value })}><option value="">-- Seleccionar --</option>{cultivos.map(c => <option key={c._id} value={c._id}>{c.nombre} {c.variedad ? `- ${c.variedad}` : ''}</option>)}</select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Procedencia</label><select className="form-input" value={formData.procedencia} onChange={e => setFormData({ ...formData, procedencia: e.target.value })}><option value="Campo">Campo</option><option value="Almacen con tratamiento">Almacen con tratamiento</option><option value="Almacen sin tratamiento">Almacen sin tratamiento</option></select></div>
                  </div>
                </div>
                <div style={{ background: 'hsl(var(--muted)/0.3)', borderRadius: '8px', padding: '1rem', border: '1px solid hsl(var(--border))' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Agente {formData.tipo === 'Compra' ? 'de Compra' : 'de Venta'} y Comision</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                    {formData.tipo === 'Compra' ? (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Agente de Compra</label><select className="form-input" value={formData.agente_compra} onChange={e => setFormData({ ...formData, agente_compra: e.target.value })} data-testid="select-agente-compra"><option value="">Sin agente</option>{agentesCompra.map(a => <option key={a._id} value={a._id}>{a.codigo} - {a.nombre}</option>)}</select></div>
                    ) : (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Agente de Venta</label><select className="form-input" value={formData.agente_venta} onChange={e => setFormData({ ...formData, agente_venta: e.target.value })} data-testid="select-agente-venta"><option value="">Sin agente</option>{agentesVenta.map(a => <option key={a._id} value={a._id}>{a.codigo} - {a.nombre}</option>)}</select></div>
                    )}
                    {formData.tipo === 'Compra' && formData.agente_compra && (<>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tipo Comision</label><select className="form-input" value={formData.comision_compra_tipo} onChange={e => setFormData({ ...formData, comision_compra_tipo: e.target.value })}><option value="porcentaje">Porcentaje (%)</option><option value="euro_kilo">EUR por Kilo</option></select></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Valor Comision</label><input type="number" step="0.01" min="0" className="form-input" value={formData.comision_compra_valor} onChange={e => setFormData({ ...formData, comision_compra_valor: e.target.value })} placeholder={formData.comision_compra_tipo === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 0.05'} /></div>
                    </>)}
                    {formData.tipo === 'Venta' && formData.agente_venta && (<>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tipo Comision</label><select className="form-input" value={formData.comision_venta_tipo} onChange={e => setFormData({ ...formData, comision_venta_tipo: e.target.value })}><option value="porcentaje">Porcentaje (%)</option><option value="euro_kilo">EUR por Kilo</option></select></div>
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Valor Comision</label><input type="number" step="0.01" min="0" className="form-input" value={formData.comision_venta_valor} onChange={e => setFormData({ ...formData, comision_venta_valor: e.target.value })} placeholder={formData.comision_venta_tipo === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 0.05'} /></div>
                    </>)}
                  </div>
                </div>
              </div>)}

              {activeTab === 'precios' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Cantidades y Precios</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Cantidad (kg) *</label><input type="text" className="form-input" value={formatNumber(formData.cantidad)} onChange={e => { const rawValue = e.target.value.replace(/\./g, ''); if (/^\d*$/.test(rawValue)) setFormData({ ...formData, cantidad: rawValue }); }} placeholder="Ej: 1.000" required /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Precio (EUR/kg) *</label><input type="text" className="form-input" value={formatNumber(formData.precio)} onChange={e => { const rawValue = e.target.value.replace(/\./g, ''); if (/^\d*,?\d*$/.test(rawValue)) setFormData({ ...formData, precio: rawValue }); }} placeholder="Ej: 1,50" required /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Moneda</label><select className="form-input" value={formData.moneda} onChange={e => setFormData({ ...formData, moneda: e.target.value })}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select></div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Periodo de Entrega</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Desde *</label><input type="date" className="form-input" value={formData.periodo_desde} onChange={e => setFormData({ ...formData, periodo_desde: e.target.value })} required /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Hasta *</label><input type="date" className="form-input" value={formData.periodo_hasta} onChange={e => setFormData({ ...formData, periodo_hasta: e.target.value })} required /></div>
                  </div>
                </div>
                {/* Tenderometria para Guisante */}
                {isGuisante && (
                  <div style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '8px', border: '1px solid #1a5276' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, color: '#1a5276', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Precios por Tenderometria (Guisante)</h3>
                      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1a5276', fontWeight: '600', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={addPrecioTenderometria}><Plus size={14} /> Anadir Rango</button>
                    </div>
                    {(formData.precios_calidad || []).length === 0 ? (
                      <p style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.85rem' }}>No hay rangos definidos. Se usara el precio base.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {(formData.precios_calidad || []).map((pc, idx) => (
                          <div key={`tend-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center', background: 'white', padding: '0.5rem', borderRadius: '6px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Tend. Min</label><input type="number" step="1" className="form-input" style={{ textAlign: 'center', fontSize: '0.85rem' }} value={pc.min_tenderometria} onChange={e => updatePrecioTenderometria(idx, 'min_tenderometria', e.target.value)} placeholder="90" /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Tend. Max</label><input type="number" step="1" className="form-input" style={{ textAlign: 'center', fontSize: '0.85rem' }} value={pc.max_tenderometria} onChange={e => updatePrecioTenderometria(idx, 'max_tenderometria', e.target.value)} placeholder="100" /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '600' }}>Precio EUR/kg</label><input type="number" step="0.01" className="form-input" style={{ textAlign: 'center', fontSize: '0.85rem' }} value={pc.precio} onChange={e => updatePrecioTenderometria(idx, 'precio', e.target.value)} placeholder="0.45" /></div>
                            <button type="button" onClick={() => removePrecioTenderometria(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem', marginTop: '1.2rem' }}><X size={15} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>)}

              {activeTab === 'condiciones' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Condiciones Comerciales</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {formData.tipo === 'Compra' ? (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Forma de Pago</label><select className="form-input" value={formData.forma_pago} onChange={e => setFormData({ ...formData, forma_pago: e.target.value })} data-testid="select-forma-pago"><option value="">-- Seleccionar --</option><option value="Contado">Contado</option><option value="30 dias">30 dias</option><option value="60 dias">60 dias</option><option value="90 dias">90 dias</option><option value="Transferencia">Transferencia</option><option value="Pagare">Pagare</option></select></div>
                    ) : (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Forma de Cobro</label><select className="form-input" value={formData.forma_cobro} onChange={e => setFormData({ ...formData, forma_cobro: e.target.value })} data-testid="select-forma-cobro"><option value="">-- Seleccionar --</option><option value="Contado">Contado</option><option value="30 dias">30 dias</option><option value="60 dias">60 dias</option><option value="90 dias">90 dias</option><option value="Transferencia">Transferencia</option><option value="Pagare">Pagare</option></select></div>
                    )}
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Condiciones Entrega</label><select className="form-input" value={formData.condiciones_entrega} onChange={e => setFormData({ ...formData, condiciones_entrega: e.target.value })} data-testid="select-condiciones-entrega"><option value="">-- Seleccionar --</option><option value="FCA">FCA</option><option value="DDP">DDP</option><option value="EXW">EXW</option><option value="FOB">FOB</option><option value="CFR">CFR</option></select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Transporte por cuenta</label><select className="form-input" value={formData.transporte_por_cuenta} onChange={e => setFormData({ ...formData, transporte_por_cuenta: e.target.value })} data-testid="select-transporte"><option value="">-- Seleccionar --</option><option value="Empresa">Empresa</option><option value="Proveedor">Proveedor</option><option value="Cliente">Cliente</option></select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Envases por cuenta</label><select className="form-input" value={formData.envases_por_cuenta} onChange={e => setFormData({ ...formData, envases_por_cuenta: e.target.value })} data-testid="select-envases"><option value="">-- Seleccionar --</option><option value="Empresa">Empresa</option><option value="Proveedor">Proveedor</option><option value="Cliente">Cliente</option></select></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem' }}>
                    {formData.tipo === 'Compra' && (
                      <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Descuento Destare (%)</label><input type="number" step="0.5" min="0" max="100" className="form-input" value={formData.descuento_destare} onChange={e => setFormData({ ...formData, descuento_destare: e.target.value })} placeholder="Ej: 2.5" /></div>
                    )}
                    <div style={{ paddingTop: '1.5rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.cargas_granel ? 'hsl(var(--primary)/0.1)' : 'hsl(var(--muted))', border: '1px solid ' + (formData.cargas_granel ? 'hsl(var(--primary)/0.3)' : 'hsl(var(--border))') }}><input type="checkbox" checked={formData.cargas_granel} onChange={e => setFormData({ ...formData, cargas_granel: e.target.checked })} style={{ width: '16px', height: '16px' }} data-testid="checkbox-granel" /><span style={{ fontWeight: '600', fontSize: '0.85rem', color: formData.cargas_granel ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>Cargas a Granel</span></label></div>
                  </div>
                </div>
                <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="3" value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} style={{ fontSize: '0.85rem', resize: 'vertical' }} placeholder="Observaciones del contrato..." /></div>
              </div>)}

              {activeTab === 'historial' && (<div>
                <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>Log de Cambios</h3>
                {!editingId ? <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><Eye size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} /><p style={{ fontSize: '0.85rem' }}>El historial estara disponible una vez guardado el contrato</p></div> : auditHistory.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted)/0.3)', borderRadius: '8px' }}><p style={{ fontSize: '0.85rem' }}>Sin cambios registrados</p></div> :
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {auditHistory.map((entry, idx) => (<div key={entry._id || idx} style={{ borderLeft: '3px solid ' + (entry.action === 'create' ? 'hsl(142 76% 36%)' : entry.action === 'delete' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'), padding: '0.75rem 1rem', marginBottom: '0.75rem', background: 'hsl(var(--muted)/0.2)', borderRadius: '0 8px 8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', backgroundColor: entry.action === 'create' ? 'hsl(142 76% 36%/0.1)' : entry.action === 'delete' ? 'hsl(var(--destructive)/0.1)' : 'hsl(var(--primary)/0.1)', color: entry.action === 'create' ? 'hsl(142 76% 36%)' : entry.action === 'delete' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}>{entry.action}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{entry.user_name || entry.user_email || ''}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{entry.timestamp ? new Date(entry.timestamp).toLocaleString('es-ES') : ''}</span>
                    </div>
                    {entry.changes && entry.changes.length > 0 && <div style={{ marginTop: '0.4rem' }}>{entry.changes.map((ch, ci) => (<div key={ci} style={{ fontSize: '0.8rem', padding: '0.2rem 0', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}><span style={{ fontWeight: '600', minWidth: '120px' }}>{ch.field}:</span>{ch.old_value && <span style={{ color: 'hsl(var(--destructive))', textDecoration: 'line-through' }}>{String(ch.old_value).substring(0, 80)}</span>}<span style={{ color: 'hsl(142 76% 36%)' }}>{String(ch.new_value || '').substring(0, 80)}</span></div>))}</div>}
                  </div>))}
                </div>}
              </div>)}

              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button><button type="submit" className="btn btn-primary" data-testid="btn-guardar-contrato">{editingId ? 'Actualizar' : 'Crear'} Contrato</button></div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t('contracts.title')}</h2>
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : contratos.length === 0 ? (
          <p className="text-muted">{t('common.noData')}</p>
        ) : (
          <>
            {canBulkDelete && (
              <BulkActionBar
                selectedCount={selectedIds.size}
                onDelete={handleBulkDelete}
                onClear={clearSelection}
                deleting={bulkDeleting}
              />
            )}
            <ContratoTable
              contratos={paginatedContratos}
              puedeCompra={puedeCompra} puedeVenta={puedeVenta}
              canEdit={canEdit} canDelete={canDelete}
              onEdit={handleEdit} onDelete={handleDelete}
              onGenerateCuaderno={handleGenerateCuaderno}
              generatingCuaderno={generatingCuaderno}
              columnConfig={columns}
              canBulkDelete={canBulkDelete}
              selectedIds={selectedIds}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              allSelected={allSelected}
              someSelected={someSelected}
            />

            {/* Pagination footer */}
            {filteredContratos.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.25rem', marginTop: '0.75rem', borderTop: '1px solid hsl(var(--border))', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', flexWrap: 'wrap' }}>
                  <span>Mostrando <b>{pageStart + 1}-{pageEnd}</b> de <b>{filteredContratos.length}</b></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Filas:
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                      data-testid="select-page-size-contratos"
                      style={{ padding: '0.2rem 0.35rem', borderRadius: '6px', border: '1px solid hsl(var(--border))', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {[10, 25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(1)} disabled={page === 1} title="Primera" data-testid="pag-first-contratos">
                    <ChevronsLeft size={14} />
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Anterior" data-testid="pag-prev-contratos">
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: '0.8rem', padding: '0 0.5rem', whiteSpace: 'nowrap' }}>
                    Página <b>{page}</b> / {totalPages}
                  </span>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} title="Siguiente" data-testid="pag-next-contratos">
                    <ChevronRight size={14} />
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última" data-testid="pag-last-contratos">
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Contratos;
