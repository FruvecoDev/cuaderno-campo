import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Brain, Sparkles, Bug, TrendingUp, Loader2, AlertTriangle, 
  CheckCircle2, ChevronDown, ChevronUp, Leaf, Package, Calendar,
  BarChart3, Lightbulb, Shield, Clock, Target, ArrowRight, FileSignature,
  DollarSign, AlertCircle, History, Eye, X, Zap, FileText,
  MessageCircle, Send, Plus, Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import '../App.css';


// Tab type constants
const TABS = {
  TREATMENTS: 'treatments',
  PREDICTIONS: 'predictions',
  CONTRACTS: 'contracts',
  HISTORY: 'history',
  CHAT: 'chat'
};

const AsistenteIA = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.TREATMENTS);
  
  // Treatment Suggestions State
  const [parcelas, setParcelas] = useState([]);
  const [selectedParcela, setSelectedParcela] = useState('');
  const [problema, setProblema] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionsError, setSuggestionsError] = useState(null);
  
  // Yield Prediction State
  const [contratos, setContratos] = useState([]);
  const [selectedContrato, setSelectedContrato] = useState('');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState(null);
  
  // Expanded sections
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const [expandedRisk, setExpandedRisk] = useState(null);

  // Contract Summary State
  const [selectedContratoSummary, setSelectedContratoSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [contractSummary, setContractSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  // AI Dashboard/History State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Chat State
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = React.useRef(null);

  useEffect(() => {
    fetchParcelas();
    fetchContratos();
    fetchDashboard();
  }, []);

  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/ai/parcelas-for-suggestions');
      setParcelas(data.parcelas || []);
    } catch (err) {
      console.error('Error fetching parcelas:', err);
    }
  };

  const fetchContratos = async () => {
    try {
      const data = await api.get('/api/ai/contratos-for-predictions');
      setContratos(data.contratos || []);
    } catch (err) {
      console.error('Error fetching contratos:', err);
    }
  };

  const fetchDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const data = await api.get('/api/ai/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching AI dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchReportDetail = async (reportId) => {
    setLoadingReport(true);
    try {
      const data = await api.get(`/api/ai/report-detail/${reportId}`);
      if (data.success) {
        setSelectedReport(data.report);
      }
    } catch (err) {
      console.error('Error fetching report detail:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Chat functions
  const fetchChatSessions = async () => {
    try {
      const data = await api.get('/api/ai/chat/sessions');
      setChatSessions(data.sessions || []);
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
    }
  };

  const loadChatSession = async (sessionId) => {
    setCurrentSessionId(sessionId);
    try {
      const data = await api.get(`/api/ai/chat/history/${sessionId}`);
      setChatMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId('');
    setChatMessages([]);
    setChatInput('');
  };

  const handleSendMessage = async () => {
    const text = chatInput.trim();
    if (!text || sendingMessage) return;

    // Optimistic UI: add user message
    const tempUserMsg = { id: 'temp-user', role: 'user', content: text, created_at: new Date().toISOString() };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setChatInput('');
    setSendingMessage(true);

    try {
      const data = await api.post('/api/ai/chat', {
        session_id: currentSessionId,
        message: text
      });

      if (data.success) {
        // Update session id if new
        if (!currentSessionId && data.session_id) {
          setCurrentSessionId(data.session_id);
          fetchChatSessions();
        }
        // Add assistant response
        const assistantMsg = {
          id: 'resp-' + Date.now(),
          role: 'assistant',
          content: data.response,
          generation_time_seconds: data.generation_time_seconds,
          created_at: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: 'err-' + Date.now(), role: 'assistant',
        content: 'Error al procesar el mensaje. Inténtalo de nuevo.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteChatSession = async (sessionId) => {
    try {
      await api.delete(`/api/ai/chat/session/${sessionId}`);
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        startNewChat();
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Auto-scroll chat
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Generate treatment suggestions
  const handleGenerateSuggestions = async () => {
    if (!selectedParcela || !problema.trim()) {
      setSuggestionsError('Selecciona una parcela y describe el problema');
      return;
    }

    setLoadingSuggestions(true);
    setSuggestionsError(null);
    setSuggestions(null);

    try {
      const parcela = parcelas.find(p => p._id === selectedParcela);
      const data = await api.post(
        `/api/ai/suggest-treatments/${selectedParcela}?problema=${encodeURIComponent(problema)}&cultivo=${encodeURIComponent(parcela?.cultivo || '')}`
      );

      if (data.success) {
        setSuggestions(data);
        fetchDashboard();
      } else {
        throw new Error('No se pudieron generar las sugerencias');
      }
    } catch (err) {
      setSuggestionsError(api.getErrorMessage(err));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Generate yield prediction
  const handleGeneratePrediction = async () => {
    if (!selectedContrato) {
      setPredictionError('Selecciona un contrato');
      return;
    }

    setLoadingPrediction(true);
    setPredictionError(null);
    setPrediction(null);

    try {
      const data = await api.post(`/api/ai/predict-yield/${selectedContrato}`);

      if (data.success) {
        setPrediction(data);
        fetchDashboard();
      } else {
        throw new Error('No se pudo generar la predicción');
      }
    } catch (err) {
      setPredictionError(api.getErrorMessage(err));
    } finally {
      setLoadingPrediction(false);
    }
  };

  // Generate contract summary
  const handleGenerateSummary = async () => {
    if (!selectedContratoSummary) {
      setSummaryError('Selecciona un contrato');
      return;
    }

    setLoadingSummary(true);
    setSummaryError(null);
    setContractSummary(null);

    try {
      const data = await api.post(`/api/ai/summarize-contract/${selectedContratoSummary}`);

      if (data.success) {
        setContractSummary(data);
        fetchDashboard();
      } else {
        throw new Error('No se pudo generar el resumen');
      }
    } catch (err) {
      setSummaryError(api.getErrorMessage(err));
    } finally {
      setLoadingSummary(false);
    }
  };

  // Severity badge component
  const SeverityBadge = ({ severity }) => {
    const colors = {
      'Baja': { bg: '#dcfce7', color: '#166534' },
      'Media': { bg: '#fef9c3', color: '#854d0e' },
      'Alta': { bg: '#fed7aa', color: '#c2410c' },
      'Crítica': { bg: '#fecaca', color: '#dc2626' }
    };
    const style = colors[severity] || colors['Media'];
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {severity}
      </span>
    );
  };

  // Priority badge
  const PriorityBadge = ({ priority }) => {
    const colors = {
      1: { bg: '#fecaca', color: '#dc2626', label: 'Prioritario' },
      2: { bg: '#fed7aa', color: '#c2410c', label: 'Alto' },
      3: { bg: '#fef9c3', color: '#854d0e', label: 'Medio' }
    };
    const style = colors[priority] || colors[3];
    
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '8px',
        fontSize: '0.7rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color
      }}>
        #{priority} {style.label}
      </span>
    );
  };

  // Impact badge
  const ImpactBadge = ({ impact }) => {
    const colors = {
      'Bajo': { bg: '#dcfce7', color: '#166534' },
      'Medio': { bg: '#fef9c3', color: '#854d0e' },
      'Alto': { bg: '#fecaca', color: '#dc2626' }
    };
    const style = colors[impact] || colors['Medio'];
    
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '8px',
        fontSize: '0.7rem',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        Impacto {impact}
      </span>
    );
  };

  return (
    <div data-testid="asistente-ia-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Brain size={32} style={{ color: '#7c3aed' }} />
            Asistente de Inteligencia Artificial
          </h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
            Obtén recomendaciones inteligentes basadas en datos de tu campo
          </p>
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '0.75rem', 
        marginBottom: '2rem' 
      }}>
        {/* Treatment Suggestions Card */}
        <div 
          className="card" 
          style={{ 
            cursor: 'pointer',
            border: activeTab === TABS.TREATMENTS ? '2px solid #7c3aed' : '1px solid hsl(var(--border))',
            backgroundColor: activeTab === TABS.TREATMENTS ? '#f5f3ff' : 'white',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setActiveTab(TABS.TREATMENTS)}
          data-testid="tab-treatments"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              backgroundColor: '#7c3aed',
              color: 'white'
            }}>
              <Bug size={28} />
            </div>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Sugerencias de Tratamientos
              </h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                Describe un problema (plaga, enfermedad, deficiencia) y obtén recomendaciones de tratamiento personalizadas basadas en tu parcela y productos disponibles.
              </p>
            </div>
          </div>
        </div>

        {/* Yield Prediction Card */}
        <div 
          className="card" 
          style={{ 
            cursor: 'pointer',
            border: activeTab === TABS.PREDICTIONS ? '2px solid #059669' : '1px solid hsl(var(--border))',
            backgroundColor: activeTab === TABS.PREDICTIONS ? '#ecfdf5' : 'white',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setActiveTab(TABS.PREDICTIONS)}
          data-testid="tab-predictions"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              backgroundColor: '#059669',
              color: 'white'
            }}>
              <TrendingUp size={28} />
            </div>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Predicción de Cosecha
              </h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                Obtén estimaciones de rendimiento para tus contratos basadas en datos históricos, tratamientos aplicados y estado actual del cultivo.
              </p>
            </div>
          </div>
        </div>

        {/* Contract Summary Card */}
        <div 
          className="card" 
          style={{ 
            cursor: 'pointer',
            border: activeTab === TABS.CONTRACTS ? '2px solid #2563eb' : '1px solid hsl(var(--border))',
            backgroundColor: activeTab === TABS.CONTRACTS ? '#eff6ff' : 'white',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setActiveTab(TABS.CONTRACTS)}
          data-testid="tab-contracts"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              backgroundColor: '#2563eb',
              color: 'white'
            }}>
              <FileSignature size={28} />
            </div>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Resumen de Contratos
              </h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                Genera resúmenes ejecutivos inteligentes de tus contratos con análisis de cumplimiento, financiero y recomendaciones.
              </p>
            </div>
          </div>
        </div>

        {/* History Card */}
        <div 
          className="card" 
          style={{ 
            cursor: 'pointer',
            border: activeTab === TABS.HISTORY ? '2px solid #d97706' : '1px solid hsl(var(--border))',
            backgroundColor: activeTab === TABS.HISTORY ? '#fffbeb' : 'white',
            transition: 'all 0.2s ease'
          }}
          onClick={() => { setActiveTab(TABS.HISTORY); fetchDashboard(); }}
          data-testid="tab-history"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              backgroundColor: '#d97706',
              color: 'white'
            }}>
              <History size={28} />
            </div>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Historial y Métricas
              </h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                Consulta el historial de todos los análisis IA generados con métricas de uso y actividad.
              </p>
            </div>
          </div>
        </div>

        {/* Chat Card */}
        <div 
          className="card" 
          style={{ 
            cursor: 'pointer',
            border: activeTab === TABS.CHAT ? '2px solid #0891b2' : '1px solid hsl(var(--border))',
            backgroundColor: activeTab === TABS.CHAT ? '#ecfeff' : 'white',
            transition: 'all 0.2s ease'
          }}
          onClick={() => { setActiveTab(TABS.CHAT); fetchChatSessions(); }}
          data-testid="tab-chat"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ 
              padding: '1rem', 
              borderRadius: '12px', 
              backgroundColor: '#0891b2',
              color: 'white'
            }}>
              <MessageCircle size={28} />
            </div>
            <div>
              <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Chat Agrónomo
              </h3>
              <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                Consulta con un agrónomo IA experto sobre tus cultivos, plagas y tratamientos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Treatment Suggestions Panel */}
      {activeTab === TABS.TREATMENTS && (
        <div className="card" data-testid="panel-treatments">
          <h2 style={{ fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: '#7c3aed' }} />
            Generar Sugerencias de Tratamiento
          </h2>

          {/* Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Parcela *</label>
              <select
                className="form-select"
                value={selectedParcela}
                onChange={(e) => setSelectedParcela(e.target.value)}
                data-testid="select-parcela"
              >
                <option value="">Seleccionar parcela...</option>
                {parcelas.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.codigo_plantacion} - {p.cultivo} ({p.proveedor})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Problema o Síntomas Observados *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej: Hojas amarillas, presencia de pulgón, manchas en el tallo..."
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
                data-testid="input-problema"
              />
            </div>
          </div>

          {/* Selected parcel info */}
          {selectedParcela && (
            <div style={{
              backgroundColor: '#f5f3ff',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #ddd6fe'
            }}>
              {(() => {
                const p = parcelas.find(x => x._id === selectedParcela);
                return p ? (
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                    <div><Leaf size={14} style={{ display: 'inline', marginRight: '4px' }} /><strong>Cultivo:</strong> {p.cultivo}</div>
                    <div><Package size={14} style={{ display: 'inline', marginRight: '4px' }} /><strong>Variedad:</strong> {p.variedad}</div>
                    <div><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /><strong>Campaña:</strong> {p.campana}</div>
                    <div><Target size={14} style={{ display: 'inline', marginRight: '4px' }} /><strong>Superficie:</strong> {p.superficie} ha</div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleGenerateSuggestions}
            disabled={loadingSuggestions || !selectedParcela || !problema.trim()}
            style={{ 
              backgroundColor: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            data-testid="btn-generate-suggestions"
          >
            {loadingSuggestions ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Analizando...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generar Sugerencias IA
              </>
            )}
          </button>

          {/* Error */}
          {suggestionsError && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#dc2626'
            }}>
              <AlertTriangle size={18} />
              {suggestionsError}
            </div>
          )}

          {/* Results */}
          {suggestions && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: '500', color: '#166534' }}>
                  Análisis completado en {suggestions.metadata?.generation_time_seconds}s
                </span>
              </div>

              {/* Problem identified */}
              <div className="card" style={{ marginBottom: '1rem', border: '1px solid #ddd6fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Problema Identificado</h4>
                    <p>{suggestions.suggestions?.problema_identificado}</p>
                  </div>
                  <SeverityBadge severity={suggestions.suggestions?.severidad_estimada} />
                </div>
              </div>

              {/* Suggestions list */}
              <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lightbulb size={18} style={{ color: '#7c3aed' }} />
                Tratamientos Recomendados ({suggestions.suggestions?.sugerencias?.length || 0})
              </h4>

              {suggestions.suggestions?.sugerencias?.map((sug, idx) => (
                <div 
                  key={idx} 
                  className="card" 
                  style={{ 
                    marginBottom: '0.75rem',
                    border: expandedSuggestion === idx ? '2px solid #7c3aed' : '1px solid hsl(var(--border))'
                  }}
                >
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedSuggestion(expandedSuggestion === idx ? null : idx)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <PriorityBadge priority={sug.prioridad} />
                      <div>
                        <div style={{ fontWeight: '600' }}>{sug.producto_recomendado}</div>
                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                          {sug.tipo_tratamiento} - {sug.materia_activa}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: '#7c3aed' }}>{sug.dosis_recomendada}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{sug.metodo_aplicacion}</div>
                      </div>
                      {expandedSuggestion === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {expandedSuggestion === idx && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Momento de Aplicación:</strong>
                          <p>{sug.momento_aplicacion}</p>
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Plazo de Seguridad:</strong>
                          <p style={{ fontWeight: '600', color: '#dc2626' }}>{sug.plazo_seguridad_dias} días</p>
                        </div>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Justificación:</strong>
                        <p>{sug.justificacion}</p>
                      </div>
                      {sug.precauciones?.length > 0 && (
                        <div style={{ 
                          backgroundColor: '#fef9c3', 
                          padding: '0.75rem', 
                          borderRadius: '8px',
                          border: '1px solid #fde68a'
                        }}>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                            <Shield size={14} /> Precauciones:
                          </strong>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                            {sug.precauciones.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Preventive measures */}
              {suggestions.suggestions?.medidas_preventivas?.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#166534' }}>
                    Medidas Preventivas Recomendadas
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {suggestions.suggestions.medidas_preventivas.map((m, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up */}
              {suggestions.suggestions?.seguimiento_recomendado && (
                <div className="card" style={{ marginTop: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={16} /> Seguimiento Recomendado
                  </h4>
                  <p>{suggestions.suggestions.seguimiento_recomendado}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Yield Prediction Panel */}
      {activeTab === TABS.PREDICTIONS && (
        <div className="card" data-testid="panel-predictions">
          <h2 style={{ fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: '#059669' }} />
            Predicción de Rendimiento de Cosecha
          </h2>

          {/* Form */}
          <div className="form-group">
            <label className="form-label">Contrato *</label>
            <select
              className="form-select"
              value={selectedContrato}
              onChange={(e) => setSelectedContrato(e.target.value)}
              style={{ maxWidth: '500px' }}
              data-testid="select-contrato"
            >
              <option value="">Seleccionar contrato...</option>
              {contratos.map(c => (
                <option key={c._id} value={c._id}>
                  {c.proveedor} - {c.cultivo} {c.variedad ? `(${c.variedad})` : ''} | {c.campana} | {c.cantidad?.toLocaleString()} kg
                </option>
              ))}
            </select>
          </div>

          {/* Selected contract info */}
          {selectedContrato && (
            <div style={{
              backgroundColor: '#ecfdf5',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #a7f3d0'
            }}>
              {(() => {
                const c = contratos.find(x => x._id === selectedContrato);
                return c ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', fontSize: '0.875rem' }}>
                    <div><strong>Proveedor:</strong> {c.proveedor}</div>
                    <div><strong>Cultivo:</strong> {c.cultivo} {c.variedad ? `(${c.variedad})` : ''}</div>
                    <div><strong>Campaña:</strong> {c.campana}</div>
                    <div><strong>Contratado:</strong> {c.cantidad?.toLocaleString()} kg a {c.precio} €/kg</div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleGeneratePrediction}
            disabled={loadingPrediction || !selectedContrato}
            style={{ 
              backgroundColor: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            data-testid="btn-generate-prediction"
          >
            {loadingPrediction ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Calculando predicción...
              </>
            ) : (
              <>
                <TrendingUp size={18} />
                Generar Predicción IA
              </>
            )}
          </button>

          {/* Error */}
          {predictionError && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#dc2626'
            }}>
              <AlertTriangle size={18} />
              {predictionError}
            </div>
          )}

          {/* Results */}
          {prediction && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: '500', color: '#166534' }}>
                  Predicción generada en {prediction.metadata?.generation_time_seconds}s para {prediction.metadata?.superficie_total_ha} ha
                </span>
              </div>

              {/* Main prediction */}
              <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #059669', backgroundColor: '#f0fdf4' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '1rem', color: '#166534' }}>
                  Predicción de Rendimiento
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Kilos Estimados Total</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>
                      {prediction.prediction?.prediccion_rendimiento?.kilos_estimados_total?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>kg</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Rendimiento por Ha</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2563eb' }}>
                      {prediction.prediction?.prediccion_rendimiento?.kilos_por_hectarea?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>kg/ha</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Cumplimiento Contrato</div>
                    <div style={{ 
                      fontSize: '2rem', 
                      fontWeight: '700', 
                      color: prediction.prediction?.prediccion_rendimiento?.comparacion_contrato?.porcentaje_cumplimiento >= 100 ? '#16a34a' : '#dc2626'
                    }}>
                      {prediction.prediction?.prediccion_rendimiento?.comparacion_contrato?.porcentaje_cumplimiento?.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                      {prediction.prediction?.prediccion_rendimiento?.comparacion_contrato?.diferencia_estimada_kg > 0 ? '+' : ''}
                      {prediction.prediction?.prediccion_rendimiento?.comparacion_contrato?.diferencia_estimada_kg?.toLocaleString()} kg
                    </div>
                  </div>
                </div>

                {/* Confidence range */}
                {prediction.prediction?.prediccion_rendimiento?.rango_confianza && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '500' }}>Rango de Confianza ({prediction.prediction.prediccion_rendimiento.rango_confianza.nivel_confianza})</span>
                      <span>
                        <strong>{prediction.prediction.prediccion_rendimiento.rango_confianza.minimo_kg?.toLocaleString()}</strong> - <strong>{prediction.prediction.prediccion_rendimiento.rango_confianza.maximo_kg?.toLocaleString()}</strong> kg
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Two columns: Positive factors & Risks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Positive factors */}
                <div className="card" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={18} /> Factores Positivos
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {prediction.prediction?.factores_positivos?.map((f, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{f}</li>
                    ))}
                  </ul>
                </div>

                {/* Risk factors */}
                <div className="card" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} /> Factores de Riesgo
                  </h4>
                  {prediction.prediction?.factores_riesgo?.map((risk, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        marginBottom: '0.5rem', 
                        padding: '0.5rem', 
                        backgroundColor: 'white', 
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedRisk(expandedRisk === idx ? null : idx)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>{risk.factor}</span>
                        <ImpactBadge impact={risk.impacto_potencial} />
                      </div>
                      {expandedRisk === idx && risk.mitigacion && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef9c3', borderRadius: '4px', fontSize: '0.85rem' }}>
                          <strong>Mitigación:</strong> {risk.mitigacion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical comparison */}
              {prediction.prediction?.comparacion_historica && (
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Comparación Histórica</h4>
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: 'hsl(var(--muted-foreground))' }}>Rendimiento promedio anterior:</span>
                      <strong style={{ marginLeft: '0.5rem' }}>
                        {prediction.prediction.comparacion_historica.rendimiento_promedio_anterior_kg_ha?.toLocaleString()} kg/ha
                      </strong>
                    </div>
                    <div style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '12px',
                      backgroundColor: prediction.prediction.comparacion_historica.tendencia === 'Superior' ? '#dcfce7' : 
                                       prediction.prediction.comparacion_historica.tendencia === 'Inferior' ? '#fecaca' : '#fef9c3',
                      color: prediction.prediction.comparacion_historica.tendencia === 'Superior' ? '#166534' : 
                             prediction.prediction.comparacion_historica.tendencia === 'Inferior' ? '#dc2626' : '#854d0e',
                      fontWeight: '600'
                    }}>
                      {prediction.prediction.comparacion_historica.tendencia} ({prediction.prediction.comparacion_historica.variacion_porcentual > 0 ? '+' : ''}{prediction.prediction.comparacion_historica.variacion_porcentual}%)
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {prediction.prediction?.recomendaciones?.length > 0 && (
                <div className="card" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lightbulb size={18} /> Recomendaciones para Maximizar Rendimiento
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {prediction.prediction.recomendaciones.map((r, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estimated harvest date */}
              {prediction.prediction?.fecha_estimada_cosecha && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef9c3', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  <strong>Fecha estimada de cosecha:</strong> {prediction.prediction.fecha_estimada_cosecha}
                </div>
              )}

              {/* Notes */}
              {prediction.prediction?.notas && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <strong>Notas:</strong> {prediction.prediction.notas}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contract Summary Panel */}
      {activeTab === TABS.CONTRACTS && (
        <div className="card" data-testid="panel-contracts">
          <h2 style={{ fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSignature size={20} style={{ color: '#2563eb' }} />
            Resumen Ejecutivo de Contrato
          </h2>

          {/* Form */}
          <div className="form-group">
            <label className="form-label">Contrato *</label>
            <select
              className="form-select"
              value={selectedContratoSummary}
              onChange={(e) => setSelectedContratoSummary(e.target.value)}
              style={{ maxWidth: '500px' }}
              data-testid="select-contrato-summary"
            >
              <option value="">Seleccionar contrato...</option>
              {contratos.map(c => (
                <option key={c._id} value={c._id}>
                  {c.proveedor} - {c.cultivo} {c.variedad ? `(${c.variedad})` : ''} | {c.campana} | {c.cantidad?.toLocaleString()} kg
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerateSummary}
            disabled={loadingSummary || !selectedContratoSummary}
            style={{ 
              backgroundColor: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            data-testid="btn-generate-summary"
          >
            {loadingSummary ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Generando resumen...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generar Resumen IA
              </>
            )}
          </button>

          {/* Error */}
          {summaryError && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#dc2626'
            }}>
              <AlertTriangle size={18} />
              {summaryError}
            </div>
          )}

          {/* Results */}
          {contractSummary && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                <span style={{ fontWeight: '500', color: '#166534' }}>
                  Resumen generado en {contractSummary.metadata?.generation_time_seconds}s
                </span>
              </div>

              {/* Title and Executive Summary */}
              <div className="card" style={{ marginBottom: '1rem', border: '2px solid #2563eb', backgroundColor: '#eff6ff' }}>
                <h3 style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '1rem', color: '#1e40af' }}>
                  {contractSummary.summary?.titulo}
                </h3>
                <p style={{ lineHeight: '1.7' }}>{contractSummary.summary?.resumen_ejecutivo}</p>
              </div>

              {/* Key Data */}
              {contractSummary.summary?.datos_clave?.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '1rem' }}>Datos Clave</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {contractSummary.summary.datos_clave.map((d, i) => (
                      <div key={i} style={{
                        padding: '0.75rem',
                        backgroundColor: d.estado === 'OK' ? '#f0fdf4' : d.estado === 'Alerta' ? '#fef9c3' : '#fef2f2',
                        border: `1px solid ${d.estado === 'OK' ? '#bbf7d0' : d.estado === 'Alerta' ? '#fde68a' : '#fecaca'}`,
                        borderRadius: '8px'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{d.concepto}</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{d.valor}</div>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          backgroundColor: d.estado === 'OK' ? '#dcfce7' : d.estado === 'Alerta' ? '#fef9c3' : '#fecaca',
                          color: d.estado === 'OK' ? '#166534' : d.estado === 'Alerta' ? '#854d0e' : '#dc2626'
                        }}>{d.estado}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance and Financial Analysis - two columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Compliance */}
                {contractSummary.summary?.estado_cumplimiento && (
                  <div className="card" style={{ border: '1px solid #a7f3d0' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Target size={18} style={{ color: '#059669' }} /> Estado de Cumplimiento
                    </h4>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669' }}>
                        {contractSummary.summary.estado_cumplimiento.porcentaje_entrega}%
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>de entrega</div>
                    </div>
                    <div style={{
                      padding: '0.5rem',
                      backgroundColor: contractSummary.summary.estado_cumplimiento.valoracion === 'Completado' ? '#dcfce7' :
                                       contractSummary.summary.estado_cumplimiento.valoracion === 'En plazo' ? '#dbeafe' :
                                       contractSummary.summary.estado_cumplimiento.valoracion === 'Retrasado' ? '#fef9c3' : '#fecaca',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      {contractSummary.summary.estado_cumplimiento.valoracion}
                    </div>
                    {contractSummary.summary.estado_cumplimiento.kilos_pendientes > 0 && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', textAlign: 'center' }}>
                        <strong>{contractSummary.summary.estado_cumplimiento.kilos_pendientes?.toLocaleString()}</strong> kg pendientes
                      </div>
                    )}
                  </div>
                )}

                {/* Financial Analysis */}
                {contractSummary.summary?.analisis_financiero && (
                  <div className="card" style={{ border: '1px solid #bfdbfe' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <DollarSign size={18} style={{ color: '#2563eb' }} /> Análisis Financiero
                    </h4>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '4px' }}>
                        <span>Valor Total Contrato</span>
                        <strong>{contractSummary.summary.analisis_financiero.valor_total_contrato?.toLocaleString()} €</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#f0fdf4', borderRadius: '4px' }}>
                        <span>Ingresos Actuales</span>
                        <strong style={{ color: '#16a34a' }}>{contractSummary.summary.analisis_financiero.ingresos_actuales?.toLocaleString()} €</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>
                        <span>Costes Tratamientos</span>
                        <strong style={{ color: '#dc2626' }}>{contractSummary.summary.analisis_financiero.costes_tratamientos?.toLocaleString()} €</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#eff6ff', borderRadius: '4px', borderTop: '2px solid #2563eb' }}>
                        <span style={{ fontWeight: '600' }}>Margen Estimado</span>
                        <strong style={{ color: '#2563eb' }}>{contractSummary.summary.analisis_financiero.margen_estimado?.toLocaleString()} €</strong>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          backgroundColor: contractSummary.summary.analisis_financiero.rentabilidad === 'Alta' ? '#dcfce7' :
                                           contractSummary.summary.analisis_financiero.rentabilidad === 'Media' ? '#fef9c3' : '#fecaca',
                          color: contractSummary.summary.analisis_financiero.rentabilidad === 'Alta' ? '#166534' :
                                 contractSummary.summary.analisis_financiero.rentabilidad === 'Media' ? '#854d0e' : '#dc2626'
                        }}>
                          Rentabilidad: {contractSummary.summary.analisis_financiero.rentabilidad}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Strengths and Risks - two columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {contractSummary.summary?.puntos_fuertes?.length > 0 && (
                  <div className="card" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} /> Puntos Fuertes
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {contractSummary.summary.puntos_fuertes.map((p, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {contractSummary.summary?.riesgos?.length > 0 && (
                  <div className="card" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} /> Riesgos Identificados
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                      {contractSummary.summary.riesgos.map((r, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {contractSummary.summary?.recomendaciones?.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lightbulb size={18} /> Recomendaciones
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {contractSummary.summary.recomendaciones.map((r, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {contractSummary.summary?.proximos_pasos?.length > 0 && (
                <div className="card" style={{ backgroundColor: '#fef9c3', border: '1px solid #fde68a' }}>
                  <h4 style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRight size={18} /> Próximos Pasos
                  </h4>
                  <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {contractSummary.summary.proximos_pasos.map((p, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History & Metrics Panel */}
      {activeTab === TABS.HISTORY && (
        <div data-testid="panel-history">
          {loadingDashboard ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#d97706' }} />
              <p style={{ marginTop: '1rem', color: 'hsl(var(--muted-foreground))' }}>Cargando métricas...</p>
            </div>
          ) : dashboardData ? (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #d97706' }}>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>Total Informes IA</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#d97706' }}>{dashboardData.total_reports}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #7c3aed' }}>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>Tratamientos</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#7c3aed' }}>{dashboardData.by_type?.treatment_suggestion || 0}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #059669' }}>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>Predicciones</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#059669' }}>{dashboardData.by_type?.yield_prediction || 0}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid #2563eb' }}>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>Resúmenes</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#2563eb' }}>{dashboardData.by_type?.contract_summary || 0}</div>
                </div>
              </div>

              {/* Activity Chart + Avg Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card">
                  <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={18} style={{ color: '#d97706' }} /> Actividad IA (Últimos 30 días)
                  </h4>
                  {dashboardData.activity?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dashboardData.activity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                        <YAxis allowDecimals={false} fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="treatment_suggestion" name="Tratamientos" fill="#7c3aed" stackId="a" />
                        <Bar dataKey="yield_prediction" name="Predicciones" fill="#059669" stackId="a" />
                        <Bar dataKey="contract_summary" name="Resúmenes" fill="#2563eb" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                      <History size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                      <p>Aún no hay actividad registrada. Genera tu primer informe IA.</p>
                    </div>
                  )}
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Zap size={32} style={{ color: '#d97706', marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>Tiempo Medio de Generación</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#d97706' }}>
                    {dashboardData.avg_generation_time || 0}s
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                    Modelo: GPT-4o
                  </div>
                </div>
              </div>

              {/* Recent Reports Table */}
              <div className="card">
                <h4 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} style={{ color: '#d97706' }} /> Historial de Informes Recientes
                </h4>
                {dashboardData.recent_reports?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Tipo</th>
                          <th>Título</th>
                          <th>Entidad</th>
                          <th>Tiempo</th>
                          <th>Fecha</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recent_reports.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                backgroundColor: r.report_type === 'treatment_suggestion' ? '#f3e8ff' :
                                                 r.report_type === 'yield_prediction' ? '#ecfdf5' : '#dbeafe',
                                color: r.report_type === 'treatment_suggestion' ? '#7c3aed' :
                                       r.report_type === 'yield_prediction' ? '#059669' : '#2563eb'
                              }}>
                                {r.report_type === 'treatment_suggestion' ? 'Tratamiento' :
                                 r.report_type === 'yield_prediction' ? 'Predicción' :
                                 r.report_type === 'contract_summary' ? 'Resumen' : r.report_type}
                              </span>
                            </td>
                            <td style={{ fontWeight: '500', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.title}
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>{r.entity_name}</td>
                            <td style={{ fontSize: '0.85rem' }}>{r.generation_time_seconds}s</td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {r.created_at ? new Date(r.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => fetchReportDetail(r.id)}
                                data-testid={`btn-view-report-${r.id}`}
                              >
                                <Eye size={14} /> Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>
                    <History size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No hay informes generados todavía. Usa las pestañas de Tratamientos, Predicciones o Resúmenes para generar tu primer análisis IA.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Error cargando datos del dashboard</p>
            </div>
          )}
        </div>
      )}

      {/* Chat Panel */}
      {activeTab === TABS.CHAT && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', height: '600px' }} data-testid="panel-chat">
          {/* Sessions Sidebar */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: '600', fontSize: '0.9rem' }}>Conversaciones</h4>
              <button
                onClick={startNewChat}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#0891b2' }}
                data-testid="btn-new-chat"
              >
                <Plus size={14} /> Nueva
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {chatSessions.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '1rem' }}>
                  Sin conversaciones previas
                </p>
              ) : chatSessions.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '0.25rem',
                    backgroundColor: currentSessionId === s.id ? '#ecfeff' : 'transparent',
                    border: currentSessionId === s.id ? '1px solid #0891b2' : '1px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}
                  onClick={() => loadChatSession(s.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>
                      {s.message_count} msgs
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteChatSession(s.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#dc2626', opacity: 0.5, flexShrink: 0 }}
                    title="Eliminar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Chat Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Brain size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Agrónomo IA</div>
                <div style={{ fontSize: '0.7rem', color: '#059669' }}>En línea - GPT-4o</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
              {chatMessages.length === 0 && !sendingMessage && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
                  <MessageCircle size={48} style={{ color: '#0891b2', opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Pregúntale al agrónomo</p>
                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
                    Tiene acceso a tus parcelas, contratos y tratamientos para darte respuestas personalizadas.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                    {[
                      'Tengo hojas amarillas en mis limoneros',
                      'Que tratamiento uso contra el pulgon?',
                      'Cuando deberia empezar la cosecha?',
                      'Que opinas del estado de mis parcelas?'
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setChatInput(q); }}
                        style={{
                          padding: '6px 12px', borderRadius: '20px', border: '1px solid #0891b2',
                          backgroundColor: 'white', color: '#0891b2', fontSize: '0.8rem', cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        data-testid={`suggested-question-${i}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: '0.5rem'
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, marginTop: '2px' }}>
                      <Leaf size={14} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '75%',
                    padding: '0.75rem 1rem',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    backgroundColor: msg.role === 'user' ? '#0891b2' : '#f1f5f9',
                    color: msg.role === 'user' ? 'white' : 'inherit',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                    {msg.generation_time_seconds && (
                      <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.25rem', textAlign: 'right' }}>
                        {msg.generation_time_seconds}s
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sendingMessage && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                    <Leaf size={14} />
                  </div>
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '16px 16px 16px 4px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#0891b2' }} />
                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>Analizando...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid hsl(var(--border))' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Escribe tu pregunta al agrónomo IA..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                disabled={sendingMessage}
                style={{ flex: 1 }}
                data-testid="chat-input"
              />
              <button
                className="btn btn-primary"
                onClick={handleSendMessage}
                disabled={sendingMessage || !chatInput.trim()}
                style={{ backgroundColor: '#0891b2', padding: '0.5rem 1rem' }}
                data-testid="btn-send-chat"
              >
                {sendingMessage ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '2rem'
        }} onClick={() => setSelectedReport(null)}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', maxWidth: '800px',
            width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '2rem'
          }} onClick={(e) => e.stopPropagation()} data-testid="report-detail-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '700', fontSize: '1.2rem' }}>{selectedReport.title}</h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <span style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#7c3aed', fontWeight: '600' }}>
                {selectedReport.report_type}
              </span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                {selectedReport.entity_name}
              </span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                {selectedReport.generation_time_seconds}s | {selectedReport.model_used}
              </span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                {selectedReport.created_at ? new Date(selectedReport.created_at).toLocaleString('es-ES') : ''}
              </span>
            </div>
            {selectedReport.summary && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', lineHeight: '1.6' }}>
                {selectedReport.summary}
              </div>
            )}
            <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'auto', maxHeight: '400px' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                {JSON.stringify(selectedReport.content, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AsistenteIA;
