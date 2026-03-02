import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PlusCircle, MinusCircle, Package, Printer, Check, Download, AlertTriangle } from 'lucide-react';
import { usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const AlbaranForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // ID del albarán si estamos editando
  const isEditing = !!id;
  
  const { token } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Data for dropdowns
  const [contratos, setContratos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [articulosCatalogo, setArticulosCatalogo] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    tipo: 'Albarán de compra',
    fecha: new Date().toISOString().split('T')[0],
    contrato_id: '',
    proveedor: '',
    cliente: '',
    cultivo: '',
    campana: '',
    parcela_id: '',
    parcela_codigo: '',
    usar_otro_proveedor: false,
    proveedor_contrato: '',
    cliente_contrato: '',
    tipo_contrato: '',
    items: [{
      descripcion: '',
      producto: '',
      lote: '',
      cantidad: '',
      unidad: 'kg',
      precio_unitario: '',
      descuento: 0,
      total: 0,
      articulo_id: ''
    }],
    observaciones: '',
    kilos_brutos: 0,
    kilos_destare: 0,
    kilos_netos: 0
  });

  // Format number for display (Spanish format)
  const formatNumberES = (num) => {
    if (num === null || num === undefined || num === '') return '';
    const n = parseFloat(num);
    if (isNaN(n)) return '';
    return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Parse Spanish number input to float
  const parseSpanishNumber = (str) => {
    if (!str || str === '') return 0;
    const cleaned = str.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Calculate item total
  const calculateItemTotal = (item) => {
    const cantidad = parseFloat(item.cantidad) || 0;
    const precio = parseFloat(item.precio_unitario) || 0;
    const descuento = parseFloat(item.descuento) || 0;
    const subtotal = cantidad * precio;
    return subtotal * (1 - descuento / 100);
  };

  // Calculate grand total (sum of all lines including negative destare)
  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + calculateItemTotal(item);
    }, 0);
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load essential data - don't fail if optional endpoints don't exist
        const [contratosRes, proveedoresRes, clientesRes, parcelasRes] = await Promise.all([
          api.get('/api/contratos?limit=500'),
          api.get('/api/proveedores?limit=500'),
          api.get('/api/clientes?limit=500'),
          api.get('/api/parcelas?limit=500')
        ]);
        
        setContratos(contratosRes.contratos || contratosRes || []);
        setProveedores(proveedoresRes.proveedores || proveedoresRes || []);
        setClientes(clientesRes.clientes || clientesRes || []);
        setParcelas(parcelasRes.parcelas || parcelasRes || []);
        
        // Try to load articulos catalog (optional)
        try {
          const articulosRes = await api.get('/api/articulos-explotacion?limit=500');
          setArticulosCatalogo(articulosRes.articulos || articulosRes || []);
        } catch (e) {
          console.log('Articulos catalog not available');
          setArticulosCatalogo([]);
        }
        
        // If editing, load albaran data
        if (isEditing) {
          const albaran = await api.get(`/api/albaranes/${id}`);
          if (albaran) {
            const contrato = (contratosRes.contratos || contratosRes || []).find(c => c._id === albaran.contrato_id);
            setSelectedContrato(contrato);
            
            setFormData({
              tipo: albaran.tipo || 'Albarán de compra',
              fecha: albaran.fecha || new Date().toISOString().split('T')[0],
              contrato_id: albaran.contrato_id || '',
              proveedor: albaran.proveedor || '',
              cliente: albaran.cliente || '',
              cultivo: albaran.cultivo || '',
              campana: albaran.campana || '',
              parcela_id: albaran.parcela_id || '',
              parcela_codigo: albaran.parcela_codigo || '',
              usar_otro_proveedor: false,
              proveedor_contrato: contrato?.proveedor || '',
              cliente_contrato: contrato?.cliente || '',
              tipo_contrato: contrato?.tipo || '',
              items: albaran.items || [{
                descripcion: '',
                producto: '',
                lote: '',
                cantidad: '',
                unidad: 'kg',
                precio_unitario: '',
                descuento: 0,
                total: 0
              }],
              observaciones: albaran.observaciones || '',
              kilos_brutos: albaran.kilos_brutos || 0,
              kilos_destare: albaran.kilos_destare || 0,
              kilos_netos: albaran.kilos_netos || 0
            });
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, isEditing]);

  // Auto-calculate destare when items change
  useEffect(() => {
    if (!selectedContrato || !selectedContrato.descuento_destare) return;
    
    const itemsSinDestare = formData.items.filter(item => !item.es_destare);
    const kilosBrutos = itemsSinDestare.reduce((sum, item) => {
      const unidad = (item.unidad || 'kg').toLowerCase();
      if (unidad === 'kg') {
        return sum + (parseFloat(item.cantidad) || 0);
      }
      return sum;
    }, 0);

    if (kilosBrutos <= 0) return;

    const descuentoPorcentaje = parseFloat(selectedContrato.descuento_destare) || 0;
    const kilosDestare = Math.round(kilosBrutos * (descuentoPorcentaje / 100) * 100) / 100;
    const kilosNetos = Math.round((kilosBrutos - kilosDestare) * 100) / 100;
    
    const primeraLinea = itemsSinDestare.find(item => (item.unidad || 'kg').toLowerCase() === 'kg');
    const precioUnitario = primeraLinea?.precio_unitario || selectedContrato?.precio || 0;
    const importeDestare = -Math.abs(kilosDestare * precioUnitario);
    
    const lineaDestare = {
      descripcion: `Descuento Destare (${descuentoPorcentaje}%)`,
      producto: 'DESTARE',
      cantidad: -Math.abs(kilosDestare),
      unidad: 'kg',
      precio_unitario: precioUnitario,
      descuento: 0,
      total: importeDestare,
      es_destare: true
    };

    const yaExisteDestare = formData.items.some(item => item.es_destare);
    
    if (yaExisteDestare) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => item.es_destare ? lineaDestare : item),
        kilos_brutos: kilosBrutos,
        kilos_destare: kilosDestare,
        kilos_netos: kilosNetos
      }));
    } else if (kilosDestare > 0) {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, lineaDestare],
        kilos_brutos: kilosBrutos,
        kilos_destare: kilosDestare,
        kilos_netos: kilosNetos
      }));
    }
  }, [formData.items.filter(i => !i.es_destare).map(i => `${i.cantidad}-${i.precio_unitario}`).join(','), selectedContrato]);

  // Handle contrato selection
  const handleContratoChange = (contratoId) => {
    const contrato = contratos.find(c => c._id === contratoId);
    setSelectedContrato(contrato);
    
    if (contrato) {
      const parcelasContrato = parcelas.filter(p => 
        contrato.parcelas?.includes(p._id) || 
        contrato.parcela_id === p._id ||
        p.contrato_id === contrato._id
      );
      
      setFormData(prev => ({
        ...prev,
        contrato_id: contratoId,
        proveedor: contrato.tipo === 'Compra' ? (contrato.proveedor || '') : prev.proveedor,
        cliente: contrato.tipo === 'Venta' ? (contrato.cliente || '') : prev.cliente,
        cultivo: contrato.cultivo || '',
        campana: contrato.campana || '',
        proveedor_contrato: contrato.proveedor || '',
        cliente_contrato: contrato.cliente || '',
        tipo_contrato: contrato.tipo || '',
        parcela_id: parcelasContrato.length === 1 ? parcelasContrato[0]._id : '',
        parcela_codigo: parcelasContrato.length === 1 ? (parcelasContrato[0].codigo_plantacion || parcelasContrato[0].finca || '') : '',
        items: [{
          descripcion: contrato.cultivo || '',
          producto: contrato.cultivo || '',
          lote: '',
          cantidad: '',
          unidad: 'kg',
          precio_unitario: contrato.precio || '',
          descuento: 0,
          total: 0
        }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        contrato_id: '',
        cultivo: '',
        campana: '',
        parcela_id: '',
        parcela_codigo: ''
      }));
    }
  };

  // Update item
  const updateItemTotal = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      const cantidad = parseFloat(newItems[index].cantidad) || 0;
      const precio = parseFloat(newItems[index].precio_unitario) || 0;
      const descuento = parseFloat(newItems[index].descuento) || 0;
      newItems[index].total = cantidad * precio * (1 - descuento / 100);
      
      return { ...prev, items: newItems };
    });
  };

  // Add item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        descripcion: '',
        producto: '',
        lote: '',
        cantidad: '',
        unidad: 'kg',
        precio_unitario: selectedContrato?.precio || '',
        descuento: 0,
        total: 0
      }]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Handle articulo selection from catalog
  const handleArticuloSelect = (index, articuloId) => {
    const articulo = articulosCatalogo.find(a => a._id === articuloId);
    if (articulo) {
      setFormData(prev => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          articulo_id: articuloId,
          descripcion: articulo.nombre,
          producto: articulo.codigo,
          precio_unitario: articulo.precio_unitario || '',
          unidad: articulo.unidad_medida || 'kg'
        };
        return { ...prev, items: newItems };
      });
    }
  };

  // Download PDF
  const downloadPdf = async () => {
    if (!id) return;
    setPdfLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/albaranes/${id}/pdf`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error al generar PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Error al generar el PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // Save albaran
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const itemsSinDestare = formData.items.filter(item => !item.es_destare);
      
      const payload = {
        ...formData,
        items: itemsSinDestare.map(item => ({
          ...item,
          cantidad: parseFloat(item.cantidad) || 0,
          precio_unitario: parseFloat(item.precio_unitario) || 0,
          descuento: parseFloat(item.descuento) || 0,
          total: parseFloat(item.total) || 0
        })),
        total_albaran: calculateGrandTotal()
      };
      
      delete payload.usar_otro_proveedor;
      delete payload.proveedor_contrato;
      delete payload.cliente_contrato;
      delete payload.tipo_contrato;
      
      let response;
      if (isEditing) {
        response = await api.put(`/api/albaranes/${id}`, payload);
        setSuccessMessage('Albarán actualizado correctamente');
      } else {
        response = await api.post('/api/albaranes', payload);
        const nuevoId = response?.data?._id || response?._id;
        if (nuevoId) {
          setSuccessMessage('Albarán creado correctamente');
          // Navigate to edit mode with new ID
          navigate(`/albaranes/editar/${nuevoId}`, { replace: true });
          return;
        }
      }
      
      // Reload data
      if (isEditing) {
        const updatedAlbaran = await api.get(`/api/albaranes/${id}`);
        if (updatedAlbaran) {
          setFormData(prev => ({
            ...prev,
            items: updatedAlbaran.items || prev.items,
            kilos_brutos: updatedAlbaran.kilos_brutos,
            kilos_destare: updatedAlbaran.kilos_destare,
            kilos_netos: updatedAlbaran.kilos_netos
          }));
        }
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error saving albaran:', error);
      setError(handlePermissionError(error, isEditing ? 'actualizar' : 'crear'));
    } finally {
      setSaving(false);
    }
  };

  // Get parcelas for selected contrato
  const parcelasDelContrato = selectedContrato 
    ? parcelas.filter(p => 
        selectedContrato.parcelas?.includes(p._id) || 
        selectedContrato.parcela_id === p._id ||
        p.contrato_id === selectedContrato._id
      )
    : [];

  if (loading) {
    return (
      <div className="page-container" data-testid="albaran-form-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="albaran-form-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-outline"
            onClick={() => navigate('/albaranes')}
            data-testid="btn-volver"
          >
            <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
            Volver
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              {isEditing ? 'Editar Albarán' : 'Nuevo Albarán'}
            </h1>
            {isEditing && (
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                ID: {id.slice(-8).toUpperCase()}
              </p>
            )}
          </div>
        </div>
        
        {isEditing && (
          <button
            className="btn btn-secondary"
            onClick={downloadPdf}
            disabled={pdfLoading}
            data-testid="btn-imprimir-header"
          >
            {pdfLoading ? (
              <Download size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
            ) : (
              <Printer size={16} style={{ marginRight: '0.5rem' }} />
            )}
            {pdfLoading ? 'Generando...' : 'Imprimir PDF'}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error mb-4" data-testid="error-message">
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto' }}>×</button>
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success mb-4" data-testid="success-message">
          {successMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Sección 1: Tipo y Fecha */}
        <div className="card mb-4">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            1. Datos Generales
          </h3>
          
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Tipo de Albarán *</label>
              <select 
                className="form-select" 
                value={formData.tipo} 
                onChange={(e) => setFormData({...formData, tipo: e.target.value, contrato_id: '', proveedor: '', cliente: ''})} 
                required 
                data-testid="select-tipo"
              >
                <option value="Albarán de compra">Albarán de compra</option>
                <option value="Albarán de venta">Albarán de venta</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input 
                type="date" 
                className="form-input" 
                value={formData.fecha} 
                onChange={(e) => setFormData({...formData, fecha: e.target.value})} 
                required 
                data-testid="input-fecha" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Total Albarán</label>
              <input 
                type="text" 
                className="form-input" 
                value={`${calculateGrandTotal().toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} 
                disabled
                style={{ backgroundColor: '#f0fdf4', fontWeight: '600', color: '#166534' }}
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Proveedor/Cliente y Contrato */}
        <div className="card mb-4">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            2. {formData.tipo === 'Albarán de venta' ? 'Cliente' : 'Proveedor'} y Contrato
          </h3>
          
          <div className="grid-2 mb-4">
            {formData.tipo === 'Albarán de venta' ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cliente *</label>
                <select
                  className="form-select"
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value, contrato_id: ''})}
                  required
                  data-testid="select-cliente-albaran"
                >
                  <option value="">-- Seleccionar cliente --</option>
                  {clientes.map(c => (
                    <option key={c._id} value={c.nombre}>
                      {c.nombre} {c.nif ? `(${c.nif})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Proveedor *</label>
                <select
                  className="form-select"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({...formData, proveedor: e.target.value, contrato_id: ''})}
                  required
                  data-testid="select-proveedor-albaran"
                >
                  <option value="">-- Seleccionar proveedor --</option>
                  {proveedores.map(p => (
                    <option key={p._id} value={p.nombre || p.razon_social}>
                      {p.nombre || p.razon_social} {p.cif_nif ? `(${p.cif_nif})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contrato (Opcional)</label>
              <select
                className="form-select"
                value={formData.contrato_id}
                onChange={(e) => handleContratoChange(e.target.value)}
                data-testid="select-contrato"
              >
                <option value="">-- Sin contrato vinculado --</option>
                {contratos
                  .filter(c => {
                    // Filtrar por tipo de albarán
                    const tipoMatch = formData.tipo === 'Albarán de venta' ? c.tipo === 'Venta' : c.tipo === 'Compra';
                    // Filtrar por proveedor/cliente si está seleccionado
                    const proveedorMatch = !formData.proveedor || c.proveedor === formData.proveedor;
                    const clienteMatch = !formData.cliente || c.cliente === formData.cliente;
                    return tipoMatch && (formData.tipo === 'Albarán de venta' ? clienteMatch : proveedorMatch);
                  })
                  .map(c => (
                    <option key={c._id} value={c._id}>
                      {c.numero || c._id.slice(-6)} | {c.cultivo} | {c.campana}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          
          {/* Datos del contrato seleccionado */}
          {selectedContrato && (
            <div style={{ 
              backgroundColor: 'hsl(var(--primary) / 0.05)', 
              border: '1px solid hsl(var(--primary) / 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '0.5rem'
            }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>
                Datos del Contrato Vinculado
              </h4>
              <div className="grid-4">
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    {formData.tipo === 'Albarán de venta' ? 'Cliente' : 'Proveedor'}
                  </span>
                  <p style={{ fontWeight: '500' }}>{selectedContrato.proveedor || selectedContrato.cliente || '-'}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Cultivo</span>
                  <p style={{ fontWeight: '500' }}>{selectedContrato.cultivo || '-'}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Parcela</span>
                  {parcelasDelContrato.length > 1 ? (
                    <select
                      className="form-select"
                      value={formData.parcela_codigo}
                      onChange={(e) => {
                        const parcela = parcelasDelContrato.find(p => 
                          (p.codigo_plantacion || p.finca || p._id) === e.target.value
                        );
                        setFormData(prev => ({
                          ...prev,
                          parcela_codigo: e.target.value,
                          parcela_id: parcela?._id || ''
                        }));
                      }}
                      style={{ marginTop: '0.25rem' }}
                      data-testid="select-parcela"
                    >
                      <option value="">-- Seleccionar parcela --</option>
                      {parcelasDelContrato.map(p => (
                        <option key={p._id} value={p.codigo_plantacion || p.finca || p._id}>
                          {p.codigo_plantacion || p.finca || `Parcela ${p._id?.slice(-6)}`}
                          {p.cultivo ? ` - ${p.cultivo}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={{ fontWeight: '500' }}>{formData.parcela_codigo || '-'}</p>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Campaña</span>
                  <p style={{ fontWeight: '500' }}>{formData.campana || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sección 3: Líneas del Albarán */}
        <div className="card mb-4">
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
            3. Líneas del Albarán
          </h3>
            
            <div className="table-container" style={{ marginTop: '0.5rem' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: '250px' }}>Artículo / Descripción</th>
                    <th style={{ width: '120px' }}>Cantidad</th>
                    <th style={{ width: '80px' }}>Unidad</th>
                    <th style={{ width: '100px' }}>Precio Unit.</th>
                    <th style={{ width: '80px' }}>Dto %</th>
                    <th style={{ width: '120px' }}>Total</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index} style={item.es_destare ? { backgroundColor: '#fef2f2' } : {}}>
                      <td>
                        {item.es_destare ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                            <AlertTriangle size={16} />
                            <span style={{ fontWeight: '500' }}>{item.descripcion}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={item.descripcion}
                              onChange={(e) => updateItemTotal(index, 'descripcion', e.target.value)}
                              placeholder="Descripción del artículo..."
                              style={{ fontSize: '0.875rem', fontWeight: '500' }}
                              data-testid={`item-descripcion-${index}`}
                            />
                            {articulosCatalogo.length > 0 && (
                              <select
                                className="form-select"
                                value={item.articulo_id || ''}
                                onChange={(e) => handleArticuloSelect(index, e.target.value)}
                                style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}
                                data-testid={`item-articulo-${index}`}
                              >
                                <option value="">-- Seleccionar del catálogo --</option>
                                {articulosCatalogo.map(art => (
                                  <option key={art._id} value={art._id}>
                                    {art.codigo} - {art.nombre} ({art.precio_unitario?.toFixed(2) || '0.00'} €/{art.unidad_medida})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {item.es_destare ? (
                          <input
                            type="text"
                            className="form-input"
                            value={formatNumberES(item.cantidad)}
                            readOnly
                            style={{ textAlign: 'right', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '500' }}
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-input"
                            value={formatNumberES(item.cantidad)}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/[^\d.,]/g, '');
                              const numValue = parseSpanishNumber(rawValue);
                              updateItemTotal(index, 'cantidad', numValue || rawValue);
                            }}
                            placeholder="0"
                            style={{ textAlign: 'right' }}
                            data-testid={`item-cantidad-${index}`}
                          />
                        )}
                      </td>
                      <td>
                        {item.es_destare ? (
                          <span style={{ color: '#dc2626' }}>kg</span>
                        ) : (
                          <select
                            className="form-select"
                            value={item.unidad}
                            onChange={(e) => updateItemTotal(index, 'unidad', e.target.value)}
                            data-testid={`item-unidad-${index}`}
                          >
                            <option value="kg">kg</option>
                            <option value="ud">ud</option>
                            <option value="l">l</option>
                            <option value="m">m</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {item.es_destare ? (
                          <input
                            type="text"
                            className="form-input"
                            value={`${(item.precio_unitario || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                            readOnly
                            style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            value={item.precio_unitario}
                            onChange={(e) => updateItemTotal(index, 'precio_unitario', e.target.value)}
                            placeholder="0.00"
                            data-testid={`item-precio-${index}`}
                          />
                        )}
                      </td>
                      <td>
                        {item.es_destare ? (
                          <input
                            type="text"
                            className="form-input"
                            value="-"
                            disabled
                            style={{ textAlign: 'center', backgroundColor: '#fef2f2', color: '#9ca3af' }}
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="form-input"
                            value={item.descuento || ''}
                            onChange={(e) => updateItemTotal(index, 'descuento', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            style={{ textAlign: 'center' }}
                            data-testid={`item-dto-${index}`}
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          value={`${calculateItemTotal(item).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                          disabled
                          style={{ 
                            textAlign: 'right', 
                            fontWeight: '500',
                            backgroundColor: item.es_destare ? '#fef2f2' : '#f5f5f5',
                            color: item.es_destare ? '#dc2626' : 'inherit'
                          }}
                        />
                      </td>
                      <td>
                        {!item.es_destare && formData.items.filter(i => !i.es_destare).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '0.25rem' }}
                          >
                            <MinusCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Resumen de Cálculo */}
            {formData.kilos_destare > 0 && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1rem'
              }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>
                  Resumen de Cálculo
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Kilos Brutos</span>
                    <p style={{ fontWeight: '600', margin: '0.25rem 0 0 0' }}>
                      {formatNumberES(formData.kilos_brutos)} kg
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Kilos Destare</span>
                    <p style={{ fontWeight: '600', margin: '0.25rem 0 0 0', color: '#dc2626' }}>
                      - {formatNumberES(formData.kilos_destare)} kg
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>Kilos Netos</span>
                    <p style={{ fontWeight: '700', margin: '0.25rem 0 0 0', color: '#166534' }}>
                      {formatNumberES(formData.kilos_netos)} kg
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Precio</span>
                    <p style={{ fontWeight: '600', margin: '0.25rem 0 0 0' }}>
                      {(() => {
                        const itemsSinDestare = formData.items.filter(item => !item.es_destare);
                        const precio = itemsSinDestare[0]?.precio_unitario || 0;
                        return `${parseFloat(precio).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/kg`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Dto %</span>
                    <p style={{ fontWeight: '600', margin: '0.25rem 0 0 0', color: '#f59e0b' }}>
                      {(() => {
                        const itemsSinDestare = formData.items.filter(item => !item.es_destare);
                        const dto = itemsSinDestare[0]?.descuento || 0;
                        return `${dto} %`;
                      })()}
                    </p>
                  </div>
                  <div style={{ borderLeft: '2px solid #86efac', paddingLeft: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#166534' }}>Total Albarán</span>
                    <p style={{ fontWeight: '700', margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#166534' }}>
                      {calculateGrandTotal().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </p>
                    <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>(Líneas - Destare)</span>
                  </div>
                </div>
              </div>
            )}
            
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={addItem}
              style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <PlusCircle size={16} /> Añadir Línea
            </button>
          
          {/* Observaciones */}
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Observaciones</label>
            <textarea 
              className="form-textarea" 
              rows="2" 
              value={formData.observaciones} 
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})} 
              placeholder="Notas adicionales..." 
              data-testid="textarea-observaciones" 
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            data-testid="btn-guardar"
          >
            {saving ? (
              <>
                <Download size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                Guardando...
              </>
            ) : (
              <>
                <Check size={16} style={{ marginRight: '0.5rem' }} />
                {isEditing ? 'Actualizar Albarán' : 'Guardar Albarán'}
              </>
            )}
          </button>
          
          {isEditing && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={downloadPdf}
              disabled={pdfLoading}
              data-testid="btn-imprimir"
            >
              {pdfLoading ? (
                <Download size={16} className="animate-spin" style={{ marginRight: '0.5rem' }} />
              ) : (
                <Printer size={16} style={{ marginRight: '0.5rem' }} />
              )}
              {pdfLoading ? 'Generando...' : 'Imprimir'}
            </button>
          )}
          
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/albaranes')}
            data-testid="btn-cancelar"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AlbaranForm;
