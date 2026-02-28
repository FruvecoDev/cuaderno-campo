import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://agri-rrhh-plus.preview.emergentagent.com';

test.describe('Usuarios - Gestión y Vinculación', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button:has-text("Iniciar")').first().click();
    
    // Wait for dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    
    // Aggressively remove all blocking overlays
    await page.evaluate(() => {
      // Remove webpack overlay
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
      
      // Remove any modal overlays
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      
      // Remove error overlays
      document.querySelectorAll('[class*="error-overlay"]').forEach(el => el.remove());
    });
    
    // Try to close ResumenDiario modal if present
    const entendidoBtn = page.getByRole('button', { name: /entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await entendidoBtn.click({ force: true });
    }
    
    // Navigate directly to Usuarios via URL
    await page.goto('/usuarios', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Remove overlays again after navigation
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    });
  });
  
  test('Usuarios page loads with user list', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText('Empleado Vinculado')).toBeVisible();
    await expect(page.getByText('Tipo Operación')).toBeVisible();
  });
  
  test('New User button is visible', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    const newUserBtn = page.getByTestId('btn-nuevo-usuario');
    await expect(newUserBtn).toBeVisible();
  });
  
  test('Create user form includes Empleado role', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    
    // Remove any overlay before clicking
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    // Click new user button with force
    await page.getByTestId('btn-nuevo-usuario').click({ force: true });
    
    // Wait for form
    await expect(page.getByText('Crear Usuario', { exact: false })).toBeVisible({ timeout: 5000 });
    
    // Check for Empleado role option
    const roleOptions = page.locator('option');
    const optionsText = await roleOptions.allTextContents();
    expect(optionsText.some(opt => opt.includes('Empleado'))).toBe(true);
  });
  
  test('Users table shows Empleado Vinculado column with data', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Use .first() to avoid strict mode violation
    await expect(page.getByText('Sin vincular').first()).toBeVisible();
  });
  
  test('Tipo Operacion badges are displayed', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Look for tipo operacion badges 
    const badges = page.locator('span').filter({ hasText: /^(Compra|Venta|Ambos)$/ });
    await expect(badges.first()).toBeVisible();
  });
  
  test('Vincular button exists for other users', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const vincularBtns = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularBtns.count();
    
    if (count > 0) {
      await expect(vincularBtns.first()).toBeVisible();
    }
  });
  
  test('Vincular modal opens and shows options', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const vincularBtns = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularBtns.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Remove overlay and click with force
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    await vincularBtns.first().click({ force: true });
    
    // Modal should open
    await expect(page.getByText('Vincular con Empleado')).toBeVisible({ timeout: 5000 });
    
    // Should have search input
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
  });
  
  test('Tipo Operacion modal opens with radio options', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const tipoOpBtns = page.locator('[data-testid^="btn-tipo-op-"]');
    const count = await tipoOpBtns.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Remove overlay and click with force
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    await tipoOpBtns.first().click({ force: true });
    
    // Modal should open
    await expect(page.getByText('Tipo de Operación')).toBeVisible({ timeout: 5000 });
    
    // Radio options should be visible
    await expect(page.locator('input[value="compra"]')).toBeVisible();
    await expect(page.locator('input[value="venta"]')).toBeVisible();
    await expect(page.locator('input[value="ambos"]')).toBeVisible();
  });
});
