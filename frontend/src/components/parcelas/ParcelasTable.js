import React from 'react';
import { Edit2, Trash2, ClipboardCheck, History, Calendar, BookOpen, Loader2, MapIcon, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { BulkActionBar, BulkCheckboxHeader, BulkCheckboxCell } from '../BulkActions';

export const ParcelasTable = ({
  filteredParcelas, loading, hasActiveFilters, fieldsConfig,
  contratos, handleEdit, handleDelete, handleGenerateCuaderno,
  generatingCuaderno, fetchHistorialTratamientos,
  canBulkDelete, selectedIds, toggleOne, toggleAll, allSelected, someSelected,
  clearSelection, bulkDeleting, handleBulkDelete
}) => {
  const getContratoInfo = (contratoId) => {
    const contrato = contratos.find(c => c._id === contratoId);
    return contrato ? `${contrato.serie || ''}-${contrato.numero || ''}` : '-';
  };

  return (
    <div className="card">
      <h2 className="card-title">Lista de Parcelas ({filteredParcelas.length})</h2>
      {loading ? <p>Cargando...</p> : filteredParcelas.length === 0 ? (
        <p className="text-muted">{hasActiveFilters ? 'No hay parcelas que coincidan con los filtros' : 'No hay parcelas registradas'}</p>
      ) : (
        <div className="table-container">
          {canBulkDelete && <BulkActionBar selectedCount={selectedIds.size} onDelete={handleBulkDelete} onClear={clearSelection} deleting={bulkDeleting} />}
          <table data-testid="parcelas-table">
            <thead>
              <tr>
                {canBulkDelete && <BulkCheckboxHeader allSelected={allSelected} someSelected={someSelected} onToggle={toggleAll} />}
                {fieldsConfig.codigo_plantacion ? <th>Codigo</th> : null}
                {fieldsConfig.proveedor ? <th>Proveedor</th> : null}
                {fieldsConfig.finca ? <th>Finca</th> : null}
                {fieldsConfig.cultivo ? <th>Cultivo</th> : null}
                {fieldsConfig.variedad ? <th>Variedad</th> : null}
                {fieldsConfig.superficie_total ? <th>Superficie</th> : null}
                {fieldsConfig.num_plantas ? <th>Plantas</th> : null}
                {fieldsConfig.campana ? <th>Campaña</th> : null}
                <th>Zonas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredParcelas.map((p) => (
                <tr key={p._id} data-parcela-id={p._id} style={{ transition: 'background-color 0.3s', backgroundColor: selectedIds?.has(p._id) ? 'hsl(var(--primary) / 0.05)' : undefined }}>
                  {canBulkDelete && <BulkCheckboxCell id={p._id} selected={selectedIds?.has(p._id)} onToggle={toggleOne} />}
                  {fieldsConfig.codigo_plantacion ? (
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: '600',
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        {p.codigo_plantacion || '-'}
                      </span>
                    </td>
                  ) : null}
                  {fieldsConfig.proveedor ? <td>{p.proveedor}</td> : null}
                  {fieldsConfig.finca ? <td>{p.finca || '-'}</td> : null}
                  {fieldsConfig.cultivo ? <td>{p.cultivo}</td> : null}
                  {fieldsConfig.variedad ? <td>{p.variedad || '-'}</td> : null}
                  {fieldsConfig.superficie_total ? <td>{p.superficie_total} ha</td> : null}
                  {fieldsConfig.num_plantas ? <td>{p.num_plantas ? p.num_plantas.toLocaleString() : '-'}</td> : null}
                  {fieldsConfig.campana ? <td>{p.campana}</td> : null}
                  <td>
                    <span style={{
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: (p.recintos && p.recintos.length > 0) ? '#dcfce7' : '#fee2e2',
                      color: (p.recintos && p.recintos.length > 0) ? '#166534' : '#991b1b'
                    }}>
                      {p.recintos ? p.recintos.length : 0} zona(s)
                    </span>
                  </td>
                  <td>
                    {p.cuaderno_generado ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#166534', fontSize: '0.75rem' }}>
                        <CheckCircle size={14} /> Cuaderno
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6b7280', fontSize: '0.75rem' }}>
                        <AlertCircle size={14} /> Sin cuaderno
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(p)} title="Editar" data-testid={`btn-edit-${p._id}`}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(p._id)} title="Eliminar" data-testid={`btn-delete-${p._id}`}>
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleGenerateCuaderno(p._id, p.campana)}
                        disabled={generatingCuaderno === p._id}
                        title="Generar Cuaderno de Campo"
                        data-testid={`btn-cuaderno-${p._id}`}
                      >
                        {generatingCuaderno === p._id ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => fetchHistorialTratamientos(p)}
                        title="Ver historial de tratamientos"
                        data-testid={`btn-historial-${p._id}`}
                      >
                        <History size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ParcelasTable;
