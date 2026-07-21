/**
 * Utilidades de formateo de fechas.
 * Formato principal usado en toda la aplicacion: DD-MM-AAAA.
 */

/**
 * Formatea una fecha (ISO YYYY-MM-DD, ISO datetime, o Date) a DD-MM-AAAA.
 * @param {string|Date|null|undefined} value
 * @param {string} fallback - Texto a devolver si la fecha esta vacia o es invalida. Por defecto '-'.
 * @returns {string}
 */
export const formatDateDMY = (value, fallback = '-') => {
  if (!value) return fallback;
  const str = String(value);
  // Coincidencia rapida para YYYY-MM-DD o YYYY-MM-DDT...
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }
  // Fallback: intentar parsear como Date
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

/**
 * Formatea una fecha y hora a DD-MM-AAAA HH:mm.
 */
export const formatDateTimeDMY = (value, fallback = '-') => {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
};
