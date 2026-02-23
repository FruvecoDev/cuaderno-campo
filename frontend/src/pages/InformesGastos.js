import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Filter, X, BarChart3, FileSpreadsheet,
  Building2, Leaf, MapPin, FileText, ChevronDown, ChevronUp,
  Calendar, Download, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const InformesGastos = () => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  
  // Filters
  const [filters, setFilters] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    campana: ''
  });
  
  const [campanas, setCampanas] = useState([]);
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState('proveedor');
  
  // Detail view
  const [detalleView, setDetalleView] = useState(null);
  const [detalleAlbaranes, setDetalleAlbaranes] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => {
    fetchResumen();
    fetchCampanas();
  }, []);
  
  const fetchCampanas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/gastos/campanas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCampanas(data.campanas || []);
      }
    } catch (error) {
      console.error('Error fetching campanas:', error);
    }
  };

  const fetchResumen = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.campana) params.append('campana', filters.campana);
      
      const response = await fetch(`${BACKEND_URL}/api/gastos/resumen?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar el resumen de gastos');
      }
      
      const data = await response.json();
      setResumen(data);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDetalleAlbaranes = async (tipo, valor) => {
    try {
      setLoadingDetalle(true);
      const params = new URLSearchParams();
      
      if (tipo === 'proveedor') params.append('proveedor', valor);
      if (tipo === 'contrato') params.append('contrato_id', valor);
      if (tipo === 'cultivo') params.append('cultivo', valor);
      if (tipo === 'parcela') params.append('parcela_codigo', valor);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.campana) params.append('campana', filters.campana);
      
      const response = await fetch(`${BACKEND_URL}/api/gastos/detalle-albaranes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetalleAlbaranes(data.albaranes || []);
        setDetalleView({ tipo, valor, total: data.total_sum });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingDetalle(false);
    }
  };
  
  const applyFilters = () => {
    fetchResumen();
    setDetalleView(null);
    setDetalleAlbaranes([]);
  };
  
  const clearFilters = () => {
    setFilters({ fecha_desde: '', fecha_hasta: '', campana: '' });
    setTimeout(fetchResumen, 100);
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2 
    }).format(value || 0);
  };
  
  const hasActiveFilters = filters.fecha_desde || filters.fecha_hasta || filters.campana;

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading && !resumen) {
    return (
      <div data-testid="informes-gastos-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando informes de gastos...</p>
      </div>
    );
  }

  return (
    <div data-testid="informes-gastos-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={28} />
            Informes de Gastos
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
            Análisis de gastos por proveedor, contrato, cultivo y parcela
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchResumen}
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Desde</label>
            <input
              type="date"
              className="form-input"
              value={filters.fecha_desde}
              onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-input"
              value={filters.fecha_hasta}
              onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Campaña</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
            >
              <option value="">Todas</option>
              {campanas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={applyFilters} style={{ width: '100%' }}>
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <DollarSign size={20} style={{ color: '#16a34a' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Gastos</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#16a34a' }}>
              {formatCurrency(resumen.total_general)}
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileSpreadsheet size={20} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Albaranes</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2563eb' }}>
              {resumen.total_albaranes}
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Proveedores</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7c3aed' }}>
              {resumen.por_proveedor?.length || 0}
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Leaf size={20} style={{ color: '#ea580c' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Cultivos</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ea580c' }}>
              {resumen.por_cultivo?.length || 0}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Accordion Sections */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: detalleView ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
          {/* Left Column - Summary Tables */}
          <div>
            {/* Por Proveedor */}
            <div className="card mb-4">
              <div 
                className="flex justify-between items-center" 
                style={{ cursor: 'pointer', padding: '0.5rem 0' }}
                onClick={() => toggleSection('proveedor')}
              >
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Building2 size={18} style={{ color: '#7c3aed' }} />
                  Gastos por Proveedor
                  <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>
                    ({resumen.por_proveedor?.length || 0})
                  </span>
                </h3>
                {expandedSection === 'proveedor' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {expandedSection === 'proveedor' && (
                <div style={{ marginTop: '1rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Proveedor</th>
                        <th style={{ textAlign: 'right' }}>Albaranes</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.por_proveedor?.map((item, idx) => (
                        <tr 
                          key={idx} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => fetchDetalleAlbaranes('proveedor', item.proveedor)}
                          className={detalleView?.tipo === 'proveedor' && detalleView?.valor === item.proveedor ? 'selected-row' : ''}
                        >
                          <td style={{ fontWeight: '500' }}>{item.proveedor}</td>
                          <td style={{ textAlign: 'right' }}>{item.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                            {formatCurrency(item.total)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'hsl(var(--muted-foreground))' }}>
                            {((item.total / resumen.total_general) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Por Contrato */}
            <div className="card mb-4">
              <div 
                className="flex justify-between items-center" 
                style={{ cursor: 'pointer', padding: '0.5rem 0' }}
                onClick={() => toggleSection('contrato')}
              >
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <FileText size={18} style={{ color: '#2563eb' }} />
                  Gastos por Contrato
                  <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>
                    ({resumen.por_contrato?.length || 0})
                  </span>
                </h3>
                {expandedSection === 'contrato' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {expandedSection === 'contrato' && (
                <div style={{ marginTop: '1rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Contrato</th>
                        <th>Proveedor</th>
                        <th>Cultivo</th>
                        <th style={{ textAlign: 'right' }}>Alb.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.por_contrato?.map((item, idx) => (
                        <tr 
                          key={idx} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => fetchDetalleAlbaranes('contrato', item.contrato_id)}
                          className={detalleView?.tipo === 'contrato' && detalleView?.valor === item.contrato_id ? 'selected-row' : ''}
                        >
                          <td>
                            <code style={{ fontSize: '0.8rem' }}>
                              {item.numero_contrato || `CON-${item.contrato_id?.slice(-6)}`}
                            </code>
                          </td>
                          <td>{item.proveedor || '-'}</td>
                          <td>{item.cultivo || '-'}</td>
                          <td style={{ textAlign: 'right' }}>{item.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Por Cultivo */}
            <div className="card mb-4">
              <div 
                className="flex justify-between items-center" 
                style={{ cursor: 'pointer', padding: '0.5rem 0' }}
                onClick={() => toggleSection('cultivo')}
              >
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Leaf size={18} style={{ color: '#ea580c' }} />
                  Gastos por Cultivo
                  <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>
                    ({resumen.por_cultivo?.length || 0})
                  </span>
                </h3>
                {expandedSection === 'cultivo' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {expandedSection === 'cultivo' && (
                <div style={{ marginTop: '1rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Cultivo</th>
                        <th style={{ textAlign: 'right' }}>Albaranes</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.por_cultivo?.map((item, idx) => (
                        <tr 
                          key={idx} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => fetchDetalleAlbaranes('cultivo', item.cultivo)}
                          className={detalleView?.tipo === 'cultivo' && detalleView?.valor === item.cultivo ? 'selected-row' : ''}
                        >
                          <td style={{ fontWeight: '500' }}>{item.cultivo}</td>
                          <td style={{ textAlign: 'right' }}>{item.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                            {formatCurrency(item.total)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'hsl(var(--muted-foreground))' }}>
                            {((item.total / resumen.total_general) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Por Parcela */}
            <div className="card mb-4">
              <div 
                className="flex justify-between items-center" 
                style={{ cursor: 'pointer', padding: '0.5rem 0' }}
                onClick={() => toggleSection('parcela')}
              >
                <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <MapPin size={18} style={{ color: '#059669' }} />
                  Gastos por Parcela
                  <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'hsl(var(--muted-foreground))' }}>
                    ({resumen.por_parcela?.length || 0})
                  </span>
                </h3>
                {expandedSection === 'parcela' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
              {expandedSection === 'parcela' && (
                <div style={{ marginTop: '1rem' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Parcela</th>
                        <th>Cultivo</th>
                        <th style={{ textAlign: 'right' }}>Alb.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.por_parcela?.map((item, idx) => (
                        <tr 
                          key={idx} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => fetchDetalleAlbaranes('parcela', item.parcela)}
                          className={detalleView?.tipo === 'parcela' && detalleView?.valor === item.parcela ? 'selected-row' : ''}
                        >
                          <td style={{ fontWeight: '500' }}>{item.parcela}</td>
                          <td>{item.cultivo || '-'}</td>
                          <td style={{ textAlign: 'right' }}>{item.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Detail View */}
          {detalleView && (
            <div className="card" style={{ position: 'sticky', top: '1rem', alignSelf: 'flex-start' }}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 style={{ fontWeight: '600', margin: 0 }}>
                    Detalle de Albaranes
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', margin: '0.25rem 0 0 0' }}>
                    {detalleView.tipo === 'proveedor' && `Proveedor: ${detalleView.valor}`}
                    {detalleView.tipo === 'contrato' && `Contrato: ${detalleView.valor?.slice(-6)}`}
                    {detalleView.tipo === 'cultivo' && `Cultivo: ${detalleView.valor}`}
                    {detalleView.tipo === 'parcela' && `Parcela: ${detalleView.valor}`}
                  </p>
                </div>
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setDetalleView(null); setDetalleAlbaranes([]); }}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div style={{ 
                backgroundColor: '#f0fdf4', 
                padding: '0.75rem', 
                borderRadius: '6px', 
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total: </span>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
                  {formatCurrency(detalleView.total)}
                </span>
              </div>
              
              {loadingDetalle ? (
                <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</p>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table" style={{ fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleAlbaranes.map((albaran, idx) => (
                        <tr key={idx}>
                          <td>{albaran.fecha ? new Date(albaran.fecha).toLocaleDateString('es-ES') : '-'}</td>
                          <td>
                            <span style={{
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              backgroundColor: albaran.tipo === 'Entrada' ? '#dcfce7' : '#fee2e2',
                              color: albaran.tipo === 'Entrada' ? '#166534' : '#991b1b'
                            }}>
                              {albaran.tipo}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '500' }}>
                            {formatCurrency(albaran.total_albaran)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detalleAlbaranes.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '1rem' }}>
                      No hay albaranes para mostrar
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <style>{`
        .selected-row {
          background-color: hsl(var(--primary) / 0.1) !important;
        }
        .selected-row td {
          border-left: 3px solid hsl(var(--primary));
        }
      `}</style>
    </div>
  );
};

export default InformesGastos;
