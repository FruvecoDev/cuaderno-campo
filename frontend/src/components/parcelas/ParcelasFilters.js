import React from 'react';
import { Filter, Settings, X, ChevronDown, ChevronUp } from 'lucide-react';

const FIELD_LABELS = {
  contrato_id: 'Contrato',
  codigo_plantacion: 'Código Plantación',
  proveedor: 'Proveedor',
  finca: 'Finca',
  cultivo: 'Cultivo',
  variedad: 'Variedad',
  superficie_total: 'Superficie',
  num_plantas: 'Nº Plantas',
  campana: 'Campaña'
};

export const ParcelasFilters = ({
  filters, setFilters, filterOptions, hasActiveFilters, clearFilters,
  showFieldsConfig, setShowFieldsConfig, fieldsConfig, toggleFieldConfig
}) => {
  return (
    <>
      {/* Fields config panel */}
      {showFieldsConfig && (
        <div className="card mb-6" data-testid="fields-config-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: '600' }}>Configurar Campos Visibles</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(FIELD_LABELS).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fieldsConfig[key]}
                  onChange={() => toggleFieldConfig(key)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filters panel */}
      <div className="card mb-6" data-testid="filters-panel">
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Filtros
          </h3>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Proveedor</label>
            <select className="form-select" value={filters.proveedor} onChange={(e) => setFilters({...filters, proveedor: e.target.value})} data-testid="filter-proveedor">
              <option value="">Todos</option>
              {filterOptions.proveedores?.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cultivo</label>
            <select className="form-select" value={filters.cultivo} onChange={(e) => setFilters({...filters, cultivo: e.target.value})} data-testid="filter-cultivo">
              <option value="">Todos</option>
              {filterOptions.cultivos?.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Campaña</label>
            <select className="form-select" value={filters.campana} onChange={(e) => setFilters({...filters, campana: e.target.value})} data-testid="filter-campana">
              <option value="">Todas</option>
              {filterOptions.campanas?.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Código Plantación</label>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar código..."
              value={filters.codigo_plantacion}
              onChange={(e) => setFilters({...filters, codigo_plantacion: e.target.value})}
              data-testid="filter-codigo"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ParcelasFilters;
