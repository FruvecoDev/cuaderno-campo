import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, TrendingUp, Filter, X, BarChart3, FileSpreadsheet,
  Users, Leaf, MapPin, FileText, ChevronDown, ChevronUp,
  Calendar, Download, RefreshCw, FileDown, PieChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Colores para los gráficos (verdes para ingresos)
const CHART_COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#15803d', '#166534', '#14532d'];

const InformesIngresos = () => {
  const { t } = useTranslation();
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  
  // Filters
  const [filters, setFilters] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    campana: '',
    contrato_id: '',
    cultivo: '',
    cliente: '',
    parcela_codigo: ''
  });
  
  const [campanas, setCampanas] = useState([]);
  const [filtrosOpciones, setFiltrosOpciones] = useState({
    contratos: [],
    cultivos: [],
    clientes: [],
    parcelas: []
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState('cliente');
  
  // View mode: 'table' or 'chart'
  const [viewMode, setViewMode] = useState('table');
  
  // Detail view
  const [detalleView, setDetalleView] = useState(null);
  const [detalleAlbaranes, setDetalleAlbaranes] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  
  // Export loading states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetchResumen();
    fetchCampanas();
    fetchFiltrosOpciones();
  }, []);
  
  const fetchFiltrosOpciones = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ingresos/filtros-opciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFiltrosOpciones(data);
      }
    } catch (error) {
      console.error('Error fetching filtros opciones:', error);
    }
  };
  
  const fetchCampanas = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ingresos/campanas`, {
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
      if (filters.contrato_id) params.append('contrato_id', filters.contrato_id);
      if (filters.cultivo) params.append('cultivo', filters.cultivo);
      if (filters.cliente) params.append('cliente', filters.cliente);
      if (filters.parcela_codigo) params.append('parcela_codigo', filters.parcela_codigo);
      
      const response = await fetch(`${BACKEND_URL}/api/ingresos/resumen?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar el resumen de ingresos');
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
      
      if (tipo === 'cliente') params.append('cliente', valor);
      if (tipo === 'contrato') params.append('contrato_id', valor);
      if (tipo === 'cultivo') params.append('cultivo', valor);
      if (tipo === 'parcela') params.append('parcela_codigo', valor);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.campana) params.append('campana', filters.campana);
      
      const response = await fetch(`${BACKEND_URL}/api/ingresos/detalle-albaranes?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetalleAlbaranes(data.albaranes || []);
        setDetalleView({ tipo, valor, total: data.total });
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
    setFilters({ 
      fecha_desde: '', 
      fecha_hasta: '', 
      campana: '',
      contrato_id: '',
      cultivo: '',
      cliente: '',
      parcela_codigo: ''
    });
    setTimeout(fetchResumen, 100);
  };
  
  const hasActiveFilters = filters.fecha_desde || filters.fecha_hasta || filters.campana || 
    filters.contrato_id || filters.cultivo || filters.cliente || filters.parcela_codigo;
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2 
    }).format(value || 0);
  };
  
  // Export functions
  const exportToExcel = async () => {
    try {
      setExportingExcel(true);
      const params = new URLSearchParams();
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.cliente) params.append('cliente', filters.cliente);
      if (filters.cultivo) params.append('cultivo', filters.cultivo);
      
      const response = await fetch(`${BACKEND_URL}/api/ingresos/export/excel?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_ingresos_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setError('Error al exportar a Excel');
    } finally {
      setExportingExcel(false);
    }
  };
  
  const exportToPdf = async () => {
    try {
      setExportingPdf(true);
      const params = new URLSearchParams();
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.cliente) params.append('cliente', filters.cliente);
      if (filters.cultivo) params.append('cultivo', filters.cultivo);
      
      const response = await fetch(`${BACKEND_URL}/api/ingresos/export/pdf?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_ingresos_${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Error al exportar a PDF');
    } finally {
      setExportingPdf(false);
    }
  };
  
  // Prepare chart data
  const chartDataClientes = resumen?.por_cliente?.slice(0, 8).map(item => ({
    name: item.cliente?.length > 15 ? item.cliente.slice(0, 15) + '...' : item.cliente,
    value: item.total
  })) || [];
  
  const chartDataCultivos = resumen?.por_cultivo?.slice(0, 8).map(item => ({
    name: item.cultivo,
    value: item.total
  })) || [];

  if (loading) {
    return (
      <div data-testid="informes-ingresos-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: '#16a34a', margin: '0 auto' }} />
        <p style={{ marginTop: '1rem' }}>Cargando informe de ingresos...</p>
      </div>
    );
  }

  return (
    <div data-testid="informes-ingresos-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={28} style={{ color: '#16a34a' }} />
            Informes de Ingresos
          </h1>
          <p className="text-muted">Análisis de ventas y facturación por albaranes de venta</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters || hasActiveFilters ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Filter size={18} />
            Filtros
            {hasActiveFilters && (
              <span style={{ 
                backgroundColor: 'white', 
                color: '#16a34a', 
                borderRadius: '50%', 
                width: '18px', 
                height: '18px', 
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>!</span>
            )}
          </button>
          <button
            onClick={exportToExcel}
            disabled={exportingExcel}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={18} />
            {exportingExcel ? 'Exportando...' : 'Excel'}
          </button>
          <button
            onClick={exportToPdf}
            disabled={exportingPdf}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            title="Exportar a PDF"
          >
            <FileDown size={18} />
            {exportingPdf ? 'Generando...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: '600', margin: 0 }}>Filtros</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn btn-sm btn-secondary">
                  <X size={14} /> Limpiar
                </button>
              )}
              <button onClick={() => setShowFilters(false)} className="btn btn-sm btn-secondary">
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label">Fecha Desde</label>
              <input
                type="date"
                className="form-input"
                value={filters.fecha_desde}
                onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
              />
            </div>
            <div>
              <label className="form-label">Fecha Hasta</label>
              <input
                type="date"
                className="form-input"
                value={filters.fecha_hasta}
                onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
              />
            </div>
            <div>
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
            <div>
              <label className="form-label">Cliente</label>
              <select
                className="form-select"
                value={filters.cliente}
                onChange={(e) => setFilters({...filters, cliente: e.target.value})}
              >
                <option value="">Todos</option>
                {filtrosOpciones.clientes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Cultivo</label>
              <select
                className="form-select"
                value={filters.cultivo}
                onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
              >
                <option value="">Todos</option>
                {filtrosOpciones.cultivos.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Contrato</label>
              <select
                className="form-select"
                value={filters.contrato_id}
                onChange={(e) => setFilters({...filters, contrato_id: e.target.value})}
              >
                <option value="">Todos</option>
                {filtrosOpciones.contratos.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.numero_contrato || c._id.slice(-6)} - {c.cliente || 'Sin cliente'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={applyFilters} className="btn btn-primary">
              Aplicar Filtros
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', marginBottom: '1.5rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {/* KPIs */}
      {resumen && (
        <>
          <div className="stats-grid mb-6">
            <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div className="stat-label">Total Ingresos</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>
                {formatCurrency(resumen.total_general)}
              </div>
              <div className="text-sm text-muted">
                {resumen.total_albaranes} albaranes de venta
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Por Cliente</div>
              <div className="stat-value">{resumen.por_cliente?.length || 0}</div>
              <div className="text-sm text-muted">clientes con ventas</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Por Cultivo</div>
              <div className="stat-value">{resumen.por_cultivo?.length || 0}</div>
              <div className="text-sm text-muted">cultivos vendidos</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-label">Promedio/Albarán</div>
              <div className="stat-value">
                {formatCurrency(resumen.total_albaranes > 0 ? resumen.total_general / resumen.total_albaranes : 0)}
              </div>
              <div className="text-sm text-muted">valor medio</div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <BarChart3 size={16} /> Tabla
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`btn btn-sm ${viewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <PieChart size={16} /> Gráficos
            </button>
          </div>

          {viewMode === 'chart' ? (
            /* Charts View */
            <div className="grid-2 mb-6">
              <div className="card">
                <h3 className="card-title">Ingresos por Cliente</h3>
                {chartDataClientes.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartDataClientes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-8">No hay datos para mostrar</p>
                )}
              </div>
              
              <div className="card">
                <h3 className="card-title">Distribución por Cultivo</h3>
                {chartDataCultivos.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={chartDataCultivos}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {chartDataCultivos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted text-center py-8">No hay datos para mostrar</p>
                )}
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="grid-2 mb-6">
              {/* Por Cliente */}
              <div className="card">
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'cliente' ? '' : 'cliente')}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    marginBottom: expandedSection === 'cliente' ? '1rem' : 0
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={18} style={{ color: '#16a34a' }} />
                    Por Cliente
                    <span className="badge badge-success">{resumen.por_cliente?.length || 0}</span>
                  </h3>
                  {expandedSection === 'cliente' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSection === 'cliente' && (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th style={{ textAlign: 'right' }}>Albaranes</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.por_cliente?.slice(0, 10).map((item, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => fetchDetalleAlbaranes('cliente', item.cliente)}
                            style={{ cursor: 'pointer' }}
                            className="hover-row"
                          >
                            <td>{item.cliente}</td>
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
              <div className="card">
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'cultivo' ? '' : 'cultivo')}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    marginBottom: expandedSection === 'cultivo' ? '1rem' : 0
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Leaf size={18} style={{ color: '#16a34a' }} />
                    Por Cultivo
                    <span className="badge badge-success">{resumen.por_cultivo?.length || 0}</span>
                  </h3>
                  {expandedSection === 'cultivo' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSection === 'cultivo' && (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Cultivo</th>
                          <th style={{ textAlign: 'right' }}>Albaranes</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.por_cultivo?.map((item, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => fetchDetalleAlbaranes('cultivo', item.cultivo)}
                            style={{ cursor: 'pointer' }}
                            className="hover-row"
                          >
                            <td>{item.cultivo}</td>
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
              
              {/* Por Contrato */}
              <div className="card">
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'contrato' ? '' : 'contrato')}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    marginBottom: expandedSection === 'contrato' ? '1rem' : 0
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} style={{ color: '#16a34a' }} />
                    Por Contrato
                    <span className="badge badge-success">{resumen.por_contrato?.length || 0}</span>
                  </h3>
                  {expandedSection === 'contrato' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSection === 'contrato' && (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Contrato</th>
                          <th>Cliente</th>
                          <th style={{ textAlign: 'right' }}>Albaranes</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.por_contrato?.slice(0, 10).map((item, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => fetchDetalleAlbaranes('contrato', item.contrato_id)}
                            style={{ cursor: 'pointer' }}
                            className="hover-row"
                          >
                            <td>{item.numero_contrato || item.contrato_id?.slice(-8)}</td>
                            <td>{item.cliente}</td>
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
              
              {/* Por Parcela */}
              <div className="card">
                <div 
                  onClick={() => setExpandedSection(expandedSection === 'parcela' ? '' : 'parcela')}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    marginBottom: expandedSection === 'parcela' ? '1rem' : 0
                  }}
                >
                  <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={18} style={{ color: '#16a34a' }} />
                    Por Parcela
                    <span className="badge badge-success">{resumen.por_parcela?.length || 0}</span>
                  </h3>
                  {expandedSection === 'parcela' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                
                {expandedSection === 'parcela' && (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Parcela</th>
                          <th>Cultivo</th>
                          <th style={{ textAlign: 'right' }}>Albaranes</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.por_parcela?.slice(0, 10).map((item, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => fetchDetalleAlbaranes('parcela', item.parcela)}
                            style={{ cursor: 'pointer' }}
                            className="hover-row"
                          >
                            <td>{item.parcela}</td>
                            <td>{item.cultivo}</td>
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
          )}

          {/* Detalle de Albaranes */}
          {detalleView && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Detalle: {detalleView.tipo} = "{detalleView.valor}"
                  <span style={{ marginLeft: '1rem', color: '#16a34a', fontWeight: 'bold' }}>
                    Total: {formatCurrency(detalleView.total)}
                  </span>
                </h3>
                <button onClick={() => { setDetalleView(null); setDetalleAlbaranes([]); }} className="btn btn-sm btn-secondary">
                  <X size={16} /> Cerrar
                </button>
              </div>
              
              {loadingDetalle ? (
                <p className="text-center py-4">Cargando detalle...</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Nº Albarán</th>
                        <th>Cliente</th>
                        <th>Cultivo</th>
                        <th>Parcela</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleAlbaranes.map((a, idx) => (
                        <tr key={idx}>
                          <td>{a.fecha}</td>
                          <td>{a.numero_albaran}</td>
                          <td>{a.cliente}</td>
                          <td>{a.cultivo}</td>
                          <td>{a.parcela_codigo}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                            {formatCurrency(a.total_albaran)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InformesIngresos;
