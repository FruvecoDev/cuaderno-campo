import React from 'react';

/**
 * Shows the per-tenderometria price bracket table for guisante contracts.
 * Purely presentational; rendered inline inside AlbaranForm when applicable.
 */
const AlbaranPreciosCalidad = ({ preciosCalidad }) => {
  if (!preciosCalidad || preciosCalidad.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '0.75rem',
        padding: '0.75rem',
        background: '#e3f2fd',
        borderRadius: '6px',
        border: '1px solid #1a5276',
      }}
      data-testid="albaran-precios-calidad"
    >
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: '#1a5276',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Precios por Tenderometria (Guisante)
      </span>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        {preciosCalidad.map((pc, idx) => (
          <div
            key={`pc-${pc.min_tenderometria}-${pc.max_tenderometria}-${idx}`}
            style={{
              background: 'white',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              border: '1px solid #90caf9',
            }}
          >
            <span style={{ fontWeight: '600', color: '#1a5276' }}>
              {pc.min_tenderometria}-{pc.max_tenderometria}
            </span>
            <span style={{ margin: '0 0.35rem', color: '#64748b' }}>&rarr;</span>
            <span style={{ fontWeight: '700', color: '#16a34a' }}>
              {parseFloat(pc.precio).toFixed(2)} €/kg
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlbaranPreciosCalidad;
