import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Euro, Users, TrendingUp, Filter, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const LiquidacionComisiones = () => {
  const [comisiones, setComisiones] = useState([]);
  const [totales, setTotales] = useState({ total_comision_compra: 0, total_comision_venta: 0, total_general: 0 });
  const [campanas, setCampanas] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(null);
  const { token } = useAuth();
  const { t } = useTranslation();
  
  // Filtros
  const [filters, setFilters] = useState({
    campana: '',
    agente_id: '',
    tipo_agente: ''
  });
  
  useEffect(() => {
    fetchCampanas();
    fetchAgentes();
  }, []);
  
  useEffect(() => {
    fetchComisiones();
  }, [filters]);
  
  const fetchCampanas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/comisiones/campanas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCampanas(data.campanas || []);
      }
    } catch (error) {
      console.error('Error fetching campanas:', error);
    }
  };
  
  const fetchAgentes = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/comisiones/agentes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgentes(data.agentes || []);
      }
    } catch (error) {
      console.error('Error fetching agentes:', error);
    }
  };
  
  const fetchComisiones = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.agente_id) params.append('agente_id', filters.agente_id);
      if (filters.tipo_agente) params.append('tipo_agente', filters.tipo_agente);
      
      const response = await fetch(`${BACKEND_URL}/api/comisiones/resumen?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setComisiones(data.comisiones || []);
        setTotales(data.totales || { total_comision_compra: 0, total_comision_venta: 0, total_general: 0 });
      }
    } catch (error) {
      console.error('Error fetching comisiones:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadPdf = async (agenteId, tipoAgente, agenteNombre) => {
    setGeneratingPdf(`${agenteId}-${tipoAgente}`);
    try {
      const params = new URLSearchParams();
      params.append('agente_id', agenteId);
      params.append('tipo_agente', tipoAgente);
      if (filters.campana) params.append('campana', filters.campana);
      
      const response = await fetch(`${BACKEND_URL}/api/comisiones/liquidacion/pdf?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error generando PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Liquidacion_${agenteNombre.replace(/\s+/g, '_')}_${tipoAgente}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };
  
  // Agrupar comisiones por agente
  const comisionesAgrupadas = comisiones.reduce((acc, com) => {
    const key = `${com.agente_id}-${com.tipo}`;
    if (!acc[key]) {
      acc[key] = { ...com };
    }
    return acc;
  }, {});
  
  return (
    <div data-testid="liquidacion-comisiones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">
          <Euro size={28} style={{ marginRight: '0.5rem' }} />
          Liquidación de Comisiones
        </h1>
      </div>
      
      {/* KPIs */}
      <div className="stats-grid mb-6" data-testid="comisiones-kpis">
        <div className="stat-card">
          <div className="stat-label">Comisiones Compra</div>
          <div className="stat-value" style={{ color: '#1565c0' }}>€{totales.total_comision_compra.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
          <div className="text-sm text-muted">Total agentes compra</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Comisiones Venta</div>
          <div className="stat-value" style={{ color: '#2e7d32' }}>€{totales.total_comision_venta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
          <div className="text-sm text-muted">Total agentes venta</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total General</div>
          <div className="stat-value" style={{ color: '#d32f2f' }}>€{totales.total_general.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
          <div className="text-sm text-muted">Suma comisiones</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Agentes con Comisión</div>
          <div className="stat-value">{Object.keys(comisionesAgrupadas).length}</div>
          <div className="text-sm text-muted">Este período</div>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="card mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={18} />
          <h3 style={{ margin: 0, fontWeight: '600' }}>Filtros</h3>
        </div>
        <div className="grid-responsive-4">
          <div className="form-group">
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({ ...filters, campana: e.target.value })}
              data-testid="filter-campana"
            >
              <option value="">Todas las campañas</option>
              {campanas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tipo Agente</label>
            <select
              className="form-select"
              value={filters.tipo_agente}
              onChange={(e) => setFilters({ ...filters, tipo_agente: e.target.value, agente_id: '' })}
              data-testid="filter-tipo-agente"
            >
              <option value="">Todos</option>
              <option value="compra">Agentes de Compra</option>
              <option value="venta">Agentes de Venta</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Buscar Agente</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nombre..."
              value={filters.busqueda_agente || ''}
              onChange={(e) => setFilters({ ...filters, busqueda_agente: e.target.value })}
              data-testid="filter-busqueda-agente"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Agente</label>
            <select
              className="form-select"
              value={filters.agente_id}
              onChange={(e) => setFilters({ ...filters, agente_id: e.target.value })}
              data-testid="filter-agente"
            >
              <option value="">Todos los agentes</option>
              {agentes
                .filter(a => !filters.tipo_agente || a.tipo === filters.tipo_agente)
                .filter(a => !filters.busqueda_agente || a.nombre.toLowerCase().includes(filters.busqueda_agente.toLowerCase()))
                .map(a => (
                  <option key={`${a.id}-${a.tipo}`} value={a.id}>
                    {a.nombre} ({a.tipo === 'compra' ? 'Compra' : 'Venta'})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Lista de Comisiones por Agente */}
      <div className="card">
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} />
          Detalle por Agente
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 className="animate-spin" size={32} />
            <p className="text-muted">Cargando comisiones...</p>
          </div>
        ) : Object.keys(comisionesAgrupadas).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
            <p className="text-muted">No hay comisiones registradas para los filtros seleccionados</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {Object.values(comisionesAgrupadas).map((agente, idx) => (
              <div 
                key={idx} 
                style={{ 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
                data-testid={`agente-card-${agente.agente_id}`}
              >
                {/* Header del Agente */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: agente.tipo === 'compra' ? '#e3f2fd' : '#e8f5e9',
                  borderBottom: '1px solid hsl(var(--border))'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: '600' }}>{agente.agente_nombre}</h3>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.25rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: agente.tipo === 'compra' ? '#1565c0' : '#2e7d32',
                      color: 'white'
                    }}>
                      Agente de {agente.tipo === 'compra' ? 'Compra' : 'Venta'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right', marginRight: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Total Comisión</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: agente.tipo === 'compra' ? '#1565c0' : '#2e7d32' }}>
                        €{agente.total_comision.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => downloadPdf(agente.agente_id, agente.tipo, agente.agente_nombre)}
                      disabled={generatingPdf === `${agente.agente_id}-${agente.tipo}`}
                      data-testid={`download-pdf-${agente.agente_id}`}
                    >
                      {generatingPdf === `${agente.agente_id}-${agente.tipo}` ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <>
                          <Download size={16} style={{ marginRight: '0.25rem' }} />
                          PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Resumen */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '1rem',
                  padding: '1rem',
                  backgroundColor: 'hsl(var(--muted) / 0.3)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Albaranes</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{agente.albaranes?.length || 0}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Total Kg</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{agente.total_kg?.toLocaleString('es-ES') || 0}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Importe Albaranes</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>€{agente.total_importe_albaranes?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0.00'}</div>
                  </div>
                </div>
                
                {/* Tabla de Albaranes */}
                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Albarán</th>
                        <th>Fecha</th>
                        <th>Contrato</th>
                        <th>Campaña</th>
                        <th>{agente.tipo === 'compra' ? 'Proveedor' : 'Cliente'}</th>
                        <th>Cultivo</th>
                        <th style={{ textAlign: 'right' }}>Cantidad (kg)</th>
                        <th style={{ textAlign: 'right' }}>Precio (€/kg)</th>
                        <th style={{ textAlign: 'right' }}>Importe (€)</th>
                        <th>Tipo Com.</th>
                        <th style={{ textAlign: 'right' }}>Comisión (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agente.albaranes?.map((albaran, cIdx) => (
                        <tr key={cIdx}>
                          <td style={{ fontWeight: '500' }}>{albaran.numero}</td>
                          <td>{albaran.fecha}</td>
                          <td style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{albaran.contrato_numero}</td>
                          <td>{albaran.campana}</td>
                          <td>{albaran.proveedor || albaran.cliente || '-'}</td>
                          <td>{albaran.cultivo}</td>
                          <td style={{ textAlign: 'right' }}>{albaran.cantidad_kg?.toLocaleString('es-ES')}</td>
                          <td style={{ textAlign: 'right' }}>{albaran.precio_kg?.toFixed(4)}</td>
                          <td style={{ textAlign: 'right' }}>{albaran.importe_albaran?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              backgroundColor: albaran.comision_tipo === 'porcentaje' ? '#e3f2fd' : '#fff3e0',
                              color: albaran.comision_tipo === 'porcentaje' ? '#1565c0' : '#e65100'
                            }}>
                              {albaran.comision_tipo === 'porcentaje' ? `${albaran.comision_valor}%` : `${albaran.comision_valor} €/kg`}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#2e7d32' }}>
                            {albaran.importe_comision?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidacionComisiones;
