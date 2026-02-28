import React, { useState, useEffect } from 'react';
import { 
  X, User, CreditCard, FileText, Download, Eye, Check
} from 'lucide-react';
import api from '../../services/api';

const PrenominaTab = ({ empleados }) => {
  const [prenominas, setPrenominas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());
  const [calculando, setCalculando] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [prenominaDetalle, setPrenominaDetalle] = useState(null);
  const [empleadoCalculo, setEmpleadoCalculo] = useState('');
  const [calculandoIndividual, setCalculandoIndividual] = useState(false);
  
  useEffect(() => {
    fetchPrenominas();
  }, [mesSeleccionado, anoSeleccionado]);
  
  const fetchPrenominas = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/rrhh/prenominas?mes=${mesSeleccionado}&ano=${anoSeleccionado}`);
      setPrenominas(data.prenominas || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCalcularIndividual = async () => {
    if (!empleadoCalculo) return;
    
    setCalculandoIndividual(true);
    try {
      await api.post('/api/rrhh/prenominas/calcular', {
        empleado_id: empleadoCalculo,
        mes: mesSeleccionado,
        ano: anoSeleccionado
      });
      fetchPrenominas();
      setEmpleadoCalculo('');
    } catch (err) {
      console.error('Error:', err);
      alert('Error al calcular prenómina: ' + api.getErrorMessage(err));
    } finally {
      setCalculandoIndividual(false);
    }
  };
  
  const handleCalcularTodas = async () => {
    if (!window.confirm('¿Calcular prenóminas de todos los empleados activos?')) return;
    
    setCalculando(true);
    try {
      await api.post('/api/rrhh/prenominas/calcular-todos', {
        mes: mesSeleccionado,
        ano: anoSeleccionado
      });
      fetchPrenominas();
    } catch (err) {
      console.error('Error:', err);
      alert('Error al calcular prenóminas: ' + api.getErrorMessage(err));
    } finally {
      setCalculando(false);
    }
  };
  
  const handleValidar = async (prenominaId) => {
    if (!window.confirm('¿Validar esta prenómina?')) return;
    
    try {
      await api.put(`/api/rrhh/prenominas/${prenominaId}/validar`, {
        validado_por: 'admin'
      });
      fetchPrenominas();
    } catch (err) {
      console.error('Error:', err);
      alert('Error al validar: ' + api.getErrorMessage(err));
    }
  };
  
  const handleExportarExcel = async (prenominaId) => {
    try {
      await api.download(
        `/api/rrhh/prenominas/${prenominaId}/excel`,
        `prenomina_${mesSeleccionado}_${anoSeleccionado}.xlsx`
      );
    } catch (err) {
      console.error('Error:', err);
      alert('Error al exportar Excel');
    }
  };
  
  const handleExportarPdf = async (prenominaId) => {
    try {
      await api.download(
        `/api/rrhh/prenominas/${prenominaId}/pdf`,
        `prenomina_${mesSeleccionado}_${anoSeleccionado}.pdf`
      );
    } catch (err) {
      console.error('Error:', err);
      alert('Error al exportar PDF');
    }
  };
  
  const handleExportarTodas = async () => {
    try {
      const data = await api.get(`/api/rrhh/prenominas/export?mes=${mesSeleccionado}&ano=${anoSeleccionado}`);
      
      const headers = ['Código', 'DNI', 'Nombre', 'Horas Normales', 'Horas Extra', 'Horas Nocturnas', 'Total Horas', 'Días', 'Importe Bruto', 'Importe Neto'];
      const rows = data.prenominas.map(p => [
        p.codigo_empleado, p.dni, p.nombre, p.horas_normales, p.horas_extra, p.horas_nocturnas, p.total_horas, p.dias_trabajados, p.importe_bruto, p.importe_neto
      ]);
      
      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prenominas_${anoSeleccionado}_${mesSeleccionado}.csv`;
      a.click();
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  const handleVerDetalle = (prenomina) => {
    setPrenominaDetalle(prenomina);
    setShowDetalle(true);
  };
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  const totalBruto = prenominas.reduce((acc, p) => acc + (p.importe_bruto || 0), 0);
  const totalNeto = prenominas.reduce((acc, p) => acc + (p.importe_neto || 0), 0);
  const totalHoras = prenominas.reduce((acc, p) => acc + (p.total_horas || 0), 0);
  
  return (
    <div>
      {/* KPIs del periodo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{prenominas.length}</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Prenóminas</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(217 91% 60%)' }}>{totalHoras.toFixed(1)}</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Horas</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>{totalBruto.toFixed(2)} €</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Importe Bruto</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>{totalNeto.toFixed(2)} €</div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Importe Neto</div>
        </div>
      </div>
      
      {/* Selector de periodo y acciones */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={20} style={{ color: 'hsl(var(--primary))' }} />
          Generar Prenóminas
        </h3>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={e => setMesSeleccionado(parseInt(e.target.value))}
              className="form-select"
              style={{ minWidth: '150px' }}
              data-testid="select-mes-prenomina"
            >
              {meses.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Año</label>
            <select
              value={anoSeleccionado}
              onChange={e => setAnoSeleccionado(parseInt(e.target.value))}
              className="form-select"
              style={{ minWidth: '100px' }}
              data-testid="select-ano-prenomina"
            >
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          
          <div style={{ borderLeft: '1px solid hsl(var(--border))', paddingLeft: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '220px' }}>
              <label className="form-label">Empleado Individual</label>
              <select
                value={empleadoCalculo}
                onChange={e => setEmpleadoCalculo(e.target.value)}
                className="form-select"
                data-testid="select-empleado-calculo"
              >
                <option value="">Seleccionar empleado...</option>
                {empleados.filter(e => e.activo).map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.codigo} - {emp.nombre} {emp.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCalcularIndividual}
              className="btn btn-secondary"
              disabled={!empleadoCalculo || calculandoIndividual}
              data-testid="btn-calcular-individual"
            >
              {calculandoIndividual ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
          
          <button
            onClick={handleCalcularTodas}
            className="btn btn-primary"
            disabled={calculando}
            style={{ marginLeft: 'auto' }}
            data-testid="btn-calcular-todas"
          >
            {calculando ? 'Calculando...' : 'Calcular Todas'}
          </button>
        </div>
      </div>
      
      {/* Acciones sobre listado */}
      {prenominas.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={handleExportarTodas} className="btn btn-secondary btn-sm" data-testid="btn-exportar-csv">
            <FileText size={16} />
            Exportar CSV
          </button>
        </div>
      )}
      
      {/* Tabla de prenóminas */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>DNI</th>
                <th>H. Normales</th>
                <th>H. Extra</th>
                <th>H. Nocturnas</th>
                <th>Total Horas</th>
                <th>Días</th>
                <th>Importe Bruto</th>
                <th>Importe Neto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {prenominas.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <p>No hay prenóminas para {meses[mesSeleccionado - 1]} {anoSeleccionado}.</p>
                      <p style={{ fontSize: '0.875rem' }}>Selecciona un empleado o haz clic en "Calcular Todas" para generar las prenóminas.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                prenominas.map(p => (
                  <tr key={p._id} data-testid={`prenomina-row-${p._id}`}>
                    <td>
                      <div style={{ fontWeight: '500' }}>{p.empleado_nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{p.codigo_empleado}</div>
                    </td>
                    <td>{p.empleado_dni}</td>
                    <td>{(p.horas_normales || 0).toFixed(1)}</td>
                    <td style={{ color: p.horas_extra > 0 ? 'hsl(38 92% 50%)' : 'inherit' }}>
                      {(p.horas_extra || 0).toFixed(1)}
                    </td>
                    <td style={{ color: p.horas_nocturnas > 0 ? 'hsl(217 91% 60%)' : 'inherit' }}>
                      {(p.horas_nocturnas || 0).toFixed(1)}
                    </td>
                    <td style={{ fontWeight: '600' }}>{(p.total_horas || 0).toFixed(1)}</td>
                    <td>{p.dias_trabajados || 0}</td>
                    <td style={{ fontWeight: '600' }}>{(p.importe_bruto || 0).toFixed(2)} €</td>
                    <td style={{ fontWeight: '600', color: 'hsl(142 76% 36%)' }}>{(p.importe_neto || 0).toFixed(2)} €</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: p.estado === 'validada' ? 'hsl(142 76% 36% / 0.1)' : 
                                  p.estado === 'exportada' ? 'hsl(217 91% 60% / 0.1)' : 'hsl(38 92% 50% / 0.1)',
                        color: p.estado === 'validada' ? 'hsl(142 76% 36%)' : 
                              p.estado === 'exportada' ? 'hsl(217 91% 60%)' : 'hsl(38 92% 50%)'
                      }}>
                        {p.estado === 'validada' ? 'Validada' : p.estado === 'exportada' ? 'Exportada' : 'Borrador'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleVerDetalle(p)}
                          className="btn btn-ghost btn-sm"
                          title="Ver detalle"
                          data-testid={`btn-ver-detalle-${p._id}`}
                        >
                          <Eye size={16} />
                        </button>
                        {p.estado !== 'validada' && (
                          <button
                            onClick={() => handleValidar(p._id)}
                            className="btn btn-ghost btn-sm"
                            title="Validar"
                            style={{ color: 'hsl(142 76% 36%)' }}
                            data-testid={`btn-validar-${p._id}`}
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleExportarExcel(p._id)}
                          className="btn btn-ghost btn-sm"
                          title="Exportar Excel"
                          data-testid={`btn-excel-${p._id}`}
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handleExportarPdf(p._id)}
                          className="btn btn-ghost btn-sm"
                          title="Exportar PDF"
                          style={{ color: 'hsl(0 84% 60%)' }}
                          data-testid={`btn-pdf-${p._id}`}
                        >
                          <Download size={16} />
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
      
      {/* Modal de Detalle de Prenómina */}
      {showDetalle && prenominaDetalle && (
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
          zIndex: 1000,
          padding: '2rem'
        }} onClick={() => setShowDetalle(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid hsl(var(--border))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'hsl(var(--card))',
              zIndex: 1
            }}>
              <h2 style={{ margin: 0 }}>Detalle de Prenómina</h2>
              <button onClick={() => setShowDetalle(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Info empleado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'hsl(var(--muted) / 0.3)', borderRadius: '0.5rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={28} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{prenominaDetalle.empleado_nombre}</div>
                  <div style={{ color: 'hsl(var(--muted-foreground))' }}>DNI: {prenominaDetalle.empleado_dni} | Código: {prenominaDetalle.codigo_empleado}</div>
                </div>
              </div>
              
              {/* Periodo */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ 
                  padding: '0.5rem 1.5rem', 
                  background: 'hsl(var(--primary))', 
                  color: 'white', 
                  borderRadius: '9999px',
                  fontWeight: '600'
                }}>
                  {meses[prenominaDetalle.periodo_mes - 1]} {prenominaDetalle.periodo_ano}
                </span>
              </div>
              
              {/* Desglose de horas */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>Desglose de Horas</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', background: 'hsl(var(--muted) / 0.2)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Horas Normales</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{(prenominaDetalle.horas_normales || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'hsl(38 92% 50% / 0.1)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(38 92% 50%)' }}>Horas Extra</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'hsl(38 92% 50%)' }}>{(prenominaDetalle.horas_extra || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'hsl(217 91% 60% / 0.1)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(217 91% 60%)' }}>Horas Nocturnas</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'hsl(217 91% 60%)' }}>{(prenominaDetalle.horas_nocturnas || 0).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'hsl(280 67% 60% / 0.1)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(280 67% 60%)' }}>Horas Festivos</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'hsl(280 67% 60%)' }}>{(prenominaDetalle.horas_festivos || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
              
              {/* Resumen */}
              <div style={{ padding: '1rem', background: 'hsl(var(--primary) / 0.05)', borderRadius: '0.5rem', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Horas:</span>
                  <span style={{ fontWeight: '600' }}>{(prenominaDetalle.total_horas || 0).toFixed(2)} h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Días Trabajados:</span>
                  <span style={{ fontWeight: '600' }}>{prenominaDetalle.dias_trabajados || 0}</span>
                </div>
                <div style={{ borderTop: '1px solid hsl(var(--border))', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Importe Bruto:</span>
                    <span style={{ fontWeight: '600' }}>{(prenominaDetalle.importe_bruto || 0).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'hsl(0 84% 60%)' }}>
                    <span>Deducciones:</span>
                    <span style={{ fontWeight: '600' }}>-{(prenominaDetalle.deducciones || 0).toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>
                    <span>Importe Neto:</span>
                    <span>{(prenominaDetalle.importe_neto || 0).toFixed(2)} €</span>
                  </div>
                </div>
              </div>
              
              {/* Botones de exportación */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => handleExportarExcel(prenominaDetalle._id)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  <FileText size={18} />
                  Exportar Excel
                </button>
                <button
                  onClick={() => handleExportarPdf(prenominaDetalle._id)}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Download size={18} />
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrenominaTab;
