import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Download, FileText, Edit2, Trash2, BookOpen, Loader2, Search, X, Filter, ArrowLeft } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import AuditHistory from '../components/AuditHistory';
import '../App.css';

// Función para formatear números con separadores de miles (formato español)
const formatNumber = (value) => {
  if (!value && value !== 0) return '';
  // Eliminar caracteres no numéricos excepto coma decimal
  const cleanValue = String(value).replace(/[^\d,]/g, '');
  // Separar parte entera y decimal
  const parts = cleanValue.split(',');
  // Formatear parte entera con puntos de miles
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

// Función para formatear moneda en formato español (punto miles, coma decimal)
const formatCurrency = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

// Función para parsear número formateado a número real
const parseFormattedNumber = (value) => {
  if (!value && value !== 0) return '';
  // Quitar puntos de miles y cambiar coma por punto para decimales
  return String(value).replace(/\./g, '').replace(',', '.');
};

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
  
  // Determinar si estamos en modo formulario por la URL
  const isFormMode = location.pathname.includes('/nuevo') || location.pathname.includes('/editar/');
  
  // Permisos de operación
  
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
    numero_contrato: '',
    tipo: puedeCompra ? 'Compra' : 'Venta',  // Compra o Venta según permiso
    campana: '2025/26',
    procedencia: 'Campo',
    fecha_contrato: new Date().toISOString().split('T')[0],
    proveedor_id: '',
    cliente_id: '',
    cultivo_id: '',
    cantidad: '',
    precio: '',
    superficie_ha: '', // Superficie contratada en hectáreas
    periodo_desde: '',
    periodo_hasta: '',
    moneda: 'EUR',
    observaciones: '',
    precios_calidad: [],
    // Agente y comisiones
    agente_compra: '',
    agente_venta: '',
    comision_compra_tipo: 'porcentaje',  // 'porcentaje' o 'euro_kilo'
    comision_compra_valor: '',
    comision_venta_tipo: 'porcentaje',   // 'porcentaje' o 'euro_kilo'
    comision_venta_valor: '',
    // Forma de pago/cobro
    forma_pago: '',      // Para contratos de compra
    forma_cobro: '',     // Para contratos de venta
    // Descuento destare (solo compras)
    descuento_destare: '', // Porcentaje que se aplica a los kilos
    // Nuevos campos de condiciones
    condiciones_entrega: '',  // FCA, DDP, EXW, FOB, CFR
    transporte_por_cuenta: '', // Empresa, Proveedor o Cliente
    envases_por_cuenta: '',    // Empresa, Proveedor o Cliente
    cargas_granel: false       // true/false
  });
  
  // Generar número de contrato automático
  const generarNumeroContrato = () => {
    const year = new Date().getFullYear();
    // Contar contratos existentes para generar número secuencial
    const contratosDelAno = contratos.filter(c => {
      const num = c.numero_contrato || '';
      return num.includes(`MP-${year}`);
    });
    const siguiente = contratosDelAno.length + 1;
    return `MP-${year}-${String(siguiente).padStart(6, '0')}`;
  };
  
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
        cantidad: parseFloat(parseFormattedNumber(formData.cantidad)) || 0,
        precio: parseFloat(parseFormattedNumber(formData.precio)) || 0,
        superficie_ha: formData.superficie_ha ? parseFloat(parseFormattedNumber(formData.superficie_ha)) : null,
        comision_compra_valor: formData.comision_compra_valor ? parseFloat(parseFormattedNumber(formData.comision_compra_valor)) : null,
        comision_venta_valor: formData.comision_venta_valor ? parseFloat(parseFormattedNumber(formData.comision_venta_valor)) : null,
        descuento_destare: formData.descuento_destare ? parseFloat(parseFormattedNumber(formData.descuento_destare)) : null,
        precios_calidad: isGuisante ? (formData.precios_calidad || []).map(pc => ({
          ...pc,
          min_tenderometria: parseFloat(pc.min_tenderometria),
          max_tenderometria: parseFloat(pc.max_tenderometria),
          precio: parseFloat(parseFormattedNumber(pc.precio))
        })) : []
      };
      
      // En edición, no enviar el numero_contrato (es inmutable)
      if (editingId) {
        delete submitData.numero_contrato;
      }
      
      console.log('Submitting contrato:', submitData);
      
      const data = editingId 
        ? await api.put(url, submitData)
        : await api.post(url, submitData);
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchContratos();
        resetForm();
        // Navegar de vuelta a la lista
        navigate('/contratos');
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
      superficie_ha: contrato.superficie_ha || '',
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
      comision_venta_valor: contrato.comision_venta_valor || '',
      // Nuevos campos
      forma_pago: contrato.forma_pago || '',
      forma_cobro: contrato.forma_cobro || '',
      descuento_destare: contrato.descuento_destare || '',
      // Condiciones logísticas
      condiciones_entrega: contrato.condiciones_entrega || '',
      transporte_por_cuenta: contrato.transporte_por_cuenta || '',
      envases_por_cuenta: contrato.envases_por_cuenta || '',
      cargas_granel: contrato.cargas_granel || false
    });
    setShowForm(true);
    // Navegar a la ruta de edición
    navigate(`/contratos/editar/${contrato._id}`);
  };
  
  // Función para abrir nuevo contrato
  const handleNewContrato = () => {
    resetForm();
    setShowForm(true);
    navigate('/contratos/nuevo');
  };
  
  const resetForm = () => {
    // Generar número de contrato automático
    const nuevoNumero = generarNumeroContrato();
    setFormData({
      numero_contrato: nuevoNumero,
      tipo: 'Compra',
      campana: '2025/26',
      procedencia: 'Campo',
      fecha_contrato: new Date().toISOString().split('T')[0],
      proveedor_id: '',
      cliente_id: '',
      cultivo_id: '',
      cantidad: '',
      precio: '',
      superficie_ha: '',
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
      comision_venta_valor: '',
      forma_pago: '',
      forma_cobro: '',
      descuento_destare: '',
      // Condiciones logísticas
      condiciones_entrega: '',
      transporte_por_cuenta: '',
      envases_por_cuenta: '',
      cargas_granel: false
    });
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    resetForm();
    // Volver a la lista
    navigate('/contratos');
  };
  
  // Manejar rutas de nuevo/editar
  useEffect(() => {
    if (location.pathname.includes('/nuevo')) {
      setShowForm(true);
      setEditingId(null);
      resetForm();
    } else if (location.pathname.includes('/editar/') && urlId) {
      // Cargar contrato para edición
      const contrato = contratos.find(c => c._id === urlId);
      if (contrato) {
        handleEditFromUrl(contrato);
      }
    } else {
      // En la lista principal
      if (showForm && !editingId) {
        setShowForm(false);
      }
    }
  }, [location.pathname, urlId, contratos]);
  
  // Cargar contrato para edición sin navegar (usado por useEffect)
  const handleEditFromUrl = (contrato) => {
    setEditingId(contrato._id);
    setFormData({
      numero_contrato: contrato.numero_contrato || '',
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
      comision_compra_tipo: contrato.comision_compra_tipo || contrato.comision_tipo || 'porcentaje',
      comision_compra_valor: contrato.comision_compra_valor || contrato.comision_valor || '',
      comision_venta_tipo: contrato.comision_venta_tipo || 'porcentaje',
      comision_venta_valor: contrato.comision_venta_valor || '',
      forma_pago: contrato.forma_pago || '',
      forma_cobro: contrato.forma_cobro || '',
      descuento_destare: contrato.descuento_destare || '',
      // Condiciones logísticas
      condiciones_entrega: contrato.condiciones_entrega || '',
      transporte_por_cuenta: contrato.transporte_por_cuenta || '',
      envases_por_cuenta: contrato.envases_por_cuenta || '',
      cargas_granel: contrato.cargas_granel || false
    });
    setShowForm(true);
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
      await api.delete(`/api/contratos/${contratoId}`);
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
      // Use api.downloadWithPost for POST request that returns blob
      await api.downloadWithPost('/api/cuaderno-campo/generar', {
        contrato_id: contratoId,
        include_ai_summary: true
      }, 'Cuaderno_Campo.pdf');
    } catch (error) {
      console.error('Error generating cuaderno:', error);
      setError(api.getErrorMessage(error) || t('fieldNotebook.errorGenerating'));
      setTimeout(() => setError(null), 5000);
    } finally {
      setGeneratingCuaderno(null);
    }
  };
  
  // Si estamos en modo formulario (página de nuevo/editar), mostrar solo el formulario
  if (isFormMode) {
    return (
      <div data-testid="contratos-form-page">
        {/* Header con botón de volver */}
        <div className="flex justify-between items-center mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={handleCancelEdit}
              data-testid="btn-volver-lista"
            >
              <ArrowLeft size={18} />
              Volver a la lista
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>
              {editingId ? 'Editar Contrato' : 'Nuevo Contrato'}
            </h1>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        
        {/* Formulario */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">{editingId ? 'Editar Contrato' : 'Nuevo Contrato'}</h3>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
            {/* Primera fila: Número de Contrato */}
            <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
              <label className="form-label">Número de Contrato *</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.numero_contrato} 
                readOnly
                style={{ backgroundColor: 'hsl(var(--muted))', cursor: 'not-allowed', fontWeight: '600' }}
                data-testid="input-numero-contrato"
              />
              <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                {editingId ? 'Este campo no se puede modificar' : 'Se genera automáticamente'}
              </small>
            </div>
            
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select 
                  className="form-select" 
                  value={formData.tipo} 
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  data-testid="select-tipo"
                >
                  {puedeCompra && <option value="Compra">Compra</option>}
                  {puedeVenta && <option value="Venta">Venta</option>}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Campaña *</label>
                <select 
                  className="form-select" 
                  value={formData.campana} 
                  onChange={(e) => setFormData({...formData, campana: e.target.value})}
                  data-testid="select-campana"
                >
                  <option value="2025/26">2025/26</option>
                  <option value="2024/25">2024/25</option>
                  <option value="2026/27">2026/27</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Fecha Contrato *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.fecha_contrato} 
                  onChange={(e) => setFormData({...formData, fecha_contrato: e.target.value})} 
                  required 
                  data-testid="input-fecha"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Procedencia</label>
                <select 
                  className="form-select" 
                  value={formData.procedencia} 
                  onChange={(e) => setFormData({...formData, procedencia: e.target.value})}
                  data-testid="select-procedencia"
                >
                  <option value="Campo">Campo</option>
                  <option value="Importación">Importación</option>
                </select>
              </div>
              
              {/* Proveedor - solo para compras */}
              {formData.tipo === 'Compra' && (
                <div className="form-group">
                  <label className="form-label">Proveedor</label>
                  <select 
                    className="form-select" 
                    value={formData.proveedor_id} 
                    onChange={(e) => {
                      const selectedProv = proveedores.find(p => p._id === e.target.value);
                      setFormData({
                        ...formData, 
                        proveedor_id: e.target.value,
                        proveedor: selectedProv?.nombre || ''
                      });
                    }}
                    data-testid="select-proveedor"
                  >
                    <option value="">-- Seleccionar --</option>
                    {proveedores.map(p => (
                      <option key={p._id} value={p._id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Cliente - solo para ventas */}
              {formData.tipo === 'Venta' && (
                <div className="form-group">
                  <label className="form-label">Cliente</label>
                  <select 
                    className="form-select" 
                    value={formData.cliente_id} 
                    onChange={(e) => {
                      const selectedClient = clientes.find(c => c._id === e.target.value);
                      setFormData({
                        ...formData, 
                        cliente_id: e.target.value,
                        cliente: selectedClient?.nombre || ''
                      });
                    }}
                    data-testid="select-cliente"
                  >
                    <option value="">-- Seleccionar --</option>
                    {clientes.map(c => (
                      <option key={c._id} value={c._id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Cultivo</label>
                <select 
                  className="form-select" 
                  value={formData.cultivo_id} 
                  onChange={(e) => {
                    const selectedCultivo = cultivos.find(c => c._id === e.target.value);
                    setFormData({
                      ...formData, 
                      cultivo_id: e.target.value,
                      cultivo: selectedCultivo?.nombre || ''
                    });
                  }}
                  data-testid="select-cultivo"
                >
                  <option value="">-- Seleccionar --</option>
                  {cultivos.map(c => (
                    <option key={c._id} value={c._id}>{c.nombre} {c.variedad ? `(${c.variedad})` : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Cantidad (kg) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formatNumber(formData.cantidad)} 
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (/^\d*$/.test(rawValue)) {
                      setFormData({...formData, cantidad: rawValue});
                    }
                  }}
                  placeholder="Ej: 1.000"
                  required
                  data-testid="input-cantidad"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Precio (€/kg) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formatNumber(formData.precio)} 
                  onChange={(e) => {
                    // Permitir números y una coma para decimales
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (/^\d*,?\d*$/.test(rawValue)) {
                      setFormData({...formData, precio: rawValue});
                    }
                  }}
                  placeholder="Ej: 1,50"
                  required
                  data-testid="input-precio"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Superficie Contratada (ha)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formatNumber(formData.superficie_ha)} 
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (/^\d*,?\d*$/.test(rawValue)) {
                      setFormData({...formData, superficie_ha: rawValue});
                    }
                  }}
                  placeholder="Ej: 10,5"
                  data-testid="input-superficie-ha"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Periodo Desde</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.periodo_desde} 
                  onChange={(e) => setFormData({...formData, periodo_desde: e.target.value})}
                  data-testid="input-periodo-desde"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Periodo Hasta</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.periodo_hasta} 
                  onChange={(e) => setFormData({...formData, periodo_hasta: e.target.value})}
                  data-testid="input-periodo-hasta"
                />
              </div>
            </div>
            
            {/* Sección de Agente y Comisión */}
            <div style={{ 
              background: 'hsl(var(--muted))', 
              padding: '1rem', 
              borderRadius: '8px', 
              marginTop: '1rem',
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
                      data-testid="select-agente-compra-page"
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
                      data-testid="select-agente-venta-page"
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
                
                {/* Comisión para Compra */}
                {formData.tipo === 'Compra' && formData.agente_compra && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tipo Comisión</label>
                      <select
                        className="form-select"
                        value={formData.comision_compra_tipo}
                        onChange={(e) => setFormData({...formData, comision_compra_tipo: e.target.value})}
                        data-testid="select-comision-compra-tipo-page"
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
                        type="text"
                        className="form-input"
                        value={formatNumber(formData.comision_compra_valor)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\./g, '');
                          if (/^\d*,?\d*$/.test(rawValue)) {
                            setFormData({...formData, comision_compra_valor: rawValue});
                          }
                        }}
                        placeholder={formData.comision_compra_tipo === 'porcentaje' ? 'Ej: 2,5' : 'Ej: 0,05'}
                        data-testid="input-comision-compra-valor-page"
                      />
                    </div>
                  </>
                )}
                
                {/* Comisión para Venta */}
                {formData.tipo === 'Venta' && formData.agente_venta && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Tipo Comisión</label>
                      <select
                        className="form-select"
                        value={formData.comision_venta_tipo}
                        onChange={(e) => setFormData({...formData, comision_venta_tipo: e.target.value})}
                        data-testid="select-comision-venta-tipo-page"
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
                        type="text"
                        className="form-input"
                        value={formatNumber(formData.comision_venta_valor)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\./g, '');
                          if (/^\d*,?\d*$/.test(rawValue)) {
                            setFormData({...formData, comision_venta_valor: rawValue});
                          }
                        }}
                        placeholder={formData.comision_venta_tipo === 'porcentaje' ? 'Ej: 2,5' : 'Ej: 0,05'}
                        data-testid="input-comision-venta-valor-page"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Sección de Forma de Pago/Cobro y Descuento Destare */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: formData.tipo === 'Compra' ? '1fr 1fr' : '1fr', 
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {/* Forma de Pago - Solo para Compras */}
              {formData.tipo === 'Compra' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Forma de Pago</label>
                  <select
                    className="form-select"
                    value={formData.forma_pago}
                    onChange={(e) => setFormData({...formData, forma_pago: e.target.value})}
                    data-testid="select-forma-pago"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Transferencia">Transferencia bancaria</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Pagaré">Pagaré</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Compensación">Compensación</option>
                  </select>
                </div>
              )}
              
              {/* Forma de Cobro - Solo para Ventas */}
              {formData.tipo === 'Venta' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Forma de Cobro</label>
                  <select
                    className="form-select"
                    value={formData.forma_cobro}
                    onChange={(e) => setFormData({...formData, forma_cobro: e.target.value})}
                    data-testid="select-forma-cobro"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Transferencia">Transferencia bancaria</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Pagaré">Pagaré</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Letra">Letra de cambio</option>
                    <option value="Confirming">Confirming</option>
                  </select>
                </div>
              )}
              
              {/* Descuento Destare - Solo para Compras */}
              {formData.tipo === 'Compra' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Descuento Destare (%)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formatNumber(formData.descuento_destare)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, '');
                      if (/^\d*,?\d*$/.test(rawValue)) {
                        setFormData({...formData, descuento_destare: rawValue});
                      }
                    }}
                    placeholder="Ej: 2,5"
                    data-testid="input-descuento-destare"
                  />
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Porcentaje que se descuenta de los kilos en albaranes
                  </small>
                </div>
              )}
            </div>
            
            {/* Nuevos campos: Condiciones de Entrega, Transporte, Envases y Granel */}
            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'hsl(var(--muted) / 0.3)', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: 'hsl(var(--primary))' }}>
                Condiciones Logísticas
              </h4>
              <div className="grid-4">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Condiciones de Entrega</label>
                  <select
                    className="form-select"
                    value={formData.condiciones_entrega}
                    onChange={(e) => setFormData({...formData, condiciones_entrega: e.target.value})}
                    data-testid="select-condiciones-entrega"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="FCA">FCA (Free Carrier)</option>
                    <option value="DDP">DDP (Delivered Duty Paid)</option>
                    <option value="EXW">EXW (Ex Works)</option>
                    <option value="FOB">FOB (Free On Board)</option>
                    <option value="CFR">CFR (Cost and Freight)</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Transporte por cuenta de</label>
                  <select
                    className="form-select"
                    value={formData.transporte_por_cuenta}
                    onChange={(e) => setFormData({...formData, transporte_por_cuenta: e.target.value})}
                    data-testid="select-transporte-por-cuenta"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Empresa">Empresa</option>
                    {formData.tipo === 'Compra' ? (
                      <option value="Proveedor">Proveedor</option>
                    ) : (
                      <option value="Cliente">Cliente</option>
                    )}
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Envases por cuenta de</label>
                  <select
                    className="form-select"
                    value={formData.envases_por_cuenta}
                    onChange={(e) => setFormData({...formData, envases_por_cuenta: e.target.value})}
                    data-testid="select-envases-por-cuenta"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Empresa">Empresa</option>
                    {formData.tipo === 'Compra' ? (
                      <option value="Proveedor">Proveedor</option>
                    ) : (
                      <option value="Cliente">Cliente</option>
                    )}
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.cargas_granel}
                      onChange={(e) => setFormData({...formData, cargas_granel: e.target.checked})}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      data-testid="checkbox-cargas-granel"
                    />
                    <span style={{ fontWeight: '500' }}>Cargas a Granel</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Tabla de Precios por Tenderometría - Solo para Guisante */}
            {isGuisante && (
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '1rem',
                borderRadius: '8px',
                marginTop: '1.5rem',
                marginBottom: '1rem',
                border: '1px solid #1a5276'
              }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 style={{ margin: 0, color: '#1a5276', fontSize: '1rem', fontWeight: '600' }}>
                    Precios por Tenderometría (Guisante)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={addPrecioTenderometria}
                    data-testid="btn-add-tenderometria"
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
                      <tr style={{ backgroundColor: '#1a5276' }}>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Tend. Mínima</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Tend. Máxima</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Precio (€/kg)</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '60px', color: 'white' }}>Eliminar</th>
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
                              data-testid={`input-min-tenderometria-${idx}`}
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
                              data-testid={`input-max-tenderometria-${idx}`}
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
                              data-testid={`input-precio-tenderometria-${idx}`}
                            />
                          </td>
                          <td style={{ padding: '4px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                              onClick={() => removePrecioTenderometria(idx)}
                              data-testid={`btn-remove-tenderometria-${idx}`}
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
            
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Observaciones</label>
              <textarea 
                className="form-input" 
                value={formData.observaciones} 
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                rows={3}
                data-testid="textarea-observaciones"
              />
            </div>
            
            {/* Historial de Auditoría - Solo en modo edición */}
            {editingId && (
              <AuditHistory collection="contratos" documentId={editingId} />
            )}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancelar
              </button>
              <PermissionButton 
                type="submit" 
                permission={editingId ? 'edit' : 'create'} 
                className="btn btn-primary"
                data-testid="btn-submit-contrato"
              >
                {editingId ? 'Actualizar Contrato' : 'Guardar Contrato'}
              </PermissionButton>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
  // Vista de lista
  return (
    <div data-testid="contratos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>{t('contracts.title')}</h1>
        <PermissionButton
          permission="create"
          onClick={handleNewContrato}
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
          
          {/* Botones de exportación */}
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (filters.proveedor) params.append('proveedor', filters.proveedor);
                  if (filters.cultivo) params.append('cultivo', filters.cultivo);
                  if (filters.campana) params.append('campana', filters.campana);
                  if (filters.tipo) params.append('tipo', filters.tipo);
                  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
                  if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
                  
                  const response = await fetch(`${BACKEND_URL}/api/contratos/export/pdf?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `contratos_${new Date().toISOString().slice(0,10)}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exporting PDF:', error);
                  alert('Error al exportar PDF');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#dc2626', color: 'white' }}
              title="Exportar a PDF"
              data-testid="btn-export-pdf"
            >
              <FileText size={14} />
              PDF
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  if (filters.proveedor) params.append('proveedor', filters.proveedor);
                  if (filters.cultivo) params.append('cultivo', filters.cultivo);
                  if (filters.campana) params.append('campana', filters.campana);
                  if (filters.tipo) params.append('tipo', filters.tipo);
                  if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
                  if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
                  
                  const response = await fetch(`${BACKEND_URL}/api/contratos/export/excel?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `contratos_${new Date().toISOString().slice(0,10)}.xlsx`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exporting Excel:', error);
                  alert('Error al exportar Excel');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#16a34a', color: 'white' }}
              title="Exportar a Excel"
              data-testid="btn-export-excel"
            >
              <Download size={14} />
              Excel
            </button>
          </div>
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
                  <label className="form-label">{t('contracts.provider')}</label>
                  <select
                    className="form-select"
                    value={formData.proveedor_id}
                    onChange={(e) => setFormData({...formData, proveedor_id: e.target.value, cliente_id: ''})}
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
                  <label className="form-label">Cliente</label>
                  <select
                    className="form-select"
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value, proveedor_id: ''})}
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
                <label className="form-label">{t('contracts.crop')}</label>
                <select
                  className="form-select"
                  value={formData.cultivo_id}
                  onChange={(e) => setFormData({...formData, cultivo_id: e.target.value})}
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
                <label className="form-label">Cantidad (kg) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatNumber(formData.cantidad)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (/^\d*$/.test(rawValue)) {
                      setFormData({...formData, cantidad: rawValue});
                    }
                  }}
                  placeholder="Ej: 1.000"
                  required
                />
              </div>
            </div>
            
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Precio (€/kg) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatNumber(formData.precio)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (/^\d*,?\d*$/.test(rawValue)) {
                      setFormData({...formData, precio: rawValue});
                    }
                  }}
                  placeholder="Ej: 1,50"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Superficie Contratada (ha)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatNumber(formData.superficie_ha)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\./g, '');
                    if (/^\d*,?\d*$/.test(rawValue)) {
                      setFormData({...formData, superficie_ha: rawValue});
                    }
                  }}
                  placeholder="Ej: 10,5"
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
            </div>
            
            <div className="grid-3">
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
                      <tr style={{ backgroundColor: '#1a5276' }}>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Tend. Mínima</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Tend. Máxima</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Precio (€/kg)</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '60px', color: 'white' }}>Eliminar</th>
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
                    <td>{formatCurrency(contrato.cantidad, 0)} kg</td>
                    <td>€{formatCurrency(contrato.precio)}</td>
                    <td className="font-semibold">€{formatCurrency((contrato.cantidad || 0) * (contrato.precio || 0))}</td>
                    <td>{contrato.fecha_contrato ? new Date(contrato.fecha_contrato).toLocaleDateString('es-ES') : '-'}</td>
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