import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Brain, Sparkles, Bug, TrendingUp, Loader2, AlertTriangle, 
  CheckCircle2, ChevronDown, ChevronUp, Leaf, Package, Calendar,
  BarChart3, Lightbulb, Shield, Clock, Target, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api, { BACKEND_URL } from '../services/api';
import '../App.css';


// Tab type constants
const TABS = {
  TREATMENTS: 'treatments',
  PREDICTIONS: 'predictions'
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

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  useEffect(() => {
    fetchParcelas();
    fetchContratos();
  }, []);

  const fetchParcelas = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/parcelas-for-suggestions`, { headers });
      const data = await res.json();
      setParcelas(data.parcelas || []);
    } catch (err) {
      console.error('Error fetching parcelas:', err);
    }
  };

  const fetchContratos = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/contratos-for-predictions`, { headers });
      const data = await res.json();
      setContratos(data.contratos || []);
    } catch (err) {
      console.error('Error fetching contratos:', err);
    }
  };

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
      const res = await fetch(
        `${BACKEND_URL}/api/ai/suggest-treatments/${selectedParcela}?problema=${encodeURIComponent(problema)}&cultivo=${encodeURIComponent(parcela?.cultivo || '')}`,
        { method: 'POST', headers }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al generar sugerencias');
      }

      const data = await res.json();
      if (data.success) {
        setSuggestions(data);
      } else {
        throw new Error('No se pudieron generar las sugerencias');
      }
    } catch (err) {
      setSuggestionsError(err.message);
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
      const res = await fetch(
        `${BACKEND_URL}/api/ai/predict-yield/${selectedContrato}`,
        { method: 'POST', headers }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Error al generar predicción');
      }

      const data = await res.json();
      if (data.success) {
        setPrediction(data);
      } else {
        throw new Error('No se pudo generar la predicción');
      }
    } catch (err) {
      setPredictionError(err.message);
    } finally {
      setLoadingPrediction(false);
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
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '1rem', 
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
