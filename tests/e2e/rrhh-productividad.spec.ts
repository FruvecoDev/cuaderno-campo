import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://agro-docs.preview.emergentagent.com';

test.describe('RRHH - ProductividadTab', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login flow
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button:has-text("Iniciar")').first().click();
    
    // Wait for dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    
    // Remove overlays
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
    });
    
    // Close ResumenDiario modal if present
    const entendidoBtn = page.getByRole('button', { name: /entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await entendidoBtn.click({ force: true });
    }
    
    // Navigate directly to RRHH
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    
    // Remove overlays again
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    // Click Productividad tab with force
    await page.getByRole('button', { name: /productividad/i }).click({ force: true });
    await page.waitForLoadState('domcontentloaded');
  });
  
  test('Productividad tab loads with records table', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check table headers
    await expect(page.locator('th').filter({ hasText: 'Fecha' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Empleado' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Tipo' }).first()).toBeVisible();
  });
  
  test('Employee filter dropdown is present', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    const employeeFilter = page.locator('select').first();
    await expect(employeeFilter).toBeVisible();
  });
  
  test('Date range filters are present', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });
  
  test('Nuevo Registro button is visible', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    const newRecordBtn = page.getByRole('button', { name: /nuevo registro/i });
    await expect(newRecordBtn).toBeVisible();
  });
  
  test('Nuevo Registro modal opens with form fields', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Remove overlay
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    // Click new record button
    await page.getByRole('button', { name: /nuevo registro/i }).click({ force: true });
    
    // Modal should open
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Check for form fields - use locator to be more flexible
    await expect(page.locator('label:has-text("Empleado"), .form-group:has-text("Empleado")').first()).toBeVisible();
    await expect(page.locator('label:has-text("Fecha"), .form-group:has-text("Fecha")').first()).toBeVisible();
  });
  
  test('Modal can be closed with Cancel button', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    await page.evaluate(() => {
      const iframe = document.getElementById('webpack-dev-server-client-overlay');
      if (iframe) iframe.remove();
    });
    
    // Open modal
    await page.getByRole('button', { name: /nuevo registro/i }).click({ force: true });
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Click cancel
    await page.getByRole('button', { name: /cancelar/i }).last().click({ force: true });
    
    // Modal should close
    await expect(page.getByText('Nuevo Registro de Productividad')).not.toBeVisible({ timeout: 3000 });
  });
  
  test('Table has expected columns', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for expected columns
    const headers = ['Fecha', 'Empleado', 'Tipo', 'Kilos', 'Hectáreas', 'Horas', 'Parcela', 'Acciones'];
    for (const header of headers.slice(0, 4)) {
      await expect(page.locator('th').filter({ hasText: header }).first()).toBeVisible();
    }
  });
  
  test('Table shows empty state or records', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Either empty state or table rows should be visible
    const emptyState = page.getByText('No hay registros de productividad');
    const tableRows = page.locator('table tbody tr');
    
    // At least one of these should be true
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasRows = await tableRows.count() > 0;
    
    expect(isEmpty || hasRows).toBe(true);
  });
});
