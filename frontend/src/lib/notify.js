/**
 * Thin wrapper around `sonner` for app-wide toast notifications.
 *
 * Why a wrapper?
 *  - Keeps the import path stable if we ever swap the toast library.
 *  - Centralizes default options (duration, position, etc.) so every callsite
 *    looks consistent.
 *  - Provides a `fromError(err)` helper that defers to `api.getErrorMessage`
 *    (which already extracts readable Pydantic validation details).
 *
 * Usage:
 *    import { notify } from '../lib/notify';
 *    notify.success('Parcela guardada');
 *    notify.error('No se pudo guardar');
 *    notify.fromError(err);          // shows the extracted error message
 *    notify.info('Procesando...');
 */

import { toast } from 'sonner';
import api from '../services/api';

const DEFAULTS = { duration: 4000 };

export const notify = {
  success: (msg, opts) => toast.success(msg, { ...DEFAULTS, ...opts }),
  error: (msg, opts) => toast.error(msg, { ...DEFAULTS, duration: 6000, ...opts }),
  info: (msg, opts) => toast(msg, { ...DEFAULTS, ...opts }),
  warning: (msg, opts) => toast.warning(msg, { ...DEFAULTS, ...opts }),
  /** Display the error in a toast. Uses api.getErrorMessage for friendly text. */
  fromError: (err, prefix = '') => {
    const msg = (prefix ? prefix + ': ' : '') + api.getErrorMessage(err);
    return toast.error(msg, { ...DEFAULTS, duration: 6000 });
  },
};

export default notify;
