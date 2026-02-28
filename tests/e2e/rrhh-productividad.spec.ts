import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://agro-dashboard-dev.preview.emergentagent.com';

test.describe('RRHH - ProductividadTab', () => {
  
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
    
    // Navigate directly to RRHH
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    
    // Click Productividad tab
    await page.getByRole('button', { name: /productividad/i }).click();
    await page.waitForLoadState('domcontentloaded');
  });
  
  test('Productividad tab loads with records table', async ({ page }) => {
    // Check for table title
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for table headers
    await expect(page.locator('th').filter({ hasText: 'Fecha' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Empleado' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Tipo' }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Kilos' }).first()).toBeVisible();
  });
  
  test('Employee filter dropdown is present', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for employee filter
    const employeeFilter = page.locator('select').first();
    await expect(employeeFilter).toBeVisible();
    
    // Should have "Todos los empleados" option
    const options = await employeeFilter.locator('option').allTextContents();
    expect(options.some(opt => opt.includes('Todos') || opt.includes('empleados'))).toBe(true);
  });
  
  test('Date range filters are present', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for date inputs
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
  });
  
  test('Nuevo Registro button is visible', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    const newRecordBtn = page.getByRole('button', { name: /nuevo registro/i });
    await expect(newRecordBtn).toBeVisible();
  });
  
  test('Nuevo Registro modal opens with form', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Click new record button
    await page.getByRole('button', { name: /nuevo registro/i }).click();
    
    // Modal should open
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Check for form fields
    await expect(page.getByText('Empleado').first()).toBeVisible();
    await expect(page.getByText('Fecha').first()).toBeVisible();
    await expect(page.getByText('Tipo de Trabajo')).toBeVisible();
    await expect(page.getByText('Kilos').first()).toBeVisible();
    await expect(page.getByText('Hectáreas').first()).toBeVisible();
    await expect(page.getByText('Horas').first()).toBeVisible();
  });
  
  test('Modal can be closed with Cancel button', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Open modal
    await page.getByRole('button', { name: /nuevo registro/i }).click();
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Click cancel
    await page.getByRole('button', { name: /cancelar/i }).last().click();
    
    // Modal should close
    await expect(page.getByText('Nuevo Registro de Productividad')).not.toBeVisible({ timeout: 3000 });
  });
  
  test('Table has Kg/Hora column', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for Kg/Hora column header
    await expect(page.locator('th').filter({ hasText: /kg.*hora/i }).first()).toBeVisible();
  });
  
  test('Tipo trabajo options are available in modal', async ({ page }) => {
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Open modal
    await page.getByRole('button', { name: /nuevo registro/i }).click();
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Check for tipo trabajo select with options
    const tipoSelect = page.locator('select').filter({ has: page.locator('option[value="recoleccion"]') });
    await expect(tipoSelect).toBeVisible();
    
    // Check for work type options
    const options = await tipoSelect.locator('option').allTextContents();
    expect(options.some(opt => opt.includes('Recolección'))).toBe(true);
    expect(options.some(opt => opt.includes('Poda'))).toBe(true);
  });
});
