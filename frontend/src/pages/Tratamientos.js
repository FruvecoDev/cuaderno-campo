import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Tratamientos = () => {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Catálogos para el formulario
  const [contratos, setContratos] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [selectedParcelas, setSelectedParcelas] = useState([]);
  
  // Maps para resolver IDs a nombres en tablas
  const [cultivosMap, setCultivosMap] = useState({});
  
  // Form data con nuevos campos obligatorios
  const [formData, setFormData] = useState({
    tipo_tratamiento: 'FITOSANITARIOS',
    subtipo: 'Insecticida',
    aplicacion_numero: 1,
    metodo_aplicacion: 'Pulverización',
    superficie_aplicacion: '',
    caldo_superficie: '',
    contrato_id: '',
    cultivo_id: '',
    campana: '',
    parcelas_ids: []
  });
  
  useEffect(() => {
    fetchTratamientos();
    fetchContratos();
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
        // Filtrar parcelas por campaña
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
        setParcelas(data.parcelas || []);
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
    
    // Validar campos obligatorios
    if (!formData.cultivo_id || !formData.campana) {
      setError('Debe seleccionar Cultivo y Campaña');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (formData.parcelas_ids.length === 0) {
      setError('Debe seleccionar al menos una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const payload = {
        ...formData,
        superficie_aplicacion: parseFloat(formData.superficie_aplicacion),
        caldo_superficie: parseFloat(formData.caldo_superficie),
        caldo_total: 0,
        volumen_cuba: 0
      };
      
      const response = await fetch(`${BACKEND_URL}/api/tratamientos`, {
        method: 'POST',
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
        fetchTratamientos();
        // Reset form
        setFormData({
          tipo_tratamiento: 'FITOSANITARIOS',
          subtipo: 'Insecticida',
          aplicacion_numero: 1,
          metodo_aplicacion: 'Pulverización',
          superficie_aplicacion: '',
          caldo_superficie: '',
          contrato_id: '',
          cultivo_id: '',
          campana: '',
          parcelas_ids: []
        });
        setSelectedParcelas([]);
      }
    } catch (error) {
      console.error('Error creating tratamiento:', error);
      const errorMsg = handlePermissionError(error, 'crear el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
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
          <h2 className="card-title">Crear Tratamiento</h2>
          <form onSubmit={handleSubmit}>
            {/* Información de la alerta sobre el flujo */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                💡 <strong>Flujo guiado:</strong> Selecciona un Contrato (opcional) para autocompletar la Campaña y Cultivo, o completa manualmente. Puedes seleccionar múltiples parcelas.
              </p>
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
            
            {/* Tipo de tratamiento */}
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Tipo de Tratamiento *</label>
                <select
                  className="form-select"
                  value={formData.tipo_tratamiento}
                  onChange={(e) => setFormData({...formData, tipo_tratamiento: e.target.value})}
                  required
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
                >
                  <option value="Pulverización">Pulverización</option>
                  <option value="Quimigación">Quimigación (fertirrigación)</option>
                  <option value="Espolvoreo">Espolvoreo</option>
                  <option value="Aplicación Foliar">Aplicación Foliar</option>
                  <option value="Aplicación al Suelo">Aplicación al Suelo</option>
                </select>
              </div>
            </div>
            
            {/* Contexto agronómico obligatorio */}
            <div className="grid-3">
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
              
              <div className="form-group">
                <label className="form-label">Nº Aplicación *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={formData.aplicacion_numero}
                  onChange={(e) => setFormData({...formData, aplicacion_numero: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>
            
            {/* Selección de parcelas (múltiple) */}
            <div className="form-group">
              <label className="form-label">Parcelas a Tratar * (selecciona una o varias)</label>
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
                    {formData.campana ? `No hay parcelas para la campaña ${formData.campana}` : 'Selecciona un contrato o campaña para ver parcelas'}
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
                      />
                      <span>
                        <strong>{p.codigo_plantacion}</strong> - {p.variedad} ({p.superficie_total} {p.unidad_medida})
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
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-tratamiento">
                Guardar Tratamiento
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setSelectedParcelas([]);
                }}
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
                  <th>Cultivo</th>
                  <th>Campaña</th>
                  <th>Superficie</th>
                  <th>Coste</th>
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
                    <td>
                      {tratamiento.cultivo_id ? (
                        tratamiento.cultivo_id
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }} title="Registro anterior a la implementación de catálogos">
                          No especificado
                        </span>
                      )}
                    </td>
                    <td>
                      {tratamiento.campana ? (
                        tratamiento.campana
                      ) : (
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }} title="Registro anterior a la implementación de catálogos">
                          No especificado
                        </span>
                      )}
                    </td>
                    <td>{tratamiento.superficie_aplicacion} ha</td>
                    <td>€{tratamiento.coste_total ? tratamiento.coste_total.toFixed(2) : '0.00'}</td>
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
