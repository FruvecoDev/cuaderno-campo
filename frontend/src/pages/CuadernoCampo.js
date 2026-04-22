import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Loader2, Search, Leaf, MapPin, Calendar, Package, Droplets, Eye, ClipboardList, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const CuadernoCampo = () => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcela, setSelectedParcela] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCultivo, setFilterCultivo] = useState('');
  const [contratos, setContratos] = useState([]);

  useEffect(() => {
    fetchParcelas();
    fetchContratos();
  }, []);

  const fetchParcelas = async () => {
    try {
      const data = await api.get('/api/cuaderno-campo/parcelas');
      setParcelas(data.parcelas || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchContratos = async () => {
    try {
      const data = await api.get('/api/contratos');
      setContratos(data.contratos || []);
    } catch (err) {}
  };

  const getContratoForParcela = (parcela) => {
    return contratos.find(c =>
      c.cultivo && parcela.cultivo &&
      c.cultivo.toLowerCase() === parcela.cultivo.toLowerCase() &&
      (!c.campana || !parcela.campana || c.campana === parcela.campana)
    );
  };

  const handleSelectParcela = async (parcela) => {
    setSelectedParcela(parcela);
    setLoadingPreview(true);
    setPreview(null);
    
    try {
      const data = await api.get(`/api/cuaderno-campo/preview/${parcela._id}`);
      setPreview(data);
    } catch (err) {

    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedParcela) return;
    
    setGenerating(true);
    try {
      await api.download(
        `/api/cuaderno-campo/generar/${selectedParcela._id}`,
        `cuaderno_campo_${selectedParcela.codigo_plantacion}_${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (err) {

      alert('Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Filter parcelas
  const filteredParcelas = parcelas.filter(p => {
    if (searchTerm && !p.codigo_plantacion?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterCultivo && p.cultivo !== filterCultivo) {
      return false;
    }
    return true;
  });

  // Get unique cultivos
  const cultivosUnicos = [...new Set(parcelas.map(p => p.cultivo).filter(Boolean))];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div data-testid="cuaderno-campo-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '2rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={28} />
          Cuaderno de Campo
        </h1>
      </div>

      {/* Info Card */}
      <div className="card mb-4" style={{ padding: '1rem', background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          <strong>Genera el Cuaderno de Campo</strong> de cualquier parcela. El documento PDF incluye:
          tratamientos fitosanitarios, riegos, visitas de seguimiento y cosechas.
          Cumple con los requisitos de trazabilidad agrícola.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Panel - Parcela Selection */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} />
            Seleccionar Parcela
          </h2>
          
          {/* Search and Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar parcela..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '35px' }}
                data-testid="search-parcela"
              />
            </div>
            <select
              className="form-select"
              value={filterCultivo}
              onChange={(e) => setFilterCultivo(e.target.value)}
              style={{ width: 'auto', minWidth: '130px' }}
              data-testid="filter-cultivo"
            >
              <option value="">Todos</option>
              {cultivosUnicos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Parcelas List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filteredParcelas.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', padding: '2rem' }}>
                No se encontraron parcelas
              </p>
            ) : (
              filteredParcelas.map(p => {
                const contrato = getContratoForParcela(p);
                return (
                <div
                  key={p._id}
                  onClick={() => handleSelectParcela(p)}
                  style={{
                    padding: '0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: selectedParcela?._id === p._id 
                      ? '2px solid hsl(var(--primary))' 
                      : '1px solid hsl(var(--border))',
                    background: selectedParcela?._id === p._id 
                      ? 'hsl(var(--primary) / 0.1)' 
                      : 'hsl(var(--card))',
                    transition: 'all 0.2s'
                  }}
                  data-testid={`parcela-item-${p._id}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.codigo_plantacion}</div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Leaf size={12} style={{ color: 'hsl(var(--primary))' }} />
                        {p.cultivo || 'Sin cultivo'}
                        <span>·</span>
                        {p.superficie_total} ha
                        {p.campana && <><span>·</span><Calendar size={12} />{p.campana}</>}
                      </div>
                      {contrato && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--primary))' }}>
                          <FileText size={11} />
                          <span style={{ fontWeight: '600' }}>{contrato.numero_contrato}</span>
                          <span style={{ color: 'hsl(var(--muted-foreground))' }}>· {contrato.proveedor || contrato.cliente}</span>
                          <span style={{ fontWeight: '600' }}>{contrato.precio} €/kg</span>
                        </div>
                      )}
                    </div>
                    {selectedParcela?._id === p._id && (
                      <div style={{ 
                        background: 'hsl(var(--primary))', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '24px', 
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Preview and Download */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={18} />
            Vista Previa
          </h2>

          {!selectedParcela ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem', 
              color: 'hsl(var(--muted-foreground))',
              background: 'hsl(var(--muted) / 0.2)',
              borderRadius: '12px'
            }}>
              <FileText size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
              <p>Selecciona una parcela para ver el resumen del cuaderno</p>
            </div>
          ) : loadingPreview ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', color: 'hsl(var(--muted-foreground))' }}>Cargando resumen...</p>
            </div>
          ) : preview ? (
            <>
              {/* Parcela Info */}
              <div style={{ 
                padding: '1rem', 
                background: 'hsl(var(--muted) / 0.3)', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: '0 0 0.5rem', fontWeight: '600' }}>
                  {preview.parcela.codigo_plantacion}
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', flexWrap: 'wrap' }}>
                  <span><Leaf size={14} style={{ display: 'inline', marginRight: '4px' }} />{preview.parcela.cultivo || 'Sin cultivo'}</span>
                  <span>{preview.parcela.superficie_total} ha</span>
                  {preview.parcela.campana && <span><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />{preview.parcela.campana}</span>}
                </div>
                {selectedParcela && (() => {
                  const contrato = getContratoForParcela(selectedParcela);
                  if (!contrato) return null;
                  return (
                    <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'hsl(var(--primary) / 0.08)', borderRadius: '6px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'hsl(var(--primary))', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Contrato Asociado</div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '600' }}>{contrato.numero_contrato}</span>
                        <span>{contrato.tipo === 'Compra' ? contrato.proveedor : contrato.cliente}</span>
                        <span style={{ fontWeight: '700', color: 'hsl(142 76% 36%)' }}>{contrato.precio} €/kg</span>
                        {contrato.cantidad && <span>{parseFloat(contrato.cantidad).toLocaleString('es-ES')} kg</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Summary Stats */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                  Contenido del Cuaderno
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    background: 'hsl(210 100% 50% / 0.1)',
                    border: '1px solid hsl(210 100% 50% / 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Package size={16} style={{ color: 'hsl(210 100% 50%)' }} />
                      <span style={{ fontWeight: '600' }}>Tratamientos</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'hsl(210 100% 50%)' }}>
                      {preview.resumen.tratamientos}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    background: 'hsl(200 100% 50% / 0.1)',
                    border: '1px solid hsl(200 100% 50% / 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <Droplets size={16} style={{ color: 'hsl(200 100% 50%)' }} />
                      <span style={{ fontWeight: '600' }}>Riegos</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'hsl(200 100% 50%)' }}>
                      {preview.resumen.irrigaciones}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    background: 'hsl(142 76% 36% / 0.1)',
                    border: '1px solid hsl(142 76% 36% / 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <ClipboardList size={16} style={{ color: 'hsl(142 76% 36%)' }} />
                      <span style={{ fontWeight: '600' }}>Visitas</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'hsl(142 76% 36%)' }}>
                      {preview.resumen.visitas}
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    background: 'hsl(38 92% 50% / 0.1)',
                    border: '1px solid hsl(38 92% 50% / 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <TrendingUp size={16} style={{ color: 'hsl(38 92% 50%)' }} />
                      <span style={{ fontWeight: '600' }}>Cosechas</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'hsl(38 92% 50%)' }}>
                      {preview.resumen.cosechas}
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.5rem', 
                  background: 'hsl(var(--muted) / 0.3)', 
                  borderRadius: '6px',
                  textAlign: 'center',
                  fontSize: '0.875rem'
                }}>
                  <strong>{preview.resumen.total_registros}</strong> registros totales en el cuaderno
                </div>
              </div>

              {/* Download Button */}
              <button
                className="btn btn-primary"
                onClick={handleGeneratePDF}
                disabled={generating || preview.resumen.total_registros === 0}
                style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
                data-testid="btn-download-pdf"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Descargar Cuaderno de Campo (PDF)
                  </>
                )}
              </button>
              
              {preview.resumen.total_registros === 0 && (
                <p style={{ 
                  textAlign: 'center', 
                  color: 'hsl(38 92% 50%)', 
                  fontSize: '0.8rem', 
                  marginTop: '0.5rem' 
                }}>
                  No hay registros para esta parcela. Añade tratamientos, riegos o visitas primero.
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CuadernoCampo;
