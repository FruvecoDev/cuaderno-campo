import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Settings, X, FileSpreadsheet, FileText, Download, TrendingUp, TrendingDown, ArrowUpDown, Printer } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';


// Configuración de campos visibles en tabla
const DEFAULT_FIELDS_CONFIG = {
  numero: true,
  tipo: true,
  fecha: true,
  contrato: true,
  proveedor: true,
  cultivo: true,
  parcela: true,
  items: true,
  total: true,
  observaciones: false
};

const FIELD_LABELS = {
  numero: 'Nº Albarán',
  tipo: 'Tipo',
  fecha: 'Fecha',
  contrato: 'Contrato',
  proveedor: 'Proveedor',
  cultivo: 'Cultivo',
  parcela: 'Parcela',
  items: 'Líneas',
  total: 'Total',
  observaciones: 'Observaciones'
};

const Albaranes = () => {
  const navigate = useNavigate();
  const [albaranes, setAlbaranes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { token, canDoOperacion } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();
  
  // Stats
  const [stats, setStats] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null); // ID del albarán que está cargando
  
  // Función para descargar PDF con autenticación
  const downloadPdf = async (albaranId) => {
    setPdfLoading(albaranId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/albaranes/${albaranId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Limpiar URL después de un momento
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Error al generar el PDF del albarán');
    } finally {
      setPdfLoading(null);
    }
  };
  
  // Permisos de operación
  const puedeCompra = canDoOperacion('compra');
  const puedeVenta = canDoOperacion('venta');
  
  // Funciones de formateo para números (formato español)
  const formatNumberES = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const num = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return value;
    return num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  
  const parseNumberES = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    // Eliminar puntos de miles y convertir coma decimal a punto
    const cleaned = String(value).replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };
  
  // Contrato seleccionado y datos heredados
  const [selectedContrato, setSelectedContrato] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    tipo: '',
    contrato_id: '',
    proveedor: '',
    cultivo: '',
    fecha_desde: '',
    fecha_hasta: ''
  });
  
  // Filtros para buscar contratos en el formulario
  const [contratoSearch, setContratoSearch] = useState({
    proveedor: '',
    cultivo: '',
    campana: '',
    parcela: ''
  });
  
  // Opciones para filtros de contratos (extraídos de los contratos)
  const [contratoOptions, setContratoOptions] = useState({
    proveedores: [],
    cultivos: [],
    campanas: [],
    parcelas: []
  });
  
  // Configuración de campos
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [fieldsConfig, setFieldsConfig] = useState(() => {
    const saved = localStorage.getItem('albaranes_fields_config_v2');
    return saved ? JSON.parse(saved) : DEFAULT_FIELDS_CONFIG;
  });
  
  // Opciones de filtros
  const [filterOptions, setFilterOptions] = useState({
    proveedores: [],
    cultivos: []
  });
  
  // Lista de proveedores para selector alternativo
  const [proveedores, setProveedores] = useState([]);
  
  // Lista de parcelas para selector
  const [parcelas, setParcelas] = useState([]);
  
  // Catálogo de artículos de explotación
  const [articulosCatalogo, setArticulosCatalogo] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    tipo: puedeCompra ? 'Albarán de compra' : 'Albarán de venta',
    fecha: new Date().toISOString().split('T')[0],
    contrato_id: '',
    // Datos heredados del contrato (referencia)
    proveedor_contrato: '',  // Proveedor original del contrato (informativo)
    cliente_contrato: '',    // Cliente original del contrato (para contratos de venta)
    tipo_contrato: '',       // Tipo del contrato (Compra/Venta)
    cultivo: '',
    parcela_codigo: '',
    parcela_id: '',
    campana: '',
    // Proveedor/Cliente del albarán (puede ser diferente al del contrato)
    proveedor: '',  // Este es el proveedor real del albarán
    cliente: '',    // Este es el cliente real del albarán
    usar_otro_proveedor: false,  // Flag para indicar si usa otro proveedor/cliente
    // Líneas del albarán
    items: [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }],
    // Descuento sobre el importe
    descuento_porcentaje: 0,
    descuento_importe: 0,
    observaciones: ''
  });
  
  // Estado para clientes (para albaranes de venta)
  const [clientes, setClientes] = useState([]);
  
  // Flag para evitar múltiples cargas
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Helper para hacer fetch usando XMLHttpRequest (evita interceptores de fetch)
  const xhrFetch = (url) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({ ok: true, data });
          } catch (e) {
            reject(new Error('Error parsing JSON'));
          }
        } else {
          resolve({ ok: false, status: xhr.status });
        }
      };
      xhr.onerror = function() {
        reject(new Error('Network error'));
      };
      xhr.send();
    });
  };
  
  useEffect(() => {
    // Esperar a que el token esté disponible
    if (!token || isInitialized) return;
    
    const loadData = async () => {
      setIsInitialized(true);
      
      try {
        const [albaranes, contratos, proveedoresRes, clientesRes, articulosRes, parcelasRes] = await Promise.all([
          xhrFetch(`${BACKEND_URL}/api/albaranes`),
          xhrFetch(`${BACKEND_URL}/api/contratos`),
          xhrFetch(`${BACKEND_URL}/api/proveedores?limit=500`),
          xhrFetch(`${BACKEND_URL}/api/clientes/activos`),
          xhrFetch(`${BACKEND_URL}/api/articulos/activos`),
          xhrFetch(`${BACKEND_URL}/api/parcelas`)
        ]);
        
        if (albaranes.ok) setAlbaranes(albaranes.data?.albaranes || []);
        if (contratos.ok) setContratos(contratos.data?.contratos || []);
        if (proveedoresRes.ok) setProveedores(proveedoresRes.data?.proveedores || []);
        if (clientesRes.ok) setClientes(clientesRes.data?.clientes || []);
        if (articulosRes.ok) setArticulosCatalogo(articulosRes.data?.articulos || []);
        if (parcelasRes.ok) setParcelas(parcelasRes.data?.parcelas || parcelasRes.data || []);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Error al cargar datos: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, isInitialized]);
  
  // Función para recargar albaranes (después de crear/editar/eliminar)
  const reloadAlbaranes = async () => {
    try {
      const result = await xhrFetch(`${BACKEND_URL}/api/albaranes`);
      if (result.ok) {
        setAlbaranes(result.data?.albaranes || []);
      }
    } catch (error) {
      console.error('Error reloading albaranes:', error);
    }
  };
  
  // Cargar estadísticas
  const fetchStats = async () => {
    try {
      const data = await api.get('/api/albaranes/stats/dashboard');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Exportar a Excel
  const exportToExcel = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.tipo) params.append('tipo', filters.tipo);
      
      const data = await api.get(`/api/albaranes/export/excel?${params}`);
      
      // Crear CSV para descarga
      const headers = data.columns.map(c => c.header).join(',');
      const rows = data.data.map(row => 
        data.columns.map(c => {
          const val = row[c.key];
          // Escapar comas y comillas
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? '';
        }).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      setError('Error al exportar datos');
    } finally {
      setExportLoading(false);
    }
  };
  
  useEffect(() => {
    if (token && isInitialized) {
      fetchStats();
    }
  }, [token, isInitialized, albaranes]);
  
  useEffect(() => {
    // Extraer opciones de filtro de albaranes existentes
    const proveedores = [...new Set(albaranes.map(a => a.proveedor).filter(Boolean))];
    const cultivos = [...new Set(albaranes.map(a => a.cultivo).filter(Boolean))];
    setFilterOptions({ proveedores, cultivos });
  }, [albaranes]);
  
  useEffect(() => {
    // Extraer opciones de filtro de contratos para el buscador del formulario
    // Separar proveedores de contratos de compra y clientes de contratos de venta
    const contratosCompra = contratos.filter(c => (c.tipo || 'Compra') === 'Compra');
    const contratosVenta = contratos.filter(c => c.tipo === 'Venta');
    
    const proveedores = [...new Set(contratosCompra.map(c => c.proveedor).filter(Boolean))].sort();
    const clientesVenta = [...new Set(contratosVenta.map(c => c.cliente).filter(Boolean))].sort();
    const cultivos = [...new Set(contratos.map(c => c.cultivo).filter(Boolean))].sort();
    const campanas = [...new Set(contratos.map(c => c.campana).filter(Boolean))].sort();
    const parcelas = [...new Set(contratos.map(c => c.parcela || c.parcela_codigo).filter(Boolean))].sort();
    setContratoOptions({ proveedores, clientesVenta, cultivos, campanas, parcelas });
  }, [contratos]);
  
  useEffect(() => {
    localStorage.setItem('albaranes_fields_config_v2', JSON.stringify(fieldsConfig));
  }, [fieldsConfig]);
  
  // Cuando se selecciona un contrato, heredar datos
  const handleContratoSelect = (contratoId) => {
    const contrato = contratos.find(c => c._id === contratoId);
    setSelectedContrato(contrato);
    
    if (contrato) {
      const tipoContrato = contrato.tipo || 'Compra';
      const esVenta = tipoContrato === 'Venta';
      const proveedorContrato = contrato.proveedor || '';
      const clienteContrato = contrato.cliente || '';
      const cultivoContrato = contrato.cultivo || '';
      const precioContrato = contrato.precio || 0;
      
      // Buscar parcelas vinculadas a este contrato
      const parcelasDelContrato = parcelas.filter(p => p.contrato_id === contratoId);
      let parcelaCodigo = '';
      let parcelaId = '';
      
      if (parcelasDelContrato.length === 1) {
        // Si hay una sola parcela, asignarla automáticamente
        const parcela = parcelasDelContrato[0];
        parcelaCodigo = parcela.codigo_plantacion || parcela.finca || `Parcela ${parcela._id?.slice(-6)}`;
        parcelaId = parcela._id;
      }
      // Si hay varias o ninguna, se dejará el selector para elegir
      
      // El tipo de albarán se ajusta según el tipo de contrato
      const tipoAlbaran = esVenta ? 'Albarán de venta' : 'Albarán de compra';
      
      // Crear línea inicial con el cultivo del contrato como descripción
      const lineaInicial = {
        descripcion: cultivoContrato,
        cantidad: '',
        unidad: 'kg',
        precio_unitario: precioContrato || '',
        total: 0
      };
      
      setFormData(prev => ({
        ...prev,
        contrato_id: contratoId,
        tipo: tipoAlbaran,
        tipo_contrato: tipoContrato,
        proveedor_contrato: proveedorContrato,
        cliente_contrato: clienteContrato,
        proveedor: esVenta ? '' : proveedorContrato,  // Solo para compras
        cliente: esVenta ? clienteContrato : '',       // Solo para ventas
        usar_otro_proveedor: false,
        cultivo: cultivoContrato,
        parcela_codigo: parcelaCodigo,
        parcela_id: parcelaId,
        campana: contrato.campana || '',
        // Actualizar la primera línea con el cultivo y precio del contrato
        items: [lineaInicial]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        contrato_id: '',
        tipo_contrato: '',
        proveedor_contrato: '',
        cliente_contrato: '',
        proveedor: '',
        cliente: '',
        usar_otro_proveedor: false,
        cultivo: '',
        parcela_codigo: '',
        parcela_id: '',
        campana: '',
        items: [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }]
      }));
    }
  };
  
  // Manejar cambio de checkbox para usar otro proveedor/cliente
  const handleUsarOtroProveedorChange = (checked) => {
    const esVenta = formData.tipo === 'Albarán de venta';
    setFormData(prev => ({
      ...prev,
      usar_otro_proveedor: checked,
      proveedor: esVenta ? '' : (checked ? '' : prev.proveedor_contrato),
      cliente: esVenta ? (checked ? '' : prev.cliente_contrato) : ''
    }));
  };
  
  // Seleccionar artículo del catálogo
  const handleArticuloSelect = (index, articuloId) => {
    const articulo = articulosCatalogo.find(a => a._id === articuloId);
    const newItems = [...formData.items];
    
    if (articulo) {
      newItems[index] = {
        ...newItems[index],
        articulo_id: articulo._id,
        descripcion: `${articulo.codigo} - ${articulo.nombre}`,
        unidad: articulo.unidad_medida?.toLowerCase() || 'kg',
        precio_unitario: articulo.precio_unitario?.toString() || ''
      };
      // Recalcular total si ya hay cantidad
      const cantidad = parseFloat(newItems[index].cantidad) || 0;
      const precio = parseFloat(newItems[index].precio_unitario) || 0;
      newItems[index].total = cantidad * precio;
    } else {
      // Texto libre
      newItems[index] = {
        ...newItems[index],
        articulo_id: null
      };
    }
    
    setFormData({ ...formData, items: newItems });
  };
  
  // Calcular total de líneas
  const updateItemTotal = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Recalcular total cuando cambia cantidad, precio o descuento
    if (field === 'cantidad' || field === 'precio_unitario' || field === 'descuento') {
      const cantidad = parseFloat(newItems[index].cantidad) || 0;
      const precio = parseFloat(newItems[index].precio_unitario) || 0;
      const descuento = parseFloat(newItems[index].descuento) || 0;
      const subtotal = cantidad * precio;
      // Aplicar descuento: total = subtotal - (subtotal * descuento / 100)
      newItems[index].total = subtotal - (subtotal * descuento / 100);
    }
    
    setFormData({ ...formData, items: newItems });
  };
  
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', descuento: 0, total: 0, articulo_id: null }]
    });
  };
  
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };
  
  // Función para calcular el total de una línea individual
  const calculateItemTotal = (item) => {
    const cantidad = parseFloat(item.cantidad) || 0;
    const precio = parseFloat(item.precio_unitario) || 0;
    const descuento = parseFloat(item.descuento) || 0;
    
    // Total línea = cantidad × precio × (1 - descuento/100)
    const subtotal = cantidad * precio;
    return subtotal * (1 - descuento / 100);
  };

  const calculateGrandTotal = () => {
    // Suma de todas las líneas (incluyendo destare con importe negativo)
    // Línea normal: 100.000 kg × 0,23 € = 23.000 €
    // Línea destare: -5.000 kg × 0,23 € = -1.150 €
    // Total: 23.000 - 1.150 = 21.850 €
    return formData.items.reduce((sum, item) => {
      return sum + calculateItemTotal(item);
    }, 0);
  };
  
  // Calcular y mostrar línea de destare automáticamente
  useEffect(() => {
    // Solo calcular si:
    // 1. Hay un contrato seleccionado con descuento_destare
    // 2. Es un albarán de compra
    // 3. No estamos en modo edición con datos del servidor
    const esCompra = formData.tipo === 'Albarán de compra';
    const tieneDestare = selectedContrato && parseFloat(selectedContrato.descuento_destare) > 0;
    const tieneContratoCompra = selectedContrato && (selectedContrato.tipo === 'Compra' || !selectedContrato.tipo);
    
    if (!esCompra || !tieneDestare || !tieneContratoCompra) {
      // Si no aplica destare, eliminar línea de destare si existe
      const itemsSinDestare = formData.items.filter(item => !item.es_destare);
      if (itemsSinDestare.length !== formData.items.length) {
        setFormData(prev => ({
          ...prev,
          items: itemsSinDestare,
          kilos_brutos: 0,
          kilos_destare: 0,
          kilos_netos: 0
        }));
      }
      return;
    }
    
    // Calcular kilos brutos de las líneas (excluyendo destare existente)
    const itemsSinDestare = formData.items.filter(item => !item.es_destare);
    const kilosBrutos = itemsSinDestare.reduce((sum, item) => {
      if ((item.unidad || 'kg').toLowerCase() === 'kg') {
        return sum + (parseFloat(item.cantidad) || 0);
      }
      return sum;
    }, 0);
    
    // Si no hay kilos, no mostrar línea de destare
    if (kilosBrutos <= 0) {
      if (formData.items.some(item => item.es_destare)) {
        setFormData(prev => ({
          ...prev,
          items: itemsSinDestare,
          kilos_brutos: 0,
          kilos_destare: 0,
          kilos_netos: 0
        }));
      }
      return;
    }
    
    // Calcular destare
    const descuentoPorcentaje = parseFloat(selectedContrato.descuento_destare) || 0;
    const kilosDestare = Math.round(kilosBrutos * (descuentoPorcentaje / 100) * 100) / 100;
    const kilosNetos = Math.round((kilosBrutos - kilosDestare) * 100) / 100;
    
    // Obtener el precio unitario de la primera línea (o del contrato)
    const primeraLinea = itemsSinDestare.find(item => (item.unidad || 'kg').toLowerCase() === 'kg');
    const precioUnitario = primeraLinea?.precio_unitario || selectedContrato?.precio || 0;
    
    // Calcular importe de destare (negativo)
    const importeDestare = -Math.abs(kilosDestare * precioUnitario);
    
    // Crear o actualizar línea de destare con kilos y total NEGATIVOS
    const lineaDestare = {
      descripcion: `Descuento Destare (${descuentoPorcentaje}%)`,
      producto: 'DESTARE',
      cantidad: -Math.abs(kilosDestare), // Kilos en negativo
      unidad: 'kg',
      precio_unitario: precioUnitario, // Mismo precio que la línea principal
      descuento: 0,
      total: importeDestare, // Importe en negativo
      es_destare: true
    };
    
    // Verificar si ya existe una línea de destare
    const existeDestare = formData.items.some(item => item.es_destare);
    const destareActual = formData.items.find(item => item.es_destare);
    
    // Solo actualizar si los valores cambiaron
    if (existeDestare && destareActual?.cantidad === kilosDestare) {
      return;
    }
    
    // Actualizar items con la línea de destare
    const nuevosItems = [...itemsSinDestare, lineaDestare];
    
    setFormData(prev => ({
      ...prev,
      items: nuevosItems,
      kilos_brutos: kilosBrutos,
      kilos_destare: kilosDestare,
      kilos_netos: kilosNetos
    }));
    
  }, [formData.items.filter(i => !i.es_destare).map(i => `${i.cantidad}-${i.unidad}`).join(','), selectedContrato?.descuento_destare, formData.tipo]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que se haya seleccionado proveedor o cliente según el tipo
    if (formData.tipo === 'Albarán de compra' && !formData.proveedor) {
      setError('Debe seleccionar un proveedor');
      return;
    }
    
    if (formData.tipo === 'Albarán de venta' && !formData.cliente) {
      setError('Debe seleccionar un cliente');
      return;
    }
    
    try {
      setError(null);
      const url = editingId 
        ? `${BACKEND_URL}/api/albaranes/${editingId}`
        : `${BACKEND_URL}/api/albaranes`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      // Filtrar líneas de destare antes de enviar (el backend las recalcula)
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
      
      // Limpiar campos temporales del frontend
      delete payload.usar_otro_proveedor;
      delete payload.proveedor_contrato;
      delete payload.cliente_contrato;
      delete payload.tipo_contrato;
      
      let response;
      if (editingId) {
        response = await api.put(`/api/albaranes/${editingId}`, payload);
        // Recargar los datos del albarán para mostrar líneas actualizadas (incluyendo destare)
        const updatedAlbaran = await api.get(`/api/albaranes/${editingId}`);
        if (updatedAlbaran) {
          // Actualizar formData con los items del servidor (incluyendo destare)
          setFormData(prev => ({
            ...prev,
            items: updatedAlbaran.items || prev.items,
            total_albaran: updatedAlbaran.total_albaran || prev.total_albaran,
            kilos_brutos: updatedAlbaran.kilos_brutos,
            kilos_destare: updatedAlbaran.kilos_destare,
            kilos_netos: updatedAlbaran.kilos_netos
          }));
        }
        // Mantener el formulario abierto en modo edición
        setSuccessMessage('Albarán actualizado correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        response = await api.post('/api/albaranes', payload);
        // Obtener el ID del nuevo albarán y mantener el formulario abierto
        // La respuesta de api.post ya es el objeto data directamente
        const nuevoAlbaranId = response?.data?._id || response?._id;
        if (nuevoAlbaranId) {
          // Cambiar a modo edición con el nuevo ID
          setEditingId(nuevoAlbaranId);
          // Recargar los datos del albarán para mostrar líneas actualizadas (incluyendo destare)
          const nuevoAlbaran = await api.get(`/api/albaranes/${nuevoAlbaranId}`);
          if (nuevoAlbaran) {
            setFormData(prev => ({
              ...prev,
              items: nuevoAlbaran.items || prev.items,
              total_albaran: nuevoAlbaran.total_albaran || prev.total_albaran,
              kilos_brutos: nuevoAlbaran.kilos_brutos,
              kilos_destare: nuevoAlbaran.kilos_destare,
              kilos_netos: nuevoAlbaran.kilos_netos
            }));
          }
          setSuccessMessage('Albarán creado correctamente. Puede imprimirlo o salir.');
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      }
      
      reloadAlbaranes();
    } catch (error) {
      console.error('Error saving albaran:', error);
      const errorMsg = handlePermissionError(error, editingId ? 'actualizar el albarán' : 'crear el albarán');
      setError(errorMsg);
    }
  };
  
  const handleEdit = (albaran) => {
    setEditingId(albaran._id);
    
    // Buscar el contrato para establecer selectedContrato
    const contrato = contratos.find(c => c._id === albaran.contrato_id);
    setSelectedContrato(contrato);
    
    // Determinar si usa otro proveedor (diferente al del contrato)
    const proveedorContrato = contrato?.proveedor || '';
    const usarOtroProveedor = albaran.proveedor && albaran.proveedor !== proveedorContrato;
    
    setFormData({
      tipo: albaran.tipo || 'Albarán de compra',
      fecha: albaran.fecha || '',
      contrato_id: albaran.contrato_id || '',
      proveedor_contrato: proveedorContrato,
      proveedor: albaran.proveedor || proveedorContrato,
      usar_otro_proveedor: usarOtroProveedor,
      cultivo: albaran.cultivo || '',
      parcela_codigo: albaran.parcela_codigo || '',
      parcela_id: albaran.parcela_id || '',
      campana: albaran.campana || '',
      items: albaran.items?.length > 0 
        ? albaran.items 
        : [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }],
      observaciones: albaran.observaciones || '',
      // Datos de kilos (para el cálculo del destare)
      kilos_brutos: albaran.kilos_brutos || 0,
      kilos_destare: albaran.kilos_destare || 0,
      kilos_netos: albaran.kilos_netos || 0,
      total_albaran: albaran.total_albaran || 0,
      // Descuento sobre importe
      descuento_porcentaje: albaran.descuento_porcentaje || 0,
      descuento_importe: albaran.descuento_importe || 0
    });
    setShowForm(true);
  };
  
  const handleDelete = async (albaranId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar albaranes');
      return;
    }
    
    if (!window.confirm('¿Estás seguro de que quieres eliminar este albarán?')) {
      return;
    }
    
    try {
      await api.delete(`/api/albaranes/${albaranId}`);
      reloadAlbaranes();
    } catch (error) {
      console.error('Error deleting albaran:', error);
      const errorMsg = handlePermissionError(error, 'eliminar el albarán');
      setError(errorMsg);
    }
  };
  
  const resetForm = () => {
    setSelectedContrato(null);
    setContratoSearch({ proveedor: '', cultivo: '', campana: '', parcela: '' });
    setFormData({
      tipo: 'Albarán de compra',
      fecha: new Date().toISOString().split('T')[0],
      contrato_id: '',
      proveedor_contrato: '',
      proveedor: '',
      usar_otro_proveedor: false,
      cultivo: '',
      parcela_codigo: '',
      parcela_id: '',
      campana: '',
      items: [{ descripcion: '', cantidad: '', unidad: 'kg', precio_unitario: '', total: 0 }],
      observaciones: ''
    });
  };
  
  const clearFilters = () => {
    setFilters({ tipo: '', contrato_id: '', proveedor: '', cultivo: '', fecha_desde: '', fecha_hasta: '' });
  };
  
  const clearContratoSearch = () => {
    setContratoSearch({ proveedor: '', cultivo: '', campana: '', parcela: '' });
  };
  
  const toggleFieldConfig = (field) => {
    setFieldsConfig(prev => ({ ...prev, [field]: !prev[field] }));
  };
  
  // Filtrar contratos para el selector según búsqueda Y tipo de albarán
  const filteredContratos = contratos.filter(c => {
    // Determinar el tipo de contrato (por defecto 'Compra' si no está definido)
    const tipoContrato = c.tipo || 'Compra';
    
    // Filtrar por tipo de contrato según tipo de albarán seleccionado
    if (formData.tipo === 'Albarán de venta') {
      // Solo mostrar contratos de Venta para albaranes de venta
      if (tipoContrato !== 'Venta') return false;
    } else {
      // Solo mostrar contratos de Compra para albaranes de compra
      if (tipoContrato !== 'Compra') return false;
    }
    
    // Filtros de búsqueda
    if (contratoSearch.proveedor) {
      // Buscar en proveedor o cliente según el tipo de contrato
      if (tipoContrato === 'Venta') {
        // Para contratos de venta, buscar por cliente
        if (!c.cliente || c.cliente !== contratoSearch.proveedor) return false;
      } else {
        // Para contratos de compra, buscar por proveedor
        if (!c.proveedor || c.proveedor !== contratoSearch.proveedor) return false;
      }
    }
    if (contratoSearch.cultivo && c.cultivo !== contratoSearch.cultivo) return false;
    if (contratoSearch.campana && c.campana !== contratoSearch.campana) return false;
    if (contratoSearch.parcela && (c.parcela || c.parcela_codigo) !== contratoSearch.parcela) return false;
    return true;
  });
  
  const hasContratoSearchActive = contratoSearch.proveedor || contratoSearch.cultivo || contratoSearch.campana || contratoSearch.parcela;
  
  // Filtrar albaranes
  const filteredAlbaranes = albaranes.filter(a => {
    if (filters.tipo && a.tipo !== filters.tipo) return false;
    if (filters.contrato_id && a.contrato_id !== filters.contrato_id) return false;
    if (filters.proveedor && a.proveedor !== filters.proveedor) return false;
    if (filters.cultivo && a.cultivo !== filters.cultivo) return false;
    return true;
  });
  
  const hasActiveFilters = filters.tipo || filters.contrato_id || filters.proveedor || filters.cultivo;

  return (
    <div data-testid="albaranes-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={28} />
            Albaranes
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
            Gestión de albaranes de entrada y salida por contrato
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${showFieldsConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFieldsConfig(!showFieldsConfig)}
            title="Configurar columnas"
          >
            <Settings size={18} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={exportToExcel}
            disabled={exportLoading || albaranes.length === 0}
            title="Exportar a Excel"
            data-testid="btn-export-excel"
          >
            {exportLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={18} className="animate-spin" />
                Exportando...
              </span>
            ) : (
              <>
                <Download size={18} />
                Exportar
              </>
            )}
          </button>
          <PermissionButton
            permission="create"
            onClick={() => navigate('/albaranes/nuevo')}
            className="btn btn-primary"
            data-testid="btn-nuevo-albaran"
          >
            <Plus size={18} />
            Nuevo Albarán
          </PermissionButton>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive))', marginBottom: '1rem', padding: '1rem' }}>
          <p style={{ color: 'hsl(var(--destructive))' }}>{error}</p>
        </div>
      )}

      {/* Configuración de campos */}
      {showFieldsConfig && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Columnas Visibles</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fieldsConfig[key]}
                  onChange={() => toggleFieldConfig(key)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* KPIs Dashboard */}
      {stats && (
        <div className="stats-grid-horizontal" style={{ marginBottom: '1.5rem' }} data-testid="albaranes-kpis">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
              <FileSpreadsheet size={20} style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.total}</p>
              <p className="stat-label">Total Albaranes</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(142, 76%, 95%)' }}>
              <TrendingDown size={20} style={{ color: 'hsl(142, 76%, 36%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.entradas}</p>
              <p className="stat-label">Entradas (Compras)</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'hsl(38, 92%, 95%)' }}>
              <TrendingUp size={20} style={{ color: 'hsl(38, 92%, 50%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value">{stats.salidas}</p>
              <p className="stat-label">Salidas (Ventas)</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: stats.balance >= 0 ? 'hsl(142, 76%, 95%)' : 'hsl(0, 84%, 95%)' }}>
              <ArrowUpDown size={20} style={{ color: stats.balance >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)' }} />
            </div>
            <div className="stat-content">
              <p className="stat-value" style={{ fontSize: '1.2rem' }}>
                {stats.total_entradas?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
              </p>
              <p className="stat-label">Total Compras</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros de Búsqueda
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select 
              className="form-select" 
              value={filters.tipo} 
              onChange={(e) => setFilters({...filters, tipo: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="Albarán de compra">Albarán de compra</option>
              <option value="Albarán de venta">Albarán de venta</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contrato</label>
            <select 
              className="form-select" 
              value={filters.contrato_id} 
              onChange={(e) => setFilters({...filters, contrato_id: e.target.value})}
            >
              <option value="">Todos</option>
              {contratos.map(c => (
                <option key={c._id} value={c._id}>
                  {c.numero_contrato || c._id.slice(-6)} - {c.proveedor}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Proveedor</label>
            <select 
              className="form-select" 
              value={filters.proveedor} 
              onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
            >
              <option value="">Todos</option>
              {filterOptions.proveedores.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cultivo</label>
            <select 
              className="form-select" 
              value={filters.cultivo} 
              onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
            >
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <h2 className="card-title">Lista de Albaranes ({filteredAlbaranes.length})</h2>
        {loading ? (
          <p>Cargando albaranes...</p>
        ) : filteredAlbaranes.length === 0 ? (
          <p className="text-muted">No hay albaranes registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" data-testid="albaranes-table">
              <thead>
                <tr>
                  {fieldsConfig.numero && <th>Nº</th>}
                  {fieldsConfig.tipo && <th>Tipo</th>}
                  {fieldsConfig.fecha && <th>Fecha</th>}
                  {fieldsConfig.contrato && <th>Contrato</th>}
                  {fieldsConfig.proveedor && <th>Proveedor/Cliente</th>}
                  {fieldsConfig.cultivo && <th>Cultivo</th>}
                  {fieldsConfig.parcela && <th>Parcela</th>}
                  {fieldsConfig.items && <th>Líneas</th>}
                  {fieldsConfig.total && <th>Total</th>}
                  {fieldsConfig.observaciones && <th>Observaciones</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlbaranes.map((albaran, index) => (
                  <tr key={albaran._id}>
                    {fieldsConfig.numero && (
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>ALB-{String(index + 1).padStart(4, '0')}</code>
                      </td>
                    )}
                    {fieldsConfig.tipo && (
                      <td>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: albaran.tipo === 'Albarán de compra' ? '#dcfce7' : '#fee2e2',
                          color: albaran.tipo === 'Albarán de compra' ? '#166534' : '#991b1b'
                        }}>
                          {albaran.tipo}
                        </span>
                      </td>
                    )}
                    {fieldsConfig.fecha && <td>{albaran.fecha ? new Date(albaran.fecha).toLocaleDateString('es-ES') : '-'}</td>}
                    {fieldsConfig.contrato && (
                      <td>
                        {albaran.contrato_id ? (
                          <code style={{ fontSize: '0.75rem' }}>
                            {contratos.find(c => c._id === albaran.contrato_id)?.numero_contrato || albaran.contrato_id.slice(-6)}
                          </code>
                        ) : '-'}
                      </td>
                    )}
                    {fieldsConfig.proveedor && (
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                            {albaran.tipo === 'Albarán de venta' ? 'Cliente:' : 'Prov:'}
                          </span>
                          <span>
                            {albaran.tipo === 'Albarán de venta' 
                              ? (albaran.cliente || '-')
                              : (albaran.proveedor || '-')}
                          </span>
                        </div>
                      </td>
                    )}
                    {fieldsConfig.cultivo && <td>{albaran.cultivo || '-'}</td>}
                    {fieldsConfig.parcela && <td>{albaran.parcela_codigo || '-'}</td>}
                    {fieldsConfig.items && <td>{albaran.items?.length || 0} líneas</td>}
                    {fieldsConfig.total && (
                      <td style={{ fontWeight: '600', color: '#166534' }}>
                        {(albaran.total_albaran || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </td>
                    )}
                    {fieldsConfig.observaciones && (
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {albaran.observaciones || '-'}
                      </td>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => downloadPdf(albaran._id)}
                          className="btn btn-sm btn-outline"
                          title="Imprimir PDF"
                          style={{ padding: '0.25rem 0.5rem' }}
                          disabled={pdfLoading === albaran._id}
                        >
                          {pdfLoading === albaran._id ? (
                            <Download size={14} className="animate-spin" />
                          ) : (
                            <Printer size={14} />
                          )}
                        </button>
                        <PermissionButton
                          permission="edit"
                          onClick={() => navigate(`/albaranes/editar/${albaran._id}`)}
                          className="btn btn-sm btn-secondary"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </PermissionButton>
                        <PermissionButton
                          permission="delete"
                          onClick={() => handleDelete(albaran._id)}
                          className="btn btn-sm btn-error"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </PermissionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Albaranes;
