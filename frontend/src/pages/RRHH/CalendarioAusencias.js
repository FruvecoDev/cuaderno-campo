import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, User, Calendar as CalendarIcon } from 'lucide-react';

const CalendarioAusencias = ({ ausencias, empleados }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAusencia, setSelectedAusencia] = useState(null);
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  const tipoColores = {
    vacaciones: { bg: 'hsl(217 91% 60%)', light: 'hsl(217 91% 60% / 0.15)', text: 'hsl(217 91% 60%)' },
    permiso: { bg: 'hsl(280 67% 60%)', light: 'hsl(280 67% 60% / 0.15)', text: 'hsl(280 67% 60%)' },
    baja_medica: { bg: 'hsl(0 84% 60%)', light: 'hsl(0 84% 60% / 0.15)', text: 'hsl(0 84% 60%)' },
    asuntos_propios: { bg: 'hsl(38 92% 50%)', light: 'hsl(38 92% 50% / 0.15)', text: 'hsl(38 92% 50%)' },
    otros: { bg: 'hsl(var(--muted-foreground))', light: 'hsl(var(--muted) / 0.5)', text: 'hsl(var(--muted-foreground))' }
  };
  
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajustar para que Lunes sea 0
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Procesar ausencias para el calendario
  const ausenciasDelMes = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    return ausencias.filter(a => {
      if (a.estado === 'rechazada') return false; // No mostrar rechazadas
      const inicio = new Date(a.fecha_inicio);
      const fin = new Date(a.fecha_fin);
      return (inicio <= lastDay && fin >= firstDay);
    });
  }, [ausencias, currentDate]);
  
  // Obtener ausencias para un día específico
  const getAusenciasForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr);
    
    return ausenciasDelMes.filter(a => {
      const inicio = new Date(a.fecha_inicio);
      const fin = new Date(a.fecha_fin);
      return date >= inicio && date <= fin;
    });
  };
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  
  // Crear array de días
  const days = [];
  // Días vacíos al inicio
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Días del mes
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      {/* Header del calendario */}
      <div style={{ 
        padding: '1rem 1.25rem', 
        borderBottom: '1px solid hsl(var(--border))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={prevMonth} className="btn btn-ghost btn-sm">
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ fontWeight: '600', minWidth: '180px', textAlign: 'center' }}>
            {meses[month]} {year}
          </h3>
          <button onClick={nextMonth} className="btn btn-ghost btn-sm">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={goToToday} className="btn btn-secondary btn-sm">
            Hoy
          </button>
          
          {/* Leyenda */}
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: '1rem', fontSize: '0.75rem' }}>
            {Object.entries(tipoColores).map(([tipo, colores]) => (
              <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: colores.bg }}></div>
                <span style={{ textTransform: 'capitalize' }}>{tipo.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Grid del calendario */}
      <div style={{ padding: '1rem' }}>
        {/* Días de la semana */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '4px',
          marginBottom: '0.5rem'
        }}>
          {diasSemana.map(dia => (
            <div key={dia} style={{ 
              textAlign: 'center', 
              fontWeight: '600', 
              fontSize: '0.75rem',
              color: 'hsl(var(--muted-foreground))',
              padding: '0.5rem'
            }}>
              {dia}
            </div>
          ))}
        </div>
        
        {/* Días del mes */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '4px'
        }}>
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} style={{ minHeight: '80px' }}></div>;
            }
            
            const ausenciasDelDia = getAusenciasForDay(day);
            const isToday = isCurrentMonth && today.getDate() === day;
            const isWeekend = (index % 7 === 5) || (index % 7 === 6); // Sáb o Dom
            
            return (
              <div 
                key={day}
                style={{ 
                  minHeight: '80px',
                  padding: '0.25rem',
                  border: isToday ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  background: isWeekend ? 'hsl(var(--muted) / 0.3)' : 'transparent',
                  cursor: ausenciasDelDia.length > 0 ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (ausenciasDelDia.length > 0) {
                    setSelectedAusencia(ausenciasDelDia[0]);
                  }
                }}
              >
                <div style={{ 
                  fontWeight: isToday ? '700' : '500',
                  fontSize: '0.875rem',
                  color: isToday ? 'hsl(var(--primary))' : 'inherit',
                  marginBottom: '0.25rem'
                }}>
                  {day}
                </div>
                
                {/* Ausencias del día */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {ausenciasDelDia.slice(0, 3).map((a, i) => {
                    const colores = tipoColores[a.tipo] || tipoColores.otros;
                    return (
                      <div 
                        key={`${a._id}-${i}`}
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          background: a.estado === 'pendiente' ? colores.light : colores.bg,
                          color: a.estado === 'pendiente' ? colores.text : 'white',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          border: a.estado === 'pendiente' ? `1px dashed ${colores.text}` : 'none'
                        }}
                        title={`${a.empleado_nombre} - ${a.tipo}`}
                      >
                        {a.empleado_nombre?.split(' ')[0]}
                      </div>
                    );
                  })}
                  {ausenciasDelDia.length > 3 && (
                    <div style={{ fontSize: '0.6rem', color: 'hsl(var(--muted-foreground))' }}>
                      +{ausenciasDelDia.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Modal de detalle */}
      {selectedAusencia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setSelectedAusencia(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '1.25rem',
              background: (tipoColores[selectedAusencia.tipo] || tipoColores.otros).light,
              borderBottom: `3px solid ${(tipoColores[selectedAusencia.tipo] || tipoColores.otros).bg}`
            }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={20} />
                Detalle de Ausencia
              </h3>
            </div>
            
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  background: 'hsl(var(--primary) / 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={24} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedAusencia.empleado_nombre}</div>
                  <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                    {selectedAusencia.empleado_codigo}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.25rem' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>Tipo:</span>
                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{(selectedAusencia.tipo || '').replace('_', ' ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.25rem' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>Desde:</span>
                  <span style={{ fontWeight: '500' }}>{selectedAusencia.fecha_inicio}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.25rem' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>Hasta:</span>
                  <span style={{ fontWeight: '500' }}>{selectedAusencia.fecha_fin}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.25rem' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>Días:</span>
                  <span style={{ fontWeight: '600' }}>{selectedAusencia.dias_totales || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.25rem' }}>
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>Estado:</span>
                  <span style={{ 
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    background: selectedAusencia.estado === 'aprobada' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(38 92% 50% / 0.1)',
                    color: selectedAusencia.estado === 'aprobada' ? 'hsl(142 76% 36%)' : 'hsl(38 92% 50%)'
                  }}>
                    {selectedAusencia.estado}
                  </span>
                </div>
                {selectedAusencia.motivo && (
                  <div style={{ padding: '0.5rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.25rem' }}>
                    <span style={{ color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.25rem' }}>Motivo:</span>
                    <span>{selectedAusencia.motivo}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setSelectedAusencia(null)}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '1.25rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioAusencias;
