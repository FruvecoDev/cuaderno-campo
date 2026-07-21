import React, { useState, useEffect } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Search, Settings, X, Download, Leaf, Eye } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
import { useAuth } from '../contexts/AuthContext';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import CultivoFormModal from '../components/cultivos/CultivoFormModal';
import '../App.css';
import { notify } from '../lib/notify';

const DEFAULT_COLUMNS = [
  { id: 'codigo_cultivo', label: 'ID', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'variedad', label: 'Variedad', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'unidad_medida', label: 'Unidad Medida', visible: true },
  { id: 'ciclo', label: 'Ciclo', visible: true },
  { id: 'temporada', label: 'Temporada', visible: false },
  { id: 'familia_botanica', label: 'Familia Botanica', visible: false },
  { id: 'estado', label: 'Estado', visible: true },
];

const Cultivos = () => {
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [tiposCultivo, setTiposCultivo] = useState([]);
  const [showTiposManager, setShowTiposManager] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [changelog, setChangelog] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const { t } = useTranslation();
  
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete, canBulkDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('cultivos_col_config', DEFAULT_COLUMNS);

  const initialFormData = {
    nombre: '',
    variedad: '',
    variedades: [],
    tipo: '',
    unidad_medida: 'kg',
    ciclo_cultivo: '',
    temporada: '',
    familia_botanica: '',
    nombre_cientifico: '',
    marco_plantacion: '',
    densidad_plantacion: '',
    profundidad_siembra: '',
    necesidades_riego: '',
    temperatura_optima: '',
    ph_suelo: '',
    observaciones: '',
    activo: true
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [nuevaVariedad, setNuevaVariedad] = useState('');

  const addVariedad = () => {
    const v = nuevaVariedad.trim();
    if (!v) return;
    const existentes = formData.variedades || [];
    if (existentes.some(x => x.toLowerCase() === v.toLowerCase())) {
      notify.error('Esa variedad ya está añadida');
      setNuevaVariedad('');
      return;
    }
    setFormData({ ...formData, variedades: [...existentes, v] });
    setNuevaVariedad('');
  };

  const removeVariedad = (idx) => {
    const nuevas = (formData.variedades || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, variedades: nuevas });
  };

  const nextCodigo = (() => {
    if (!cultivos.length) return '000001';
    const maxCode = Math.max(...cultivos.map(c => parseInt(c.codigo_cultivo || '0', 10)));
    return String(maxCode + 1).padStart(6, '0');
  })();

  useEffect(() => {
    fetchCultivos();
    fetchTiposCultivo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCultivos = async () => {
    try {
      setError(null);
      const data = await api.get('/api/cultivos?limit=10000');
      setCultivos(data.cultivos || []);
    } catch (error) {
      const errorMsg = handlePermissionError(error, 'ver los cultivos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiposCultivo = async () => {
    try {
      const data = await api.get('/api/tipos-cultivo');
      setTiposCultivo(data.tipos || []);
    } catch (error) { console.error('[Cultivos.js]', error); }
  };

  const handleAddTipo = async () => {
    if (!nuevoTipo.trim()) return;
    try {
      await api.post('/api/tipos-cultivo', { nombre: nuevoTipo.trim() });
      notify.success('Tipos-cultivo creado correctamente');
      setNuevoTipo('');
      fetchTiposCultivo();
    } catch (error) { console.error('[Cultivos.js]', error); }
  };

  const handleDeleteTipo = async (tipoId) => {
    try {
      await api.delete(`/api/tipos-cultivo/${tipoId}`);
      fetchTiposCultivo();
    } catch (error) { console.error('[Cultivos.js]', error); }
  };

  const fetchChangelog = async (cultivoId) => {
    try {
      const data = await api.get(`/api/cultivos/${cultivoId}/changelog`);
      setChangelog(data.changelog || []);
    } catch (error) { setChangelog([]); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      // Sincronizar `variedad` (singular, retrocompatible) con el primer elemento de la lista
      const variedades = (formData.variedades || []).map(v => v.trim()).filter(Boolean);
      const payload = {
        ...formData,
        variedades,
        variedad: variedades[0] || '',
      };
      if (editingId) {
        await api.put(`/api/cultivos/${editingId}`, payload);
        notify.success('Cultivo actualizado correctamente');
      } else {
        await api.post('/api/cultivos', payload);
        notify.success('Cultivo creado correctamente');
      }
      setShowForm(false);
      setEditingId(null);
      fetchCultivos();
      setFormData(initialFormData);
    } catch (error) {
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el cultivo' : 'crear el cultivo');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEdit = (cultivo) => {
    // Retrocompatibilidad: si el cultivo tiene un `variedad` legado pero no `variedades[]`, inicializar la lista con ese valor.
    let variedades = Array.isArray(cultivo.variedades) ? [...cultivo.variedades] : [];
    if (variedades.length === 0 && cultivo.variedad) variedades = [cultivo.variedad];
    setFormData({
      nombre: cultivo.nombre || '',
      variedad: cultivo.variedad || '',
      variedades,
      tipo: cultivo.tipo || '',
      unidad_medida: cultivo.unidad_medida || 'kg',
      ciclo_cultivo: cultivo.ciclo_cultivo || '',
      temporada: cultivo.temporada || '',
      familia_botanica: cultivo.familia_botanica || '',
      nombre_cientifico: cultivo.nombre_cientifico || '',
      marco_plantacion: cultivo.marco_plantacion || '',
      densidad_plantacion: cultivo.densidad_plantacion || '',
      profundidad_siembra: cultivo.profundidad_siembra || '',
      necesidades_riego: cultivo.necesidades_riego || '',
      temperatura_optima: cultivo.temperatura_optima || '',
      ph_suelo: cultivo.ph_suelo || '',
      observaciones: cultivo.observaciones || '',
      activo: cultivo.activo !== false,
    });
    setEditingId(cultivo._id);
    setActiveTab('general');
    setShowForm(true);
  };

  const handleDelete = async (cultivoId) => {
    if (!window.confirm('Estas seguro de que quieres eliminar este cultivo?')) return;
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

  const closeModal = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setNuevaVariedad('');
    setActiveTab('general');
  };

  const filteredCultivos = cultivos.filter(c => {
    const q = searchTerm.toLowerCase();
    const variedades = Array.isArray(c.variedades) ? c.variedades : [];
    const matchesSearch =
      c.nombre.toLowerCase().includes(q) ||
      (c.variedad && c.variedad.toLowerCase().includes(q)) ||
      variedades.some(v => (v || '').toLowerCase().includes(q));
    const matchesEstado = filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && c.activo !== false) ||
      (filtroEstado === 'inactivos' && c.activo === false);
    return matchesSearch && matchesEstado;
  });

  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(filteredCultivos);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try { await bulkDeleteApi('cultivos', selectedIds); clearSelection(); fetchCultivos(); } catch (e) { console.error('[Cultivos.js]', e); } finally { setBulkDeleting(false); }
  };

  return (
    <div data-testid="cultivos-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Cultivos</h1>
          <p className="text-muted">Gestiona el catalogo de cultivos y variedades</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowConfig(true)} title="Configurar columnas" data-testid="btn-config-cultivos"><Settings size={18} /></button>
          <PermissionButton
            permission="create"
            onClick={() => { setFormData(initialFormData); setEditingId(null); setShowForm(true); }}
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

      {/* Modal formulario cultivo (extraído a componente) */}
      <CultivoFormModal
        show={showForm}
        editingId={editingId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        nextCodigo={nextCodigo}
        tiposCultivo={tiposCultivo}
        onOpenTiposManager={() => setShowTiposManager(true)}
        nuevaVariedad={nuevaVariedad}
        setNuevaVariedad={setNuevaVariedad}
        addVariedad={addVariedad}
        removeVariedad={removeVariedad}
        changelog={changelog}
        onLoadChangelog={fetchChangelog}
      />

      {/* Tipos Manager Modal */}
      {showTiposManager && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowTiposManager(false)}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Tipos de Cultivo</h3>
              <button onClick={() => setShowTiposManager(false)} className="config-modal-close-btn"><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input type="text" className="form-input" placeholder="Nuevo tipo..." value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTipo())} style={{ flex: 1 }} data-testid="input-nuevo-tipo-cultivo" />
              <button type="button" className="btn btn-primary" onClick={handleAddTipo} disabled={!nuevoTipo.trim()} data-testid="btn-add-tipo-cultivo"><Plus size={16} /></button>
            </div>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              {tiposCultivo.map(tipo => (
                <div key={tipo._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.35rem', background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: '0.9rem' }}>{tipo.nombre}</span>
                  <button onClick={() => handleDeleteTipo(tipo._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--destructive))', padding: '0.25rem' }} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              ))}
              {tiposCultivo.length === 0 && <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', padding: '1rem 0' }}>No hay tipos definidos</p>}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Lista de Cultivos</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ minWidth: '130px' }}>
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar cultivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                data-testid="search-cultivos"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <p>Cargando cultivos...</p>
        ) : filteredCultivos.length === 0 ? (
          <p className="text-muted">No hay cultivos registrados</p>
        ) : (
          <>
          {canBulkDelete && <BulkActionBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} deleting={bulkDeleting} />}
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {canBulkDelete && <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />}
                  {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredCultivos.map((cultivo) => (
                  <tr key={cultivo._id}>
                    {canBulkDelete && <BulkCheckboxCell id={cultivo._id} selected={selectedIds.has(cultivo._id)} onToggle={toggleOne} />}
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'codigo_cultivo': return <td key="codigo_cultivo"><code style={{ fontFamily: 'monospace', fontWeight: '600', fontSize: '0.85rem' }}>{cultivo.codigo_cultivo || '-'}</code></td>;
                        case 'nombre': return <td key="nombre" style={{ fontWeight: '600' }}>{cultivo.nombre}</td>;
                        case 'variedad': {
                          const vs = Array.isArray(cultivo.variedades) && cultivo.variedades.length > 0
                            ? cultivo.variedades
                            : (cultivo.variedad ? [cultivo.variedad] : []);
                          if (vs.length === 0) return <td key="variedad">-</td>;
                          return (
                            <td key="variedad" data-testid={`cell-variedades-${cultivo._id}`}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {vs.map((v, i) => (
                                  <span key={`${v}-${i}`} style={{ padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '500', background: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 30%)', border: '1px solid hsl(142 76% 36% / 0.25)' }}>{v}</span>
                                ))}
                              </div>
                            </td>
                          );
                        }
                        case 'tipo': return <td key="tipo"><span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'hsl(142 76% 36% / 0.1)', color: 'hsl(142 76% 36%)' }}>{cultivo.tipo || '-'}</span></td>;
                        case 'unidad_medida': return <td key="unidad_medida">{cultivo.unidad_medida}</td>;
                        case 'ciclo': return <td key="ciclo">{cultivo.ciclo_cultivo || '-'}</td>;
                        case 'temporada': return <td key="temporada">{cultivo.temporada || '-'}</td>;
                        case 'familia_botanica': return <td key="familia_botanica">{cultivo.familia_botanica || '-'}</td>;
                        case 'estado': return <td key="estado"><span className={`badge ${cultivo.activo !== false ? 'badge-success' : 'badge-secondary'}`}>{cultivo.activo !== false ? 'Activo' : 'Inactivo'}</span></td>;
                        default: return null;
                      }
                    })}
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(cultivo)} title="Editar cultivo" data-testid={`btn-edit-cultivo-${cultivo._id}`}>
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button className="btn btn-sm btn-error" onClick={() => handleDelete(cultivo._id)} title="Eliminar cultivo" data-testid={`btn-delete-cultivo-${cultivo._id}`}>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Cultivos;
