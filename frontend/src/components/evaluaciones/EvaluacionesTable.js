import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Edit2, Trash2, Download, CheckCircle, Clock, Archive } from 'lucide-react';

const EvaluacionesTable = ({
  evaluaciones,
  loading,
  canEdit,
  canDelete,
  onChangeEstado,
  onDownloadPDF,
  onEdit,
  onDelete,
  getEstadoBadge,
}) => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h2 className="card-title">
        <FileText size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
        {t('evaluations.evaluationList')} ({evaluaciones.length})
      </h2>
      {loading ? (
        <p>{t('common.loading')}</p>
      ) : evaluaciones.length === 0 ? (
        <p className="text-muted">{t('evaluations.noEvaluations')}</p>
      ) : (
        <div className="table-container">
          <table data-testid="evaluaciones-table">
            <thead>
              <tr>
                <th>{t('parcels.code')}</th>
                <th>{t('suppliers.title')}</th>
                <th>{t('crops.title')}</th>
                <th>{t('contracts.campaign')}</th>
                <th>{t('evaluations.startDate')}</th>
                <th>{t('evaluations.technician')}</th>
                <th>{t('common.status')}</th>
                {(canEdit || canDelete) ? <th>{t('common.actions')}</th> : null}
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map((evaluacion) => {
                const estadoBadge = getEstadoBadge(evaluacion.estado);
                return (
                  <tr key={evaluacion._id}>
                    <td className="font-semibold">{evaluacion.codigo_plantacion}</td>
                    <td>{evaluacion.proveedor}</td>
                    <td>{evaluacion.cultivo} ({evaluacion.variedad})</td>
                    <td>{evaluacion.campana}</td>
                    <td>{evaluacion.fecha_inicio}</td>
                    <td>{evaluacion.tecnico}</td>
                    <td>
                      <span className={`badge ${estadoBadge.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        {estadoBadge.icon} {evaluacion.estado || t('evaluations.draft')}
                      </span>
                    </td>
                    {(canEdit || canDelete) && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {canEdit && evaluacion.estado !== 'completada' && (
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'hsl(142 76% 36%)', color: 'white', border: 'none' }}
                              onClick={() => onChangeEstado(evaluacion._id, 'completada')}
                              title="Marcar como Finalizada"
                              data-testid={`complete-evaluacion-${evaluacion._id}`}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {canEdit && evaluacion.estado === 'completada' && (
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'hsl(38 92% 50%)', color: 'white', border: 'none' }}
                              onClick={() => onChangeEstado(evaluacion._id, 'borrador')}
                              title="Volver a Borrador"
                              data-testid={`draft-evaluacion-${evaluacion._id}`}
                            >
                              <Clock size={14} />
                            </button>
                          )}
                          {canEdit && evaluacion.estado !== 'archivada' && (
                            <button
                              className="btn btn-sm"
                              style={{ backgroundColor: 'hsl(var(--muted-foreground))', color: 'white', border: 'none' }}
                              onClick={() => onChangeEstado(evaluacion._id, 'archivada')}
                              title="Archivar"
                              data-testid={`archive-evaluacion-${evaluacion._id}`}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => onDownloadPDF(evaluacion._id)}
                            title={`${t('common.download')} PDF`}
                          >
                            <Download size={14} />
                          </button>
                          {canEdit && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => onEdit(evaluacion)}
                              title={t('common.edit')}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="btn btn-sm btn-error"
                              onClick={() => onDelete(evaluacion._id)}
                              title={t('common.delete')}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EvaluacionesTable;
