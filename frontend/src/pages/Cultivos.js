import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, Settings } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import '../App.css';

const DEFAULT_COLUMNS = [
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'variedad', label: 'Variedad', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'unidad_medida', label: 'Unidad Medida', visible: true },
  { id: 'ciclo', label: 'Ciclo', visible: true },
  { id: 'estado', label: 'Estado', visible: true },
];


const Cultivos = () => {
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('cultivos_col_config', DEFAULT_COLUMNS);
  
  const [formData, setFormData] = useState({
    nombre: '',
    variedad: '',
    tipo: 'Hortícola',
    unidad_medida: 'kg',
    ciclo_cultivo: '',
    observaciones: '',
    activo: true
  });

  useEffect(() => {
    fetchCultivos();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCultivos = async () => {
    try {
      setError(null);
      const data = await api.get('/api/cultivos');
      setCultivos(data.cultivos || []);
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'ver los cultivos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      if (editingId) {
        await api.put(`/api/cultivos/${editingId}`, formData);
      } else {
        await api.post('/api/cultivos', formData);
      }
      
      setShowForm(false);
      setEditingId(null);
      fetchCultivos();
      resetForm();
    } catch (error) {

      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el cultivo' : 'crear el cultivo');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (cultivo) => {
    setFormData(cultivo);
    setEditingId(cultivo._id);
    setShowForm(true);
  };

  const handleDelete = async (cultivoId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este cultivo?')) {
      return;
    }
    
    try {
      setError(null);
      await api.delete(`/api/cultivos/${cultivoId}`);
      fetchCultivos();
    } catch (error) {

      const errorMsg = handlePermissionError(error, 'eliminar el cultivo');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      variedad: '',
      tipo: 'Hortícola',
      unidad_medida: 'kg',
      ciclo_cultivo: '',
      observaciones: '',
      activo: true
    });
  };

  const filteredCultivos = cultivos.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.variedad && c.variedad.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div data-testid="cultivos-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Cultivos</h1>
          <p className="text-muted">Gestiona el catálogo de cultivos y variedades</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-cultivos"><Settings size={18} /></button>
          <PermissionButton
            permission="create"
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowForm(!showForm);
            }}
            className="btn btn-primary"
            data-testid="btn-nuevo-cultivo"
          >
            <Plus size={18} />
            Nuevo Cultivo
          </PermissionButton>
        </div>
      </div>
      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{editingId ? 'Editar' : 'Nuevo'} Cultivo</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Tomate, Pimiento, Melón"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Variedad</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.variedad}
                  onChange={(e) => setFormData({ ...formData, variedad: e.target.value })}
                  placeholder="Ej: RAF, Piquillo, Galia"
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
                >
                  <option value="Hortícola">Hortícola</option>
                  <option value="Frutal">Frutal</option>
                  <option value="Cereal">Cereal</option>
                  <option value="Leguminosa">Leguminosa</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unidad de Medida *</label>
                <select
                  className="form-select"
                  value={formData.unidad_medida}
                  onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                  required
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="toneladas">Toneladas (t)</option>
                  <option value="unidades">Unidades</option>
                  <option value="cajas">Cajas</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ciclo de Cultivo</label>
                <select
                  className="form-select"
                  value={formData.ciclo_cultivo}
                  onChange={(e) => setFormData({ ...formData, ciclo_cultivo: e.target.value })}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Corto">Corto (3-4 meses)</option>
                  <option value="Medio">Medio (5-6 meses)</option>
                  <option value="Largo">Largo (7+ meses)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                rows="3"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Información adicional sobre el cultivo..."
              />
            </div>

            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <span>Activo</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Cultivo
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Lista de Cultivos</h2>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar cultivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {loading ? (
          <p>Cargando cultivos...</p>
        ) : filteredCultivos.length === 0 ? (
          <p className="text-muted">No hay cultivos registrados</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredCultivos.map((cultivo) => (
                  <tr key={cultivo._id}>
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'nombre': return <td key="nombre" style={{ fontWeight: '600' }}>{cultivo.nombre}</td>;
                        case 'variedad': return <td key="variedad">{cultivo.variedad || '-'}</td>;
                        case 'tipo': return <td key="tipo"><span className="badge badge-info">{cultivo.tipo}</span></td>;
                        case 'unidad_medida': return <td key="unidad_medida">{cultivo.unidad_medida}</td>;
                        case 'ciclo': return <td key="ciclo">{cultivo.ciclo_cultivo || '-'}</td>;
                        case 'estado': return <td key="estado"><span className={`badge ${cultivo.activo ? 'badge-success' : 'badge-secondary'}`}>{cultivo.activo ? 'Activo' : 'Inactivo'}</span></td>;
                        default: return null;
                      }
                    })}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(cultivo)}
                              title="Editar cultivo"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(cultivo._id)}
                              title="Eliminar cultivo"
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

export default Cultivos;
