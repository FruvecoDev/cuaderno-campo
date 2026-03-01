import React, { useState, useEffect } from 'react';
import { History, ChevronDown, ChevronUp, User, Clock, ArrowRight } from 'lucide-react';
import api from '../services/api';

const fieldLabels = {
  tipo: 'Tipo',
  campana: 'Campaña',
  procedencia: 'Procedencia',
  fecha_contrato: 'Fecha Contrato',
  proveedor: 'Proveedor',
  proveedor_id: 'Proveedor ID',
  cliente: 'Cliente',
  cliente_id: 'Cliente ID',
  cultivo: 'Cultivo',
  cultivo_id: 'Cultivo ID',
  cantidad: 'Cantidad (kg)',
  precio: 'Precio (€/kg)',
  periodo_desde: 'Periodo Desde',
  periodo_hasta: 'Periodo Hasta',
  moneda: 'Moneda',
  observaciones: 'Observaciones',
  agente_compra: 'Agente de Compra',
  agente_venta: 'Agente de Venta',
  comision_compra_tipo: 'Tipo Comisión Compra',
  comision_compra_valor: 'Valor Comisión Compra',
  comision_venta_tipo: 'Tipo Comisión Venta',
  comision_venta_valor: 'Valor Comisión Venta',
  forma_pago: 'Forma de Pago',
  forma_cobro: 'Forma de Cobro',
  descuento_destare: 'Descuento Destare (%)'
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '(vacío)';
  if (typeof value === 'number') return value.toLocaleString('es-ES');
  return String(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const AuditHistory = ({ collection, documentId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (documentId && expanded) {
      fetchHistory();
    }
  }, [documentId, expanded]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/audit/history/${collection}/${documentId}`);
      setHistory(response.history || []);
    } catch (error) {
      console.error('Error fetching audit history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'create': return { text: 'Creado', color: '#16a34a', bg: '#dcfce7' };
      case 'update': return { text: 'Modificado', color: '#2563eb', bg: '#dbeafe' };
      case 'delete': return { text: 'Eliminado', color: '#dc2626', bg: '#fee2e2' };
      default: return { text: action, color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const renderChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) return null;
    
    return (
      <div style={{ marginTop: '0.5rem' }}>
        {Object.entries(changes).map(([field, change]) => (
          <div key={field} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.25rem 0',
            fontSize: '0.8rem',
            borderBottom: '1px dashed hsl(var(--border))'
          }}>
            <span style={{ fontWeight: '500', minWidth: '150px', color: 'hsl(var(--muted-foreground))' }}>
              {fieldLabels[field] || field}:
            </span>
            <span style={{ 
              color: '#dc2626', 
              textDecoration: 'line-through',
              opacity: 0.7
            }}>
              {formatValue(change.old)}
            </span>
            <ArrowRight size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
            <span style={{ color: '#16a34a', fontWeight: '500' }}>
              {formatValue(change.new)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!documentId) return null;

  return (
    <div style={{ 
      marginTop: '1rem',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: 'hsl(var(--muted))',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}
        data-testid="btn-toggle-audit-history"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} />
          <span>Historial de Cambios</span>
          {history.length > 0 && (
            <span style={{
              backgroundColor: '#1976d2',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {history.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expanded && (
        <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
              Cargando historial...
            </p>
          ) : history.length === 0 ? (
            <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center', fontStyle: 'italic' }}>
              No hay registros de cambios
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((log, index) => {
                const actionInfo = getActionLabel(log.action);
                const isItemExpanded = expandedItems[index];
                
                return (
                  <div 
                    key={log._id}
                    style={{
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      onClick={() => log.changes && Object.keys(log.changes).length > 0 && toggleItem(index)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        background: 'white',
                        cursor: log.changes && Object.keys(log.changes).length > 0 ? 'pointer' : 'default'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          backgroundColor: actionInfo.bg,
                          color: actionInfo.color
                        }}>
                          {actionInfo.text}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                          <User size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
                          <span>{log.user_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                          <Clock size={14} />
                          <span>{formatDate(log.timestamp)}</span>
                        </div>
                      </div>
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                          <span>{Object.keys(log.changes).length} campo(s)</span>
                          {isItemExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      )}
                    </div>
                    
                    {isItemExpanded && log.changes && (
                      <div style={{ 
                        padding: '0.5rem 0.75rem', 
                        borderTop: '1px solid hsl(var(--border))',
                        background: '#fafafa'
                      }}>
                        {renderChanges(log.changes)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditHistory;
