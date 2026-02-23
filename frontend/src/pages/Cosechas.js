import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Cosechas = () => {
  const [cosechas, setCosechas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', superficie_total: '', num_plantas: '', parcelas_ids: [] });
  
  useEffect(() => { fetchCosechas(); }, []);
  
  const fetchCosechas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cosechas`);
      const data = await res.json();
      setCosechas(data.cosechas || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/cosechas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, superficie_total: parseFloat(formData.superficie_total), num_plantas: parseInt(formData.num_plantas) }) });
      setShowForm(false);
      fetchCosechas();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="cosechas-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Cosechas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nueva Cosecha</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Superficie (ha) *</label><input type="number" step="0.01" className="form-input" value={formData.superficie_total} onChange={(e) => setFormData({...formData, superficie_total: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Nº Plantas *</label><input type="number" className="form-input" value={formData.num_plantas} onChange={(e) => setFormData({...formData, num_plantas: e.target.value})} required /></div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : cosechas.length === 0 ? <p className="text-muted">No hay cosechas</p> : (
          <table><thead><tr><th>Nombre</th><th>Superficie</th><th>Total Cosecha</th><th>Ingreso Total</th></tr></thead><tbody>{cosechas.map(c => <tr key={c._id}><td className="font-semibold">{c.nombre}</td><td>{c.superficie_total} ha</td><td>{c.cosecha_total.toFixed(0)} kg</td><td>€{c.ingreso_total.toFixed(2)}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Cosechas;