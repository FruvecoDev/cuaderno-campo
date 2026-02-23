import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Albaranes = () => {
  const [albaranes, setAlbaranes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ tipo: 'Entrada', fecha: '', proveedor_cliente: '', items: [] });
  
  useEffect(() => { fetchAlbaranes(); }, []);
  
  const fetchAlbaranes = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/albaranes`);
      const data = await res.json();
      setAlbaranes(data.albaranes || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${BACKEND_URL}/api/albaranes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      setShowForm(false);
      fetchAlbaranes();
    } catch (err) { console.error(err); }
  };
  
  return (
    <div data-testid="albaranes-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Albaranes</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={18} />Nuevo Albarán</button>
      </div>
      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid-3">
              <div className="form-group"><label className="form-label">Tipo *</label><select className="form-select" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}><option>Entrada</option><option>Salida</option></select></div>
              <div className="form-group"><label className="form-label">Fecha *</label><input type="date" className="form-input" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">Proveedor/Cliente *</label><input className="form-input" value={formData.proveedor_cliente} onChange={(e) => setFormData({...formData, proveedor_cliente: e.target.value})} required /></div>
            </div>
            <div className="flex gap-2"><button type="submit" className="btn btn-primary">Guardar</button><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button></div>
          </form>
        </div>
      )}
      <div className="card">
        {loading ? <p>Cargando...</p> : albaranes.length === 0 ? <p className="text-muted">No hay albaranes</p> : (
          <table><thead><tr><th>Tipo</th><th>Fecha</th><th>Proveedor/Cliente</th><th>Total</th></tr></thead><tbody>{albaranes.map(a => <tr key={a._id}><td><span className={`badge ${a.tipo === 'Entrada' ? 'badge-success' : 'badge-warning'}`}>{a.tipo}</span></td><td>{a.fecha}</td><td>{a.proveedor_cliente}</td><td>€{a.total_general.toFixed(2)}</td></tr>)}</tbody></table>
        )}
      </div>
    </div>
  );
};

export default Albaranes;