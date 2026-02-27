import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, FileText, Edit2, Trash2, BookOpen, Loader2, Search, X, Filter } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import '../App.css';

const Contratos = () => {
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
  
  // Permisos de operación
  const puedeCompra = canDoOperacion('compra');
  const puedeVenta = canDoOperacion('venta');
  
  // Estados para catálogos
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    search: '',
    proveedor: '',
    cultivo: '',
    campana: '',
    tipo: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo: puedeCompra ? 'Compra' : 'Venta',  // Compra o Venta según permiso
    campana: '2025/26',
    procedencia: 'Campo',
    fecha_contrato: new Date().toISOString().split('T')[0],
    proveedor_id: '',
    cliente_id: '',
    cultivo_id: '',
    cantidad: '',
    precio: '',
    periodo_desde: '',
    periodo_hasta: '',
    moneda: 'EUR',
    observaciones: '',
    precios_calidad: [],
    agente_compra: '',
    agente_venta: '',
    // Comisión del agente de COMPRA
    comision_compra_tipo: 'porcentaje',
    comision_compra_valor: '',
    // Comisión del agente de VENTA
    comision_venta_tipo: 'porcentaje',
    comision_venta_valor: ''
  });
  
  // Estado para agentes
  const [agentesCompra, setAgentesCompra] = useState([]);
  const [agentesVenta, setAgentesVenta] = useState([]);
  
  // Estado para saber si el cultivo seleccionado es guisante
  const selectedCultivo = cultivos.find(c => c._id === formData.cultivo_id);
  const isGuisante = selectedCultivo?.nombre?.toLowerCase().includes('guisante');
  
  useEffect(() => {
    fetchContratos();
    fetchProveedores();
    fetchClientes();
    fetchCultivos();
    fetchAgentes();
  }, []);
  
  const fetchAgentes = async () => {
    try {
      // Agentes de Compra
      const dataCompra = await api.get('/api/agentes/activos?tipo=Compra');
      setAgentesCompra(dataCompra.agentes || []);
      
      // Agentes de Venta
      const dataVenta = await api.get('/api/agentes/activos?tipo=Venta');
      setAgentesVenta(dataVenta.agentes || []);
    } catch (error) {
      console.error('Error fetching agentes:', error);
    }
  };
  
  const fetchProveedores = async () => {
    try {
      const data = await api.get('/api/proveedores?activo=true');
      setProveedores(data.proveedores || []);
    } catch (error) {
      console.error('Error fetching proveedores:', error);
    }
  };
  
  const fetchClientes = async () => {
    try {
      const data = await api.get('/api/clientes/activos');
      setClientes(data.clientes || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };
  
  const fetchCultivos = async () => {
    try {
      const data = await api.get('/api/cultivos?activo=true');
      setCultivos(data.cultivos || []);
    } catch (error) {
      console.error('Error fetching cultivos:', error);
    }
  };
  
  const fetchContratos = async () => {
    try {
      setError(null);
      const data = await api.get('/api/contratos');
      setContratos(data.contratos || []);
    } catch (error) {
      console.error('Error fetching contratos:', error);
      const errorMsg = handlePermissionError(error, 'ver los contratos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar contratos
  const filteredContratos = useMemo(() => {
    return contratos.filter(contrato => {
      // Filtro de búsqueda general
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          contrato.proveedor?.toLowerCase().includes(searchLower) ||
          contrato.cliente?.toLowerCase().includes(searchLower) ||
          contrato.cultivo?.toLowerCase().includes(searchLower) ||
          contrato.campana?.toLowerCase().includes(searchLower) ||
          contrato.observaciones?.toLowerCase().includes(searchLower) ||
          `${contrato.serie}-${contrato.año}-${contrato.numero}`.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filtro por proveedor
      if (filters.proveedor && contrato.proveedor !== filters.proveedor) return false;
      
      // Filtro por cultivo
      if (filters.cultivo && contrato.cultivo !== filters.cultivo) return false;
      
      // Filtro por campaña
      if (filters.campana && contrato.campana !== filters.campana) return false;
      
      // Filtro por tipo
      if (filters.tipo && contrato.tipo !== filters.tipo) return false;
      
      // Filtro por fecha desde
      if (filters.fecha_desde && contrato.fecha_contrato < filters.fecha_desde) return false;
      
      // Filtro por fecha hasta
      if (filters.fecha_hasta && contrato.fecha_contrato > filters.fecha_hasta) return false;
      
      return true;
    });
  }, [contratos, filters]);
  
  // Opciones únicas para los filtros
  const filterOptions = useMemo(() => ({
    proveedores: [...new Set(contratos.map(c => c.proveedor).filter(Boolean))].sort(),
    cultivos: [...new Set(contratos.map(c => c.cultivo).filter(Boolean))].sort(),
    campanas: [...new Set(contratos.map(c => c.campana).filter(Boolean))].sort(),
    tipos: [...new Set(contratos.map(c => c.tipo).filter(Boolean))]
  }), [contratos]);
  
  const clearFilters = () => {
    setFilters({
      search: '',
      proveedor: '',
      cultivo: '',
      campana: '',
      tipo: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
  };
  
  const hasActiveFilters = filters.search || filters.proveedor || filters.cultivo || 
                           filters.campana || filters.tipo || filters.fecha_desde || filters.fecha_hasta;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `/api/contratos/${editingId}`
        : `/api/contratos`;
      
      // Preparar datos incluyendo precios_calidad si es guisante
      const submitData = {
        ...formData,
        cantidad: parseFloat(formData.cantidad),
        precio: parseFloat(formData.precio),
        comision_valor: formData.comision_valor ? parseFloat(formData.comision_valor) : null,
        precios_calidad: isGuisante ? (formData.precios_calidad || []).map(pc => ({
          ...pc,
          min_tenderometria: parseFloat(pc.min_tenderometria),
          max_tenderometria: parseFloat(pc.max_tenderometria),
          precio: parseFloat(pc.precio)
        })) : []
      };
      
      const data = editingId 
        ? await api.put(url, submitData)
        : await api.post(url, submitData);
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchContratos();
        setFormData({
          tipo: 'Compra',
          campana: '2025/26',
          procedencia: 'Campo',
          fecha_contrato: new Date().toISOString().split('T')[0],
          proveedor_id: '',
          cultivo_id: '',
          cantidad: '',
          precio: '',
          periodo_desde: '',
          periodo_hasta: '',
          moneda: 'EUR',
          observaciones: '',
          precios_calidad: [],
          agente_compra: '',
          agente_venta: '',
          comision_tipo: 'porcentaje',
          comision_valor: ''
        });
      }
    } catch (error) {
      console.error('Error saving contrato:', error);
    }
  };
  
  // Funciones para manejar tabla de precios por tenderometría
  const addPrecioTenderometria = () => {
    setFormData({
      ...formData,
      precios_calidad: [
        ...(formData.precios_calidad || []),
        { min_tenderometria: '', max_tenderometria: '', precio: '', calidad: 'standard' }
      ]
    });
  };
  
  const removePrecioTenderometria = (index) => {
    setFormData({
      ...formData,
      precios_calidad: (formData.precios_calidad || []).filter((_, i) => i !== index)
    });
  };
  
  const updatePrecioTenderometria = (index, field, value) => {
    const updated = [...(formData.precios_calidad || [])];
    updated[index][field] = value;
    setFormData({ ...formData, precios_calidad: updated });
  };
  
  const handleEdit = (contrato) => {
    setEditingId(contrato._id);
    setFormData({
      tipo: contrato.tipo || 'Compra',
      campana: contrato.campana || '2025/26',
      procedencia: contrato.procedencia || 'Campo',
      fecha_contrato: contrato.fecha_contrato || new Date().toISOString().split('T')[0],
      proveedor_id: contrato.proveedor_id || '',
      cliente_id: contrato.cliente_id || '',
      cultivo_id: contrato.cultivo_id || '',
      cantidad: contrato.cantidad || '',
      precio: contrato.precio || '',
      periodo_desde: contrato.periodo_desde || '',
      periodo_hasta: contrato.periodo_hasta || '',
      moneda: contrato.moneda || 'EUR',
      observaciones: contrato.observaciones || '',
      agente_compra: contrato.agente_compra || '',
      agente_venta: contrato.agente_venta || '',
      // Comisiones separadas
      comision_compra_tipo: contrato.comision_compra_tipo || contrato.comision_tipo || 'porcentaje',
      comision_compra_valor: contrato.comision_compra_valor || contrato.comision_valor || '',
      comision_venta_tipo: contrato.comision_venta_tipo || 'porcentaje',
      comision_venta_valor: contrato.comision_venta_valor || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      tipo: 'Compra',
      campana: '2025/26',
      procedencia: 'Campo',
      fecha_contrato: new Date().toISOString().split('T')[0],
      proveedor_id: '',
      cliente_id: '',
      cultivo_id: '',
      cantidad: '',
      precio: '',
      periodo_desde: '',
      periodo_hasta: '',
      moneda: 'EUR',
      observaciones: '',
      precios_calidad: [],
      agente_compra: '',
      agente_venta: '',
      comision_compra_tipo: 'porcentaje',
      comision_compra_valor: '',
      comision_venta_tipo: 'porcentaje',
      comision_venta_valor: ''
    });
  };
  
  const handleDelete = async (contratoId) => {
    if (!canDelete) {
      setError(t('messages.errorDeleting'));
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm(t('messages.confirmDelete'))) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/contratos/${contratoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw { status: response.status, message: data.detail };
      }
      
      fetchContratos();
    } catch (error) {
      console.error('Error deleting contrato:', error);
      const errorMsg = handlePermissionError(error, t('common.delete'));
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Generate Field Notebook (Cuaderno de Campo)
  const handleGenerateCuaderno = async (contratoId) => {
    setGeneratingCuaderno(contratoId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/cuaderno-campo/generar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contrato_id: contratoId,
          include_ai_summary: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error generando cuaderno');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'Cuaderno_Campo.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating cuaderno:', error);
      setError(error.message || t('fieldNotebook.errorGenerating'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setGeneratingCuaderno(null);
    }
  };
  
  return (
    <div data-testid="contratos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('contracts.title')}</h1>
        <PermissionButton
          permission="create"
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          data-testid="btn-nuevo-contrato"
        >
          <Plus size={18} />
          {t('contracts.newContract')}
        </PermissionButton>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Filtros */}
      <div className="card mb-4" data-testid="contratos-filtros">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? '1rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            {/* Búsqueda rápida */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '35px' }}
                placeholder="Buscar contratos..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                data-testid="input-buscar-contratos"
              />
            </div>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              data-testid="btn-toggle-filtros"
            >
              <Filter size={16} />
              Filtros avanzados
              {hasActiveFilters && (
                <span style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {[filters.proveedor, filters.cultivo, filters.campana, filters.tipo, filters.fecha_desde, filters.fecha_hasta].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
          
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={clearFilters}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              data-testid="btn-limpiar-filtros"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
        
        {/* Filtros avanzados */}
        {showFilters && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid hsl(var(--border))'
          }}>
            {/* Filtro por Proveedor */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Proveedor</label>
              <select
                className="form-select"
                value={filters.proveedor}
                onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
                data-testid="select-filtro-proveedor"
              >
                <option value="">Todos</option>
                {filterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            
            {/* Filtro por Cultivo */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Cultivo</label>
              <select
                className="form-select"
                value={filters.cultivo}
                onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
                data-testid="select-filtro-cultivo"
              >
                <option value="">Todos</option>
                {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            {/* Filtro por Campaña */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Campaña</label>
              <select
                className="form-select"
                value={filters.campana}
                onChange={(e) => setFilters({...filters, campana: e.target.value})}
                data-testid="select-filtro-campana"
              >
                <option value="">Todas</option>
                {filterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            {/* Filtro por Tipo */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Tipo</label>
              <select
                className="form-select"
                value={filters.tipo}
                onChange={(e) => setFilters({...filters, tipo: e.target.value})}
                data-testid="select-filtro-tipo"
              >
                <option value="">Todos</option>
                {filterOptions.tipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            {/* Filtro por Fecha Desde */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha Desde</label>
              <input
                type="date"
                className="form-input"
                value={filters.fecha_desde}
                onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
                data-testid="input-filtro-fecha-desde"
              />
            </div>
            
            {/* Filtro por Fecha Hasta */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha Hasta</label>
              <input
                type="date"
                className="form-input"
                value={filters.fecha_hasta}
                onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
                data-testid="input-filtro-fecha-hasta"
              />
            </div>
          </div>
        )}
        
        {/* Resumen de resultados */}
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
          Mostrando <strong>{filteredContratos.length}</strong> de <strong>{contratos.length}</strong> contratos
          {hasActiveFilters && ' (filtrados)'}
        </div>
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="contrato-form">
          <h2 className="card-title">{editingId ? t('common.edit') + ' ' + t('contracts.title') : t('common.new') + ' ' + t('contracts.title')}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-responsive-4">
              <div className="form-group">
                <label className="form-label">Tipo Contrato *</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value, agente_compra: '', agente_venta: ''})}
                  required
                  data-testid="select-tipo-contrato"
                >
                  {puedeCompra && <option value="Compra">Compra</option>}
                  {puedeVenta && <option value="Venta">Venta</option>}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('contracts.campaign')} *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.campana}
                  onChange={(e) => setFormData({...formData, campana: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Procedencia *</label>
                <select
                  className="form-select"
                  value={formData.procedencia}
                  onChange={(e) => setFormData({...formData, procedencia: e.target.value})}
                  required
                >
                  <option value="Campo">Campo</option>
                  <option value="Almacén con tratamiento">Almacén con tratamiento</option>
                  <option value="Almacén sin tratamiento">Almacén sin tratamiento</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('common.date')} *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_contrato}
                  onChange={(e) => setFormData({...formData, fecha_contrato: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {/* Agente según tipo de contrato con selector y comisión */}
            <div style={{ 
              background: 'hsl(var(--muted))', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1rem' 
            }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600' }}>
                Agente {formData.tipo === 'Compra' ? 'de Compra' : 'de Venta'} y Comisión
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                {formData.tipo === 'Compra' ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Agente de Compra</label>
                    <select
                      className="form-select"
                      value={formData.agente_compra}
                      onChange={(e) => setFormData({...formData, agente_compra: e.target.value})}
                      data-testid="select-agente-compra"
                    >
                      <option value="">Sin agente</option>
                      {agentesCompra.map(a => (
                        <option key={a._id} value={a._id}>
                          {a.codigo} - {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Agente de Venta</label>
                    <select
                      className="form-select"
                      value={formData.agente_venta}
                      onChange={(e) => setFormData({...formData, agente_venta: e.target.value})}
                      data-testid="select-agente-venta"
                    >
                      <option value="">Sin agente</option>
                      {agentesVenta.map(a => (
                        <option key={a._id} value={a._id}>
                          {a.codigo} - {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Comisión según tipo de contrato */}
                {formData.tipo === 'Compra' && formData.agente_compra && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tipo Comisión Compra</label>
                      <select
                        className="form-select"
                        value={formData.comision_compra_tipo}
                        onChange={(e) => setFormData({...formData, comision_compra_tipo: e.target.value})}
                        data-testid="select-comision-compra-tipo"
                      >
                        <option value="porcentaje">Porcentaje (%)</option>
                        <option value="euro_kilo">€ por Kilo</option>
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Comisión {formData.comision_compra_tipo === 'porcentaje' ? '(%)' : '(€/kg)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={formData.comision_compra_valor}
                        onChange={(e) => setFormData({...formData, comision_compra_valor: e.target.value})}
                        placeholder={formData.comision_compra_tipo === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 0.05'}
                        data-testid="input-comision-compra-valor"
                      />
                    </div>
                  </>
                )}
                
                {formData.tipo === 'Venta' && formData.agente_venta && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tipo Comisión Venta</label>
                      <select
                        className="form-select"
                        value={formData.comision_venta_tipo}
                        onChange={(e) => setFormData({...formData, comision_venta_tipo: e.target.value})}
                        data-testid="select-comision-venta-tipo"
                      >
                        <option value="porcentaje">Porcentaje (%)</option>
                        <option value="euro_kilo">€ por Kilo</option>
                      </select>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Comisión {formData.comision_venta_tipo === 'porcentaje' ? '(%)' : '(€/kg)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={formData.comision_venta_valor}
                        onChange={(e) => setFormData({...formData, comision_venta_valor: e.target.value})}
                        placeholder={formData.comision_venta_tipo === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 0.05'}
                        data-testid="input-comision-venta-valor"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="grid-2">
              {/* Mostrar Proveedor para Compra o Cliente para Venta */}
              {formData.tipo === 'Compra' ? (
                <div className="form-group">
                  <label className="form-label">{t('contracts.provider')} *</label>
                  <select
                    className="form-select"
                    value={formData.proveedor_id}
                    onChange={(e) => setFormData({...formData, proveedor_id: e.target.value, cliente_id: ''})}
                    required
                    data-testid="select-proveedor"
                  >
                    <option value="">{t('common.selectOption')}...</option>
                    {proveedores.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.nombre} {p.cif_nif ? `(${p.cif_nif})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Cliente *</label>
                  <select
                    className="form-select"
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value, proveedor_id: ''})}
                    required
                    data-testid="select-cliente"
                  >
                    <option value="">{t('common.selectOption')}...</option>
                    {clientes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.nombre} {c.nif ? `(${c.nif})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">{t('contracts.crop')} *</label>
                <select
                  className="form-select"
                  value={formData.cultivo_id}
                  onChange={(e) => setFormData({...formData, cultivo_id: e.target.value})}
                  required
                >
                  <option value="">{t('common.selectOption')}...</option>
                  {cultivos.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.nombre} {c.variedad ? `- ${c.variedad}` : ''} ({c.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{t('common.quantity')} (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">{t('contracts.price')} (€/kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.precio}
                  onChange={(e) => setFormData({...formData, precio: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('contracts.startDate')} *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.periodo_desde}
                  onChange={(e) => setFormData({...formData, periodo_desde: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">{t('contracts.endDate')} *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.periodo_hasta}
                  onChange={(e) => setFormData({...formData, periodo_hasta: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {/* Tabla de Precios por Tenderometría - Solo para Guisante */}
            {isGuisante && (
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #1a5276'
              }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 style={{ margin: 0, color: '#1a5276', fontSize: '1rem', fontWeight: '600' }}>
                    Tabla de Precios por Tenderometría (Guisante)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={addPrecioTenderometria}
                  >
                    <Plus size={14} /> Añadir Rango
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>
                  Define rangos de tenderometría y su precio correspondiente en €/kg
                </p>
                
                {(formData.precios_calidad || []).length === 0 ? (
                  <p style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.85rem' }}>
                    No hay rangos definidos. Se usará el precio base del contrato.
                  </p>
                ) : (
                  <table style={{ width: '100%', fontSize: '0.85rem', backgroundColor: 'white', borderRadius: '4px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1a5276', color: 'white' }}>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Tend. Mínima</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Tend. Máxima</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Precio (€/kg)</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '60px' }}>Eliminar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.precios_calidad || []).map((pc, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '4px' }}>
                            <input
                              type="number"
                              step="1"
                              className="form-input"
                              style={{ textAlign: 'center' }}
                              value={pc.min_tenderometria}
                              onChange={(e) => updatePrecioTenderometria(idx, 'min_tenderometria', e.target.value)}
                              placeholder="Ej: 90"
                            />
                          </td>
                          <td style={{ padding: '4px' }}>
                            <input
                              type="number"
                              step="1"
                              className="form-input"
                              style={{ textAlign: 'center' }}
                              value={pc.max_tenderometria}
                              onChange={(e) => updatePrecioTenderometria(idx, 'max_tenderometria', e.target.value)}
                              placeholder="Ej: 100"
                            />
                          </td>
                          <td style={{ padding: '4px' }}>
                            <input
                              type="number"
                              step="0.01"
                              className="form-input"
                              style={{ textAlign: 'center' }}
                              value={pc.precio}
                              onChange={(e) => updatePrecioTenderometria(idx, 'precio', e.target.value)}
                              placeholder="Ej: 0.45"
                            />
                          </td>
                          <td style={{ padding: '4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                              onClick={() => removePrecioTenderometria(idx)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">{t('common.observations')}</label>
              <textarea
                className="form-textarea"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder={t('common.observations')}
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-contrato">
                {editingId ? t('common.edit') : t('common.save')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                {t('common.cancel')}
              </button>
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
          <div className="table-container">
            <table data-testid="contratos-table">
              <thead>
                <tr>
                  <th>{t('contracts.contractNumber')}</th>
                  <th>Tipo</th>
                  <th>{t('contracts.campaign')}</th>
                  <th>Proveedor/Cliente</th>
                  <th>{t('contracts.crop')}</th>
                  <th>{t('common.quantity')} (kg)</th>
                  <th>{t('contracts.price')} (€/kg)</th>
                  <th>{t('common.total')} (€)</th>
                  <th>{t('common.date')}</th>
                  {(canEdit || canDelete) ? <th>{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredContratos
                  .filter(contrato => {
                    // Filtrar contratos según permiso de operación del usuario
                    const tipoContrato = contrato.tipo || 'Compra';
                    if (puedeCompra && puedeVenta) return true; // Ambos
                    if (puedeCompra && tipoContrato === 'Compra') return true;
                    if (puedeVenta && tipoContrato === 'Venta') return true;
                    return false;
                  })
                  .map((contrato) => (
                  <tr key={contrato._id}>
                    <td className="font-semibold">{contrato.serie}-{contrato.año}-{String(contrato.numero).padStart(3, '0')}</td>
                    <td>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: contrato.tipo === 'Compra' ? '#dbeafe' : '#dcfce7',
                        color: contrato.tipo === 'Compra' ? '#1e40af' : '#166534'
                      }}>
                        {contrato.tipo || 'Compra'}
                      </span>
                    </td>
                    <td>{contrato.campana}</td>
                    <td>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>
                          {contrato.tipo === 'Venta' ? 'Cliente: ' : 'Prov: '}
                        </span>
                        {contrato.tipo === 'Venta' ? (contrato.cliente || '-') : contrato.proveedor}
                      </div>
                    </td>
                    <td>{contrato.cultivo}</td>
                    <td>{contrato.cantidad?.toLocaleString()}</td>
                    <td>€{contrato.precio?.toFixed(2)}</td>
                    <td className="font-semibold">€{((contrato.cantidad || 0) * (contrato.precio || 0)).toFixed(2)}</td>
                    <td>{contrato.fecha_contrato ? new Date(contrato.fecha_contrato).toLocaleDateString() : '-'}</td>
                    {(canEdit || canDelete) ? (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit ? (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(contrato)}
                              title="Editar contrato"
                              data-testid={`edit-contrato-${contrato._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          ) : null}
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleGenerateCuaderno(contrato._id)}
                            title={t('fieldNotebook.generate')}
                            disabled={generatingCuaderno === contrato._id}
                            data-testid={`cuaderno-contrato-${contrato._id}`}
                          >
                            {generatingCuaderno === contrato._id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <BookOpen size={14} />
                            )}
                          </button>
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(contrato._id)}
                              title="Eliminar contrato"
                              data-testid={`delete-contrato-${contrato._id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contratos;