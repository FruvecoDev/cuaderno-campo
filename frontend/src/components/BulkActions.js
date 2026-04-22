import React from 'react';
import { Trash2, X, CheckSquare, AlertTriangle } from 'lucide-react';
import api from '../services/api';

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

export const BulkActionBar = ({ selectedCount, onDelete, onClear, deleting }) => {
  const [showConfirm, setShowConfirm] = React.useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div data-testid="bulk-action-bar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 1rem', marginBottom: '0.75rem', borderRadius: '8px',
        background: 'hsl(var(--destructive) / 0.08)', border: '1px solid hsl(var(--destructive) / 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckSquare size={16} style={{ color: 'hsl(var(--primary))' }} />
          <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onClear} className="btn btn-sm btn-secondary" style={{ fontSize: '0.8rem' }} data-testid="bulk-clear"><X size={14} /> Deseleccionar</button>
          <button onClick={() => setShowConfirm(true)} className="btn btn-sm btn-error" disabled={deleting} style={{ fontSize: '0.8rem' }} data-testid="bulk-delete-btn"><Trash2 size={14} /> {deleting ? 'Eliminando...' : `Eliminar (${selectedCount})`}</button>
        </div>
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={() => setShowConfirm(false)}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'hsl(var(--destructive) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={28} style={{ color: 'hsl(var(--destructive))' }} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: '700' }}>Confirmar eliminacion</h3>
            <p style={{ color: 'hsl(var(--muted-foreground))', margin: '0 0 1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Se eliminaran <strong style={{ color: 'hsl(var(--destructive))' }}>{selectedCount} registro{selectedCount > 1 ? 's' : ''}</strong> seleccionado{selectedCount > 1 ? 's' : ''}.<br />Esta accion no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => setShowConfirm(false)} className="btn btn-secondary" style={{ minWidth: '120px' }} data-testid="bulk-confirm-cancel">Cancelar</button>
              <button onClick={() => { setShowConfirm(false); onDelete(); }} className="btn btn-error" style={{ minWidth: '120px' }} disabled={deleting} data-testid="bulk-confirm-accept"><Trash2 size={16} /> {deleting ? 'Eliminando...' : 'Aceptar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

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

export const bulkDeleteApi = async (module, ids) => {
  return await api.post(`/api/bulk-delete/${module}`, { ids: Array.from(ids) });
};
