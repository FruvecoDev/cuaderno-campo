import React from 'react';
import { Edit2, Trash2, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import { BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell } from '../BulkActions';

const TratamientosTable = ({
  tratamientos, loading, hasActiveFilters, tableConfig, canEdit, canDelete,
  handleEdit, handleDelete, handleChangeEstado,
  canBulkDelete = false,
  selectedIds = new Set(),
  onToggleOne,
  onToggleAll,
  allSelected = false,
  someSelected = false,
  onBulkDelete,
  onClearSelection,
  bulkDeleting = false,
}) => {
  return (
    <div className="card">
      <h2 className="card-title">Lista de Tratamientos ({tratamientos.length})</h2>
      {canBulkDelete && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onDelete={onBulkDelete}
          onClear={onClearSelection}
          deleting={bulkDeleting}
        />
      )}
      {loading ? (
        <p>Cargando tratamientos...</p>
      ) : tratamientos.length === 0 ? (
        <p className="text-muted">{hasActiveFilters ? 'No hay tratamientos que coincidan con los filtros' : 'No hay tratamientos registrados. Crea el primero!'}</p>
      ) : (
        <div className="table-container">
          <table data-testid="tratamientos-table">
            <thead>
              <tr>
                {canBulkDelete && (
                  <BulkCheckboxHeader
                    allSelected={allSelected}
                    someSelected={someSelected}
                    onToggle={onToggleAll}
                  />
                )}
                {tableConfig.tipo && <th>Tipo</th>}
                {tableConfig.subtipo && <th>Subtipo</th>}
                {tableConfig.metodo && <th>Metodo</th>}
                {tableConfig.campana && <th>Campana</th>}
                {tableConfig.fecha_tratamiento && <th>F. Tratamiento</th>}
                {tableConfig.fecha_aplicacion && <th>F. Aplicacion</th>}
                {tableConfig.superficie && <th>Superficie</th>}
                {tableConfig.parcelas && <th>Parcelas</th>}
                {tableConfig.aplicador && <th>Aplicador</th>}
                {tableConfig.maquina && <th>Maquina</th>}
                {tableConfig.estado && <th>Estado</th>}
                {(canEdit || canDelete) && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {tratamientos.map((t) => (
                <tr key={t._id} style={selectedIds.has(t._id) ? { backgroundColor: 'hsl(var(--primary) / 0.05)' } : undefined}>
                  {canBulkDelete && (
                    <BulkCheckboxCell
                      id={t._id}
                      selected={selectedIds.has(t._id)}
                      onToggle={onToggleOne}
                    />
                  )}
                  {tableConfig.tipo && <td className="font-semibold">{t.tipo_tratamiento}</td>}
                  {tableConfig.subtipo && <td>{t.subtipo || '—'}</td>}
                  {tableConfig.metodo && <td>{t.metodo_aplicacion}</td>}
                  {tableConfig.campana && <td>{t.campana || 'N/A'}</td>}
                  {tableConfig.fecha_tratamiento && <td>{t.fecha_tratamiento || '—'}</td>}
                  {tableConfig.fecha_aplicacion && <td>{t.fecha_aplicacion || '—'}</td>}
                  {tableConfig.superficie && <td>{t.superficie_aplicacion} ha</td>}
                  {tableConfig.parcelas && <td>{t.parcelas_ids?.length || 0} parcela(s)</td>}
                  {tableConfig.aplicador && <td>{t.aplicador_nombre || '—'}</td>}
                  {tableConfig.maquina && <td>{t.maquina_nombre || '—'}</td>}
                  {tableConfig.estado && (
                    <td>
                      <span className={`badge ${t.realizado ? 'badge-success' : t.cancelado ? 'badge-error' : 'badge-default'}`}>
                        {t.realizado ? 'Realizado' : t.cancelado ? 'Cancelado' : 'Pendiente'}
                      </span>
                    </td>
                  )}
                  {(canEdit || canDelete) && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {canEdit && !t.realizado && !t.cancelado && (
                          <>
                            <button className="btn btn-sm" style={{ backgroundColor: 'hsl(142 76% 36%)', color: 'white', border: 'none' }} onClick={() => handleChangeEstado(t._id, 'completado')} title="Completado" data-testid={`complete-tratamiento-${t._id}`}><CheckCircle size={14} /></button>
                            <button className="btn btn-sm" style={{ backgroundColor: 'hsl(0 84% 60%)', color: 'white', border: 'none' }} onClick={() => handleChangeEstado(t._id, 'cancelado')} title="Cancelar" data-testid={`cancel-tratamiento-${t._id}`}><XCircle size={14} /></button>
                          </>
                        )}
                        {canEdit && (t.realizado || t.cancelado) && (
                          <button className="btn btn-sm" style={{ backgroundColor: 'hsl(38 92% 50%)', color: 'white', border: 'none' }} onClick={() => handleChangeEstado(t._id, 'pendiente')} title="Pendiente" data-testid={`pending-tratamiento-${t._id}`}><PlayCircle size={14} /></button>
                        )}
                        {canEdit && <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(t)} title="Editar" data-testid={`edit-tratamiento-${t._id}`}><Edit2 size={14} /></button>}
                        {canDelete && <button className="btn btn-sm btn-error" onClick={() => handleDelete(t._id)} title="Eliminar" data-testid={`delete-tratamiento-${t._id}`}><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TratamientosTable;
