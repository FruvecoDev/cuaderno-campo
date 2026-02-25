/**
 * Recomendaciones Module E2E Tests - Part 1: Page Layout
 * Tests for the technical recommendations module - page, navigation, KPIs
 */
import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Recomendaciones - Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('should display Recomendaciones link in sidebar and navigate', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Look for Recomendaciones link in the sidebar
    const recomendacionesLink = page.locator('aside a, nav a, .sidebar a').filter({ hasText: /Recomendaciones/i });
    await expect(recomendacionesLink).toBeVisible();
    
    // Click to navigate
    await recomendacionesLink.click();
    await expect(page).toHaveURL(/recomendaciones/);
    await expect(page.getByTestId('recomendaciones-page')).toBeVisible();
  });

  test('should load page with header, KPIs and Nueva Recomendación button', async ({ page }) => {
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    
    // Check header
    await expect(page.locator('h1').filter({ hasText: /Recomendaciones/i })).toBeVisible();
    
    // Check KPI cards
    await expect(page.locator('text=Total')).toBeVisible();
    await expect(page.locator('text=Pendientes')).toBeVisible();
    await expect(page.locator('text=Programadas')).toBeVisible();
    await expect(page.locator('text=Aplicadas')).toBeVisible();
    
    // Check button
    const newButton = page.getByTestId('btn-nueva-recomendacion');
    await expect(newButton).toBeVisible();
    await expect(newButton).toContainText('Nueva Recomendación');
  });

  test('should open form with all required fields', async ({ page }) => {
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    
    await page.getByTestId('btn-nueva-recomendacion').click();
    
    // Form should appear
    await expect(page.locator('h3, div').filter({ hasText: /Nueva Recomendación/i }).first()).toBeVisible();
    
    // Check for essential form fields
    await expect(page.locator('label').filter({ hasText: /Parcela/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Campaña/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Tipo/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Prioridad/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Observaciones/i }).first()).toBeVisible();
    
    // For Tratamiento Fitosanitario (default), Subtipo and Producto should show
    await expect(page.locator('label').filter({ hasText: /Subtipo/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Producto/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Dosis/i }).first()).toBeVisible();
  });

  test('should close form on Cancel', async ({ page }) => {
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    
    await page.getByTestId('btn-nueva-recomendacion').click();
    
    // Verify form is visible
    await expect(page.locator('h3, div').filter({ hasText: /Nueva Recomendación/i }).first()).toBeVisible();
    
    // Click Cancel to close
    await page.locator('button').filter({ hasText: /Cancelar/i }).click();
    
    // Form should be hidden
    await expect(page.locator('h3').filter({ hasText: /Nueva Recomendación/i })).not.toBeVisible();
  });

  test('should create a new recommendation successfully', async ({ page }) => {
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    
    // Open form
    await page.getByTestId('btn-nueva-recomendacion').click();
    
    // Select first available parcela
    const parcelaSelect = page.locator('select').filter({ has: page.locator('option:has-text("Seleccionar parcela")') }).first();
    await parcelaSelect.selectOption({ index: 1 });
    
    // Fill form fields
    await page.locator('input[placeholder="0.00"]').fill('2.5');
    await page.locator('input[placeholder*="pulgón"], input[placeholder*="deficiencia"]').first().fill(`TEST_${Date.now()}`);
    await page.locator('textarea[placeholder*="adicionales"]').fill('Test observation from Playwright');
    
    // Submit
    await page.locator('button').filter({ hasText: /Crear Recomendación/i }).click();
    
    // Should show success message
    await expect(page.locator('text=Recomendación creada')).toBeVisible({ timeout: 5000 });
  });
});
