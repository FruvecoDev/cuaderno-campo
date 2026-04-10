import React from 'react';
import { Leaf, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#2d5a27', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const TratamientosKPIs = ({ stats }) => {
  if (!stats) return null;
  
  return (
    <div style={{ marginBottom: '1.5rem' }} data-testid="tratamientos-kpis">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))' }}>
          <Leaf size={28} style={{ margin: '0 auto 0.5rem', color: 'hsl(var(--primary))' }} />
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Total Tratamientos</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(142 76% 36% / 0.1), hsl(142 76% 36% / 0.05))' }}>
          <CheckCircle size={28} style={{ margin: '0 auto 0.5rem', color: 'hsl(142 76% 36%)' }} />
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>{stats.realizados}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Realizados</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(38 92% 50% / 0.1), hsl(38 92% 50% / 0.05))' }}>
          <Clock size={28} style={{ margin: '0 auto 0.5rem', color: 'hsl(38 92% 50%)' }} />
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>{stats.pendientes}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Pendientes</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'linear-gradient(135deg, hsl(210 100% 50% / 0.1), hsl(210 100% 50% / 0.05))' }}>
          <TrendingUp size={28} style={{ margin: '0 auto 0.5rem', color: 'hsl(210 100% 50%)' }} />
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(210 100% 50%)' }}>{stats.superficie_total?.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Hectareas Tratadas</div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
        {stats.por_mes?.length > 0 && (
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Tratamientos por Mes</h3>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.por_mes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tratamientos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {stats.por_tipo?.length > 0 && (
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem' }}>Por Tipo de Tratamiento</h3>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.por_tipo} dataKey="count" nameKey="tipo" cx="50%" cy="50%" outerRadius={70}
                    label={({ tipo, percent }) => `${tipo} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {stats.por_tipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TratamientosKPIs;
