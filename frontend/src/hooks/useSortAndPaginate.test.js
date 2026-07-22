/**
 * Test suite para useSortAndPaginate.
 *
 * Cubre:
 *  - Ordenación string ASC/DESC, numérica, mixta
 *  - Toggle direction al reclickar mismo campo (handleSort)
 *  - Reset a 'asc' al cambiar de campo (handleSort)
 *  - Dropdown API (setSortField / toggleSortDirection)
 *  - Extractor personalizado (getValue)
 *  - Persistencia en localStorage (guardar + rehidratar)
 *  - Paginación básica y respuesta a cambios de items
 *  - Comportamiento sin defaultField (solo paginación)
 */
import { renderHook, act } from '@testing-library/react';
import useSortAndPaginate from './useSortAndPaginate';

const sample = [
  { id: 'a', nombre: 'Zeta', valor: 10 },
  { id: 'b', nombre: 'Alfa', valor: 30 },
  { id: 'c', nombre: 'Mike', valor: 20 },
];

beforeEach(() => {
  window.localStorage.clear();
});

describe('useSortAndPaginate — sorting', () => {
  test('ordena strings ASC por defecto', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, { defaultField: 'nombre' }));
    expect(result.current.sortedItems.map(i => i.nombre)).toEqual(['Alfa', 'Mike', 'Zeta']);
  });

  test('ordena strings DESC cuando se configura', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, { defaultField: 'nombre', defaultDirection: 'desc' }));
    expect(result.current.sortedItems.map(i => i.nombre)).toEqual(['Zeta', 'Mike', 'Alfa']);
  });

  test('ordena numérica ASC/DESC correctamente', () => {
    const { result, rerender } = renderHook(({ dir }) => useSortAndPaginate(sample, { defaultField: 'valor', defaultDirection: dir }), {
      initialProps: { dir: 'asc' },
    });
    expect(result.current.sortedItems.map(i => i.valor)).toEqual([10, 20, 30]);
    rerender({ dir: 'desc' });
    // Nota: el hook toma el defaultDirection sólo en el mount inicial. Verificamos via toggle:
    act(() => result.current.toggleSortDirection());
    expect(result.current.sortedItems.map(i => i.valor)).toEqual([30, 20, 10]);
  });

  test('sin defaultField devuelve items en su orden original', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, {}));
    expect(result.current.sortedItems.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('useSortAndPaginate — handleSort (tabla clicable)', () => {
  test('primer click en un campo aplica ASC', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, { defaultField: 'nombre' }));
    act(() => result.current.handleSort('valor'));
    expect(result.current.sortConfig).toEqual({ field: 'valor', direction: 'asc' });
  });

  test('reclickar el mismo campo alterna a DESC', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, { defaultField: 'nombre' }));
    act(() => result.current.handleSort('valor'));
    act(() => result.current.handleSort('valor'));
    expect(result.current.sortConfig).toEqual({ field: 'valor', direction: 'desc' });
  });

  test('cambiar a otro campo resetea a ASC', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, { defaultField: 'nombre' }));
    act(() => result.current.handleSort('valor'));
    act(() => result.current.handleSort('valor')); // -> desc
    act(() => result.current.handleSort('nombre'));
    expect(result.current.sortConfig).toEqual({ field: 'nombre', direction: 'asc' });
  });
});

describe('useSortAndPaginate — dropdown API', () => {
  test('setSortField y toggleSortDirection funcionan', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, { defaultField: 'nombre' }));
    act(() => result.current.setSortField('valor'));
    expect(result.current.sortField).toBe('valor');
    act(() => result.current.toggleSortDirection());
    expect(result.current.sortDirection).toBe('desc');
    act(() => result.current.toggleSortDirection());
    expect(result.current.sortDirection).toBe('asc');
  });
});

