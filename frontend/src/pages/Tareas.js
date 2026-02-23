import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Tareas = () => {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', superficie_tratar: '', parcelas_ids: [], fecha_inicio: '', observaciones: '' });
  
  useEffect(() => { fetchTareas(); }, []);
  
  const fetchTareas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tareas`);
      const data = await res.json();
      setTareas(data.tareas || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/tareas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, superficie_tratar: parseFloat(formData.superficie_tratar) }) });
      setShowForm(false);
      fetchTareas();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="tareas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tareas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nueva Tarea</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Superficie (ha) *</label><input type="number" step="0.01" className="form-input" value={formData.superficie_tratar} onChange={(e) => setFormData({...formData, superficie_tratar: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Fecha Inicio</label><input type="date" className="form-input" value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} /></div>
            </div>
            <div className="form-group"><label className="form-label">Observaciones</label><textarea className="form-textarea" value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} /></div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : tareas.length === 0 ? <p className="text-muted">No hay tareas</p> : (
          <table><thead><tr><th>Nombre</th><th>Superficie</th><th>Coste Total</th><th>Estado</th></tr></thead><tbody>{tareas.map(t => <tr key={t._id}><td className="font-semibold">{t.nombre}</td><td>{t.superficie_tratar} ha</td><td>€{t.coste_total.toFixed(2)}</td><td><span className={`badge ${t.realizada ? 'badge-success' : 'badge-default'}`}>{t.realizada ? 'Realizada' : 'Pendiente'}</span></td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Tareas;