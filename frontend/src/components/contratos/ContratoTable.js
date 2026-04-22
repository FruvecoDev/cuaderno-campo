import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, BookOpen, Loader2 } from 'lucide-react';

const formatES = (num, decimals = 2) => {
  if (num == null) return '-';
  return Number(num).toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const COLUMN_RENDERERS = {
  numero: (c) => <td key="numero" className="font-semibold">{c.serie}-{c.ano}-{String(c.numero).padStart(3, '0')}</td>,
  tipo: (c) => (
    <td key="tipo">
      <span style={{
        padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500',
        backgroundColor: c.tipo === 'Compra' ? '#dbeafe' : '#dcfce7',
        color: c.tipo === 'Compra' ? '#1e40af' : '#166534'
      }}>
        {c.tipo || 'Compra'}
      </span>
    </td>
  ),
  campana: (c) => <td key="campana">{c.campana}</td>,
  proveedor_cliente: (c) => (
    <td key="proveedor_cliente">
      <div>
        <span style={{ fontSize: '0.7rem', color: '#666' }}>
          {c.tipo === 'Venta' ? 'Cliente: ' : 'Prov: '}
        </span>
        {c.tipo === 'Venta' ? (c.cliente || '-') : c.proveedor}
      </div>
    </td>
  ),
  cultivo: (c) => <td key="cultivo">{c.cultivo}</td>,
  cantidad: (c) => <td key="cantidad">{formatES(c.cantidad, 0)}</td>,
  precio: (c) => <td key="precio">{'\u20AC'}{formatES(c.precio, 2)}</td>,
  total: (c) => <td key="total" className="font-semibold">{'\u20AC'}{formatES((c.cantidad || 0) * (c.precio || 0), 2)}</td>,
  fecha: (c) => <td key="fecha">{c.fecha_contrato ? new Date(c.fecha_contrato).toLocaleDateString() : '-'}</td>,
};

const ContratoTable = ({
  contratos,
  puedeCompra,
  puedeVenta,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onGenerateCuaderno,
  generatingCuaderno,
  columnConfig
}) => {
  const { t } = useTranslation();

  const visibleContratos = contratos.filter(contrato => {
    const tipo = contrato.tipo || 'Compra';
    if (puedeCompra && puedeVenta) return true;
    if (puedeCompra && tipo === 'Compra') return true;
    if (puedeVenta && tipo === 'Venta') return true;
    return false;
  });

  const visibleColumns = columnConfig.filter(col => col.visible);

  const HEADER_LABELS = {
    numero: t('contracts.contractNumber'),
    tipo: 'Tipo',
    campana: t('contracts.campaign'),
    proveedor_cliente: 'Proveedor/Cliente',
    cultivo: t('contracts.crop'),
    cantidad: t('common.quantity') + ' (kg)',
    precio: t('contracts.price') + ' (EUR/kg)',
    total: t('common.total') + ' (EUR)',
    fecha: t('common.date'),
  };

  return (
    <div className="table-container">
      <table data-testid="contratos-table">
        <thead>
          <tr>
            {visibleColumns.map(col => (
              <th key={col.id}>{HEADER_LABELS[col.id] || col.label}</th>
            ))}
            {(canEdit || canDelete) ? <th>{t('common.actions')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {visibleContratos.map((contrato) => (
            <tr key={contrato._id}>
              {visibleColumns.map(col => {
                const renderer = COLUMN_RENDERERS[col.id];
                return renderer ? renderer(contrato) : null;
              })}
              {(canEdit || canDelete) ? (
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {canEdit && (
                      <button className="btn btn-sm btn-secondary" onClick={() => onEdit(contrato)}
                        title="Editar contrato" data-testid={`edit-contrato-${contrato._id}`}>
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button className="btn btn-sm btn-primary" onClick={() => onGenerateCuaderno(contrato._id)}
                      title={t('fieldNotebook.generate')} disabled={generatingCuaderno === contrato._id}
                      data-testid={`cuaderno-contrato-${contrato._id}`}>
                      {generatingCuaderno === contrato._id ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                    </button>
                    {canDelete && (
                      <button className="btn btn-sm btn-error" onClick={() => onDelete(contrato._id)}
                        title="Eliminar contrato" data-testid={`delete-contrato-${contrato._id}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContratoTable;
