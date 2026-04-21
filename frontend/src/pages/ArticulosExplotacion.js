import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Search, X, Package, Check, XCircle, DollarSign, Settings, Eye } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';

const DEFAULT_COLUMNS = [
  { id: 'codigo', label: 'Codigo', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'categoria', label: 'Categoria', visible: true },
  { id: 'unidad', label: 'Unidad', visible: true },
  { id: 'precio', label: 'Precio', visible: true },
  { id: 'iva', label: 'IVA', visible: true },
  { id: 'stock', label: 'Stock', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
];


const CATEGORIAS = [
  'Fertilizantes',
  'Fitosanitarios',
  'Semillas',
  'Materiales',
  'Maquinaria',
  'Servicios',
  'Combustibles',
  'Envases',
  'Otros'
];

const UNIDADES = [
  'Kg',
  'L',
  'Unidad',
  'Saco',
  'Caja',
  'Palet',
  'm²',
  'm³',
  'Hora',
  'Servicio'
];

const ArticulosExplotacion = () => {
  const { t } = useTranslation();
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalTab, setModalTab] = useState('general');
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('articulos_col_config', DEFAULT_COLUMNS);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterActivo, setFilterActivo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: 'General',
    unidad_medida: 'Unidad',
    precio_unitario: '',
    iva: '21',
    stock_actual: '',
    stock_minimo: '',
    proveedor_habitual: '',
    observaciones: '',
    activo: true
  });

  useEffect(() => {
    fetchArticulos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchArticulos = async () => {
    try {
      setLoading(true);
      let params = new URLSearchParams();
      params.append('limit', '500');
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategoria) params.append('categoria', filterCategoria);
      if (filterActivo !== '') params.append('activo', filterActivo);
      
      const data = await api.get(`/api/articulos?${params}`);
      setArticulos(data.articulos || []);
    } catch (err) {

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticulos();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterCategoria, filterActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setFormData({
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: 'General',
      unidad_medida: 'Unidad',
      precio_unitario: '',
      iva: '21',
      stock_actual: '',
      stock_minimo: '',
      proveedor_habitual: '',
      observaciones: '',
      activo: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      
      const payload = {
        ...formData,
        // No enviar código vacío, el backend lo genera automáticamente
        codigo: editingId ? formData.codigo : undefined,
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
        iva: parseFloat(formData.iva) || 21,
        stock_actual: formData.stock_actual ? parseFloat(formData.stock_actual) : null,
        stock_minimo: formData.stock_minimo ? parseFloat(formData.stock_minimo) : null
      };
      
      if (editingId) {
        await api.put(`/api/articulos/${editingId}`, payload);
      } else {
        await api.post('/api/articulos', payload);
      }
      
      setShowForm(false);
      setEditingId(null);
      fetchArticulos();
      resetForm();
    } catch (err) {
      const errorMsg = handlePermissionError(err, editingId ? 'actualizar' : 'crear');
      setError(api.getErrorMessage(err) || errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (articulo) => {
    setEditingId(articulo._id);
    setFormData({
      codigo: articulo.codigo || '',
      nombre: articulo.nombre || '',
      descripcion: articulo.descripcion || '',
      categoria: articulo.categoria || 'General',
      unidad_medida: articulo.unidad_medida || 'Unidad',
      precio_unitario: articulo.precio_unitario?.toString() || '',
      iva: articulo.iva?.toString() || '21',
      stock_actual: articulo.stock_actual?.toString() || '',
      stock_minimo: articulo.stock_minimo?.toString() || '',
      proveedor_habitual: articulo.proveedor_habitual || '',
      observaciones: articulo.observaciones || '',
      activo: articulo.activo !== false
    });
    setShowForm(true);
    setModalTab('general');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este artículo?')) return;
    
    try {
      await api.delete(`/api/articulos/${id}`);
      fetchArticulos();
    } catch (err) {
      const errorMsg = handlePermissionError(err, 'eliminar');
      setError(api.getErrorMessage(err) || errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleActivo = async (id) => {
    try {
      await api.patch(`/api/articulos/${id}/toggle-activo`);
      fetchArticulos();
    } catch (err) {

    }
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      'Fertilizantes': '#16a34a',
      'Fitosanitarios': '#dc2626',
      'Semillas': '#f59e0b',
      'Materiales': '#6366f1',
      'Maquinaria': '#64748b',
      'Servicios': '#0891b2',
      'Combustibles': '#ea580c',
      'Envases': '#8b5cf6',
      'Otros': '#71717a'
    };
    return colors[categoria] || '#71717a';
  };

  const hasActiveFilters = searchTerm || filterCategoria || filterActivo !== '';

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">
          <Package size={28} style={{ display: 'inline', marginRight: '0.75rem', color: 'hsl(var(--primary))' }} />
          Artículos de Explotación
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-articulos"><Settings size={18} /></button>
          <button
            className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filtros {hasActiveFilters && <span className="badge badge-primary" style={{ marginLeft: '0.25rem' }}>!</span>}
          </button>
          {canCreate && (
            <PermissionButton
              className="btn btn-primary"
              onClick={() => { resetForm(); setEditingId(null); setModalTab('general'); setShowForm(true); }}
              action="create"
              data-testid="btn-nuevo-articulo"
            >
              <Plus size={18} />
              Nuevo Artículo
            </PermissionButton>
          )}
        </div>
      </div>

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="grid-4">
            <div className="form-group">
              <label className="form-label">Buscar</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                  placeholder="Código, nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
              >
                <option value="">-- Todas --</option>
                {CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filterActivo}
                onChange={(e) => setFilterActivo(e.target.value)}
              >
                <option value="">-- Todos --</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              {hasActiveFilters && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setSearchTerm(''); setFilterCategoria(''); setFilterActivo(''); }}
                >
                  <X size={16} /> Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>
          <div className="card" style={{ maxWidth: '960px', width: '100%', height: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} style={{ color: 'hsl(var(--primary))' }} /></div>
                <div><h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>{editingId ? 'Editar' : 'Nuevo'} Articulo</h2><span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{formData.codigo || 'Auto-generado'} {formData.nombre && `- ${formData.nombre}`}</span></div>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="config-modal-close-btn"><X size={18} /></button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))' }}>
              {[
                { key: 'general', label: 'Datos Generales', icon: <Package size={14} /> },
                { key: 'stock', label: 'Stock y Precios', icon: <DollarSign size={14} /> }
              ].map(tab => (
                <button key={tab.key} type="button" onClick={() => setModalTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem', fontWeight: modalTab === tab.key ? '700' : '500', color: modalTab === tab.key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', background: 'none', border: 'none', borderBottom: modalTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-2px' }}>{tab.icon}{tab.label}</button>
              ))}
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', minHeight: 0, paddingRight: '1rem' }}>
              {modalTab === 'general' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Identificacion</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Codigo</label><input type="text" className="form-input" value={editingId ? formData.codigo : 'Auto'} readOnly disabled style={{ backgroundColor: 'hsl(var(--muted))', textAlign: 'center' }} data-testid="input-codigo" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Nombre *</label><input type="text" className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required placeholder="Nombre del articulo" data-testid="input-nombre" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Categoria</label><select className="form-select" value={formData.categoria} onChange={(e) => setFormData({...formData, categoria: e.target.value})} data-testid="select-categoria"><option value="General">General</option>{CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Detalles</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Unidad de Medida</label><select className="form-select" value={formData.unidad_medida} onChange={(e) => setFormData({...formData, unidad_medida: e.target.value})}>{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Proveedor Habitual</label><input type="text" className="form-input" value={formData.proveedor_habitual} onChange={(e) => setFormData({...formData, proveedor_habitual: e.target.value})} placeholder="Nombre del proveedor" /></div>
                  </div>
                </div>
                <div className="form-group"><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Descripcion</label><textarea className="form-input" rows="2" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} style={{ fontSize: '0.85rem', resize: 'vertical' }} placeholder="Descripcion del articulo..." /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.25rem', alignItems: 'start' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Observaciones</label><textarea className="form-input" rows="2" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} style={{ fontSize: '0.85rem', resize: 'vertical' }} /></div>
                  <div style={{ paddingTop: '1.5rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: formData.activo ? 'hsl(142 76% 36%/0.1)' : 'hsl(var(--muted))', border: '1px solid ' + (formData.activo ? 'hsl(142 76% 36%/0.3)' : 'hsl(var(--border))') }}><input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} style={{ width: '16px', height: '16px' }} /><span style={{ fontWeight: '600', fontSize: '0.85rem', color: formData.activo ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))' }}>{formData.activo ? 'Activo' : 'Inactivo'}</span></label></div>
                </div>
              </div>)}

              {modalTab === 'stock' && (<div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Precios</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Precio Unitario (EUR)</label><input type="number" step="0.01" min="0" className="form-input" value={formData.precio_unitario} onChange={(e) => setFormData({...formData, precio_unitario: e.target.value})} placeholder="0.00" style={{ fontWeight: '600' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>IVA (%)</label><select className="form-select" value={formData.iva} onChange={(e) => setFormData({...formData, iva: e.target.value})}><option value="0">0%</option><option value="4">4%</option><option value="10">10%</option><option value="21">21%</option></select></div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>Control de Stock</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Stock Actual</label><input type="number" step="0.01" min="0" className="form-input" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: e.target.value})} placeholder="Cantidad en stock" style={{ fontWeight: '600' }} /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Stock Minimo (alerta)</label><input type="number" step="0.01" min="0" className="form-input" value={formData.stock_minimo} onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})} placeholder="Alerta stock bajo" /></div>
                  </div>
                </div>
              </div>)}

              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}><button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Cancelar</button><button type="submit" className="btn btn-primary" data-testid="btn-guardar">{editingId ? 'Actualizar' : 'Crear'} Articulo</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de artículos */}
      <div className="card">
        <h2 className="card-title">
          <Package size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Catálogo de Artículos ({articulos.length})
        </h2>
        
        {loading ? (
          <p>Cargando artículos...</p>
        ) : articulos.length === 0 ? (
          <p className="text-muted">
            {hasActiveFilters ? 'No hay artículos que coincidan con los filtros' : 'No hay artículos registrados. ¡Añade el primero!'}
          </p>
        ) : (
          <div className="table-container">
            <table data-testid="articulos-table">
              <thead>
                <tr>
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {articulos.map((articulo) => (
                  <tr key={articulo._id} style={{ opacity: articulo.activo !== false ? 1 : 0.6 }}>
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'codigo': return <td key="codigo"><strong style={{ fontFamily: 'monospace' }}>{articulo.codigo}</strong></td>;
                        case 'nombre': return <td key="nombre"><div>{articulo.nombre}</div>{articulo.descripcion && <small style={{ color: 'hsl(var(--muted-foreground))' }}>{articulo.descripcion.substring(0, 50)}...</small>}</td>;
                        case 'categoria': return <td key="categoria"><span className="badge" style={{ backgroundColor: `${getCategoriaColor(articulo.categoria)}20`, color: getCategoriaColor(articulo.categoria), border: `1px solid ${getCategoriaColor(articulo.categoria)}40` }}>{articulo.categoria}</span></td>;
                        case 'unidad': return <td key="unidad">{articulo.unidad_medida}</td>;
                        case 'precio': return <td key="precio"><strong style={{ color: 'hsl(var(--primary))' }}>{articulo.precio_unitario?.toFixed(2) || '0.00'} &euro;</strong></td>;
                        case 'iva': return <td key="iva">{articulo.iva || 21}%</td>;
                        case 'stock': return <td key="stock">{articulo.stock_actual !== null && articulo.stock_actual !== undefined ? (<span style={{ color: articulo.stock_minimo && articulo.stock_actual < articulo.stock_minimo ? 'hsl(var(--destructive))' : 'inherit' }}>{articulo.stock_actual} {articulo.unidad_medida}{articulo.stock_minimo && articulo.stock_actual < articulo.stock_minimo && <span style={{ fontSize: '0.75rem', display: 'block', color: 'hsl(var(--destructive))' }}>Stock bajo</span>}</span>) : (<span style={{ color: 'hsl(var(--muted-foreground))' }}>&mdash;</span>)}</td>;
                        case 'estado': return <td key="estado"><button onClick={() => handleToggleActivo(articulo._id)} className={`badge ${articulo.activo !== false ? 'badge-success' : 'badge-secondary'}`} style={{ cursor: 'pointer', border: 'none' }} title={articulo.activo !== false ? 'Desactivar' : 'Activar'}>{articulo.activo !== false ? (<><Check size={12} /> Activo</>) : (<><XCircle size={12} /> Inactivo</>)}</button></td>;
                        default: return null;
                      }
                    })}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(articulo)}
                              title="Editar"
                              data-testid={`edit-articulo-${articulo._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(articulo._id)}
                              title="Eliminar"
                              data-testid={`delete-articulo-${articulo._id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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

export default ArticulosExplotacion;
