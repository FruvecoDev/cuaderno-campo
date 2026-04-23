import React from 'react';
import { AlertTriangle, MinusCircle, Search, X, Check } from 'lucide-react';

/**
 * A single line item of the albaran (either a normal product row or a
 * destare row). Extracted from AlbaranForm.js to reduce file size and keep
 * the complex form logic isolated.
 *
 * Pure presentational — all state lives in the parent and is passed via props.
 */
const AlbaranLineItem = ({
  item,
  index,
  isGuisante,
  preciosCalidad,
  articulosCatalogo,
  articuloSearch,
  activeSearchIndex,
  canRemove,
  // helpers
  formatCantidad,
  parseSpanishNumber,
  calculateItemTotal,
  getPrecioByTenderometria,
  // callbacks
  setArticuloSearch,
  setActiveSearchIndex,
  updateItemTotal,
  removeItem,
  handleArticuloSelect,
}) => {
  const numericGridTemplate =
    isGuisante && preciosCalidad.length > 0
      ? '130px 70px 110px 120px 70px 150px'
      : '130px 70px 120px 70px 150px';

  // ---- Destare row (read-only) ----
  if (item.es_destare) {
    return (
      <div
        style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '10px',
          padding: '1rem',
          marginBottom: '0.75rem',
          position: 'relative',
        }}
        data-testid={`albaran-line-destare-${index}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', marginBottom: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{item.descripcion}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: numericGridTemplate, gap: '0.5rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '600', color: '#dc2626', textTransform: 'uppercase' }}>Cantidad</label>
            <input type="text" className="form-input" value={formatCantidad(item.cantidad)} readOnly style={{ textAlign: 'right', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '600', color: '#dc2626', textTransform: 'uppercase' }}>Ud.</label>
            <span style={{ display: 'block', padding: '0.5rem', color: '#dc2626', fontWeight: '500' }}>kg</span>
          </div>
          {isGuisante && preciosCalidad.length > 0 && (
            <div>
              <label style={{ fontSize: '0.65rem', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Tend.</label>
              <span style={{ display: 'block', padding: '0.5rem', color: '#9ca3af' }}>-</span>
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '600', color: '#dc2626', textTransform: 'uppercase' }}>Precio</label>
            <input type="text" className="form-input" value={`${(item.precio_unitario || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} readOnly style={{ backgroundColor: '#fef2f2', color: '#dc2626' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' }}>Dto %</label>
            <span style={{ display: 'block', padding: '0.5rem', color: '#9ca3af', textAlign: 'center' }}>-</span>
          </div>
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '600', color: '#dc2626', textTransform: 'uppercase' }}>Total</label>
            <input type="text" className="form-input" value={`${calculateItemTotal(item).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} readOnly style={{ textAlign: 'right', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '700' }} />
          </div>
        </div>
      </div>
    );
  }

  // ---- Normal line item (editable) ----
  const searchTerm = (articuloSearch[index] || '').toLowerCase();
  const filteredArticulos = articulosCatalogo.filter(
    (art) =>
      art.codigo?.toLowerCase().includes(searchTerm) ||
      art.nombre?.toLowerCase().includes(searchTerm) ||
      art.categoria?.toLowerCase().includes(searchTerm)
  );
  const grouped = filteredArticulos.reduce((acc, art) => {
    const cat = art.categoria || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(art);
    return acc;
  }, {});

  return (
    <div
      style={{
        background: 'hsl(var(--muted) / 0.15)',
        border: '1px solid hsl(var(--border))',
        borderRadius: '10px',
        padding: '1rem',
        marginBottom: '0.75rem',
        position: 'relative',
      }}
      data-testid={`albaran-line-item-${index}`}
    >
      {/* Row 1: Articulo/Descripcion + buscador + botón eliminar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', display: 'block' }}>
            Articulo / Descripcion
          </label>
          <input
            type="text"
            className="form-input"
            value={item.descripcion}
            onChange={(e) => updateItemTotal(index, 'descripcion', e.target.value)}
            placeholder="Descripcion del articulo..."
            style={{ fontSize: '0.9rem', fontWeight: '500' }}
            data-testid={`item-descripcion-${index}`}
          />

          {articulosCatalogo.length > 0 && (
            <div style={{ position: 'relative', marginTop: '0.35rem' }} data-article-search="true">
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar articulo en catalogo..."
                  value={articuloSearch[index] || ''}
                  onChange={(e) => {
                    setArticuloSearch((prev) => ({ ...prev, [index]: e.target.value }));
                    setActiveSearchIndex(index);
                  }}
                  onFocus={() => setActiveSearchIndex(index)}
                  style={{ fontSize: '0.8rem', paddingLeft: '28px', backgroundColor: item.articulo_id ? '#f0fdf4' : 'white' }}
                  data-testid={`item-buscar-articulo-${index}`}
                />
                {articuloSearch[index] && (
                  <button
                    type="button"
                    onClick={() => {
                      setArticuloSearch((prev) => ({ ...prev, [index]: '' }));
                      setActiveSearchIndex(null);
                    }}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'hsl(var(--muted-foreground))' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {activeSearchIndex === index && articulosCatalogo.length > 0 && (() => {
            const searchEl = document.querySelector(`[data-testid="item-buscar-articulo-${index}"]`);
            const rect = searchEl?.getBoundingClientRect();
            if (!rect) return null;
            return (
              <div style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: rect.width, backgroundColor: 'white', border: '1px solid hsl(var(--border))', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxHeight: '250px', overflowY: 'auto', zIndex: 1200 }}>
                {filteredArticulos.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No se encontraron articulos</div>
                ) : (
                  Object.entries(grouped).map(([categoria, arts]) => (
                    <div key={categoria}>
                      <div style={{ padding: '6px 12px', backgroundColor: 'hsl(var(--muted))', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', position: 'sticky', top: 0 }}>
                        {categoria}
                      </div>
                      {arts.map((art) => (
                        <div
                          key={art._id}
                          onClick={() => {
                            handleArticuloSelect(index, art._id);
                            setArticuloSearch((prev) => ({ ...prev, [index]: art.nombre }));
                            setActiveSearchIndex(null);
                          }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid hsl(var(--border))', transition: 'background-color 0.15s' }}
                          onMouseEnter={(e) => (e.target.style.backgroundColor = 'hsl(var(--primary) / 0.1)')}
                          onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                          data-testid={`articulo-option-${art._id}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{art.nombre}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', backgroundColor: 'hsl(var(--muted))', padding: '1px 6px', borderRadius: '4px' }}>{art.codigo}</span>
                            </div>
                            <span style={{ fontWeight: '600', color: 'hsl(var(--primary))', fontSize: '0.85rem' }}>
                              {(art.precio_unitario || 0).toFixed(2)} €/{art.unidad_medida || 'ud'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          {item.articulo_id && (
            <div style={{ fontSize: '0.7rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.25rem' }}>
              <Check size={12} /> Articulo seleccionado del catalogo
            </div>
          )}
        </div>

        {canRemove && (
          <div style={{ paddingTop: '1.2rem' }}>
            <button
              type="button"
              onClick={() => removeItem(index)}
              style={{ background: 'hsl(var(--destructive) / 0.1)', border: '1px solid hsl(var(--destructive) / 0.3)', borderRadius: '6px', cursor: 'pointer', padding: '0.4rem', color: 'hsl(var(--destructive))' }}
              title="Eliminar linea"
              data-testid={`item-remove-${index}`}
            >
              <MinusCircle size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Numeric fields */}
      <div style={{ display: 'grid', gridTemplateColumns: numericGridTemplate, gap: '0.5rem', alignItems: 'start' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cantidad</label>
          <input
            type="text"
            className="form-input"
            value={formatCantidad(item.cantidad)}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^\d.,]/g, '');
              const numValue = Math.round(parseSpanishNumber(rawValue));
              updateItemTotal(index, 'cantidad', numValue || rawValue);
            }}
            placeholder="0"
            style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: '600' }}
            data-testid={`item-cantidad-${index}`}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unidad</label>
          <select className="form-select" value={item.unidad} onChange={(e) => updateItemTotal(index, 'unidad', e.target.value)} style={{ width: '100%' }} data-testid={`item-unidad-${index}`}>
            <option value="kg">kg</option>
            <option value="ud">ud</option>
            <option value="l">l</option>
            <option value="m">m</option>
          </select>
        </div>
        {isGuisante && preciosCalidad.length > 0 && (
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '700', color: '#1a5276', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tenderom.</label>
            <input
              type="number"
              step="1"
              min="0"
              className="form-input"
              value={item.tenderometria || ''}
              onChange={(e) => updateItemTotal(index, 'tenderometria', e.target.value)}
              placeholder="Ej: 95"
              style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '600' }}
              data-testid={`item-tenderometria-${index}`}
            />
            {item.tenderometria && (() => {
              const precio = getPrecioByTenderometria(item.tenderometria);
              return precio !== null ? (
                <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '600', textAlign: 'center', marginTop: '2px' }}>{precio.toFixed(2)} €/kg</div>
              ) : (
                <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '600', textAlign: 'center', marginTop: '2px' }}>Fuera de rango</div>
              );
            })()}
          </div>
        )}
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precio Unit.</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={item.precio_unitario}
            onChange={(e) => updateItemTotal(index, 'precio_unitario', e.target.value)}
            placeholder="0.00"
            readOnly={isGuisante && preciosCalidad.length > 0 && !!item.tenderometria}
            style={isGuisante && preciosCalidad.length > 0 && item.tenderometria ? { backgroundColor: '#f0fdf4', fontWeight: '700', color: '#16a34a', fontSize: '0.9rem' } : { fontSize: '0.9rem', fontWeight: '600' }}
            data-testid={`item-precio-${index}`}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dto %</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            className="form-input"
            value={item.descuento || ''}
            onChange={(e) => updateItemTotal(index, 'descuento', parseFloat(e.target.value) || 0)}
            placeholder="0"
            style={{ textAlign: 'center', fontSize: '0.9rem' }}
            data-testid={`item-dto-${index}`}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</label>
          <input
            type="text"
            className="form-input"
            value={`${calculateItemTotal(item).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
            disabled
            style={{ textAlign: 'right', fontWeight: '700', fontSize: '0.9rem', backgroundColor: '#f5f5f5' }}
          />
        </div>
      </div>
    </div>
  );
};

export default AlbaranLineItem;
