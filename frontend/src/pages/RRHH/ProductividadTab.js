import React, { useState, useEffect } from 'react';
import { User, Plus, Clock, Calendar, TrendingUp, Trash2, Edit2, X, Filter, RefreshCw, Award, BarChart3 } from 'lucide-react';
import api from '../../services/api';

const ProductividadTab = ({ empleados }) => {
  const [stats, setStats] = useState(null);
  const [tiempoReal, setTiempoReal] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNuevoRegistro, setShowNuevoRegistro] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState(null);
  
  // Filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    empleado_id: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo_trabajo: 'recoleccion',
    kilos: '',
    hectareas: '',
    horas: '',
    parcela: '',
    cultivo: '',
    observaciones: ''
  });
  
  const tiposTrabajo = [
    { value: 'recoleccion', label: 'Recolección' },
    { value: 'poda', label: 'Poda' },
    { value: 'tratamiento', label: 'Tratamiento' },
    { value: 'riego', label: 'Riego' },
    { value: 'plantacion', label: 'Plantación' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'otro', label: 'Otro' }
  ];
  
  useEffect(() => {
    fetchData();
  }, [filtroEmpleado, filtroFechaDesde, filtroFechaHasta]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Construir query params para registros
      let params = new URLSearchParams();
      if (filtroEmpleado) params.append('empleado_id', filtroEmpleado);
      if (filtroFechaDesde) params.append('fecha_desde', filtroFechaDesde);
      if (filtroFechaHasta) params.append('fecha_hasta', filtroFechaHasta);
      
      const queryString = params.toString();
      const registrosUrl = queryString ? `/api/rrhh/productividad?${queryString}` : '/api/rrhh/productividad';
      
      const [statsData, tiempoRealData, registrosData] = await Promise.all([
        api.get('/api/rrhh/productividad/stats'),
        api.get('/api/rrhh/productividad/tiempo-real'),
        api.get(registrosUrl)
      ]);
      
      setStats(statsData);
      setTiempoReal(tiempoRealData);
      setRegistros(registrosData.registros || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!formData.empleado_id) {
      alert('Selecciona un empleado');
      return;
    }
    
    try {
      const empleado = empleados.find(e => e._id === formData.empleado_id);
      const dataToSend = {
        ...formData,
        empleado_nombre: empleado ? `${empleado.nombre} ${empleado.apellidos}` : '',
        empleado_codigo: empleado?.codigo || '',
        kilos: parseFloat(formData.kilos) || 0,
        hectareas: parseFloat(formData.hectareas) || 0,
        horas: parseFloat(formData.horas) || 0
      };
      
      if (editingRegistro) {
        await api.put(`/api/rrhh/productividad/${editingRegistro._id}`, dataToSend);
      } else {
        await api.post('/api/rrhh/productividad', dataToSend);
      }
      
      setShowNuevoRegistro(false);
      setEditingRegistro(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error:', err);
      alert('Error al guardar el registro');
    }
  };
  
  const handleEdit = (registro) => {
    setFormData({
      empleado_id: registro.empleado_id,
      fecha: registro.fecha,
      tipo_trabajo: registro.tipo_trabajo || 'recoleccion',
      kilos: registro.kilos || '',
      hectareas: registro.hectareas || '',
      horas: registro.horas || '',
      parcela: registro.parcela || '',
      cultivo: registro.cultivo || '',
      observaciones: registro.observaciones || ''
    });
    setEditingRegistro(registro);
    setShowNuevoRegistro(true);
  };
  
  const handleDelete = async (registroId) => {
    if (!window.confirm('¿Eliminar este registro de productividad?')) return;
    
    try {
      await api.delete(`/api/rrhh/productividad/${registroId}`);
      fetchData();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const resetForm = () => {
    setFormData({
      empleado_id: '',
      fecha: new Date().toISOString().split('T')[0],
      tipo_trabajo: 'recoleccion',
      kilos: '',
      hectareas: '',
      horas: '',
      parcela: '',
      cultivo: '',
      observaciones: ''
    });
  };
  
  const clearFilters = () => {
    setFiltroEmpleado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };
  
  const empleadosActivos = empleados.filter(e => e.activo);
  
  if (loading && !stats) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  return (
    <div>
      {/* Tiempo Real */}
      {tiempoReal && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.1))' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(142 76% 36%)', animation: 'pulse 2s infinite' }}></span>
              Productividad en Tiempo Real
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                <User size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                {tiempoReal.total_empleados_trabajando || 0} empleados trabajando
              </span>
              <button onClick={fetchData} className="btn btn-ghost btn-sm" title="Actualizar">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: 'hsl(var(--card))', borderRadius: '0.75rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
                  {tiempoReal.totales_hoy?.total_kilos?.toFixed(0) || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Hoy</div>
              </div>
              <div style={{ padding: '1rem', background: 'hsl(var(--card))', borderRadius: '0.75rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>
                  {tiempoReal.totales_hoy?.total_horas?.toFixed(1) || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Hoy</div>
              </div>
              <div style={{ padding: '1rem', background: 'hsl(var(--card))', borderRadius: '0.75rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>
                  {tiempoReal.totales_hoy?.total_horas > 0 
                    ? (tiempoReal.totales_hoy?.total_kilos / tiempoReal.totales_hoy?.total_horas).toFixed(1) 
                    : '0'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kg/Hora Promedio</div>
              </div>
            </div>
            
            {tiempoReal.empleados_trabajando?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Empleados Activos Hoy</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tiempoReal.empleados_trabajando.map(emp => (
                    <div key={emp.empleado_id} style={{ 
                      padding: '0.5rem 0.75rem', 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <User size={14} style={{ color: 'hsl(var(--primary))' }} />
                      <span>{emp.empleado_nombre}</span>
                      {emp.kilos_hoy > 0 && (
                        <span style={{ 
                          fontWeight: '600', 
                          color: 'hsl(var(--primary))',
                          background: 'hsl(var(--primary) / 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem'
                        }}>
                          {emp.kilos_hoy} kg
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* KPIs Generales */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <BarChart3 size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(var(--primary))' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.totales?.total_kilos?.toFixed(0) || 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Totales</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <TrendingUp size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(142 76% 36%)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.totales?.total_hectareas?.toFixed(1) || 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Hectáreas</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <Clock size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(38 92% 50%)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.totales?.total_horas?.toFixed(0) || 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Horas Trabajadas</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <Award size={24} style={{ margin: '0 auto 0.5rem', color: 'hsl(262 83% 58%)' }} />
            <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{stats.totales?.total_registros || 0}</div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Registros</div>
          </div>
        </div>
      )}
      
      {/* Toolbar con filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
          className="form-select"
          style={{ minWidth: '200px' }}
        >
          <option value="">Todos los empleados</option>
          {empleadosActivos.map(emp => (
            <option key={emp._id} value={emp._id}>
              {emp.codigo} - {emp.nombre} {emp.apellidos}
            </option>
          ))}
        </select>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <input
            type="date"
            value={filtroFechaDesde}
            onChange={(e) => setFiltroFechaDesde(e.target.value)}
            className="form-input"
            style={{ width: '140px' }}
          />
          <span>-</span>
          <input
            type="date"
            value={filtroFechaHasta}
            onChange={(e) => setFiltroFechaHasta(e.target.value)}
            className="form-input"
            style={{ width: '140px' }}
          />
        </div>
        
        {(filtroEmpleado || filtroFechaDesde || filtroFechaHasta) && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ color: 'hsl(0 84% 60%)' }}>
            <X size={16} />
            Limpiar
          </button>
        )}
        
        <button
          onClick={() => { setShowNuevoRegistro(true); setEditingRegistro(null); resetForm(); }}
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
        >
          <Plus size={18} />
          Nuevo Registro
        </button>
      </div>
      
      {/* Tabla de Registros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: '600', margin: 0 }}>Registros de Productividad</h3>
          <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
            {registros.length} registros
          </span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Kilos</th>
                <th>Hectáreas</th>
                <th>Horas</th>
                <th>Kg/Hora</th>
                <th>Parcela</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay registros de productividad
                  </td>
                </tr>
              ) : (
                registros.map(reg => (
                  <tr key={reg._id}>
                    <td>{reg.fecha}</td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{reg.empleado_nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{reg.empleado_codigo}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        background: 'hsl(var(--muted))'
                      }}>
                        {tiposTrabajo.find(t => t.value === reg.tipo_trabajo)?.label || reg.tipo_trabajo}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>{reg.kilos?.toFixed(0) || '-'}</td>
                    <td>{reg.hectareas?.toFixed(2) || '-'}</td>
                    <td>{reg.horas?.toFixed(1) || '-'}</td>
                    <td>
                      {reg.horas > 0 && reg.kilos > 0 ? (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontWeight: '600',
                          background: (reg.kilos / reg.horas) > 50 ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))',
                          color: (reg.kilos / reg.horas) > 50 ? 'hsl(142 76% 36%)' : 'inherit'
                        }}>
                          {(reg.kilos / reg.horas).toFixed(1)}
                        </span>
                      ) : '-'}
                    </td>
                    <td>{reg.parcela || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleEdit(reg)}
                          className="btn btn-ghost btn-sm"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(reg._id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'hsl(0 84% 60%)' }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Top Empleados */}
      {stats?.top_empleados?.length > 0 && (
        <div className="card">
          <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
            <h3 style={{ fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} style={{ color: 'hsl(38 92% 50%)' }} />
              Top 10 Empleados por Productividad
            </h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Empleado</th>
                  <th>Kilos</th>
                  <th>Hectáreas</th>
                  <th>Horas</th>
                  <th>Kg/Hora</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_empleados.map((emp, idx) => (
                  <tr key={emp.empleado_id}>
                    <td>
                      {idx < 3 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          fontWeight: '700',
                          background: idx === 0 ? 'hsl(38 92% 50%)' : idx === 1 ? 'hsl(var(--muted))' : 'hsl(30 80% 50%)',
                          color: idx === 0 ? 'white' : idx === 1 ? 'inherit' : 'white'
                        }}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span style={{ fontWeight: '600', color: 'hsl(var(--muted-foreground))' }}>{idx + 1}</span>
                      )}
                    </td>
                    <td style={{ fontWeight: '500' }}>{emp.empleado_nombre}</td>
                    <td style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>{emp.total_kilos?.toFixed(0)}</td>
                    <td>{emp.total_hectareas?.toFixed(2) || '-'}</td>
                    <td>{emp.total_horas?.toFixed(1)}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        background: emp.kilos_hora > 50 ? 'hsl(142 76% 36% / 0.1)' : 'hsl(var(--muted))',
                        color: emp.kilos_hora > 50 ? 'hsl(142 76% 36%)' : 'inherit'
                      }}>
                        {emp.kilos_hora?.toFixed(1) || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Modal Nuevo/Editar Registro */}
      {showNuevoRegistro && (
        <div onClick={() => setShowNuevoRegistro(false)} style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: 'hsl(var(--card))',
            borderRadius: '12px',
            maxWidth: '550px',
            width: '100%',
            maxHeight: '85vh', 
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0 }}>{editingRegistro ? 'Editar Registro' : 'Nuevo Registro de Productividad'}</h2>
              <button onClick={() => setShowNuevoRegistro(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Empleado *</label>
                  <select
                    className="form-select"
                    value={formData.empleado_id}
                    onChange={e => setFormData({...formData, empleado_id: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    {empleadosActivos.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.codigo} - {emp.nombre} {emp.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha}
                    onChange={e => setFormData({...formData, fecha: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Tipo de Trabajo</label>
                <select
                  className="form-select"
                  value={formData.tipo_trabajo}
                  onChange={e => setFormData({...formData, tipo_trabajo: e.target.value})}
                >
                  {tiposTrabajo.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Kilos</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.kilos}
                    onChange={e => setFormData({...formData, kilos: e.target.value})}
                    placeholder="0"
                    min="0"
                    step="0.1"
                  />
                </div>
                
                <div className="form-group">
                  <label>Hectáreas</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.hectareas}
                    onChange={e => setFormData({...formData, hectareas: e.target.value})}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Horas</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.horas}
                    onChange={e => setFormData({...formData, horas: e.target.value})}
                    placeholder="0"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Parcela</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.parcela}
                    onChange={e => setFormData({...formData, parcela: e.target.value})}
                    placeholder="Nombre de la parcela"
                  />
                </div>
                
                <div className="form-group">
                  <label>Cultivo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cultivo}
                    onChange={e => setFormData({...formData, cultivo: e.target.value})}
                    placeholder="Tipo de cultivo"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={formData.observaciones}
                  onChange={e => setFormData({...formData, observaciones: e.target.value})}
                  placeholder="Notas adicionales..."
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => setShowNuevoRegistro(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button onClick={handleSubmit} className="btn btn-primary">
                  {editingRegistro ? 'Guardar Cambios' : 'Crear Registro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductividadTab;
