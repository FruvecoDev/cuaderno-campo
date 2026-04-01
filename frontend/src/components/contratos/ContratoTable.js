import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2, BookOpen, Loader2 } from 'lucide-react';

const ContratoTable = ({
  contratos,
  puedeCompra,
  puedeVenta,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onGenerateCuaderno,
  generatingCuaderno
}) => {
  const { t } = useTranslation();

  const visibleContratos = contratos.filter(contrato => {
    const tipo = contrato.tipo || 'Compra';
    if (puedeCompra && puedeVenta) return true;
    if (puedeCompra && tipo === 'Compra') return true;
    if (puedeVenta && tipo === 'Venta') return true;
    return false;
  });

  return (
    <div className="table-container">
      <table data-testid="contratos-table">
        <thead>
          <tr>
            <th>{t('contracts.contractNumber')}</th>
            <th>Tipo</th>
            <th>{t('contracts.campaign')}</th>
            <th>Proveedor/Cliente</th>
            <th>{t('contracts.crop')}</th>
            <th>{t('common.quantity')} (kg)</th>
            <th>{t('contracts.price')} (EUR/kg)</th>
            <th>{t('common.total')} (EUR)</th>
            <th>{t('common.date')}</th>
            {(canEdit || canDelete) ? <th>{t('common.actions')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {visibleContratos.map((contrato) => (
            <tr key={contrato._id}>
              <td className="font-semibold">{contrato.serie}-{contrato.ano}-{String(contrato.numero).padStart(3, '0')}</td>
              <td>
                <span style={{
                  padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500',
                  backgroundColor: contrato.tipo === 'Compra' ? '#dbeafe' : '#dcfce7',
                  color: contrato.tipo === 'Compra' ? '#1e40af' : '#166534'
                }}>
                  {contrato.tipo || 'Compra'}
                </span>
              </td>
              <td>{contrato.campana}</td>
              <td>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#666' }}>
                    {contrato.tipo === 'Venta' ? 'Cliente: ' : 'Prov: '}
                  </span>
                  {contrato.tipo === 'Venta' ? (contrato.cliente || '-') : contrato.proveedor}
                </div>
              </td>
              <td>{contrato.cultivo}</td>
              <td>{contrato.cantidad?.toLocaleString()}</td>
              <td>{'\u20AC'}{contrato.precio?.toFixed(2)}</td>
              <td className="font-semibold">{'\u20AC'}{((contrato.cantidad || 0) * (contrato.precio || 0)).toFixed(2)}</td>
              <td>{contrato.fecha_contrato ? new Date(contrato.fecha_contrato).toLocaleDateString() : '-'}</td>
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
