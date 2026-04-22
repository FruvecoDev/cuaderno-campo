import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Calendar, Clock, AlertCircle, MapPin, Sprout, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const BLUE = 'hsl(210, 80%, 50%)';
const AMBER = 'hsl(38, 92%, 50%)';
const RED = 'hsl(0, 84%, 60%)';
const GREEN = 'hsl(142, 76%, 36%)';

/**
 * Widget del Dashboard que muestra los próximos riegos planificados para los próximos 7 días.
 * Destaca en rojo los riegos en las próximas 24h y en ámbar los de entre 24-72h.
 */
const DashboardProximosRiegosWidget = () => {
  const [riegos, setRiegos] = useState([]);
  const [parcelasMap, setParcelasMap] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [riegosRes, parcelasRes] = await Promise.all([
        api.get('/api/irrigaciones/planificadas?dias=7'),
        api.get('/api/parcelas'),
      ]);
      const planificadas = riegosRes?.planificadas || [];
      // Solo los que tienen fecha_planificada dentro de los próximos 7 días
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const limite = new Date(hoy); limite.setDate(limite.getDate() + 7);
      const filtrados = planificadas
        .filter(r => {
          const fechaStr = r.fecha_planificada || r.fecha;
          if (!fechaStr) return false;
          const f = new Date(fechaStr);
          return f >= hoy && f <= limite;
        })
        .sort((a, b) => new Date(a.fecha_planificada || a.fecha) - new Date(b.fecha_planificada || b.fecha))
        .slice(0, 8);
      setRiegos(filtrados);

      const pMap = {};
      (parcelasRes?.parcelas || parcelasRes || []).forEach(p => {
        pMap[p._id] = p;
      });
      setParcelasMap(pMap);
    } catch (err) {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  const calcularUrgencia = (fechaStr) => {
    const ahora = new Date();
    const fecha = new Date(fechaStr);
    const horas = (fecha - ahora) / (1000 * 60 * 60);
    if (horas <= 24) return { label: 'Inminente (24h)', color: RED, icon: <AlertCircle size={14} /> };
    if (horas <= 72) return { label: 'Pronto', color: AMBER, icon: <Clock size={14} /> };
    return { label: 'Programado', color: GREEN, icon: <Calendar size={14} /> };
  };

  if (loading) {
    return (
      <div className="card" data-testid="proximos-riegos-widget-loading" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
          <Clock size={18} className="animate-spin" /> Cargando próximos riegos...
        </div>
      </div>
    );
  }

  const inminentes = riegos.filter(r => {
    const horas = (new Date(r.fecha_planificada || r.fecha) - new Date()) / (1000 * 60 * 60);
    return horas <= 24;
  }).length;

  return (
    <div className="card" data-testid="proximos-riegos-widget" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: '600', fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Droplets size={20} style={{ color: BLUE }} />
          Próximos Riegos (7 días)
        </h3>
        {inminentes > 0 ? (
          <span data-testid="proximos-riegos-badge-inminentes" style={{
            backgroundColor: RED, color: 'white', fontWeight: '700', fontSize: '0.75rem',
            padding: '0.2rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            <AlertCircle size={12} /> {inminentes} en 24h
          </span>
        ) : riegos.length > 0 ? (
          <span style={{
            backgroundColor: 'hsl(210, 80%, 50% / 0.15)', color: BLUE, fontWeight: '600', fontSize: '0.75rem',
            padding: '0.2rem 0.6rem', borderRadius: '12px',
          }}>
            {riegos.length} planificados
          </span>
        ) : null}
      </div>

      {riegos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--muted-foreground))' }}>
          <Droplets size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3, color: BLUE }} />
          <p style={{ fontWeight: '500', margin: '0 0 0.25rem' }}>Sin riegos planificados</p>
          <p style={{ fontSize: '0.8rem', margin: 0 }}>No hay riegos programados para los próximos 7 días</p>
          <button
            data-testid="proximos-riegos-empty-action"
            onClick={() => navigate('/irrigaciones')}
            style={{
              marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: '600',
              padding: '0.4rem 0.9rem', borderRadius: '6px',
              border: `1px solid ${BLUE}`, backgroundColor: 'transparent', color: BLUE, cursor: 'pointer',
            }}
          >
            Planificar riego
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
            {riegos.map((r, idx) => {
              const fechaStr = r.fecha_planificada || r.fecha;
              const fecha = new Date(fechaStr);
              const urg = calcularUrgencia(fechaStr);
              const parcela = parcelasMap[r.parcela_id];
              const parcelaNombre = parcela ? (parcela.referencia || parcela.nombre || parcela.codigo_parcela) : r.parcela_id;
              const fechaFmt = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', weekday: 'short' });
              const horaInicio = r.hora_inicio ? ` ${r.hora_inicio}` : '';
              return (
                <div
                  key={r._id || idx}
                  data-testid={`proximo-riego-${idx}`}
                  onClick={() => navigate(`/irrigaciones?search=${encodeURIComponent(parcelaNombre || '')}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.7rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
                    backgroundColor: `${urg.color.replace(')', ' / 0.06)')}`,
                    borderLeft: `3px solid ${urg.color}`,
                    transition: 'background-color 120ms ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${urg.color.replace(')', ' / 0.12)')}`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = `${urg.color.replace(')', ' / 0.06)')}`}
                >
                  <div style={{ flexShrink: 0, color: urg.color }}>{urg.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.88rem' }}>
                      <MapPin size={12} style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {parcelaNombre || 'Sin parcela'}
                      </span>
                      {r.cultivo && (
                        <>
                          <span style={{ color: 'hsl(var(--muted-foreground))' }}>•</span>
                          <Sprout size={12} style={{ color: GREEN }} />
                          <span style={{ fontWeight: '500', fontSize: '0.82rem' }}>{r.cultivo}</span>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
                      {r.sistema || 'Riego'}{r.volumen ? ` · ${r.volumen} m³` : ''}{r.duracion ? ` · ${r.duracion}h` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.82rem', color: urg.color, textTransform: 'capitalize' }}>
                      {fechaFmt}{horaInicio}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: '600', color: urg.color, opacity: 0.85 }}>
                      {urg.label}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
          <button
            data-testid="proximos-riegos-ver-todos"
            onClick={() => navigate('/irrigaciones')}
            style={{
              marginTop: '0.85rem', width: '100%', fontSize: '0.8rem', fontWeight: '600',
              padding: '0.5rem', borderRadius: '6px',
              border: '1px solid hsl(var(--border))', backgroundColor: 'transparent',
              color: BLUE, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
            }}
          >
            Ver todos los riegos <ChevronRight size={14} />
          </button>
        </>
      )}
    </div>
  );
};

export default DashboardProximosRiegosWidget;
