import React from 'react';
import { Cog, Edit2, Trash2, Eye, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell } from '../BulkActions';
import PaginationFooter from '../PaginationFooter';

const MaquinariaTable = ({
  maquinaria,
  totalCount,
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
  canBulkDelete, selectedIds, toggleOne, toggleAll, allSelected, someSelected,
  clearSelection, bulkDeleting, handleBulkDelete,
  sortConfig, onSort,
  page, pageSize, totalPages, totalItems, pageStart, pageEnd, onPageChange, onPageSizeChange,
}) => {
  const displayCount = typeof totalCount === 'number' ? totalCount : maquinaria.length;
  const sortable = typeof onSort === 'function';

  return (
    <div className="card">
      <h2 className="card-title">
        <Cog size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
        Catalogo de Maquinaria ({displayCount})
      </h2>
      {loading ? (
        <p>Cargando maquinaria...</p>
      ) : maquinaria.length === 0 ? (
        <p className="text-muted">{hasActiveFilters ? 'No hay maquinaria que coincida con los filtros' : 'No hay maquinaria registrada.'}</p>
      ) : (
        <div className="table-container">
          {canBulkDelete && <BulkActionBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} deleting={bulkDeleting} />}
          <table data-testid="maquinaria-table">
            <colgroup>
              {canBulkDelete && <col />}
              {visibleColumns.map(col => (
                <col key={col.id} style={sortable && sortConfig?.field === col.id ? { backgroundColor: 'hsl(var(--primary) / 0.04)' } : undefined} />
              ))}
              {(canEdit || canDelete) ? <col /> : null}
            </colgroup>
            <thead>
              <tr>
                {canBulkDelete && <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />}
                {visibleColumns.map(col => {
                  if (!sortable) return <th key={col.id}>{col.label}</th>;
                  const active = sortConfig?.field === col.id;
                  const Icon = !active ? ArrowUpDown : (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown);
                  return (
                    <th
                      key={col.id}
                      onClick={() => onSort(col.id)}
                      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...(active ? { backgroundColor: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))' } : {}) }}
                      title={`Ordenar por ${col.label}`}
                      data-testid={`sort-header-maquinaria-${col.id}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {col.label}
                        <Icon size={12} style={{ marginLeft: '0.25rem', opacity: active ? 1 : 0.35, color: active ? 'hsl(var(--primary))' : undefined }} />
                      </span>
                    </th>
                  );
                })}
                {(canEdit || canDelete) ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {maquinaria.map((item) => (
                <tr key={item._id}>
                  {canBulkDelete && <BulkCheckboxCell id={item._id} selected={selectedIds?.has(item._id)} onToggle={toggleOne} />}
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
          {typeof onPageChange === 'function' && (
            <PaginationFooter
              totalItems={totalItems} page={page} pageSize={pageSize}
              totalPages={totalPages} pageStart={pageStart} pageEnd={pageEnd}
              onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}
              itemLabel="máquinas" testIdSuffix="maquinaria"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MaquinariaTable;
