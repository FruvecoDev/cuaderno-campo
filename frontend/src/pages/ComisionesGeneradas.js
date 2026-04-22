import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, User, Filter, Search, X, Check, Ban, 
  FileText, TrendingUp, Package, Calendar, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp,
  Printer, Download
} from 'lucide-react';
import api from '../services/api';
import '../App.css';

const ComisionesGeneradas = () => {
  const { t } = useTranslation();
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totales, setTotales] = useState({});
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    search: '',
    agente_id: '',
    tipo_agente: '',
    campana: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para exportación
  const [exportLoading, setExportLoading] = useState(false);
  
  // Estados para datos auxiliares
  const [agentes, setAgentes] = useState([]);
  const [campanas, setCampanas] = useState([]);
  
  // Estado para expandir detalles (Set para multi-expand)
  const [expandedAgente, setExpandedAgente] = useState(null); // single (retrocompat)
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [quickSearchAgente, setQuickSearchAgente] = useState('');
  
  // Vista: 'lista' o 'agrupado'
  const [vista, setVista] = useState('agrupado');

  useEffect(() => {
    fetchComisiones();
    fetchAgentes();
    fetchCampanas();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchComisiones = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.agente_id) params.append('agente_id', filters.agente_id);
      if (filters.tipo_agente) params.append('tipo_agente', filters.tipo_agente);
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      
      const response = await api.get(`/api/comisiones-generadas?${params.toString()}`);
      setComisiones(response.comisiones || []);
      setTotales(response.totales || {});
    } catch (err) {

      setError('Error al cargar las comisiones');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentes = async () => {
    try {
      const [compra, venta] = await Promise.all([
        api.get('/api/agentes/activos?tipo=Compra'),
        api.get('/api/agentes/activos?tipo=Venta')
      ]);
      setAgentes([
        ...(compra.agentes || []).map(a => ({...a, tipo: 'compra'})),
        ...(venta.agentes || []).map(a => ({...a, tipo: 'venta'}))
      ]);
    } catch (err) {

    }
  };

  const fetchCampanas = async () => {
    try {
      const response = await api.get('/api/comisiones/campanas');
      setCampanas(response.campanas || []);
    } catch (err) {

    }
  };

  const handleEstadoChange = async (comisionId, nuevoEstado) => {
    try {
      await api.patch(`/api/comisiones-generadas/${comisionId}/estado?estado=${nuevoEstado}`);
      fetchComisiones();
    } catch (err) {

      setError('Error al actualizar el estado');
    }
  };

  const [liquidandoAgenteId, setLiquidandoAgenteId] = useState(null);
  const handleLiquidarAgente = async (agente) => {
    const periodoTxt = (filters.fecha_desde || filters.fecha_hasta)
      ? ` del periodo ${filters.fecha_desde || '—'} → ${filters.fecha_hasta || 'Hoy'}`
      : '';
    if (!window.confirm(`¿Marcar como PAGADAS todas las comisiones pendientes de "${agente.agente_nombre}"${periodoTxt}?\n\nEsta acción se puede revertir comisión a comisión.`)) {
      return;
    }
    setLiquidandoAgenteId(agente.agente_id);
    try {
      const params = new URLSearchParams();
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.post(`/api/comisiones-generadas/liquidar-agente/${agente.agente_id}${qs}`);
      const n = res?.liquidadas ?? res?.data?.liquidadas ?? 0;
      const imp = res?.importe_total ?? res?.data?.importe_total ?? 0;
      await fetchComisiones();
      window.alert(`Liquidadas ${n} comisión(es) del agente "${agente.agente_nombre}". Importe total: €${(imp).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } catch (err) {
      setError('Error al liquidar las comisiones del agente');
    } finally {
      setLiquidandoAgenteId(null);
    }
  };

  // Agrupar comisiones por agente
  const comisionesPorAgente = useMemo(() => {
    const grouped = {};
    comisiones.forEach(c => {
      const key = c.agente_id;
      if (!grouped[key]) {
        grouped[key] = {
          agente_id: c.agente_id,
          agente_nombre: c.agente_nombre,
          tipo_agente: c.tipo_agente,
          comisiones: [],
          totales: {
            kilos_brutos: 0,
            kilos_destare: 0,
            kilos_netos: 0,
            comision_pendiente: 0,
            comision_pagada: 0,
            comision_total: 0
          }
        };
      }
      grouped[key].comisiones.push(c);
      grouped[key].totales.kilos_brutos += c.kilos_brutos || 0;
      grouped[key].totales.kilos_destare += c.kilos_destare || 0;
      grouped[key].totales.kilos_netos += c.kilos_netos || 0;
      if (c.estado === 'pendiente') {
        grouped[key].totales.comision_pendiente += c.comision_importe || 0;
      } else if (c.estado === 'pagada') {
        grouped[key].totales.comision_pagada += c.comision_importe || 0;
      }
      grouped[key].totales.comision_total += c.comision_importe || 0;
    });
    return Object.values(grouped);
  }, [comisiones]);

  // Filtrado rapido por nombre + orden por comision desc
  const comisionesPorAgenteVisible = useMemo(() => {
    const q = quickSearchAgente.trim().toLowerCase();
    const list = q
      ? comisionesPorAgente.filter(a => (a.agente_nombre || '').toLowerCase().includes(q))
      : comisionesPorAgente;
    return [...list].sort((a, b) => (b.totales?.comision_total || 0) - (a.totales?.comision_total || 0));
  }, [comisionesPorAgente, quickSearchAgente]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };
  const expandAllAgentes = () => setExpandedIds(new Set(comisionesPorAgenteVisible.map(g => g.agente_id)));
  const collapseAllAgentes = () => setExpandedIds(new Set());

  // Filtrar comisiones por búsqueda
  const filteredComisiones = useMemo(() => {
    if (!filters.search) return comisiones;
    const searchLower = filters.search.toLowerCase();
    return comisiones.filter(c => 
      c.agente_nombre?.toLowerCase().includes(searchLower) ||
      c.proveedor_nombre?.toLowerCase().includes(searchLower) ||
      c.cliente_nombre?.toLowerCase().includes(searchLower) ||
      c.cultivo?.toLowerCase().includes(searchLower)
    );
  }, [comisiones, filters.search]);

  const clearFilters = () => {
    setFilters({
      search: '',
      agente_id: '',
      tipo_agente: '',
      campana: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: ''
    });
  };

  const hasActiveFilters = filters.agente_id || filters.tipo_agente || filters.campana || filters.estado || filters.fecha_desde || filters.fecha_hasta;

  useEffect(() => {
    if (hasActiveFilters || filters.search === '') {
      fetchComisiones();
    }
  }, [filters.agente_id, filters.tipo_agente, filters.campana, filters.estado, filters.fecha_desde, filters.fecha_hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funciones de exportación
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.agente_id) params.append('agente_id', filters.agente_id);
      if (filters.tipo_agente) params.append('tipo_agente', filters.tipo_agente);
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/comisiones-generadas/pdf?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al generar PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {

      setError('Error al generar el PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.agente_id) params.append('agente_id', filters.agente_id);
      if (filters.tipo_agente) params.append('tipo_agente', filters.tipo_agente);
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/comisiones-generadas/excel?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al generar Excel');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comisiones_${filters.fecha_desde || 'all'}_${filters.fecha_hasta || 'all'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {

      setError('Error al generar el Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const formatNumber = (num) => {
    // Forzamos agrupamiento desde el primer millar (es-ES no agrupa 4 digitos por defecto)
    return (num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatKilos = (num) => {
    return (num || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'pendiente':
        return { bg: '#fef3c7', color: '#92400e', text: 'Pendiente' };
      case 'pagada':
        return { bg: '#d1fae5', color: '#065f46', text: 'Pagada' };
      case 'anulada':
        return { bg: '#fee2e2', color: '#991b1b', text: 'Anulada' };
      default:
        return { bg: '#f3f4f6', color: '#374151', text: estado };
    }
  };

  return (
    <div data-testid="comisiones-generadas-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Comisiones Generadas</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
            Comisiones calculadas automáticamente desde albaranes
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportPDF}
            disabled={exportLoading}
            title="Imprimir listado PDF"
            data-testid="btn-export-pdf"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Printer size={16} />
            PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleExportExcel}
            disabled={exportLoading}
            title="Exportar a Excel"
            data-testid="btn-export-excel"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={16} />
            Excel
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'hsl(var(--border))', margin: '0 0.5rem' }} />
          <button
            className={`btn ${vista === 'agrupado' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVista('agrupado')}
            data-testid="btn-vista-agrupado"
          >
            Por Agente
          </button>
          <button
            className={`btn ${vista === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVista('lista')}
            data-testid="btn-vista-lista"
          >
            Lista Detalle
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '1rem' }}>×</button>
        </div>
      )}

      {/* KPIs */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem' 
      }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <Package size={24} style={{ color: '#2563eb', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563eb' }}>
            {formatKilos(totales.total_kilos_netos)} kg
          </div>
          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Netos</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <DollarSign size={24} style={{ color: '#f59e0b', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
            €{formatNumber(totales.total_comision - (totales.count_pagadas > 0 ? comisiones.filter(c => c.estado === 'pagada').reduce((sum, c) => sum + (c.comision_importe || 0), 0) : 0))}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
            Pendiente ({totales.count_pendientes || 0})
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <Check size={24} style={{ color: '#10b981', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
            €{formatNumber(comisiones.filter(c => c.estado === 'pagada').reduce((sum, c) => sum + (c.comision_importe || 0), 0))}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
            Pagadas ({totales.count_pagadas || 0})
          </div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <TrendingUp size={24} style={{ color: '#8b5cf6', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8b5cf6' }}>
            €{formatNumber(totales.total_comision)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Total Comisiones</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? '1rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '35px' }}
                placeholder="Buscar por agente, proveedor, cultivo..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                data-testid="input-buscar-comisiones"
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Filter size={16} />
              Filtros
              {hasActiveFilters && (
                <span style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>!</span>
              )}
            </button>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={clearFilters}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <X size={14} />
              Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid hsl(var(--border))'
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Agente</label>
              <select
                className="form-select"
                value={filters.agente_id}
                onChange={(e) => setFilters({...filters, agente_id: e.target.value})}
              >
                <option value="">Todos</option>
                {agentes.map(a => (
                  <option key={a._id} value={a._id}>{a.nombre} ({a.tipo})</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Tipo</label>
              <select
                className="form-select"
                value={filters.tipo_agente}
                onChange={(e) => setFilters({...filters, tipo_agente: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="compra">Compra</option>
                <option value="venta">Venta</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Campaña</label>
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
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Estado</label>
              <select
                className="form-select"
                value={filters.estado}
                onChange={(e) => setFilters({...filters, estado: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha Desde</label>
              <input
                type="date"
                className="form-input"
                value={filters.fecha_desde}
                onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
                data-testid="filter-fecha-desde"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha Hasta</label>
              <input
                type="date"
                className="form-input"
                value={filters.fecha_hasta}
                onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
                data-testid="filter-fecha-hasta"
              />
            </div>
          </div>
        )}
      </div>

      {/* Banner de periodo filtrado */}
      {(filters.fecha_desde || filters.fecha_hasta) && (
        <div
          data-testid="periodo-banner"
          style={{
            marginBottom: '1rem',
            padding: '0.65rem 1rem',
            background: 'hsl(var(--primary) / 0.08)',
            border: '1px solid hsl(var(--primary) / 0.25)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.85rem',
            color: 'hsl(var(--primary))',
            fontWeight: '600'
          }}
        >
          <Calendar size={16} />
          <span>
            Comisiones del periodo:
            {' '}
            {filters.fecha_desde ? new Date(filters.fecha_desde).toLocaleDateString('es-ES') : '—'}
            {' → '}
            {filters.fecha_hasta ? new Date(filters.fecha_hasta).toLocaleDateString('es-ES') : 'Hoy'}
          </span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Cargando comisiones...</p>
        </div>
      ) : vista === 'agrupado' ? (
        /* Vista Agrupada por Agente */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Toolbar agentes: buscar + expandir/contraer */}
          <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
              <User size={16} /> Detalle por Agente
              <span style={{ fontWeight: '400', color: 'hsl(var(--muted-foreground))' }}>({comisionesPorAgenteVisible.length})</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar agente..."
                  value={quickSearchAgente}
                  onChange={(e) => setQuickSearchAgente(e.target.value)}
                  style={{ paddingLeft: '2rem', width: '220px', fontSize: '0.85rem' }}
                  data-testid="quick-search-agente-cg"
                />
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={expandAllAgentes} data-testid="btn-expandir-todo-cg">
                <ChevronsDown size={14} /> Expandir todo
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={collapseAllAgentes} data-testid="btn-contraer-todo-cg">
                <ChevronsUp size={14} /> Contraer todo
              </button>
            </div>
          </div>

          {comisionesPorAgenteVisible.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                {comisionesPorAgente.length === 0 ? 'No hay comisiones generadas' : 'Ningún agente coincide con la búsqueda rápida'}
              </p>
            </div>
          ) : (
            comisionesPorAgenteVisible.map(grupo => {
              const isExp = expandedIds.has(grupo.agente_id);
              return (
              <div key={grupo.agente_id} className="card" style={{ overflow: 'hidden' }}>
                <div 
                  style={{ 
                    padding: '1rem', 
                    background: 'hsl(var(--muted))',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => toggleExpand(grupo.agente_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <User size={24} style={{ color: grupo.tipo_agente === 'compra' ? '#2563eb' : '#10b981' }} />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{grupo.agente_nombre}</h3>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '500',
                        backgroundColor: grupo.tipo_agente === 'compra' ? '#dbeafe' : '#d1fae5',
                        color: grupo.tipo_agente === 'compra' ? '#1e40af' : '#065f46'
                      }}>
                        {grupo.tipo_agente === 'compra' ? 'Agente Compra' : 'Agente Venta'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Netos</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{formatKilos(grupo.totales.kilos_netos)} kg</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Pendiente</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#f59e0b' }}>€{formatNumber(grupo.totales.comision_pendiente)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Pagadas</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#10b981' }}>€{formatNumber(grupo.totales.comision_pagada)}</div>
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: '0.75rem', borderLeft: '2px solid hsl(var(--border))' }}>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', fontWeight: '600' }}>Comisión Total</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#8b5cf6' }}>€{formatNumber(grupo.totales.comision_total)}</div>
                    </div>
                    {grupo.totales.comision_pendiente > 0 && (
                      <button
                        type="button"
                        data-testid={`btn-liquidar-${grupo.agente_id}`}
                        onClick={(e) => { e.stopPropagation(); handleLiquidarAgente(grupo); }}
                        disabled={liquidandoAgenteId === grupo.agente_id}
                        title="Marcar todas las pendientes como pagadas"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.5rem 0.9rem',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          background: liquidandoAgenteId === grupo.agente_id ? '#a7f3d0' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: liquidandoAgenteId === grupo.agente_id ? 'not-allowed' : 'pointer',
                          boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.2s'
                        }}
                      >
                        <Check size={14} />
                        {liquidandoAgenteId === grupo.agente_id ? 'Liquidando...' : 'Liquidar Pendientes'}
                      </button>
                    )}
                    {isExp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                
                {isExp && (
                  <div style={{ padding: '1rem' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid hsl(var(--border))' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nº Albarán</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Fecha</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Proveedor/Cliente</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Cultivo</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Kg Brutos</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Destare</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Kg Netos</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Comisión</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right' }}>Importe</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Estado</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.comisiones.map(c => {
                          const estadoBadge = getEstadoBadge(c.estado);
                          return (
                            <tr key={c._id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                              <td style={{ padding: '0.5rem', fontWeight: '500' }}>{c.numero_albaran || c.albaran_id?.slice(-6) || '-'}</td>
                              <td style={{ padding: '0.5rem' }}>{c.fecha_albaran}</td>
                              <td style={{ padding: '0.5rem' }}>{c.proveedor_nombre || c.cliente_nombre || '-'}</td>
                              <td style={{ padding: '0.5rem' }}>{c.cultivo || '-'}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatKilos(c.kilos_brutos)}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', color: '#dc2626' }}>-{formatKilos(c.kilos_destare)}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600' }}>{formatKilos(c.kilos_netos)}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                                {c.comision_tipo === 'porcentaje' ? `${c.comision_valor}%` : `${c.comision_valor}€/kg`}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '600', color: '#8b5cf6' }}>
                                €{formatNumber(c.comision_importe)}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
                                  backgroundColor: estadoBadge.bg,
                                  color: estadoBadge.color
                                }}>
                                  {estadoBadge.text}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                  {c.estado === 'pendiente' && (
                                    <button
                                      className="btn btn-sm"
                                      style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem' }}
                                      onClick={() => handleEstadoChange(c._id, 'pagada')}
                                      title="Marcar como pagada"
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  {c.estado !== 'anulada' && (
                                    <button
                                      className="btn btn-sm"
                                      style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem' }}
                                      onClick={() => handleEstadoChange(c._id, 'anulada')}
                                      title="Anular"
                                    >
                                      <Ban size={14} />
                                    </button>
                                  )}
                                  {c.estado === 'anulada' && (
                                    <button
                                      className="btn btn-sm"
                                      style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem' }}
                                      onClick={() => handleEstadoChange(c._id, 'pendiente')}
                                      title="Reactivar"
                                    >
                                      Reactivar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      ) : (
        /* Vista Lista Detallada */
        <div className="card">
          <div className="table-container">
            <table data-testid="comisiones-table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Nº Albarán</th>
                  <th>Fecha</th>
                  <th>Campaña</th>
                  <th>Proveedor/Cliente</th>
                  <th>Cultivo</th>
                  <th style={{ textAlign: 'right' }}>Kg Brutos</th>
                  <th style={{ textAlign: 'right' }}>Destare</th>
                  <th style={{ textAlign: 'right' }}>Kg Netos</th>
                  <th style={{ textAlign: 'center' }}>Comisión</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredComisiones.length === 0 ? (
                  <tr>
                    <td colSpan="13" style={{ textAlign: 'center', padding: '2rem' }}>
                      No hay comisiones para mostrar
                    </td>
                  </tr>
                ) : (
                  filteredComisiones.map(c => {
                    const estadoBadge = getEstadoBadge(c.estado);
                    return (
                      <tr key={c._id}>
                        <td>
                          <div>
                            <div style={{ fontWeight: '500' }}>{c.agente_nombre}</div>
                            <span style={{
                              fontSize: '0.7rem',
                              color: c.tipo_agente === 'compra' ? '#2563eb' : '#10b981'
                            }}>
                              {c.tipo_agente}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: '500' }}>{c.numero_albaran || c.albaran_id?.slice(-6) || '-'}</td>
                        <td>{c.fecha_albaran}</td>
                        <td>{c.campana || '-'}</td>
                        <td>{c.proveedor_nombre || c.cliente_nombre || '-'}</td>
                        <td>{c.cultivo || '-'}</td>
                        <td style={{ textAlign: 'right' }}>{formatKilos(c.kilos_brutos)}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626' }}>-{formatKilos(c.kilos_destare)}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{formatKilos(c.kilos_netos)}</td>
                        <td style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                          {c.comision_tipo === 'porcentaje' ? `${c.comision_valor}%` : `${c.comision_valor}€/kg`}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#8b5cf6' }}>
                          €{formatNumber(c.comision_importe)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '500',
                            backgroundColor: estadoBadge.bg,
                            color: estadoBadge.color
                          }}>
                            {estadoBadge.text}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                            {c.estado === 'pendiente' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleEstadoChange(c._id, 'pagada')}
                                title="Marcar como pagada"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            {c.estado !== 'anulada' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem' }}
                                onClick={() => handleEstadoChange(c._id, 'anulada')}
                                title="Anular"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComisionesGeneradas;
