import { useState } from 'react';

export const useColumnConfig = (storageKey, defaultColumns) => {
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge: keep saved order/visibility but add any new columns from defaults
        const savedIds = new Set(parsed.map(c => c.id));
        const merged = [...parsed];
        defaultColumns.forEach(dc => {
          if (!savedIds.has(dc.id)) merged.push(dc);
        });
        return merged;
      }
    } catch (e) { /* ignore */ }
    return defaultColumns;
  });
  const [showConfig, setShowConfig] = useState(false);

  const save = () => { localStorage.setItem(storageKey, JSON.stringify(columns)); setShowConfig(false); };
  const reset = () => { setColumns([...defaultColumns]); };
  const visibleColumns = columns.filter(c => c.visible);
  const isVisible = (id) => { const c = columns.find(col => col.id === id); return c ? c.visible : true; };

  return { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns, isVisible };
};
