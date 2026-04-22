import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Footer de paginación reutilizable.
 *
 * Props:
 *  - totalItems, page, pageSize, totalPages, pageStart, pageEnd
 *  - onPageChange(nextPage), onPageSizeChange(nextSize)
 *  - itemLabel: etiqueta para singular/plural (default "registros")
 *  - testIdSuffix: sufijo de data-testid (ej. "visitas")
 *  - pageSizeOptions: array de tamaños (default [10,25,50,100,200])
 */
const PaginationFooter = ({
  totalItems,
  page,
  pageSize,
  totalPages,
  pageStart,
  pageEnd,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'registros',
  testIdSuffix = '',
  pageSizeOptions = [10, 25, 50, 100, 200],
}) => {
  if (totalItems === 0) return null;

  const suffix = testIdSuffix ? `-${testIdSuffix}` : '';

  return (
    <div
      data-testid={`pagination-footer${suffix}`}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0.5rem 0.25rem', marginTop: '0.75rem',
        borderTop: '1px solid hsl(var(--border))',
        flexWrap: 'wrap', gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', flexWrap: 'wrap' }}>
        <span>Mostrando <b>{pageStart + 1}-{pageEnd}</b> de <b>{totalItems}</b> {itemLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          Filas:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            data-testid={`select-page-size${suffix}`}
            style={{ padding: '0.2rem 0.35rem', borderRadius: '6px', border: '1px solid hsl(var(--border))', background: 'white', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onPageChange(1)} disabled={page === 1} title="Primera" data-testid={`pag-first${suffix}`}>
          <ChevronsLeft size={14} />
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} title="Anterior" data-testid={`pag-prev${suffix}`}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '0.8rem', padding: '0 0.5rem', whiteSpace: 'nowrap' }}>
          Página <b>{page}</b> / {totalPages}
        </span>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} title="Siguiente" data-testid={`pag-next${suffix}`}>
          <ChevronRight size={14} />
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => onPageChange(totalPages)} disabled={page === totalPages} title="Última" data-testid={`pag-last${suffix}`}>
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

/**
 * Hook para computar la paginación de un array filtrado.
 */
export const usePagination = (items, defaultPageSize = 25) => {
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [page, setPage] = React.useState(1);
  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalItems);
  const paginatedItems = React.useMemo(
    () => (items || []).slice(pageStart, pageEnd),
    [items, pageStart, pageEnd]
  );
  const changePageSize = (n) => { setPageSize(n); setPage(1); };
  return {
    page, pageSize, totalPages, totalItems, pageStart, pageEnd, paginatedItems,
    setPage, setPageSize: changePageSize,
  };
};

export default PaginationFooter;
