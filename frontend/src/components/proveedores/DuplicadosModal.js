import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Loader2, Merge, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { notify } from '../../lib/notify';

/**
 * Modal para detectar y fusionar proveedores duplicados.
 * Props:
 *  - show: boolean
 *  - onClose: () => void
 *  - onMerged: () => void   // callback tras una fusion exitosa (para refetch)
 */
const DuplicadosModal = ({ show, onClose, onMerged }) => {
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [selecciones, setSelecciones] = useState({}); // { [claveGrupo]: { keepId, mergeIds:Set } }
  const [processing, setProcessing] = useState({}); // { [claveGrupo]: boolean }

  useEffect(() => {
    if (!show) return;
    fetchDuplicados();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDuplicados = async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/proveedores/duplicados');
      const gs = data.grupos || [];
      setGrupos(gs);
      // Inicializar selecciones: por defecto, keep=sugerido, merge=el resto
      const init = {};
      gs.forEach((g) => {
        const mergeIds = new Set(
          g.proveedores.filter((p) => p._id !== g.keep_id_sugerido).map((p) => p._id)
        );
        init[g.clave_normalizada] = { keepId: g.keep_id_sugerido, mergeIds };
      });
      setSelecciones(init);
    } catch (err) {
      notify.error('Error detectando duplicados');
    } finally {
      setLoading(false);
    }
  };

  const setKeep = (clave, id) => {
    setSelecciones((prev) => {
      const cur = prev[clave] || { mergeIds: new Set() };
      const newMerge = new Set(cur.mergeIds);
      newMerge.delete(id); // el nuevo keep no puede estar en merge
      return { ...prev, [clave]: { keepId: id, mergeIds: newMerge } };
    });
  };

  const toggleMerge = (clave, id) => {
    setSelecciones((prev) => {
      const cur = prev[clave] || { mergeIds: new Set() };
      if (id === cur.keepId) return prev; // no permitir marcar el keep como merge
      const newMerge = new Set(cur.mergeIds);
      if (newMerge.has(id)) newMerge.delete(id);
      else newMerge.add(id);
      return { ...prev, [clave]: { ...cur, mergeIds: newMerge } };
    });
  };

  const handleMerge = async (grupo) => {
    const sel = selecciones[grupo.clave_normalizada];
    if (!sel?.keepId || sel.mergeIds.size === 0) {
      notify.error('Selecciona un proveedor canonico y al menos uno a fusionar');
      return;
    }
    const keepProv = grupo.proveedores.find((p) => p._id === sel.keepId);
    const mergeIdsArr = Array.from(sel.mergeIds);
    const mergeNames = grupo.proveedores
      .filter((p) => mergeIdsArr.includes(p._id))
      .map((p) => `${p.codigo_proveedor} ${p.nombre}`)
      .join('\n  - ');

    const ok = window.confirm(
      `Fusionar ${mergeIdsArr.length} proveedor(es) en:\n\n  ${keepProv.codigo_proveedor} ${keepProv.nombre}\n\nA fusionar:\n  - ${mergeNames}\n\nEsta accion actualiza contratos, parcelas y albaranes, y elimina los duplicados. Continuar?`
    );
    if (!ok) return;

    setProcessing((p) => ({ ...p, [grupo.clave_normalizada]: true }));
    try {
      const res = await api.post('/api/proveedores/merge', {
        keep_id: sel.keepId,
        merge_ids: mergeIdsArr,
      });
      const r = res.resumen || {};
      const refs = r.referencias_actualizadas || {};
      notify.success(
        `Fusionados ${r.merged?.length || 0} proveedor(es). Referencias actualizadas: contratos=${refs.contratos || 0}, parcelas=${refs.parcelas || 0}, albaranes=${refs.albaranes || 0}.`
      );
      // Re-fetch: elimina el grupo procesado
      await fetchDuplicados();
      if (onMerged) onMerged();
    } catch (err) {
      notify.error(err?.response?.data?.detail || 'Error al fusionar');
    } finally {
      setProcessing((p) => ({ ...p, [grupo.clave_normalizada]: false }));
    }
  };

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1050, padding: '1rem', backdropFilter: 'blur(4px)',
      }}
      data-testid="duplicados-modal-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '12px', width: '100%', maxWidth: '1000px',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '2px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'hsl(38 92% 50% / 0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Merge size={20} style={{ color: 'hsl(38 92% 50%)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Detectar Proveedores Duplicados</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                Agrupados por nombre normalizado (sin tildes ni sufijos societarios).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="config-modal-close-btn" data-testid="duplicados-close-btn">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '2rem', justifyContent: 'center' }}>
              <Loader2 size={20} className="animate-spin" /> Analizando proveedores...
            </div>
          ) : grupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--muted-foreground))' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: 'hsl(142 76% 36%)' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>No se detectaron duplicados</h3>
              <p style={{ fontSize: '0.85rem' }}>Todos los proveedores parecen tener nombres unicos.</p>
            </div>
          ) : (
            <>
              <div style={{
                background: 'hsl(38 92% 50% / 0.08)', border: '1px solid hsl(38 92% 50% / 0.3)',
                borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <AlertTriangle size={16} style={{ color: 'hsl(38 92% 40%)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem' }}>
                  Se detectaron <b>{grupos.length}</b> grupo(s) con posibles duplicados.
                  Marca el proveedor canonico (radio) y selecciona cuales fusionar (checkbox).
                  La fusion migra todas las referencias.
                </span>
              </div>

              {grupos.map((g) => {
                const sel = selecciones[g.clave_normalizada] || { keepId: '', mergeIds: new Set() };
                const isProc = processing[g.clave_normalizada];
                return (
                  <div
                    key={g.clave_normalizada}
                    data-testid={`duplicados-grupo-${g.clave_normalizada.replace(/\s+/g, '-')}`}
                    style={{
                      border: '1px solid hsl(var(--border))', borderRadius: '10px',
                      marginBottom: '1rem', overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      background: 'hsl(var(--muted) / 0.4)', padding: '0.6rem 0.9rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid hsl(var(--border))',
                    }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        <b>Clave:</b> <code style={{ fontSize: '0.8rem' }}>{g.clave_normalizada}</code>
                        <span style={{ marginLeft: '0.75rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>
                          {g.proveedores.length} registros
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleMerge(g)}
                        disabled={isProc || !sel.keepId || sel.mergeIds.size === 0}
                        data-testid={`btn-merge-${g.clave_normalizada.replace(/\s+/g, '-')}`}
                      >
                        {isProc ? <Loader2 size={14} className="animate-spin" /> : <Merge size={14} />}
                        {isProc ? 'Fusionando...' : `Fusionar ${sel.mergeIds.size}`}
                      </button>
                    </div>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'hsl(var(--muted) / 0.2)' }}>
                          <th style={{ padding: '0.5rem', width: '90px', textAlign: 'center' }}>Canonico</th>
                          <th style={{ padding: '0.5rem', width: '90px', textAlign: 'center' }}>Fusionar</th>
                          <th style={{ padding: '0.5rem', width: '90px', textAlign: 'left' }}>ID</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nombre</th>
                          <th style={{ padding: '0.5rem', width: '110px', textAlign: 'left' }}>CIF/NIF</th>
                          <th style={{ padding: '0.5rem', width: '90px', textAlign: 'center' }}>Refs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.proveedores.map((p) => {
                          const isKeep = sel.keepId === p._id;
                          const isMerge = sel.mergeIds.has(p._id);
                          return (
                            <tr key={p._id} style={{ borderTop: '1px solid hsl(var(--border))', background: isKeep ? 'hsl(142 76% 36% / 0.08)' : 'transparent' }}>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input
                                  type="radio"
                                  name={`keep-${g.clave_normalizada}`}
                                  checked={isKeep}
                                  onChange={() => setKeep(g.clave_normalizada, p._id)}
                                  data-testid={`radio-keep-${p._id}`}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isMerge}
                                  disabled={isKeep}
                                  onChange={() => toggleMerge(g.clave_normalizada, p._id)}
                                  data-testid={`checkbox-merge-${p._id}`}
                                />
                              </td>
                              <td style={{ padding: '0.5rem' }}>
                                <code style={{ fontSize: '0.8rem' }}>{p.codigo_proveedor || '-'}</code>
                              </td>
                              <td style={{ padding: '0.5rem', fontWeight: isKeep ? 600 : 400 }}>
                                {p.nombre}
                                {isKeep && (
                                  <span style={{
                                    marginLeft: '0.5rem', fontSize: '0.7rem',
                                    padding: '0.1rem 0.4rem', borderRadius: '4px',
                                    background: 'hsl(142 76% 36% / 0.15)', color: 'hsl(142 76% 30%)',
                                    fontWeight: 700, textTransform: 'uppercase',
                                  }}>Canonico</span>
                                )}
                              </td>
                              <td style={{ padding: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>
                                {p.cif_nif || '-'}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <span title={`Contratos: ${p.referencias.contratos} | Parcelas: ${p.referencias.parcelas} | Albaranes: ${p.referencias.albaranes}`}>
                                  {p.total_referencias}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div style={{
          padding: '0.9rem 1.5rem', borderTop: '1px solid hsl(var(--border))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button className="btn btn-secondary" onClick={fetchDuplicados} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : null} Re-analizar
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default DuplicadosModal;
