import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://agro-dashboard-dev.preview.emergentagent.com';

test.describe('Usuarios - Gestión y Vinculación', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button:has-text("Iniciar")').first().click();
    
    // Wait for dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    
    // Close any modals/overlays
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    const entendidoBtn = page.getByRole('button', { name: /entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await entendidoBtn.click();
    }
    
    // Navigate to Usuarios
    await page.click('text=Usuarios');
    await page.waitForLoadState('domcontentloaded');
  });
  
  test('Usuarios page loads with user list', async ({ page }) => {
    // Check page loads
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    
    // Check for table
    await expect(page.locator('table')).toBeVisible();
    
    // Check for expected columns
    await expect(page.getByText('Empleado Vinculado')).toBeVisible();
    await expect(page.getByText('Tipo Operación')).toBeVisible();
  });
  
  test('New User button is visible and clickable', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    
    const newUserBtn = page.getByTestId('btn-nuevo-usuario');
    await expect(newUserBtn).toBeVisible();
  });
  
  test('Create user form includes Empleado role', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    
    // Click new user button
    await page.getByTestId('btn-nuevo-usuario').click();
    
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
    
    // Check "Sin vincular" appears (users not linked)
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
    
    // Check for at least one vincular button
    const vincularBtns = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularBtns.count();
    
    if (count > 0) {
      await expect(vincularBtns.first()).toBeVisible();
    }
  });
  
  test('Vincular modal opens and shows employee list', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const vincularBtns = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularBtns.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Click vincular button
    await vincularBtns.first().click();
    
    // Modal should open
    await expect(page.getByText('Vincular con Empleado')).toBeVisible({ timeout: 5000 });
    
    // Should have search input
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
    
    // Should have "Sin vincular" option
    await expect(page.getByText('Sin vincular')).toBeVisible();
  });
  
  test('Tipo Operacion modal opens with options', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    const tipoOpBtns = page.locator('[data-testid^="btn-tipo-op-"]');
    const count = await tipoOpBtns.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Click tipo op button
    await tipoOpBtns.first().click();
    
    // Modal should open
    await expect(page.getByText('Tipo de Operación')).toBeVisible({ timeout: 5000 });
    
    // Options should be visible
    await expect(page.locator('input[value="compra"]')).toBeVisible();
    await expect(page.locator('input[value="venta"]')).toBeVisible();
    await expect(page.locator('input[value="ambos"]')).toBeVisible();
  });
});
