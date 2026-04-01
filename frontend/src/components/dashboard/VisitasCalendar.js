import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const VisitasCalendar = ({ visitas, onDateClick, t }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());

  const monthNames = t('dashboard.calendar.monthNames', { returnObjects: true }) || ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = t('dashboard.calendar.dayNames', { returnObjects: true }) || ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const goToToday = () => {
    const today = new Date();
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const getVisitasForDate = (day) => {
    return visitas.filter(v => {
      const fecha = new Date(v.fecha_planificada);
      return fecha.getDate() === day && fecha.getMonth() === month && fecha.getFullYear() === year;
    });
  };

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div style={{ padding: '0.5rem' }}>
      {/* Header de navegacion */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={prevMonth} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem' }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontWeight: '600', fontSize: '1rem' }}>{monthNames[month]} {year}</span>
          <button onClick={goToToday} className="btn btn-sm" style={{ marginLeft: '0.5rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
            Hoy
          </button>
        </div>
        <button onClick={nextMonth} className="btn btn-sm btn-secondary" style={{ padding: '0.4rem' }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Dias de la semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
        {dayNames.map(d => (
          <div key={d} style={{ 
            textAlign: 'center', 
            fontSize: '0.7rem', 
            fontWeight: '600', 
            color: 'hsl(var(--muted-foreground))',
            padding: '0.25rem'
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Celdas del calendario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const visitasDelDia = getVisitasForDate(day);
          const tieneVisitas = visitasDelDia.length > 0;

          return (
            <div
              key={day}
              onClick={() => {
                const date = new Date(year, month, day);
                if (onDateClick) onDateClick(date);
              }}
              style={{
                textAlign: 'center',
                padding: '0.35rem',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: isToday(day) ? '#2d5a27' : tieneVisitas ? '#e8f5e9' : 'transparent',
                color: isToday(day) ? 'white' : 'inherit',
                border: tieneVisitas && !isToday(day) ? '2px solid #4CAF50' : '2px solid transparent',
                position: 'relative',
                minHeight: '36px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: isToday(day) || tieneVisitas ? '600' : '400' }}>
                {day}
              </span>
              {tieneVisitas && (
                <div style={{ 
                  display: 'flex', gap: '1px', marginTop: '1px'
                }}>
                  {visitasDelDia.slice(0, 3).map((_, vIdx) => (
                    <div 
                      key={vIdx}
                      style={{ 
                        width: '4px', height: '4px', borderRadius: '50%',
                        backgroundColor: isToday(day) ? 'white' : '#2d5a27'
                      }} 
                    />
                  ))}
                  {visitasDelDia.length > 3 && (
                    <span style={{ fontSize: '0.6rem', color: isToday(day) ? 'white' : '#2d5a27' }}>+</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ 
        marginTop: '0.75rem', 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'center',
        fontSize: '0.7rem',
        color: 'hsl(var(--muted-foreground))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#2d5a27', borderRadius: '4px' }} />
          <span>Hoy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50', borderRadius: '4px' }} />
          <span>Con visitas</span>
        </div>
      </div>
    </div>
  );
};

export default VisitasCalendar;
