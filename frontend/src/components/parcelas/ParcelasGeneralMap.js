import React from 'react';
import { Map as MapIcon, Eye } from 'lucide-react';
import AdvancedParcelMap from '../AdvancedParcelMap';

export const ParcelasGeneralMap = ({ filteredParcelas, showGeneralMap }) => {
  if (!showGeneralMap) return null;

  return (
    <div className="card mb-6">
      <h3 style={{ fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <MapIcon size={18} /> Mapa General de Parcelas
      </h3>
      <AdvancedParcelMap
        parcelas={filteredParcelas}
        showAllParcelas={true}
        height="500px"
        onParcelaSelect={(parcela) => {
          const row = document.querySelector(`[data-parcela-id="${parcela._id}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.style.backgroundColor = 'hsl(var(--primary) / 0.1)';
            setTimeout(() => { row.style.backgroundColor = ''; }, 2000);
          }
        }}
      />
      <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
        Haz clic en una parcela del mapa para localizarla en la tabla. Colores según cultivo.
      </p>
    </div>
  );
};

export default ParcelasGeneralMap;
