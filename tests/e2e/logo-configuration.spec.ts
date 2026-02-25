import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://harvest-track-14.preview.emergentagent.com';

test.describe('Logo Configuration Feature', () => {
  
  test.describe('Admin Access to Configuracion Page', () => {
    
    test('admin can navigate to configuracion page', async ({ page }) => {
      // Login as admin
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      
      // Wait for dashboard
      await expect(page).toHaveURL(/dashboard/);
      
      // Navigate to configuracion via sidebar
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Verify page loaded
      await expect(page.getByTestId('configuracion-page')).toBeVisible();
    });
    
    test('configuracion page displays both logo uploaders', async ({ page }) => {
      // Login and navigate
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Verify both dropzones are visible
      await expect(page.getByTestId('logo-dropzone-login')).toBeVisible();
      await expect(page.getByTestId('logo-dropzone-dashboard')).toBeVisible();
      
      // Verify page title and description
      await expect(page.getByText('Configuración de la Aplicación')).toBeVisible();
      await expect(page.getByText('Logo de Login')).toBeVisible();
      await expect(page.getByText('Logo de Dashboard')).toBeVisible();
    });
    
    test('dropzones show correct instructions', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Check for file format instructions
      await expect(page.getByText('PNG, JPG, WebP o SVG (máx. 5MB)').first()).toBeVisible();
      await expect(page.getByText('Arrastra una imagen o haz clic para seleccionar').first()).toBeVisible();
    });
    
    test('configuracion page shows info section', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Check for information section
      await expect(page.getByText('Información')).toBeVisible();
      await expect(page.getByText('tamaño máximo de archivo es de 5MB')).toBeVisible();
    });
  });
  
  test.describe('Logo Upload Functionality', () => {
    
    test('can upload login logo via file input', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Create a minimal PNG buffer for testing
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
      
      // Upload file via input
      const fileInput = page.getByTestId('logo-input-login');
      await fileInput.setInputFiles({
        name: 'TEST_login_logo.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      // Wait for success message
      await expect(page.getByText(/actualizado correctamente/i)).toBeVisible({ timeout: 10000 });
    });
    
    test('can upload dashboard logo via file input', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
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
      
      const fileInput = page.getByTestId('logo-input-dashboard');
      await fileInput.setInputFiles({
        name: 'TEST_dashboard_logo.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      await expect(page.getByText(/actualizado correctamente/i)).toBeVisible({ timeout: 10000 });
    });
    
    test('delete button appears after upload', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Upload a logo first
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
      
      const fileInput = page.getByTestId('logo-input-login');
      await fileInput.setInputFiles({
        name: 'TEST_for_delete.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      await expect(page.getByText(/actualizado correctamente/i)).toBeVisible({ timeout: 10000 });
      
      // Verify delete button is visible
      await expect(page.getByTestId('delete-logo-login')).toBeVisible();
      await expect(page.getByText('Eliminar logo y usar por defecto')).toBeVisible();
    });
  });
  
  test.describe('Logo Delete Functionality', () => {
    
    test('can delete uploaded login logo', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // First upload a logo
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
      
      await page.getByTestId('logo-input-login').setInputFiles({
        name: 'TEST_to_delete.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      await expect(page.getByText(/actualizado correctamente/i)).toBeVisible({ timeout: 10000 });
      
      // Now delete the logo - handle confirmation dialog
      page.on('dialog', dialog => dialog.accept());
      await page.getByTestId('delete-logo-login').click();
      
      // Wait for success message
      await expect(page.getByText(/eliminado/i)).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Non-Admin Access Control', () => {
    
    test('configuracion page redirects non-admin to dashboard', async ({ page }) => {
      // First check if manager user exists and can login
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('manager@fruveco.com');
      await page.getByTestId('login-password').fill('manager');
      await page.getByTestId('login-submit').click();
      
      // Wait to see result
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        // Manager doesn't exist, skip test
        test.skip();
        return;
      }
      
      // Navigate to configuracion
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Should be redirected or not see the page
      await expect(page).toHaveURL(/dashboard/);
    });
  });
  
  test.describe('Logo Display in App', () => {
    
    test('custom login logo appears on login page after upload', async ({ page }) => {
      // Login as admin and upload logo
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Upload logo
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
      
      await page.getByTestId('logo-input-login').setInputFiles({
        name: 'TEST_login_display.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      await expect(page.getByText(/actualizado correctamente/i)).toBeVisible({ timeout: 10000 });
      
      // Logout and check login page
      // Clear localStorage to logout
      await page.evaluate(() => {
        localStorage.clear();
      });
      
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Check that an image with src containing /api/uploads/logos/ exists
      const logoImg = page.locator('img[src*="/api/uploads/logos/"]');
      await expect(logoImg).toBeVisible({ timeout: 5000 });
    });
    
    test('custom dashboard logo appears in sidebar after upload', async ({ page }) => {
      // Login as admin and upload dashboard logo
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
      
      // Upload dashboard logo
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
      
      await page.getByTestId('logo-input-dashboard').setInputFiles({
        name: 'TEST_dashboard_display.png',
        mimeType: 'image/png',
        buffer: pngBuffer
      });
      
      await expect(page.getByText(/actualizado correctamente/i)).toBeVisible({ timeout: 10000 });
      
      // Reload dashboard and check sidebar
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      
      // Check that sidebar has image with custom logo
      const sidebarLogo = page.locator('.sidebar img[src*="/api/uploads/logos/"], aside img[src*="/api/uploads/logos/"]');
      await expect(sidebarLogo).toBeVisible({ timeout: 5000 });
    });
  });
  
  test.describe('Menu Visibility', () => {
    
    test('configuracion link visible in sidebar for admin', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/dashboard/);
      
      // Look for configuracion link in sidebar
      const configLink = page.locator('aside a, .sidebar a, nav a').filter({ hasText: /Configuración/i }).first();
      
      // May need to expand the section first
      const configSection = page.locator('.nav-section-title, .nav-section').filter({ hasText: /Configuración/i }).first();
      if (await configSection.isVisible()) {
        await configSection.click();
        await page.waitForLoadState('domcontentloaded');
      }
      
      await expect(configLink).toBeVisible({ timeout: 5000 });
    });
  });
});
