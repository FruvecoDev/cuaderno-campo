import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';

const formatNumber = (value) => {
  if (!value && value !== 0) return '';
  const cleanValue = String(value).replace(/[^\d,]/g, '');
  const parts = cleanValue.split(',');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
};

const ContratoFormFields = ({
  formData,
  setFormData,
  proveedores,
  clientes,
  cultivos,
  agentesCompra,
  agentesVenta,
  puedeCompra,
  puedeVenta,
  isGuisante,
  addPrecioTenderometria,
  updatePrecioTenderometria,
  removePrecioTenderometria,
  editingId
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid-responsive-4">
        <div className="form-group">
          <label className="form-label">Tipo Contrato *</label>
          <select className="form-select" value={formData.tipo}
            onChange={(e) => setFormData({...formData, tipo: e.target.value, agente_compra: '', agente_venta: ''})}
            required data-testid="select-tipo-contrato">
            {puedeCompra && <option value="Compra">Compra</option>}
            {puedeVenta && <option value="Venta">Venta</option>}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('contracts.campaign')} *</label>
          <input type="text" className="form-input" value={formData.campana}
            onChange={(e) => setFormData({...formData, campana: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">Procedencia *</label>
          <select className="form-select" value={formData.procedencia}
            onChange={(e) => setFormData({...formData, procedencia: e.target.value})} required>
            <option value="Campo">Campo</option>
            <option value="Almacen con tratamiento">Almacen con tratamiento</option>
            <option value="Almacen sin tratamiento">Almacen sin tratamiento</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('common.date')} *</label>
          <input type="date" className="form-input" value={formData.fecha_contrato}
            onChange={(e) => setFormData({...formData, fecha_contrato: e.target.value})} required />
        </div>
      </div>

      {/* Agente y Comision */}
      <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600' }}>
          Agente {formData.tipo === 'Compra' ? 'de Compra' : 'de Venta'} y Comision
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          {formData.tipo === 'Compra' ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Agente de Compra</label>
              <select className="form-select" value={formData.agente_compra}
                onChange={(e) => setFormData({...formData, agente_compra: e.target.value})} data-testid="select-agente-compra">
                <option value="">Sin agente</option>
                {agentesCompra.map(a => (<option key={a._id} value={a._id}>{a.codigo} - {a.nombre}</option>))}
              </select>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Agente de Venta</label>
              <select className="form-select" value={formData.agente_venta}
                onChange={(e) => setFormData({...formData, agente_venta: e.target.value})} data-testid="select-agente-venta">
                <option value="">Sin agente</option>
                {agentesVenta.map(a => (<option key={a._id} value={a._id}>{a.codigo} - {a.nombre}</option>))}
              </select>
            </div>
          )}
          {formData.tipo === 'Compra' && formData.agente_compra && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo Comision Compra</label>
                <select className="form-select" value={formData.comision_compra_tipo}
                  onChange={(e) => setFormData({...formData, comision_compra_tipo: e.target.value})} data-testid="select-comision-compra-tipo">
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="euro_kilo">EUR por Kilo</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Comision {formData.comision_compra_tipo === 'porcentaje' ? '(%)' : '(EUR/kg)'}</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.comision_compra_valor}
                  onChange={(e) => setFormData({...formData, comision_compra_valor: e.target.value})}
                  placeholder={formData.comision_compra_tipo === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 0.05'} data-testid="input-comision-compra-valor" />
              </div>
            </>
          )}
          {formData.tipo === 'Venta' && formData.agente_venta && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo Comision Venta</label>
                <select className="form-select" value={formData.comision_venta_tipo}
                  onChange={(e) => setFormData({...formData, comision_venta_tipo: e.target.value})} data-testid="select-comision-venta-tipo">
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="euro_kilo">EUR por Kilo</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Comision {formData.comision_venta_tipo === 'porcentaje' ? '(%)' : '(EUR/kg)'}</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.comision_venta_valor}
                  onChange={(e) => setFormData({...formData, comision_venta_valor: e.target.value})}
                  placeholder={formData.comision_venta_tipo === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 0.05'} data-testid="input-comision-venta-valor" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Proveedor/Cliente + Cultivo */}
      <div className="grid-2">
        {formData.tipo === 'Compra' ? (
          <div className="form-group">
            <label className="form-label">{t('contracts.provider')}</label>
            <select className="form-select" value={formData.proveedor_id}
              onChange={(e) => setFormData({...formData, proveedor_id: e.target.value, cliente_id: ''})} data-testid="select-proveedor">
              <option value="">{t('common.selectOption')}...</option>
              {proveedores.map(p => (<option key={p._id} value={p._id}>{p.nombre} {p.cif_nif ? `(${p.cif_nif})` : ''}</option>))}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <select className="form-select" value={formData.cliente_id}
              onChange={(e) => setFormData({...formData, cliente_id: e.target.value, proveedor_id: ''})} data-testid="select-cliente">
              <option value="">{t('common.selectOption')}...</option>
              {clientes.map(c => (<option key={c._id} value={c._id}>{c.nombre} {c.nif ? `(${c.nif})` : ''}</option>))}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">{t('contracts.crop')}</label>
          <select className="form-select" value={formData.cultivo_id}
            onChange={(e) => setFormData({...formData, cultivo_id: e.target.value})}>
            <option value="">{t('common.selectOption')}...</option>
            {cultivos.map(c => (<option key={c._id} value={c._id}>{c.nombre} {c.variedad ? `- ${c.variedad}` : ''} ({c.tipo})</option>))}
          </select>
        </div>
      </div>

      {/* Cantidad + Precio + Periodo */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Cantidad (kg) *</label>
          <input type="text" className="form-input" value={formatNumber(formData.cantidad)}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\./g, '');
              if (/^\d*$/.test(rawValue)) setFormData({...formData, cantidad: rawValue});
            }} placeholder="Ej: 1.000" required />
        </div>
      </div>
      <div className="grid-3">
        <div className="form-group">
          <label className="form-label">Precio (EUR/kg) *</label>
          <input type="text" className="form-input" value={formatNumber(formData.precio)}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\./g, '');
              if (/^\d*,?\d*$/.test(rawValue)) setFormData({...formData, precio: rawValue});
            }} placeholder="Ej: 1,50" required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('contracts.startDate')} *</label>
          <input type="date" className="form-input" value={formData.periodo_desde}
            onChange={(e) => setFormData({...formData, periodo_desde: e.target.value})} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('contracts.endDate')} *</label>
          <input type="date" className="form-input" value={formData.periodo_hasta}
            onChange={(e) => setFormData({...formData, periodo_hasta: e.target.value})} required />
        </div>
      </div>

      {/* Forma Pago/Cobro + Destare + Condiciones */}
      <div style={{ background: 'hsl(var(--muted) / 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: '600' }}>Condiciones Comerciales</h4>
        <div className="grid-responsive-4">
          {formData.tipo === 'Compra' ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Forma de Pago</label>
              <select className="form-select" value={formData.forma_pago}
                onChange={(e) => setFormData({...formData, forma_pago: e.target.value})} data-testid="select-forma-pago">
                <option value="">Seleccionar...</option>
                <option value="Contado">Contado</option>
                <option value="30 dias">30 dias</option>
                <option value="60 dias">60 dias</option>
                <option value="90 dias">90 dias</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Pagare">Pagare</option>
              </select>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Forma de Cobro</label>
              <select className="form-select" value={formData.forma_cobro}
                onChange={(e) => setFormData({...formData, forma_cobro: e.target.value})} data-testid="select-forma-cobro">
                <option value="">Seleccionar...</option>
                <option value="Contado">Contado</option>
                <option value="30 dias">30 dias</option>
                <option value="60 dias">60 dias</option>
                <option value="90 dias">90 dias</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Pagare">Pagare</option>
              </select>
            </div>
          )}
          {formData.tipo === 'Compra' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Descuento Destare (%)</label>
              <input type="number" step="0.5" min="0" max="100" className="form-input"
                value={formData.descuento_destare}
                onChange={(e) => setFormData({...formData, descuento_destare: e.target.value})}
                placeholder="Ej: 2.5" data-testid="input-descuento-destare" />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Condiciones Entrega</label>
            <select className="form-select" value={formData.condiciones_entrega}
              onChange={(e) => setFormData({...formData, condiciones_entrega: e.target.value})} data-testid="select-condiciones-entrega">
              <option value="">Seleccionar...</option>
              <option value="FCA">FCA</option>
              <option value="DDP">DDP</option>
              <option value="EXW">EXW</option>
              <option value="FOB">FOB</option>
              <option value="CFR">CFR</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Transporte por cuenta</label>
            <select className="form-select" value={formData.transporte_por_cuenta}
              onChange={(e) => setFormData({...formData, transporte_por_cuenta: e.target.value})} data-testid="select-transporte">
              <option value="">Seleccionar...</option>
              <option value="Empresa">Empresa</option>
              <option value="Proveedor">Proveedor</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Envases por cuenta</label>
            <select className="form-select" value={formData.envases_por_cuenta}
              onChange={(e) => setFormData({...formData, envases_por_cuenta: e.target.value})} data-testid="select-envases">
              <option value="">Seleccionar...</option>
              <option value="Empresa">Empresa</option>
              <option value="Proveedor">Proveedor</option>
              <option value="Cliente">Cliente</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.75rem' }}>
            <input type="checkbox" id="cargas_granel" checked={formData.cargas_granel}
              onChange={(e) => setFormData({...formData, cargas_granel: e.target.checked})} data-testid="checkbox-granel" />
            <label htmlFor="cargas_granel" style={{ fontSize: '0.9rem' }}>Cargas a Granel</label>
          </div>
        </div>
      </div>

      {/* Tenderometria para Guisante */}
      {isGuisante && (
        <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #1a5276' }}>
          <div className="flex justify-between items-center mb-2">
            <h3 style={{ margin: 0, color: '#1a5276', fontSize: '1rem', fontWeight: '600' }}>
              Tabla de Precios por Tenderometria (Guisante)
            </h3>
            <button type="button" className="btn btn-sm btn-primary" onClick={addPrecioTenderometria}>
              <Plus size={14} /> Anadir Rango
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>
            Define rangos de tenderometria y su precio correspondiente en EUR/kg
          </p>
          {(formData.precios_calidad || []).length === 0 ? (
            <p style={{ color: '#6c757d', fontStyle: 'italic', fontSize: '0.85rem' }}>
              No hay rangos definidos. Se usara el precio base del contrato.
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: '0.85rem', backgroundColor: 'white', borderRadius: '4px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a5276' }}>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Tend. Minima</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Tend. Maxima</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'white' }}>Precio (EUR/kg)</th>
                  <th style={{ padding: '8px', textAlign: 'center', width: '60px', color: 'white' }}>Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {(formData.precios_calidad || []).map((pc, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '4px' }}>
                      <input type="number" step="1" className="form-input" style={{ textAlign: 'center' }}
                        value={pc.min_tenderometria} onChange={(e) => updatePrecioTenderometria(idx, 'min_tenderometria', e.target.value)} placeholder="Ej: 90" />
                    </td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" step="1" className="form-input" style={{ textAlign: 'center' }}
                        value={pc.max_tenderometria} onChange={(e) => updatePrecioTenderometria(idx, 'max_tenderometria', e.target.value)} placeholder="Ej: 100" />
                    </td>
                    <td style={{ padding: '4px' }}>
                      <input type="number" step="0.01" className="form-input" style={{ textAlign: 'center' }}
                        value={pc.precio} onChange={(e) => updatePrecioTenderometria(idx, 'precio', e.target.value)} placeholder="Ej: 0.45" />
                    </td>
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      <button type="button" className="btn btn-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                        onClick={() => removePrecioTenderometria(idx)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Observaciones */}
      <div className="form-group">
        <label className="form-label">{t('common.observations')}</label>
        <textarea className="form-textarea" value={formData.observaciones}
          onChange={(e) => setFormData({...formData, observaciones: e.target.value})} placeholder={t('common.observations')} />
      </div>
    </>
  );
};

export default ContratoFormFields;
