import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Visitas = () => {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ objetivo: 'Control Rutinario', proveedor: '', campana: '2025/26', cultivo: '', fecha_visita: '', observaciones: '' });
  
  useEffect(() => { fetchVisitas(); }, []);
  
  const fetchVisitas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/visitas`);
      const data = await res.json();
      setVisitas(data.visitas || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/visitas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      setShowForm(false);
      fetchVisitas();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="visitas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Visitas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nueva Visita</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Objetivo</label><select className="form-select" value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})}><option>Control Rutinario</option><option>Informe</option><option>Evaluación</option><option>Plagas y Enfermedades</option></select></div>
              <div className="form-group"><label className="form-label">Fecha</label><input type="date" className="form-input" value={formData.fecha_visita} onChange={(e) => setFormData({...formData, fecha_visita: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Proveedor *</label><input className="form-input" value={formData.proveedor} onChange={(e) => setFormData({...formData, proveedor: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Cultivo *</label><input className="form-input" value={formData.cultivo} onChange={(e) => setFormData({...formData, cultivo: e.target.value})} required /></div>
            </div>
            <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-textarea" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} /></div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : visitas.length === 0 ? <p className="text-muted">No hay visitas</p> : (
          <table><thead><tr><th>Objetivo</th><th>Proveedor</th><th>Cultivo</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>{visitas.map(v => <tr key={v._id}><td>{v.objetivo}</td><td>{v.proveedor}</td><td>{v.cultivo}</td><td>{v.fecha_visita || 'Sin fecha'}</td><td><span className={`badge ${v.realizado ? 'badge-success' : 'badge-default'}`}>{v.realizado ? 'Realizada' : 'Pendiente'}</span></td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Visitas;