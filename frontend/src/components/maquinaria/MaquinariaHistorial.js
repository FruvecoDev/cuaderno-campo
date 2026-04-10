import React from 'react';
import { Cog, X, Wrench, Settings, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MaquinariaHistorial = ({
  selectedMaquinaria,
  historialData,
  loadingHistorial,
  onClose,
}) => {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'hsl(var(--card))', borderRadius: '12px', maxWidth: '800px', width: '100%', maxHeight: '85vh', overflow: 'auto' }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'hsl(var(--card))', zIndex: 1 }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cog size={24} /> Historial de {selectedMaquinaria.nombre}
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
              {selectedMaquinaria.tipo} - {selectedMaquinaria.matricula || 'Sin matricula'}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost"><X size={20} /></button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loadingHistorial ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}><p>Cargando historial...</p></div>
          ) : historialData ? (
            <>
              {/* Resumen */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{historialData.total_usos || 0}</div>
                  <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Usos en Tratamientos</div>
                </div>
                <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'hsl(var(--muted) / 0.3)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{historialData.mantenimientos?.length || 0}</div>
                  <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Mantenimientos</div>
                </div>
              </div>

              {/* Chart */}
              {historialData.tratamientos?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={18} /> Evolucion de Uso
                  </h4>
                  <div style={{ height: '160px', background: 'hsl(var(--muted) / 0.2)', borderRadius: '8px', padding: '0.5rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={
                        Object.entries(
                          historialData.tratamientos.reduce((acc, t) => {
                            const fecha = t.fecha ? new Date(t.fecha) : new Date();
                            const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                            if (!acc[mes]) acc[mes] = { mes, usos: 0 };
                            acc[mes].usos += 1;
                            return acc;
                          }, {})
                        ).map(([_, v]) => v).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6)
                      }>
                        <defs>
                          <linearGradient id="colorUsos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip formatter={(value) => [`${value} usos`, 'Tratamientos']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="usos" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Treatments list */}
              {historialData.tratamientos?.length > 0 ? (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wrench size={18} /> Tratamientos Realizados
                  </h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {historialData.tratamientos.map(t => (
                      <div key={t._id} style={{ padding: '0.75rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{t.producto || t.tipo || 'Tratamiento'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                            {t.fecha ? new Date(t.fecha).toLocaleDateString('es-ES') : '-'}
                            {t.parcela_nombre && ` - ${t.parcela_nombre}`}
                          </div>
                        </div>
                        <span className={`badge ${t.estado === 'completado' ? 'badge-success' : 'badge-secondary'}`}>{t.estado || 'Registrado'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '1rem' }}>No hay tratamientos registrados</p>
              )}

              {/* Maintenance list */}
              {historialData.mantenimientos?.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={18} /> Mantenimientos
                  </h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {historialData.mantenimientos.map(m => (
                      <div key={m._id} style={{ padding: '0.75rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '500' }}>{m.tipo || 'Mantenimiento'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{m.fecha ? new Date(m.fecha).toLocaleDateString('es-ES') : '-'}</div>
                        </div>
                        {m.coste && <div style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>{m.coste.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
              <Cog size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No hay historial disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaquinariaHistorial;
