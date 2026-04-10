import React from 'react';
import { Filter, Settings, X } from 'lucide-react';

const FIELD_LABELS = {
  objetivo: 'Objetivo',
  fecha_visita: 'Fecha Visita',
  parcela_id: 'Parcela',
  observaciones: 'Observaciones',
  cuestionario_plagas: 'Cuest. Plagas'
};

const TABLE_LABELS = {
  objetivo: 'Objetivo',
  parcela: 'Parcela',
  proveedor: 'Proveedor',
  cultivo: 'Cultivo',
  campana: 'Campana',
  fecha: 'Fecha',
  estado: 'Estado'
};

export const VisitasFieldsConfig = ({
  showFieldsConfig, setShowFieldsConfig,
  fieldsConfig, toggleFieldConfig,
  tableConfig, toggleTableConfig
}) => {
  if (!showFieldsConfig) return null;

  return (
    <div className="card mb-6" data-testid="fields-config-panel">
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontWeight: '600' }}>Configurar Campos</h3>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowFieldsConfig(false)}>
          <X size={16} />
        </button>
      </div>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Campos del Formulario:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fieldsConfig[key]}
                onChange={() => toggleFieldConfig(key)}
                disabled={key === 'parcela_id'}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.875rem' }}>{label} {key === 'parcela_id' && '(obligatorio)'}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Columnas de la Tabla:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={tableConfig[key]}
                onChange={() => toggleTableConfig(key)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.875rem' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export const VisitasSearchFilters = ({
  filters, setFilters, filterOptions,
  hasActiveFilters, clearFilters,
  filteredCount, totalCount
}) => {
  return (
    <div className="card mb-6" data-testid="filters-panel">
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} /> Filtros de Busqueda
        </h3>
        {hasActiveFilters && (
          <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Proveedor</label>
          <select
            className="form-select"
            value={filters.proveedor}
            onChange={(e) => setFilters({...filters, proveedor: e.target.value})}
            data-testid="filter-proveedor"
          >
            <option value="">Todos</option>
            {filterOptions.proveedores.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Cultivo</label>
          <select
            className="form-select"
            value={filters.cultivo}
            onChange={(e) => setFilters({...filters, cultivo: e.target.value})}
            data-testid="filter-cultivo"
          >
            <option value="">Todos</option>
            {filterOptions.cultivos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Campana</label>
          <select
            className="form-select"
            value={filters.campana}
            onChange={(e) => setFilters({...filters, campana: e.target.value})}
            data-testid="filter-campana"
          >
            <option value="">Todas</option>
            {filterOptions.campanas.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Parcela</label>
          <select
            className="form-select"
            value={filters.parcela}
            onChange={(e) => setFilters({...filters, parcela: e.target.value})}
            data-testid="filter-parcela"
          >
            <option value="">Todas</option>
            {filterOptions.parcelas.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      {hasActiveFilters && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
          Mostrando {filteredCount} de {totalCount} visitas
        </p>
      )}
    </div>
  );
};
