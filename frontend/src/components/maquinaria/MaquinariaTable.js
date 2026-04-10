import React from 'react';
import { Cog, Edit2, Trash2, Eye } from 'lucide-react';

const MaquinariaTable = ({
  maquinaria,
  loading,
  hasActiveFilters,
  tableConfig,
  canEdit,
  canDelete,
  getEstadoBadgeClass,
  onViewImage,
  onViewHistorial,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="card">
      <h2 className="card-title">
        <Cog size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
        Catalogo de Maquinaria ({maquinaria.length})
      </h2>
      {loading ? (
        <p>Cargando maquinaria...</p>
      ) : maquinaria.length === 0 ? (
        <p className="text-muted">{hasActiveFilters ? 'No hay maquinaria que coincida con los filtros' : 'No hay maquinaria registrada.'}</p>
      ) : (
        <div className="table-container">
          <table data-testid="maquinaria-table">
            <thead>
              <tr>
                {tableConfig.nombre ? <th>Nombre</th> : null}
                {tableConfig.tipo ? <th>Tipo</th> : null}
                {tableConfig.marca ? <th>Marca</th> : null}
                {tableConfig.modelo ? <th>Modelo</th> : null}
                {tableConfig.matricula ? <th>Matricula</th> : null}
                {tableConfig.estado ? <th>Estado</th> : null}
                {tableConfig.imagen_placa_ce ? <th>Placa CE</th> : null}
                {(canEdit || canDelete) ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {maquinaria.map((item) => (
                <tr key={item._id}>
                  {tableConfig.nombre ? <td className="font-semibold">{item.nombre}</td> : null}
                  {tableConfig.tipo ? <td>{item.tipo}</td> : null}
                  {tableConfig.marca ? <td>{item.marca || '—'}</td> : null}
                  {tableConfig.modelo ? <td>{item.modelo || '—'}</td> : null}
                  {tableConfig.matricula ? <td>{item.matricula || '—'}</td> : null}
                  {tableConfig.estado ? (
                    <td><span className={`badge ${getEstadoBadgeClass(item.estado)}`}>{item.estado}</span></td>
                  ) : null}
                  {tableConfig.imagen_placa_ce ? (
                    <td>
                      {item.imagen_placa_ce_url ? (
                        <button className="btn btn-sm btn-secondary" onClick={() => onViewImage(item)} title="Ver imagen de placa CE" data-testid={`view-placa-${item._id}`}>
                          <Eye size={14} style={{ marginRight: '0.25rem' }} /> Ver
                        </button>
                      ) : <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>—</span>}
                    </td>
                  ) : null}
                  {(canEdit || canDelete) ? (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => onViewHistorial(item)} title="Ver historial" data-testid={`historial-maquinaria-${item._id}`}>
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <button className="btn btn-sm btn-secondary" onClick={() => onEdit(item)} title="Editar" data-testid={`edit-maquinaria-${item._id}`}>
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn btn-sm btn-error" onClick={() => onDelete(item._id)} title="Eliminar" data-testid={`delete-maquinaria-${item._id}`}>
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
      )}
    </div>
  );
};

export default MaquinariaTable;
