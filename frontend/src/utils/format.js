/**
 * Centralized number / currency / weight formatters.
 *
 * We use the `de-DE` locale for numbers because, despite both `de-DE` and
 * `es-ES` sharing the same visual format (`.` for thousands, `,` for decimals),
 * `es-ES` does NOT insert a thousands separator for 4-digit integers
 * (e.g. `4850` stays `4850,00`), whereas `de-DE` always groups from the first
 * thousand (`4.850,00`). That is the desired output for our UI.
 *
 * For dates we keep `es-ES` (language is correct, separators are fine).
 */

const NUM_LOCALE = 'de-DE';
const DATE_LOCALE = 'es-ES';

const toFloat = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const formatNumber = (value, decimals = 2) =>
  toFloat(value).toLocaleString(NUM_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const formatEuro = (value, decimals = 2) =>
  `€${formatNumber(value, decimals)}`;

export const formatEuroSuffix = (value, decimals = 2) =>
  `${formatNumber(value, decimals)} €`;

export const formatKg = (value) => formatNumber(value, 0);

export const formatKgSuffix = (value) => `${formatKg(value)} kg`;

export const formatPercent = (value, decimals = 2) =>
  `${formatNumber(value, decimals)} %`;

export const formatDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(DATE_LOCALE);
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(DATE_LOCALE);
};
