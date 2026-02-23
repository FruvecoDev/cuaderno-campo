import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './AppPOC.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Component for drawing polygons
function DrawControl({ onPolygonCreated }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          metric: true
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });
    
    map.addControl(drawControl);
    
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      
      const latlngs = layer.getLatLngs()[0];
      const coordinates = latlngs.map(point => ({
        lat: point.lat,
        lng: point.lng
      }));
      
      onPolygonCreated(coordinates);
    });
    
    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onPolygonCreated]);
  
  return null;
}

function AppPOC() {
  const [step, setStep] = useState(1);
  const [parcela, setParcela] = useState(null);
  const [parcelaId, setParcelaId] = useState(null);
  const [polygon, setPolygon] = useState([]);
  const [contrato, setContrato] = useState(null);
  const [tratamientos, setTratamientos] = useState([]);
  const [riegos, setRiegos] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [cosechas, setCosechas] = useState([]);
  const [aiReport, setAiReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Form states
  const [parcelaForm, setParcelaForm] = useState({
    nombre: '',
    finca: '',
    cultivo: '',
    variedad: '',
    superficie: '',
    num_plantas: ''
  });
  
  const [contratoForm, setContratoForm] = useState({
    proveedor: '',
    cultivo: '',
    campana: '2025/26',
    cantidad: '',
    precio: ''
  });
  
  const [tratamientoForm, setTratamientoForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Insecticida',
    producto: '',
    dosis: '',
    coste: '',
    plazo_seguridad: ''
  });
  
  const [riegoForm, setRiegoForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    volumen: '',
    duracion: '',
    coste: ''
  });
  
  const [visitaForm, setVisitaForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'Control Rutinario',
    observaciones: ''
  });
  
  const [cosechaForm, setCosechaForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    cantidad: '',
    precio: '',
    calidad: 'Extra'
  });
  
  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };
  
  const handlePolygonCreated = (coordinates) => {
    setPolygon(coordinates);
    showMessage(`Polígono dibujado con ${coordinates.length} puntos`);
  };
  
  const handleCreateParcela = async (e) => {
    e.preventDefault();
    if (polygon.length < 3) {
      showMessage('Dibuja un polígono en el mapa primero', true);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/parcelas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parcelaForm,
          superficie: parseFloat(parcelaForm.superficie),
          num_plantas: parseInt(parcelaForm.num_plantas),
          polygon
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setParcela(data.data);
        setParcelaId(data.parcela_id);
        setStep(2);
        showMessage('Parcela creada exitosamente!');
      }
    } catch (error) {
      showMessage('Error creando parcela: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleCreateContrato = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/contratos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcela_id: parcelaId,
          ...contratoForm,
          cantidad: parseFloat(contratoForm.cantidad),
          precio: parseFloat(contratoForm.precio)
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setContrato(data.data);
        setStep(3);
        showMessage('Contrato creado exitosamente!');
      }
    } catch (error) {
      showMessage('Error creando contrato: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleAddTratamiento = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/tratamientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcela_id: parcelaId,
          ...tratamientoForm,
          coste: parseFloat(tratamientoForm.coste),
          plazo_seguridad: parseInt(tratamientoForm.plazo_seguridad)
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setTratamientos([...tratamientos, data.data]);
        setTratamientoForm({ ...tratamientoForm, producto: '', dosis: '', coste: '', plazo_seguridad: '' });
        showMessage('Tratamiento añadido!');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleAddRiego = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/riegos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcela_id: parcelaId,
          ...riegoForm,
          volumen: parseFloat(riegoForm.volumen),
          duracion: parseFloat(riegoForm.duracion),
          coste: parseFloat(riegoForm.coste)
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setRiegos([...riegos, data.data]);
        setRiegoForm({ ...riegoForm, volumen: '', duracion: '', coste: '' });
        showMessage('Riego añadido!');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleAddVisita = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/visitas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcela_id: parcelaId,
          ...visitaForm
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setVisitas([...visitas, data.data]);
        setVisitaForm({ ...visitaForm, observaciones: '' });
        showMessage('Visita añadida!');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleAddCosecha = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/cosechas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcela_id: parcelaId,
          ...cosechaForm,
          cantidad: parseFloat(cosechaForm.cantidad),
          precio: parseFloat(cosechaForm.precio)
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setCosechas([...cosechas, data.data]);
        setCosechaForm({ ...cosechaForm, cantidad: '', precio: '' });
        showMessage('Cosecha añadida!');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleGenerateAIReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/generate-ai-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcela_id: parcelaId })
      });
      
      const data = await response.json();
      if (data.success) {
        setAiReport(data.report);
        setStep(4);
        showMessage('Informe IA generado!');
      }
    } catch (error) {
      showMessage('Error generando informe: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcela_id: parcelaId })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cuaderno_campo.pdf';
      a.click();
      showMessage('PDF descargado!');
    } catch (error) {
      showMessage('Error descargando PDF: ' + error.message, true);
    }
    setLoading(false);
  };
  
  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/poc/generate-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcela_id: parcelaId })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'datos_agricolas.xlsx';
      a.click();
      showMessage('Excel descargado!');
    } catch (error) {
      showMessage('Error descargando Excel: ' + error.message, true);
    }
    setLoading(false);
  };
  
  return (
    <div className="poc-container">
      <header className="poc-header">
        <h1>🌾 Gestión Agrícola - POC</h1>
        <p>Prueba de Concepto: Cuaderno de Campo Digital</p>
      </header>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
      
      <div className="poc-content">
        <div className="poc-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Crear Parcela</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Crear Contrato</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Añadir Eventos</div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Generar Informes</div>
        </div>
        
        {/* STEP 1: Create Parcela with Map */}
        {step === 1 && (
          <div className="step-content">
            <h2>📍 Paso 1: Crear Parcela y Dibujar Polígono</h2>
            <div className="two-col">
              <div className="map-section">
                <h3>Mapa - Dibuja el polígono de la parcela</h3>
                <p className="help-text">Usa el botón de polígono (🔷) en la esquina superior izquierda del mapa para dibujar</p>
                <MapContainer
                  center={[37.0886, -2.3170]}
                  zoom={13}
                  style={{ height: '500px', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <DrawControl onPolygonCreated={handlePolygonCreated} />
                  {polygon.length > 0 && (
                    <Polygon positions={polygon.map(p => [p.lat, p.lng])} color="green" />
                  )}
                </MapContainer>
                {polygon.length > 0 && (
                  <p className="success-text">✓ Polígono dibujado con {polygon.length} puntos</p>
                )}
              </div>
              
              <div className="form-section">
                <h3>Datos de la Parcela</h3>
                <form onSubmit={handleCreateParcela}>
                  <input
                    type="text"
                    placeholder="Nombre de la parcela"
                    value={parcelaForm.nombre}
                    onChange={(e) => setParcelaForm({...parcelaForm, nombre: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Finca"
                    value={parcelaForm.finca}
                    onChange={(e) => setParcelaForm({...parcelaForm, finca: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Cultivo"
                    value={parcelaForm.cultivo}
                    onChange={(e) => setParcelaForm({...parcelaForm, cultivo: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Variedad"
                    value={parcelaForm.variedad}
                    onChange={(e) => setParcelaForm({...parcelaForm, variedad: e.target.value})}
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Superficie (ha)"
                    value={parcelaForm.superficie}
                    onChange={(e) => setParcelaForm({...parcelaForm, superficie: e.target.value})}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Número de plantas"
                    value={parcelaForm.num_plantas}
                    onChange={(e) => setParcelaForm({...parcelaForm, num_plantas: e.target.value})}
                    required
                  />
                  <button type="submit" disabled={loading || polygon.length < 3} className="btn-primary">
                    {loading ? 'Creando...' : 'Crear Parcela →'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* STEP 2: Create Contrato */}
        {step === 2 && (
          <div className="step-content">
            <h2>📄 Paso 2: Crear Contrato</h2>
            <div className="info-box">
              <strong>Parcela:</strong> {parcela.nombre} | <strong>Cultivo:</strong> {parcela.cultivo} - {parcela.variedad}
            </div>
            <form onSubmit={handleCreateContrato} className="single-form">
              <input
                type="text"
                placeholder="Proveedor/Agricultor"
                value={contratoForm.proveedor}
                onChange={(e) => setContratoForm({...contratoForm, proveedor: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Cultivo del contrato"
                value={contratoForm.cultivo}
                onChange={(e) => setContratoForm({...contratoForm, cultivo: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Campaña (ej: 2025/26)"
                value={contratoForm.campana}
                onChange={(e) => setContratoForm({...contratoForm, campana: e.target.value})}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Cantidad (kg)"
                value={contratoForm.cantidad}
                onChange={(e) => setContratoForm({...contratoForm, cantidad: e.target.value})}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio (€/kg)"
                value={contratoForm.precio}
                onChange={(e) => setContratoForm({...contratoForm, precio: e.target.value})}
                required
              />
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creando...' : 'Crear Contrato →'}
              </button>
            </form>
          </div>
        )}
        
        {/* STEP 3: Add Events */}
        {step === 3 && (
          <div className="step-content">
            <h2>🌿 Paso 3: Añadir Eventos</h2>
            <div className="info-box">
              <strong>Parcela:</strong> {parcela.nombre} | <strong>Contrato:</strong> {contrato.id}
            </div>
            
            <div className="events-grid">
              {/* Tratamientos */}
              <div className="event-card">
                <h3>🧪 Tratamientos</h3>
                <form onSubmit={handleAddTratamiento}>
                  <input type="date" value={tratamientoForm.fecha} onChange={(e) => setTratamientoForm({...tratamientoForm, fecha: e.target.value})} required />
                  <select value={tratamientoForm.tipo} onChange={(e) => setTratamientoForm({...tratamientoForm, tipo: e.target.value})}>
                    <option>Insecticida</option>
                    <option>Fungicida</option>
                    <option>Herbicida</option>
                    <option>Fertilizante</option>
                  </select>
                  <input type="text" placeholder="Producto" value={tratamientoForm.producto} onChange={(e) => setTratamientoForm({...tratamientoForm, producto: e.target.value})} required />
                  <input type="text" placeholder="Dosis" value={tratamientoForm.dosis} onChange={(e) => setTratamientoForm({...tratamientoForm, dosis: e.target.value})} required />
                  <input type="number" step="0.01" placeholder="Coste (€)" value={tratamientoForm.coste} onChange={(e) => setTratamientoForm({...tratamientoForm, coste: e.target.value})} required />
                  <input type="number" placeholder="Plazo seg. (días)" value={tratamientoForm.plazo_seguridad} onChange={(e) => setTratamientoForm({...tratamientoForm, plazo_seguridad: e.target.value})} required />
                  <button type="submit" disabled={loading}>Añadir</button>
                </form>
                <div className="event-list">
                  {tratamientos.map((t, i) => (
                    <div key={i} className="event-item">{t.fecha} - {t.producto} ({t.dosis})</div>
                  ))}
                </div>
              </div>
              
              {/* Riegos */}
              <div className="event-card">
                <h3>💧 Riegos</h3>
                <form onSubmit={handleAddRiego}>
                  <input type="date" value={riegoForm.fecha} onChange={(e) => setRiegoForm({...riegoForm, fecha: e.target.value})} required />
                  <input type="number" step="0.01" placeholder="Volumen (m³)" value={riegoForm.volumen} onChange={(e) => setRiegoForm({...riegoForm, volumen: e.target.value})} required />
                  <input type="number" step="0.1" placeholder="Duración (h)" value={riegoForm.duracion} onChange={(e) => setRiegoForm({...riegoForm, duracion: e.target.value})} required />
                  <input type="number" step="0.01" placeholder="Coste (€)" value={riegoForm.coste} onChange={(e) => setRiegoForm({...riegoForm, coste: e.target.value})} required />
                  <button type="submit" disabled={loading}>Añadir</button>
                </form>
                <div className="event-list">
                  {riegos.map((r, i) => (
                    <div key={i} className="event-item">{r.fecha} - {r.volumen} m³</div>
                  ))}
                </div>
              </div>
              
              {/* Visitas */}
              <div className="event-card">
                <h3>👨‍🌾 Visitas</h3>
                <form onSubmit={handleAddVisita}>
                  <input type="date" value={visitaForm.fecha} onChange={(e) => setVisitaForm({...visitaForm, fecha: e.target.value})} required />
                  <select value={visitaForm.tipo} onChange={(e) => setVisitaForm({...visitaForm, tipo: e.target.value})}>
                    <option>Control Rutinario</option>
                    <option>Plagas y Enfermedades</option>
                    <option>Evaluación</option>
                    <option>Informe</option>
                  </select>
                  <textarea placeholder="Observaciones" value={visitaForm.observaciones} onChange={(e) => setVisitaForm({...visitaForm, observaciones: e.target.value})} required></textarea>
                  <button type="submit" disabled={loading}>Añadir</button>
                </form>
                <div className="event-list">
                  {visitas.map((v, i) => (
                    <div key={i} className="event-item">{v.fecha} - {v.tipo}</div>
                  ))}
                </div>
              </div>
              
              {/* Cosechas */}
              <div className="event-card">
                <h3>🌾 Cosechas</h3>
                <form onSubmit={handleAddCosecha}>
                  <input type="date" value={cosechaForm.fecha} onChange={(e) => setCosechaForm({...cosechaForm, fecha: e.target.value})} required />
                  <input type="number" step="0.01" placeholder="Cantidad (kg)" value={cosechaForm.cantidad} onChange={(e) => setCosechaForm({...cosechaForm, cantidad: e.target.value})} required />
                  <input type="number" step="0.01" placeholder="Precio (€/kg)" value={cosechaForm.precio} onChange={(e) => setCosechaForm({...cosechaForm, precio: e.target.value})} required />
                  <select value={cosechaForm.calidad} onChange={(e) => setCosechaForm({...cosechaForm, calidad: e.target.value})}>
                    <option>Extra</option>
                    <option>Primera</option>
                    <option>Segunda</option>
                  </select>
                  <button type="submit" disabled={loading}>Añadir</button>
                </form>
                <div className="event-list">
                  {cosechas.map((c, i) => (
                    <div key={i} className="event-item">{c.fecha} - {c.cantidad} kg</div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              <button onClick={handleGenerateAIReport} disabled={loading} className="btn-primary">
                {loading ? 'Generando...' : '🤖 Generar Informe IA →'}
              </button>
            </div>
          </div>
        )}
        
        {/* STEP 4: Generate Reports */}
        {step === 4 && (
          <div className="step-content">
            <h2>📊 Paso 4: Informes Generados</h2>
            <div className="info-box">
              <strong>Parcela:</strong> {parcela.nombre} | <strong>Contrato:</strong> {contrato.id}
            </div>
            
            <div className="report-actions">
              <button onClick={handleDownloadPDF} disabled={loading} className="btn-secondary">
                📄 Descargar PDF
              </button>
              <button onClick={handleDownloadExcel} disabled={loading} className="btn-secondary">
                📊 Descargar Excel
              </button>
            </div>
            
            <div className="ai-report">
              <h3>🤖 Informe IA - Análisis de Campaña</h3>
              <div className="report-content">
                {aiReport.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
            
            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-value">{tratamientos.length}</div>
                <div className="stat-label">Tratamientos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{riegos.length}</div>
                <div className="stat-label">Riegos</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{visitas.length}</div>
                <div className="stat-label">Visitas</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{cosechas.length}</div>
                <div className="stat-label">Cosechas</div>
              </div>
            </div>
            
            <div className="success-message">
              <h3>✅ POC Completado Exitosamente!</h3>
              <p>Has probado todas las funcionalidades core:</p>
              <ul>
                <li>✓ Creación de parcela con polígono en mapa</li>
                <li>✓ Creación de contrato</li>
                <li>✓ Registro de tratamientos, riegos, visitas y cosechas</li>
                <li>✓ Generación de informe IA personalizado</li>
                <li>✓ Exportación a PDF y Excel</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AppPOC;
