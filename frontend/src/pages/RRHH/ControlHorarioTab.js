import React, { useState, useEffect, useRef } from 'react';
import { 
  X, User, QrCode, CreditCard, Camera, FileText, Clock, Check
} from 'lucide-react';
import { QrReader } from 'react-qr-reader';
import api from '../../services/api';

const ControlHorarioTab = ({ empleados }) => {
  const [fichajes, setFichajes] = useState([]);
  const [fichajesHoy, setFichajesHoy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFicharModal, setShowFicharModal] = useState(false);
  const [metodoFichaje, setMetodoFichaje] = useState('manual');
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState('');
  const [tipoFichaje, setTipoFichaje] = useState('entrada');
  
  // Estados para QR Scanner
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  
  // Estados para Facial
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [facialEmpleado, setFacialEmpleado] = useState('');
  
  // Estados NFC
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcManualId, setNfcManualId] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);
  
  // Estado para feedback
  const [fichajeResult, setFichajeResult] = useState(null);
  
  // Estado para informe de control horario
  const [informeEmpleadoId, setInformeEmpleadoId] = useState('');
  const [informeFechaDesde, setInformeFechaDesde] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [informeFechaHasta, setInformeFechaHasta] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  useEffect(() => {
    fetchFichajesHoy();
  }, []);
  
  useEffect(() => {
    if (!showFicharModal) {
      stopCamera();
      setScannerActive(false);
      setScanResult(null);
      setScanError(null);
      setCapturedPhoto(null);
      setFichajeResult(null);
      setNfcReading(false);
      setNfcManualId('');
    }
  }, [showFicharModal]);
  
  // Detect NFC support
  useEffect(() => {
    setNfcSupported('NDEFReader' in window);
  }, []);
  
  const fetchFichajesHoy = async () => {
    try {
      const data = await api.get('/api/rrhh/fichajes/hoy');
      setFichajesHoy(data);
      setFichajes(data.fichajes || []);
    } catch (err) {
      console.error('Error fetching fichajes:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFicharManual = async () => {
    if (!empleadoSeleccionado) return;
    
    try {
      const now = new Date();
      const result = await api.post('/api/rrhh/fichajes', {
        empleado_id: empleadoSeleccionado,
        tipo: tipoFichaje,
        fecha: now.toISOString().split('T')[0],
        hora: now.toTimeString().split(' ')[0],
        metodo_identificacion: 'manual'
      });
      
      setFichajeResult({ success: true, data: result.data });
      setEmpleadoSeleccionado('');
      fetchFichajesHoy();
      
      setTimeout(() => {
        setShowFicharModal(false);
        setFichajeResult(null);
      }, 2000);
    } catch (err) {
      console.error('Error fichando:', err);
      setFichajeResult({ success: false, error: api.getErrorMessage(err) });
    }
  };
  
  const handleQRScan = async (result, error) => {
    if (result) {
      const qrCode = result?.text;
      if (qrCode && !scanResult) {
        setScannerActive(false);
        setScanResult(qrCode);
        
        try {
          const response = await api.post('/api/rrhh/fichajes/qr', {
            qr_code: qrCode,
            tipo: tipoFichaje
          });
          
          setFichajeResult({ success: true, data: response.data });
          fetchFichajesHoy();
          
          setTimeout(() => {
            setShowFicharModal(false);
            setFichajeResult(null);
            setScanResult(null);
          }, 2000);
        } catch (err) {
          setScanError(api.getErrorMessage(err));
          setFichajeResult({ success: false, error: api.getErrorMessage(err) });
        }
      }
    }
    if (error && error?.message !== 'No QR code found') {
      console.error('QR Error:', error);
    }
  };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setScanError('No se pudo acceder a la cámara');
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const photoData = canvas.toDataURL('image/jpeg', 0.7);
      setCapturedPhoto(photoData);
      stopCamera();
    }
  };
  
  const handleFichaFacial = async () => {
    if (!facialEmpleado || !capturedPhoto) return;
    
    try {
      const response = await api.post('/api/rrhh/fichajes/facial', {
        empleado_id: facialEmpleado,
        foto_capturada: capturedPhoto,
        tipo: tipoFichaje
      });
      
      setFichajeResult({ success: true, data: response.data });
      fetchFichajesHoy();
      
      setTimeout(() => {
        setShowFicharModal(false);
        setFichajeResult(null);
        setCapturedPhoto(null);
        setFacialEmpleado('');
      }, 2000);
    } catch (err) {
      setFichajeResult({ success: false, error: api.getErrorMessage(err) });
    }
  };
  
  // NFC Functions
  const handleNfcFichaje = async (nfcId) => {
    if (!nfcId) return;
    try {
      const response = await api.post('/api/rrhh/fichajes/nfc', {
        nfc_id: nfcId,
        tipo: tipoFichaje
      });
      setFichajeResult({ success: true, data: response.data });
      fetchFichajesHoy();
      setNfcReading(false);
      setTimeout(() => {
        setShowFicharModal(false);
        setFichajeResult(null);
        setNfcManualId('');
      }, 2500);
    } catch (err) {
      setFichajeResult({ success: false, error: api.getErrorMessage(err) });
      setNfcReading(false);
    }
  };

  const startNfcScan = async () => {
    if (!nfcSupported) return;
    setNfcReading(true);
    setScanError(null);
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.addEventListener('reading', ({ serialNumber }) => {
        handleNfcFichaje(serialNumber);
      });
      ndef.addEventListener('readingerror', () => {
        setScanError('Error al leer la tarjeta NFC. Inténtalo de nuevo.');
        setNfcReading(false);
      });
    } catch (err) {
      setScanError('No se pudo iniciar la lectura NFC: ' + err.message);
      setNfcReading(false);
    }
  };

  const handleNfcManualSubmit = () => {
    const nfcId = nfcManualId.trim();
    if (nfcId) {
      handleNfcFichaje(nfcId);
    }
  };
  
  const handleExportInformeExcel = async () => {
    if (!informeEmpleadoId || !informeFechaDesde || !informeFechaHasta) return;
    
    try {
      const params = new URLSearchParams({
        empleado_id: informeEmpleadoId,
        fecha_desde: informeFechaDesde,
        fecha_hasta: informeFechaHasta
      });
      
      await api.download(
        `/api/rrhh/fichajes/informe/excel?${params}`,
        `control_horario_${informeFechaDesde}_${informeFechaHasta}.xlsx`
      );
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Error al exportar el informe');
    }
  };
  
  const handleExportInformePdf = async () => {
    if (!informeEmpleadoId || !informeFechaDesde || !informeFechaHasta) return;
    
    try {
      const params = new URLSearchParams({
        empleado_id: informeEmpleadoId,
        fecha_desde: informeFechaDesde,
        fecha_hasta: informeFechaHasta
      });
      
      await api.download(
        `/api/rrhh/fichajes/informe/pdf?${params}`,
        `control_horario_${informeFechaDesde}_${informeFechaHasta}.pdf`
      );
    } catch (err) {
      console.error('Error exporting:', err);
      alert('Error al generar el informe PDF');
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  return (
    <div>
      {/* Stats del día */}
      {fichajesHoy?.estadisticas && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>
              {fichajesHoy.estadisticas.empleados_fichados}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Fichados Hoy</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>
              {fichajesHoy.estadisticas.pendientes_fichar}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Pendientes</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {fichajesHoy.estadisticas.empleados_activos}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>Total Activos</div>
          </div>
        </div>
      )}
      
      {/* Sección Informe Control Horario */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} style={{ color: 'hsl(var(--primary))' }} />
          Informe de Control Horario
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
          Genera un informe detallado de horas trabajadas por empleado, incluyendo entradas, salidas, ausencias y total de horas.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '200px' }}>
            <label className="form-label">Empleado</label>
            <select
              className="form-select"
              value={informeEmpleadoId}
              onChange={e => setInformeEmpleadoId(e.target.value)}
            >
              <option value="">Seleccionar empleado...</option>
              {empleados.filter(e => e.activo).map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.codigo} - {emp.nombre} {emp.apellidos}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Fecha Desde</label>
            <input
              type="date"
              className="form-input"
              value={informeFechaDesde}
              onChange={e => setInformeFechaDesde(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Fecha Hasta</label>
            <input
              type="date"
              className="form-input"
              value={informeFechaHasta}
              onChange={e => setInformeFechaHasta(e.target.value)}
              style={{ width: '150px' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleExportInformeExcel}
              className="btn btn-secondary"
              disabled={!informeEmpleadoId || !informeFechaDesde || !informeFechaHasta}
              title="Exportar a Excel"
            >
              <FileText size={16} />
              Excel
            </button>
            <button
              onClick={handleExportInformePdf}
              className="btn btn-primary"
              disabled={!informeEmpleadoId || !informeFechaDesde || !informeFechaHasta}
              title="Generar PDF"
            >
              <FileText size={16} />
              PDF
            </button>
          </div>
        </div>
      </div>
      
      {/* Botón Fichar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => setShowFicharModal(true)} className="btn btn-primary">
          <Clock size={18} />
          Registrar Fichaje
        </button>
      </div>
      
      {/* Lista de fichajes del día */}
      <div className="card">
        <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <h3 style={{ fontWeight: '600' }}>Fichajes de Hoy</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Tipo</th>
                <th>Hora</th>
                <th>Método</th>
                <th>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {fichajes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay fichajes registrados hoy
                  </td>
                </tr>
              ) : (
                fichajes.map(f => (
                  <tr key={f._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                        {f.empleado_nombre}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        background: f.tipo === 'entrada' ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                        color: f.tipo === 'entrada' ? 'hsl(142 76% 36%)' : 'hsl(0 84% 60%)'
                      }}>
                        {f.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{f.hora}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {f.metodo_identificacion === 'qr' && <QrCode size={14} />}
                        {f.metodo_identificacion === 'nfc' && <CreditCard size={14} />}
                        {f.metodo_identificacion === 'facial' && <Camera size={14} />}
                        {f.metodo_identificacion === 'manual' && <User size={14} />}
                        {f.metodo_identificacion}
                      </span>
                    </td>
                    <td>{f.ubicacion_nombre || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Fichar */}
      {showFicharModal && (
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
        }} onClick={() => setShowFicharModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ 
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
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
              <h2 style={{ margin: 0 }}>Registrar Fichaje</h2>
              <button onClick={() => setShowFicharModal(false)} className="btn btn-ghost">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Método de fichaje */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                  { id: 'manual', label: 'Manual', icon: User },
                  { id: 'qr', label: 'QR', icon: QrCode },
                  { id: 'nfc', label: 'NFC', icon: CreditCard },
                  { id: 'facial', label: 'Facial', icon: Camera }
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetodoFichaje(m.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        border: metodoFichaje === m.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        background: metodoFichaje === m.id ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={24} />
                      <span style={{ fontSize: '0.75rem' }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {metodoFichaje === 'manual' && (
                <>
                  <div className="form-group">
                    <label>Empleado</label>
                    <select
                      className="form-select"
                      value={empleadoSeleccionado}
                      onChange={e => setEmpleadoSeleccionado(e.target.value)}
                    >
                      <option value="">Seleccionar empleado...</option>
                      {empleados.filter(e => e.activo).map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.codigo} - {emp.nombre} {emp.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Tipo</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleFicharManual}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={!empleadoSeleccionado}
                  >
                    Registrar Fichaje
                  </button>
                </>
              )}
              
              {metodoFichaje === 'qr' && (
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Tipo de Fichaje</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                  
                  {!scannerActive && !scanResult && (
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setScannerActive(true)}
                        className="btn btn-primary"
                        style={{ padding: '1rem 2rem' }}
                      >
                        <QrCode size={24} />
                        Activar Cámara para Escanear QR
                      </button>
                    </div>
                  )}
                  
                  {scannerActive && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ 
                        width: '100%', 
                        maxWidth: '300px', 
                        margin: '0 auto',
                        borderRadius: '0.5rem',
                        overflow: 'hidden',
                        border: '2px solid hsl(var(--primary))'
                      }}>
                        <QrReader
                          onResult={handleQRScan}
                          constraints={{ facingMode: 'environment' }}
                          scanDelay={500}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                        Apunte al código QR del empleado
                      </p>
                      <button
                        onClick={() => setScannerActive(false)}
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: '1rem' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  
                  {scanError && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1rem', 
                      background: 'hsl(0 84% 60% / 0.1)', 
                      borderRadius: '0.5rem',
                      color: 'hsl(0 84% 60%)',
                      textAlign: 'center'
                    }}>
                      {scanError}
                    </div>
                  )}
                </div>
              )}
              
              {metodoFichaje === 'nfc' && (
                <div>
                  {/* Tipo entrada/salida */}
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Tipo de Fichaje</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>

                  {/* NFC Scan Area */}
                  {nfcSupported && !nfcReading && !fichajeResult && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <button
                        onClick={startNfcScan}
                        className="btn btn-primary"
                        style={{ padding: '1rem 2rem', fontSize: '1rem' }}
                        data-testid="btn-nfc-scan"
                      >
                        <CreditCard size={24} style={{ marginRight: '0.5rem' }} />
                        Activar Lectura NFC
                      </button>
                    </div>
                  )}

                  {nfcReading && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <div style={{ 
                        width: '100px', height: '100px', borderRadius: '50%', 
                        border: '3px solid hsl(var(--primary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}>
                        <CreditCard size={48} style={{ color: 'hsl(var(--primary))' }} />
                      </div>
                      <p style={{ marginTop: '1rem', fontWeight: '600', color: 'hsl(var(--primary))' }}>
                        Esperando tarjeta NFC...
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                        Acerque la tarjeta al dispositivo
                      </p>
                      <button
                        onClick={() => setNfcReading(false)}
                        className="btn btn-secondary"
                        style={{ marginTop: '1rem' }}
                      >
                        Cancelar
                      </button>
                      <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.7; } }`}</style>
                    </div>
                  )}

                  {/* Separator */}
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '1rem', 
                    margin: '1.5rem 0',
                    color: 'hsl(var(--muted-foreground))'
                  }}>
                    <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                    <span style={{ fontSize: '0.8rem' }}>o introducir ID manualmente</span>
                    <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                  </div>

                  {/* Manual NFC ID input */}
                  <div className="form-group">
                    <label>ID de Tarjeta NFC</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Introducir ID de la tarjeta NFC..."
                        value={nfcManualId}
                        onChange={e => setNfcManualId(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleNfcManualSubmit(); }}
                        data-testid="nfc-manual-input"
                      />
                      <button
                        onClick={handleNfcManualSubmit}
                        className="btn btn-primary"
                        disabled={!nfcManualId.trim()}
                        data-testid="btn-nfc-manual-submit"
                      >
                        <Check size={18} />
                        Fichar
                      </button>
                    </div>
                  </div>

                  {!nfcSupported && (
                    <div style={{ 
                      marginTop: '1rem', padding: '0.75rem', 
                      background: 'hsl(38 92% 50% / 0.1)', 
                      borderRadius: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'hsl(38 92% 50%)'
                    }}>
                      Web NFC no disponible en este navegador. Use la entrada manual o un dispositivo Android con Chrome.
                    </div>
                  )}

                  {scanError && (
                    <div style={{ 
                      marginTop: '1rem', padding: '0.75rem', 
                      background: 'hsl(0 84% 60% / 0.1)', 
                      borderRadius: '0.5rem',
                      color: 'hsl(0 84% 60%)',
                      textAlign: 'center'
                    }}>
                      {scanError}
                    </div>
                  )}
                </div>
              )}
              
              {metodoFichaje === 'facial' && (
                <div>
                  <div className="form-group">
                    <label>Empleado</label>
                    <select
                      className="form-select"
                      value={facialEmpleado}
                      onChange={e => setFacialEmpleado(e.target.value)}
                    >
                      <option value="">Seleccionar empleado...</option>
                      {empleados.filter(e => e.activo).map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.codigo} - {emp.nombre} {emp.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Tipo</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setTipoFichaje('entrada')}
                        className={`btn ${tipoFichaje === 'entrada' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Entrada
                      </button>
                      <button
                        onClick={() => setTipoFichaje('salida')}
                        className={`btn ${tipoFichaje === 'salida' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1 }}
                      >
                        Salida
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    {!cameraActive && !capturedPhoto && (
                      <button
                        onClick={startCamera}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={!facialEmpleado}
                      >
                        <Camera size={18} />
                        Activar Cámara
                      </button>
                    )}
                    
                    {cameraActive && (
                      <div>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          style={{ 
                            width: '100%', 
                            maxWidth: '300px',
                            margin: '0 auto',
                            display: 'block',
                            borderRadius: '0.5rem',
                            border: '2px solid hsl(var(--primary))'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button onClick={stopCamera} className="btn btn-secondary" style={{ flex: 1 }}>
                            Cancelar
                          </button>
                          <button onClick={capturePhoto} className="btn btn-primary" style={{ flex: 1 }}>
                            <Camera size={18} />
                            Capturar Foto
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {capturedPhoto && (
                      <div>
                        <img 
                          src={capturedPhoto} 
                          alt="Foto capturada" 
                          style={{ 
                            width: '100%', 
                            maxWidth: '300px',
                            margin: '0 auto',
                            display: 'block',
                            borderRadius: '0.5rem',
                            border: '2px solid hsl(142 76% 36%)'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button 
                            onClick={() => { setCapturedPhoto(null); startCamera(); }} 
                            className="btn btn-secondary" 
                            style={{ flex: 1 }}
                          >
                            Repetir
                          </button>
                          <button 
                            onClick={handleFichaFacial} 
                            className="btn btn-primary" 
                            style={{ flex: 1 }}
                          >
                            <Check size={18} />
                            Confirmar Fichaje
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                  </div>
                </div>
              )}
              
              {/* Resultado del fichaje */}
              {fichajeResult && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: fichajeResult.success ? 'hsl(142 76% 36% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                  textAlign: 'center'
                }}>
                  {fichajeResult.success ? (
                    <>
                      <Check size={32} style={{ color: 'hsl(142 76% 36%)', margin: '0 auto' }} />
                      <div style={{ marginTop: '0.5rem', fontWeight: '600', color: 'hsl(142 76% 36%)' }}>
                        ¡Fichaje Registrado!
                      </div>
                      {fichajeResult.data && (
                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {fichajeResult.data.empleado_nombre} - {fichajeResult.data.tipo}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <X size={32} style={{ color: 'hsl(0 84% 60%)', margin: '0 auto' }} />
                      <div style={{ marginTop: '0.5rem', fontWeight: '600', color: 'hsl(0 84% 60%)' }}>
                        Error
                      </div>
                      <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {fichajeResult.error}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlHorarioTab;
