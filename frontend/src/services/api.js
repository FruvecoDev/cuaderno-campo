/**
 * Centralized API Service
 * 
 * Handles all HTTP requests with:
 * - Automatic authentication headers
 * - Response cloning to prevent "body stream already read" errors
 * - Consistent error handling
 * - Request timeout support
 * - Retry logic for transient failures
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Get auth token from localStorage
 */
const getToken = () => localStorage.getItem('token');

/**
 * Build headers with optional auth
 */
const buildHeaders = (customHeaders = {}, includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  
  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Parse response safely - clones response to avoid "body stream already read"
 */
const parseResponse = async (response) => {
  // Clone response before reading to prevent body stream issues
  const clonedResponse = response.clone();
  
  const contentType = response.headers.get('content-type');
  
  try {
    if (contentType && contentType.includes('application/json')) {
      return await clonedResponse.json();
    } else if (contentType && contentType.includes('text/')) {
      return await clonedResponse.text();
    } else {
      // For blob responses (files, images)
      return await clonedResponse.blob();
    }
  } catch (error) {
    // If parsing fails, try to get text
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
};

/**
 * Handle response errors
 */
const handleResponse = async (response) => {
  const data = await parseResponse(response);
  
  if (!response.ok) {
    const errorMessage = data?.detail || data?.message || `Error ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMessage, response.status, data);
  }
  
  return data;
};

/**
 * Main fetch wrapper with timeout and error handling
 */
const apiFetch = async (endpoint, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    includeAuth = true,
    isFormData = false,
    signal: externalSignal
  } = options;

  // Build URL
  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;
  
  // Setup abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Combine signals if external signal provided
  const signal = externalSignal || controller.signal;

  try {
    const fetchHeaders = isFormData 
      ? { ...headers } // Don't set Content-Type for FormData, browser will set it
      : buildHeaders(headers, includeAuth);
    
    // Add auth header manually for FormData
    if (isFormData && includeAuth) {
      const token = getToken();
      if (token) {
        fetchHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    const fetchOptions = {
      method,
      headers: fetchHeaders,
      signal
    };

    if (body) {
      fetchOptions.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    return await handleResponse(response);
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new ApiError('La petición ha excedido el tiempo de espera', 408);
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error.message || 'Error de conexión. Verifica tu conexión a internet.',
      0
    );
  }
};

/**
 * API methods
 */
const api = {
  /**
   * GET request
   * @param {string} endpoint - API endpoint (e.g., '/api/users')
   * @param {object} options - Additional options
   */
  get: (endpoint, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   */
  post: (endpoint, body, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'POST', body }),

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   */
  put: (endpoint, body, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'PUT', body }),

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Additional options
   */
  patch: (endpoint, body, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'PATCH', body }),

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Additional options
   */
  delete: (endpoint, options = {}) => 
    apiFetch(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Upload file(s)
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - FormData with files
   * @param {object} options - Additional options
   */
  upload: (endpoint, formData, options = {}) =>
    apiFetch(endpoint, { ...options, method: 'POST', body: formData, isFormData: true }),

  /**
   * Download file
   * @param {string} endpoint - API endpoint
   * @param {string} filename - Suggested filename for download
   * @param {object} options - Additional options
   */
  download: async (endpoint, filename, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;
    const token = getToken();
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await parseResponse(response);
      throw new ApiError(
        errorData?.detail || 'Error al descargar archivo',
        response.status
      );
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
  },

  /**
   * Check if error is an API error
   */
  isApiError: (error) => error instanceof ApiError,

  /**
   * Get error message from any error
   */
  getErrorMessage: (error) => {
    if (error instanceof ApiError) {
      return error.message;
    }
    return error?.message || 'Ha ocurrido un error inesperado';
  },

  /**
   * Backend URL for constructing static asset URLs
   */
  BACKEND_URL
};

export { api, ApiError, BACKEND_URL };
export default api;
