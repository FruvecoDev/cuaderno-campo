import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Irrigaciones = () => {
  const [irrigaciones, setIrrigaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ fecha: '', sistema: 'Goteo', duracion: '', volumen: '', coste: '', parcela_id: '' });
  
  useEffect(() => { fetchIrrigaciones(); }, []);
  
  const fetchIrrigaciones = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/irrigaciones`);
      const data = await res.json();
      setIrrigaciones(data.irrigaciones || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/irrigaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, duracion: parseFloat(formData.duracion), volumen: parseFloat(formData.volumen), coste: parseFloat(formData.coste) }) });
      setShowForm(false);
      fetchIrrigaciones();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="irrigaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Irrigaciones</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nueva Irrigación</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Fecha *</label><input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Sistema</label><select className="form-select" value={formData.sistema} onChange={(e) => setFormData({...formData, sistema: e.target.value})}><option>Goteo</option><option>Aspersión</option><option>Inundación</option></select></div>
              <div className="form-group"><label className="form-label">Duración (h) *</label><input type="number" step="0.1" className="form-input" value={formData.duracion} onChange={(e) => setFormData({...formData, duracion: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Volumen (m³) *</label><input type="number" step="0.01" className="form-input" value={formData.volumen} onChange={(e) => setFormData({...formData, volumen: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Coste (€) *</label><input type="number" step="0.01" className="form-input" value={formData.coste} onChange={(e) => setFormData({...formData, coste: e.target.value})} required /></div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : irrigaciones.length === 0 ? <p className="text-muted">No hay irrigaciones</p> : (
          <table><thead><tr><th>Fecha</th><th>Sistema</th><th>Duración (h)</th><th>Volumen (m³)</th><th>Coste</th></tr></thead><tbody>{irrigaciones.map(i => <tr key={i._id}><td>{i.fecha}</td><td>{i.sistema}</td><td>{i.duracion}</td><td>{i.volumen}</td><td>€{i.coste.toFixed(2)}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Irrigaciones;