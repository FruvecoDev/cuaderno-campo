import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Plus, Map as MapIcon } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [polygon, setPolygon] = useState([]);
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
      const response = await fetch(`${BACKEND_URL}/api/parcelas`);
      const data = await response.json();
      setParcelas(data.parcelas || []);
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePolygonCreated = (coords) => {
    setPolygon(coords);
    alert(`Polígono dibujado con ${coords.length} puntos`);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (polygon.length < 3) {
      alert('Dibuja un polígono en el mapa primero');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          superficie_total: parseFloat(formData.superficie_total),
          num_plantas: parseInt(formData.num_plantas),
          recintos: [{ geometria: polygon }]
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        fetchParcelas();
        setPolygon([]);
        setFormData({
          proveedor: '', cultivo: '', campana: '2025/26', variedad: '',
          superficie_total: '', codigo_plantacion: '', num_plantas: '', finca: ''
        });
      }
    } catch (error) {
      console.error('Error creating parcela:', error);
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
          <h2 className="card-title">Crear Parcela</h2>
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
              <div className="form-group">
                <label className="form-label">Código Plantación *</label>
                <input type="text" className="form-input" value={formData.codigo_plantacion} onChange={(e) => setFormData({...formData, codigo_plantacion: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Proveedor *</label>
                <input type="text" className="form-input" value={formData.proveedor} onChange={(e) => setFormData({...formData, proveedor: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Finca *</label>
                <input type="text" className="form-input" value={formData.finca} onChange={(e) => setFormData({...formData, finca: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Cultivo *</label>
                <input type="text" className="form-input" value={formData.cultivo} onChange={(e) => setFormData({...formData, cultivo: e.target.value})} required />
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
                <button type="submit" className="btn btn-primary" data-testid="btn-guardar-parcela">Guardar Parcela</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
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
                <tr><th>Código</th><th>Proveedor</th><th>Finca</th><th>Cultivo</th><th>Variedad</th><th>Superficie</th><th>Plantas</th><th>Estado</th></tr>
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