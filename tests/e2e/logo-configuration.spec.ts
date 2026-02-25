import { test, expect } from '@playwright/test';

/**
 * Logo Configuration Feature Tests
 * 
 * Note: react-dropzone file upload via setInputFiles is unreliable in Playwright
 * due to how react-dropzone handles file input events. The upload functionality
 * is tested via backend API tests (test_config_logos.py). These tests focus on
 * UI elements, delete functionality, and logo display after API upload.
 */

test.describe('Logo Configuration Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('login-email').fill('admin@fruveco.com');
    await page.getByTestId('login-password').fill('admin123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });
  
  test.describe('Admin Access to Configuracion Page', () => {
    
    test('admin can navigate to configuracion page', async ({ page }) => {
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 15000 });
    });
    
    test('configuracion page displays both logo uploaders', async ({ page }) => {
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 15000 });
      
      // Verify both dropzones are visible
      await expect(page.getByTestId('logo-dropzone-login')).toBeVisible();
      await expect(page.getByTestId('logo-dropzone-dashboard')).toBeVisible();
      
      // Verify page title and description
      await expect(page.getByText('Configuración de la Aplicación')).toBeVisible();
      await expect(page.getByText('Logo de Login')).toBeVisible();
      await expect(page.getByText('Logo de Dashboard')).toBeVisible();
    });
    
    test('dropzones show correct instructions', async ({ page }) => {
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 15000 });
      
      // Check for file format instructions
      await expect(page.getByText('PNG, JPG, WebP o SVG (máx. 5MB)').first()).toBeVisible();
      await expect(page.getByText('Arrastra una imagen o haz clic para seleccionar').first()).toBeVisible();
    });
    
    test('configuracion page shows info section', async ({ page }) => {
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 15000 });
      
      // Check for information section
      await expect(page.getByText('Información')).toBeVisible();
      await expect(page.getByText('tamaño máximo de archivo es de 5MB')).toBeVisible();
    });
    
    test('hidden file inputs exist with correct attributes', async ({ page }) => {
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 15000 });
      
      // Verify hidden inputs exist with correct accept attributes
      const loginInput = page.locator('input[data-testid="logo-input-login"]');
      const dashboardInput = page.locator('input[data-testid="logo-input-dashboard"]');
      
      await expect(loginInput).toHaveCount(1);
      await expect(dashboardInput).toHaveCount(1);
      
      // Check accept attribute
      await expect(loginInput).toHaveAttribute('accept', /image\/png/);
      await expect(dashboardInput).toHaveAttribute('accept', /image\/png/);
    });
  });
  
  test.describe('Logo Delete Functionality', () => {
    
    test('can delete existing login logo', async ({ page, request }) => {
      // First upload a logo via API to ensure we have one to delete
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Create a minimal PNG
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      // Upload via API
      const formData = new FormData();
      formData.append('file', new Blob([pngBuffer], { type: 'image/png' }), 'test.png');
      
      await request.post('/api/config/logo/login', {
        headers: { Authorization: `Bearer ${token}` },
        multipart: { file: { name: 'test.png', mimeType: 'image/png', buffer: pngBuffer } }
      });
      
      // Navigate to configuracion
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('configuracion-page')).toBeVisible({ timeout: 15000 });
      
      // Verify delete button exists
      const deleteButton = page.getByTestId('delete-logo-login');
      await expect(deleteButton).toBeVisible();
      
      // Handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      
      // Click delete
      await deleteButton.click();
      
      // Verify success message
      await expect(page.getByText(/eliminado/i)).toBeVisible({ timeout: 10000 });
      
      // Verify delete button is no longer visible
      await expect(deleteButton).not.toBeVisible();
    });
  });
  
  test.describe('Logo Display After API Upload', () => {
    
    test('login logo appears on login page after API upload', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Create PNG buffer
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      // Upload login logo via API
      await request.post('/api/config/logo/login', {
        headers: { Authorization: `Bearer ${token}` },
        multipart: { file: { name: 'login_test.png', mimeType: 'image/png', buffer: pngBuffer } }
      });
      
      // Logout
      await page.evaluate(() => localStorage.clear());
      
      // Go to login page
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Verify custom logo is displayed
      const logoImg = page.locator('img[src*="/api/uploads/logos/"]');
      await expect(logoImg).toBeVisible({ timeout: 5000 });
    });
    
    test('dashboard logo appears in sidebar after API upload', async ({ page, request }) => {
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Create PNG buffer
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      // Upload dashboard logo via API
      await request.post('/api/config/logo/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
        multipart: { file: { name: 'dashboard_test.png', mimeType: 'image/png', buffer: pngBuffer } }
      });
      
      // Reload dashboard
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      
      // Verify custom logo in sidebar
      const sidebarLogo = page.locator('.sidebar img[src*="/api/uploads/logos/"], aside img[src*="/api/uploads/logos/"]');
      await expect(sidebarLogo).toBeVisible({ timeout: 5000 });
    });
  });
  
  test.describe('Access Control', () => {
    
    test('non-admin user cannot access configuracion page', async ({ page }) => {
      // Logout first
      await page.evaluate(() => localStorage.clear());
      
      // Try to login as manager (if exists)
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('manager@fruveco.com');
      await page.getByTestId('login-password').fill('manager');
      await page.getByTestId('login-submit').click();
      
      // Wait for result
      await page.waitForLoadState('networkidle').catch(() => {});
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        // Manager doesn't exist, skip
        test.skip();
        return;
      }
      
      // Try to access configuracion
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Should be redirected to dashboard (non-admin cannot access)
      await expect(page).toHaveURL(/dashboard/);
    });
    
    test('configuracion menu item visible only for admin', async ({ page }) => {
      // We're already logged in as admin from beforeEach
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      
      // Expand the Configuración section in sidebar
      const configSection = page.locator('.nav-section-title').filter({ hasText: /Configuración/i }).first();
      if (await configSection.isVisible()) {
        await configSection.click();
      }
      
      // Look for configuracion link
      const configLink = page.locator('a[href="/configuracion"], a').filter({ hasText: /Configuración App/i }).first();
      await expect(configLink).toBeVisible({ timeout: 5000 });
    });
  });
  
  test.describe('API Endpoint Tests', () => {
    
    test('GET /api/config/logos returns correct structure', async ({ request }) => {
      const response = await request.get('/api/config/logos');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect('login_logo' in data).toBe(true);
      expect('dashboard_logo' in data).toBe(true);
      expect('updated_at' in data).toBe(true);
    });
    
    test('POST /api/config/logo/{type} requires authentication', async ({ request }) => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
        0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
        0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      
      const response = await request.post('/api/config/logo/login', {
        multipart: { file: { name: 'test.png', mimeType: 'image/png', buffer: pngBuffer } }
      });
      
      // Should fail with 401 or 403
      expect(response.status()).toBeGreaterThanOrEqual(401);
      expect(response.status()).toBeLessThan(500);
    });
  });
});
