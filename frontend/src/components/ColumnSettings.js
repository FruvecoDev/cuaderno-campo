import React, { useState, useRef, useEffect } from 'react';
import { Settings2, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw, GripVertical } from 'lucide-react';

/**
 * ColumnSettings
 * Popover para configurar visibilidad y orden de columnas de una tabla.
 *
 * Props:
 *  - columns: Array<{ key: string, label: string, visible?: boolean }>
 *  - onChange: (newColumns) => void
 *  - onReset: () => void (opcional, restaura la configuración por defecto)
 *
 * Usa el componente con un estado persistido (p.ej. localStorage).
 */
export const ColumnSettings = ({ columns, onChange, onReset, testId = 'column-settings' }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleVisible = (key) => {
    onChange(columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  };

  const moveColumn = (idx, delta) => {
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= columns.length) return;
    const next = [...columns];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onChange(next);
  };

  const setPosition = (idx, targetPos) => {
    // targetPos: 1-based
    const total = columns.length;
    let pos = parseInt(targetPos, 10);
    if (Number.isNaN(pos)) return;
    if (pos < 1) pos = 1;
    if (pos > total) pos = total;
    const newIdx = pos - 1;
    if (newIdx === idx) return;
    const next = [...columns];
    const [item] = next.splice(idx, 1);
    next.splice(newIdx, 0, item);
    onChange(next);
  };

  // Drag & drop state
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const onDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch { /* ignore */ }
  };
  const onDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  };
  const onDragLeave = () => setDragOverIdx(null);
  const onDrop = (e, targetIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null); setDragOverIdx(null);
      return;
    }
    const next = [...columns];
    const [item] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, item);
    onChange(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const onDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const visibleCount = columns.filter((c) => c.visible !== false).length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        ref={btnRef}
        className="btn btn-sm btn-secondary"
        onClick={() => setOpen((o) => !o)}
        data-testid={testId}
        title="Configurar columnas: mostrar, ocultar y reordenar"
      >
        <Settings2 size={14} style={{ marginRight: '0.3rem' }} />
        Columnas
        <span style={{
          marginLeft: '0.4rem',
          fontSize: '0.7rem',
          fontWeight: '500',
          color: 'hsl(var(--muted-foreground))',
        }}>
          ({visibleCount}/{columns.length})
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 200,
            minWidth: '320px',
            maxHeight: '360px',
            overflowY: 'auto',
            background: 'white',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '0.5rem',
          }}
        >
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.35rem 0.5rem', marginBottom: '0.35rem',
            fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))',
            textTransform: 'uppercase', letterSpacing: '0.04em',
            borderBottom: '1px solid hsl(var(--border))',
          }}>
            <span>Columnas</span>
            {onReset && (
              <button
                type="button"
                onClick={() => { onReset(); }}
                title="Restablecer orden y visibilidad"
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: 'hsl(var(--muted-foreground))',
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0,
                }}
              >
                <RotateCcw size={11} /> Restablecer
              </button>
            )}
          </div>
          {columns.map((c, idx) => {
            const isVisible = c.visible !== false;
            const isDragging = dragIdx === idx;
            const isDragTarget = dragOverIdx === idx && dragIdx !== null && dragIdx !== idx;
            return (
              <div
                key={c.key}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.25rem 0.35rem',
                  borderRadius: '6px',
                  background: isDragTarget
                    ? 'hsl(var(--primary)/0.15)'
                    : (isVisible ? 'transparent' : 'hsl(var(--muted)/0.4)'),
                  opacity: isDragging ? 0.4 : (isVisible ? 1 : 0.7),
                  borderTop: isDragTarget && dragIdx > idx ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                  borderBottom: isDragTarget && dragIdx < idx ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isDragTarget) e.currentTarget.style.background = 'hsl(var(--muted)/0.6)';
                }}
                onMouseLeave={(e) => {
                  if (!isDragTarget) {
                    e.currentTarget.style.background = isVisible ? 'transparent' : 'hsl(var(--muted)/0.4)';
                  }
                }}
              >
                <span
                  title="Arrastrar para reordenar"
                  style={{
                    cursor: 'grab',
                    color: 'hsl(var(--muted-foreground))',
                    display: 'inline-flex',
                    padding: '0.1rem',
                  }}
                >
                  <GripVertical size={13} />
                </span>
                <input
                  type="number"
                  min={1}
                  max={columns.length}
                  value={idx + 1}
                  onChange={(e) => setPosition(idx, e.target.value)}
                  title="Escribe la posición exacta de esta columna"
                  style={{
                    width: '38px',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: 'hsl(var(--muted-foreground))',
                    background: 'hsl(var(--muted))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '4px',
                    padding: '0.1rem 0.15rem',
                    MozAppearance: 'textfield',
                  }}
                  onClick={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() => toggleVisible(c.key)}
                  title={isVisible ? 'Ocultar' : 'Mostrar'}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: isVisible ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    padding: '0.25rem',
                    display: 'inline-flex',
                  }}
                >
                  {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <span style={{ flex: 1, fontSize: '0.85rem', color: isVisible ? 'inherit' : 'hsl(var(--muted-foreground))' }}>
                  {c.label}
                </span>
                <button
                  type="button"
                  onClick={() => moveColumn(idx, -1)}
                  disabled={idx === 0}
                  title="Subir"
                  style={{
                    border: 'none', background: 'none',
                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                    color: idx === 0 ? 'hsl(var(--muted-foreground)/0.4)' : 'hsl(var(--muted-foreground))',
                    padding: '0.25rem', display: 'inline-flex',
                  }}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveColumn(idx, 1)}
                  disabled={idx === columns.length - 1}
                  title="Bajar"
                  style={{
                    border: 'none', background: 'none',
                    cursor: idx === columns.length - 1 ? 'not-allowed' : 'pointer',
                    color: idx === columns.length - 1 ? 'hsl(var(--muted-foreground)/0.4)' : 'hsl(var(--muted-foreground))',
                    padding: '0.25rem', display: 'inline-flex',
                  }}
                >
                  <ArrowDown size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Hook para mantener la configuracion de columnas con persistencia localStorage.
 *
 * Uso:
 *   const [cols, setCols] = useColumnConfig('acm.columns.historico', DEFAULT_COLS);
 */
export const useColumnConfig = (storageKey, defaultColumns) => {
  const [cols, setCols] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaultColumns;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return defaultColumns;
      // Sincronizar con defaultColumns: anadir nuevas, eliminar obsoletas
      const byKey = new Map(defaultColumns.map((c) => [c.key, c]));
      const seen = new Set();
      const merged = [];
      saved.forEach((s) => {
        const def = byKey.get(s.key);
        if (!def) return;
        merged.push({ ...def, visible: s.visible !== false });
        seen.add(s.key);
      });
      defaultColumns.forEach((d) => {
        if (!seen.has(d.key)) merged.push(d);
      });
      return merged;
    } catch {
      return defaultColumns;
    }
  });

  useEffect(() => {
    try {
      const toSave = cols.map((c) => ({ key: c.key, visible: c.visible !== false }));
      window.localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {
      /* ignore */
    }
  }, [cols, storageKey]);

  const reset = () => setCols(defaultColumns);

  return [cols, setCols, reset];
};

export default ColumnSettings;
