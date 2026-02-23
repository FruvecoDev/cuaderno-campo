import React, { useState, useEffect } from 'react';
import { Plus, Download, FileText } from 'lucide-react';
import { PermissionButton, usePermissions } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Contratos = () => {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions();
  const [formData, setFormData] = useState({
    campana: '2025/26',
    procedencia: 'Campo',
    fecha_contrato: new Date().toISOString().split('T')[0],
    proveedor: '',
    cultivo: '',
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
  }, []);
  
  const fetchContratos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/contratos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setContratos(data.contratos || []);
    } catch (error) {
      console.error('Error fetching contratos:', error);
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
          proveedor: '',
          cultivo: '',
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
                <input
                  type="text"
                  className="form-input"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                  placeholder="Nombre del proveedor"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Cultivo *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.cultivo}
                  onChange={(e) => setFormData({...formData, cultivo: e.target.value})}
                  placeholder="Tipo de cultivo"
                  required
                />
              </div>
            </div>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Artículo MP *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.articulo_mp}
                  onChange={(e) => setFormData({...formData, articulo_mp: e.target.value})}
                  placeholder="Artículo de materia prima"
                  required
                />
              </div>
              
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