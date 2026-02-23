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
    articulo_mp: '',
    cantidad: '',
    precio: '',
    periodo_desde: '',
    periodo_hasta: '',
    moneda: 'EUR',
    observaciones: ''
  });
  
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
      const response = await fetch(`${BACKEND_URL}/api/contratos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          cantidad: parseFloat(formData.cantidad),
          precio: parseFloat(formData.precio)
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        fetchContratos();
        setFormData({
          campana: '2025/26',
          procedencia: 'Campo',
          fecha_contrato: new Date().toISOString().split('T')[0],
          proveedor_id: '',
          cultivo_id: '',
          articulo_mp: '',
          cantidad: '',
          precio: '',
          periodo_desde: '',
          periodo_hasta: '',
          moneda: 'EUR',
          observaciones: ''
        });
      }
    } catch (error) {
      console.error('Error creating contrato:', error);
    }
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
          <h2 className="card-title">Crear Contrato</h2>
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
              
              <div className="form-group">
                <label className="form-label">Artículo MP (Opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.articulo_mp}
                  onChange={(e) => setFormData({...formData, articulo_mp: e.target.value})}
                  placeholder="Código de referencia interna (opcional)"
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
                Guardar Contrato
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
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