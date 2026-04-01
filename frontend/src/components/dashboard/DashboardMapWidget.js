import React from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Layers, Satellite } from 'lucide-react';

const TILE_LAYERS = {
  osm: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri' }
};

const CULTIVO_COLORS = {
  'Guisante': '#4CAF50',
  'Brócoli': '#2196F3',
  'Alcachofa': '#9C27B0',
  'Coliflor': '#FF9800',
  'Judía verde': '#009688',
  'Espárrago': '#607D8B',
  'Habas': '#795548',
  'Pimiento': '#F44336',
  'Maíz dulce': '#FFEB3B'
};

const getCultivoColor = (cultivo) => CULTIVO_COLORS[cultivo] || '#8BC34A';

function FitAllBounds({ parcelas }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !map._container) return;
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted || !map || !map._container) return;
      try {
        const allCoords = [];
        parcelas.forEach(p => {
          if (p.recintos) {
            p.recintos.forEach(r => {
              if (r.geometria) r.geometria.forEach(c => allCoords.push([c.lat, c.lng]));
            });
          }
        });
        if (allCoords.length > 0) {
          const bounds = L.latLngBounds(allCoords);
          map.fitBounds(bounds, { padding: [30, 30] });
        }
      } catch (e) { console.debug('FitAllBounds skipped:', e.message); }
    }, 200);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [map, parcelas]);
  return null;
}

const DashboardMapWidget = ({ parcelas, mapType, setMapType, navigate, t }) => {
  const parcelasConGeo = parcelas.filter(p => p.recintos?.some(r => r.geometria?.length >= 3));

  return (
    <div className="card mb-6" data-testid="mapa-parcelas">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={20} /> {t('dashboard.map.title')}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
            {parcelasConGeo.length} {t('dashboard.map.parcelsWithGeometry')}
          </span>
          <button
            onClick={() => setMapType(mapType === 'satellite' ? 'osm' : 'satellite')}
            className="btn btn-sm btn-secondary"
            title={mapType === 'satellite' ? t('dashboard.map.switchToBase') : t('dashboard.map.switchToSatellite')}
          >
            {mapType === 'satellite' ? <Layers size={14} /> : <Satellite size={14} />}
          </button>
        </div>
      </div>
      
      {parcelasConGeo.length > 0 ? (
        <>
          <MapContainer center={[37.0886, -2.3170]} zoom={12} style={{ height: '400px', width: '100%', borderRadius: '8px' }} key={mapType}>
            <TileLayer url={TILE_LAYERS[mapType].url} />
            <FitAllBounds parcelas={parcelas} />
            {parcelas.map(parcela => {
              if (!parcela.recintos) return null;
              return parcela.recintos.map((recinto, rIdx) => {
                if (!recinto.geometria || recinto.geometria.length < 3) return null;
                const coords = recinto.geometria.map(c => [c.lat, c.lng]);
                return (
                  <Polygon 
                    key={`${parcela._id}-${rIdx}`}
                    positions={coords}
                    pathOptions={{ color: getCultivoColor(parcela.cultivo), fillColor: getCultivoColor(parcela.cultivo), fillOpacity: 0.4, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ minWidth: '200px' }}>
                        <strong style={{ fontSize: '1rem' }}>{parcela.codigo_plantacion}</strong>
                        {parcela.recintos.length > 1 && (
                          <div style={{ fontSize: '0.75rem', color: '#1565c0' }}>Zona {rIdx + 1} de {parcela.recintos.length}</div>
                        )}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                          <div><strong>{t('dashboard.map.crop')}:</strong> {parcela.cultivo}</div>
                          <div><strong>{t('dashboard.map.provider')}:</strong> {parcela.proveedor}</div>
                          <div><strong>{t('dashboard.map.farm')}:</strong> {parcela.finca}</div>
                          <div><strong>{t('dashboard.map.surface')}:</strong> {parcela.superficie_total} ha</div>
                        </div>
                        <button onClick={() => navigate('/parcelas')} style={{
                          marginTop: '0.75rem', padding: '0.4rem 0.75rem',
                          backgroundColor: '#2d5a27', color: 'white', border: 'none',
                          borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                        }}>
                          {t('dashboard.map.viewDetails')}
                        </button>
                      </div>
                    </Popup>
                  </Polygon>
                );
              });
            })}
          </MapContainer>
          
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--muted-foreground))' }}>{t('dashboard.map.crops')}:</span>
            {[...new Set(parcelas.map(p => p.cultivo).filter(Boolean))].map(cultivo => (
              <div key={cultivo} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: getCultivoColor(cultivo), borderRadius: '2px' }} />
                <span style={{ fontSize: '0.75rem' }}>{cultivo}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
          <p className="text-muted">{t('dashboard.map.noParcelsWithGeometry')}</p>
        </div>
      )}
    </div>
  );
};

export default DashboardMapWidget;
