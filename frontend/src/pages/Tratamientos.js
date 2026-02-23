import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Tratamientos = () => {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tipo_tratamiento: 'FITOSANITARIOS', subtipo: 'Insecticida', aplicacion_numero: 1, metodo_aplicacion: 'Pulverización', superficie_aplicacion: '', caldo_superficie: '', parcelas_ids: [] });
  
  useEffect(() => { fetchTratamientos(); }, []);
  
  const fetchTratamientos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tratamientos`);
      const data = await res.json();
      setTratamientos(data.tratamientos || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/tratamientos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, superficie_aplicacion: parseFloat(formData.superficie_aplicacion), caldo_superficie: parseFloat(formData.caldo_superficie), caldo_total: 0, volumen_cuba: 0 }) });
      setShowForm(false);
      fetchTratamientos();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="tratamientos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tratamientos</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nuevo Tratamiento</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              <div className="form-group"><label className="form-label">Tipo</label><select className="form-select" value={formData.tipo_tratamiento} onChange={(e) => setFormData({...formData, tipo_tratamiento: e.target.value})}><option>FITOSANITARIOS</option><option>NUTRICIÓN</option></select></div>
              <div className="form-group"><label className="form-label">Subtipo</label><select className="form-select" value={formData.subtipo} onChange={(e) => setFormData({...formData, subtipo: e.target.value})}><option>Insecticida</option><option>Fungicida</option><option>Herbicida</option><option>Fertilizante</option></select></div>
              <div className="form-group"><label className="form-label">Método</label><select className="form-select" value={formData.metodo_aplicacion} onChange={(e) => setFormData({...formData, metodo_aplicacion: e.target.value})}><option>Pulverización</option><option>Quimigación</option><option>Espolvoreo</option></select></div>
            </div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Superficie (ha) *</label><input type="number" step="0.01" className="form-input" value={formData.superficie_aplicacion} onChange={(e) => setFormData({...formData, superficie_aplicacion: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Caldo/Superficie (L) *</label><input type="number" step="0.01" className="form-input" value={formData.caldo_superficie} onChange={(e) => setFormData({...formData, caldo_superficie: e.target.value})} required /></div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : tratamientos.length === 0 ? <p className="text-muted">No hay tratamientos</p> : (
          <table><thead><tr><th>Tipo</th><th>Subtipo</th><th>Método</th><th>Superficie</th><th>Coste</th></tr></thead><tbody>{tratamientos.map(t => <tr key={t._id}><td>{t.tipo_tratamiento}</td><td>{t.subtipo}</td><td>{t.metodo_aplicacion}</td><td>{t.superficie_aplicacion} ha</td><td>€{t.coste_total.toFixed(2)}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Tratamientos;