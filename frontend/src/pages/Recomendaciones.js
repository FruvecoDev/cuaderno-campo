import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, Trash2, Search, Filter, X, 
  AlertTriangle, CheckCircle, Clock, Calendar,
  FileText, Beaker, ArrowRight, Loader2, AlertCircle,
  Calculator, Droplets, Info, Copy, Layers, Zap, 
  ToggleLeft, ToggleRight, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PRIORIDAD_COLORS = {
  'Alta': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  'Media': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'Baja': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
};

const ESTADO_COLORS = {
  'Pendiente': { bg: '#fef3c7', text: '#92400e', icon: Clock },
  'Programada': { bg: '#dbeafe', text: '#1e40af', icon: Calendar },
  'Aplicada': { bg: '#dcfce7', text: '#166534', icon: CheckCircle },
  'Cancelada': { bg: '#f3f4f6', text: '#6b7280', icon: X }
};

// Límites recomendados por tipo de producto (L o kg por ha)
const LIMITES_DOSIS = {
  'Herbicida': { min: 0.5, max: 5, unidad: 'L/ha' },
  'Insecticida': { min: 0.1, max: 3, unidad: 'L/ha' },
  'Fungicida': { min: 0.2, max: 4, unidad: 'L/ha' },
  'Acaricida': { min: 0.1, max: 2, unidad: 'L/ha' },
  'Nematicida': { min: 1, max: 10, unidad: 'L/ha' },
  'Molusquicida': { min: 0.5, max: 5, unidad: 'kg/ha' },
  'Fertilizante': { min: 1, max: 50, unidad: 'kg/ha' },
  'Regulador': { min: 0.1, max: 2, unidad: 'L/ha' },
  'Otro': { min: 0.1, max: 10, unidad: 'L/ha' }
};

// Límites de volumen de agua por ha
const LIMITES_AGUA = { min: 100, max: 1000 };

