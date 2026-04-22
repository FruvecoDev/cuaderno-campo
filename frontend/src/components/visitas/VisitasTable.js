import React from 'react';
import { Edit2, Trash2, Camera } from 'lucide-react';
import { BulkCheckboxHeader, BulkCheckboxCell } from '../BulkActions';

export const VisitasTable = ({
  filteredVisitas, loading, hasActiveFilters,
  tableConfig, canEdit, canDelete,
  handleEdit, handleDelete, setViewingVisita,
  canBulkDelete = false,
  selectedIds = new Set(),
  onToggleOne,
  onToggleAll,
  allSelected = false,
  someSelected = false,
  bulkBar = null,
}) => {
  return (
    <div className="card">
      <h2 className="card-title">Lista de Visitas ({filteredVisitas.length})</h2>
      {bulkBar}
      {loading ? (
        <p>Cargando visitas...</p>
      ) : filteredVisitas.length === 0 ? (
        <p className="text-muted">{hasActiveFilters ? 'No hay visitas que coincidan con los filtros' : 'No hay visitas registradas. Crea la primera!'}</p>
      ) : (
        <div className="table-container">
          <table data-testid="visitas-table">
            <thead>
              <tr>
                {canBulkDelete && (
                  <BulkCheckboxHeader
                    allSelected={allSelected}
                    someSelected={someSelected}
                    onToggle={onToggleAll}
                  />
                )}
                {tableConfig.objetivo ? <th>Objetivo</th> : null}
                {tableConfig.parcela ? <th>Parcela</th> : null}
                {tableConfig.proveedor ? <th>Proveedor</th> : null}
                {tableConfig.cultivo ? <th>Cultivo</th> : null}
                {tableConfig.campana ? <th>Campana</th> : null}
                {tableConfig.fecha ? <th>Fecha</th> : null}
                {tableConfig.estado ? <th>Estado</th> : null}
                {(canEdit || canDelete) ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredVisitas.map((visita) => (
                <tr key={visita._id} style={selectedIds.has(visita._id) ? { backgroundColor: 'hsl(var(--primary) / 0.05)' } : undefined}>
                  {canBulkDelete && (
                    <BulkCheckboxCell
                      id={visita._id}
                      selected={selectedIds.has(visita._id)}
                      onToggle={onToggleOne}
                    />
                  )}
                  {tableConfig.objetivo ? (
                    <td className="font-semibold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {visita.objetivo}
                        {visita.fotos && visita.fotos.length > 0 && (
                          <span 
                            title={`${visita.fotos.length} foto(s)`}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '2px',
                              backgroundColor: 'hsl(var(--primary) / 0.1)',
                              color: 'hsl(var(--primary))',
                              padding: '2px 6px',
                              borderRadius: '9999px',
                              fontSize: '0.7rem'
                            }}
                          >
                            <Camera size={12} />
                            {visita.fotos.length}
                          </span>
                        )}
                      </div>
                    </td>
                  ) : null}
                  {tableConfig.parcela ? <td>{visita.codigo_plantacion || 'N/A'}</td> : null}
                  {tableConfig.proveedor ? <td>{visita.proveedor || 'N/A'}</td> : null}
                  {tableConfig.cultivo ? <td>{visita.cultivo || 'N/A'}</td> : null}
                  {tableConfig.campana ? <td>{visita.campana || 'N/A'}</td> : null}
                  {tableConfig.fecha ? <td>{visita.fecha_visita ? new Date(visita.fecha_visita).toLocaleDateString() : 'Sin fecha'}</td> : null}
                  {tableConfig.estado ? (
                    <td>
                      <span className={`badge ${visita.realizado ? 'badge-success' : 'badge-default'}`}>
                        {visita.realizado ? 'Realizada' : 'Pendiente'}
                      </span>
                    </td>
                  ) : null}
                  {(canEdit || canDelete) ? (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setViewingVisita(visita)}
                          title="Ver detalles"
                          data-testid={`view-visita-${visita._id}`}
                        >
                          <Camera size={14} />
                        </button>
                        {canEdit && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEdit(visita)}
                            title="Editar visita"
                            data-testid={`edit-visita-${visita._id}`}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn btn-sm btn-error"
                            onClick={() => handleDelete(visita._id)}
                            title="Eliminar visita"
                            data-testid={`delete-visita-${visita._id}`}
                          >
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
