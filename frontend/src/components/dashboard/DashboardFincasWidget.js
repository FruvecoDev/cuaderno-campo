import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AXIS_TICK, AXIS_LABEL_TICK, TOOLTIP_STYLE, LEGEND_STYLE, truncTick, percentLabelRenderer } from '../../utils/chartStyles';
import { Home, AlertTriangle, Building2 } from 'lucide-react';

const DashboardFincasWidget = ({ kpis, navigate }) => {
  if (!kpis.fincas) return null;

  const fincasData = Object.entries(kpis.fincas.por_provincia || {}).map(([name, data]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    fullName: name,
    fincas: data.count,
    hectareas: data.hectareas,
    propias: data.propias,
    alquiladas: data.alquiladas
  })).sort((a, b) => b.fincas - a.fincas);

  const fincasTipoData = [
    { name: 'Propias', value: kpis.fincas.propias, color: '#2d5a27' },
    { name: 'Alquiladas', value: kpis.fincas.alquiladas, color: '#f57c00' }
  ];

  return (
    <div className="card mb-6" data-testid="dashboard-fincas">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Home size={22} style={{ color: '#2d5a27' }} /> Resumen de Fincas
        </h2>
        <button onClick={() => navigate('/fincas')} className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Ver todas
        </button>
      </div>
      
      {kpis.fincas.parcelas_sin_asignar > 0 && (
        <div style={{
          backgroundColor: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '8px',
          padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <AlertTriangle size={20} style={{ color: '#f57c00' }} />
          <div>
            <div style={{ fontWeight: '600', color: '#e65100' }}>
              {kpis.fincas.parcelas_sin_asignar} parcela{kpis.fincas.parcelas_sin_asignar > 1 ? 's' : ''} sin asignar a fincas
            </div>
            <div style={{ fontSize: '0.8rem', color: '#bf360c' }}>
              Organiza tus parcelas asignandolas a sus respectivas fincas
            </div>
          </div>
          <button onClick={() => navigate('/fincas')} className="btn btn-sm" style={{ marginLeft: 'auto', backgroundColor: '#f57c00', color: 'white' }}>
            Asignar
          </button>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#2d5a27', fontWeight: '500' }}>Total Fincas</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1b5e20' }}>{kpis.fincas.total}</div>
        </div>
        <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid #2d5a27' }}>
          <div style={{ fontSize: '0.8rem', color: '#2d5a27', fontWeight: '500' }}>Propias</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#2d5a27' }}>{kpis.fincas.propias}</div>
        </div>
        <div style={{ backgroundColor: '#fff3e0', padding: '1rem', borderRadius: '8px', textAlign: 'center', borderLeft: '3px solid #f57c00' }}>
          <div style={{ fontSize: '0.8rem', color: '#e65100', fontWeight: '500' }}>Alquiladas</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#f57c00' }}>{kpis.fincas.alquiladas}</div>
        </div>
        <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#1565c0', fontWeight: '500' }}>Hectareas Total</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1565c0' }}>{kpis.fincas.hectareas_total?.toLocaleString() || 0}</div>
        </div>
        <div style={{ backgroundColor: '#f3e5f5', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#7b1fa2', fontWeight: '500' }}>Prod. Esperada (t)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7b1fa2' }}>{kpis.fincas.produccion_esperada?.toLocaleString() || 0}</div>
        </div>
        <div style={{ backgroundColor: '#fce4ec', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#c2185b', fontWeight: '500' }}>Prod. Disponible (t)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#c2185b' }}>{kpis.fincas.produccion_disponible?.toLocaleString() || 0}</div>
        </div>
      </div>
      
      {fincasData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={16} /> Fincas por Provincia
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fincasData} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={AXIS_LABEL_TICK} tickFormatter={(v) => truncTick(v, 16)} width={110} axisLine={false} tickLine={false} interval={0} />
                <Tooltip 
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  formatter={(value, name) => [value, name === 'propias' ? 'Propias' : name === 'alquiladas' ? 'Alquiladas' : name]}
                  labelFormatter={(label) => {
                    const item = fincasData.find(d => d.name === label);
                    return item ? item.fullName : label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.72rem' }} iconType="circle" iconSize={9} />
                <Bar dataKey="propias" stackId="a" fill="#2d5a27" name="Propias" />
                <Bar dataKey="alquiladas" stackId="a" fill="#f57c00" name="Alquiladas" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={16} /> Distribucion por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <Pie data={fincasTipoData} cx="40%" cy="50%" innerRadius={45} outerRadius={95} paddingAngle={2} dataKey="value"
                  labelLine={false}
                  label={percentLabelRenderer(0.04)}>
                  {fincasTipoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value} fincas`, 'Cantidad']} />
                <Legend
                  layout="vertical" verticalAlign="middle" align="right"
                  iconType="circle" iconSize={9}
                  wrapperStyle={LEGEND_STYLE}
                  formatter={(value) => truncTick(value, 22)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFincasWidget;
