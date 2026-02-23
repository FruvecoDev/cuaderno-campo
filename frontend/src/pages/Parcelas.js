import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Plus, Map as MapIcon, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Fix leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function DrawControl({ onPolygonCreated }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: true, metric: true },
        polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
      },
      edit: { featureGroup: drawnItems, remove: true }
    });
    
    map.addControl(drawControl);
    
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const latlngs = layer.getLatLngs()[0];
      const coordinates = latlngs.map(point => ({ lat: point.lat, lng: point.lng }));
      onPolygonCreated(coordinates);
    });
    
    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onPolygonCreated]);
  
  return null;
}

const Parcelas = () => {
  const [parcelas, setParcelas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [searchContrato, setSearchContrato] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [polygon, setPolygon] = useState([]);
  const { token } = useAuth();
  
  const [formData, setFormData] = useState({
    contrato_id: '',
    proveedor: '',
    cultivo: '',
    campana: '2025/26',
    variedad: '',
    superficie_total: '',
    codigo_plantacion: '',
    num_plantas: '',
    finca: ''
  });
  
  useEffect(() => {
    fetchParcelas();
    fetchContratos();
  }, []);
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setParcelas(data.parcelas || []);
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
    }
  };

  
  // Autocompletar campos cuando se selecciona un contrato
  useEffect(() => {
    if (formData.contrato_id) {
      const contrato = contratos.find(c => c._id === formData.contrato_id);
      if (contrato) {
        setFormData(prev => ({
          ...prev,
          proveedor: contrato.proveedor || '',
          cultivo: contrato.cultivo || '',
          campana: contrato.campana || '2025/26'
        }));
      }
    }
  }, [formData.contrato_id, contratos]);


  
  const handlePolygonCreated = (coords) => {
    setPolygon(coords);
    alert(`Polígono dibujado con ${coords.length} puntos`);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar contrato obligatorio
    if (!formData.contrato_id) {
      alert('Debes seleccionar un contrato. Toda parcela debe estar asociada a un contrato.');
      return;
    }
    
    // Si estamos editando, no requerir polígono nuevo
    if (!editingId && polygon.length < 3) {
      alert('Dibuja un polígono en el mapa primero');
      return;
    }
    
    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/parcelas/${editingId}`
        : `${BACKEND_URL}/api/parcelas`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        superficie_total: parseFloat(formData.superficie_total),
        num_plantas: parseInt(formData.num_plantas)
      };
      
      // Solo agregar geometría si estamos creando nueva o hay polígono nuevo
      if (!editingId || polygon.length >= 3) {
        payload.recintos = [{ geometria: polygon }];
      }
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchParcelas();
        setPolygon([]);
        setSearchContrato('');
        setFormData({
          contrato_id: '',
          proveedor: '', 
          cultivo: '', 
          campana: '2025/26', 
          variedad: '',
          superficie_total: '', 
          codigo_plantacion: '', 
          num_plantas: '', 
          finca: ''
        });
      }
    } catch (error) {
      console.error('Error saving parcela:', error);
    }
  };
  
  const handleEdit = (parcela) => {
    setEditingId(parcela._id);
    setFormData({
      contrato_id: parcela.contrato_id || '',
      proveedor: parcela.proveedor || '',
      cultivo: parcela.cultivo || '',
      campana: parcela.campana || '2025/26',
      variedad: parcela.variedad || '',
      superficie_total: parcela.superficie_total || '',
      codigo_plantacion: parcela.codigo_plantacion || '',
      num_plantas: parcela.num_plantas || '',
      finca: parcela.finca || ''
    });
    
    // Si tiene geometría, cargarla
    if (parcela.recintos && parcela.recintos.length > 0 && parcela.recintos[0].geometria) {
      setPolygon(parcela.recintos[0].geometria);
    }
    
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setPolygon([]);
    setSearchContrato('');
    setFormData({
      contrato_id: '',
      proveedor: '', 
      cultivo: '', 
      campana: '2025/26', 
      variedad: '',
      superficie_total: '', 
      codigo_plantacion: '', 
      num_plantas: '', 
      finca: ''
    });
  };
  
  const handleDelete = async (parcelaId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta parcela?')) {
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas/${parcelaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchParcelas();
      } else {
        alert('Error eliminando parcela');
      }
    } catch (error) {
      console.error('Error deleting parcela:', error);
      alert('Error eliminando parcela');
    }
  };
  
  return (
    <div data-testid="parcelas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Parcelas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} data-testid="btn-nueva-parcela">
          <Plus size={18} /> Nueva Parcela
        </button>
      </div>
      
      {showForm && (
        <div className="card mb-6">
          <h2 className="card-title">{editingId ? 'Editar Parcela' : 'Crear Parcela'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '1rem' }}><MapIcon size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />Mapa - Dibuja el polígono</h3>
              <MapContainer center={[37.0886, -2.3170]} zoom={13} style={{ height: '400px', width: '100%', borderRadius: '8px' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <DrawControl onPolygonCreated={handlePolygonCreated} />
                {polygon.length > 0 && <Polygon positions={polygon.map(p => [p.lat, p.lng])} color="green" />}
              </MapContainer>
              {polygon.length > 0 && <p className="text-sm text-muted" style={{ marginTop: '0.5rem' }}>✓ Polígono: {polygon.length} puntos</p>}
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1rem', padding: '0.75rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                  ⚠️ <strong>Importante:</strong> Toda parcela debe asociarse a un contrato. Busca y selecciona el contrato correspondiente.
                  {editingId && (
                    <><br />✏️ <strong>Editando:</strong> El mapa es opcional. Solo dibuja si quieres cambiar la geometría.</>
                  )}
                </p>
              </div>
              
              <div className="form-group">
                <label className="form-label">Contrato * (Obligatorio - define proveedor y cultivo)</label>
                
                {/* Input de búsqueda */}
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Buscar contrato por número, proveedor o cultivo..."
                  value={searchContrato}
                  onChange={(e) => setSearchContrato(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                
                <select
                  className="form-select"
                  value={formData.contrato_id}
                  onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}
                  required
                >
                  <option value="">-- Seleccionar contrato --</option>
                  {contratos
                    .filter(c => {
                      if (!searchContrato) return true;
                      const search = searchContrato.toLowerCase();
                      const contratoText = `${c.serie}-${c.año}-${String(c.numero).padStart(3, '0')} ${c.proveedor} ${c.cultivo} ${c.campana}`.toLowerCase();
                      return contratoText.includes(search);
                    })
                    .map(c => (
                      <option key={c._id} value={c._id}>
                        {c.serie}-{c.año}-{String(c.numero).padStart(3, '0')} - {c.proveedor} - {c.cultivo} ({c.campana})
                      </option>
                    ))
                  }
                </select>
                {searchContrato && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Mostrando {contratos.filter(c => {
                      const search = searchContrato.toLowerCase();
                      const contratoText = `${c.serie}-${c.año}-${String(c.numero).padStart(3, '0')} ${c.proveedor} ${c.cultivo} ${c.campana}`.toLowerCase();
                      return contratoText.includes(search);
                    }).length} de {contratos.length} contratos
                  </small>
                )}
              </div>
              
              <div className="form-group">
                <label className="form-label">Código Plantación *</label>
                <input type="text" className="form-input" value={formData.codigo_plantacion} onChange={(e) => setFormData({...formData, codigo_plantacion: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.proveedor} 
                  onChange={(e) => setFormData({...formData, proveedor: e.target.value})} 
                  disabled={formData.contrato_id !== ''}
                  required 
                />
                {formData.contrato_id && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Autocompletado desde contrato
                  </small>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Finca *</label>
                <input type="text" className="form-input" value={formData.finca} onChange={(e) => setFormData({...formData, finca: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Cultivo *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.cultivo} 
                  onChange={(e) => setFormData({...formData, cultivo: e.target.value})} 
                  disabled={formData.contrato_id !== ''}
                  required 
                />
                {formData.contrato_id && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Autocompletado desde contrato
                  </small>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Variedad *</label>
                <input type="text" className="form-input" value={formData.variedad} onChange={(e) => setFormData({...formData, variedad: e.target.value})} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Superficie (ha) *</label>
                  <input type="number" step="0.01" className="form-input" value={formData.superficie_total} onChange={(e) => setFormData({...formData, superficie_total: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nº Plantas *</label>
                  <input type="number" className="form-input" value={formData.num_plantas} onChange={(e) => setFormData({...formData, num_plantas: e.target.value})} required />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" data-testid="btn-guardar-parcela">
                  {editingId ? 'Actualizar Parcela' : 'Guardar Parcela'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Lista de Parcelas</h2>
        {loading ? <p>Cargando...</p> : parcelas.length === 0 ? <p className="text-muted">No hay parcelas registradas</p> : (
          <div className="table-container">
            <table data-testid="parcelas-table">
              <thead>
                <tr><th>Código</th><th>Proveedor</th><th>Finca</th><th>Cultivo</th><th>Variedad</th><th>Superficie</th><th>Plantas</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {parcelas.map((p) => (
                  <tr key={p._id}>
                    <td className="font-semibold">{p.codigo_plantacion}</td>
                    <td>{p.proveedor}</td>
                    <td>{p.finca}</td>
                    <td>{p.cultivo}</td>
                    <td>{p.variedad}</td>
                    <td>{p.superficie_total} ha</td>
                    <td>{p.num_plantas.toLocaleString()}</td>
                    <td><span className={`badge ${p.activo ? 'badge-success' : 'badge-default'}`}>{p.activo ? 'Activa' : 'Inactiva'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(p)}
                          title="Editar parcela"
                          data-testid={`edit-parcela-${p._id}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleDelete(p._id)}
                          title="Eliminar parcela"
                          data-testid={`delete-parcela-${p._id}`}
                        >
                          <Trash2 size={14} />
                        </button>
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

export default Parcelas;