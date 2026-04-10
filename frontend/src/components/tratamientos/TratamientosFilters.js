import React from 'react';
import { Filter } from 'lucide-react';

const TratamientosFilters = ({
  filters, setFilters, filterOptions, hasActiveFilters, clearFilters, filteredCount, totalCount
}) => {
  return (
    <div className="card mb-6" data-testid="filters-panel">
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} /> Filtros de Busqueda
        </h3>
        {hasActiveFilters && (
          <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Limpiar filtros</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Campana</label>
          <select className="form-select" value={filters.campana} onChange={(e) => setFilters({ ...filters, campana: e.target.value })} data-testid="filter-campana">
            <option value="">Todas</option>
            {filterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select className="form-select" value={filters.estado} onChange={(e) => setFilters({ ...filters, estado: e.target.value })} data-testid="filter-estado">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Parcela</label>
          <select className="form-select" value={filters.parcela} onChange={(e) => setFilters({ ...filters, parcela: e.target.value })} data-testid="filter-parcela">
            <option value="">Todas</option>
            {filterOptions.parcelas.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Fecha desde</label>
          <input type="date" className="form-input" value={filters.fechaDesde} onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Fecha hasta</label>
          <input type="date" className="form-input" value={filters.fechaHasta} onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={filters.tipo} onChange={(e) => setFilters({ ...filters, tipo: e.target.value })} data-testid="filter-tipo">
            <option value="">Todos</option>
            {filterOptions.tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {hasActiveFilters && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
          Mostrando {filteredCount} de {totalCount} tratamientos
        </p>
      )}
    </div>
  );
};

export default TratamientosFilters;
