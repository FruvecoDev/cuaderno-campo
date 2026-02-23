import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';
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
  
  // Solo necesitamos parcelas para el selector
  const [parcelas, setParcelas] = useState([]);
  const [selectedParcelaInfo, setSelectedParcelaInfo] = useState(null);
  
  // Form data SIMPLIFICADO - solo parcela_id es obligatorio
  const [formData, setFormData] = useState({
    objetivo: 'Control Rutinario',
    fecha_visita: '',
    parcela_id: '',
    observaciones: ''
  });
  
  useEffect(() => {
    fetchVisitas();
    fetchParcelas();
  }, []);
  
  // Cuando se selecciona una parcela, mostrar info heredada
  useEffect(() => {
    if (formData.parcela_id) {
      const parcela = parcelas.find(p => p._id === formData.parcela_id);
      setSelectedParcelaInfo(parcela || null);
    } else {
      setSelectedParcelaInfo(null);
    }
  }, [formData.parcela_id, parcelas]);
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setParcelas(data.parcelas || []);
      }
    } catch (error) {
      console.error('Error fetching parcelas:', error);
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
    
    // Validar solo parcela_id (obligatorio)
    if (!formData.parcela_id) {
      setError('Debe seleccionar una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/visitas/${editingId}`
        : `${BACKEND_URL}/api/visitas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Payload simplificado - el backend hereda el resto
      const payload = {
        objetivo: formData.objetivo,
        parcela_id: formData.parcela_id,
        fecha_visita: formData.fecha_visita,
        observaciones: formData.observaciones
      };
      
      const response = await fetch(url, {
        method: method,
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
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchVisitas();
        setFormData({
          objetivo: 'Control Rutinario',
          fecha_visita: '',
          parcela_id: '',
          observaciones: ''
        });
        setSelectedParcelaInfo(null);
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
      parcela_id: visita.parcela_id || '',
      observaciones: visita.observaciones || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setSelectedParcelaInfo(null);
    setFormData({
      objetivo: 'Control Rutinario',
      fecha_visita: '',
      parcela_id: '',
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
            {/* Información del modelo simplificado */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                <Info size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Modelo simplificado:</strong> Solo selecciona la Parcela. El Contrato, Proveedor, Cultivo y Campaña se heredan automáticamente.
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
                  data-testid="select-objetivo"
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
                  data-testid="input-fecha-visita"
                />
              </div>
            </div>
            
            {/* SELECTOR DE PARCELA - Único campo obligatorio */}
            <div className="form-group">
              <label className="form-label">Parcela * (Obligatorio - define el contexto)</label>
              <select
                className="form-select"
                value={formData.parcela_id}
                onChange={(e) => setFormData({...formData, parcela_id: e.target.value})}
                required
                data-testid="select-parcela"
              >
                <option value="">Seleccionar parcela...</option>
                {parcelas.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.codigo_plantacion} - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.campana}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Mostrar información heredada de la parcela seleccionada */}
            {selectedParcelaInfo && (
              <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos heredados de la parcela:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {selectedParcelaInfo.proveedor}</div>
                  <div><strong>Cultivo:</strong> {selectedParcelaInfo.cultivo}</div>
                  <div><strong>Variedad:</strong> {selectedParcelaInfo.variedad}</div>
                  <div><strong>Campaña:</strong> {selectedParcelaInfo.campana}</div>
                  <div><strong>Finca:</strong> {selectedParcelaInfo.finca}</div>
                  <div><strong>Superficie:</strong> {selectedParcelaInfo.superficie_total} ha</div>
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-textarea"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Notas, incidencias observadas, recomendaciones..."
                rows="4"
                data-testid="textarea-observaciones"
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
                  <th>Proveedor</th>
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
                    <td>{visita.codigo_plantacion || 'N/A'}</td>
                    <td>{visita.proveedor || 'N/A'}</td>
                    <td>{visita.cultivo || 'N/A'}</td>
                    <td>{visita.campana || 'N/A'}</td>
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
                              onClick={() => handleEdit(visita)}
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
