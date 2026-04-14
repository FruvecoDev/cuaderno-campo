import React from 'react';
import { Search, Filter, X, FileText, Download } from 'lucide-react';
import { BACKEND_URL } from '../../services/api';

const ContratoFilters = ({
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  clearFilters,
  filterOptions,
  filteredCount,
  totalCount,
  token
}) => {
  const exportFile = async (format) => {
    try {
      const params = new URLSearchParams();
      if (filters.proveedor) params.append('proveedor', filters.proveedor);
      if (filters.cultivo) params.append('cultivo', filters.cultivo);
      if (filters.campana) params.append('campana', filters.campana);
      if (filters.tipo) params.append('tipo', filters.tipo);
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
      
      const response = await fetch(`${BACKEND_URL}/api/contratos/export/${format}?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contratos_${new Date().toISOString().slice(0,10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {

      alert(`Error al exportar ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="card mb-4" data-testid="contratos-filtros">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFilters ? '1rem' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }} />
            <input className="form-input" style={{ paddingLeft: '35px' }} placeholder="Buscar contratos..."
              value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} data-testid="input-buscar-contratos" />
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-testid="btn-toggle-filtros">
            <Filter size={16} /> Filtros avanzados
            {hasActiveFilters && (
              <span style={{ backgroundColor: '#1976d2', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[filters.proveedor, filters.cultivo, filters.campana, filters.tipo, filters.fecha_desde, filters.fecha_hasta].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
        {hasActiveFilters && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={clearFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} data-testid="btn-limpiar-filtros">
            <X size={14} /> Limpiar filtros
          </button>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
          <button type="button" className="btn btn-sm" onClick={() => exportFile('pdf')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#dc2626', color: 'white' }}
            title="Exportar a PDF" data-testid="btn-export-pdf">
            <FileText size={14} /> PDF
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportFile('excel')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#16a34a', color: 'white' }}
            title="Exportar a Excel" data-testid="btn-export-excel">
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Proveedor</label>
            <select className="form-select" value={filters.proveedor} onChange={(e) => setFilters({...filters, proveedor: e.target.value})} data-testid="select-filtro-proveedor">
              <option value="">Todos</option>
              {filterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Cultivo</label>
            <select className="form-select" value={filters.cultivo} onChange={(e) => setFilters({...filters, cultivo: e.target.value})} data-testid="select-filtro-cultivo">
              <option value="">Todos</option>
              {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Campana</label>
            <select className="form-select" value={filters.campana} onChange={(e) => setFilters({...filters, campana: e.target.value})} data-testid="select-filtro-campana">
              <option value="">Todas</option>
              {filterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Tipo</label>
            <select className="form-select" value={filters.tipo} onChange={(e) => setFilters({...filters, tipo: e.target.value})} data-testid="select-filtro-tipo">
              <option value="">Todos</option>
              {filterOptions.tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha Desde</label>
            <input type="date" className="form-input" value={filters.fecha_desde} onChange={(e) => setFilters({...filters, fecha_desde: e.target.value})} data-testid="input-filtro-fecha-desde" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha Hasta</label>
            <input type="date" className="form-input" value={filters.fecha_hasta} onChange={(e) => setFilters({...filters, fecha_hasta: e.target.value})} data-testid="input-filtro-fecha-hasta" />
          </div>
        </div>
      )}

      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
        Mostrando <strong>{filteredCount}</strong> de <strong>{totalCount}</strong> contratos
        {hasActiveFilters && ' (filtrados)'}
      </div>
    </div>
  );
};

export default ContratoFilters;
