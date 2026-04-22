import React from 'react';
import { Trash2, X, CheckSquare } from 'lucide-react';
import api from '../services/api';

/**
 * Hook for bulk selection logic
 */
export const useBulkSelect = (items = []) => {
  const [selectedIds, setSelectedIds] = React.useState(new Set());

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i._id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return { selectedIds, toggleOne, toggleAll, clearSelection, allSelected, someSelected };
};

/**
 * Bulk action bar - shows when items are selected
 */
export const BulkActionBar = ({ selectedCount, onDelete, onClear, deleting }) => {
  if (selectedCount === 0) return null;

  return (
    <div data-testid="bulk-action-bar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.6rem 1rem', marginBottom: '0.75rem', borderRadius: '8px',
      background: 'hsl(var(--destructive) / 0.08)', border: '1px solid hsl(var(--destructive) / 0.25)',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckSquare size={16} style={{ color: 'hsl(var(--primary))' }} />
        <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={onClear} className="btn btn-sm btn-secondary" style={{ fontSize: '0.8rem' }} data-testid="bulk-clear"><X size={14} /> Deseleccionar</button>
        <button onClick={onDelete} className="btn btn-sm btn-error" disabled={deleting} style={{ fontSize: '0.8rem' }} data-testid="bulk-delete-btn"><Trash2 size={14} /> {deleting ? 'Eliminando...' : `Eliminar (${selectedCount})`}</button>
      </div>
    </div>
  );
};

/**
 * Checkbox for table header (select all)
 */
export const BulkCheckboxHeader = ({ allSelected, someSelected, onToggle }) => (
  <th style={{ width: '40px', textAlign: 'center' }}>
    <input
      type="checkbox"
      checked={allSelected}
      ref={el => { if (el) el.indeterminate = someSelected; }}
      onChange={onToggle}
      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
      data-testid="bulk-select-all"
    />
  </th>
);

/**
 * Checkbox for table row
 */
export const BulkCheckboxCell = ({ id, selected, onToggle }) => (
  <td style={{ textAlign: 'center' }}>
    <input
      type="checkbox"
      checked={selected}
      onChange={() => onToggle(id)}
      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
      data-testid={`bulk-select-${id}`}
    />
  </td>
);

/**
 * Execute bulk delete API call
 */
export const bulkDeleteApi = async (module, ids) => {
  return await api.post(`/api/bulk-delete/${module}`, { ids: Array.from(ids) });
};
