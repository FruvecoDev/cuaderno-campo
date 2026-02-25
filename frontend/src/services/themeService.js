// Theme service - loads and applies theme globally

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const applyThemeToDOM = (primary, accent) => {
  if (primary) {
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--ring', primary);
    document.documentElement.style.setProperty('--chart-1', primary);
  }
  if (accent) {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--chart-2', accent);
  }
};

export const loadAndApplyTheme = async () => {
  try {
    const response = await fetch(`${API_URL}/api/config/theme`);
    const data = await response.json();
    if (data.success && data.primary && data.accent) {
      applyThemeToDOM(data.primary, data.accent);
      return data;
    }
  } catch (err) {
    console.error('Error loading theme:', err);
  }
  return null;
};

// Call this on app initialization
export const initializeTheme = () => {
  loadAndApplyTheme();
};
