import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import api from '../../services/api';

const ProductividadTab = ({ empleados }) => {
  const [stats, setStats] = useState(null);
  const [tiempoReal, setTiempoReal] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [statsData, tiempoRealData] = await Promise.all([
        api.get('/api/rrhh/productividad/stats'),
        api.get('/api/rrhh/productividad/tiempo-real')
      ]);
      setStats(statsData);
      setTiempoReal(tiempoRealData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  return (
    <div>
      {/* Tiempo Real */}
      {tiempoReal && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(142 76% 36%)', animation: 'pulse 2s infinite' }}></span>
              Productividad en Tiempo Real
            </h3>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
              {tiempoReal.total_empleados_trabajando} empleados trabajando
            </span>
          </div>
          
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{tiempoReal.totales_hoy?.total_kilos?.toFixed(0) || 0} kg</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Hoy</div>
              </div>
              <div style={{ padding: '1rem', background: 'hsl(var(--muted))', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{tiempoReal.totales_hoy?.total_horas?.toFixed(1) || 0} h</div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Trabajadas</div>
              </div>
            </div>
            
            {tiempoReal.empleados_trabajando?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Empleados Activos</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tiempoReal.empleados_trabajando.map(emp => (
                    <div key={emp.empleado_id} style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: 'hsl(var(--primary) / 0.1)', 
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <User size={14} />
                      {emp.empleado_nombre}
                      {emp.kilos_hoy > 0 && <span style={{ fontWeight: '600' }}>({emp.kilos_hoy} kg)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Estadísticas del periodo */}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_kilos?.toFixed(0) || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Totales</div>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_hectareas?.toFixed(1) || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Hectáreas</div>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_horas?.toFixed(0) || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Trabajadas</div>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.totales?.total_registros || 0}</div>
              <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Registros</div>
            </div>
          </div>
          
          {/* Top Empleados */}
          {stats.top_empleados?.length > 0 && (
            <div className="card">
              <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                <h3 style={{ fontWeight: '600' }}>Top 10 Empleados por Productividad</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Empleado</th>
                      <th>Kilos</th>
                      <th>Horas</th>
                      <th>Kg/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_empleados.map((emp, idx) => (
                      <tr key={emp.empleado_id}>
                        <td style={{ fontWeight: '600', color: idx < 3 ? 'hsl(var(--primary))' : 'inherit' }}>{idx + 1}</td>
                        <td>{emp.empleado_nombre}</td>
                        <td style={{ fontWeight: '600' }}>{emp.total_kilos?.toFixed(0)}</td>
                        <td>{emp.total_horas?.toFixed(1)}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            background: emp.kilos_hora > 50 ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))',
                            color: emp.kilos_hora > 50 ? 'hsl(142 76% 36%)' : 'inherit',
                            fontWeight: '600'
                          }}>
                            {emp.kilos_hora}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductividadTab;
