import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Input de fecha con formato de DISPLAY DD/MM/AAAA.
 *
 * El valor almacenado (via `value` y `onChange`) sigue siendo ISO
 * YYYY-MM-DD, igual que un `<input type="date">` nativo. Solo cambia lo
 * que ve el usuario en el campo de texto, evitando el problema de que el
 * navegador (Chrome) muestre las fechas en formato US MM/DD/AAAA cuando
 * la locale del SO esta en ingles.
 *
 * Props compatibles con <input type="date">: value, onChange, required,
 * disabled, name, min, max, className, style, data-testid, id, autoFocus.
 */
const DateInputES = ({
  value = '',
  onChange,
  required = false,
  disabled = false,
  name,
  min,
  max,
  className = 'form-input',
  style,
  autoFocus,
  id,
  ...rest
}) => {
  // Mantener el texto visible como DD/MM/AAAA (o parcial mientras el
  // usuario escribe).
  const [text, setText] = useState('');
  const nativeRef = useRef(null);

  // Sync desde el valor ISO externo -> texto DD/MM/AAAA
  useEffect(() => {
    if (!value) {
      setText('');
      return;
    }
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      setText(`${m[3]}/${m[2]}/${m[1]}`);
    } else {
      setText(String(value));
    }
  }, [value]);

  // Convierte DD/MM/AAAA a YYYY-MM-DD o '' si es invalida/incompleta.
  const toISO = (str) => {
    const m = String(str || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    const dd = String(m[1]).padStart(2, '0');
    const mm = String(m[2]).padStart(2, '0');
    const yyyy = m[3];
    // Validacion basica: mes 1-12, dia 1-31
    const dNum = parseInt(dd, 10);
    const mNum = parseInt(mm, 10);
    if (mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) return '';
    return `${yyyy}-${mm}-${dd}`;
  };

  // Auto-inserta '/' mientras el usuario escribe. Solo acepta digitos y '/'.
  const handleTextChange = (e) => {
    const raw = e.target.value;
    // Permitir solo digitos y '/'
    let cleaned = raw.replace(/[^\d/]/g, '');
    // Auto-insertar '/' tras 2 y 5 digitos (sin '/'s existentes)
    const digits = cleaned.replace(/\//g, '');
    let formatted = '';
    if (digits.length <= 2) formatted = digits;
    else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    setText(formatted);

    const iso = toISO(formatted);
    if (onChange) {
      onChange({ target: { name, value: iso } });
    }
  };

  const handleBlur = () => {
    // Al perder el foco, si el texto no es valido, limpiamos el valor ISO.
    const iso = toISO(text);
    if (!iso && text) {
      // Formato invalido - se puede mantener texto para que usuario corrija
      // pero se limpia el valor externo
      if (onChange) onChange({ target: { name, value: '' } });
    }
  };

  const openPicker = () => {
    if (disabled) return;
    const native = nativeRef.current;
    if (!native) return;
    // Preferir showPicker() si esta disponible (Chrome/Edge modernos)
    if (typeof native.showPicker === 'function') {
      try { native.showPicker(); return; } catch (_) { /* fallback */ }
    }
    native.focus();
    native.click();
  };

  const handleNativeChange = (e) => {
    const iso = e.target.value;
    if (onChange) onChange({ target: { name, value: iso } });
  };

  return (
    <div style={{ position: 'relative', ...(style || {}) }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/AAAA"
        maxLength={10}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        name={name}
        id={id}
        autoFocus={autoFocus}
        className={className}
        style={{ paddingRight: '2.25rem' }}
        {...rest}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        aria-label="Abrir calendario"
        title="Abrir calendario"
        style={{
          position: 'absolute', right: '0.5rem', top: '50%',
          transform: 'translateY(-50%)', border: 'none', background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.25rem',
          display: 'flex', alignItems: 'center', color: 'hsl(var(--muted-foreground))',
        }}
      >
        <Calendar size={16} />
      </button>
      {/* Native date input oculto para el picker del navegador */}
      <input
        ref={nativeRef}
        type="date"
        value={value || ''}
        onChange={handleNativeChange}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute', width: '1px', height: '1px', padding: 0,
          margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap', border: 0, right: '2rem', top: '50%',
        }}
      />
    </div>
  );
};

export default DateInputES;