const Recomendaciones = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  
  // Data states
  const [recomendaciones, setRecomendaciones] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [fitosanitarios, setFitosanitarios] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [subtipos, setSubtipos] = useState([]);
  const [stats, setStats] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generatingTratamiento, setGeneratingTratamiento] = useState(null);
  const [showCalculadora, setShowCalculadora] = useState(false);
  
  // Plantillas states
  const [activeTab, setActiveTab] = useState('recomendaciones'); // 'recomendaciones' | 'plantillas'
  const [showPlantillaForm, setShowPlantillaForm] = useState(false);
  const [editingPlantillaId, setEditingPlantillaId] = useState(null);
  const [showPlantillaSelector, setShowPlantillaSelector] = useState(false);
  const [showAplicacionMasiva, setShowAplicacionMasiva] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [selectedParcelas, setSelectedParcelas] = useState([]);
  const [aplicacionMasivaLoading, setAplicacionMasivaLoading] = useState(false);
  
  // Plantilla form state
  const [plantillaForm, setPlantillaForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'Tratamiento Fitosanitario',
    subtipo: '',
    producto_id: '',
    producto_nombre: '',
    dosis: '',
    unidad_dosis: 'L/ha',
    volumen_agua: '',
    prioridad: 'Media',
    motivo: '',
    observaciones: '',
    activo: true
  });
  
  // Multiple recommendations
  const [recomendacionesPendientes, setRecomendacionesPendientes] = useState([]);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    parcela_id: '',
    tipo: '',
    prioridad: '',
    estado: '',
    campana: ''
  });
  
  // Form state
  const [formData, setFormData] = useState({
    parcela_id: '',
    contrato_id: '',
    cultivo: '',
    variedad: '',
    campana: new Date().getFullYear().toString(),
    tipo: 'Tratamiento Fitosanitario',
    subtipo: '',
    producto_id: '',
    producto_nombre: '',
    dosis: '',
    unidad_dosis: 'L/ha',
    fecha_programada: '',
    prioridad: 'Media',
    observaciones: '',
    motivo: '',
    // Calculadora fields
    volumen_agua: 200,
    superficie_tratada: ''
  });
  
  // Get selected contrato info
  const selectedContrato = useMemo(() => {
    return contratos.find(c => c._id === formData.contrato_id);
  }, [contratos, formData.contrato_id]);
  
  // Filter parcelas by selected contrato
  const parcelasFiltradas = useMemo(() => {
    if (!formData.contrato_id) return parcelas;
    return parcelas.filter(p => p.contrato_id === formData.contrato_id);
  }, [parcelas, formData.contrato_id]);
  
  // Alerts for calculadora
  const [alerts, setAlerts] = useState({});
  
  // Get selected parcela info
  const selectedParcela = useMemo(() => {
    return parcelas.find(p => p._id === formData.parcela_id);
  }, [parcelas, formData.parcela_id]);
  
  // Get selected producto info
  const selectedProducto = useMemo(() => {
    return fitosanitarios.find(f => f._id === formData.producto_id);
  }, [fitosanitarios, formData.producto_id]);
  
  // Calculate results
  const resultados = useMemo(() => {
    const superficie = parseFloat(formData.superficie_tratada) || (selectedParcela?.superficie_total || 0);
    const dosis = parseFloat(formData.dosis) || 0;
    const volAgua = parseFloat(formData.volumen_agua) || 0;
    
    // Cantidad total de producto necesario
    const cantidadProducto = dosis * superficie;
    
    // Volumen total de agua
    const volumenTotalAgua = volAgua * superficie;
    
    // Cantidad de producto por litro de agua (para mezcla)
    const productoPorLitro = volumenTotalAgua > 0 ? (cantidadProducto / volumenTotalAgua) * 1000 : 0;
    
    // Concentración en la mezcla final
    const concentracionMezcla = volumenTotalAgua > 0 ? (cantidadProducto / volumenTotalAgua) * 100 : 0;
    
    return {
      superficieHa: superficie,
      cantidadProducto: cantidadProducto,
      volumenTotalAgua: volumenTotalAgua,
      productoPorLitro: productoPorLitro,
      concentracionMezcla: concentracionMezcla,
      dosisReal: dosis
    };
  }, [formData, selectedParcela]);
  
  // Check alerts
  useEffect(() => {
    const newAlerts = {};
    const tipoProducto = formData.subtipo || 'Otro';
    const limites = LIMITES_DOSIS[tipoProducto] || LIMITES_DOSIS['Otro'];
    const dosis = parseFloat(formData.dosis) || 0;
    const volAgua = parseFloat(formData.volumen_agua) || 0;
    
    // Check dosis limits
    if (dosis > 0 && limites) {
      if (dosis < limites.min) {
        newAlerts.dosis = { 
          type: 'warning', 
          message: `Dosis baja. Mínimo recomendado: ${limites.min} ${limites.unidad}`,
          blocking: false
        };
      } else if (dosis > limites.max) {
        newAlerts.dosis = { 
          type: 'danger', 
          message: `¡Dosis excesiva! Máximo permitido: ${limites.max} ${limites.unidad}`,
          blocking: true
        };
      }
    }
    
    // Check producto-specific limits
    if (selectedProducto && dosis > 0) {
      if (selectedProducto.dosis_max && dosis > selectedProducto.dosis_max) {
        newAlerts.dosis_producto = {
          type: 'danger',
          message: `¡Dosis superior al máximo del producto! Máximo: ${selectedProducto.dosis_max} ${selectedProducto.unidad_dosis || 'L/ha'}`,
          blocking: true
        };
      }
      if (selectedProducto.dosis_min && dosis < selectedProducto.dosis_min) {
        newAlerts.dosis_producto = {
          type: 'warning',
          message: `Dosis inferior al mínimo del producto. Mínimo: ${selectedProducto.dosis_min} ${selectedProducto.unidad_dosis || 'L/ha'}`,
          blocking: false
        };
      }
    }
    
    // Check water volume
    if (volAgua > 0) {
      if (volAgua < LIMITES_AGUA.min) {
        newAlerts.agua = { 
          type: 'warning', 
          message: `Volumen de agua bajo. Mínimo: ${LIMITES_AGUA.min} L/ha`,
          blocking: false
        };
      } else if (volAgua > LIMITES_AGUA.max) {
        newAlerts.agua = { 
          type: 'danger', 
          message: `Volumen excesivo. Máximo: ${LIMITES_AGUA.max} L/ha`,
          blocking: true
        };
      }
    }
    
    // Check concentration
    if (resultados.concentracionMezcla > 5) {
      newAlerts.concentracion = { 
        type: 'danger', 
        message: '¡Concentración muy alta! Riesgo de fitotoxicidad',
        blocking: true
      };
    } else if (resultados.concentracionMezcla > 2) {
      newAlerts.concentracion = { 
        type: 'warning', 
        message: 'Concentración elevada. Verificar tolerancia del cultivo',
        blocking: false
      };
    }
    
    setAlerts(newAlerts);
  }, [formData, resultados, selectedProducto]);
  
  // Check if has blocking alerts
  const hasBlockingAlerts = useMemo(() => {
    return Object.values(alerts).some(alert => alert.blocking);
  }, [alerts]);
  
  // Fetch data on mount
  useEffect(() => {
    fetchAll();
  }, []);
  
  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchRecomendaciones(),
      fetchParcelas(),
      fetchContratos(),
      fetchFitosanitarios(),
      fetchTipos(),
      fetchStats(),
      fetchPlantillas()
    ]);
    setLoading(false);
  };
  
  const fetchRecomendaciones = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`${API_URL}/api/recomendaciones?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecomendaciones(data.recomendaciones || []);
    } catch (err) {
      console.error('Error fetching recomendaciones:', err);
    }
  };
  
  const fetchParcelas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/parcelas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setParcelas(data.parcelas || []);
    } catch (err) {
      console.error('Error fetching parcelas:', err);
    }
  };
  
  const fetchContratos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/contratos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setContratos(data.contratos || []);
    } catch (err) {
      console.error('Error fetching contratos:', err);
    }
  };
  
  const fetchFitosanitarios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/fitosanitarios?activo=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setFitosanitarios(data.productos || []);
    } catch (err) {
      console.error('Error fetching fitosanitarios:', err);
    }
  };
  
  const fetchTipos = async () => {
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/config/tipos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTipos(data.tipos || []);
      setSubtipos(data.subtipos_tratamiento || []);
    } catch (err) {
      console.error('Error fetching tipos:', err);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/stats/resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };
  
  const fetchPlantillas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plantillas-recomendaciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Error fetching plantillas');
      }
      const data = await response.json();
      setPlantillas(data.plantillas || []);
    } catch (err) {
      console.error('Error fetching plantillas:', err);
      setPlantillas([]);
    }
  };
  
  // Plantilla functions
  const handlePlantillaSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!plantillaForm.nombre.trim()) {
      setError('El nombre de la plantilla es obligatorio');
      return;
    }
    
    try {
      const url = editingPlantillaId 
        ? `${API_URL}/api/plantillas-recomendaciones/${editingPlantillaId}`
        : `${API_URL}/api/plantillas-recomendaciones`;
      
      const response = await fetch(url, {
        method: editingPlantillaId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(plantillaForm)
      });
      
      if (!response.ok) {
        let errorMsg = 'Error al guardar plantilla';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          // Ignore JSON parse errors for error response
        }
        throw new Error(errorMsg);
      }
      
      // Success case - parse response
      const data = await response.json();
      
      setSuccess(editingPlantillaId ? 'Plantilla actualizada' : 'Plantilla creada');
      setTimeout(() => setSuccess(null), 3000);
      resetPlantillaForm();
      fetchPlantillas();
    } catch (err) {
      console.error('Error en handlePlantillaSubmit:', err);
      setError(err.message || 'Error desconocido');
    }
  };
  
  const handleEditPlantilla = (plantilla) => {
    setPlantillaForm({
      nombre: plantilla.nombre || '',
      descripcion: plantilla.descripcion || '',
      tipo: plantilla.tipo || 'Tratamiento Fitosanitario',
      subtipo: plantilla.subtipo || '',
      producto_id: plantilla.producto_id || '',
      producto_nombre: plantilla.producto_nombre || '',
      dosis: plantilla.dosis || '',
      unidad_dosis: plantilla.unidad_dosis || 'L/ha',
      volumen_agua: plantilla.volumen_agua || '',
      prioridad: plantilla.prioridad || 'Media',
      motivo: plantilla.motivo || '',
      observaciones: plantilla.observaciones || '',
      activo: plantilla.activo !== false
    });
    setEditingPlantillaId(plantilla._id);
    setShowPlantillaForm(true);
  };
  
  const handleDeletePlantilla = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta plantilla?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/plantillas-recomendaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al eliminar');
      }
      
      setSuccess('Plantilla eliminada');
      setTimeout(() => setSuccess(null), 3000);
      fetchPlantillas();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleTogglePlantillaActivo = async (plantilla) => {
    try {
      const response = await fetch(`${API_URL}/api/plantillas-recomendaciones/${plantilla._id}/toggle-activo`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al cambiar estado');
      }
      
      fetchPlantillas();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const resetPlantillaForm = () => {
    setPlantillaForm({
      nombre: '',
      descripcion: '',
      tipo: 'Tratamiento Fitosanitario',
      subtipo: '',
      producto_id: '',
      producto_nombre: '',
      dosis: '',
      unidad_dosis: 'L/ha',
      volumen_agua: '',
      prioridad: 'Media',
      motivo: '',
      observaciones: '',
      activo: true
    });
    setEditingPlantillaId(null);
    setShowPlantillaForm(false);
  };
  
  // Use template to fill form
  const handleUsePlantilla = (plantilla) => {
    setFormData(prev => ({
      ...prev,
      tipo: plantilla.tipo || 'Tratamiento Fitosanitario',
      subtipo: plantilla.subtipo || '',
      producto_id: plantilla.producto_id || '',
      producto_nombre: plantilla.producto_nombre || '',
      dosis: plantilla.dosis || '',
      unidad_dosis: plantilla.unidad_dosis || 'L/ha',
      volumen_agua: plantilla.volumen_agua || 200,
      prioridad: plantilla.prioridad || 'Media',
      motivo: plantilla.motivo || '',
      observaciones: plantilla.observaciones || ''
    }));
    setShowPlantillaSelector(false);
    setSuccess(`Plantilla "${plantilla.nombre}" aplicada`);
    setTimeout(() => setSuccess(null), 2000);
  };
  
  // Aplicación masiva
  const handleAplicacionMasiva = async () => {
    if (!selectedPlantilla) {
      setError('Debe seleccionar una plantilla');
      return;
    }
    if (selectedParcelas.length === 0) {
      setError('Debe seleccionar al menos una parcela');
      return;
    }
    
    setAplicacionMasivaLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/plantillas-recomendaciones/aplicar-masivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plantilla_id: selectedPlantilla._id,
          parcela_ids: selectedParcelas,
          campana: new Date().getFullYear().toString(),
          fecha_programada: formData.fecha_programada || null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error al aplicar plantilla');
      }
      
      setSuccess(`${data.created_count} recomendación(es) creada(s) desde plantilla "${data.plantilla_usada}"`);
      setTimeout(() => setSuccess(null), 4000);
      
      setShowAplicacionMasiva(false);
      setSelectedPlantilla(null);
      setSelectedParcelas([]);
      fetchRecomendaciones();
      fetchStats();
      fetchPlantillas();
    } catch (err) {
      setError(err.message);
    } finally {
      setAplicacionMasivaLoading(false);
    }
  };
  
  const handleToggleParcelaSelection = (parcelaId) => {
    setSelectedParcelas(prev => 
      prev.includes(parcelaId) 
        ? prev.filter(id => id !== parcelaId)
        : [...prev, parcelaId]
    );
  };
  
  const handleSelectAllParcelas = () => {
    if (selectedParcelas.length === parcelas.length) {
      setSelectedParcelas([]);
    } else {
      setSelectedParcelas(parcelas.map(p => p._id));
    }
  };
  
  const handleSeedPlantillas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plantillas-recomendaciones/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error al cargar plantillas');
      }
      
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);
      fetchPlantillas();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.parcela_id) {
      setError('Debe seleccionar una parcela');
      return;
    }
    
    // Include calculated values
    const submitData = {
      ...formData,
      cantidad_total_producto: resultados.cantidadProducto,
      volumen_total_agua: resultados.volumenTotalAgua,
      superficie_tratada: resultados.superficieHa,
      tiene_alertas: Object.keys(alerts).length > 0,
      alertas_bloqueantes: hasBlockingAlerts
    };
    
    try {
      const url = editingId 
        ? `${API_URL}/api/recomendaciones/${editingId}`
        : `${API_URL}/api/recomendaciones`;
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error al guardar');
      }
      
      setSuccess(editingId ? 'Recomendación actualizada' : 'Recomendación creada');
      setTimeout(() => setSuccess(null), 3000);
      
      resetForm();
      fetchRecomendaciones();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleEdit = (rec) => {
    setFormData({
      parcela_id: rec.parcela_id || '',
      contrato_id: rec.contrato_id || '',
      campana: rec.campana || '',
      tipo: rec.tipo || 'Tratamiento Fitosanitario',
      subtipo: rec.subtipo || '',
      producto_id: rec.producto_id || '',
      producto_nombre: rec.producto_nombre || '',
      dosis: rec.dosis || '',
      unidad_dosis: rec.unidad_dosis || 'L/ha',
      fecha_programada: rec.fecha_programada || '',
      prioridad: rec.prioridad || 'Media',
      observaciones: rec.observaciones || '',
      motivo: rec.motivo || '',
      volumen_agua: rec.volumen_agua || 200,
      superficie_tratada: rec.superficie_tratada || ''
    });
    setEditingId(rec._id);
    setShowForm(true);
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta recomendación?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al eliminar');
      }
      
      setSuccess('Recomendación eliminada');
      setTimeout(() => setSuccess(null), 3000);
      fetchRecomendaciones();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleGenerarTratamiento = async (rec) => {
    // Check alerts on this recommendation
    const recAlerts = checkRecommendationAlerts(rec);
    const hasBlocking = Object.values(recAlerts).some(a => a.blocking);
    
    if (hasBlocking) {
      setError('No se puede generar el tratamiento. Hay alertas de seguridad pendientes. Por favor, revise y corrija la recomendación.');
      return;
    }
    
    if (!window.confirm(`¿Generar tratamiento a partir de esta recomendación?\n\nProducto: ${rec.producto_nombre}\nParcela: ${rec.parcela_codigo}\nDosis: ${rec.dosis} ${rec.unidad_dosis}`)) {
      return;
    }
    
    setGeneratingTratamiento(rec._id);
    
    try {
      const response = await fetch(`${API_URL}/api/recomendaciones/${rec._id}/generar-tratamiento`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Error al generar tratamiento');
      }
      
      setSuccess('Tratamiento generado correctamente');
      setTimeout(() => setSuccess(null), 3000);
      fetchRecomendaciones();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingTratamiento(null);
    }
  };
  
  // Check alerts for a recommendation
  const checkRecommendationAlerts = (rec) => {
    const recAlerts = {};
    const tipoProducto = rec.subtipo || 'Otro';
    const limites = LIMITES_DOSIS[tipoProducto] || LIMITES_DOSIS['Otro'];
    const dosis = parseFloat(rec.dosis) || 0;
    
    if (dosis > 0 && limites) {
      if (dosis > limites.max) {
        recAlerts.dosis = { type: 'danger', blocking: true };
      }
    }
    
    return recAlerts;
  };
  
  const resetForm = () => {
    setFormData({
      parcela_id: '',
      contrato_id: '',
      cultivo: '',
      variedad: '',
      campana: new Date().getFullYear().toString(),
      tipo: 'Tratamiento Fitosanitario',
      subtipo: '',
      producto_id: '',
      producto_nombre: '',
      dosis: '',
      unidad_dosis: 'L/ha',
      fecha_programada: '',
      prioridad: 'Media',
      observaciones: '',
      motivo: '',
      volumen_agua: 200,
      superficie_tratada: ''
    });
    setEditingId(null);
    setShowForm(false);
    setShowCalculadora(false);
    setAlerts({});
    setRecomendacionesPendientes([]);
  };
  
  const handleContratoChange = (contratoId) => {
    const contrato = contratos.find(c => c._id === contratoId);
    setFormData(prev => ({ 
      ...prev, 
      contrato_id: contratoId,
      parcela_id: '', // Reset parcela when contrato changes
      cultivo: contrato?.cultivo || '',
      variedad: contrato?.variedad || '',
      campana: contrato?.campana || prev.campana
    }));
  };
  
  const handleParcelaChange = (parcelaId) => {
    const parcela = parcelas.find(p => p._id === parcelaId);
    setFormData(prev => ({ 
      ...prev, 
      parcela_id: parcelaId,
      superficie_tratada: parcela?.superficie_total || '',
      cultivo: parcela?.cultivo || prev.cultivo,
      variedad: parcela?.variedad || prev.variedad,
      contrato_id: parcela?.contrato_id || prev.contrato_id
    }));
  };
  
  const handleProductoChange = (productoId) => {
    const producto = fitosanitarios.find(p => p._id === productoId);
    setFormData(prev => ({
      ...prev,
      producto_id: productoId,
      producto_nombre: producto?.nombre_comercial || '',
      dosis: producto?.dosis_max ? producto.dosis_max.toString() : prev.dosis,
      unidad_dosis: producto?.unidad_dosis || prev.unidad_dosis,
      subtipo: producto?.tipo || prev.subtipo
    }));
  };
  
  // Add current form as a pending recommendation
  const handleAddToPending = () => {
    if (!formData.parcela_id) {
      setError('Debe seleccionar una parcela');
      return;
    }
    if (!formData.producto_id && formData.tipo === 'Tratamiento Fitosanitario') {
      setError('Debe seleccionar un producto');
      return;
    }
    
    const newRec = {
      ...formData,
      id: Date.now(), // Temporary ID
      parcela_codigo: selectedParcela?.codigo_plantacion || '',
      cantidad_total_producto: resultados.cantidadProducto,
      volumen_total_agua: resultados.volumenTotalAgua,
      tiene_alertas: Object.keys(alerts).length > 0,
      alertas_bloqueantes: hasBlockingAlerts
    };
    
    setRecomendacionesPendientes(prev => [...prev, newRec]);
    
    // Reset only product-specific fields, keep parcela/contrato
    setFormData(prev => ({
      ...prev,
      tipo: 'Tratamiento Fitosanitario',
      subtipo: '',
      producto_id: '',
      producto_nombre: '',
      dosis: '',
      fecha_programada: '',
      prioridad: 'Media',
      observaciones: '',
      motivo: ''
    }));
    
    setSuccess('Recomendación añadida a la lista');
    setTimeout(() => setSuccess(null), 2000);
  };
  
  // Remove from pending list
  const handleRemoveFromPending = (id) => {
    setRecomendacionesPendientes(prev => prev.filter(r => r.id !== id));
  };
  
  // Save all pending recommendations
  const handleSaveAllPending = async () => {
    if (recomendacionesPendientes.length === 0) {
      setError('No hay recomendaciones pendientes para guardar');
      return;
    }
    
    setError(null);
    let savedCount = 0;
    let errors = [];
    
    for (const rec of recomendacionesPendientes) {
      try {
        const response = await fetch(`${API_URL}/api/recomendaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(rec)
        });
        
        if (response.ok) {
          savedCount++;
        } else {
          const data = await response.json();
          errors.push(`${rec.producto_nombre}: ${data.detail}`);
        }
      } catch (err) {
        errors.push(`${rec.producto_nombre}: ${err.message}`);
      }
    }
    
    if (savedCount > 0) {
      setSuccess(`${savedCount} recomendación(es) guardada(s) correctamente`);
      setTimeout(() => setSuccess(null), 3000);
      setRecomendacionesPendientes([]);
      fetchRecomendaciones();
      fetchStats();
    }
    
    if (errors.length > 0) {
      setError(`Errores: ${errors.join(', ')}`);
    }
  };
  
  const canManage = user?.role && ['Admin', 'Manager', 'Technician'].includes(user.role);
  const canManagePlantillas = user?.role && ['Admin', 'Manager'].includes(user.role);
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="page-container" data-testid="recomendaciones-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} />
            Recomendaciones
          </h1>
          <p className="text-muted">Gestiona las recomendaciones técnicas para parcelas y cultivos</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab === 'recomendaciones' && (
            <>
              <button
                className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
              </button>
              {canManage && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAplicacionMasiva(true)}
                    title="Aplicación Masiva desde Plantilla"
                    data-testid="btn-aplicacion-masiva"
                  >
                    <Zap size={18} /> Aplicación Masiva
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowForm(true); }}
                    data-testid="btn-nueva-recomendacion"
                  >
                    <Plus size={18} /> Nueva Recomendación
                  </button>
                </>
              )}
            </>
          )}
          {activeTab === 'plantillas' && canManagePlantillas && (
            <>
              {plantillas.length === 0 && (
                <button
                  className="btn btn-secondary"
                  onClick={handleSeedPlantillas}
                  title="Cargar plantillas predeterminadas"
                >
                  <Copy size={18} /> Cargar Predeterminadas
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => { resetPlantillaForm(); setShowPlantillaForm(true); }}
                data-testid="btn-nueva-plantilla"
              >
                <Plus size={18} /> Nueva Plantilla
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'recomendaciones' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recomendaciones')}
          style={{ borderRadius: '0.5rem 0.5rem 0 0' }}
        >
          <FileText size={16} /> Recomendaciones ({recomendaciones.length})
        </button>
        <button
          className={`btn ${activeTab === 'plantillas' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('plantillas')}
          style={{ borderRadius: '0.5rem 0.5rem 0 0' }}
          data-testid="tab-plantillas"
        >
          <Layers size={16} /> Plantillas ({plantillas.length})
        </button>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="alert alert-error mb-4">
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto' }}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4">
          <CheckCircle size={18} /> {success}
        </div>
      )}
      
      {/* Stats */}
      {activeTab === 'recomendaciones' && stats && (
        <div className="grid grid-cols-4 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'hsl(var(--primary))' }}>{stats.total}</div>
            <div className="text-muted text-sm">Total</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{stats.pendientes}</div>
            <div className="text-muted text-sm">Pendientes</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{stats.programadas}</div>
            <div className="text-muted text-sm">Programadas</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid #22c55e' }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#22c55e' }}>{stats.aplicadas}</div>
            <div className="text-muted text-sm">Aplicadas</div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      {activeTab === 'recomendaciones' && showFilters && (
        <div className="card mb-6">
          <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Filtros</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label">Parcela</label>
              <select
                className="form-select"
                value={filters.parcela_id}
                onChange={(e) => setFilters(prev => ({ ...prev, parcela_id: e.target.value }))}
              >
                <option value="">Todas</option>
                {parcelas.map(p => (
                  <option key={p._id} value={p._id}>{p.codigo_plantacion} - {p.cultivo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={filters.tipo}
                onChange={(e) => setFilters(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="">Todos</option>
                {tipos.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Prioridad</label>
              <select
                className="form-select"
                value={filters.prioridad}
                onChange={(e) => setFilters(prev => ({ ...prev, prioridad: e.target.value }))}
              >
                <option value="">Todas</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={filters.estado}
                onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Programada">Programada</option>
                <option value="Aplicada">Aplicada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={fetchRecomendaciones}>
              <Search size={16} /> Filtrar
            </button>
            <button className="btn btn-secondary" onClick={() => { setFilters({ parcela_id: '', tipo: '', prioridad: '', estado: '', campana: '' }); fetchRecomendaciones(); }}>
              Limpiar
            </button>
          </div>
        </div>
      )}
      
      {/* Form */}
      {activeTab === 'recomendaciones' && showForm && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>
              {editingId ? 'Editar Recomendación' : 'Nueva Recomendación'}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Use Template Button */}
              {!editingId && (
                <button 
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowPlantillaSelector(true)}
                  title="Usar una plantilla"
                >
                  <Layers size={16} /> Usar Plantilla
                </button>
              )}
              <button 
                className={`btn btn-sm ${showCalculadora ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowCalculadora(!showCalculadora)}
              >
                <Calculator size={16} /> Calculadora
              </button>
              <button className="btn btn-sm btn-secondary" onClick={resetForm}>
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Alerts Panel */}
          {Object.keys(alerts).length > 0 && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              backgroundColor: hasBlockingAlerts ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${hasBlockingAlerts ? '#fecaca' : '#fde68a'}`
            }}>
              <h4 style={{ 
                fontWeight: '600', 
                marginBottom: '0.5rem', 
                color: hasBlockingAlerts ? '#dc2626' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={18} />
                {hasBlockingAlerts ? 'Alertas de Seguridad (bloquean generación de tratamiento)' : 'Advertencias'}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                {Object.entries(alerts).map(([key, alert]) => (
                  <li key={key} style={{ 
                    color: alert.type === 'danger' ? '#dc2626' : '#d97706',
                    marginBottom: '0.25rem'
                  }}>
                    {alert.message}
                    {alert.blocking && <strong> (BLOQUEANTE)</strong>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: showCalculadora ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
              {/* Main Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Contrato */}
                <div>
                  <label className="form-label">Contrato</label>
                  <select
                    className="form-select"
                    value={formData.contrato_id}
                    onChange={(e) => handleContratoChange(e.target.value)}
                  >
                    <option value="">Seleccionar contrato (opcional)</option>
                    {contratos.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.codigo || c._id.slice(-6)} - {c.cultivo} ({c.proveedor})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Parcela */}
                <div>
                  <label className="form-label">Parcela *</label>
                  <select
                    className="form-select"
                    value={formData.parcela_id}
                    onChange={(e) => handleParcelaChange(e.target.value)}
                    required={!editingId && recomendacionesPendientes.length === 0}
                  >
                    <option value="">Seleccionar parcela</option>
                    {parcelasFiltradas.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.codigo_plantacion} - {p.cultivo} ({p.superficie_total} ha)
                      </option>
                    ))}
                  </select>
                  {formData.contrato_id && parcelasFiltradas.length === 0 && (
                    <small className="text-muted">No hay parcelas para este contrato</small>
                  )}
                </div>
                
                {/* Cultivo (auto-filled) */}
                <div>
                  <label className="form-label">Cultivo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.cultivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, cultivo: e.target.value }))}
                    placeholder="Auto-rellenado desde parcela"
                    style={{ backgroundColor: formData.cultivo ? '#f0fdf4' : undefined }}
                  />
                </div>
                
                {/* Variedad (auto-filled) */}
                <div>
                  <label className="form-label">Variedad</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.variedad}
                    onChange={(e) => setFormData(prev => ({ ...prev, variedad: e.target.value }))}
                    placeholder="Auto-rellenado desde parcela"
                    style={{ backgroundColor: formData.variedad ? '#f0fdf4' : undefined }}
                  />
                </div>
                
                {/* Campaña */}
                <div>
                  <label className="form-label">Campaña</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.campana}
                    onChange={(e) => setFormData(prev => ({ ...prev, campana: e.target.value }))}
                    placeholder="2024"
                  />
                </div>
                
                {/* Tipo */}
                <div>
                  <label className="form-label">Tipo de Recomendación</label>
                  <select
                    className="form-select"
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    {tipos.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                
                {/* Subtipo */}
                {formData.tipo === 'Tratamiento Fitosanitario' && (
                  <div>
                    <label className="form-label">Subtipo</label>
                    <select
                      className="form-select"
                      value={formData.subtipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtipo: e.target.value }))}
                    >
                      <option value="">Seleccionar subtipo</option>
                      {subtipos.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Producto */}
                {(formData.tipo === 'Tratamiento Fitosanitario' || formData.tipo === 'Fertilización') && (
                  <div>
                    <label className="form-label">Producto</label>
                    <select
                      className="form-select"
                      value={formData.producto_id}
                      onChange={(e) => handleProductoChange(e.target.value)}
                    >
                      <option value="">Seleccionar producto</option>
                      {fitosanitarios
                        .filter(f => !formData.subtipo || f.tipo === formData.subtipo)
                        .map(f => (
                          <option key={f._id} value={f._id}>
                            {f.nombre_comercial} {f.dosis_max ? `(máx ${f.dosis_max} ${f.unidad_dosis || 'L/ha'})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                
                {/* Dosis */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Dosis por ha</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.dosis}
                      onChange={(e) => setFormData(prev => ({ ...prev, dosis: e.target.value }))}
                      placeholder="0.00"
                      style={{ borderColor: alerts.dosis?.type === 'danger' ? '#dc2626' : undefined }}
                    />
                  </div>
                  <div style={{ width: '100px' }}>
                    <label className="form-label">Unidad</label>
                    <select
                      className="form-select"
                      value={formData.unidad_dosis}
                      onChange={(e) => setFormData(prev => ({ ...prev, unidad_dosis: e.target.value }))}
                    >
                      <option value="L/ha">L/ha</option>
                      <option value="Kg/ha">Kg/ha</option>
                      <option value="g/ha">g/ha</option>
                      <option value="ml/ha">ml/ha</option>
                      <option value="cc/hl">cc/hl</option>
                    </select>
                  </div>
                </div>
                
                {/* Fecha programada */}
                <div>
                  <label className="form-label">Fecha Programada</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.fecha_programada}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha_programada: e.target.value }))}
                  />
                </div>
                
                {/* Prioridad */}
                <div>
                  <label className="form-label">Prioridad</label>
                  <select
                    className="form-select"
                    value={formData.prioridad}
                    onChange={(e) => setFormData(prev => ({ ...prev, prioridad: e.target.value }))}
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                
                {/* Motivo */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Motivo / Justificación</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.motivo}
                    onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ej: Presencia de pulgón, deficiencia de nitrógeno..."
                  />
                </div>
                
                {/* Observaciones */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Observaciones</label>
                  <textarea
                    className="form-textarea"
                    value={formData.observaciones}
                    onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                    rows={2}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              
              {/* Calculadora Panel */}
              {showCalculadora && (
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'hsl(var(--muted))', 
                  borderRadius: '0.5rem',
                  border: '1px solid hsl(var(--border))'
                }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calculator size={18} /> Calculadora de Dosis
                  </h4>
                  
                  {/* Inputs */}
                  <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className="form-label">Superficie a tratar (ha)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={formData.superficie_tratada}
                        onChange={(e) => setFormData(prev => ({ ...prev, superficie_tratada: e.target.value }))}
                        placeholder={selectedParcela?.superficie_total || 'Superficie'}
                      />
                      {selectedParcela && (
                        <small className="text-muted">
                          Parcela: {selectedParcela.superficie_total} ha
                        </small>
                      )}
                    </div>
                    
                    <div>
                      <label className="form-label">Volumen de agua (L/ha)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.volumen_agua}
                        onChange={(e) => setFormData(prev => ({ ...prev, volumen_agua: e.target.value }))}
                        style={{ borderColor: alerts.agua?.type === 'danger' ? '#dc2626' : undefined }}
                      />
                      <small className="text-muted">
                        Recomendado: {LIMITES_AGUA.min}-{LIMITES_AGUA.max} L/ha
                      </small>
                    </div>
                  </div>
                  
                  {/* Results */}
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem',
                    border: '1px solid hsl(var(--border))'
                  }}>
                    <h5 style={{ fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>
                      Resultados del Cálculo
                    </h5>
                    
                    <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem' }}>
                        <span>Superficie:</span>
                        <strong>{resultados.superficieHa.toFixed(2)} ha</strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '0.25rem' }}>
                        <span>Producto Total:</span>
                        <strong style={{ color: '#166534' }}>{resultados.cantidadProducto.toFixed(2)} {formData.unidad_dosis.replace('/ha', '')}</strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.25rem' }}>
                        <span>Agua Total:</span>
                        <strong style={{ color: '#1e40af' }}>{resultados.volumenTotalAgua.toFixed(0)} L</strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '0.25rem' }}>
                        <span>Producto/L agua:</span>
                        <strong>{resultados.productoPorLitro.toFixed(2)} ml</strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '0.25rem',
                        backgroundColor: resultados.concentracionMezcla > 2 ? '#fef3c7' : 'hsl(var(--muted))'
                      }}>
                        <span>Concentración:</span>
                        <strong>{resultados.concentracionMezcla.toFixed(3)}%</strong>
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    {selectedProducto && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '0.25rem', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Info size={14} />
                          <strong>Info del Producto</strong>
                        </div>
                        <div>{selectedProducto.nombre_comercial}</div>
                        {selectedProducto.dosis_min && selectedProducto.dosis_max && (
                          <div className="text-muted">
                            Dosis: {selectedProducto.dosis_min} - {selectedProducto.dosis_max} {selectedProducto.unidad_dosis || 'L/ha'}
                          </div>
                        )}
                        {selectedProducto.plazo_seguridad && (
                          <div className="text-muted">
                            Plazo seguridad: {selectedProducto.plazo_seguridad} días
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Buttons section */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!editingId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleAddToPending}
                    disabled={!formData.parcela_id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Plus size={16} /> Añadir a la lista
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
                {editingId ? (
                  <button type="submit" className="btn btn-primary">
                    Actualizar Recomendación
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary" disabled={recomendacionesPendientes.length > 0}>
                    Crear Recomendación
                  </button>
                )}
              </div>
            </div>
          </form>
          
          {/* Pending Recommendations List */}
          {recomendacionesPendientes.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '2px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
              <div className="flex justify-between items-center mb-3">
                <h4 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} />
                  Recomendaciones a guardar ({recomendacionesPendientes.length})
                </h4>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveAllPending}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <CheckCircle size={16} /> Guardar Todas
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Parcela</th>
                      <th>Cultivo</th>
                      <th>Tipo</th>
                      <th>Producto</th>
                      <th>Dosis</th>
                      <th>Prioridad</th>
                      <th>Alertas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recomendacionesPendientes.map((rec) => (
                      <tr key={rec.id} style={{ backgroundColor: rec.alertas_bloqueantes ? '#fef2f2' : undefined }}>
                        <td>{rec.parcela_codigo}</td>
                        <td>{rec.cultivo} {rec.variedad && `(${rec.variedad})`}</td>
                        <td>{rec.subtipo || rec.tipo}</td>
                        <td>{rec.producto_nombre || '-'}</td>
                        <td>{rec.dosis} {rec.unidad_dosis}</td>
                        <td>
                          <span style={{
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            backgroundColor: PRIORIDAD_COLORS[rec.prioridad]?.bg,
                            color: PRIORIDAD_COLORS[rec.prioridad]?.text
                          }}>
                            {rec.prioridad}
                          </span>
                        </td>
                        <td>
                          {rec.alertas_bloqueantes ? (
                            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <AlertTriangle size={14} /> Bloqueante
                            </span>
                          ) : rec.tiene_alertas ? (
                            <span style={{ color: '#d97706' }}>Advertencia</span>
                          ) : (
                            <span style={{ color: '#16a34a' }}>OK</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: 'hsl(var(--destructive))', color: 'white', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleRemoveFromPending(rec.id)}
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* List */}
      {activeTab === 'recomendaciones' && (
      <div className="card">
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
          Recomendaciones ({recomendaciones.length})
        </h3>
        
        {recomendaciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No hay recomendaciones registradas</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Parcela / Cultivo</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Dosis</th>
                  <th>Fecha Prog.</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recomendaciones.map((rec) => {
                  const prioridadStyle = PRIORIDAD_COLORS[rec.prioridad] || PRIORIDAD_COLORS['Media'];
                  const estadoConfig = ESTADO_COLORS[rec.estado] || ESTADO_COLORS['Pendiente'];
                  const EstadoIcon = estadoConfig.icon;
                  const recAlerts = checkRecommendationAlerts(rec);
                  const hasBlockingRec = Object.values(recAlerts).some(a => a.blocking);
                  
                  return (
                    <tr key={rec._id} style={{ backgroundColor: hasBlockingRec ? '#fef2f2' : undefined }}>
                      <td>
                        <div style={{ fontWeight: '500' }}>{rec.parcela_codigo}</div>
                        <div className="text-sm text-muted">{rec.parcela_cultivo}</div>
                      </td>
                      <td>
                        <div>{rec.tipo}</div>
                        {rec.subtipo && <div className="text-sm text-muted">{rec.subtipo}</div>}
                      </td>
                      <td>
                        {rec.producto_nombre || '-'}
                      </td>
                      <td>
                        {rec.dosis ? (
                          <span style={{ color: hasBlockingRec ? '#dc2626' : undefined }}>
                            {rec.dosis} {rec.unidad_dosis}
                            {hasBlockingRec && <AlertTriangle size={12} style={{ marginLeft: '4px', color: '#dc2626' }} />}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {rec.fecha_programada ? new Date(rec.fecha_programada).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: prioridadStyle.bg,
                          color: prioridadStyle.text,
                          border: `1px solid ${prioridadStyle.border}`
                        }}>
                          {rec.prioridad}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: estadoConfig.bg,
                          color: estadoConfig.text,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <EstadoIcon size={12} />
                          {rec.estado}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {/* Generate Treatment Button */}
                          {!rec.tratamiento_generado && canManage && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleGenerarTratamiento(rec)}
                              disabled={generatingTratamiento === rec._id || hasBlockingRec}
                              title={hasBlockingRec ? 'No se puede generar: hay alertas de seguridad' : 'Generar Tratamiento'}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.25rem',
                                backgroundColor: hasBlockingRec ? '#f3f4f6' : '#dcfce7',
                                color: hasBlockingRec ? '#9ca3af' : '#166534',
                                cursor: hasBlockingRec ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {generatingTratamiento === rec._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Beaker size={14} />
                                  <ArrowRight size={12} />
                                </>
                              )}
                            </button>
                          )}
                          
                          {rec.tratamiento_generado && (
                            <span style={{ 
                              padding: '0.25rem 0.5rem', 
                              backgroundColor: '#dcfce7', 
                              borderRadius: '0.25rem',
                              fontSize: '0.7rem',
                              color: '#166534'
                            }}>
                              <CheckCircle size={12} style={{ display: 'inline', marginRight: '2px' }} />
                              Tratamiento
                            </span>
                          )}
                          
                          {/* Edit Button */}
                          {canManage && !rec.tratamiento_generado && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEdit(rec)}
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          
                          {/* Delete Button */}
                          {canManage && (
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'hsl(var(--destructive))', color: 'white' }}
                              onClick={() => handleDelete(rec._id)}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
      
      {/* ====================== PLANTILLAS TAB ====================== */}
      {activeTab === 'plantillas' && (
        <>
          {/* Plantilla Form */}
          {showPlantillaForm && (
            <div className="card mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontWeight: '600' }}>
                  {editingPlantillaId ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </h3>
                <button className="btn btn-sm btn-secondary" onClick={resetPlantillaForm}>
                  <X size={16} />
                </button>
              </div>
              
              <form onSubmit={handlePlantillaSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Nombre de la Plantilla *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={plantillaForm.nombre}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej: Control preventivo de hongos"
                      required
                    />
                  </div>
                  
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Descripción</label>
                    <input
                      type="text"
                      className="form-input"
                      value={plantillaForm.descripcion}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Breve descripción del uso de esta plantilla"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={plantillaForm.tipo}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, tipo: e.target.value }))}
                    >
                      {tipos.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  
                  {plantillaForm.tipo === 'Tratamiento Fitosanitario' && (
                    <div>
                      <label className="form-label">Subtipo</label>
                      <select
                        className="form-select"
                        value={plantillaForm.subtipo}
                        onChange={(e) => setPlantillaForm(prev => ({ ...prev, subtipo: e.target.value }))}
                      >
                        <option value="">Seleccionar subtipo</option>
                        {subtipos.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {(plantillaForm.tipo === 'Tratamiento Fitosanitario' || plantillaForm.tipo === 'Fertilización') && (
                    <div>
                      <label className="form-label">Producto</label>
                      <select
                        className="form-select"
                        value={plantillaForm.producto_id}
                        onChange={(e) => {
                          const producto = fitosanitarios.find(p => p._id === e.target.value);
                          setPlantillaForm(prev => ({
                            ...prev,
                            producto_id: e.target.value,
                            producto_nombre: producto?.nombre_comercial || '',
                            dosis: producto?.dosis_max || prev.dosis,
                            unidad_dosis: producto?.unidad_dosis || prev.unidad_dosis
                          }));
                        }}
                      >
                        <option value="">Seleccionar producto (opcional)</option>
                        {fitosanitarios.map(f => (
                          <option key={f._id} value={f._id}>{f.nombre_comercial}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Dosis</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={plantillaForm.dosis}
                        onChange={(e) => setPlantillaForm(prev => ({ ...prev, dosis: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div style={{ width: '100px' }}>
                      <label className="form-label">Unidad</label>
                      <select
                        className="form-select"
                        value={plantillaForm.unidad_dosis}
                        onChange={(e) => setPlantillaForm(prev => ({ ...prev, unidad_dosis: e.target.value }))}
                      >
                        <option value="L/ha">L/ha</option>
                        <option value="Kg/ha">Kg/ha</option>
                        <option value="g/ha">g/ha</option>
                        <option value="ml/ha">ml/ha</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="form-label">Volumen Agua (L/ha)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={plantillaForm.volumen_agua}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, volumen_agua: e.target.value }))}
                      placeholder="200"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">Prioridad</label>
                    <select
                      className="form-select"
                      value={plantillaForm.prioridad}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, prioridad: e.target.value }))}
                    >
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>
                  
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Motivo / Justificación</label>
                    <input
                      type="text"
                      className="form-input"
                      value={plantillaForm.motivo}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, motivo: e.target.value }))}
                      placeholder="Ej: Prevención de enfermedades fúngicas"
                    />
                  </div>
                  
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Observaciones</label>
                    <textarea
                      className="form-textarea"
                      value={plantillaForm.observaciones}
                      onChange={(e) => setPlantillaForm(prev => ({ ...prev, observaciones: e.target.value }))}
                      rows={2}
                      placeholder="Notas adicionales para quien use esta plantilla..."
                    />
                  </div>
                </div>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={resetPlantillaForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingPlantillaId ? 'Actualizar Plantilla' : 'Crear Plantilla'}
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {/* Plantillas List */}
          <div className="card">
            <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>
              Plantillas de Recomendaciones ({plantillas.length})
            </h3>
            
            {plantillas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
                <Layers size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No hay plantillas creadas</p>
                <p className="text-sm" style={{ marginTop: '0.5rem' }}>
                  {canManagePlantillas ? 'Cree plantillas para agilizar la creación de recomendaciones' : 'Contacte a un administrador para crear plantillas'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Producto</th>
                      <th>Dosis</th>
                      <th>Prioridad</th>
                      <th>Usos</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plantillas.map((plantilla) => {
                      const prioridadStyle = PRIORIDAD_COLORS[plantilla.prioridad] || PRIORIDAD_COLORS['Media'];
                      
                      return (
                        <tr key={plantilla._id} style={{ opacity: plantilla.activo ? 1 : 0.6 }}>
                          <td>
                            <div style={{ fontWeight: '500' }}>{plantilla.nombre}</div>
                            {plantilla.descripcion && (
                              <div className="text-sm text-muted">{plantilla.descripcion}</div>
                            )}
                          </td>
                          <td>
                            <div>{plantilla.tipo}</div>
                            {plantilla.subtipo && <div className="text-sm text-muted">{plantilla.subtipo}</div>}
                          </td>
                          <td>{plantilla.producto_nombre || '-'}</td>
                          <td>{plantilla.dosis ? `${plantilla.dosis} ${plantilla.unidad_dosis}` : '-'}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: prioridadStyle.bg,
                              color: prioridadStyle.text
                            }}>
                              {plantilla.prioridad}
                            </span>
                          </td>
                          <td>
                            <span style={{ 
                              padding: '0.25rem 0.5rem', 
                              backgroundColor: 'hsl(var(--muted))', 
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem'
                            }}>
                              {plantilla.usos_count || 0}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleTogglePlantillaActivo(plantilla)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: plantilla.activo ? '#16a34a' : '#9ca3af'
                              }}
                              title={plantilla.activo ? 'Desactivar' : 'Activar'}
                            >
                              {plantilla.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                              <span className="text-sm">{plantilla.activo ? 'Activa' : 'Inactiva'}</span>
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {canManage && (
                                <button
                                  className="btn btn-sm"
                                  style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                                  onClick={() => {
                                    setSelectedPlantilla(plantilla);
                                    setShowAplicacionMasiva(true);
                                  }}
                                  title="Aplicar a múltiples parcelas"
                                >
                                  <Zap size={14} />
                                </button>
                              )}
                              {canManagePlantillas && (
                                <>
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleEditPlantilla(plantilla)}
                                    title="Editar"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    className="btn btn-sm"
                                    style={{ backgroundColor: 'hsl(var(--destructive))', color: 'white' }}
                                    onClick={() => handleDeletePlantilla(plantilla._id)}
                                    title="Eliminar"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* ====================== MODALS ====================== */}
      
      {/* Modal: Selector de Plantillas */}
      {showPlantillaSelector && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowPlantillaSelector(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '600px',
            width: '90%',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div className="modal-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem 1.5rem',
              borderBottom: '1px solid hsl(var(--border))'
            }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} /> Seleccionar Plantilla
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowPlantillaSelector(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {plantillas.filter(p => p.activo).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                  <p>No hay plantillas activas disponibles</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {plantillas.filter(p => p.activo).map(plantilla => (
                    <div 
                      key={plantilla._id}
                      style={{
                        padding: '1rem',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => handleUsePlantilla(plantilla)}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'hsl(var(--muted))'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{plantilla.nombre}</div>
                          <div className="text-sm text-muted">{plantilla.tipo} {plantilla.subtipo ? `- ${plantilla.subtipo}` : ''}</div>
                          {plantilla.producto_nombre && (
                            <div className="text-sm" style={{ color: '#166534' }}>
                              Producto: {plantilla.producto_nombre} ({plantilla.dosis} {plantilla.unidad_dosis})
                            </div>
                          )}
                        </div>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.7rem',
                          backgroundColor: PRIORIDAD_COLORS[plantilla.prioridad]?.bg,
                          color: PRIORIDAD_COLORS[plantilla.prioridad]?.text
                        }}>
                          {plantilla.prioridad}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal: Aplicación Masiva */}
      {showAplicacionMasiva && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => { setShowAplicacionMasiva(false); setSelectedPlantilla(null); setSelectedParcelas([]); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '800px',
            width: '90%',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div className="modal-header" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem 1.5rem',
              borderBottom: '1px solid hsl(var(--border))'
            }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} /> Aplicación Masiva
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => { setShowAplicacionMasiva(false); setSelectedPlantilla(null); setSelectedParcelas([]); }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              {/* Step 1: Select Template */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>1. Seleccionar Plantilla</label>
                <select
                  className="form-select"
                  value={selectedPlantilla?._id || ''}
                  onChange={(e) => {
                    const plantilla = plantillas.find(p => p._id === e.target.value);
                    setSelectedPlantilla(plantilla || null);
                  }}
                >
                  <option value="">Seleccionar plantilla...</option>
                  {plantillas.filter(p => p.activo).map(p => (
                    <option key={p._id} value={p._id}>
                      {p.nombre} - {p.tipo} {p.producto_nombre ? `(${p.producto_nombre})` : ''}
                    </option>
                  ))}
                </select>
                
                {selectedPlantilla && (
                  <div style={{ 
                    marginTop: '0.75rem', 
                    padding: '0.75rem', 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}>
                    <strong>{selectedPlantilla.nombre}</strong>
                    <div className="text-muted">
                      {selectedPlantilla.tipo} {selectedPlantilla.subtipo ? `- ${selectedPlantilla.subtipo}` : ''}
                      {selectedPlantilla.producto_nombre && ` | ${selectedPlantilla.producto_nombre}`}
                      {selectedPlantilla.dosis && ` | ${selectedPlantilla.dosis} ${selectedPlantilla.unidad_dosis}`}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Step 2: Select Parcelas */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: '600', margin: 0 }}>
                    2. Seleccionar Parcelas ({selectedParcelas.length} seleccionadas)
                  </label>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={handleSelectAllParcelas}
                  >
                    {selectedParcelas.length === parcelas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                
                <div style={{ 
                  maxHeight: '250px', 
                  overflowY: 'auto', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '0.5rem',
                  padding: '0.5rem'
                }}>
                  {parcelas.map(parcela => (
                    <label 
                      key={parcela._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderRadius: '0.25rem',
                        backgroundColor: selectedParcelas.includes(parcela._id) ? '#dcfce7' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParcelas.includes(parcela._id)}
                        onChange={() => handleToggleParcelaSelection(parcela._id)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '500' }}>{parcela.codigo_plantacion}</div>
                        <div className="text-sm text-muted">
                          {parcela.cultivo} {parcela.variedad ? `(${parcela.variedad})` : ''} | {parcela.superficie_total} ha
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Optional: Date */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Fecha Programada (opcional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_programada: e.target.value }))}
                  style={{ maxWidth: '200px' }}
                />
              </div>
            </div>
            
            <div className="modal-footer" style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '0.5rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid hsl(var(--border))'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => { setShowAplicacionMasiva(false); setSelectedPlantilla(null); setSelectedParcelas([]); }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAplicacionMasiva}
                disabled={!selectedPlantilla || selectedParcelas.length === 0 || aplicacionMasivaLoading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {aplicacionMasivaLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Creando...</>
                ) : (
                  <><Zap size={16} /> Crear {selectedParcelas.length} Recomendación(es)</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recomendaciones;
