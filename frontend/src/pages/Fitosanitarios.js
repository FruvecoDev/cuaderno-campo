import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Settings, X, Beaker, AlertTriangle, Database, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TIPOS_PRODUCTO = [
  'Herbicida',
  'Insecticida', 
  'Fungicida',
  'Acaricida',
  'Molusquicida',
  'Fertilizante'
];

const UNIDADES_DOSIS = ['L/ha', 'kg/ha', 'ml/ha', 'g/ha', '%'];

// Default table columns
const DEFAULT_TABLE_CONFIG = {
  numero_registro: true,
  nombre_comercial: true,
  denominacion_comun: true,
  empresa: false,
  tipo: true,
  materia_activa: true,
  dosis: true,
  volumen_agua: true,
  plagas: false,
  plazo_seguridad: true,
  activo: true
};

const TABLE_LABELS = {
  numero_registro: 'Nº Registro',
  nombre_comercial: 'Nombre Comercial',
  denominacion_comun: 'Denominación',
  empresa: 'Empresa',
  tipo: 'Tipo',
  materia_activa: 'Materia Activa',
  dosis: 'Dosis',
  volumen_agua: 'Vol. Agua',
  plagas: 'Plagas Objetivo',
  plazo_seguridad: 'Plazo Seg.',
  activo: 'Estado'
};

