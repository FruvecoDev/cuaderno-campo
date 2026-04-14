import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key, Webhook, History, FileDown, Plus, Trash2, Eye, EyeOff, Copy, Check,
  RefreshCw, Send, AlertCircle, CheckCircle, ToggleLeft, ToggleRight,
  Shield, Activity, Database, Clock, ChevronDown, ChevronUp, Link2, Zap
} from 'lucide-react';
import api from '../services/api';

const MODULOS_DISPONIBLES = [
  'contratos', 'parcelas', 'fincas', 'proveedores', 'clientes', 'cultivos',
  'visitas', 'tareas', 'cosechas', 'tratamientos', 'irrigaciones', 'recetas',
  'albaranes', 'maquinaria', 'tecnicos_aplicadores', 'evaluaciones', 'agentes'
];

const EVENTOS = ['create', 'update', 'delete'];

// =============== TAB: API KEYS ===============
const TabApiKeys = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', permisos: ['read', 'write'] });
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const data = await api.get('/api/erp/sync/api-keys');
      setKeys(data.data || []);
    } catch (e) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!form.nombre) return;
    try {
      const data = await api.post('/api/erp/sync/api-keys', form);
      setNewKey(data.data.api_key);
      setShowCreate(false);
      setForm({ nombre: '', descripcion: '', permisos: ['read', 'write'] });
      fetchKeys();
    } catch (e) { }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revocar esta API Key? No se podra deshacer.')) return;
    try {
      await api.delete(`/api/erp/sync/api-keys/${id}`);
      fetchKeys();
    } catch (e) { }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (loading) return <div className="text-muted" data-testid="loading-keys">Cargando...</div>;

  return (
    <div data-testid="tab-api-keys">
      {newKey && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px' }} data-testid="new-key-alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Shield size={18} style={{ color: '#2e7d32' }} />
            <strong style={{ color: '#2e7d32' }}>API Key generada. Copiala ahora, no se mostrara de nuevo.</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
            <span style={{ flex: 1 }}>{newKey}</span>
            <button onClick={copyKey} className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="btn-copy-key">
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="btn btn-sm btn-secondary" style={{ marginTop: '0.5rem' }}>Cerrar</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={20} /> API Keys ({keys.length})
        </h3>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="btn-new-api-key">
          <Plus size={16} /> Nueva API Key
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }} data-testid="form-new-key">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: SAP Production" data-testid="input-key-name" />
            </div>
            <div>
              <label className="form-label">Descripcion</label>
              <input className="form-input" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripcion de uso" />
            </div>
            <div>
              <label className="form-label">Permisos</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {['read', 'write', 'webhook'].map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.permisos.includes(p)} onChange={e => {
                      setForm(prev => ({
                        ...prev,
                        permisos: e.target.checked ? [...prev.permisos, p] : prev.permisos.filter(x => x !== p)
                      }));
                    }} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCreate} className="btn btn-primary btn-sm" data-testid="btn-create-key">Crear</button>
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {keys.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
          <Key size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
          <p className="text-muted">No hay API Keys configuradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {keys.map(k => (
            <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', borderLeft: '4px solid hsl(var(--primary))' }} data-testid={`api-key-${k.id}`}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{k.nombre}</div>
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                  <code>{k.key_preview}</code> | Permisos: {k.permisos?.join(', ')} | Usos: {k.uso_count}
                </div>
                {k.descripcion && <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{k.descripcion}</div>}
              </div>
              <button onClick={() => handleRevoke(k.id)} className="btn btn-sm" style={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: '4px' }} data-testid={`btn-revoke-${k.id}`}>
                <Trash2 size={14} /> Revocar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============== TAB: WEBHOOKS ===============
const TabWebhooks = () => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testing, setTesting] = useState(null);
  const [form, setForm] = useState({ url: '', nombre: '', eventos: ['create', 'update'], modulos: ['contratos'], activo: true });

  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await api.get('/api/erp/sync/webhooks');
      setWebhooks(data.data || []);
    } catch (e) { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const handleCreate = async () => {
    if (!form.url || !form.nombre) return;
    try {
      await api.post('/api/erp/sync/webhooks', form);
      setShowCreate(false);
      setForm({ url: '', nombre: '', eventos: ['create', 'update'], modulos: ['contratos'], activo: true });
      fetchWebhooks();
    } catch (e) { }
  };

  const handleToggle = async (id) => {
    try {
      await api.post(`/api/erp/sync/webhooks/${id}/toggle`, {});
      fetchWebhooks();
    } catch (e) { }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const data = await api.post(`/api/erp/sync/webhooks/${id}/test`, {});
      alert(data.message);
      fetchWebhooks();
    } catch (e) { alert('Error al probar webhook'); }
    finally { setTesting(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este webhook?')) return;
    try {
      await api.delete(`/api/erp/sync/webhooks/${id}`);
      fetchWebhooks();
    } catch (e) { }
  };

  const toggleEvento = (ev) => {
    setForm(prev => ({
      ...prev,
      eventos: prev.eventos.includes(ev) ? prev.eventos.filter(e => e !== ev) : [...prev.eventos, ev]
    }));
  };

  const toggleModulo = (mod) => {
    setForm(prev => ({
      ...prev,
      modulos: prev.modulos.includes(mod) ? prev.modulos.filter(m => m !== mod) : [...prev.modulos, mod]
    }));
  };

  if (loading) return <div className="text-muted">Cargando...</div>;

  return (
    <div data-testid="tab-webhooks">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Webhook size={20} /> Webhooks ({webhooks.length})
        </h3>
        <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="btn-new-webhook">
          <Plus size={16} /> Nuevo Webhook
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }} data-testid="form-new-webhook">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: ERP Notificaciones" data-testid="input-webhook-name" />
            </div>
            <div>
              <label className="form-label">URL del Webhook *</label>
              <input className="form-input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://mi-erp.com/webhook/fruveco" data-testid="input-webhook-url" />
            </div>
            <div>
              <label className="form-label">Eventos</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {EVENTOS.map(ev => (
                  <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.eventos.includes(ev)} onChange={() => toggleEvento(ev)} />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Modulos a monitorear</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {MODULOS_DISPONIBLES.map(mod => (
                  <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: form.modulos.includes(mod) ? 'hsl(var(--primary) / 0.1)' : 'transparent' }}>
                    <input type="checkbox" checked={form.modulos.includes(mod)} onChange={() => toggleModulo(mod)} />
                    {mod}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleCreate} className="btn btn-primary btn-sm" data-testid="btn-create-webhook">Crear</button>
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
          <Webhook size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
          <p className="text-muted">No hay webhooks configurados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {webhooks.map(wh => (
            <div key={wh.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', borderLeft: `4px solid ${wh.activo ? '#4caf50' : '#9e9e9e'}` }} data-testid={`webhook-${wh.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {wh.nombre}
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: wh.activo ? '#e8f5e9' : '#eeeeee', color: wh.activo ? '#2e7d32' : '#757575' }}>
                      {wh.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                    <Link2 size={12} style={{ display: 'inline', marginRight: '4px' }} />{wh.url}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
                    Eventos: {wh.eventos?.join(', ')} | Modulos: {wh.modulos?.join(', ')} | Disparos: {wh.trigger_count}
                    {wh.last_status != null && (
                      <span style={{ marginLeft: '0.5rem', color: wh.last_status >= 200 && wh.last_status < 300 ? '#4caf50' : '#f44336' }}>
                        (Ultimo: {wh.last_status})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleToggle(wh.id)} className="btn btn-sm" title={wh.activo ? 'Desactivar' : 'Activar'} data-testid={`btn-toggle-${wh.id}`}>
                    {wh.activo ? <ToggleRight size={18} style={{ color: '#4caf50' }} /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => handleTest(wh.id)} className="btn btn-sm" disabled={testing === wh.id} title="Probar" data-testid={`btn-test-${wh.id}`}>
                    <Send size={14} />
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="btn btn-sm" title="Eliminar" style={{ color: '#c62828' }} data-testid={`btn-delete-${wh.id}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============== TAB: EXPORT ===============
const TabExport = () => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState('');
  const [filters, setFilters] = useState({ desde: '', hasta: '', modificados_desde: '' });
  const [exportData, setExportData] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const data = await api.get('/api/erp/sync/export-modules');
        setModules(data.modules || []);
      } catch (e) { }
      finally { setLoading(false); }
    };
    fetchModules();
  }, []);

  const handleExport = async () => {
    if (!selectedModule) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.desde) params.append('desde', filters.desde);
      if (filters.hasta) params.append('hasta', filters.hasta);
      if (filters.modificados_desde) params.append('modificados_desde', filters.modificados_desde);
      const url = `/api/erp/sync/export/${selectedModule}?${params.toString()}`;
      const data = await api.get(url);
      setExportData(data);
    } catch (e) { }
    finally { setExporting(false); }
  };

  const downloadJSON = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fruveco_export_${selectedModule}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-muted">Cargando...</div>;

  return (
    <div data-testid="tab-export">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <FileDown size={20} /> Exportacion de Datos (FRUVECO &rarr; ERP)
      </h3>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label className="form-label">Modulo</label>
            <select className="form-select" value={selectedModule} onChange={e => setSelectedModule(e.target.value)} data-testid="select-export-module">
              <option value="">Seleccionar modulo...</option>
              {modules.map(m => (
                <option key={m.module} value={m.module}>{m.module} ({m.registros} registros)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={filters.desde} onChange={e => setFilters({ ...filters, desde: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={filters.hasta} onChange={e => setFilters({ ...filters, hasta: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Modificados desde</label>
            <input type="date" className="form-input" value={filters.modificados_desde} onChange={e => setFilters({ ...filters, modificados_desde: e.target.value })} />
          </div>
        </div>
        <button onClick={handleExport} disabled={!selectedModule || exporting} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} data-testid="btn-export">
          <Database size={16} /> {exporting ? 'Exportando...' : 'Exportar Datos'}
        </button>
      </div>

      {exportData && (
        <div className="card" style={{ padding: '1rem' }} data-testid="export-results">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <strong>Resultado: </strong>{exportData.data?.length || 0} registros de {exportData.total} total
              <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                (Pagina {exportData.pagina} de {exportData.paginas_total})
              </span>
            </div>
            <button onClick={downloadJSON} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-testid="btn-download-json">
              <FileDown size={14} /> Descargar JSON
            </button>
          </div>
          <div style={{ maxHeight: '400px', overflow: 'auto', backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <pre>{JSON.stringify(exportData.data?.slice(0, 5), null, 2)}</pre>
            {(exportData.data?.length || 0) > 5 && (
              <p style={{ color: '#888', textAlign: 'center' }}>... y {exportData.data.length - 5} registros mas</p>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Modulos disponibles</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
          {modules.map(m => (
            <div key={m.module} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: '500' }}>{m.module}</span>
              <span style={{ color: 'hsl(var(--muted-foreground))' }}>{m.registros}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============== TAB: HISTORIAL ===============
const TabHistorial = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ tipo: '', modulo: '' });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.tipo) params.append('tipo', filter.tipo);
      if (filter.modulo) params.append('modulo', filter.modulo);
      const [histData, statsData] = await Promise.all([
        api.get(`/api/erp/sync/history?${params.toString()}`),
        api.get('/api/erp/sync/stats'),
      ]);
      setHistory(histData.data || []);
      setStats(statsData.stats || null);
    } catch (e) { }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="text-muted">Cargando...</div>;

  return (
    <div data-testid="tab-historial">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <History size={20} /> Historial de Sincronizacion
      </h3>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid hsl(var(--primary))' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.api_keys_activas}</div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>API Keys Activas</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #4caf50' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.webhooks_activos}/{stats.webhooks_total}</div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Webhooks Activos</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #2196f3' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.sincronizaciones_total}</div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Sincronizaciones</div>
          </div>
          <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px', textAlign: 'center', borderLeft: '4px solid #ff9800' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{stats.ultima_sincronizacion ? new Date(stats.ultima_sincronizacion).toLocaleString('es-ES') : 'Nunca'}</div>
            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Ultima Sync</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <select className="form-select" style={{ maxWidth: '200px' }} value={filter.tipo} onChange={e => setFilter({ ...filter, tipo: e.target.value })}>
          <option value="">Todos los tipos</option>
          <option value="export">Exportacion</option>
          <option value="webhook">Webhook</option>
          <option value="import">Importacion</option>
        </select>
        <select className="form-select" style={{ maxWidth: '200px' }} value={filter.modulo} onChange={e => setFilter({ ...filter, modulo: e.target.value })}>
          <option value="">Todos los modulos</option>
          {MODULOS_DISPONIBLES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={fetchData} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'hsl(var(--muted))', borderRadius: '8px' }}>
          <Activity size={40} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
          <p className="text-muted">No hay registros de sincronizacion</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {history.map(h => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'hsl(var(--muted))', borderRadius: '6px', borderLeft: `3px solid ${h.estado === 'completado' || h.estado === 'ok' ? '#4caf50' : h.estado === 'error' ? '#f44336' : '#2196f3'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: h.tipo === 'export' ? '#e3f2fd' : h.tipo === 'webhook' ? '#f3e5f5' : '#e8f5e9', fontWeight: '600', textTransform: 'uppercase' }}>
                  {h.tipo}
                </span>
                <span style={{ fontWeight: '500', fontSize: '0.85rem' }}>{h.modulo}</span>
                {h.registros != null && <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>({h.registros} registros)</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                {h.usuario && <span>{h.usuario}</span>}
                <Clock size={12} /> {new Date(h.timestamp).toLocaleString('es-ES')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============== TAB: DOCUMENTACION ===============
const TabDocumentacion = () => {
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const baseUrl = process.env.REACT_APP_BACKEND_URL || '';

  const sections = [
    {
      key: 'auth', title: 'Autenticacion', icon: <Shield size={16} />,
      content: `Todas las peticiones requieren el header:\n\nX-API-Key: <tu-api-key>\n\nObtener API Key: Seccion "API Keys" de esta pagina.\nPara la API de Sync (export, webhooks, historial), usar el token JWT en Authorization: Bearer <token>.`
    },
    {
      key: 'import', title: 'Importar datos (ERP → FRUVECO)', icon: <Database size={16} />,
      content: `POST ${baseUrl}/api/erp/contratos      → Crear contrato\nPUT  ${baseUrl}/api/erp/contratos/{ref} → Actualizar contrato\nGET  ${baseUrl}/api/erp/contratos/{ref} → Obtener contrato\nDEL  ${baseUrl}/api/erp/contratos/{ref} → Cancelar contrato\n\nMismos endpoints para: /proveedores, /clientes, /fincas, /parcelas, /cultivos\n\nVer documentacion interactiva: ${baseUrl}/docs#/erp-integration`
    },
    {
      key: 'export', title: 'Exportar datos (FRUVECO → ERP)', icon: <FileDown size={16} />,
      content: `GET ${baseUrl}/api/erp/sync/export/{modulo}\n\nParametros opcionales:\n  ?desde=2026-01-01\n  ?hasta=2026-12-31\n  ?modificados_desde=2026-02-01\n  ?limite=500&pagina=2\n\nModulos: contratos, parcelas, fincas, proveedores, clientes, cultivos, visitas, tareas, cosechas, tratamientos, irrigaciones, recetas, albaranes, maquinaria, tecnicos_aplicadores, evaluaciones, agentes\n\nRespuesta:\n{\n  "success": true,\n  "module": "contratos",\n  "total": 12,\n  "pagina": 1,\n  "data": [...]  \n}`
    },
    {
      key: 'webhooks_doc', title: 'Webhooks', icon: <Webhook size={16} />,
      content: `FRUVECO puede notificar a tu ERP cuando se crean, actualizan o eliminan registros.\n\nPayload que recibiras:\n{\n  "event": "create",\n  "module": "contratos",\n  "timestamp": "2026-02-10T12:00:00Z",\n  "data": { ... }\n}\n\nHeaders que recibes:\n  X-Webhook-Signature: HMAC-SHA256 del payload con tu secret\n  X-Webhook-Event: nombre del evento\n\nConfigura webhooks en la seccion "Webhooks" de esta pagina.`
    },
  ];

  return (
    <div data-testid="tab-documentacion">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Zap size={20} /> Documentacion API ERP
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
        API REST para sincronizacion bidireccional con sistemas ERP externos. Compatible con SAP, Navision, Holded, Odoo, y cualquier sistema con capacidad HTTP.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sections.map(s => (
          <div key={s.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={() => toggle(s.key)} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.95rem', fontWeight: '600' }} data-testid={`doc-section-${s.key}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{s.icon} {s.title}</span>
              {expanded[s.key] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expanded[s.key] && (
              <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid hsl(var(--border))' }}>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: 'hsl(var(--muted))', padding: '1rem', borderRadius: '6px', marginTop: '0.75rem', lineHeight: '1.5' }}>
                  {s.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Documentacion Interactiva (Swagger)</h4>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
          Accede a la documentacion completa con ejemplos y testing interactivo:
        </p>
        <a href={`${baseUrl}/docs`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} data-testid="link-swagger">
          <Link2 size={14} /> Abrir Swagger UI
        </a>
      </div>
    </div>
  );
};

// =============== MAIN PAGE ===============
export default function IntegracionERP() {
  const [activeTab, setActiveTab] = useState('keys');

  const tabs = [
    { id: 'keys', label: 'API Keys', icon: <Key size={16} /> },
    { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={16} /> },
    { id: 'export', label: 'Exportacion', icon: <FileDown size={16} /> },
    { id: 'historial', label: 'Historial', icon: <History size={16} /> },
    { id: 'docs', label: 'Documentacion', icon: <Zap size={16} /> },
  ];

  return (
    <div data-testid="erp-integration-page">
      <h1 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>Integracion ERP</h1>
      <p style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
        Configura la sincronizacion bidireccional con tu sistema ERP externo
      </p>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid hsl(var(--border))', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-btn-${tab.id}`}
            style={{
              padding: '0.5rem 1rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.85rem', fontWeight: activeTab === tab.id ? '600' : '400',
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
              color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              marginBottom: '-2px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'keys' && <TabApiKeys />}
      {activeTab === 'webhooks' && <TabWebhooks />}
      {activeTab === 'export' && <TabExport />}
      {activeTab === 'historial' && <TabHistorial />}
      {activeTab === 'docs' && <TabDocumentacion />}
    </div>
  );
}
