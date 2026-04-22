import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { BACKEND_URL } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Filter, Settings, X, FileSpreadsheet, FileText, Download, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Printer, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PermissionButton, usePermissions, usePermissionError } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import ColumnConfigModal from '../components/ColumnConfigModal';
import { useColumnConfig } from '../hooks/useColumnConfig';
import { useBulkSelect, BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell, bulkDeleteApi } from '../components/BulkActions';
import '../App.css';

const DEFAULT_COLUMNS = [
  { id: 'numero', label: 'Num Albaran', visible: true },
  { id: 'tipo', label: 'Tipo', visible: true },
  { id: 'fecha', label: 'Fecha', visible: true },
  { id: 'contrato', label: 'Contrato', visible: true },
  { id: 'proveedor', label: 'Proveedor/Cliente', visible: true },
  { id: 'cultivo', label: 'Cultivo', visible: true },
  { id: 'parcela', label: 'Parcela', visible: true },
  { id: 'items', label: 'Lineas', visible: true },
  { id: 'total', label: 'Total', visible: true },
  { id: 'observaciones', label: 'Observaciones', visible: false },
];

const Albaranes = () => {
  const navigate = useNavigate();
  const [albaranes, setAlbaranes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { token, canDoOperacion, user } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const canBulkDelete = !!user?.can_bulk_delete;
  const { handlePermissionError } = usePermissionError();
  const { t } = useTranslation();
  const { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns } = useColumnConfig('albaranes_col_config', DEFAULT_COLUMNS);
  
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
    return num.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
  const [searchNumero, setSearchNumero] = useState('');

  // Leer query-param "search" (p.ej. al venir desde Albaranes de Comisión)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearchNumero(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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

        setError('Error al cargar datos: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, isInitialized]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Función para recargar albaranes (después de crear/editar/eliminar)
  const reloadAlbaranes = async () => {
    try {
      const result = await xhrFetch(`${BACKEND_URL}/api/albaranes`);
      if (result.ok) {
        setAlbaranes(result.data?.albaranes || []);
      }
    } catch (error) {

    }
  };
  
  // Cargar estadísticas
  const fetchStats = async () => {
    try {
      const data = await api.get('/api/albaranes/stats/dashboard');
      setStats(data);
    } catch (error) {

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
  
  // Column config handled by useColumnConfig hook
  
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
    
  }, [formData.items.filter(i => !i.es_destare).map(i => `${i.cantidad}-${i.unidad}`).join(','), selectedContrato?.descuento_destare, formData.tipo]); // eslint-disable-line react-hooks/exhaustive-deps
  
  
  const handleDelete = async (albaranId) => {
    if (!canDelete) {
      setError('No tienes permisos para eliminar albaranes');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres eliminar este albarán?')) {
      return;
    }
    // Preguntar si tambien debe borrar su albaran de comision asociado
    const cascade = window.confirm(
      '¿Eliminar también su ALBARÁN DE COMISIÓN asociado (si existe)?\n\n'
      + 'Pulsa "Aceptar" para eliminar en cascada (recomendado para mantener integridad).\n'
      + 'Pulsa "Cancelar" para eliminar SOLO el albarán (puede dejar ACM huérfano).'
    );

    try {
      const res = await api.delete(`/api/albaranes/${albaranId}?cascade_acm=${cascade}`);
      const r = res?.data ?? res;
      if (r?.cascaded_acm) {
        window.alert(`Albarán eliminado. ${r.cascaded_acm} albarán(es) de comisión asociado(s) también eliminado(s).`);
      }
      reloadAlbaranes();
    } catch (error) {
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

  // Funciones de filtro rápido de fechas
  const setQuickDateFilter = (type) => {
    const today = new Date();
    let fecha_desde = '';
    let fecha_hasta = today.toISOString().split('T')[0];
    
    switch (type) {
      case 'today':
        fecha_desde = fecha_hasta;
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Lunes de esta semana
        fecha_desde = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        fecha_desde = monthStart.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        const quarterStart = new Date(today.getFullYear(), quarterMonth, 1);
        fecha_desde = quarterStart.toISOString().split('T')[0];
        break;
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        fecha_desde = yearStart.toISOString().split('T')[0];
        break;
      default:
        break;
    }
    
    setFilters(prev => ({ ...prev, fecha_desde, fecha_hasta }));
  };

  const clearContratoSearch = () => {
    setContratoSearch({ proveedor: '', cultivo: '', campana: '', parcela: '' });
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
    // Filtro por fecha
    if (filters.fecha_desde) {
      const fechaAlbaran = a.fecha ? a.fecha.split('T')[0] : '';
      if (fechaAlbaran < filters.fecha_desde) return false;
    }
    if (filters.fecha_hasta) {
      const fechaAlbaran = a.fecha ? a.fecha.split('T')[0] : '';
      if (fechaAlbaran > filters.fecha_hasta) return false;
    }
    // Busqueda rapida por numero_albaran o numero_contrato (URL externa)
    if (searchNumero) {
      const q = searchNumero.toLowerCase();
      const num = (a.numero_albaran || '').toLowerCase();
      const numContrato = (a.numero_contrato || '').toLowerCase();
      if (!num.includes(q) && !numContrato.includes(q)) return false;
    }
    return true;
  });

  // Ordenacion por columna
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const SORT_MAP = {
    numero: (a) => (a.numero_albaran || '').toLowerCase(),
    tipo: (a) => a.tipo || '',
    fecha: (a) => a.fecha || '',
    contrato: (a) => {
      const c = contratos.find(c => c._id === a.contrato_id);
      return (c?.numero_contrato || a.contrato_id || '').toLowerCase();
    },
    proveedor: (a) => ((a.tipo === 'Albarán de venta' ? a.cliente : a.proveedor) || '').toLowerCase(),
    cultivo: (a) => (a.cultivo || '').toLowerCase(),
    parcela: (a) => (a.parcela_codigo || '').toLowerCase(),
    items: (a) => (a.items?.length || 0),
    total: (a) => Number(a.total_albaran || 0),
    observaciones: (a) => (a.observaciones || '').toLowerCase(),
  };
  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' };
        return { key: null, dir: 'asc' };
      }
      return { key, dir: 'asc' };
    });
  };
  const sortedAlbaranes = useMemo(() => {
    if (!sort.key || !SORT_MAP[sort.key]) return filteredAlbaranes;
    const ext = SORT_MAP[sort.key];
    const mult = sort.dir === 'asc' ? 1 : -1;
    return [...filteredAlbaranes].sort((a, b) => {
      const va = ext(a); const vb = ext(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
      if (va < vb) return -1 * mult; if (va > vb) return 1 * mult; return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAlbaranes, sort]);

  // Paginacion
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedAlbaranes.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sortedAlbaranes.length);
  const paginatedAlbaranes = useMemo(() => sortedAlbaranes.slice(pageStart, pageEnd), [sortedAlbaranes, pageStart, pageEnd]);

  // Bulk select (sobre filas visibles en la pagina)
  const { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected } = useBulkSelect(paginatedAlbaranes);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [cascadeAcm, setCascadeAcm] = useState(true);
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await bulkDeleteApi('albaranes', selectedIds, { cascade_acm: cascadeAcm });
      const r = res?.data ?? res;
      const deleted = new Set(selectedIds);
      setAlbaranes(prev => prev.filter(a => !deleted.has(a._id)));
      clearSelection();
      if (r?.cascaded_acm) {
        window.alert(`${r.deleted_count} albaranes eliminados. ${r.cascaded_acm} albaranes de comisión asociados también eliminados.`);
      }
    } catch (err) {
      window.alert('Error al eliminar masivamente');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Cabecera ordenable (helper inline)
  const SortHeader = ({ sortKey, align, children, isSortable = true }) => {
    const active = sort.key === sortKey;
    const Arrow = !active ? ArrowUpDown : (sort.dir === 'asc' ? ArrowUp : ArrowDown);
    const alignStyle = align === 'right' ? { textAlign: 'right' } : {};
    return (
      <th
        style={{ ...alignStyle, cursor: isSortable ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
        onClick={isSortable ? () => toggleSort(sortKey) : undefined}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          {children}
          {isSortable && <Arrow size={12} style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', opacity: active ? 1 : 0.5 }} />}
        </span>
      </th>
    );
  };
  
  const hasActiveFilters = filters.tipo || filters.contrato_id || filters.proveedor || filters.cultivo || filters.fecha_desde || filters.fecha_hasta;

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
            className={`btn ${showConfig ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowConfig(true)}
            title="Configurar columnas"
            data-testid="btn-config-albaranes"
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

      <ColumnConfigModal show={showConfig} onClose={() => setShowConfig(false)} columns={columns} setColumns={setColumns} onSave={save} onReset={reset} />

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
                {stats.total_entradas?.toLocaleString('de-DE', { minimumFractionDigits: 2 })}€
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
        <div className="grid-4" style={{ marginBottom: '1rem' }}>
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
        <div className="grid-4">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha Desde</label>
            <input 
              type="date" 
              className="form-input" 
              value={filters.fecha_desde} 
              onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})}
              data-testid="filter-fecha-desde"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Fecha Hasta</label>
            <input 
              type="date" 
              className="form-input" 
              value={filters.fecha_hasta} 
              onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})}
              data-testid="filter-fecha-hasta"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} /> Filtros Rápidos
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className={`btn btn-sm ${filters.fecha_desde === new Date().toISOString().split('T')[0] && filters.fecha_hasta === new Date().toISOString().split('T')[0] ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setQuickDateFilter('today')}
                data-testid="quick-filter-today"
              >
                Hoy
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-outline"
                onClick={() => setQuickDateFilter('week')}
                data-testid="quick-filter-week"
              >
                Esta Semana
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-outline"
                onClick={() => setQuickDateFilter('month')}
                data-testid="quick-filter-month"
              >
                Este Mes
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-outline"
                onClick={() => setQuickDateFilter('quarter')}
                data-testid="quick-filter-quarter"
              >
                Trimestre
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-outline"
                onClick={() => setQuickDateFilter('year')}
                data-testid="quick-filter-year"
              >
                Este Año
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card">
        <h2 className="card-title">Lista de Albaranes ({sortedAlbaranes.length})</h2>
        {searchNumero && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.25)', borderRadius: '999px', fontSize: '0.8rem', color: 'hsl(var(--primary))', marginBottom: '0.75rem', fontWeight: '500' }}>
            Filtro por número: <b>{searchNumero}</b>
            <button
              type="button"
              onClick={() => setSearchNumero('')}
              title="Quitar filtro"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))', padding: 0, display: 'inline-flex' }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {canBulkDelete && (
          <>
            <BulkActionBar
              selectedCount={selectedIds.size}
              onClear={clearSelection}
              onDelete={handleBulkDelete}
              deleting={bulkDeleting}
            />
            {selectedIds.size > 0 && (
              <label
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.75rem', cursor: 'pointer', userSelect: 'none',
                }}
                title="Si está marcado, al borrar los albaranes también se eliminan sus albaranes de comisión asociados (manteniendo integridad)."
              >
                <input
                  type="checkbox"
                  checked={cascadeAcm}
                  onChange={(e) => setCascadeAcm(e.target.checked)}
                  data-testid="chk-cascade-acm"
                  style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                />
                Borrar también los <b>albaranes de comisión asociados</b> (recomendado)
              </label>
            )}
          </>
        )}
        {loading ? (
          <p>Cargando albaranes...</p>
        ) : sortedAlbaranes.length === 0 ? (
          <p className="text-muted">No hay albaranes registrados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" data-testid="albaranes-table">
              <thead>
                <tr>
                  {canBulkDelete && (
                    <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />
                  )}
                  {visibleColumns.map(col => (
                    <SortHeader
                      key={col.id}
                      sortKey={col.id}
                      align={col.id === 'total' ? 'right' : 'left'}
                    >{col.label}</SortHeader>
                  ))}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAlbaranes.map((albaran, index) => (
                  <tr key={albaran._id}>
                    {canBulkDelete && (
                      <BulkCheckboxCell id={albaran._id} selected={selectedIds.has(albaran._id)} onToggle={toggleOne} />
                    )}
                    {visibleColumns.map(col => {
                      switch (col.id) {
                        case 'numero': return <td key="numero"><code style={{ fontSize: '0.8rem' }}>{albaran.numero_albaran || `ALB-${String(pageStart + index + 1).padStart(4, '0')}`}</code></td>;
                        case 'tipo': return <td key="tipo"><span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: albaran.tipo === 'Albarán de compra' ? '#dcfce7' : '#fee2e2', color: albaran.tipo === 'Albarán de compra' ? '#166534' : '#991b1b' }}>{albaran.tipo}</span></td>;
                        case 'fecha': return <td key="fecha">{albaran.fecha ? new Date(albaran.fecha).toLocaleDateString('es-ES') : '-'}</td>;
                        case 'contrato': return <td key="contrato">{albaran.contrato_id ? <code style={{ fontSize: '0.75rem' }}>{contratos.find(c => c._id === albaran.contrato_id)?.numero_contrato || albaran.contrato_id.slice(-6)}</code> : '-'}</td>;
                        case 'proveedor': return <td key="proveedor"><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{albaran.tipo === 'Albarán de venta' ? 'Cliente:' : 'Prov:'}</span><span>{albaran.tipo === 'Albarán de venta' ? (albaran.cliente || '-') : (albaran.proveedor || '-')}</span></div></td>;
                        case 'cultivo': return <td key="cultivo">{albaran.cultivo || '-'}</td>;
                        case 'parcela': return <td key="parcela">{albaran.parcela_codigo || '-'}</td>;
                        case 'items': return <td key="items">{albaran.items?.length || 0} lineas</td>;
                        case 'total': return <td key="total" style={{ fontWeight: '600', color: '#166534' }}>{(albaran.total_albaran || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &euro;</td>;
                        case 'observaciones': return <td key="observaciones" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{albaran.observaciones || '-'}</td>;
                        default: return null;
                      }
                    })}
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
        {/* Pagination footer */}
        {sortedAlbaranes.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.25rem', marginTop: '0.75rem', borderTop: '1px solid hsl(var(--border))', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', flexWrap: 'wrap' }}>
              <span>Mostrando <b>{pageStart + 1}-{pageEnd}</b> de <b>{sortedAlbaranes.length}</b></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Filas:
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                  data-testid="select-page-size-alb"
                  style={{ padding: '0.2rem 0.35rem', borderRadius: '6px', border: '1px solid hsl(var(--border))', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {[10, 25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(1)} disabled={page === 1} title="Primera" data-testid="pag-first-alb">
                <ChevronsLeft size={14} />
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} title="Anterior" data-testid="pag-prev-alb">
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '0.8rem', padding: '0 0.5rem', whiteSpace: 'nowrap' }}>
                Página <b>{page}</b> / {totalPages}
              </span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} title="Siguiente" data-testid="pag-next-alb">
                <ChevronRight size={14} />
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setPage(totalPages)} disabled={page === totalPages} title="Última" data-testid="pag-last-alb">
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Albaranes;
