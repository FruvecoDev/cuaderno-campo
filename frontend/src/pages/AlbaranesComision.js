import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api, { BACKEND_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText, Search, Download, RotateCw, Euro, Package,
  TrendingUp, Users, Filter, Calendar, Loader2,
} from 'lucide-react';
import { formatEuro, formatKg, formatNumber } from '../utils/format';
import '../App.css';

const AlbaranesComision = () => {
  const { token } = useAuth();
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

  const filteredAlbaranes = useMemo(() => albaranes, [albaranes]);

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
        <div className="table-container" style={{ maxHeight: '65vh', overflow: 'auto' }}>
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
                  <th>Nº ACM</th>
                  <th>Fecha</th>
                  <th>Agente</th>
                  <th>Tipo</th>
                  <th>Proveedor / Cliente</th>
                  <th>Albarán origen</th>
                  <th>Cultivo</th>
                  <th style={{ textAlign: 'right' }}>Kg Netos</th>
                  <th style={{ textAlign: 'right' }}>Precio €/kg</th>
                  <th style={{ textAlign: 'right' }}>Comisión</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlbaranes.map((acm) => {
                  const partnerName = acm.proveedor_nombre || acm.cliente_nombre || '-';
                  const comisionLabel = acm.comision_tipo === 'porcentaje'
                    ? `${acm.comision_valor}%`
                    : `${acm.comision_valor} €/kg`;
                  const estadoColor = { pendiente: '#f59e0b', pagada: '#10b981', anulada: '#ef4444' }[acm.estado] || '#6b7280';
                  return (
                    <tr key={acm._id} data-testid={`acm-row-${acm._id}`}>
                      <td style={{ fontWeight: '600', color: '#2563eb' }}>{acm.numero_albaran_comision || '-'}</td>
                      <td>{acm.fecha_albaran || '-'}</td>
                      <td>{acm.agente_nombre}</td>
                      <td>
                        <span style={{
                          padding: '0.125rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem',
                          backgroundColor: acm.tipo_agente === 'compra' ? '#dbeafe' : '#d1fae5',
                          color: acm.tipo_agente === 'compra' ? '#1e40af' : '#065f46',
                        }}>{acm.tipo_agente === 'compra' ? 'Compra' : 'Venta'}</span>
                      </td>
                      <td>{partnerName}</td>
                      <td style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{acm.numero_albaran || '-'}</td>
                      <td>{acm.cultivo || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{formatKg(acm.kilos_netos)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(acm.precio_kg, 4)}</td>
                      <td style={{ textAlign: 'right' }}>{comisionLabel}</td>
                      <td style={{ textAlign: 'right', fontWeight: '700', color: '#065f46' }}>{formatEuro(acm.comision_importe)}</td>
                      <td>
                        <span style={{
                          padding: '0.125rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem',
                          backgroundColor: `${estadoColor}22`, color: estadoColor, fontWeight: '600', textTransform: 'capitalize',
                        }}>{acm.estado}</span>
                      </td>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbaranesComision;
