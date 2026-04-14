import React, { useState, useEffect } from 'react';
import { Download, FileText, CheckSquare, Square, Loader2 } from 'lucide-react';
import api from '../../services/api';

const DashboardExportWidget = () => {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [format, setFormat] = useState('excel');
  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const data = await api.get('/api/exports/modules');
      setModules(data.modules || []);
    } catch (err) {

    } finally {
      setLoadingModules(false);
    }
  };

  const toggleModule = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === modules.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(modules.map(m => m.key)));
    }
  };

  const handleExport = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const filename = `fruveco_informe_${new Date().toISOString().split('T')[0]}.${ext}`;
      await api.downloadWithPost('/api/exports/combined', {
        modules: Array.from(selected),
        format
      }, filename);
    } catch (err) {

    } finally {
      setLoading(false);
    }
  };

  const totalRecords = modules
    .filter(m => selected.has(m.key))
    .reduce((sum, m) => sum + m.count, 0);

  if (loadingModules) {
    return (
      <div className="card" data-testid="export-widget-loading" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
          <Loader2 size={18} className="animate-spin" /> Cargando modulos...
        </div>
      </div>
    );
  }

  return (
    <div className="card" data-testid="dashboard-export-widget" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: '600', fontSize: '1.1rem', margin: 0 }}>
          <Download size={20} style={{ marginRight: '0.5rem', display: 'inline', verticalAlign: 'text-bottom' }} />
          Centro de Exportacion
        </h3>
        <button
          onClick={selectAll}
          className="btn btn-sm btn-secondary"
          data-testid="btn-select-all-modules"
          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
        >
          {selected.size === modules.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        {modules.map(mod => (
          <button
            key={mod.key}
            data-testid={`export-module-${mod.key}`}
            onClick={() => toggleModule(mod.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              border: `1.5px solid ${selected.has(mod.key) ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
              borderRadius: '8px',
              backgroundColor: selected.has(mod.key) ? 'hsl(var(--primary) / 0.08)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left',
              fontSize: '0.85rem',
            }}
          >
            {selected.has(mod.key) ?
              <CheckSquare size={16} style={{ color: 'hsl(var(--primary))', flexShrink: 0 }} /> :
              <Square size={16} style={{ color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
            }
            <span style={{ flex: 1, fontWeight: selected.has(mod.key) ? '600' : '400' }}>
              {mod.label}
            </span>
            <span style={{
              fontSize: '0.7rem',
              backgroundColor: 'hsl(var(--muted))',
              padding: '0.1rem 0.4rem',
              borderRadius: '10px',
              color: 'hsl(var(--muted-foreground))',
              flexShrink: 0,
            }}>
              {mod.count}
            </span>
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        paddingTop: '0.75rem',
        borderTop: '1px solid hsl(var(--border))',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            data-testid="export-format-excel"
            onClick={() => setFormat('excel')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: `1.5px solid ${format === 'excel' ? 'hsl(142 76% 36%)' : 'hsl(var(--border))'}`,
              backgroundColor: format === 'excel' ? 'hsl(142 76% 36% / 0.1)' : 'transparent',
              cursor: 'pointer',
              fontWeight: format === 'excel' ? '600' : '400',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Download size={14} /> Excel
          </button>
          <button
            data-testid="export-format-pdf"
            onClick={() => setFormat('pdf')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: `1.5px solid ${format === 'pdf' ? 'hsl(0 84% 60%)' : 'hsl(var(--border))'}`,
              backgroundColor: format === 'pdf' ? 'hsl(0 84% 60% / 0.1)' : 'transparent',
              cursor: 'pointer',
              fontWeight: format === 'pdf' ? '600' : '400',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <FileText size={14} /> PDF
          </button>
        </div>

        <div style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
          {selected.size > 0
            ? `${selected.size} modulo${selected.size > 1 ? 's' : ''} | ${totalRecords.toLocaleString()} registros`
            : 'Selecciona modulos para exportar'
          }
        </div>

        <button
          data-testid="btn-export-combined"
          className="btn btn-primary"
          onClick={handleExport}
          disabled={selected.size === 0 || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: selected.size === 0 ? 0.5 : 1,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {loading ? 'Generando...' : 'Exportar'}
        </button>
      </div>
    </div>
  );
};

export default DashboardExportWidget;
