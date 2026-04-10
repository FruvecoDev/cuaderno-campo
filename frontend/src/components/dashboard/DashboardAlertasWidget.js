import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Cog, ChevronDown, ChevronUp, Clock, XCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const AlertItem = ({ item, icon, colorClass }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
    borderRadius: '6px', backgroundColor: `hsl(var(${colorClass}) / 0.06)`,
    border: `1px solid hsl(var(${colorClass}) / 0.15)`,
  }}>
    <div style={{ flexShrink: 0, color: `hsl(var(${colorClass}))` }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: '500', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nombre}</div>
      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{item.detalle}</div>
    </div>
    <span style={{
      fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '10px',
      backgroundColor: `hsl(var(${colorClass}) / 0.15)`, color: `hsl(var(${colorClass}))`,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>{item.badge}</span>
  </div>
);

const DashboardAlertasWidget = () => {
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => { fetchAlertas(); }, []);

  const fetchAlertas = async () => {
    try {
      const data = await api.get('/api/alertas/resumen');
      setAlertas(data);
    } catch (err) { console.error('Error fetching alerts:', err); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '1.5rem' }} data-testid="alertas-widget-loading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
          <Clock size={18} className="animate-spin" /> Cargando alertas...
        </div>
      </div>
    );
  }

  if (!alertas || alertas.total_alertas === 0) {
    return (
      <div className="card" data-testid="dashboard-alertas-widget" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} /> Alertas y Avisos
        </h3>
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--muted-foreground))' }}>
          <Shield size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3, color: 'hsl(142 76% 36%)' }} />
          <p style={{ fontWeight: '500' }}>Todo en orden</p>
          <p style={{ fontSize: '0.8rem' }}>No hay alertas pendientes</p>
        </div>
      </div>
    );
  }

  const { tecnicos, maquinaria } = alertas;
  const totalCriticas = (tecnicos?.total_criticas || 0) + (maquinaria?.total_criticas || 0);

  const tecnicosItems = [
    ...(tecnicos?.vencidos || []).map(t => ({ nombre: t.nombre, detalle: `Carnet ${t.num_carnet} - Vencido: ${t.fecha_validez}`, badge: 'VENCIDO' })),
    ...(tecnicos?.proximo_30 || []).map(t => ({ nombre: t.nombre, detalle: `Carnet ${t.num_carnet} - Vence: ${t.fecha_validez}`, badge: '< 30 dias' })),
    ...(tecnicos?.proximo_60 || []).map(t => ({ nombre: t.nombre, detalle: `Carnet ${t.num_carnet} - Vence: ${t.fecha_validez}`, badge: '< 60 dias' })),
    ...(tecnicos?.proximo_90 || []).map(t => ({ nombre: t.nombre, detalle: `Carnet ${t.num_carnet} - Vence: ${t.fecha_validez}`, badge: '< 90 dias' })),
  ];

  const maqItvItems = [
    ...(maquinaria?.itv_vencida || []).map(m => ({ nombre: m.nombre, detalle: `${m.tipo} - ${m.matricula || 'Sin matricula'} - ITV: ${m.fecha_proxima_itv}`, badge: 'VENCIDA' })),
    ...(maquinaria?.itv_proximo_30 || []).map(m => ({ nombre: m.nombre, detalle: `${m.tipo} - ${m.matricula || 'Sin matricula'} - ITV: ${m.fecha_proxima_itv}`, badge: '< 30 dias' })),
  ];

  const maqMantItems = (maquinaria?.mantenimiento_pendiente || []).map(m => ({
    nombre: m.nombre, detalle: `${m.tipo} - Ultimo: ${m.fecha_ultimo_mantenimiento} - ${m.dias_vencido} dias de retraso`, badge: 'PENDIENTE'
  }));

  const sections = [
    { key: 'tecnicos', label: 'Certificados Tecnicos', icon: <Shield size={18} />, items: tecnicosItems, color: '--destructive', vencidos: tecnicos?.vencidos?.length || 0, proximos: (tecnicos?.proximo_30?.length || 0) + (tecnicos?.proximo_60?.length || 0) + (tecnicos?.proximo_90?.length || 0) },
    { key: 'itv', label: 'ITV Maquinaria', icon: <Cog size={18} />, items: maqItvItems, color: '--destructive', vencidos: maquinaria?.itv_vencida?.length || 0, proximos: maquinaria?.itv_proximo_30?.length || 0 },
    { key: 'mantenimiento', label: 'Mantenimiento Maquinaria', icon: <AlertCircle size={18} />, items: maqMantItems, color: '--warning-color', vencidos: maqMantItems.length, proximos: 0 },
  ].filter(s => s.items.length > 0);

  const toggleExpand = (key) => setExpandedSection(prev => prev === key ? null : key);

  return (
    <div className="card" data-testid="dashboard-alertas-widget" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: '600', fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} style={{ color: totalCriticas > 0 ? 'hsl(0 84% 60%)' : 'hsl(38 92% 50%)' }} />
          Alertas y Avisos
        </h3>
        <span style={{
          backgroundColor: totalCriticas > 0 ? 'hsl(0 84% 60%)' : 'hsl(38 92% 50%)',
          color: 'white', fontWeight: '700', fontSize: '0.8rem',
          padding: '0.2rem 0.6rem', borderRadius: '12px',
        }} data-testid="alertas-badge-count">
          {alertas.total_alertas}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sections.map(section => (
          <div key={section.key} style={{ border: '1px solid hsl(var(--border))', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              data-testid={`alertas-section-${section.key}`}
              onClick={() => toggleExpand(section.key)}
              style={{
                width: '100%', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', border: 'none', cursor: 'pointer',
                backgroundColor: expandedSection === section.key ? 'hsl(var(--muted))' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {section.icon}
                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{section.label}</span>
                {section.vencidos > 0 && (
                  <span style={{ backgroundColor: 'hsl(0 84% 60%)', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '8px', fontWeight: '600' }}>
                    {section.vencidos} vencido{section.vencidos > 1 ? 's' : ''}
                  </span>
                )}
                {section.proximos > 0 && (
                  <span style={{ backgroundColor: 'hsl(38 92% 50%)', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '8px', fontWeight: '600' }}>
                    {section.proximos} proximo{section.proximos > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {expandedSection === section.key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {expandedSection === section.key && (
              <div style={{ padding: '0.5rem 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {section.items.map((item, idx) => (
                  <AlertItem
                    key={idx}
                    item={item}
                    icon={item.badge === 'VENCIDO' || item.badge === 'VENCIDA' || item.badge === 'PENDIENTE' ? <XCircle size={16} /> : <Clock size={16} />}
                    colorClass={item.badge === 'VENCIDO' || item.badge === 'VENCIDA' || item.badge === 'PENDIENTE' ? '--destructive' : '--primary'}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardAlertasWidget;
