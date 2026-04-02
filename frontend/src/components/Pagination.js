import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
  if (totalItems <= 0) return null;

  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '0.75rem' }} data-testid="pagination">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
        <span>{from}-{to} de {totalItems.toLocaleString()}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid hsl(var(--border))', fontSize: '0.85rem', cursor: 'pointer' }}
          data-testid="page-size-select"
        >
          {[25, 50, 100].map(s => (
            <option key={s} value={s}>{s} / pág</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <ChevronLeft size={14} />
        </button>

        {startPage > 1 && <span style={{ padding: '0.25rem 0.35rem', fontSize: '0.8rem' }}>...</span>}
        
        {pages.map(p => (
          <button
            key={p}
            className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onPageChange(p)}
            style={{ padding: '0.25rem 0.6rem', minWidth: '32px', fontSize: '0.8rem' }}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && <span style={{ padding: '0.25rem 0.35rem', fontSize: '0.8rem' }}>...</span>}

        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <ChevronRight size={14} />
        </button>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
