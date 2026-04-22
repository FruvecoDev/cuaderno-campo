import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { BACKEND_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, Search, Download, RotateCw, Euro, Package,
  TrendingUp, Users, Filter, Calendar, Loader2, Receipt, X, CheckCircle,
  History, Clock, User as UserIcon, ArrowUp, ArrowDown, ArrowUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { formatEuro, formatKg, formatNumber } from '../utils/format';
import { ColumnSettings, useColumnConfig } from '../components/ColumnSettings';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
import '../App.css';

const AlbaranesComision = () => {
  const { token, user } = useAuth();
  const canBulkDelete = !!user?.can_bulk_delete;
  const [albaranes, setAlbaranes] = useState([]);
  const [totales, setTotales] = useState({ count: 0, kilos_netos: 0, importe_total: 0, pendiente: 0, pagada: 0 });
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    tipo_agente: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
  });
  const [search, setSearch] = useState('');

  // Modal factura-resumen
  const [showResumenModal, setShowResumenModal] = useState(false);
  const [resumenForm, setResumenForm] = useState({ agente_id: '', fecha_desde: '', fecha_hasta: '' });
  const [generatingResumen, setGeneratingResumen] = useState(false);

  // Vista / historico liquidaciones
  const [activeTab, setActiveTab] = useState('albaranes'); // albaranes | historico
  const [historico, setHistorico] = useState([]);
  const [historicoTotales, setHistoricoTotales] = useState({ count: 0, importe_total: 0, num_acm_total: 0 });
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Lista unica de agentes a partir de los ACM cargados (para selector)
  const agentesDisponibles = useMemo(() => {
    const map = new Map();
    albaranes.forEach(a => {
      if (a.agente_id && !map.has(a.agente_id)) {
        map.set(a.agente_id, { id: a.agente_id, nombre: a.agente_nombre || 'Agente', tipo: a.tipo_agente });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [albaranes]);

  const fetchAlbaranes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.tipo_agente) params.append('tipo_agente', filters.tipo_agente);
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      if (search.trim()) params.append('search', search.trim());
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/api/albaranes-comision${qs}`);
      setAlbaranes(res.albaranes || []);
      setTotales(res.totales || { count: 0, kilos_netos: 0, importe_total: 0, pendiente: 0, pagada: 0 });
    } catch (err) {
      console.error('Error cargando albaranes de comisión', err);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    fetchAlbaranes();
  }, [fetchAlbaranes]);

  const fetchHistorico = useCallback(async () => {
    setLoadingHistorico(true);
    try {
      const res = await api.get('/api/comisiones-generadas/liquidaciones-historico');
      setHistorico(res.liquidaciones || []);
      setHistoricoTotales(res.totales || { count: 0, importe_total: 0, num_acm_total: 0 });
    } catch (err) {
      console.error('Error cargando histórico de liquidaciones', err);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistorico();
    }
  }, [activeTab, fetchHistorico]);

  const handleRegenerar = async () => {
    if (!window.confirm('¿Generar automáticamente los albaranes de comisión que falten para los albaranes existentes? No se modifican los ya pagados.')) return;
    setRegenerating(true);
    try {
      const res = await api.post('/api/albaranes-comision/regenerar?solo_faltantes=true');
      const r = res?.data ?? res;
      window.alert(`Regeneración completada.\n• Creados: ${r.creados ?? 0}\n• Saltados: ${r.saltados ?? 0}${r.errores?.length ? `\n• Errores: ${r.errores.length}` : ''}`);
      await fetchAlbaranes();
    } catch (err) {
      window.alert('Error regenerando albaranes de comisión');
    } finally {
      setRegenerating(false);
    }
  };

  const downloadPdf = async (acm) => {
    setDownloadingId(acm._id);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/albaranes-comision/${acm._id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('PDF error');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${acm.numero_albaran_comision || 'ACM'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert('Error al descargar el PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerarResumen = async (e) => {
    e.preventDefault();
    if (!resumenForm.agente_id) {
      window.alert('Selecciona un agente');
      return;
    }
    setGeneratingResumen(true);
    try {
      const params = new URLSearchParams({ agente_id: resumenForm.agente_id });
      if (resumenForm.fecha_desde) params.append('fecha_desde', resumenForm.fecha_desde);
      if (resumenForm.fecha_hasta) params.append('fecha_hasta', resumenForm.fecha_hasta);
      const resp = await fetch(`${BACKEND_URL}/api/albaranes-comision/resumen-pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        window.alert(data.detail || 'No hay albaranes de comisión en este periodo');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const agenteNombre = agentesDisponibles.find(x => x.id === resumenForm.agente_id)?.nombre || 'agente';
      const safeName = agenteNombre.replace(/[^a-z0-9]/gi, '_');
      a.href = url;
      a.download = `factura_resumen_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowResumenModal(false);
    } catch (err) {
      window.alert('Error al generar la factura-resumen');
    } finally {
      setGeneratingResumen(false);
    }
  };

  const [closingResumen, setClosingResumen] = useState(false);
  const handleMarcarTodoPagado = async () => {
    if (!resumenForm.agente_id) {
      window.alert('Selecciona un agente');
      return;
    }
    const agenteNombre = agentesDisponibles.find(x => x.id === resumenForm.agente_id)?.nombre || 'agente';
    const periodoTxt = (resumenForm.fecha_desde || resumenForm.fecha_hasta)
      ? ` del periodo ${resumenForm.fecha_desde || '—'} → ${resumenForm.fecha_hasta || 'Hoy'}`
      : ' (todas las pendientes del histórico)';
    if (!window.confirm(`¿Marcar como PAGADAS todas las comisiones pendientes de "${agenteNombre}"${periodoTxt}?\n\nEsta acción liquida contablemente todas las ACM pendientes del periodo.`)) {
      return;
    }
    setClosingResumen(true);
    try {
      const params = new URLSearchParams();
      if (resumenForm.fecha_desde) params.append('fecha_desde', resumenForm.fecha_desde);
      if (resumenForm.fecha_hasta) params.append('fecha_hasta', resumenForm.fecha_hasta);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.post(`/api/comisiones-generadas/liquidar-agente/${resumenForm.agente_id}${qs}`);
      const n = res?.liquidadas ?? res?.data?.liquidadas ?? 0;
      const imp = res?.importe_total ?? res?.data?.importe_total ?? 0;
      window.alert(`Liquidadas ${n} ACM del agente "${agenteNombre}". Importe total: ${formatEuro(imp)}`);
      await fetchAlbaranes();
      await fetchHistorico();
      setShowResumenModal(false);
    } catch (err) {
      window.alert('Error al marcar como pagadas');
    } finally {
      setClosingResumen(false);
    }
  };

  // Sorting state
  const [sortAcm, setSortAcm] = useState({ key: null, dir: 'asc' });
  const [sortHist, setSortHist] = useState({ key: 'fecha', dir: 'desc' });

  const toggleSort = (current, setCurrent, key) => {
    setCurrent((prev) => {
      if (prev.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' };
        return { key: null, dir: 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };

  // Mapa de extractores de valor para ordenar cada columna
  const ACM_SORT_MAP = {
    numero: (a) => a.numero_albaran_comision || '',
    fecha: (a) => a.fecha_albaran || '',
    agente: (a) => (a.agente_nombre || '').toLowerCase(),
    tipo: (a) => a.tipo_agente || '',
    partner: (a) => ((a.proveedor_nombre || a.cliente_nombre) || '').toLowerCase(),
    origen: (a) => a.numero_albaran || '',
    contrato: (a) => a.contrato_numero || '',
    cultivo: (a) => (a.cultivo || '').toLowerCase(),
    kg: (a) => Number(a.kilos_netos || 0),
    precio: (a) => Number(a.precio_kg || 0),
    comision: (a) => Number(a.comision_valor || 0),
    importe: (a) => Number(a.comision_importe || 0),
    estado: (a) => a.estado || '',
  };
  const HIST_SORT_MAP = {
    fecha: (h) => new Date(h.fecha_liquidacion || 0).getTime(),
    agente: (h) => (h.agente_nombre || '').toLowerCase(),
    tipo: (h) => h.tipo_agente || '',
    periodo: (h) => h.fecha_desde || h.fecha_hasta || '',
    num_acm: (h) => Number(h.num_acm || 0),
    importe: (h) => Number(h.importe_total || 0),
    usuario: (h) => (h.usuario || '').toLowerCase(),
  };

  const sortList = (list, sort, map) => {
    if (!sort.key || !map[sort.key]) return list;
    const extractor = map[sort.key];
    const mult = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = extractor(a);
      const vb = extractor(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
      if (va < vb) return -1 * mult;
      if (va > vb) return 1 * mult;
      return 0;
    });
  };

  const filteredAlbaranes = useMemo(() => {
    return sortList(albaranes, sortAcm, ACM_SORT_MAP);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albaranes, sortAcm]);

  const sortedHistorico = useMemo(() => {
    return sortList(historico, sortHist, HIST_SORT_MAP);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historico, sortHist]);

  // Paginacion
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredAlbaranes.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredAlbaranes.length);
  const paginatedAlbaranes = useMemo(
    () => filteredAlbaranes.slice(pageStart, pageEnd),
    [filteredAlbaranes, pageStart, pageEnd]
  );

  // Bulk select (aplica a elementos visibles en la pagina actual)
  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(paginatedAlbaranes);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await bulkDeleteApi('albaranes_comision', selectedIds);
      clearSelection();
      await fetchAlbaranes();
    } catch (err) {
      window.alert('Error al eliminar masivamente');
    } finally {
      setBulkDeleting(false);
    }
  };

  // ------- Configuracion de columnas persistida en localStorage -------
  const DEFAULT_COLS_ACM = [
    { key: 'numero', label: 'Nº ACM', visible: true },
    { key: 'fecha', label: 'Fecha', visible: true },
    { key: 'agente', label: 'Agente', visible: true },
    { key: 'tipo', label: 'Tipo', visible: true },
    { key: 'partner', label: 'Proveedor / Cliente', visible: true },
    { key: 'origen', label: 'Albarán origen', visible: true },
    { key: 'contrato', label: 'Contrato', visible: true },
    { key: 'cultivo', label: 'Cultivo', visible: true },
    { key: 'kg', label: 'Kg Netos', visible: true },
    { key: 'precio', label: 'Precio €/kg', visible: true },
    { key: 'comision', label: 'Comisión', visible: true },
    { key: 'importe', label: 'Importe', visible: true },
    { key: 'estado', label: 'Estado', visible: true },
    { key: 'acciones', label: 'Acciones', visible: true },
  ];
  const DEFAULT_COLS_HIST = [
    { key: 'fecha', label: 'Fecha Liquidación', visible: true },
    { key: 'agente', label: 'Agente', visible: true },
    { key: 'tipo', label: 'Tipo', visible: true },
    { key: 'periodo', label: 'Periodo', visible: true },
    { key: 'num_acm', label: 'Nº ACM', visible: true },
    { key: 'importe', label: 'Importe Liquidado', visible: true },
    { key: 'usuario', label: 'Usuario', visible: true },
    { key: 'acm_ids', label: 'Nº ACM incluidos', visible: true },
  ];
  const [colsAcm, setColsAcm, resetColsAcm] = useColumnConfig('acm.cols.albaranes', DEFAULT_COLS_ACM);
  const [colsHist, setColsHist, resetColsHist] = useColumnConfig('acm.cols.historico', DEFAULT_COLS_HIST);

  // Componente auxiliar: cabecera clicable para ordenar
  const SortHeader = ({ sortKey, sort, onToggle, align, children, isSortable = true }) => {
    const active = sort.key === sortKey;
    const Arrow = !active ? ArrowUpDown : (sort.dir === 'asc' ? ArrowUp : ArrowDown);
    const alignStyle = align === 'right' ? { textAlign: 'right' } : {};
    return (
      <th
        style={{
          ...alignStyle,
          cursor: isSortable ? 'pointer' : 'default',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
        onClick={isSortable ? onToggle : undefined}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', width: '100%' }}>
          {children}
          {isSortable && (
            <Arrow
              size={12}
              style={{
                color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                opacity: active ? 1 : 0.5,
              }}
            />
          )}
        </span>
      </th>
    );
  };

  const renderAcmCell = (acm, key) => {
    const partnerName = acm.proveedor_nombre || acm.cliente_nombre || '-';
    const comisionLabel = acm.comision_tipo === 'porcentaje'
      ? `${acm.comision_valor}%`
      : `${acm.comision_valor} €/kg`;
    const estadoColor = { pendiente: '#f59e0b', pagada: '#10b981', anulada: '#ef4444' }[acm.estado] || '#6b7280';
    switch (key) {
      case 'numero': return <td style={{ fontWeight: '600', color: '#2563eb' }}>{acm.numero_albaran_comision || '-'}</td>;
      case 'fecha': return <td>{acm.fecha_albaran || '-'}</td>;
      case 'agente': return <td>{acm.agente_nombre}</td>;
      case 'tipo': return (
        <td>
          <span style={{
            padding: '0.125rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem',
            backgroundColor: acm.tipo_agente === 'compra' ? '#dbeafe' : '#d1fae5',
            color: acm.tipo_agente === 'compra' ? '#1e40af' : '#065f46',
          }}>{acm.tipo_agente === 'compra' ? 'Compra' : 'Venta'}</span>
        </td>
      );
      case 'partner': return <td>{partnerName}</td>;
      case 'origen': return (
        <td style={{ fontSize: '0.75rem' }}>
          {acm.numero_albaran ? (
            <Link
              to={`/albaranes?search=${encodeURIComponent(acm.numero_albaran)}`}
              title="Ver albarán origen"
              style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {acm.numero_albaran}
            </Link>
          ) : (
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>-</span>
          )}
        </td>
      );
      case 'contrato': return (
        <td style={{ fontSize: '0.8rem', fontWeight: '500' }}>
          {acm.contrato_numero ? (
            <Link
              to={`/contratos?search=${encodeURIComponent(acm.contrato_numero)}`}
              title="Ver contrato asociado"
              style={{ color: '#2563eb', textDecoration: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {acm.contrato_numero}
            </Link>
          ) : (
            <span style={{ color: 'hsl(var(--muted-foreground))' }}>—</span>
          )}
        </td>
      );
      case 'cultivo': return <td>{acm.cultivo || '-'}</td>;
      case 'kg': return <td style={{ textAlign: 'right' }}>{formatKg(acm.kilos_netos)}</td>;
      case 'precio': return <td style={{ textAlign: 'right' }}>{formatNumber(acm.precio_kg, 4)}</td>;
      case 'comision': return <td style={{ textAlign: 'right' }}>{comisionLabel}</td>;
      case 'importe': return <td style={{ textAlign: 'right', fontWeight: '700', color: '#065f46' }}>{formatEuro(acm.comision_importe)}</td>;
      case 'estado': return (
        <td>
          <span style={{
            padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem',
            backgroundColor: `${estadoColor}22`, color: estadoColor, fontWeight: '600', textTransform: 'capitalize',
          }}>{acm.estado}</span>
        </td>
      );
      case 'acciones': return (
        <td>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => downloadPdf(acm)}
            disabled={downloadingId === acm._id}
            data-testid={`btn-pdf-${acm._id}`}
            title="Descargar PDF"
          >
            {downloadingId === acm._id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          </button>
        </td>
      );
      default: return <td>-</td>;
    }
  };

  const renderHistCell = (h, key) => {
    const fecha = h.fecha_liquidacion ? new Date(h.fecha_liquidacion).toLocaleString('es-ES') : '-';
    const periodo = (h.fecha_desde || h.fecha_hasta)
      ? `${h.fecha_desde || '—'} → ${h.fecha_hasta || 'Hoy'}`
      : 'Todo el histórico';
    const nums = Array.isArray(h.numeros_acm) ? h.numeros_acm : [];
    const numsDisplay = nums.slice(0, 5).join(', ') + (nums.length > 5 ? ` +${nums.length - 5}` : '');
    switch (key) {
      case 'fecha': return <td style={{ whiteSpace: 'nowrap' }}>{fecha}</td>;
      case 'agente': return <td style={{ fontWeight: '600' }}>{h.agente_nombre}</td>;
      case 'tipo': return (
        <td>
          <span style={{
            padding: '0.125rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem',
            backgroundColor: h.tipo_agente === 'compra' ? '#dbeafe' : '#d1fae5',
            color: h.tipo_agente === 'compra' ? '#1e40af' : '#065f46',
          }}>{h.tipo_agente === 'compra' ? 'Compra' : (h.tipo_agente === 'venta' ? 'Venta' : '-')}</span>
        </td>
      );
      case 'periodo': return <td style={{ fontSize: '0.8rem' }}>{periodo}</td>;
      case 'num_acm': return <td style={{ textAlign: 'right', fontWeight: '600' }}>{h.num_acm}</td>;
      case 'importe': return <td style={{ textAlign: 'right', fontWeight: '700', color: '#065f46' }}>{formatEuro(h.importe_total)}</td>;
      case 'usuario': return (
        <td style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <UserIcon size={11} />{h.usuario}
          </span>
        </td>
      );
      case 'acm_ids': return (
        <td style={{ fontSize: '0.7rem', color: '#6b7280', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nums.join(', ')}>
          {numsDisplay || '—'}
        </td>
      );
      default: return <td>-</td>;
    }
  };

  const kpiCard = (icon, value, label, color) => (
    <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
      <div style={{ color, marginBottom: '0.35rem' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{label}</div>
    </div>
  );

  return (
    <div className="p-6" data-testid="albaranes-comision-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={26} /> Albaranes de Comisión
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', margin: '0.25rem 0 0' }}>
            Documentos de comisión generados automáticamente para cada albarán con agente comisionista.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setResumenForm({
                agente_id: agentesDisponibles[0]?.id || '',
                fecha_desde: filters.fecha_desde,
                fecha_hasta: filters.fecha_hasta,
              });
              setShowResumenModal(true);
            }}
            data-testid="btn-factura-resumen"
            title="Generar factura-resumen mensual para un agente"
          >
            <Receipt size={16} style={{ marginRight: '0.35rem' }} /> Factura-Resumen
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRegenerar}
            disabled={regenerating}
            data-testid="btn-regenerar-acm"
          >
            {regenerating ? <Loader2 className="animate-spin" size={16} /> : <RotateCw size={16} />}
            {regenerating ? ' Regenerando...' : ' Regenerar desde albaranes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid hsl(var(--border))', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('albaranes')}
          data-testid="tab-albaranes"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.1rem', fontSize: '0.85rem',
            fontWeight: activeTab === 'albaranes' ? '700' : '500',
            color: activeTab === 'albaranes' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            background: 'none', border: 'none',
            borderBottom: activeTab === 'albaranes' ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '-2px',
          }}
        >
          <FileText size={14} /> Albaranes de Comisión
          <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'hsl(var(--muted-foreground))' }}>({totales.count})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          data-testid="tab-historico"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.65rem 1.1rem', fontSize: '0.85rem',
            fontWeight: activeTab === 'historico' ? '700' : '500',
            color: activeTab === 'historico' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            background: 'none', border: 'none',
            borderBottom: activeTab === 'historico' ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            cursor: 'pointer', marginBottom: '-2px',
          }}
        >
          <History size={14} /> Histórico Liquidaciones
          <span style={{ fontSize: '0.7rem', fontWeight: '500', color: 'hsl(var(--muted-foreground))' }}>({historicoTotales.count})</span>
        </button>
      </div>

      {activeTab === 'albaranes' && (<>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {kpiCard(<FileText size={22} />, totales.count, 'Nº Albaranes de Comisión', '#2563eb')}
        {kpiCard(<Package size={22} />, formatKg(totales.kilos_netos), 'Kilos Netos Totales', '#6366f1')}
        {kpiCard(<Euro size={22} />, formatEuro(totales.pendiente), 'Pendiente', '#f59e0b')}
        {kpiCard(<TrendingUp size={22} />, formatEuro(totales.importe_total), 'Importe Total Comisión', '#8b5cf6')}
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                className="form-input"
                placeholder="Nº ACM, agente, proveedor, cultivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2rem' }}
                data-testid="input-search-acm"
              />
            </div>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Tipo Agente</label>
            <select className="form-input" value={filters.tipo_agente} onChange={(e) => setFilters({ ...filters, tipo_agente: e.target.value })}>
              <option value="">Todos</option>
              <option value="compra">Compra</option>
              <option value="venta">Venta</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Estado</label>
            <select className="form-input" value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Desde</label>
            <input type="date" className="form-input" value={filters.fecha_desde} onChange={(e) => setFilters({ ...filters, fecha_desde: e.target.value })} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Hasta</label>
            <input type="date" className="form-input" value={filters.fecha_hasta} onChange={(e) => setFilters({ ...filters, fecha_hasta: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted)/0.3)', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
            {filteredAlbaranes.length > 0 ? (
              <>Mostrando <b>{pageStart + 1}-{pageEnd}</b> de <b>{filteredAlbaranes.length}</b></>
            ) : ''}
          </div>
          <ColumnSettings columns={colsAcm} onChange={setColsAcm} onReset={resetColsAcm} testId="column-settings-acm" />
        </div>
        {canBulkDelete && (
          <div style={{ padding: '0.5rem 0.75rem 0' }}>
            <BulkActionBar
              selectedCount={selectedIds.size}
              onClear={clearSelection}
              onDelete={handleBulkDelete}
              deleting={bulkDeleting}
            />
          </div>
        )}
        <div className="table-container" style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
          ) : filteredAlbaranes.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              No hay albaranes de comisión. Pulsa <b>"Regenerar desde albaranes"</b> para crearlos automáticamente a partir de los albaranes existentes con agente comisionista.
            </div>
          ) : (
            <table style={{ fontSize: '0.85rem', width: '100%' }}>
              <thead>
                <tr style={{ background: 'hsl(var(--muted))', position: 'sticky', top: 0, zIndex: 2 }}>
                  {canBulkDelete && (
                    <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />
                  )}
                  {colsAcm.filter(c => c.visible !== false).map(c => {
                    const align = ['kg', 'precio', 'comision', 'importe'].includes(c.key) ? 'right' : 'left';
                    const isSortable = c.key !== 'acciones';
                    return (
                      <SortHeader
                        key={c.key}
                        sortKey={c.key}
                        sort={sortAcm}
                        onToggle={() => toggleSort(sortAcm, setSortAcm, c.key)}
                        align={align}
                        isSortable={isSortable}
                      >{c.label}</SortHeader>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedAlbaranes.map((acm) => (
                  <tr key={acm._id} data-testid={`acm-row-${acm._id}`}>
                    {canBulkDelete && (
                      <BulkCheckboxCell id={acm._id} selected={selectedIds.has(acm._id)} onToggle={toggleOne} />
                    )}
                    {colsAcm.filter(c => c.visible !== false).map(c => (
                      <React.Fragment key={c.key}>{renderAcmCell(acm, c.key)}</React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Pagination footer */}
        {filteredAlbaranes.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--muted)/0.2)', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
              <span>Filas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                data-testid="select-page-size"
                style={{
                  padding: '0.25rem 0.4rem',
                  borderRadius: '6px',
                  border: '1px solid hsl(var(--border))',
                  background: 'white',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {[10, 25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(1)} disabled={page === 1} title="Primera" data-testid="pag-first">
                <ChevronsLeft size={14} />
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Anterior" data-testid="pag-prev">
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.8rem', padding: '0 0.5rem', whiteSpace: 'nowrap' }}>
                Página <b>{page}</b> / {totalPages}
              </span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} title="Siguiente" data-testid="pag-next">
                <ChevronRight size={14} />
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última" data-testid="pag-last">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      </>)}

      {activeTab === 'historico' && (
        <div>
          {/* KPIs Histórico */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {kpiCard(<History size={22} />, historicoTotales.count, 'Liquidaciones Registradas', '#2563eb')}
            {kpiCard(<CheckCircle size={22} />, historicoTotales.num_acm_total, 'ACM Liquidadas (Total)', '#10b981')}
            {kpiCard(<Euro size={22} />, formatEuro(historicoTotales.importe_total), 'Importe Liquidado (Total)', '#8b5cf6')}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0.75rem', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted)/0.3)' }}>
              <ColumnSettings columns={colsHist} onChange={setColsHist} onReset={resetColsHist} testId="column-settings-hist" />
            </div>
            <div className="table-container" style={{ maxHeight: '65vh', overflow: 'auto' }}>
              {loadingHistorico ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>
              ) : historico.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                  <Clock size={42} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: '600', marginBottom: '0.3rem' }}>Aún no hay liquidaciones registradas</div>
                  <div style={{ fontSize: '0.85rem' }}>
                    El historial se llena automáticamente cada vez que pulses <b>"Marcar todo como pagado"</b> en la factura-resumen de un agente o <b>"Liquidar Pendientes"</b> en Comisiones Auto.
                  </div>
                </div>
              ) : (
                <table style={{ fontSize: '0.85rem', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'hsl(var(--muted))', position: 'sticky', top: 0, zIndex: 2 }}>
                      {colsHist.filter(c => c.visible !== false).map(c => {
                        const align = ['num_acm', 'importe'].includes(c.key) ? 'right' : 'left';
                        const isSortable = c.key !== 'acm_ids';
                        return (
                          <SortHeader
                            key={c.key}
                            sortKey={c.key}
                            sort={sortHist}
                            onToggle={() => toggleSort(sortHist, setSortHist, c.key)}
                            align={align}
                            isSortable={isSortable}
                          >{c.label}</SortHeader>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistorico.map((h) => (
                      <tr key={h._id} data-testid={`hist-row-${h._id}`}>
                        {colsHist.filter(c => c.visible !== false).map(c => (
                          <React.Fragment key={c.key}>{renderHistCell(h, c.key)}</React.Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Factura-Resumen */}
      {showResumenModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowResumenModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '520px', width: '100%', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid hsl(var(--border))' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={20} style={{ color: '#2563eb' }} /> Factura-Resumen de Comisiones
              </h2>
              <button type="button" onClick={() => setShowResumenModal(false)} className="config-modal-close-btn" data-testid="btn-close-resumen">
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginTop: 0 }}>
              Genera un único PDF con todas las comisiones del agente en el periodo indicado (útil para contabilidad mensual).
            </p>
            <form onSubmit={handleGenerarResumen} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Agente *</label>
                <select
                  className="form-input"
                  value={resumenForm.agente_id}
                  onChange={(e) => setResumenForm({ ...resumenForm, agente_id: e.target.value })}
                  required
                  data-testid="select-resumen-agente"
                >
                  <option value="">Seleccionar agente...</option>
                  {agentesDisponibles.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre} — {a.tipo}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Desde</label>
                  <input
                    type="date"
                    className="form-input"
                    value={resumenForm.fecha_desde}
                    onChange={(e) => setResumenForm({ ...resumenForm, fecha_desde: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Hasta</label>
                  <input
                    type="date"
                    className="form-input"
                    value={resumenForm.fecha_hasta}
                    onChange={(e) => setResumenForm({ ...resumenForm, fecha_hasta: e.target.value })}
                  />
                </div>
              </div>
              <small style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>
                Tip: deja ambas fechas vacías para incluir todo el histórico del agente.
              </small>
              <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleMarcarTodoPagado}
                  disabled={closingResumen || generatingResumen || !resumenForm.agente_id}
                  data-testid="btn-marcar-todo-pagado"
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 0.8rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    cursor: (closingResumen || !resumenForm.agente_id) ? 'not-allowed' : 'pointer',
                    opacity: (!resumenForm.agente_id) ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Marcar como pagadas todas las ACM pendientes del agente en el periodo"
                >
                  {closingResumen ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  {closingResumen ? ' Liquidando...' : ' Marcar todo como pagado'}
                </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResumenModal(false)} data-testid="btn-cancelar-resumen">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={generatingResumen} data-testid="btn-descargar-resumen">
                    {generatingResumen ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                    {generatingResumen ? ' Generando...' : ' Descargar PDF'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbaranesComision;
