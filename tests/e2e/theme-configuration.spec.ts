import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://harvest-track-14.preview.emergentagent.com';
const ADMIN_EMAIL = 'admin@fruveco.com';
const ADMIN_PASSWORD = 'admin123';

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

  test.beforeEach(async ({ page }) => {
    // Remove emergent badge to avoid click issues
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
        if (badge) badge.remove();
      });
    });
  });

  test.describe('Configuracion Page Access', () => {
    test('admin can navigate to configuracion page and see theme selector', async ({ page }) => {
      // Login as admin
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      
      // Wait for dashboard to load
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      
      // Navigate to Configuración
      await page.getByRole('link', { name: /configuración/i }).click();
      await expect(page.getByTestId('configuracion-page')).toBeVisible();
      
      // Verify theme selector is visible
      await expect(page.getByText('Tema de Colores')).toBeVisible();
      await expect(page.getByText('Temas Predefinidos')).toBeVisible();
    });

    test('predefined themes grid displays 8 themes', async ({ page }) => {
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Verify 8 predefined theme buttons
      const themeIds = ['verde', 'azul', 'rojo', 'naranja', 'morado', 'teal', 'marron', 'gris'];
      for (const themeId of themeIds) {
        await expect(page.getByTestId(`theme-${themeId}`)).toBeVisible();
      }
    });
  });

  test.describe('Predefined Theme Selection', () => {
    test('clicking predefined theme applies it', async ({ page, request }) => {
      // Reset to verde first
      await request.delete(`${BASE_URL}/api/config/theme`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Click azul theme
      await page.getByTestId('theme-azul').click();
      
      // Wait for success message
      await expect(page.getByText(/aplicado correctamente/i)).toBeVisible({ timeout: 5000 });
      
      // Verify API reflects the change
      const response = await request.get(`${BASE_URL}/api/config/theme`);
      const data = await response.json();
      expect(data.theme_id).toBe('azul');
    });

    test('selected theme has visual indicator', async ({ page, request }) => {
      // Set rojo theme via API
      await request.post(`${BASE_URL}/api/config/theme?theme_id=rojo`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // The rojo theme button should have a checkmark (Check icon)
      const rojoButton = page.getByTestId('theme-rojo');
      await expect(rojoButton).toBeVisible();
      // Selected theme has thicker border
      await expect(rojoButton).toHaveCSS('border-width', '2px');
    });
  });

  test.describe('Custom Colors', () => {
    test('can show/hide custom color picker', async ({ page }) => {
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Initially custom colors section may be hidden - click Mostrar button
      const showButton = page.getByRole('button', { name: /mostrar/i });
      await showButton.click();
      
      // Custom color inputs should be visible
      await expect(page.getByTestId('custom-primary-color')).toBeVisible();
      await expect(page.getByTestId('custom-accent-color')).toBeVisible();
      await expect(page.getByTestId('apply-custom-theme')).toBeVisible();
      
      // Click Ocultar to hide
      const hideButton = page.getByRole('button', { name: /ocultar/i });
      await hideButton.click();
      
      // Inputs should be hidden
      await expect(page.getByTestId('custom-primary-color')).not.toBeVisible();
    });

    test('can apply custom colors', async ({ page, request }) => {
      // Reset first
      await request.delete(`${BASE_URL}/api/config/theme`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Show custom colors
      await page.getByRole('button', { name: /mostrar/i }).click();
      
      // Set custom colors using the color pickers
      await page.getByTestId('custom-primary-color').fill('#663399'); // rebeccapurple
      await page.getByTestId('custom-accent-color').fill('#ffa500'); // orange
      
      // Apply custom colors
      await page.getByTestId('apply-custom-theme').click();
      
      // Wait for success message
      await expect(page.getByText(/personalizados aplicados/i)).toBeVisible({ timeout: 5000 });
      
      // Verify API reflects custom theme
      const response = await request.get(`${BASE_URL}/api/config/theme`);
      const data = await response.json();
      expect(data.is_custom).toBe(true);
      expect(data.theme_id).toBe('custom');
    });
  });

  test.describe('Reset Theme', () => {
    test('reset button restores default theme', async ({ page, request }) => {
      // First set a non-default theme
      await request.post(`${BASE_URL}/api/config/theme?theme_id=naranja`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Set up dialog handler for confirmation
      page.on('dialog', dialog => dialog.accept());
      
      // Click reset button
      await page.getByTestId('reset-theme').click();
      
      // Wait for success message
      await expect(page.getByText(/restaurado al predeterminado/i)).toBeVisible({ timeout: 5000 });
      
      // Verify API reflects verde
      const response = await request.get(`${BASE_URL}/api/config/theme`);
      const data = await response.json();
      expect(data.theme_id).toBe('verde');
    });

    test('reset button is disabled when already on default theme', async ({ page, request }) => {
      // Reset to default first
      await request.delete(`${BASE_URL}/api/config/theme`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Reset button should be disabled
      await expect(page.getByTestId('reset-theme')).toBeDisabled();
    });
  });

  test.describe('Theme Persistence', () => {
    test('theme persists after page reload', async ({ page, request }) => {
      // Set morado theme via API
      await request.post(`${BASE_URL}/api/config/theme?theme_id=morado`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      
      // Get the current primary color CSS variable
      const primaryBefore = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary');
      });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      
      // Theme should still be morado (check CSS variable)
      const primaryAfter = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary');
      });
      
      // Both should be the morado primary color
      expect(primaryAfter.trim()).toBe(primaryBefore.trim());
    });

    test('theme is applied on app load (index.js)', async ({ page, request }) => {
      // Set teal theme
      await request.post(`${BASE_URL}/api/config/theme?theme_id=teal`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Open login page (not logged in yet)
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Theme should be loaded - teal primary is "175 60% 30%"
      const primary = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary');
      });
      
      expect(primary.trim()).toBe('175 60% 30%');
    });
  });

  test.describe('CSS Variables Applied', () => {
    test('selecting theme updates CSS variables dynamically', async ({ page, request }) => {
      // Reset to verde
      await request.delete(`${BASE_URL}/api/config/theme`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      // Login and navigate
      await page.goto('/');
      await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
      await page.getByRole('textbox', { name: /contraseña/i }).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /iniciar sesión/i }).click();
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
      await page.getByRole('link', { name: /configuración/i }).click();
      
      // Get initial CSS variable
      const initialPrimary = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary');
      });
      
      // Click azul theme
      await page.getByTestId('theme-azul').click();
      await expect(page.getByText(/aplicado correctamente/i)).toBeVisible({ timeout: 5000 });
      
      // Wait a bit for CSS to update
      await page.waitForTimeout(500);
      
      // Get updated CSS variable
      const updatedPrimary = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--primary');
      });
      
      // Should have changed to azul's primary "210 70% 35%"
      expect(updatedPrimary.trim()).toBe('210 70% 35%');
      expect(updatedPrimary.trim()).not.toBe(initialPrimary.trim());
    });
  });
});
