import React, { useEffect, useState } from 'react';
import api from '../services/api';

/**
 * Compact deploy/version badge for the header bar.
 *
 * Renders nothing while loading or on error. On hover shows a tooltip with
 * commit message, branch, build date, etc. — useful to quickly verify which
 * version is currently deployed.
 */
const VersionBadge = () => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/system/version')
      .then(d => { if (!cancelled) setInfo(d); })
      .catch(() => { /* badge is purely informational — fail silently */ });
    return () => { cancelled = true; };
  }, []);

  if (!info || !info.commit_short) return null;

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const tooltip = [
    `Versión: ${info.version}`,
    `Commit: ${info.commit_short}`,
    info.commit_message ? `Mensaje: ${info.commit_message}` : '',
    info.branch ? `Rama: ${info.branch}` : '',
    info.commit_date ? `Fecha commit: ${formatDate(info.commit_date)}` : '',
    info.booted_at ? `Último arranque: ${formatDate(info.booted_at)}` : '',
    info.environment ? `Entorno: ${info.environment}` : '',
  ].filter(Boolean).join('\n');

  const isProd = (info.environment || '').toLowerCase() === 'production';
  const bg = isProd ? 'hsl(142 76% 36% / 0.12)' : 'hsl(217 91% 60% / 0.12)';
  const fg = isProd ? 'hsl(142 76% 28%)' : 'hsl(217 91% 45%)';
  const border = isProd ? 'hsl(142 76% 36% / 0.35)' : 'hsl(217 91% 60% / 0.35)';

  return (
    <span
      title={tooltip}
      data-testid="version-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '999px',
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        cursor: 'help',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '0.45rem',
          height: '0.45rem',
          borderRadius: '50%',
          backgroundColor: fg,
          boxShadow: `0 0 0 2px ${bg}`,
        }}
      />
      v{info.version} · {info.commit_short}
    </span>
  );
};

export default VersionBadge;
