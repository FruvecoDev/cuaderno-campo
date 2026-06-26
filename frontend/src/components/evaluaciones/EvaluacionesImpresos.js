import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';

// Default impresos schema — used both for new evaluations and to safely
// hydrate evaluations created before the Impresos tab existed.
export const DEFAULT_IMPRESOS = {
  comentarios: '',
  // Cabecera (auto-rellenable y editable)
  proveedor: '',
  codigo_plantacion: '',
  finca: '',
  cultivo: '',
  variedad: '',
  superficie: '',
  parcela_id: '',
  // S1 Análisis de suelo
  analisis_suelo: {
    hoja_archivada: null,
    medidas_tomadas: '',
    envases_archivados: null,
    libre_sintomas: { enfermedades: false, plagas: false, virus: false },
  },
  // S2 Pasos precampaña desinfección
  pasos_precampana: {
    observaciones: '',
  },
  // S3 Calibración y mantenimiento aparatos medición fito
  calibracion: {
    vaso: '',
    peso: '',
  },
  // S4 Calidad de cepellones
  calidad_cepellones: {
    numero_lote: '',
    envases_archivados: null,
    certificado_sanidad: null,
    certificado_archivado: null,
    libre_sintomas: { enfermedades: false, plagas: false, virus: false },
  },
  // S5 Inspección maquinaria
  inspeccion_maquinaria: {
    tipo: '',
    modelo: '',
    numero_serie: '',
    limpieza_filtros: null,
    estado_manguera: null,
    diafragmas_cambiados: null,
    conexiones_revisadas: null,
  },
  // S6 Observaciones generales
  observaciones_generales: '',
};

// Deep-merge utility: hydrate stored impresos values on top of defaults.
export const mergeImpresos = (stored) => {
  const base = JSON.parse(JSON.stringify(DEFAULT_IMPRESOS));
  if (!stored || typeof stored !== 'object') return base;
  const merge = (target, src) => {
    Object.keys(src).forEach((k) => {
      if (src[k] !== null && typeof src[k] === 'object' && !Array.isArray(src[k]) && target[k] && typeof target[k] === 'object') {
        merge(target[k], src[k]);
      } else if (src[k] !== undefined) {
        target[k] = src[k];
      }
    });
  };
  merge(base, stored);
  return base;
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.3rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'hsl(var(--muted-foreground))',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'hsl(var(--primary))',
  padding: '0.5rem 0.75rem',
  background: 'hsl(var(--primary) / 0.06)',
  border: '1px solid hsl(var(--primary) / 0.18)',
  borderRadius: '8px',
  marginBottom: '0.75rem',
};

const cardStyle = {
  padding: '1rem',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  background: 'white',
  marginBottom: '1rem',
};

const SiNoButton = ({ value, onChange, testid }) => {
  const buttons = [
    { active: value === true, color: 'hsl(142, 76%, 36%)', label: 'Sí', val: true },
    { active: value === false, color: 'hsl(0, 84%, 60%)', label: 'No', val: false },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={() => onChange(b.val)}
          data-testid={testid ? `${testid}-${b.label.toLowerCase()}` : undefined}
          style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '0.375rem',
            border: b.active ? `2px solid ${b.color}` : '1px solid hsl(var(--border))',
            backgroundColor: b.active ? b.color : 'transparent',
            color: b.active ? 'white' : 'inherit',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.8rem',
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
};

const SintomasCheckboxes = ({ value, onChange, testid }) => {
  const v = value || { enfermedades: false, plagas: false, virus: false };
  const items = [
    { key: 'enfermedades', label: 'Enfermedades' },
    { key: 'plagas', label: 'Plagas' },
    { key: 'virus', label: 'Virus' },
  ];
  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {items.map((it) => (
        <label key={it.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!v[it.key]}
            onChange={(e) => onChange({ ...v, [it.key]: e.target.checked })}
            data-testid={testid ? `${testid}-${it.key}` : undefined}
          />
          {it.label}
        </label>
      ))}
    </div>
  );
};