const Fitosanitarios = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Import/Export
  const [showImport, setShowImport] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    tipo: '',
    search: '',
    activo: 'true'
  });

  // Table config
  const [showConfig, setShowConfig] = useState(false);
  const [tableConfig, setTableConfig] = useState(() => {
    const saved = localStorage.getItem('fitosanitarios_table_config');
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_CONFIG;
  });

  // Form data
  const [formData, setFormData] = useState({
    numero_registro: '',
    nombre_comercial: '',
    denominacion_comun: '',
    empresa: '',
    tipo: 'Herbicida',
    materia_activa: '',
    dosis_min: '',
    dosis_max: '',
    unidad_dosis: 'L/ha',
    volumen_agua_min: '200',
    volumen_agua_max: '600',
    plagas_objetivo: '',
    plazo_seguridad: '',
    observaciones: '',
    activo: true
  });

  useEffect(() => {
    fetchProductos();
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('fitosanitarios_table_config', JSON.stringify(tableConfig));
  }, [tableConfig]);

  const fetchProductos = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.tipo) params.append('tipo', filters.tipo);
      if (filters.search) params.append('search', filters.search);
      if (filters.activo !== '') params.append('activo', filters.activo);

      const response = await fetch(`${BACKEND_URL}/api/fitosanitarios?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }

      const data = await response.json();
      setProductos(data.productos || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
      const errorMsg = handlePermissionError(error, 'ver los productos fitosanitarios');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('¿Cargar productos fitosanitarios desde la base de datos oficial? Esto solo funciona si no hay productos cargados.')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/fitosanitarios/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMsg(data.message);
        fetchProductos();
      } else {
        setError(data.message);
      }
      
      setTimeout(() => {
        setSuccessMsg(null);
        setError(null);
      }, 5000);
    } catch (error) {
      console.error('Error seeding data:', error);
      setError('Error al cargar los datos iniciales');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.numero_registro || !formData.nombre_comercial) {
      setError('Número de registro y nombre comercial son obligatorios');
      return;
    }

    try {
      setError(null);
      const url = editingId
        ? `${BACKEND_URL}/api/fitosanitarios/${editingId}`
        : `${BACKEND_URL}/api/fitosanitarios`;

      const method = editingId ? 'PUT' : 'POST';

      // Process plagas as array
      const plagasArray = formData.plagas_objetivo
        ? formData.plagas_objetivo.split(',').map(p => p.trim()).filter(p => p)
        : [];

      const payload = {
        ...formData,
        dosis_min: parseFloat(formData.dosis_min) || null,
        dosis_max: parseFloat(formData.dosis_max) || null,
        volumen_agua_min: parseFloat(formData.volumen_agua_min) || null,
        volumen_agua_max: parseFloat(formData.volumen_agua_max) || null,
        plazo_seguridad: parseInt(formData.plazo_seguridad) || null,
        plagas_objetivo: plagasArray
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }

      setSuccessMsg(editingId ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchProductos();
      
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Error saving producto:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el producto' : 'crear el producto');
      setError(errorMsg);
    }
  };

  const handleEdit = (producto) => {
    setEditingId(producto._id);
    setFormData({
      numero_registro: producto.numero_registro || '',
      nombre_comercial: producto.nombre_comercial || '',
      denominacion_comun: producto.denominacion_comun || '',
      empresa: producto.empresa || '',
      tipo: producto.tipo || 'Herbicida',
      materia_activa: producto.materia_activa || '',
      dosis_min: producto.dosis_min?.toString() || '',
      dosis_max: producto.dosis_max?.toString() || '',
      unidad_dosis: producto.unidad_dosis || 'L/ha',
      volumen_agua_min: producto.volumen_agua_min?.toString() || '',
      volumen_agua_max: producto.volumen_agua_max?.toString() || '',
      plagas_objetivo: (producto.plagas_objetivo || []).join(', '),
      plazo_seguridad: producto.plazo_seguridad?.toString() || '',
      observaciones: producto.observaciones || '',
      activo: producto.activo !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (productoId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar productos');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/fitosanitarios/${productoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }

      fetchProductos();
      setSuccessMsg('Producto eliminado correctamente');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      console.error('Error deleting producto:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el producto');
      setError(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_registro: '',
      nombre_comercial: '',
      denominacion_comun: '',
      empresa: '',
      tipo: 'Herbicida',
      materia_activa: '',
      dosis_min: '',
      dosis_max: '',
      unidad_dosis: 'L/ha',
      volumen_agua_min: '200',
      volumen_agua_max: '600',
      plagas_objetivo: '',
      plazo_seguridad: '',
      observaciones: '',
      activo: true
    });
  };

  const clearFilters = () => {
    setFilters({ tipo: '', search: '', activo: 'true' });
  };

  const toggleTableConfig = (field) => {
    setTableConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const hasActiveFilters = filters.tipo || filters.search || filters.activo !== 'true';

  // Count by type
  const countByType = TIPOS_PRODUCTO.reduce((acc, tipo) => {
    acc[tipo] = productos.filter(p => p.tipo === tipo).length;
    return acc;
  }, {});

  return (
    <div data-testid="fitosanitarios-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Beaker size={28} style={{ color: '#2d5a27' }} />
            Productos Fitosanitarios
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
            Base de datos de productos con dosis recomendadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowConfig(!showConfig)}
            title="Configurar columnas"
            data-testid="btn-config"
          >
            <Settings size={18} />
          </button>
          {productos.length === 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleSeedData}
              title="Cargar productos oficiales"
              data-testid="btn-seed"
            >
              <Database size={18} />
              Cargar Datos
            </button>
          )}
          <PermissionButton
            permission="create"
            onClick={() => { resetForm(); setShowForm(!showForm); setEditingId(null); }}
            className="btn btn-primary"
            data-testid="btn-nuevo-producto"
          >
            <Plus size={18} />
            Nuevo Producto
          </PermissionButton>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> {error}
          </p>
        </div>
      )}

      {successMsg && (
        <div className="card" style={{ backgroundColor: '#dcfce7', border: '1px solid #86efac', marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ color: '#166534' }}>{successMsg}</p>
        </div>
      )}

      {/* KPIs by type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {TIPOS_PRODUCTO.map(tipo => (
          <div
            key={tipo}
            className="card"
            style={{
              padding: '1rem',
              textAlign: 'center',
              cursor: 'pointer',
              border: filters.tipo === tipo ? '2px solid #2d5a27' : '1px solid hsl(var(--border))',
              backgroundColor: filters.tipo === tipo ? 'hsl(var(--primary) / 0.1)' : 'white'
            }}
            onClick={() => setFilters({ ...filters, tipo: filters.tipo === tipo ? '' : tipo })}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
              {countByType[tipo] || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
              {tipo}s
            </div>
          </div>
        ))}
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Columnas</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowConfig(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={tableConfig[key]}
                  onChange={() => toggleTableConfig(key)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros de Búsqueda
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Nombre, registro, materia activa..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ paddingLeft: '35px' }}
                data-testid="filter-search"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select
              className="form-select"
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              data-testid="filter-tipo"
            >
              <option value="">Todos</option>
              {TIPOS_PRODUCTO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              value={filters.activo}
              onChange={(e) => setFilters({ ...filters, activo: e.target.value })}
              data-testid="filter-activo"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {productos.length} productos
          </p>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card mb-6" data-testid="producto-form">
          <h2 className="card-title">{editingId ? 'Editar Producto' : 'Nuevo Producto Fitosanitario'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Nº Registro *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.numero_registro}
                  onChange={(e) => setFormData({ ...formData, numero_registro: e.target.value })}
                  placeholder="Ej: ES-00123"
                  required
                  data-testid="input-numero-registro"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre Comercial *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nombre_comercial}
                  onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                  placeholder="Ej: GLIFOSATO 36%"
                  required
                  data-testid="input-nombre-comercial"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Denominación Común</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.denominacion_comun}
                  onChange={(e) => setFormData({ ...formData, denominacion_comun: e.target.value })}
                  placeholder="Nombre alternativo"
                />
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select
                  className="form-select"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  required
                  data-testid="select-tipo"
                >
                  {TIPOS_PRODUCTO.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Empresa</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  placeholder="Empresa concesionaria"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Materia Activa</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.materia_activa}
                  onChange={(e) => setFormData({ ...formData, materia_activa: e.target.value })}
                  placeholder="Ej: Glifosato 36%"
                />
              </div>
            </div>

            <div className="grid-4">
              <div className="form-group">
                <label className="form-label">Dosis Mínima</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.dosis_min}
                  onChange={(e) => setFormData({ ...formData, dosis_min: e.target.value })}
                  placeholder="Ej: 1.0"
                  data-testid="input-dosis-min"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dosis Máxima</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.dosis_max}
                  onChange={(e) => setFormData({ ...formData, dosis_max: e.target.value })}
                  placeholder="Ej: 3.0"
                  data-testid="input-dosis-max"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad Dosis</label>
                <select
                  className="form-select"
                  value={formData.unidad_dosis}
                  onChange={(e) => setFormData({ ...formData, unidad_dosis: e.target.value })}
                  data-testid="select-unidad-dosis"
                >
                  {UNIDADES_DOSIS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Plazo Seguridad (días)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.plazo_seguridad}
                  onChange={(e) => setFormData({ ...formData, plazo_seguridad: e.target.value })}
                  placeholder="Ej: 21"
                  data-testid="input-plazo-seguridad"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Vol. Agua Mín (L/ha)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.volumen_agua_min}
                  onChange={(e) => setFormData({ ...formData, volumen_agua_min: e.target.value })}
                  placeholder="Ej: 200"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vol. Agua Máx (L/ha)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.volumen_agua_max}
                  onChange={(e) => setFormData({ ...formData, volumen_agua_max: e.target.value })}
                  placeholder="Ej: 600"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Plagas/Enfermedades Objetivo</label>
              <input
                type="text"
                className="form-input"
                value={formData.plagas_objetivo}
                onChange={(e) => setFormData({ ...formData, plagas_objetivo: e.target.value })}
                placeholder="Separar con comas: Pulgón, Mildiu, Oídio..."
              />
              <small style={{ color: 'hsl(var(--muted-foreground))' }}>Separar múltiples plagas con comas</small>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={2}
                placeholder="Notas adicionales sobre el producto..."
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Producto activo</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar">
                {editingId ? 'Actualizar Producto' : 'Guardar Producto'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <h2 className="card-title">Lista de Productos ({productos.length})</h2>
        {loading ? (
          <p>Cargando productos...</p>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Beaker size={48} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }} />
            <p className="text-muted">No hay productos fitosanitarios registrados.</p>
            <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
              Haz clic en "Cargar Datos" para importar productos oficiales o añade uno manualmente.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" data-testid="productos-table">
              <thead>
                <tr>
                  {tableConfig.numero_registro && <th>Nº Registro</th>}
                  {tableConfig.nombre_comercial && <th>Nombre Comercial</th>}
                  {tableConfig.denominacion_comun && <th>Denominación</th>}
                  {tableConfig.empresa && <th>Empresa</th>}
                  {tableConfig.tipo && <th>Tipo</th>}
                  {tableConfig.materia_activa && <th>Materia Activa</th>}
                  {tableConfig.dosis && <th>Dosis</th>}
                  {tableConfig.volumen_agua && <th>Vol. Agua</th>}
                  {tableConfig.plagas && <th>Plagas</th>}
                  {tableConfig.plazo_seguridad && <th>Plazo</th>}
                  {tableConfig.activo && <th>Estado</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(producto => (
                  <tr key={producto._id}>
                    {tableConfig.numero_registro && <td><code style={{ fontSize: '0.75rem' }}>{producto.numero_registro}</code></td>}
                    {tableConfig.nombre_comercial && <td><strong>{producto.nombre_comercial}</strong></td>}
                    {tableConfig.denominacion_comun && <td>{producto.denominacion_comun || '-'}</td>}
                    {tableConfig.empresa && <td style={{ fontSize: '0.8rem' }}>{producto.empresa || '-'}</td>}
                    {tableConfig.tipo && (
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: 
                            producto.tipo === 'Herbicida' ? '#fef3c7' :
                            producto.tipo === 'Insecticida' ? '#fce7f3' :
                            producto.tipo === 'Fungicida' ? '#dbeafe' :
                            producto.tipo === 'Acaricida' ? '#f3e8ff' :
                            producto.tipo === 'Molusquicida' ? '#d1fae5' : '#f3f4f6',
                          color:
                            producto.tipo === 'Herbicida' ? '#92400e' :
                            producto.tipo === 'Insecticida' ? '#be185d' :
                            producto.tipo === 'Fungicida' ? '#1e40af' :
                            producto.tipo === 'Acaricida' ? '#7c3aed' :
                            producto.tipo === 'Molusquicida' ? '#047857' : '#374151'
                        }}>
                          {producto.tipo}
                        </span>
                      </td>
                    )}
                    {tableConfig.materia_activa && <td style={{ fontSize: '0.8rem' }}>{producto.materia_activa || '-'}</td>}
                    {tableConfig.dosis && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {producto.dosis_min || producto.dosis_max ? (
                          <span>
                            {producto.dosis_min && producto.dosis_max 
                              ? `${producto.dosis_min}-${producto.dosis_max}`
                              : producto.dosis_max || producto.dosis_min
                            } {producto.unidad_dosis}
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {tableConfig.volumen_agua && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {producto.volumen_agua_min || producto.volumen_agua_max ? (
                          <span>{producto.volumen_agua_min}-{producto.volumen_agua_max} L/ha</span>
                        ) : '-'}
                      </td>
                    )}
                    {tableConfig.plagas && (
                      <td style={{ fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(producto.plagas_objetivo || []).join(', ') || '-'}
                      </td>
                    )}
                    {tableConfig.plazo_seguridad && (
                      <td style={{ textAlign: 'center' }}>
                        {producto.plazo_seguridad !== null ? `${producto.plazo_seguridad}d` : '-'}
                      </td>
                    )}
                    {tableConfig.activo && (
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          backgroundColor: producto.activo ? '#dcfce7' : '#fee2e2',
                          color: producto.activo ? '#166534' : '#991b1b'
                        }}>
                          {producto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <PermissionButton
                          permission="edit"
                          onClick={() => handleEdit(producto)}
                          className="btn btn-sm btn-secondary"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </PermissionButton>
                        <PermissionButton
                          permission="delete"
                          onClick={() => handleDelete(producto._id)}
                          className="btn btn-sm"
                          style={{ backgroundColor: 'hsl(var(--destructive))', color: 'white' }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </PermissionButton>
                      </div>
                    </td>
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

export default Fitosanitarios;