describe('useSortAndPaginate — getValue custom', () => {
  test('respeta el extractor personalizado', () => {
    const items = [
      { id: 'a', arr: [1, 2, 3] },
      { id: 'b', arr: [1] },
      { id: 'c', arr: [1, 2] },
    ];
    const { result } = renderHook(() => useSortAndPaginate(items, {
      defaultField: 'count',
      getValue: (item, field) => (field === 'count' ? item.arr.length : item[field]),
    }));
    expect(result.current.sortedItems.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('useSortAndPaginate — persistencia localStorage', () => {
  test('guarda la elección al cambiar campo/dirección', () => {
    const { result } = renderHook(() => useSortAndPaginate(sample, {
      defaultField: 'nombre',
      storageKey: 'test:sort',
    }));
    act(() => result.current.setSortField('valor'));
    act(() => result.current.toggleSortDirection());
    const stored = JSON.parse(window.localStorage.getItem('test:sort'));
    expect(stored).toEqual({ field: 'valor', direction: 'desc' });
  });

  test('rehidrata desde localStorage al montar', () => {
    window.localStorage.setItem('test:sort', JSON.stringify({ field: 'valor', direction: 'desc' }));
    const { result } = renderHook(() => useSortAndPaginate(sample, {
      defaultField: 'nombre',
      storageKey: 'test:sort',
    }));
    expect(result.current.sortField).toBe('valor');
    expect(result.current.sortDirection).toBe('desc');
    expect(result.current.sortedItems.map(i => i.valor)).toEqual([30, 20, 10]);
  });

  test('localStorage corrupto no rompe el hook', () => {
    window.localStorage.setItem('test:sort', 'not-valid-json');
    const { result } = renderHook(() => useSortAndPaginate(sample, {
      defaultField: 'nombre',
      storageKey: 'test:sort',
    }));
    expect(result.current.sortField).toBe('nombre');
  });
});

describe('useSortAndPaginate — paginación', () => {
  const big = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, nombre: `Item ${i + 1}`, valor: i + 1 }));

  test('paginatedItems respeta pageSize', () => {
    const { result } = renderHook(() => useSortAndPaginate(big, { defaultField: 'valor', defaultPageSize: 10 }));
    expect(result.current.paginatedItems).toHaveLength(10);
    expect(result.current.totalItems).toBe(50);
    expect(result.current.totalPages).toBe(5);
  });

  test('cambiar de página muestra el slice correcto', () => {
    const { result } = renderHook(() => useSortAndPaginate(big, { defaultField: 'valor', defaultPageSize: 10 }));
    act(() => result.current.setPage(2));
    expect(result.current.paginatedItems[0].valor).toBe(11);
    expect(result.current.paginatedItems[9].valor).toBe(20);
  });

  test('setPageSize actualiza el número de páginas', () => {
    const { result } = renderHook(() => useSortAndPaginate(big, { defaultField: 'valor', defaultPageSize: 10 }));
    act(() => result.current.setPageSize(25));
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(25);
  });

  test('paginación respeta el orden aplicado', () => {
    const { result } = renderHook(() => useSortAndPaginate(big, { defaultField: 'valor', defaultDirection: 'desc', defaultPageSize: 5 }));
    // Primera página con orden DESC debe empezar por 50
    expect(result.current.paginatedItems.map(i => i.valor)).toEqual([50, 49, 48, 47, 46]);
  });
});

describe('useSortAndPaginate — casos borde', () => {
  test('items null/undefined devuelve array vacío', () => {
    const { result } = renderHook(() => useSortAndPaginate(null, { defaultField: 'x' }));
    expect(result.current.sortedItems).toEqual([]);
    expect(result.current.paginatedItems).toEqual([]);
  });

  test('items vacío devuelve totalItems=0 y no falla al cambiar de página', () => {
    const { result } = renderHook(() => useSortAndPaginate([], { defaultField: 'x' }));
    expect(result.current.totalItems).toBe(0);
    act(() => result.current.setPage(5));
    expect(result.current.paginatedItems).toEqual([]);
  });
});
