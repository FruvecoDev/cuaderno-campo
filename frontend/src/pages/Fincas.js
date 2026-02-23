import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Fincas = () => {
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ campana: '2025/26', nombre: '', superficie_total: '', num_plantas: '', provincia: '', poblacion: '' });
  
  useEffect(() => { fetchFincas(); }, []);
  
  const fetchFincas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/fincas`);
      const data = await res.json();
      setFincas(data.fincas || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/fincas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, superficie_total: parseFloat(formData.superficie_total), num_plantas: parseInt(formData.num_plantas) })
      });
      setShowForm(false);
      fetchFincas();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="fincas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Fincas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} data-testid="btn-nueva-finca"><Plus size={18} />Nueva Finca</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Campaña *</label><input className="form-input" value={formData.campana} onChange={(e) => setFormData({...formData, campana: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Superficie (ha) *</label><input type="number" step="0.01" className="form-input" value={formData.superficie_total} onChange={(e) => setFormData({...formData, superficie_total: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Nº Plantas *</label><input type="number" className="form-input" value={formData.num_plantas} onChange={(e) => setFormData({...formData, num_plantas: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Provincia</label><input className="form-input" value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Población</label><input className="form-input" value={formData.poblacion} onChange={(e) => setFormData({...formData, poblacion: e.target.value})} /></div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : fincas.length === 0 ? <p className="text-muted">No hay fincas</p> : (
          <table><thead><tr><th>Nombre</th><th>Campaña</th><th>Superficie</th><th>Plantas</th><th>Ubicación</th></tr></thead><tbody>{fincas.map(f => <tr key={f._id}><td className="font-semibold">{f.nombre}</td><td>{f.campana}</td><td>{f.superficie_total} ha</td><td>{f.num_plantas}</td><td>{f.provincia} - {f.poblacion}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Fincas;