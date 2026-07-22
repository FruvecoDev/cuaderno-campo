import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePagination } from '../components/PaginationFooter';

/**
 * useSortAndPaginate — hook unificado para ordenar + paginar listas en el frontend.
 *
 * Consolida el patrón repetido en Proveedores, Contratos, Tratamientos, Visitas,
 * Tareas, Cosechas, Evaluaciones, Cuaderno de Campo, Mapa de Parcelas y SIGPAC.
 *
 * Expone las dos interfaces habituales:
 *   1. Tabla con cabeceras clicables → usar { sortConfig, handleSort }
 *      (toggle ASC/DESC al reclickar la misma columna, reset a 'asc' al cambiar de campo).
 *   2. Dropdown + botón dirección → usar { sortField, setSortField, sortDirection,
 *      toggleSortDirection }.
 *
 * @param {Array} items — colección ya filtrada.
 * @param {Object} config
 * @param {string} config.defaultField — campo por defecto (ej: "fecha_inicio").
 * @param {"asc"|"desc"} [config.defaultDirection="asc"]
 * @param {number} [config.defaultPageSize=20]
 * @param {(item:any, field:string)=>any} [config.getValue] — extractor personalizado
 *        (recomendado si un campo requiere lookup denormalizado o casting).
 * @param {string} [config.storageKey] — si se pasa, persiste sortField+sortDirection
 *        en localStorage para el usuario actual (ej: "sort:evaluaciones").
 *
 * @returns objeto con:
 *   sortField, setSortField, sortDirection, setSortDirection, toggleSortDirection,
 *   sortConfig ({field, direction}), handleSort(field),
 *   sortedItems,
 *   paginatedItems, page, pageSize, totalPages, totalItems, pageStart, pageEnd,
 *   setPage, setPageSize.
 */
export const useSortAndPaginate = (items, config = {}) => {
  const {
    defaultField,
    defaultDirection = 'asc',
    defaultPageSize = 20,
    getValue,
    storageKey,
  } = config;

  // Estado inicial: intenta rehidratar desde localStorage si storageKey está seteado.
  const initial = useMemo(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            field: parsed.field || defaultField,
            direction: parsed.direction || defaultDirection,
          };
        }
      } catch (_e) {
        // corrupto — ignorar y usar defaults
      }
    }
    return { field: defaultField, direction: defaultDirection };
  }, [storageKey, defaultField, defaultDirection]);

  const [sortField, setSortField] = useState(initial.field);
  const [sortDirection, setSortDirection] = useState(initial.direction);

  // Persistir cambios en localStorage.
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ field: sortField, direction: sortDirection })
      );
    } catch (_e) { /* quota / privacy mode — silent */ }
  }, [storageKey, sortField, sortDirection]);

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleSort = useCallback((field) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortField || !Array.isArray(items)) return items || [];
    const arr = [...items];
    const extract = typeof getValue === 'function'
      ? (item) => getValue(item, sortField)
      : (item) => item?.[sortField] ?? '';

    arr.sort((a, b) => {
      const va = extract(a);
      const vb = extract(b);
      // Numérico
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDirection === 'asc' ? va - vb : vb - va;
      }
      // Coerce a string sino
      const sa = String(va ?? '').toLowerCase();
      const sb = String(vb ?? '').toLowerCase();
      if (sa < sb) return sortDirection === 'asc' ? -1 : 1;
      if (sa > sb) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [items, sortField, sortDirection, getValue]);

  const pagination = usePagination(sortedItems, defaultPageSize);

  return {
    // Sort
    sortField, setSortField,
    sortDirection, setSortDirection,
    toggleSortDirection,
    sortConfig: { field: sortField, direction: sortDirection },
    handleSort,
    sortedItems,
    // Paginación (spread para no cambiar nombres esperados por PaginationFooter)
    ...pagination,
  };
};

export default useSortAndPaginate;
