import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Info, Filter, Settings, X, Calculator, AlertTriangle, RotateCcw, Beaker, Droplets, Ruler, Bug, Database, ChevronDown } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// ============================================================================
// CALCULADORA DE FITOSANITARIOS
// ============================================================================
const CalculadoraFitosanitarios = ({ recetas = [], onApplyToForm }) => {
  const [showCalculator, setShowCalculator] = useState(false);
  const { token } = useAuth();
  
  // State for products from DB
  const [productosDB, setProductosDB] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  
  const [calcData, setCalcData] = useState({
    superficie: '',
    unidadSuperficie: 'ha', // ha o m2
    volumenAgua: '', // L/ha
    dosisProducto: '', // L o kg por ha
    unidadDosis: 'L/ha', // L/ha, kg/ha, ml/ha, g/ha
    concentracion: '', // % concentración del producto
    nombreProducto: '',
    tipoProducto: 'insecticida', // insecticida, herbicida, fungicida, fertilizante
    plagaObjetivo: ''
  });
  
  const [alerts, setAlerts] = useState({});
  const [historial, setHistorial] = useState([]);
  
  // Límites recomendados por tipo de producto (L o kg por ha)
  const LIMITES_DOSIS = {
    insecticida: { min: 0.1, max: 3, unidad: 'L/ha' },
    herbicida: { min: 0.5, max: 5, unidad: 'L/ha' },
    fungicida: { min: 0.2, max: 4, unidad: 'L/ha' },
    fertilizante: { min: 1, max: 50, unidad: 'kg/ha' }
  };
  
  // Límites de volumen de agua por ha
  const LIMITES_AGUA = { min: 100, max: 1000 }; // L/ha
  
  // Calcular resultados
  const resultados = useMemo(() => {
    const sup = parseFloat(calcData.superficie) || 0;
    const volAgua = parseFloat(calcData.volumenAgua) || 0;
    const dosis = parseFloat(calcData.dosisProducto) || 0;
    const conc = parseFloat(calcData.concentracion) || 100;
    
    // Convertir superficie a hectáreas si está en m2
    const supHa = calcData.unidadSuperficie === 'm2' ? sup / 10000 : sup;
    
    // Cantidad total de producto necesario
    let cantidadProducto = dosis * supHa;
    
    // Si hay concentración, ajustar
    if (conc < 100 && conc > 0) {
      cantidadProducto = cantidadProducto * (100 / conc);
    }
    
    // Volumen total de agua
    const volumenTotalAgua = volAgua * supHa;
    
    // Cantidad de producto por litro de agua (para mezcla)
    const productoPorLitro = volumenTotalAgua > 0 ? (cantidadProducto / volumenTotalAgua) * 1000 : 0; // ml o g por litro
    
    // Concentración en la mezcla final
    const concentracionMezcla = volumenTotalAgua > 0 ? (cantidadProducto / volumenTotalAgua) * 100 : 0;
    
    return {
      superficieHa: supHa,
      cantidadProducto: cantidadProducto,
      volumenTotalAgua: volumenTotalAgua,
      productoPorLitro: productoPorLitro,
      concentracionMezcla: concentracionMezcla,
      dosisReal: dosis
    };
  }, [calcData]);
  
  // Verificar alertas
  useEffect(() => {
    const newAlerts = {};
    const limites = LIMITES_DOSIS[calcData.tipoProducto];
    const dosis = parseFloat(calcData.dosisProducto) || 0;
    const volAgua = parseFloat(calcData.volumenAgua) || 0;
    
    // Alerta de dosis
    if (dosis > 0 && limites) {
      if (dosis < limites.min) {
        newAlerts.dosis = { type: 'warning', message: `Dosis baja. Mínimo recomendado: ${limites.min} ${limites.unidad}` };
      } else if (dosis > limites.max) {
        newAlerts.dosis = { type: 'danger', message: `¡Dosis excesiva! Máximo recomendado: ${limites.max} ${limites.unidad}` };
      }
    }
    
    // Alerta de volumen de agua
    if (volAgua > 0) {
      if (volAgua < LIMITES_AGUA.min) {
        newAlerts.agua = { type: 'warning', message: `Volumen de agua bajo. Mínimo: ${LIMITES_AGUA.min} L/ha` };
      } else if (volAgua > LIMITES_AGUA.max) {
        newAlerts.agua = { type: 'danger', message: `Volumen excesivo. Máximo: ${LIMITES_AGUA.max} L/ha` };
      }
    }
    
    // Alerta de concentración
    if (resultados.concentracionMezcla > 5) {
      newAlerts.concentracion = { type: 'danger', message: '¡Concentración muy alta! Riesgo de fitotoxicidad' };
    } else if (resultados.concentracionMezcla > 2) {
      newAlerts.concentracion = { type: 'warning', message: 'Concentración elevada. Verificar tolerancia del cultivo' };
    }
    
    setAlerts(newAlerts);
  }, [calcData, resultados]);
  
  // Fetch products from database when tipo changes
  useEffect(() => {
    const fetchProductos = async () => {
      if (!token) return;
      setLoadingProductos(true);
      try {
        const tipoMap = {
          'insecticida': 'Insecticida',
          'herbicida': 'Herbicida',
          'fungicida': 'Fungicida',
          'fertilizante': 'Fertilizante'
        };
        const tipo = tipoMap[calcData.tipoProducto] || calcData.tipoProducto;
        const response = await fetch(`${BACKEND_URL}/api/fitosanitarios?tipo=${tipo}&activo=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProductosDB(data.productos || []);
        }
      } catch (error) {
        console.error('Error loading productos:', error);
      } finally {
        setLoadingProductos(false);
      }
    };
    
    if (showCalculator) {
      fetchProductos();
    }
  }, [calcData.tipoProducto, showCalculator, token]);
  
  // Handle product selection from DB
  const handleSelectProducto = (producto) => {
    setSelectedProducto(producto);
    setCalcData(prev => ({
      ...prev,
      nombreProducto: producto.nombre_comercial,
      dosisProducto: producto.dosis_max ? producto.dosis_max.toString() : prev.dosisProducto,
      unidadDosis: producto.unidad_dosis || 'L/ha',
      volumenAgua: producto.volumen_agua_max ? producto.volumen_agua_max.toString() : prev.volumenAgua,
      plagaObjetivo: (producto.plagas_objetivo || []).join(', ')
    }));
  };
  
  const resetCalculator = () => {
    setCalcData({
      superficie: '',
      unidadSuperficie: 'ha',
      volumenAgua: '',
      dosisProducto: '',
      unidadDosis: 'L/ha',
      concentracion: '',
      nombreProducto: '',
      tipoProducto: 'insecticida',
      plagaObjetivo: ''
    });
    setSelectedProducto(null);
    setAlerts({});
  };
  
  const guardarEnHistorial = () => {
    if (resultados.cantidadProducto > 0) {
      const registro = {
        fecha: new Date().toLocaleString(),
        ...calcData,
        resultados: { ...resultados }
      };
      setHistorial(prev => [registro, ...prev].slice(0, 10)); // Máximo 10 registros
    }
  };
  
  const aplicarAlFormulario = () => {
    if (onApplyToForm && resultados.superficieHa > 0) {
      onApplyToForm({
        superficie_aplicacion: resultados.superficieHa,
        caldo_superficie: parseFloat(calcData.volumenAgua) || 0,
        // Producto fitosanitario seleccionado
        producto_fitosanitario_id: selectedProducto?._id || null,
        producto_fitosanitario_nombre: selectedProducto?.nombre_comercial || calcData.nombreProducto || null,
        producto_fitosanitario_dosis: parseFloat(calcData.dosisProducto) || null,
        producto_fitosanitario_unidad: calcData.unidadDosis || null,
        // Datos adicionales del producto para mostrar
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
      {/* Botón para mostrar/ocultar calculadora */}
      <button
        type="button"
        onClick={() => setShowCalculator(!showCalculator)}
        className={`btn ${showCalculator ? 'btn-primary' : 'btn-secondary'}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}
        data-testid="btn-calculadora"
      >
        <Calculator size={18} />
        Calculadora de Fitosanitarios
        {hasAlerts && !showCalculator && (
          <span style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: hasDangerAlerts ? '#dc2626' : '#f59e0b',
            borderRadius: '50%'
          }} />
        )}
      </button>
      
      {showCalculator && (
        <div className="card" style={{ border: hasAlerts ? `2px solid ${hasDangerAlerts ? '#dc2626' : '#f59e0b'}` : '1px solid hsl(var(--border))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Beaker size={20} style={{ color: '#2d5a27' }} />
              Calculadora de Dosis de Fitosanitarios
            </h3>
            <button
              type="button"
              onClick={resetCalculator}
              className="btn btn-sm"
              style={{ 
                backgroundColor: '#e8f5e9', 
                color: '#2d5a27',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="Restablecer valores"
              data-testid="btn-reset-calculadora"
            >
              <RotateCcw size={14} />
              Restablecer
            </button>
          </div>
          
          {/* Alertas globales */}
          {hasAlerts && (
            <div style={{ marginBottom: '1.5rem' }}>
              {Object.entries(alerts).map(([key, alert]) => (
                <div 
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '0.5rem',
                    backgroundColor: alert.type === 'danger' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${alert.type === 'danger' ? '#fecaca' : '#fde68a'}`,
                    borderRadius: '8px',
                    color: alert.type === 'danger' ? '#dc2626' : '#d97706'
                  }}
                >
                  <AlertTriangle size={18} />
                  <span style={{ fontWeight: '500' }}>{alert.message}</span>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            {/* Columna izquierda: Inputs */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#2d5a27', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ruler size={16} /> Datos de entrada
              </h4>
              
              {/* Tipo de producto */}
              <div className="form-group">
                <label className="form-label">Tipo de Fitosanitario</label>
                <select
                  className="form-select"
                  value={calcData.tipoProducto}
                  onChange={(e) => {
                    setCalcData({...calcData, tipoProducto: e.target.value, nombreProducto: ''});
                    setSelectedProducto(null);
                  }}
                >
                  <option value="insecticida">Insecticida</option>
                  <option value="herbicida">Herbicida</option>
                  <option value="fungicida">Fungicida</option>
                  <option value="fertilizante">Fertilizante</option>
                </select>
              </div>
              
              {/* Selector de producto desde base de datos */}
              {productosDB.length > 0 && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database size={14} /> Seleccionar Producto Registrado
                  </label>
                  <select
                    className="form-select"
                    value={selectedProducto?._id || ''}
                    onChange={(e) => {
                      const prod = productosDB.find(p => p._id === e.target.value);
                      if (prod) handleSelectProducto(prod);
                    }}
                    style={{ backgroundColor: selectedProducto ? '#f0fdf4' : 'white' }}
                  >
                    <option value="">-- Seleccionar producto de la base de datos --</option>
                    {productosDB.map(prod => (
                      <option key={prod._id} value={prod._id}>
                        {prod.nombre_comercial} {prod.materia_activa ? `(${prod.materia_activa})` : ''} 
                        {prod.dosis_min && prod.dosis_max ? ` - Dosis: ${prod.dosis_min}-${prod.dosis_max} ${prod.unidad_dosis}` : ''}
                      </option>
                    ))}
                  </select>
                  {loadingProductos && <small style={{ color: 'hsl(var(--muted-foreground))' }}>Cargando productos...</small>}
                  {selectedProducto && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#f0fdf4', 
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      border: '1px solid #86efac'
                    }}>
                      <strong style={{ color: '#166534' }}>Dosis recomendada:</strong> {selectedProducto.dosis_min}-{selectedProducto.dosis_max} {selectedProducto.unidad_dosis}
                      {selectedProducto.plazo_seguridad && (
                        <span style={{ marginLeft: '1rem' }}>
                          | <strong>Plazo seguridad:</strong> {selectedProducto.plazo_seguridad} días
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Nombre del producto (manual o auto-rellenado) */}
              <div className="form-group">
                <label className="form-label">Nombre del Producto</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Cipermetrina 20%"
                  value={calcData.nombreProducto}
                  onChange={(e) => setCalcData({...calcData, nombreProducto: e.target.value})}
                  style={{ backgroundColor: selectedProducto ? '#f0fdf4' : 'white' }}
                />
              </div>
              
              {/* Superficie */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Superficie a Tratar
                  {alerts.superficie && <AlertTriangle size={14} style={{ color: '#dc2626' }} />}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ej: 5"
                    value={calcData.superficie}
                    onChange={(e) => setCalcData({...calcData, superficie: e.target.value})}
                    min="0"
                    step="0.01"
                    style={{ flex: 1 }}
                  />
                  <select
                    className="form-select"
                    value={calcData.unidadSuperficie}
                    onChange={(e) => setCalcData({...calcData, unidadSuperficie: e.target.value})}
                    style={{ width: '80px' }}
                  >
                    <option value="ha">Ha</option>
                    <option value="m2">m²</option>
                  </select>
                </div>
              </div>
              
              {/* Volumen de agua */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Droplets size={14} />
                  Volumen de Agua (L/ha)
                  {alerts.agua && <AlertTriangle size={14} style={{ color: alerts.agua.type === 'danger' ? '#dc2626' : '#f59e0b' }} />}
                </label>
                <input
                  type="number"
                  className={`form-input ${alerts.agua ? (alerts.agua.type === 'danger' ? 'border-red-500' : 'border-yellow-500') : ''}`}
                  placeholder="Ej: 400"
                  value={calcData.volumenAgua}
                  onChange={(e) => setCalcData({...calcData, volumenAgua: e.target.value})}
                  min="0"
                  step="10"
                  style={alerts.agua ? { borderColor: alerts.agua.type === 'danger' ? '#dc2626' : '#f59e0b', borderWidth: '2px' } : {}}
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Recomendado: {LIMITES_AGUA.min}-{LIMITES_AGUA.max} L/ha</small>
              </div>
              
              {/* Dosis del producto */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Beaker size={14} />
                  Dosis del Producto
                  {alerts.dosis && <AlertTriangle size={14} style={{ color: alerts.dosis.type === 'danger' ? '#dc2626' : '#f59e0b' }} />}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ej: 1.5"
                    value={calcData.dosisProducto}
                    onChange={(e) => setCalcData({...calcData, dosisProducto: e.target.value})}
                    min="0"
                    step="0.01"
                    style={alerts.dosis ? { borderColor: alerts.dosis.type === 'danger' ? '#dc2626' : '#f59e0b', borderWidth: '2px', flex: 1 } : { flex: 1 }}
                  />
                  <select
                    className="form-select"
                    value={calcData.unidadDosis}
                    onChange={(e) => setCalcData({...calcData, unidadDosis: e.target.value})}
                    style={{ width: '90px' }}
                  >
                    <option value="L/ha">L/ha</option>
                    <option value="kg/ha">kg/ha</option>
                    <option value="ml/ha">ml/ha</option>
                    <option value="g/ha">g/ha</option>
                  </select>
                </div>
                {LIMITES_DOSIS[calcData.tipoProducto] && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Rango típico para {calcData.tipoProducto}: {LIMITES_DOSIS[calcData.tipoProducto].min}-{LIMITES_DOSIS[calcData.tipoProducto].max} {LIMITES_DOSIS[calcData.tipoProducto].unidad}
                  </small>
                )}
              </div>
              
              {/* Concentración del producto (opcional) */}
              <div className="form-group">
                <label className="form-label">Concentración del Producto (%)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Ej: 20 (dejar vacío si es 100%)"
                  value={calcData.concentracion}
                  onChange={(e) => setCalcData({...calcData, concentracion: e.target.value})}
                  min="0"
                  max="100"
                  step="0.1"
                />
                <small style={{ color: 'hsl(var(--muted-foreground))' }}>Si el producto es concentrado al 20%, indica 20</small>
              </div>
              
              {/* Plaga objetivo */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bug size={14} />
                  Plaga/Enfermedad Objetivo
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: Pulgón, Mildiu, Grama..."
                  value={calcData.plagaObjetivo}
                  onChange={(e) => setCalcData({...calcData, plagaObjetivo: e.target.value})}
                />
              </div>
            </div>
            
            {/* Columna derecha: Resultados */}
            <div>
              <h4 style={{ marginBottom: '1rem', color: '#2d5a27', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={16} /> Resultados del Cálculo
              </h4>
              
              <div style={{ 
                backgroundColor: hasDangerAlerts ? '#fef2f2' : '#f0fdf4', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: `2px solid ${hasDangerAlerts ? '#fecaca' : '#bbf7d0'}`
              }}>
                {/* Superficie en Ha */}
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>
                    Superficie Total
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d5a27' }}>
                    {resultados.superficieHa.toFixed(2)} Ha
                  </div>
                  {calcData.unidadSuperficie === 'm2' && calcData.superficie && (
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      ({parseFloat(calcData.superficie).toLocaleString()} m²)
                    </div>
                  )}
                </div>
                
                {/* Cantidad de producto */}
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>
                    Cantidad Total de Producto
                  </div>
                  <div style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: '700', 
                    color: hasDangerAlerts ? '#dc2626' : '#2d5a27',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {resultados.cantidadProducto.toFixed(2)} {calcData.unidadDosis.includes('L') ? 'L' : 'kg'}
                    {alerts.dosis && <AlertTriangle size={20} style={{ color: alerts.dosis.type === 'danger' ? '#dc2626' : '#f59e0b' }} />}
                  </div>
                  {calcData.nombreProducto && (
                    <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                      de {calcData.nombreProducto}
                    </div>
                  )}
                </div>
                
                {/* Volumen total de agua */}
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>
                    Volumen Total de Agua
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0ea5e9' }}>
                    {resultados.volumenTotalAgua.toFixed(0)} L
                  </div>
                </div>
                
                {/* Mezcla por litro */}
                <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', border: alerts.concentracion ? '2px solid #f59e0b' : 'none' }}>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>
                    Producto por Litro de Agua
                  </div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700', 
                    color: alerts.concentracion ? (alerts.concentracion.type === 'danger' ? '#dc2626' : '#d97706') : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {resultados.productoPorLitro.toFixed(2)} {calcData.unidadDosis.includes('L') ? 'ml' : 'g'}/L
                    {alerts.concentracion && <AlertTriangle size={16} />}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    Concentración: {resultados.concentracionMezcla.toFixed(3)}%
                  </div>
                </div>
                
                {/* Tabla resumen */}
                <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Resumen de la Mezcla:</div>
                  <table style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '0.25rem 0' }}>Tipo:</td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{calcData.tipoProducto}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '0.25rem 0' }}>Dosis aplicada:</td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{calcData.dosisProducto || '—'} {calcData.unidadDosis}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '0.25rem 0' }}>Caldo/ha:</td>
                        <td style={{ textAlign: 'right', fontWeight: '500' }}>{calcData.volumenAgua || '—'} L/ha</td>
                      </tr>
                      {calcData.plagaObjetivo && (
                        <tr>
                          <td style={{ padding: '0.25rem 0' }}>Objetivo:</td>
                          <td style={{ textAlign: 'right', fontWeight: '500' }}>{calcData.plagaObjetivo}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={guardarEnHistorial}
                  className="btn btn-secondary"
                  disabled={resultados.cantidadProducto <= 0}
                  style={{ flex: 1 }}
                >
                  Guardar en Historial
                </button>
                <button
                  type="button"
                  onClick={aplicarAlFormulario}
                  className="btn btn-primary"
                  disabled={resultados.superficieHa <= 0}
                  style={{ flex: 1 }}
                >
                  Aplicar al Tratamiento
                </button>
              </div>
            </div>
          </div>
          
          {/* Historial de cálculos */}
          {historial.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Historial de Cálculos</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Superficie</th>
                      <th>Cantidad</th>
                      <th>Agua Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h, idx) => (
                      <tr key={idx}>
                        <td>{h.fecha}</td>
                        <td>{h.nombreProducto || h.tipoProducto}</td>
                        <td>{h.resultados.superficieHa.toFixed(2)} ha</td>
                        <td>{h.resultados.cantidadProducto.toFixed(2)} {h.unidadDosis.includes('L') ? 'L' : 'kg'}</td>
                        <td>{h.resultados.volumenTotalAgua.toFixed(0)} L</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Información adicional */}
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: '#f0f9ff', 
            borderRadius: '8px',
            border: '1px solid #bae6fd',
            fontSize: '0.8rem'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#0369a1' }}>
              <Info size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Consideraciones importantes:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#0c4a6e' }}>
              <li>Siempre lea la etiqueta del producto antes de aplicar</li>
              <li>Respete los plazos de seguridad indicados por el fabricante</li>
              <li>Use equipo de protección personal adecuado</li>
              <li>Las dosis varían según cultivo, plaga y condiciones climáticas</li>
              <li>En agricultura ecológica, use solo productos autorizados</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Default field configuration
const DEFAULT_FIELDS_CONFIG = {
  tipo_tratamiento: true,
  subtipo: true,
  metodo_aplicacion: true,
  aplicacion_numero: true,
  parcelas_ids: true,
  superficie_aplicacion: true,
  caldo_superficie: true,
  fecha_tratamiento: true,
  fecha_aplicacion: true,
  aplicador_nombre: true,
  maquina_id: true
};

const FIELD_LABELS = {
  tipo_tratamiento: 'Tipo Tratamiento',
  subtipo: 'Subtipo',
  metodo_aplicacion: 'Método Aplicación',
  aplicacion_numero: 'Nº Aplicación',
  parcelas_ids: 'Parcelas',
  superficie_aplicacion: 'Superficie',
  caldo_superficie: 'Caldo/Superficie',
  fecha_tratamiento: 'Fecha Tratamiento',
  fecha_aplicacion: 'Fecha Aplicación',
  aplicador_nombre: 'Aplicador',
  maquina_id: 'Máquina'
};

// Table columns config
const DEFAULT_TABLE_CONFIG = {
  tipo: true,
  subtipo: true,
  metodo: true,
  campana: true,
  fecha_tratamiento: true,
  fecha_aplicacion: true,
  superficie: true,
  parcelas: true,
  aplicador: true,
  maquina: true,
  estado: true
};

const TABLE_LABELS = {
  tipo: 'Tipo',
  subtipo: 'Subtipo',
  metodo: 'Método',
  campana: 'Campaña',
  fecha_tratamiento: 'F. Tratamiento',
  fecha_aplicacion: 'F. Aplicación',
  superficie: 'Superficie',
  parcelas: 'Parcelas',
  aplicador: 'Aplicador',
  maquina: 'Máquina',
  estado: 'Estado'
};

const Tratamientos = () => {
  const { t } = useTranslation();
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  
  // Solo necesitamos parcelas para el selector
  const [parcelas, setParcelas] = useState([]);
  const [maquinaria, setMaquinaria] = useState([]);
  const [selectedParcelas, setSelectedParcelas] = useState([]);
  const [selectedParcelasInfo, setSelectedParcelasInfo] = useState(null);
  
  // Filtros de búsqueda de parcelas (dentro del formulario)
  const [parcelaSearch, setParcelaSearch] = useState({
    proveedor: '',
    cultivo: '',
    campana: ''
  });
  
  // Opciones únicas para filtros de parcelas (dentro del formulario)
  const [parcelaFilterOptions, setParcelaFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: []
  });
  
  // Filtros
  const [filters, setFilters] = useState({
    proveedor: '',
    cultivo: '',
    campana: '',
    tipo_tratamiento: ''
  });
  
  // Configuración de campos del formulario
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('tratamientos_fields_config');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Configuración de columnas de la tabla
  const [tableConfig, setTableConfig] = useState(() => {
    const saved = localStorage.getItem('tratamientos_table_config');
    return saved ? JSON.parse(saved) : DEFAULT_TABLE_CONFIG;
  });
  
  // Opciones únicas para filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: [],
    tipos: []
  });
  
  // Técnicos Aplicadores para selector
  const [tecnicosAplicadores, setTecnicosAplicadores] = useState([]);
  
  // Form data SIMPLIFICADO
  const [formData, setFormData] = useState({
    tipo_tratamiento: 'FITOSANITARIOS',
    subtipo: 'Insecticida',
    aplicacion_numero: 1,
    metodo_aplicacion: 'Pulverización',
    superficie_aplicacion: '',
    caldo_superficie: '',
    parcelas_ids: [],
    fecha_tratamiento: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    fecha_aplicacion: '',
    aplicador_nombre: '',
    maquina_id: '',
    // Producto fitosanitario desde calculadora
    producto_fitosanitario_id: '',
    producto_fitosanitario_nombre: '',
    producto_fitosanitario_dosis: '',
    producto_fitosanitario_unidad: '',
    producto_materia_activa: '',
    producto_plazo_seguridad: ''
  });
  
  useEffect(() => {
    fetchTratamientos();
    fetchParcelas();
    fetchMaquinaria();
    fetchTecnicosAplicadores();
  }, []);
  
  // Extraer opciones únicas cuando cambian los tratamientos
  useEffect(() => {
    // También necesitamos datos de parcelas para proveedor y cultivo
    const proveedores = [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))];
    const cultivos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
    const campanas = [...new Set(tratamientos.map(t => t.campana).filter(Boolean))];
    const tipos = [...new Set(tratamientos.map(t => t.tipo_tratamiento).filter(Boolean))];
    
    setFilterOptions({
      proveedores,
      cultivos,
      campanas,
      tipos
    });
  }, [tratamientos, parcelas]);
  
  // Extraer opciones únicas de parcelas para el buscador del formulario
  useEffect(() => {
    const proveedores = [...new Set(parcelas.map(p => p.proveedor).filter(Boolean))];
    const cultivos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];
    const campanas = [...new Set(parcelas.map(p => p.campana).filter(Boolean))];
    
    setParcelaFilterOptions({
      proveedores,
      cultivos,
      campanas
    });
  }, [parcelas]);
  
  // Guardar configuración en localStorage
  useEffect(() => {
    localStorage.setItem('tratamientos_fields_config', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  useEffect(() => {
    localStorage.setItem('tratamientos_table_config', JSON.stringify(tableConfig));
  }, [tableConfig]);
  
  // Cuando se seleccionan parcelas, mostrar info heredada de la primera
  useEffect(() => {
    if (selectedParcelas.length > 0) {
      const firstParcela = parcelas.find(p => p._id === selectedParcelas[0]);
      setSelectedParcelasInfo(firstParcela || null);
    } else {
      setSelectedParcelasInfo(null);
    }
  }, [selectedParcelas, parcelas]);
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setParcelas(data.parcelas || []);
      }
    } catch (error) {
      console.error('Error fetching parcelas:', error);
    }
  };
  
  const fetchMaquinaria = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/maquinaria`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMaquinaria(data.maquinaria || []);
      }
    } catch (error) {
      console.error('Error fetching maquinaria:', error);
    }
  };
  
  const fetchTecnicosAplicadores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tecnicos-aplicadores/activos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTecnicosAplicadores(data.tecnicos || []);
      }
    } catch (error) {
      console.error('Error fetching tecnicos aplicadores:', error);
    }
  };
  
  const fetchTratamientos = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/tratamientos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      setTratamientos(data.tratamientos || []);
    } catch (error) {
      console.error('Error fetching tratamientos:', error);
      const errorMsg = handlePermissionError(error, 'ver los tratamientos');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar tratamientos
  const filteredTratamientos = tratamientos.filter(t => {
    if (filters.campana && t.campana !== filters.campana) return false;
    if (filters.tipo_tratamiento && t.tipo_tratamiento !== filters.tipo_tratamiento) return false;
    // Para proveedor y cultivo necesitamos buscar en las parcelas asociadas
    if (filters.proveedor || filters.cultivo) {
      const parcelasIds = t.parcelas_ids || [];
      const matchingParcelas = parcelas.filter(p => parcelasIds.includes(p._id));
      if (filters.proveedor && !matchingParcelas.some(p => p.proveedor === filters.proveedor)) return false;
      if (filters.cultivo && !matchingParcelas.some(p => p.cultivo === filters.cultivo)) return false;
    }
    return true;
  });
  
  const clearFilters = () => {
    setFilters({ proveedor: '', cultivo: '', campana: '', tipo_tratamiento: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const toggleTableConfig = (field) => {
    setTableConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  const handleParcelaSelection = (parcelaId) => {
    const isSelected = selectedParcelas.includes(parcelaId);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedParcelas.filter(id => id !== parcelaId);
    } else {
      newSelection = [...selectedParcelas, parcelaId];
    }
    
    setSelectedParcelas(newSelection);
    setFormData(prev => ({ ...prev, parcelas_ids: newSelection }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar solo parcelas_ids (obligatorio)
    if (formData.parcelas_ids.length === 0) {
      setError('Debe seleccionar al menos una Parcela');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/tratamientos/${editingId}`
        : `${BACKEND_URL}/api/tratamientos`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Payload simplificado - el backend hereda el resto
      const payload = {
        tipo_tratamiento: formData.tipo_tratamiento,
        subtipo: formData.subtipo,
        aplicacion_numero: parseInt(formData.aplicacion_numero),
        metodo_aplicacion: formData.metodo_aplicacion,
        superficie_aplicacion: parseFloat(formData.superficie_aplicacion) || 0,
        caldo_superficie: parseFloat(formData.caldo_superficie) || 0,
        parcelas_ids: formData.parcelas_ids,
        fecha_tratamiento: formData.fecha_tratamiento || null,
        fecha_aplicacion: formData.fecha_aplicacion || null,
        aplicador_nombre: formData.aplicador_nombre || null,
        maquina_id: formData.maquina_id || null,
        // Producto fitosanitario
        producto_fitosanitario_id: formData.producto_fitosanitario_id || null,
        producto_fitosanitario_nombre: formData.producto_fitosanitario_nombre || null,
        producto_fitosanitario_dosis: parseFloat(formData.producto_fitosanitario_dosis) || null,
        producto_fitosanitario_unidad: formData.producto_fitosanitario_unidad || null
      };
      
      const response = await fetch(url, {
        method: method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setEditingId(null);
        fetchTratamientos();
        setFormData({
          tipo_tratamiento: 'FITOSANITARIOS',
          subtipo: 'Insecticida',
          aplicacion_numero: 1,
          metodo_aplicacion: 'Pulverización',
          superficie_aplicacion: '',
          caldo_superficie: '',
          parcelas_ids: [],
          fecha_tratamiento: new Date().toISOString().split('T')[0],
          fecha_aplicacion: '',
          aplicador_nombre: '',
          maquina_id: '',
          producto_fitosanitario_id: '',
          producto_fitosanitario_nombre: '',
          producto_fitosanitario_dosis: '',
          producto_fitosanitario_unidad: '',
          producto_materia_activa: '',
          producto_plazo_seguridad: ''
        });
        setSelectedParcelas([]);
        setSelectedParcelasInfo(null);
        setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
      }
    } catch (error) {
      console.error('Error saving tratamiento:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el tratamiento' : 'crear el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const handleEdit = (tratamiento) => {
    setEditingId(tratamiento._id);
    setFormData({
      tipo_tratamiento: tratamiento.tipo_tratamiento || 'FITOSANITARIOS',
      subtipo: tratamiento.subtipo || 'Insecticida',
      aplicacion_numero: tratamiento.aplicacion_numero || 1,
      metodo_aplicacion: tratamiento.metodo_aplicacion || 'Pulverización',
      superficie_aplicacion: tratamiento.superficie_aplicacion || '',
      caldo_superficie: tratamiento.caldo_superficie || '',
      parcelas_ids: tratamiento.parcelas_ids || [],
      fecha_tratamiento: tratamiento.fecha_tratamiento || '',
      fecha_aplicacion: tratamiento.fecha_aplicacion || '',
      aplicador_nombre: tratamiento.aplicador_nombre || '',
      maquina_id: tratamiento.maquina_id || '',
      producto_fitosanitario_id: tratamiento.producto_fitosanitario_id || '',
      producto_fitosanitario_nombre: tratamiento.producto_fitosanitario_nombre || '',
      producto_fitosanitario_dosis: tratamiento.producto_fitosanitario_dosis || '',
      producto_fitosanitario_unidad: tratamiento.producto_fitosanitario_unidad || '',
      producto_materia_activa: tratamiento.producto_materia_activa || '',
      producto_plazo_seguridad: tratamiento.producto_plazo_seguridad || ''
    });
    setSelectedParcelas(tratamiento.parcelas_ids || []);
    setShowForm(true);
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setSelectedParcelas([]);
    setSelectedParcelasInfo(null);
    setParcelaSearch({ proveedor: '', cultivo: '', campana: '' });
    setFormData({
      tipo_tratamiento: 'FITOSANITARIOS',
      subtipo: 'Insecticida',
      aplicacion_numero: 1,
      metodo_aplicacion: 'Pulverización',
      superficie_aplicacion: '',
      caldo_superficie: '',
      parcelas_ids: [],
      fecha_tratamiento: new Date().toISOString().split('T')[0],
      fecha_aplicacion: '',
      aplicador_nombre: '',
      maquina_id: '',
      producto_fitosanitario_id: '',
      producto_fitosanitario_nombre: '',
      producto_fitosanitario_dosis: '',
      producto_fitosanitario_unidad: '',
      producto_materia_activa: '',
      producto_plazo_seguridad: ''
    });
  };
  
  const handleDelete = async (tratamientoId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar tratamientos');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este tratamiento?')) {
      return;
    }
    
    try {
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/tratamientos/${tratamientoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.detail };
      }
      
      fetchTratamientos();
    } catch (error) {
      console.error('Error deleting tratamiento:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el tratamiento');
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    }
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== '');
  
  return (
    <div data-testid="tratamientos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Tratamientos</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title="Configurar campos visibles"
            data-testid="btn-config-fields"
          >
            <Settings size={18} />
          </button>
          <PermissionButton
            permission="create"
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
            data-testid="btn-nuevo-tratamiento"
          >
            <Plus size={18} />
            Nuevo Tratamiento
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}
      
      {/* Panel de configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Campos</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Campos del Formulario:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={fieldsConfig[key]}
                    onChange={() => toggleFieldConfig(key)}
                    disabled={key === 'parcelas_ids'} // parcelas_ids siempre obligatorio
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label} {key === 'parcelas_ids' && '(obligatorio)'}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Columnas de la Tabla:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(TABLE_LABELS).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={tableConfig[key]}
                    onChange={() => toggleTableConfig(key)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Filtros de búsqueda */}
      <div className="card mb-6" data-testid="filters-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros de Búsqueda
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor</label>
            <select
              className="form-select"
              value={filters.proveedor}
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
              data-testid="filter-proveedor"
            >
              <option value="">Todos</option>
              {filterOptions.proveedores.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cultivo</label>
            <select
              className="form-select"
              value={filters.cultivo}
              onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
              data-testid="filter-cultivo"
            >
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
              data-testid="filter-campana"
            >
              <option value="">Todas</option>
              {filterOptions.campanas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo Tratamiento</label>
            <select
              className="form-select"
              value={filters.tipo_tratamiento}
              onChange={(e) => setFilters({...filters, tipo_tratamiento: e.target.value})}
              data-testid="filter-tipo"
            >
              <option value="">Todos</option>
              {filterOptions.tipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            Mostrando {filteredTratamientos.length} de {tratamientos.length} tratamientos
          </p>
        )}
      </div>
      
      {showForm && (
        <div className="card mb-6" data-testid="tratamiento-form">
          <h2 className="card-title">{editingId ? 'Editar Tratamiento' : 'Crear Tratamiento'}</h2>
          <form onSubmit={handleSubmit}>
            {/* Información del modelo simplificado */}
            <div className="card" style={{ backgroundColor: 'hsl(var(--muted))', marginBottom: '1.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                <Info size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                <strong>Modelo simplificado:</strong> Solo selecciona las Parcelas. El Contrato, Cultivo y Campaña se heredan automáticamente de la primera parcela seleccionada.
              </p>
            </div>
            
            {/* Tipo de tratamiento */}
            <div className="grid-3">
              {fieldsConfig.tipo_tratamiento && (
                <div className="form-group">
                  <label className="form-label">Tipo de Tratamiento *</label>
                  <select
                    className="form-select"
                    value={formData.tipo_tratamiento}
                    onChange={(e) => setFormData({...formData, tipo_tratamiento: e.target.value})}
                    required
                    data-testid="select-tipo-tratamiento"
                  >
                    <option value="FITOSANITARIOS">Fitosanitarios</option>
                    <option value="NUTRICIÓN">Nutrición</option>
                    <option value="ENMIENDAS">Enmiendas</option>
                  </select>
                </div>
              )}
              
              {fieldsConfig.subtipo && (
                <div className="form-group">
                  <label className="form-label">Subtipo</label>
                  <select
                    className="form-select"
                    value={formData.subtipo}
                    onChange={(e) => setFormData({...formData, subtipo: e.target.value})}
                    data-testid="select-subtipo"
                  >
                    <option value="Insecticida">Insecticida</option>
                    <option value="Fungicida">Fungicida</option>
                    <option value="Herbicida">Herbicida</option>
                    <option value="Acaricida">Acaricida</option>
                    <option value="Fertilizante">Fertilizante</option>
                    <option value="Bioestimulante">Bioestimulante</option>
                  </select>
                </div>
              )}
              
              {fieldsConfig.metodo_aplicacion && (
                <div className="form-group">
                  <label className="form-label">Método de Aplicación *</label>
                  <select
                    className="form-select"
                    value={formData.metodo_aplicacion}
                    onChange={(e) => setFormData({...formData, metodo_aplicacion: e.target.value})}
                    required
                    data-testid="select-metodo-aplicacion"
                  >
                    <option value="Pulverización">Pulverización</option>
                    <option value="Quimigación">Quimigación (fertirrigación)</option>
                    <option value="Espolvoreo">Espolvoreo</option>
                    <option value="Aplicación Foliar">Aplicación Foliar</option>
                    <option value="Aplicación al Suelo">Aplicación al Suelo</option>
                  </select>
                </div>
              )}
            </div>
            
            {fieldsConfig.aplicacion_numero && (
              <div className="form-group">
                <label className="form-label">Nº Aplicación *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={formData.aplicacion_numero}
                  onChange={(e) => setFormData({...formData, aplicacion_numero: parseInt(e.target.value)})}
                  required
                  style={{ maxWidth: '150px' }}
                  data-testid="input-aplicacion-numero"
                />
              </div>
            )}
            
            {/* Selección de parcelas (múltiple) CON BÚSQUEDA - SIEMPRE VISIBLE */}
            <div className="form-group">
              <label className="form-label">Parcelas a Tratar * (Obligatorio - selecciona una o varias)</label>
              
              {/* Filtros de búsqueda de parcelas */}
              <div style={{ 
                backgroundColor: 'hsl(var(--muted))', 
                padding: '1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '0.75rem' 
              }}>
                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>
                  Buscar parcelas por:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Proveedor</label>
                    <select
                      className="form-select"
                      value={parcelaSearch.proveedor}
                      onChange={(e) => setParcelaSearch({...parcelaSearch, proveedor: e.target.value})}
                      style={{ fontSize: '0.875rem' }}
                      data-testid="parcela-search-proveedor"
                    >
                      <option value="">Todos</option>
                      {parcelaFilterOptions.proveedores.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Cultivo</label>
                    <select
                      className="form-select"
                      value={parcelaSearch.cultivo}
                      onChange={(e) => setParcelaSearch({...parcelaSearch, cultivo: e.target.value})}
                      style={{ fontSize: '0.875rem' }}
                      data-testid="parcela-search-cultivo"
                    >
                      <option value="">Todos</option>
                      {parcelaFilterOptions.cultivos.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: '500' }}>Campaña</label>
                    <select
                      className="form-select"
                      value={parcelaSearch.campana}
                      onChange={(e) => setParcelaSearch({...parcelaSearch, campana: e.target.value})}
                      style={{ fontSize: '0.875rem' }}
                      data-testid="parcela-search-campana"
                    >
                      <option value="">Todas</option>
                      {parcelaFilterOptions.campanas.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(parcelaSearch.proveedor || parcelaSearch.cultivo || parcelaSearch.campana) && (
                  <button
                    type="button"
                    onClick={() => setParcelaSearch({ proveedor: '', cultivo: '', campana: '' })}
                    style={{ 
                      marginTop: '0.5rem', 
                      fontSize: '0.75rem', 
                      color: 'hsl(var(--primary))',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Limpiar filtros de búsqueda
                  </button>
                )}
              </div>
              
              {/* Lista de parcelas filtrada */}
              <div style={{ 
                border: '1px solid hsl(var(--border))', 
                borderRadius: '0.5rem', 
                padding: '1rem', 
                maxHeight: '200px', 
                overflowY: 'auto',
                backgroundColor: 'hsl(var(--background))'
              }}>
                {parcelas.length === 0 ? (
                  <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                    No hay parcelas disponibles. Crea una parcela primero.
                  </p>
                ) : (
                  parcelas
                    .filter(p => {
                      if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
                      if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
                      if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
                      return true;
                    })
                    .map(p => (
                      <label 
                        key={p._id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0.5rem', 
                          cursor: 'pointer',
                          borderBottom: '1px solid hsl(var(--border))'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedParcelas.includes(p._id)}
                          onChange={() => handleParcelaSelection(p._id)}
                          style={{ marginRight: '0.75rem' }}
                          data-testid={`checkbox-parcela-${p._id}`}
                        />
                        <span>
                          <strong>{p.codigo_plantacion}</strong> - {p.proveedor} - {p.cultivo} ({p.variedad}) - {p.superficie_total} ha
                        </span>
                      </label>
                    ))
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                {selectedParcelas.length > 0 && (
                  <small style={{ color: 'hsl(var(--primary))' }}>
                    {selectedParcelas.length} parcela(s) seleccionada(s)
                  </small>
                )}
                {(parcelaSearch.proveedor || parcelaSearch.cultivo || parcelaSearch.campana) && (
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Mostrando {parcelas.filter(p => {
                      if (parcelaSearch.proveedor && p.proveedor !== parcelaSearch.proveedor) return false;
                      if (parcelaSearch.cultivo && p.cultivo !== parcelaSearch.cultivo) return false;
                      if (parcelaSearch.campana && p.campana !== parcelaSearch.campana) return false;
                      return true;
                    }).length} de {parcelas.length} parcelas
                  </small>
                )}
              </div>
            </div>
            
            {/* Mostrar información heredada de la primera parcela seleccionada */}
            {selectedParcelasInfo && (
              <div className="card" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)', marginBottom: '1.5rem', padding: '1rem', border: '1px solid hsl(var(--primary) / 0.3)' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Datos heredados (de la primera parcela):</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Proveedor:</strong> {selectedParcelasInfo.proveedor}</div>
                  <div><strong>Cultivo:</strong> {selectedParcelasInfo.cultivo}</div>
                  <div><strong>Campaña:</strong> {selectedParcelasInfo.campana}</div>
                  <div><strong>Finca:</strong> {selectedParcelasInfo.finca}</div>
                </div>
              </div>
            )}
            
            {/* Calculadora de Fitosanitarios */}
            <CalculadoraFitosanitarios 
              onApplyToForm={(values) => {
                setFormData(prev => ({
                  ...prev,
                  superficie_aplicacion: values.superficie_aplicacion || prev.superficie_aplicacion,
                  caldo_superficie: values.caldo_superficie || prev.caldo_superficie,
                  // Producto fitosanitario
                  producto_fitosanitario_id: values.producto_fitosanitario_id || prev.producto_fitosanitario_id,
                  producto_fitosanitario_nombre: values.producto_fitosanitario_nombre || prev.producto_fitosanitario_nombre,
                  producto_fitosanitario_dosis: values.producto_fitosanitario_dosis || prev.producto_fitosanitario_dosis,
                  producto_fitosanitario_unidad: values.producto_fitosanitario_unidad || prev.producto_fitosanitario_unidad,
                  producto_materia_activa: values.producto_materia_activa || prev.producto_materia_activa,
                  producto_plazo_seguridad: values.producto_plazo_seguridad || prev.producto_plazo_seguridad
                }));
              }}
            />
            
            {/* Mostrar producto seleccionado */}
            {formData.producto_fitosanitario_nombre && (
              <div className="card" style={{ 
                backgroundColor: '#f0fdf4', 
                border: '2px solid #86efac', 
                marginBottom: '1.5rem', 
                padding: '1rem' 
              }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Beaker size={16} /> Producto Fitosanitario Seleccionado
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>Producto:</strong> {formData.producto_fitosanitario_nombre}</div>
                  {formData.producto_materia_activa && (
                    <div><strong>Materia Activa:</strong> {formData.producto_materia_activa}</div>
                  )}
                  {formData.producto_fitosanitario_dosis && (
                    <div><strong>Dosis:</strong> {formData.producto_fitosanitario_dosis} {formData.producto_fitosanitario_unidad}</div>
                  )}
                  {formData.producto_plazo_seguridad && (
                    <div><strong>Plazo Seguridad:</strong> {formData.producto_plazo_seguridad} días</div>
                  )}
                </div>
                <button 
                  type="button"
                  className="btn btn-sm btn-secondary mt-2"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    producto_fitosanitario_id: '',
                    producto_fitosanitario_nombre: '',
                    producto_fitosanitario_dosis: '',
                    producto_fitosanitario_unidad: '',
                    producto_materia_activa: '',
                    producto_plazo_seguridad: ''
                  }))}
                  style={{ fontSize: '0.75rem' }}
                >
                  <X size={14} /> Quitar producto
                </button>
              </div>
            )}
            
            {/* Datos técnicos */}
            <div className="grid-2">
              {fieldsConfig.superficie_aplicacion && (
                <div className="form-group">
                  <label className="form-label">Superficie a Tratar (ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.superficie_aplicacion}
                    onChange={(e) => setFormData({...formData, superficie_aplicacion: e.target.value})}
                    required
                    data-testid="input-superficie-aplicacion"
                  />
                </div>
              )}
              
              {fieldsConfig.caldo_superficie && (
                <div className="form-group">
                  <label className="form-label">Caldo por Superficie (L/ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={formData.caldo_superficie}
                    onChange={(e) => setFormData({...formData, caldo_superficie: e.target.value})}
                    placeholder="Litros por hectárea"
                    required
                    data-testid="input-caldo-superficie"
                  />
                </div>
              )}
            </div>
            
            {/* Fechas */}
            <div className="grid-2">
              {fieldsConfig.fecha_tratamiento && (
                <div className="form-group">
                  <label className="form-label">Fecha Tratamiento</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_tratamiento}
                    onChange={(e) => setFormData({...formData, fecha_tratamiento: e.target.value})}
                    data-testid="input-fecha-tratamiento"
                  />
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Fecha cuando se genera/registra el tratamiento
                  </small>
                </div>
              )}
              
              {fieldsConfig.fecha_aplicacion && (
                <div className="form-group">
                  <label className="form-label">Fecha Aplicación</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_aplicacion}
                    onChange={(e) => setFormData({...formData, fecha_aplicacion: e.target.value})}
                    data-testid="input-fecha-aplicacion"
                  />
                  <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Fecha cuando se realiza la aplicación (aplicador y máquina)
                  </small>
                </div>
              )}
            </div>
            
            {/* Aplicador y Máquina */}
            <div className="grid-2">
              {fieldsConfig.aplicador_nombre && (
                <div className="form-group">
                  <label className="form-label">Aplicador</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.aplicador_nombre}
                    onChange={(e) => setFormData({...formData, aplicador_nombre: e.target.value})}
                    placeholder="Nombre del aplicador"
                    data-testid="input-aplicador-nombre"
                  />
                </div>
              )}
              
              {fieldsConfig.maquina_id && (
                <div className="form-group">
                  <label className="form-label">Máquina</label>
                  <select
                    className="form-select"
                    value={formData.maquina_id}
                    onChange={(e) => setFormData({...formData, maquina_id: e.target.value})}
                    data-testid="select-maquina"
                  >
                    <option value="">-- Seleccionar máquina --</option>
                    {maquinaria.filter(m => m.estado === 'Operativo').map(m => (
                      <option key={m._id} value={m._id}>
                        {m.nombre} {m.tipo && `(${m.tipo})`} {m.matricula && `- ${m.matricula}`}
                      </option>
                    ))}
                  </select>
                  {maquinaria.length === 0 && (
                    <small style={{ color: 'hsl(var(--muted-foreground))' }}>
                      No hay maquinaria registrada. Puedes añadirla desde el catálogo de Maquinaria.
                    </small>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" data-testid="btn-guardar-tratamiento">
                {editingId ? 'Actualizar Tratamiento' : 'Guardar Tratamiento'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="card">
        <h2 className="card-title">Lista de Tratamientos ({filteredTratamientos.length})</h2>
        {loading ? (
          <p>Cargando tratamientos...</p>
        ) : filteredTratamientos.length === 0 ? (
          <p className="text-muted">{hasActiveFilters ? 'No hay tratamientos que coincidan con los filtros' : 'No hay tratamientos registrados. Crea el primero!'}</p>
        ) : (
          <div className="table-container">
            <table data-testid="tratamientos-table">
              <thead>
                <tr>
                  {tableConfig.tipo ? <th>Tipo</th> : null}
                  {tableConfig.subtipo ? <th>Subtipo</th> : null}
                  {tableConfig.metodo ? <th>Método</th> : null}
                  {tableConfig.campana ? <th>Campaña</th> : null}
                  {tableConfig.fecha_tratamiento ? <th>F. Tratamiento</th> : null}
                  {tableConfig.fecha_aplicacion ? <th>F. Aplicación</th> : null}
                  {tableConfig.superficie ? <th>Superficie</th> : null}
                  {tableConfig.parcelas ? <th>Parcelas</th> : null}
                  {tableConfig.aplicador ? <th>Aplicador</th> : null}
                  {tableConfig.maquina ? <th>Máquina</th> : null}
                  {tableConfig.estado ? <th>Estado</th> : null}
                  {(canEdit || canDelete) ? <th>Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredTratamientos.map((tratamiento) => (
                  <tr key={tratamiento._id}>
                    {tableConfig.tipo ? <td className="font-semibold">{tratamiento.tipo_tratamiento}</td> : null}
                    {tableConfig.subtipo ? <td>{tratamiento.subtipo || '—'}</td> : null}
                    {tableConfig.metodo ? <td>{tratamiento.metodo_aplicacion}</td> : null}
                    {tableConfig.campana ? <td>{tratamiento.campana || 'N/A'}</td> : null}
                    {tableConfig.fecha_tratamiento ? <td>{tratamiento.fecha_tratamiento || '—'}</td> : null}
                    {tableConfig.fecha_aplicacion ? <td>{tratamiento.fecha_aplicacion || '—'}</td> : null}
                    {tableConfig.superficie ? <td>{tratamiento.superficie_aplicacion} ha</td> : null}
                    {tableConfig.parcelas ? <td>{tratamiento.parcelas_ids?.length || 0} parcela(s)</td> : null}
                    {tableConfig.aplicador ? <td>{tratamiento.aplicador_nombre || '—'}</td> : null}
                    {tableConfig.maquina ? <td>{tratamiento.maquina_nombre || '—'}</td> : null}
                    {tableConfig.estado ? (
                      <td>
                        <span className={`badge ${tratamiento.realizado ? 'badge-success' : 'badge-default'}`}>
                          {tratamiento.realizado ? 'Realizado' : 'Pendiente'}
                        </span>
                      </td>
                    ) : null}
                    {(canEdit || canDelete) ? (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(tratamiento)}
                              title="Editar tratamiento"
                              data-testid={`edit-tratamiento-${tratamiento._id}`}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => handleDelete(tratamiento._id)}
                              title="Eliminar tratamiento"
                              data-testid={`delete-tratamiento-${tratamiento._id}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tratamientos;
