import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://finca-suite.preview.emergentagent.com';
const ADMIN_EMAIL = 'admin@fruveco.com';
const ADMIN_PASSWORD = 'admin123';

// Helper to login as admin and navigate to config page
async function loginAndNavigateToConfig(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  await page.getByTestId('login-email').fill(ADMIN_EMAIL);
  await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
  await page.getByTestId('login-submit').click();
  
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  
  // Dismiss any error overlay from webpack dev server (Leaflet map errors, etc.)
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
  
  // Navigate to Configuración
  await page.getByRole('link', { name: /configuración/i }).click({ force: true });
  await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 10000 });
  
  // Dismiss overlay again if it reappears
  await page.evaluate(() => {
    const overlay = document.getElementById('webpack-dev-server-client-overlay');
    if (overlay) overlay.remove();
  });
}

test.describe('Theme Configuration Feature', () => {
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    // Get admin token for API calls
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    const data = await response.json();
    adminToken = data.access_token;
  });

  test.afterAll(async ({ request }) => {
    // Reset theme to default after all tests
    await request.delete(`${BASE_URL}/api/config/theme`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  });

  test('admin can see theme selector with 8 predefined themes', async ({ page }) => {
    await loginAndNavigateToConfig(page);
    
    // Verify theme section is visible
    await expect(page.getByText('Tema de Colores')).toBeVisible();
    await expect(page.getByText('Temas Predefinidos')).toBeVisible();
    
    // Verify 8 predefined theme buttons
    const themeIds = ['verde', 'azul', 'rojo', 'naranja', 'morado', 'teal', 'marron', 'gris'];
    for (const themeId of themeIds) {
      await expect(page.getByTestId(`theme-${themeId}`)).toBeVisible();
    }
  });

  test('clicking predefined theme applies it and shows success message', async ({ page, request }) => {
    // Reset to verde first
    await request.delete(`${BASE_URL}/api/config/theme`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    await loginAndNavigateToConfig(page);
    
    // Click azul theme (force to bypass any overlay)
    await page.getByTestId('theme-azul').click({ force: true });
    
    // Wait for success message
    await expect(page.getByText(/aplicado correctamente/i)).toBeVisible({ timeout: 5000 });
    
    // Verify API reflects the change
    const response = await request.get(`${BASE_URL}/api/config/theme`);
    const data = await response.json();
    expect(data.theme_id).toBe('azul');
  });

  test('custom colors section can be shown/hidden', async ({ page }) => {
    await loginAndNavigateToConfig(page);
    
    // Click Mostrar button to show custom colors
    await page.getByRole('button', { name: /mostrar/i }).click({ force: true });
    
    // Custom color inputs should be visible
    await expect(page.getByTestId('custom-primary-color')).toBeVisible();
    await expect(page.getByTestId('custom-accent-color')).toBeVisible();
    await expect(page.getByTestId('apply-custom-theme')).toBeVisible();
    
    // Click Ocultar to hide
    await page.getByRole('button', { name: /ocultar/i }).click({ force: true });
    
    // Inputs should be hidden
    await expect(page.getByTestId('custom-primary-color')).not.toBeVisible();
  });

  test('can apply custom colors', async ({ page, request }) => {
    // Reset first
    await request.delete(`${BASE_URL}/api/config/theme`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    await loginAndNavigateToConfig(page);
    
    // Show custom colors
    await page.getByRole('button', { name: /mostrar/i }).click({ force: true });
    
    // Set custom colors using the color pickers
    await page.getByTestId('custom-primary-color').fill('#663399'); // rebeccapurple
    await page.getByTestId('custom-accent-color').fill('#ffa500'); // orange
    
    // Apply custom colors (force to bypass overlay)
    await page.getByTestId('apply-custom-theme').click({ force: true });
    
    // Wait for success message
    await expect(page.getByText(/personalizados aplicados/i)).toBeVisible({ timeout: 5000 });
    
    // Verify API reflects custom theme
    const response = await request.get(`${BASE_URL}/api/config/theme`);
    const data = await response.json();
    expect(data.is_custom).toBe(true);
    expect(data.theme_id).toBe('custom');
  });

  test('reset button restores default theme', async ({ page, request }) => {
    // First set a non-default theme
    await request.post(`${BASE_URL}/api/config/theme?theme_id=naranja`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    await loginAndNavigateToConfig(page);
    
    // Set up dialog handler for confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Click reset button (force to bypass overlay)
    await page.getByTestId('reset-theme').click({ force: true });
    
    // Wait for success message
    await expect(page.getByText(/restaurado al predeterminado/i)).toBeVisible({ timeout: 5000 });
    
    // Verify API reflects verde
    const response = await request.get(`${BASE_URL}/api/config/theme`);
    const data = await response.json();
    expect(data.theme_id).toBe('verde');
  });

  test('theme persists after page reload', async ({ page, request }) => {
    // Set morado theme via API
    await request.post(`${BASE_URL}/api/config/theme?theme_id=morado`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    // Login
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email').fill(ADMIN_EMAIL);
    await page.getByTestId('login-password').fill(ADMIN_PASSWORD);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
    
    // Wait for dashboard to fully load (not just "Cargando...")
    await expect(page.getByText('Cargando...')).not.toBeVisible({ timeout: 10000 });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for theme to be applied (check that --primary changes from initial)
    // The initializeTheme() is async, so we poll for the expected value
    await expect.poll(async () => {
      return page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      });
    }, { timeout: 10000, intervals: [500] }).toBe('270 50% 40%');
  });

  test('theme is applied on app initial load', async ({ page, request }) => {
    // Set teal theme
    await request.post(`${BASE_URL}/api/config/theme?theme_id=teal`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    // Open login page (not logged in yet)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Theme should be loaded - teal primary is "175 60% 30%"
    // Wait for async theme loading
    await expect.poll(async () => {
      return page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      });
    }, { timeout: 10000, intervals: [500] }).toBe('175 60% 30%');
  });

  test('selecting theme updates CSS variables dynamically', async ({ page, request }) => {
    // Reset to verde
    await request.delete(`${BASE_URL}/api/config/theme`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    await loginAndNavigateToConfig(page);
    
    // Click azul theme (force to bypass overlay)
    await page.getByTestId('theme-azul').click({ force: true });
    await expect(page.getByText(/aplicado correctamente/i)).toBeVisible({ timeout: 5000 });
    
    // Get updated CSS variable - azul primary is "210 70% 35%"
    const updatedPrimary = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary');
    });
    
    expect(updatedPrimary.trim()).toBe('210 70% 35%');
  });
});
