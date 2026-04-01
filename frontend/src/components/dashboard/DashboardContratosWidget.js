import React from 'react';
import { FileSignature, ShoppingCart, TrendingUp, TrendingDown } from 'lucide-react';

const DashboardContratosWidget = ({ kpis, navigate }) => {
  if (!kpis.contratos_stats) return null;

  return (
    <div className="card mb-6" data-testid="contratos-activos">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSignature size={22} style={{ color: '#7b1fa2' }} /> Contratos Activos
        </h2>
        <button onClick={() => navigate('/contratos')} className="btn btn-sm btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          Ver todos
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#f3e5f5', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#7b1fa2', fontWeight: '500' }}>Total Activos</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#7b1fa2' }}>{kpis.contratos_stats.total_activos}</div>
        </div>
        <div style={{ backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #1976d2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShoppingCart size={16} style={{ color: '#1976d2' }} />
            <span style={{ fontSize: '0.8rem', color: '#1976d2', fontWeight: '600' }}>Compra</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1565c0' }}>
            {kpis.contratos_stats.compra?.count || 0} contratos
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {((kpis.contratos_stats.compra?.cantidad_total || 0) / 1000).toFixed(0)} t | {'\u20AC'}{((kpis.contratos_stats.compra?.valor_total || 0) / 1000).toFixed(0)}k
          </div>
        </div>
        <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #2e7d32' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: '#2e7d32' }} />
            <span style={{ fontSize: '0.8rem', color: '#2e7d32', fontWeight: '600' }}>Venta</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1b5e20' }}>
            {kpis.contratos_stats.venta?.count || 0} contratos
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {((kpis.contratos_stats.venta?.cantidad_total || 0) / 1000).toFixed(0)} t | {'\u20AC'}{((kpis.contratos_stats.venta?.valor_total || 0) / 1000).toFixed(0)}k
          </div>
        </div>
        <div style={{ 
          backgroundColor: (kpis.contratos_stats.venta?.valor_total || 0) >= (kpis.contratos_stats.compra?.valor_total || 0) ? '#e8f5e9' : '#ffebee', 
          padding: '1rem', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: '500' }}>Balance Contratos</div>
          <div style={{ 
            fontSize: '1.25rem', fontWeight: '700', 
            color: (kpis.contratos_stats.venta?.valor_total || 0) >= (kpis.contratos_stats.compra?.valor_total || 0) ? '#2e7d32' : '#c62828',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
          }}>
            {(kpis.contratos_stats.venta?.valor_total || 0) >= (kpis.contratos_stats.compra?.valor_total || 0) 
              ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            {'\u20AC'}{(((kpis.contratos_stats.venta?.valor_total || 0) - (kpis.contratos_stats.compra?.valor_total || 0)) / 1000).toFixed(1)}k
          </div>
        </div>
      </div>
      
      {kpis.contratos_activos?.length > 0 && (
        <div style={{ backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '100px 70px 150px 120px auto 100px',
            gap: '0.5rem', padding: '0.5rem 1rem',
            backgroundColor: '#7b1fa2', color: 'white', fontSize: '0.75rem', fontWeight: '600'
          }}>
            <div>N Contrato</div>
            <div>Tipo</div>
            <div>Prov./Cliente</div>
            <div>Cultivo</div>
            <div>Cantidad</div>
            <div style={{ textAlign: 'right' }}>Valor</div>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {kpis.contratos_activos.map((contrato, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '100px 70px 150px 120px auto 100px',
                gap: '0.5rem', padding: '0.5rem 1rem',
                backgroundColor: idx % 2 === 0 ? 'white' : 'hsl(var(--muted))',
                fontSize: '0.8rem', alignItems: 'center'
              }}>
                <div style={{ fontWeight: '600', color: '#7b1fa2' }}>{contrato.numero}</div>
                <div>
                  <span style={{
                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500',
                    backgroundColor: contrato.tipo === 'Compra' ? '#e3f2fd' : '#e8f5e9',
                    color: contrato.tipo === 'Compra' ? '#1565c0' : '#2e7d32'
                  }}>
                    {contrato.tipo}
                  </span>
                </div>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {contrato.tipo === 'Venta' ? contrato.cliente : contrato.proveedor}
                </div>
                <div>{contrato.cultivo || '-'}</div>
                <div>{(contrato.cantidad / 1000).toFixed(1)} t</div>
                <div style={{ textAlign: 'right', fontWeight: '600' }}>{'\u20AC'}{(contrato.valor_total / 1000).toFixed(1)}k</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContratosWidget;
