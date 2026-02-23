import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Tratamientos = () => {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Solo necesitamos parcelas para el selector
  const [parcelas, setParcelas] = useState([]);
  const [selectedParcelas, setSelectedParcelas] = useState([]);
  const [selectedParcelasInfo, setSelectedParcelasInfo] = useState(null);
  
  // Form data SIMPLIFICADO
  const [formData, setFormData] = useState({
    tipo_tratamiento: 'FITOSANITARIOS',
    subtipo: 'Insecticida',
    aplicacion_numero: 1,
    metodo_aplicacion: 'Pulverización',
    superficie_aplicacion: '',
    caldo_superficie: '',
    parcelas_ids: []
  });
  
  useEffect(() => {
    fetchTratamientos();
    fetchParcelas();
  }, []);
  
  // Cuando se seleccionan parcelas, mostrar info heredada de la primera
  useEffect(() => {
    if (selectedParcelas.length > 0) {
      const firstParcela = parcelas.find(p => p._id === selectedParcelas[0]);
      setSelectedParcelasInfo(firstParcela || null);
    } else {
      setSelectedParcelasInfo(null);
    }
  }, [selectedParcelas, parcelas]);
  
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
  
  const fetchTratamientos = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/tratamientos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setTratamientos(data.tratamientos || []);
    } catch (error) {
      console.error('Error fetching tratamientos:', error);
      const errorMsg = handlePermissionError(error, 'ver los tratamientos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleParcelaSelection = (parcelaId) => {
    const isSelected = selectedParcelas.includes(parcelaId);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedParcelas.filter(id => id !== parcelaId);
    } else {
      newSelection = [...selectedParcelas, parcelaId];
    }
    
    setSelectedParcelas(newSelection);
    setFormData(prev => ({ ...prev, parcelas_ids: newSelection }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar solo parcelas_ids (obligatorio)
    if (formData.parcelas_ids.length === 0) {
      setError('Debe seleccionar al menos una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/tratamientos/${editingId}`
        : `${BACKEND_URL}/api/tratamientos`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Payload simplificado - el backend hereda el resto
      const payload = {
        tipo_tratamiento: formData.tipo_tratamiento,
        subtipo: formData.subtipo,
        aplicacion_numero: parseInt(formData.aplicacion_numero),
        metodo_aplicacion: formData.metodo_aplicacion,
        superficie_aplicacion: parseFloat(formData.superficie_aplicacion) || 0,
        caldo_superficie: parseFloat(formData.caldo_superficie) || 0,
        parcelas_ids: formData.parcelas_ids
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
        fetchTratamientos();
        setFormData({
          tipo_tratamiento: 'FITOSANITARIOS',
          subtipo: 'Insecticida',
          aplicacion_numero: 1,
          metodo_aplicacion: 'Pulverización',
          superficie_aplicacion: '',
          caldo_superficie: '',
          parcelas_ids: []
        });
        setSelectedParcelas([]);
        setSelectedParcelasInfo(null);
      }
    } catch (error) {
      console.error('Error saving tratamiento:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el tratamiento' : 'crear el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (tratamiento) => {
    setEditingId(tratamiento._id);
    setFormData({
      tipo_tratamiento: tratamiento.tipo_tratamiento || 'FITOSANITARIOS',
      subtipo: tratamiento.subtipo || 'Insecticida',
      aplicacion_numero: tratamiento.aplicacion_numero || 1,
      metodo_aplicacion: tratamiento.metodo_aplicacion || 'Pulverización',
      superficie_aplicacion: tratamiento.superficie_aplicacion || '',
      caldo_superficie: tratamiento.caldo_superficie || '',
      parcelas_ids: tratamiento.parcelas_ids || []
    });
    setSelectedParcelas(tratamiento.parcelas_ids || []);
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setSelectedParcelas([]);
    setSelectedParcelasInfo(null);
    setFormData({
      tipo_tratamiento: 'FITOSANITARIOS',
      subtipo: 'Insecticida',
      aplicacion_numero: 1,
      metodo_aplicacion: 'Pulverización',
      superficie_aplicacion: '',
      caldo_superficie: '',
      parcelas_ids: []
    });
  };
  
  const handleDelete = async (tratamientoId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar tratamientos');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este tratamiento?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/tratamientos/${tratamientoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchTratamientos();
    } catch (error) {
      console.error('Error deleting tratamiento:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  return (
    <div data-testid="tratamientos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tratamientos</h1>
        <PermissionButton
          permission="create"
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          data-testid="btn-nuevo-tratamiento"
        >
          <Plus size={18} />
          Nuevo Tratamiento
        </PermissionButton>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {showForm && (
        <div className="card mb-6" data-testid="tratamiento-form">
          <h2 className="card-title">{editingId ? 'Editar Tratamiento' : 'Crear Tratamiento'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Información del modelo simplificado */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                <Info size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Modelo simplificado:</strong> Solo selecciona las Parcelas. El Contrato, Cultivo y Campaña se heredan automáticamente de la primera parcela seleccionada.
              </p>
            </div>
            
            {/* Tipo de tratamiento */}
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Tipo de Tratamiento *</label>
                <select
                  className="form-select"
                  value={formData.tipo_tratamiento}
                  onChange={(e) => setFormData({...formData, tipo_tratamiento: e.target.value})}
                  required
                  data-testid="select-tipo-tratamiento"
                >
                  <option value="FITOSANITARIOS">Fitosanitarios</option>
                  <option value="NUTRICIÓN">Nutrición</option>
                  <option value="ENMIENDAS">Enmiendas</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Subtipo</label>
                <select
                  className="form-select"
                  value={formData.subtipo}
                  onChange={(e) => setFormData({...formData, subtipo: e.target.value})}
                  data-testid="select-subtipo"
                >
                  <option value="Insecticida">Insecticida</option>
                  <option value="Fungicida">Fungicida</option>
                  <option value="Herbicida">Herbicida</option>
                  <option value="Acaricida">Acaricida</option>
                  <option value="Fertilizante">Fertilizante</option>
                  <option value="Bioestimulante">Bioestimulante</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Método de Aplicación *</label>
                <select
                  className="form-select"
                  value={formData.metodo_aplicacion}
                  onChange={(e) => setFormData({...formData, metodo_aplicacion: e.target.value})}
                  required
                  data-testid="select-metodo-aplicacion"
                >
                  <option value="Pulverización">Pulverización</option>
                  <option value="Quimigación">Quimigación (fertirrigación)</option>
                  <option value="Espolvoreo">Espolvoreo</option>
                  <option value="Aplicación Foliar">Aplicación Foliar</option>
                  <option value="Aplicación al Suelo">Aplicación al Suelo</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Nº Aplicación *</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={formData.aplicacion_numero}
                onChange={(e) => setFormData({...formData, aplicacion_numero: parseInt(e.target.value)})}
                required
                style={{ maxWidth: '150px' }}
                data-testid="input-aplicacion-numero"
              />
            </div>
            
            {/* Selección de parcelas (múltiple) - ÚNICO CAMPO OBLIGATORIO */}
            <div className="form-group">
              <label className="form-label">Parcelas a Tratar * (Obligatorio - selecciona una o varias)</label>
              <div style={{ 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '0.5rem', 
                padding: '1rem', 
                maxHeight: '200px', 
                overflowY: 'auto',
                backgroundColor: 'hsl(var(--background))'
              }}>
                {parcelas.length === 0 ? (
                  <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                    No hay parcelas disponibles. Crea una parcela primero.
                  </p>
                ) : (
                  parcelas.map(p => (
                    <label 
                      key={p._id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0.5rem', 
                        cursor: 'pointer',
                        borderBottom: '1px solid hsl(var(--border))'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParcelas.includes(p._id)}
                        onChange={() => handleParcelaSelection(p._id)}
                        style={{ marginRight: '0.75rem' }}
                        data-testid={`checkbox-parcela-${p._id}`}
                      />
                      <span>
                        <strong>{p.codigo_plantacion}</strong> - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.superficie_total} ha
                      </span>
                    </label>
                  ))
                )}
              </div>
              {selectedParcelas.length > 0 && (
                <small style={{ color: 'hsl(var(--primary))' }}>
                  {selectedParcelas.length} parcela(s) seleccionada(s)
                </small>
              )}
            </div>
            
            {/* Mostrar información heredada de la primera parcela seleccionada */}
            {selectedParcelasInfo && (
              <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos heredados (de la primera parcela):</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {selectedParcelasInfo.proveedor}</div>
                  <div><strong>Cultivo:</strong> {selectedParcelasInfo.cultivo}</div>
                  <div><strong>Campaña:</strong> {selectedParcelasInfo.campana}</div>
                  <div><strong>Finca:</strong> {selectedParcelasInfo.finca}</div>
                </div>
              </div>
            )}
            
            {/* Datos técnicos */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Superficie a Tratar (ha) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.superficie_aplicacion}
                  onChange={(e) => setFormData({...formData, superficie_aplicacion: e.target.value})}
                  required
                  data-testid="input-superficie-aplicacion"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Caldo por Superficie (L/ha) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.caldo_superficie}
                  onChange={(e) => setFormData({...formData, caldo_superficie: e.target.value})}
                  placeholder="Litros por hectárea"
                  required
                  data-testid="input-caldo-superficie"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-tratamiento">
                {editingId ? 'Actualizar Tratamiento' : 'Guardar Tratamiento'}
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
        <h2 className="card-title">Lista de Tratamientos</h2>
        {loading ? (
          <p>Cargando tratamientos...</p>
        ) : tratamientos.length === 0 ? (
          <p className="text-muted">No hay tratamientos registrados. Crea el primero!</p>
        ) : (
          <div className="table-container">
            <table data-testid="tratamientos-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Subtipo</th>
                  <th>Método</th>
                  <th>Campaña</th>
                  <th>Superficie</th>
                  <th>Parcelas</th>
                  <th>Estado</th>
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {tratamientos.map((tratamiento) => (
                  <tr key={tratamiento._id}>
                    <td className="font-semibold">{tratamiento.tipo_tratamiento}</td>
                    <td>{tratamiento.subtipo || '—'}</td>
                    <td>{tratamiento.metodo_aplicacion}</td>
                    <td>{tratamiento.campana || 'N/A'}</td>
                    <td>{tratamiento.superficie_aplicacion} ha</td>
                    <td>{tratamiento.parcelas_ids?.length || 0} parcela(s)</td>
                    <td>
                      <span className={`badge ${tratamiento.realizado ? 'badge-success' : 'badge-default'}`}>
                        {tratamiento.realizado ? 'Realizado' : 'Pendiente'}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(tratamiento)}
                              title="Editar tratamiento"
                              data-testid={`edit-tratamiento-${tratamiento._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(tratamiento._id)}
                              title="Eliminar tratamiento"
                              data-testid={`delete-tratamiento-${tratamiento._id}`}
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

export default Tratamientos;