const EvaluacionesImpresos = ({ impresos, setImpresos, selectedParcelaInfo, parcelaId, parcela, contrato }) => {
  const data = impresos || DEFAULT_IMPRESOS;

  // Cabecera SIEMPRE en vivo desde Parcela + Contrato (no editable).
  // Prioridad: Parcela → Contrato (fallback si la parcela no tiene el campo).
  const headerLive = {
    proveedor: parcela?.proveedor || contrato?.proveedor || '',
    codigo_plantacion: parcela?.codigo_plantacion || '',
    finca: parcela?.finca || '',
    cultivo: parcela?.cultivo || contrato?.cultivo || '',
    variedad: parcela?.variedad || contrato?.variedad || '',
    superficie: parcela?.superficie_total ?? parcela?.superficie ?? '',
  };

  const update = (path, value) => {
    setImpresos((prev) => {
      const next = { ...(prev || DEFAULT_IMPRESOS) };
      const keys = path.split('.');
      let ref = next;
      for (let i = 0; i < keys.length - 1; i++) {
        ref[keys[i]] = { ...(ref[keys[i]] || {}) };
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return next;
    });
  };

  // Read-only display field with the same visual weight as a form input.
  const renderReadOnly = (label, value, testid) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label style={labelStyle}>{label}</label>
      <div
        data-testid={testid}
        style={{
          minHeight: '38px',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--muted) / 0.4)',
          fontSize: '0.9rem',
          color: value ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
          fontStyle: value ? 'normal' : 'italic',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {value || 'Sin datos en parcela/contrato'}
      </div>
    </div>
  );

  return (
    <div data-testid="impresos-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* CABECERA */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <FileText size={14} /> Cabecera — Plantación
        </div>

        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Comentarios</label>
          <textarea
            className="form-input"
            rows={2}
            value={data.comentarios || ''}
            onChange={(e) => update('comentarios', e.target.value)}
            placeholder="Ej: Abono de fondo con 12/20/12 a razón de 200 Kg/Ha"
            data-testid="impresos-comentarios"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
          {renderReadOnly('La plantación (Proveedor)', headerLive.proveedor, 'impresos-proveedor')}
          {renderReadOnly('Código Plantación', headerLive.codigo_plantacion, 'impresos-codigo')}
          {renderReadOnly('Finca', headerLive.finca, 'impresos-finca')}
          {renderReadOnly('Cultivo', headerLive.cultivo, 'impresos-cultivo')}
          {renderReadOnly('Variedad', headerLive.variedad, 'impresos-variedad')}
          {renderReadOnly('Superficie (ha)', headerLive.superficie !== '' ? String(headerLive.superficie) : '', 'impresos-superficie')}
        </div>

        <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
          Estos campos se sincronizan automáticamente desde la Parcela y el Contrato asignados a la hoja de evaluación.
        </div>

        {parcelaId && (
          <div style={{ marginTop: '0.75rem' }}>
            <a
              href={`/parcelas?focus=${parcelaId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 600 }}
              data-testid="impresos-parcela-link"
            >
              <ExternalLink size={14} /> Ver parcela vinculada
            </a>
          </div>
        )}
      </div>

      {/* S1 - Análisis de suelo */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>1 · Análisis de suelo</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>¿Se ha archivado la hoja de los resultados de análisis con este impreso?</label>
            <SiNoButton value={data.analisis_suelo?.hoja_archivada} onChange={(v) => update('analisis_suelo.hoja_archivada', v)} testid="impresos-as-hoja" />
          </div>
          <div>
            <label style={labelStyle}>¿Los paquetes/envases de semillas están archivados?</label>
            <SiNoButton value={data.analisis_suelo?.envases_archivados} onChange={(v) => update('analisis_suelo.envases_archivados', v)} testid="impresos-as-envases" />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Medidas tomadas como consecuencia de los resultados de los análisis</label>
          <textarea
            className="form-input"
            rows={2}
            value={data.analisis_suelo?.medidas_tomadas || ''}
            onChange={(e) => update('analisis_suelo.medidas_tomadas', e.target.value)}
            data-testid="impresos-as-medidas"
          />
        </div>

        <div>
          <label style={labelStyle}>Este lote en el momento de entrega estaba libre de síntomas de:</label>
          <SintomasCheckboxes
            value={data.analisis_suelo?.libre_sintomas}
            onChange={(v) => update('analisis_suelo.libre_sintomas', v)}
            testid="impresos-as-sintomas"
          />
        </div>
      </div>

      {/* S2 - Pasos precampaña desinfección */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>2 · Pasos precampaña desinfección</div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={labelStyle}>Observaciones de interés</label>
          <textarea
            className="form-input"
            rows={3}
            value={data.pasos_precampana?.observaciones || ''}
            onChange={(e) => update('pasos_precampana.observaciones', e.target.value)}
            data-testid="impresos-pasos-observaciones"
          />
        </div>
      </div>

      {/* S3 - Calibración aparatos medición fito */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>3 · Calibración y mantenimiento aparatos medición fito</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Vaso</label>
            <input type="text" className="form-input" value={data.calibracion?.vaso || ''} onChange={(e) => update('calibracion.vaso', e.target.value)} data-testid="impresos-calibracion-vaso" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Peso</label>
            <input type="text" className="form-input" value={data.calibracion?.peso || ''} onChange={(e) => update('calibracion.peso', e.target.value)} data-testid="impresos-calibracion-peso" />
          </div>
        </div>
      </div>

      {/* S4 - Calidad de cepellones */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>4 · Calidad de cepellones</div>

        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <label style={labelStyle}>Nº de referencia de lote de cepellones</label>
          <input
            type="text"
            className="form-input"
            value={data.calidad_cepellones?.numero_lote || ''}
            onChange={(e) => update('calidad_cepellones.numero_lote', e.target.value)}
            data-testid="impresos-cc-lote"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={labelStyle}>¿Los paquetes/envases de semillas están archivados con este impreso?</label>
            <SiNoButton value={data.calidad_cepellones?.envases_archivados} onChange={(v) => update('calidad_cepellones.envases_archivados', v)} testid="impresos-cc-envases" />
          </div>
          <div>
            <label style={labelStyle}>¿El semillero ha suministrado un certificado de sanidad vegetal?</label>
            <SiNoButton value={data.calidad_cepellones?.certificado_sanidad} onChange={(v) => update('calidad_cepellones.certificado_sanidad', v)} testid="impresos-cc-cert-sanidad" />
          </div>
          <div>
            <label style={labelStyle}>Si existe el certificado de sanidad, ¿está archivado con este impreso?</label>
            <SiNoButton value={data.calidad_cepellones?.certificado_archivado} onChange={(v) => update('calidad_cepellones.certificado_archivado', v)} testid="impresos-cc-cert-archivado" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Este lote en el momento de entrega estaba libre de síntomas de:</label>
          <SintomasCheckboxes
            value={data.calidad_cepellones?.libre_sintomas}
            onChange={(v) => update('calidad_cepellones.libre_sintomas', v)}
            testid="impresos-cc-sintomas"
          />
        </div>
      </div>

      {/* S5 - Inspección maquinaria */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>5 · Inspección maquinaria</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Tipo de maquinaria</label>
            <input type="text" className="form-input" value={data.inspeccion_maquinaria?.tipo || ''} onChange={(e) => update('inspeccion_maquinaria.tipo', e.target.value)} data-testid="impresos-maq-tipo" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Modelo</label>
            <input type="text" className="form-input" value={data.inspeccion_maquinaria?.modelo || ''} onChange={(e) => update('inspeccion_maquinaria.modelo', e.target.value)} data-testid="impresos-maq-modelo" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Nº de serie</label>
            <input type="text" className="form-input" value={data.inspeccion_maquinaria?.numero_serie || ''} onChange={(e) => update('inspeccion_maquinaria.numero_serie', e.target.value)} data-testid="impresos-maq-serie" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>¿Se ha realizado la limpieza de los filtros?</label>
            <SiNoButton value={data.inspeccion_maquinaria?.limpieza_filtros} onChange={(v) => update('inspeccion_maquinaria.limpieza_filtros', v)} testid="impresos-maq-filtros" />
          </div>
          <div>
            <label style={labelStyle}>¿Se ha comprobado el estado de la manguera?</label>
            <SiNoButton value={data.inspeccion_maquinaria?.estado_manguera} onChange={(v) => update('inspeccion_maquinaria.estado_manguera', v)} testid="impresos-maq-manguera" />
          </div>
          <div>
            <label style={labelStyle}>¿Se han cambiado los diafragmas?</label>
            <SiNoButton value={data.inspeccion_maquinaria?.diafragmas_cambiados} onChange={(v) => update('inspeccion_maquinaria.diafragmas_cambiados', v)} testid="impresos-maq-diafragmas" />
          </div>
          <div>
            <label style={labelStyle}>¿Se han revisado todas las conexiones?</label>
            <SiNoButton value={data.inspeccion_maquinaria?.conexiones_revisadas} onChange={(v) => update('inspeccion_maquinaria.conexiones_revisadas', v)} testid="impresos-maq-conexiones" />
          </div>
        </div>
      </div>

      {/* S6 - Observaciones generales */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>6 · Observaciones generales</div>
        <textarea
          className="form-input"
          rows={4}
          value={data.observaciones_generales || ''}
          onChange={(e) => update('observaciones_generales', e.target.value)}
          placeholder="Ej: Análisis de agua. Cumple el programa Sigfito para la eliminación de envases de fitosanitarios vacíos."
          data-testid="impresos-observaciones-generales"
        />
      </div>
    </div>
  );
};

export default EvaluacionesImpresos;
