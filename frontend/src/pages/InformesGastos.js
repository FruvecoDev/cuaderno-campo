import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, TrendingUp, Filter, X, BarChart3, FileSpreadsheet,
  Building2, Leaf, MapPin, FileText, ChevronDown, ChevronUp,
  Calendar, Download, RefreshCw, FileDown, PieChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import '../App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Colores para los gráficos
const CHART_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#4f46e5', '#be185d'];

const InformesGastos = () => {
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
    proveedor: '',
    parcela_codigo: ''
  });
  
  const [campanas, setCampanas] = useState([]);
  const [filtrosOpciones, setFiltrosOpciones] = useState({
    contratos: [],
    cultivos: [],
    proveedores: [],
    parcelas: []
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState('proveedor');
  
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
  
  // Export functions
  const exportToExcel = async () => {
    try {
      setExportingExcel(true);
      const params = new URLSearchParams();
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.campana) params.append('campana', filters.campana);
      
      const response = await fetch(`${BACKEND_URL}/api/gastos/export/excel?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_gastos_${new Date().toISOString().slice(0,10)}.xlsx`;
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
      
      const response = await fetch(`${BACKEND_URL}/api/gastos/export/pdf?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_gastos_${new Date().toISOString().slice(0,10)}.pdf`;
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
  const getChartDataProveedor = () => {
    if (!resumen?.por_proveedor) return [];
    return resumen.por_proveedor.slice(0, 8).map((item, idx) => ({
      name: item.proveedor.length > 15 ? item.proveedor.slice(0, 15) + '...' : item.proveedor,
      total: item.total,
      count: item.count,
      fill: CHART_COLORS[idx % CHART_COLORS.length]
    }));
  };
  
  const getChartDataCultivo = () => {
    if (!resumen?.por_cultivo) return [];
    return resumen.por_cultivo.slice(0, 8).map((item, idx) => ({
      name: item.cultivo.length > 15 ? item.cultivo.slice(0, 15) + '...' : item.cultivo,
      total: item.total,
      count: item.count,
      fill: CHART_COLORS[idx % CHART_COLORS.length]
    }));
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
            <button
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('table')}
              style={{ borderRadius: 0 }}
              title="Vista tabla"
            >
              <FileSpreadsheet size={16} />
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('chart')}
              style={{ borderRadius: 0 }}
              title="Vista gráficos"
            >
              <PieChart size={16} />
            </button>
          </div>
          
          {/* Export buttons */}
          <button
            className="btn btn-secondary"
            onClick={exportToExcel}
            disabled={exportingExcel}
            title="Exportar a Excel"
          >
            <FileDown size={18} />
            {exportingExcel ? t('common.loading') : t('expenseReports.exportExcel')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={exportToPdf}
            disabled={exportingPdf}
            title={t('expenseReports.exportPdf')}
          >
            <Download size={18} />
            {exportingPdf ? t('common.loading') : t('expenseReports.exportPdf')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={fetchResumen}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
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
            <Filter size={18} /> {t('common.filters')}
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              <X size={14} /> {t('common.clear')}
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('common.from')}</label>
            <input
              type="date"
              className="form-input"
              value={filters.fecha_desde}
              onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('common.to')}</label>
            <input
              type="date"
              className="form-input"
              value={filters.fecha_hasta}
              onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('contracts.campaign')}</label>
            <select
              className="form-select"
              value={filters.campana}
              onChange={(e) => setFilters({...filters, campana: e.target.value})}
            >
              <option value="">{t('common.all')}</option>
              {campanas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={applyFilters} style={{ width: '100%' }}>
              {t('common.apply')} {t('common.filters')}
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
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{t('expenseReports.totalExpenses')}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#16a34a' }}>
              {formatCurrency(resumen.total_general)}
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FileSpreadsheet size={20} style={{ color: '#2563eb' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{t('expenseReports.deliveryNotes')}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2563eb' }}>
              {resumen.total_albaranes}
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{t('expenseReports.providers')}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7c3aed' }}>
              {resumen.por_proveedor?.length || 0}
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Leaf size={20} style={{ color: '#ea580c' }} />
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{t('expenseReports.crops')}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ea580c' }}>
              {resumen.por_cultivo?.length || 0}
            </p>
          </div>
        </div>
      )}

      {/* Charts View */}
      {resumen && viewMode === 'chart' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Bar Chart - Por Proveedor */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={18} style={{ color: '#7c3aed' }} />
              Gastos por Proveedor
            </h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getChartDataProveedor()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {getChartDataProveedor().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Pie Chart - Por Cultivo */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Leaf size={18} style={{ color: '#ea580c' }} />
              Distribución por Cultivo
            </h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={getChartDataCultivo()}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {getChartDataCultivo().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Bar Chart - Por Parcela */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} style={{ color: '#059669' }} />
              Gastos por Parcela (Top 10)
            </h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resumen.por_parcela?.slice(0, 10).map((item, idx) => ({
                  name: item.parcela.length > 12 ? item.parcela.slice(0, 12) + '...' : item.parcela,
                  total: item.total,
                  fill: CHART_COLORS[idx % CHART_COLORS.length]
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {(resumen.por_parcela?.slice(0, 10) || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Accordion Sections (Table View) */}
      {resumen && viewMode === 'table' && (
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
