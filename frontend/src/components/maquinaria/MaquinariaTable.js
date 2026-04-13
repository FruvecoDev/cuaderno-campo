import React from 'react';
import { Cog, Edit2, Trash2, Eye } from 'lucide-react';

const MaquinariaTable = ({
  maquinaria,
  loading,
  hasActiveFilters,
  visibleColumns,
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
                {visibleColumns.map(col => <th key={col.id}>{col.label}</th>)}
                {(canEdit || canDelete) ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {maquinaria.map((item) => (
                <tr key={item._id}>
                  {visibleColumns.map(col => {
                    switch (col.id) {
                      case 'nombre': return <td key="nombre" className="font-semibold">{item.nombre}</td>;
                      case 'tipo': return <td key="tipo">{item.tipo}</td>;
                      case 'marca': return <td key="marca">{item.marca || '\u2014'}</td>;
                      case 'modelo': return <td key="modelo">{item.modelo || '\u2014'}</td>;
                      case 'matricula': return <td key="matricula">{item.matricula || '\u2014'}</td>;
                      case 'estado': return <td key="estado"><span className={`badge ${getEstadoBadgeClass(item.estado)}`}>{item.estado}</span></td>;
                      case 'imagen_placa_ce': return <td key="imagen_placa_ce">{item.imagen_placa_ce_url ? (<button className="btn btn-sm btn-secondary" onClick={() => onViewImage(item)} title="Ver imagen de placa CE" data-testid={`view-placa-${item._id}`}><Eye size={14} style={{ marginRight: '0.25rem' }} /> Ver</button>) : <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>{'\u2014'}</span>}</td>;
                      default: return null;
                    }
                  })}
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
