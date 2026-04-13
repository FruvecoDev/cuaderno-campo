import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export const useColumnConfig = (storageKey, defaultColumns) => {
  const [columns, setColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
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
  const loaded = useRef(false);

  // Load from server on mount
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const module = storageKey.replace('_col_config', '');
    api.get(`/api/user-config/columns/${module}`).then(data => {
      if (data.columns && data.columns.length > 0) {
        const savedIds = new Set(data.columns.map(c => c.id));
        const merged = [...data.columns];
        defaultColumns.forEach(dc => {
          if (!savedIds.has(dc.id)) merged.push(dc);
        });
        setColumns(merged);
        localStorage.setItem(storageKey, JSON.stringify(merged));
      }
    }).catch(() => { /* use localStorage fallback */ });
  }, []);

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(columns));
    setShowConfig(false);
    const module = storageKey.replace('_col_config', '');
    api.put(`/api/user-config/columns/${module}`, { columns }).catch(() => {});
  };

  const reset = () => { setColumns([...defaultColumns]); };
  const visibleColumns = columns.filter(c => c.visible);
  const isVisible = (id) => { const c = columns.find(col => col.id === id); return c ? c.visible : true; };

  return { columns, setColumns, showConfig, setShowConfig, save, reset, visibleColumns, isVisible };
};
