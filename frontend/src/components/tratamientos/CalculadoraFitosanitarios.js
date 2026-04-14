import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, AlertTriangle, RotateCcw, Beaker, Droplets, Ruler, Bug, Database, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const CalculadoraFitosanitarios = ({ recetas = [], onApplyToForm }) => {
  const [showCalculator, setShowCalculator] = useState(false);
  const { token } = useAuth();
  const [productosDB, setProductosDB] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  
  const [calcData, setCalcData] = useState({
    superficie: '', unidadSuperficie: 'ha', volumenAgua: '', dosisProducto: '',
    unidadDosis: 'L/ha', concentracion: '', nombreProducto: '',
    tipoProducto: 'insecticida', plagaObjetivo: ''
  });
  
  const [alerts, setAlerts] = useState({});
  const [historial, setHistorial] = useState([]);
  
  const LIMITES_DOSIS = {
    insecticida: { min: 0.1, max: 3, unidad: 'L/ha' },
    herbicida: { min: 0.5, max: 5, unidad: 'L/ha' },
    fungicida: { min: 0.2, max: 4, unidad: 'L/ha' },
    fertilizante: { min: 1, max: 50, unidad: 'kg/ha' }
  };
  const LIMITES_AGUA = { min: 100, max: 1000 };
  
  const resultados = useMemo(() => {
    const sup = parseFloat(calcData.superficie) || 0;
    const volAgua = parseFloat(calcData.volumenAgua) || 0;
    const dosis = parseFloat(calcData.dosisProducto) || 0;
    const conc = parseFloat(calcData.concentracion) || 100;
    const supHa = calcData.unidadSuperficie === 'm2' ? sup / 10000 : sup;
    let cantidadProducto = dosis * supHa;
    if (conc < 100 && conc > 0) cantidadProducto = cantidadProducto * (100 / conc);
    const volumenTotalAgua = volAgua * supHa;
    const productoPorLitro = volumenTotalAgua > 0 ? (cantidadProducto / volumenTotalAgua) * 1000 : 0;
    const concentracionMezcla = volumenTotalAgua > 0 ? (cantidadProducto / volumenTotalAgua) * 100 : 0;
    return { superficieHa: supHa, cantidadProducto, volumenTotalAgua, productoPorLitro, concentracionMezcla, dosisReal: dosis };
  }, [calcData]);
  
  useEffect(() => {
    const newAlerts = {};
    const limites = LIMITES_DOSIS[calcData.tipoProducto];
    const dosis = parseFloat(calcData.dosisProducto) || 0;
    const volAgua = parseFloat(calcData.volumenAgua) || 0;
    if (dosis > 0 && limites) {
      if (dosis < limites.min) newAlerts.dosis = { type: 'warning', message: `Dosis baja. Minimo recomendado: ${limites.min} ${limites.unidad}` };
      else if (dosis > limites.max) newAlerts.dosis = { type: 'danger', message: `Dosis excesiva! Maximo recomendado: ${limites.max} ${limites.unidad}` };
    }
    if (volAgua > 0) {
      if (volAgua < LIMITES_AGUA.min) newAlerts.agua = { type: 'warning', message: `Volumen de agua bajo. Minimo: ${LIMITES_AGUA.min} L/ha` };
      else if (volAgua > LIMITES_AGUA.max) newAlerts.agua = { type: 'danger', message: `Volumen excesivo. Maximo: ${LIMITES_AGUA.max} L/ha` };
    }
    if (resultados.concentracionMezcla > 5) newAlerts.concentracion = { type: 'danger', message: 'Concentracion muy alta! Riesgo de fitotoxicidad' };
    else if (resultados.concentracionMezcla > 2) newAlerts.concentracion = { type: 'warning', message: 'Concentracion elevada. Verificar tolerancia del cultivo' };
    setAlerts(newAlerts);
  }, [calcData, resultados]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    const fetchProductos = async () => {
      if (!token) return;
      setLoadingProductos(true);
      try {
        const tipoMap = { 'insecticida': 'Insecticida', 'herbicida': 'Herbicida', 'fungicida': 'Fungicida', 'fertilizante': 'Fertilizante' };
        const tipo = tipoMap[calcData.tipoProducto] || calcData.tipoProducto;
        const data = await api.get(`/api/fitosanitarios?tipo=${tipo}&activo=true`);
        setProductosDB(data.productos || []);
      } catch (error) { }
      finally { setLoadingProductos(false); }
    };
    if (showCalculator) fetchProductos();
  }, [calcData.tipoProducto, showCalculator, token]);
  
  const handleSelectProducto = (producto) => {
    setSelectedProducto(producto);
    setCalcData(prev => ({
      ...prev, nombreProducto: producto.nombre_comercial,
      dosisProducto: producto.dosis_max ? producto.dosis_max.toString() : prev.dosisProducto,
      unidadDosis: producto.unidad_dosis || 'L/ha',
      volumenAgua: producto.volumen_agua_max ? producto.volumen_agua_max.toString() : prev.volumenAgua,
      plagaObjetivo: (producto.plagas_objetivo || []).join(', ')
    }));
  };
  
  const resetCalculator = () => {
    setCalcData({ superficie: '', unidadSuperficie: 'ha', volumenAgua: '', dosisProducto: '', unidadDosis: 'L/ha', concentracion: '', nombreProducto: '', tipoProducto: 'insecticida', plagaObjetivo: '' });
    setSelectedProducto(null); setAlerts({});
  };
  
  const guardarEnHistorial = () => {
    if (resultados.cantidadProducto > 0) {
      const registro = { fecha: new Date().toLocaleString(), ...calcData, resultados: { ...resultados } };
      setHistorial(prev => [registro, ...prev].slice(0, 10));
    }
  };
  
  const aplicarAlFormulario = () => {
    if (onApplyToForm && resultados.superficieHa > 0) {
      onApplyToForm({
        superficie_aplicacion: resultados.superficieHa, caldo_superficie: parseFloat(calcData.volumenAgua) || 0,
        producto_fitosanitario_id: selectedProducto?._id || null,
        producto_fitosanitario_nombre: selectedProducto?.nombre_comercial || calcData.nombreProducto || null,
        producto_fitosanitario_dosis: parseFloat(calcData.dosisProducto) || null,
        producto_fitosanitario_unidad: calcData.unidadDosis || null,
        producto_materia_activa: selectedProducto?.materia_activa || null,
        producto_plazo_seguridad: selectedProducto?.plazo_seguridad || null
      });
      setShowCalculator(false);
    }
  };
  
  const hasAlerts = Object.keys(alerts).length > 0;
  const hasDangerAlerts = Object.values(alerts).some(a => a.type === 'danger');
  
  return (
    <div className="mb-6">
      <button type="button" onClick={() => setShowCalculator(!showCalculator)}
        className={`btn ${showCalculator ? 'btn-primary' : 'btn-secondary'}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
        data-testid="btn-calculadora">
        <Calculator size={18} /> Calculadora de Fitosanitarios
        {hasAlerts && !showCalculator && <span style={{ width: '8px', height: '8px', backgroundColor: hasDangerAlerts ? '#dc2626' : '#f59e0b', borderRadius: '50%' }} />}
      </button>
      
      {showCalculator && (
        <div className="card" style={{ border: hasAlerts ? `2px solid ${hasDangerAlerts ? '#dc2626' : '#f59e0b'}` : '1px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Beaker size={20} style={{ color: '#2d5a27' }} /> Calculadora de Dosis de Fitosanitarios
            </h3>
            <button type="button" onClick={resetCalculator} className="btn btn-sm" style={{ backgroundColor: '#e8f5e9', color: '#2d5a27', display: 'flex', alignItems: 'center', gap: '0.25rem' }} data-testid="btn-reset-calculadora">
              <RotateCcw size={14} /> Restablecer
            </button>
          </div>
          
          {hasAlerts && (
            <div style={{ marginBottom: '1.5rem' }}>
              {Object.entries(alerts).map(([key, alert]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', marginBottom: '0.5rem',
                  backgroundColor: alert.type === 'danger' ? '#fef2f2' : '#fffbeb', border: `1px solid ${alert.type === 'danger' ? '#fecaca' : '#fde68a'}`, borderRadius: '8px', color: alert.type === 'danger' ? '#dc2626' : '#d97706' }}>
                  <AlertTriangle size={18} /><span style={{ fontWeight: '500' }}>{alert.message}</span>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#2d5a27', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Ruler size={16} /> Datos de entrada</h4>
              <div className="form-group">
                <label className="form-label">Tipo de Fitosanitario</label>
                <select className="form-select" value={calcData.tipoProducto} onChange={(e) => { setCalcData({...calcData, tipoProducto: e.target.value, nombreProducto: ''}); setSelectedProducto(null); }}>
                  <option value="insecticida">Insecticida</option><option value="herbicida">Herbicida</option><option value="fungicida">Fungicida</option><option value="fertilizante">Fertilizante</option>
                </select>
              </div>
              {productosDB.length > 0 && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={14} /> Seleccionar Producto Registrado</label>
                  <select className="form-select" value={selectedProducto?._id || ''} onChange={(e) => { const prod = productosDB.find(p => p._id === e.target.value); if (prod) handleSelectProducto(prod); }} style={{ backgroundColor: selectedProducto ? '#f0fdf4' : 'white' }}>
                    <option value="">-- Seleccionar producto --</option>
                    {productosDB.map(prod => (<option key={prod._id} value={prod._id}>{prod.nombre_comercial} {prod.materia_activa ? `(${prod.materia_activa})` : ''}</option>))}
                  </select>
                  {loadingProductos && <small style={{ color: 'hsl(var(--muted-foreground))' }}>Cargando...</small>}
                  {selectedProducto && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid #86efac' }}>
                      <strong style={{ color: '#166534' }}>Dosis recomendada:</strong> {selectedProducto.dosis_min}-{selectedProducto.dosis_max} {selectedProducto.unidad_dosis}
                      {selectedProducto.plazo_seguridad && <span style={{ marginLeft: '1rem' }}>| <strong>Plazo:</strong> {selectedProducto.plazo_seguridad} dias</span>}
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input type="text" className="form-input" placeholder="Ej: Cipermetrina 20%" value={calcData.nombreProducto} onChange={(e) => setCalcData({...calcData, nombreProducto: e.target.value})} style={{ backgroundColor: selectedProducto ? '#f0fdf4' : 'white' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Superficie a Tratar</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" className="form-input" placeholder="Ej: 5" value={calcData.superficie} onChange={(e) => setCalcData({...calcData, superficie: e.target.value})} min="0" step="0.01" style={{ flex: 1 }} />
                  <select className="form-select" value={calcData.unidadSuperficie} onChange={(e) => setCalcData({...calcData, unidadSuperficie: e.target.value})} style={{ width: '80px' }}>
                    <option value="ha">Ha</option><option value="m2">m2</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Droplets size={14} /> Volumen de Agua (L/ha)</label>
                <input type="number" className="form-input" placeholder="Ej: 400" value={calcData.volumenAgua} onChange={(e) => setCalcData({...calcData, volumenAgua: e.target.value})} min="0" step="10" style={alerts.agua ? { borderColor: alerts.agua.type === 'danger' ? '#dc2626' : '#f59e0b', borderWidth: '2px' } : {}} />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Recomendado: {LIMITES_AGUA.min}-{LIMITES_AGUA.max} L/ha</small>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={14} /> Dosis del Producto</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" className="form-input" placeholder="Ej: 1.5" value={calcData.dosisProducto} onChange={(e) => setCalcData({...calcData, dosisProducto: e.target.value})} min="0" step="0.01" style={alerts.dosis ? { borderColor: alerts.dosis.type === 'danger' ? '#dc2626' : '#f59e0b', borderWidth: '2px', flex: 1 } : { flex: 1 }} />
                  <select className="form-select" value={calcData.unidadDosis} onChange={(e) => setCalcData({...calcData, unidadDosis: e.target.value})} style={{ width: '90px' }}>
                    <option value="L/ha">L/ha</option><option value="kg/ha">kg/ha</option><option value="ml/ha">ml/ha</option><option value="g/ha">g/ha</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Concentracion (%)</label>
                <input type="number" className="form-input" placeholder="Ej: 20" value={calcData.concentracion} onChange={(e) => setCalcData({...calcData, concentracion: e.target.value})} min="0" max="100" step="0.1" />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bug size={14} /> Plaga/Enfermedad Objetivo</label>
                <input type="text" className="form-input" placeholder="Ej: Pulgon, Mildiu..." value={calcData.plagaObjetivo} onChange={(e) => setCalcData({...calcData, plagaObjetivo: e.target.value})} />
              </div>
            </div>
            
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#2d5a27', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calculator size={16} /> Resultados</h4>
              <div style={{ backgroundColor: hasDangerAlerts ? '#fef2f2' : '#f0fdf4', padding: '1.5rem', borderRadius: '12px', border: `2px solid ${hasDangerAlerts ? '#fecaca' : '#bbf7d0'}` }}>
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Superficie Total</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>{resultados.superficieHa.toFixed(2)} Ha</div>
                </div>
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Cantidad Total de Producto</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: hasDangerAlerts ? '#dc2626' : '#2d5a27' }}>
                    {resultados.cantidadProducto.toFixed(2)} {calcData.unidadDosis.includes('L') ? 'L' : 'kg'}
                  </div>
                  {calcData.nombreProducto && <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>de {calcData.nombreProducto}</div>}
                </div>
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Volumen Total de Agua</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0ea5e9' }}>{resultados.volumenTotalAgua.toFixed(0)} L</div>
                </div>
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Producto por Litro</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: alerts.concentracion ? '#dc2626' : '#6b7280' }}>
                    {resultados.productoPorLitro.toFixed(2)} {calcData.unidadDosis.includes('L') ? 'ml' : 'g'}/L
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Concentracion: {resultados.concentracionMezcla.toFixed(3)}%</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={guardarEnHistorial} className="btn btn-secondary" disabled={resultados.cantidadProducto <= 0} style={{ flex: 1 }}>Guardar en Historial</button>
                <button type="button" onClick={aplicarAlFormulario} className="btn btn-primary" disabled={resultados.superficieHa <= 0} style={{ flex: 1 }}>Aplicar al Tratamiento</button>
              </div>
            </div>
          </div>
          
          {historial.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Historial de Calculos</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.8rem' }}>
                  <thead><tr><th>Fecha</th><th>Producto</th><th>Superficie</th><th>Cantidad</th><th>Agua Total</th></tr></thead>
                  <tbody>
                    {historial.map((h, idx) => (
                      <tr key={idx}><td>{h.fecha}</td><td>{h.nombreProducto || h.tipoProducto}</td><td>{h.resultados.superficieHa.toFixed(2)} ha</td><td>{h.resultados.cantidadProducto.toFixed(2)} {h.unidadDosis.includes('L') ? 'L' : 'kg'}</td><td>{h.resultados.volumenTotalAgua.toFixed(0)} L</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#0369a1' }}><Info size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Consideraciones importantes:</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#0c4a6e' }}>
              <li>Siempre lea la etiqueta del producto antes de aplicar</li>
              <li>Respete los plazos de seguridad indicados por el fabricante</li>
              <li>Use equipo de proteccion personal adecuado</li>
              <li>Las dosis varian segun cultivo, plaga y condiciones climaticas</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculadoraFitosanitarios;
