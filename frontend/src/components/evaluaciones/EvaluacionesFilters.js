import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const EvaluacionesFilters = ({ filters, setFilters, filterOptions, hasActiveFilters, clearFilters }) => {
  const { t } = useTranslation();

  return (
    <div className="card mb-6" data-testid="filtros-evaluaciones">
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontWeight: '600', margin: 0 }}>{t('common.filters')}</h3>
        {hasActiveFilters && (
          <button className="btn btn-sm btn-secondary" onClick={clearFilters} data-testid="btn-limpiar-filtros">
            <X size={14} style={{ marginRight: '0.25rem' }} />
            {t('common.clear')} {t('common.filters').toLowerCase()}
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('parcels.title')}</label>
          <select className="form-select" value={filters.parcela} onChange={(e) => setFilters({...filters, parcela: e.target.value})} data-testid="filter-parcela">
            <option value="">{t('common.all')}</option>
            {filterOptions.parcelas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('crops.title')}</label>
          <select className="form-select" value={filters.cultivo} onChange={(e) => setFilters({...filters, cultivo: e.target.value})} data-testid="filter-cultivo">
            <option value="">{t('common.all')}</option>
            {filterOptions.cultivos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('suppliers.title')}</label>
          <select className="form-select" value={filters.proveedor} onChange={(e) => setFilters({...filters, proveedor: e.target.value})} data-testid="filter-proveedor">
            <option value="">{t('common.all')}</option>
            {filterOptions.proveedores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('contracts.campaign')}</label>
          <select className="form-select" value={filters.campana} onChange={(e) => setFilters({...filters, campana: e.target.value})} data-testid="filter-campana">
            <option value="">{t('common.all')}</option>
            {filterOptions.campanas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('contracts.title')}</label>
          <select className="form-select" value={filters.contrato} onChange={(e) => setFilters({...filters, contrato: e.target.value})} data-testid="filter-contrato">
            <option value="">{t('common.all')}</option>
            {filterOptions.contratos.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('common.status')}</label>
          <select className="form-select" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})} data-testid="filter-estado">
            <option value="">{t('common.all')}</option>
            <option value="borrador">{t('evaluations.draft')}</option>
            <option value="completada">{t('evaluations.completed')}</option>
            <option value="archivada">{t('evaluations.archived')}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default EvaluacionesFilters;
