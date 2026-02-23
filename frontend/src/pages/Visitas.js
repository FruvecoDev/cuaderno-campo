import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Visitas = () => {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Catálogos para el formulario
  const [contratos, setContratos] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  
  // Maps para resolver IDs a nombres en tablas
  const [parcelasMap, setParcelasMap] = useState({});
  const [cultivosMap, setCultivosMap] = useState({});
  
  // Form data con nuevos campos obligatorios
  const [formData, setFormData] = useState({
    objetivo: 'Control Rutinario',
    fecha_visita: '',
    contrato_id: '',
    parcela_id: '',
    cultivo_id: '',
    campana: '',
    observaciones: ''
  });
  
  useEffect(() => {
    fetchVisitas();
    fetchContratos();
    fetchParcelas(); // Cargar TODAS las parcelas para el map
    fetchCultivos();
  }, []);
  
  useEffect(() => {
    // Cuando se selecciona un contrato, autocompletar campaña y filtrar parcelas
    if (formData.contrato_id) {
      const contrato = contratos.find(c => c._id === formData.contrato_id);
      if (contrato) {
        setFormData(prev => ({
          ...prev,
          campana: contrato.campana,
          cultivo_id: contrato.cultivo_id || ''
        }));
        // Filtrar parcelas por campaña (en producción, deberías tener este filtro en backend)
        fetchParcelas(contrato.campana);
      }
    }
  }, [formData.contrato_id, contratos]);
  
  const fetchContratos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/contratos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setContratos(data.contratos || []);
      }
    } catch (error) {
      console.error('Error fetching contratos:', error);
    }
  };
  
  const fetchParcelas = async (campana = null) => {
    try {
      let url = `${BACKEND_URL}/api/parcelas`;
      if (campana) {
        url += `?campana=${encodeURIComponent(campana)}`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const parcelasList = data.parcelas || [];
        setParcelas(parcelasList);
        
        // Construir map de parcela_id -> nombre
        const map = {};
        parcelasList.forEach(p => {
          map[p._id] = `${p.codigo_plantacion} - ${p.variedad}`;
        });
        setParcelasMap(map);
      }
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    }
  };
  
  const fetchCultivos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/cultivos?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const cultivosList = data.cultivos || [];
        setCultivos(cultivosList);
        
        // Construir map de cultivo_id -> nombre
        const map = {};
        cultivosList.forEach(c => {
          map[c._id] = `${c.nombre} ${c.variedad ? `- ${c.variedad}` : ''}`.trim();
        });
        setCultivosMap(map);
      }
    } catch (error) {
      console.error('Error fetching cultivos:', error);
    }
  };
  
  const fetchVisitas = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/visitas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setVisitas(data.visitas || []);
    } catch (error) {
      console.error('Error fetching visitas:', error);
      const errorMsg = handlePermissionError(error, 'ver las visitas');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar campos obligatorios
    if (!formData.parcela_id || !formData.cultivo_id || !formData.campana) {
      setError('Debe seleccionar Parcela, Cultivo y Campaña');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/visitas/${editingId}`
        : `${BACKEND_URL}/api/visitas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchVisitas();
        // Reset form
        setFormData({
          objetivo: 'Control Rutinario',
          fecha_visita: '',
          contrato_id: '',
          parcela_id: '',
          cultivo_id: '',
          campana: '',
          observaciones: ''
        });
      }
    } catch (error) {
      console.error('Error saving visita:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar la visita' : 'crear la visita');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (visita) => {
    setEditingId(visita._id);
    setFormData({
      objetivo: visita.objetivo || 'Control Rutinario',
      fecha_visita: visita.fecha_visita || '',
      contrato_id: visita.contrato_id || '',
      parcela_id: visita.parcela_id || '',
      cultivo_id: visita.cultivo_id || '',
      campana: visita.campana || '',
      observaciones: visita.observaciones || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      objetivo: 'Control Rutinario',
      fecha_visita: '',
      contrato_id: '',
      parcela_id: '',
      cultivo_id: '',
      campana: '',
      observaciones: ''
    });
  };
  
  const handleDelete = async (visitaId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar visitas');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta visita?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/visitas/${visitaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchVisitas();
    } catch (error) {
      console.error('Error deleting visita:', error);
      const errorMsg = handlePermissionError(error, 'eliminar la visita');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  return (
    <div data-testid="visitas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Visitas</h1>
        <PermissionButton
          permission="create"
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          data-testid="btn-nueva-visita"
        >
          <Plus size={18} />
          Nueva Visita
        </PermissionButton>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {showForm && (
        <div className="card mb-6" data-testid="visita-form">
          <h2 className="card-title">{editingId ? 'Editar Visita' : 'Crear Visita'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Información de la alerta sobre el flujo */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                💡 <strong>Flujo guiado:</strong> Selecciona un Contrato (opcional) para autocompletar la Campaña y Cultivo, o completa manualmente los campos obligatorios.
              </p>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Objetivo *</label>
                <select
                  className="form-select"
                  value={formData.objetivo}
                  onChange={(e) => setFormData({...formData, objetivo: e.target.value})}
                  required
                >
                  <option value="Control Rutinario">Control Rutinario</option>
                  <option value="Informe">Informe</option>
                  <option value="Evaluación">Evaluación</option>
                  <option value="Plagas y Enfermedades">Plagas y Enfermedades</option>
                  <option value="Cosecha">Cosecha</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Fecha Visita</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_visita}
                  onChange={(e) => setFormData({...formData, fecha_visita: e.target.value})}
                />
              </div>
            </div>
            
            {/* Contrato (opcional - ayuda a autocompletar) */}
            <div className="form-group">
              <label className="form-label">Contrato (Opcional - autocompletará Campaña y Cultivo)</label>
              <select
                className="form-select"
                value={formData.contrato_id}
                onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}
              >
                <option value="">Seleccionar contrato...</option>
                {contratos.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.serie}-{c.año}-{String(c.numero).padStart(3, '0')} - {c.proveedor} - {c.cultivo} ({c.campana})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Campos obligatorios */}
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Parcela *</label>
                <select
                  className="form-select"
                  value={formData.parcela_id}
                  onChange={(e) => setFormData({...formData, parcela_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar parcela...</option>
                  {parcelas.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.codigo_plantacion} - {p.variedad} ({p.superficie_total} {p.unidad_medida})
                    </option>
                  ))}
                </select>
                {parcelas.length === 0 && formData.campana && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    No hay parcelas para la campaña {formData.campana}
                  </small>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Cultivo *</label>
                <select
                  className="form-select"
                  value={formData.cultivo_id}
                  onChange={(e) => setFormData({...formData, cultivo_id: e.target.value})}
                  required
                  disabled={formData.contrato_id !== ''}
                >
                  <option value="">Seleccionar cultivo...</option>
                  {cultivos.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.nombre} {c.variedad ? `- ${c.variedad}` : ''} ({c.tipo})
                    </option>
                  ))}
                </select>
                {formData.contrato_id && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Autocompletado desde contrato
                  </small>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Campaña *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.campana}
                  onChange={(e) => setFormData({...formData, campana: e.target.value})}
                  placeholder="Ej: 2025/26"
                  required
                  disabled={formData.contrato_id !== ''}
                />
                {formData.contrato_id && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Autocompletado desde contrato
                  </small>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-textarea"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Notas, incidencias observadas, recomendaciones..."
                rows="4"
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-visita">
                {editingId ? 'Actualizar Visita' : 'Guardar Visita'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Lista de Visitas</h2>
        {loading ? (
          <p>Cargando visitas...</p>
        ) : visitas.length === 0 ? (
          <p className="text-muted">No hay visitas registradas. Crea la primera!</p>
        ) : (
          <div className="table-container">
            <table data-testid="visitas-table">
              <thead>
                <tr>
                  <th>Objetivo</th>
                  <th>Parcela</th>
                  <th>Cultivo</th>
                  <th>Campaña</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {visitas.map((visita) => (
                  <tr key={visita._id}>
                    <td className="font-semibold">{visita.objetivo}</td>
                    <td>
                      {visita.parcela_id ? (
                        parcelasMap[visita.parcela_id] || visita.parcela_id
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }} title="Registro anterior a la implementación de catálogos">
                          No especificado
                        </span>
                      )}
                    </td>
                    <td>
                      {visita.cultivo_id ? (
                        cultivosMap[visita.cultivo_id] || visita.cultivo
                      ) : visita.cultivo ? (
                        visita.cultivo
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }} title="Registro anterior a la implementación de catálogos">
                          No especificado
                        </span>
                      )}
                    </td>
                    <td>
                      {visita.campana ? (
                        visita.campana
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }} title="Registro anterior a la implementación de catálogos">
                          No especificado
                        </span>
                      )}
                    </td>
                    <td>{visita.fecha_visita ? new Date(visita.fecha_visita).toLocaleDateString() : 'Sin fecha'}</td>
                    <td>
                      <span className={`badge ${visita.realizado ? 'badge-success' : 'badge-default'}`}>
                        {visita.realizado ? 'Realizada' : 'Pendiente'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              title="Editar visita"
                              data-testid={`edit-visita-${visita._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(visita._id)}
                              title="Eliminar visita"
                              data-testid={`delete-visita-${visita._id}`}
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

export default Visitas;
