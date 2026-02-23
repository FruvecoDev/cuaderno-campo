import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Recetas = () => {
  const [recetas, setRecetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', cultivo_objetivo: '', plazo_seguridad: '', instrucciones: '' });
  
  useEffect(() => { fetchRecetas(); }, []);
  
  const fetchRecetas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/recetas`);
      const data = await res.json();
      setRecetas(data.recetas || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/recetas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, plazo_seguridad: parseInt(formData.plazo_seguridad) }) });
      setShowForm(false);
      fetchRecetas();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="recetas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Recetas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nueva Receta</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Cultivo Objetivo *</label><input className="form-input" value={formData.cultivo_objetivo} onChange={(e) => setFormData({...formData, cultivo_objetivo: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Plazo Seguridad (días) *</label><input type="number" className="form-input" value={formData.plazo_seguridad} onChange={(e) => setFormData({...formData, plazo_seguridad: e.target.value})} required /></div>
            </div>
            <div className="form-group"><label className="form-label">Instrucciones</label><textarea className="form-textarea" value={formData.instrucciones} onChange={(e) => setFormData({...formData, instrucciones: e.target.value})} /></div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : recetas.length === 0 ? <p className="text-muted">No hay recetas</p> : (
          <table><thead><tr><th>Nombre</th><th>Cultivo</th><th>P.S. (días)</th></tr></thead><tbody>{recetas.map(r => <tr key={r._id}><td className="font-semibold">{r.nombre}</td><td>{r.cultivo_objetivo}</td><td>{r.plazo_seguridad}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Recetas;