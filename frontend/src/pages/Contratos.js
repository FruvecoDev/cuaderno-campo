import React, { useState, useEffect } from 'react';
import { Plus, Download, FileText, Edit2, Trash2 } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Contratos = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Estados para catálogos
  const [proveedores, setProveedores] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  
  const [formData, setFormData] = useState({
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
    precios_calidad: []
  });
  
  // Estado para saber si el cultivo seleccionado es guisante
  const selectedCultivo = cultivos.find(c => c._id === formData.cultivo_id);
  const isGuisante = selectedCultivo?.nombre?.toLowerCase().includes('guisante');
  
  useEffect(() => {
    fetchContratos();
    fetchProveedores();
    fetchCultivos();
  }, []);
  
  const fetchProveedores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/proveedores?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProveedores(data.proveedores || []);
      }
    } catch (error) {
      console.error('Error fetching proveedores:', error);
    }
  };
  
  const fetchCultivos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/cultivos?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCultivos(data.cultivos || []);
      }
    } catch (error) {
      console.error('Error fetching cultivos:', error);
    }
  };
  
  const fetchContratos = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/contratos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setContratos(data.contratos || []);
    } catch (error) {
      console.error('Error fetching contratos:', error);
      const errorMsg = handlePermissionError(error, 'ver los contratos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/contratos/${editingId}`
        : `${BACKEND_URL}/api/contratos`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Preparar datos incluyendo precios_calidad si es guisante
      const submitData = {
        ...formData,
        cantidad: parseFloat(formData.cantidad),
        precio: parseFloat(formData.precio),
        precios_calidad: isGuisante ? formData.precios_calidad.map(pc => ({
          ...pc,
          min_tenderometria: parseFloat(pc.min_tenderometria),
          max_tenderometria: parseFloat(pc.max_tenderometria),
          precio: parseFloat(pc.precio)
        })) : []
      };
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchContratos();
        setFormData({
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
          precios_calidad: []
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
        ...formData.precios_calidad,
        { min_tenderometria: '', max_tenderometria: '', precio: '', calidad: 'standard' }
      ]
    });
  };
  
  const removePrecioTenderometria = (index) => {
    setFormData({
      ...formData,
      precios_calidad: formData.precios_calidad.filter((_, i) => i !== index)
    });
  };
  
  const updatePrecioTenderometria = (index, field, value) => {
    const updated = [...formData.precios_calidad];
    updated[index][field] = value;
    setFormData({ ...formData, precios_calidad: updated });
  };
  
  const handleEdit = (contrato) => {
    setEditingId(contrato._id);
    setFormData({
      campana: contrato.campana || '2025/26',
      procedencia: contrato.procedencia || 'Campo',
      fecha_contrato: contrato.fecha_contrato || new Date().toISOString().split('T')[0],
      proveedor_id: contrato.proveedor_id || '',
      cultivo_id: contrato.cultivo_id || '',
      cantidad: contrato.cantidad || '',
      precio: contrato.precio || '',
      periodo_desde: contrato.periodo_desde || '',
      periodo_hasta: contrato.periodo_hasta || '',
      moneda: contrato.moneda || 'EUR',
      observaciones: contrato.observaciones || ''
    });
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
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
      precios_calidad: []
    });
  };
  
  const handleDelete = async (contratoId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar contratos');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este contrato?')) {
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchContratos();
    } catch (error) {
      console.error('Error deleting contrato:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el contrato');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  return (
    <div data-testid="contratos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Contratos</h1>
        <PermissionButton
          permission="create"
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          data-testid="btn-nuevo-contrato"
        >
          <Plus size={18} />
          Nuevo Contrato
        </PermissionButton>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {showForm && (
        <div className="card mb-6" data-testid="contrato-form">
          <h2 className="card-title">{editingId ? 'Editar Contrato' : 'Crear Contrato'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Campaña *</label>
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
                <label className="form-label">Fecha Contrato *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_contrato}
                  onChange={(e) => setFormData({...formData, fecha_contrato: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <select
                  className="form-select"
                  value={formData.proveedor_id}
                  onChange={(e) => setFormData({...formData, proveedor_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} {p.cif_nif ? `(${p.cif_nif})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Cultivo *</label>
                <select
                  className="form-select"
                  value={formData.cultivo_id}
                  onChange={(e) => setFormData({...formData, cultivo_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar cultivo...</option>
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
                <label className="form-label">Precio (€/kg) *</label>
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
                <label className="form-label">Periodo Desde *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.periodo_desde}
                  onChange={(e) => setFormData({...formData, periodo_desde: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Periodo Hasta *</label>
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
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-textarea"
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Observaciones adicionales..."
              />
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-contrato">
                {editingId ? 'Actualizar Contrato' : 'Guardar Contrato'}
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
        <h2 className="card-title">Lista de Contratos</h2>
        {loading ? (
          <p>Cargando contratos...</p>
        ) : contratos.length === 0 ? (
          <p className="text-muted">No hay contratos registrados. Crea el primero!</p>
        ) : (
          <div className="table-container">
            <table data-testid="contratos-table">
              <thead>
                <tr>
                  <th>ID Contrato</th>
                  <th>Campaña</th>
                  <th>Proveedor</th>
                  <th>Cultivo</th>
                  <th>Cantidad (kg)</th>
                  <th>Precio (€/kg)</th>
                  <th>Total (€)</th>
                  <th>Fecha</th>
                  {(canEdit || canDelete) && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato) => (
                  <tr key={contrato._id}>
                    <td className="font-semibold">{contrato.serie}-{contrato.año}-{String(contrato.numero).padStart(3, '0')}</td>
                    <td>{contrato.campana}</td>
                    <td>{contrato.proveedor}</td>
                    <td>{contrato.cultivo}</td>
                    <td>{contrato.cantidad.toLocaleString()}</td>
                    <td>€{contrato.precio.toFixed(2)}</td>
                    <td className="font-semibold">€{(contrato.cantidad * contrato.precio).toFixed(2)}</td>
                    <td>{new Date(contrato.fecha_contrato).toLocaleDateString()}</td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(contrato)}
                              title="Editar contrato"
                              data-testid={`edit-contrato-${contrato._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
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

export default Contratos;