import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, dismissResumenDiarioModal, dismissToasts } from '../fixtures/helpers';

/**
 * Test suite for enhanced Irrigaciones module
 * Features: KPIs, advanced filters, statistics with charts, consumption calculator, parcel history, Excel export
 */

test.describe('Irrigaciones Module', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page, 'admin@fruveco.com', 'admin123');
    
    // Dismiss any modals that might appear after login
    await dismissResumenDiarioModal(page);
    
    // Navigate to Irrigaciones page via sidebar
    const irrigacionesLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /Irrigaciones|Riegos/i }).first();
    await irrigacionesLink.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('irrigaciones-page')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
  });

  test('Irrigaciones page loads with KPIs', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1').filter({ hasText: /Irrigaciones/i })).toBeVisible();
    
    // Verify action buttons are visible
    await expect(page.getByRole('button', { name: /^Lista$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Estadísticas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Calculadora/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuevo Riego/i })).toBeVisible();
    
    // Verify KPIs cards are visible - looking for key metrics
    await expect(page.getByText(/Total|Próx.*días|m³|Horas|Coste|Ha Regadas/i).first()).toBeVisible();
  });

  test('Statistics view with charts', async ({ page }) => {
    // Click statistics button
    const statsBtn = page.getByRole('button', { name: /Estadísticas/i });
    await statsBtn.click({ force: true });
    
    // Wait for view to change
    await page.waitForLoadState('domcontentloaded');
    
    // Verify chart titles are visible
    await expect(page.getByText(/Distribución por Sistema/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Volumen por Mes/i)).toBeVisible();
    
    // Verify KPIs in chart view
    await expect(page.getByText(/Total Riegos|Completados|Planificados/i).first()).toBeVisible();
    
    // Switch back to list
    const listaBtn = page.getByRole('button', { name: /^Lista$/i });
    await listaBtn.click({ force: true });
  });

  test('Consumption calculator opens and has fields', async ({ page }) => {
    // Click calculator button
    const calcBtn = page.getByRole('button', { name: /Calculadora/i });
    await calcBtn.click({ force: true });
    
    // Verify calculator panel appears
    await expect(page.getByText(/Calculadora de Consumo por Hectárea/i)).toBeVisible();
    
    // Verify calculator has parcela select
    const calculatorPanel = page.locator('.bg-blue-50');
    await expect(calculatorPanel.locator('select').first()).toBeVisible();
    
    // Verify calculator has volume input
    await expect(calculatorPanel.locator('.form-label').filter({ hasText: /Volumen/i })).toBeVisible();
    
    // Verify calculator has calculate button
    await expect(calculatorPanel.getByRole('button', { name: /^Calcular$/i })).toBeVisible();
    
    // Toggle calculator off
    await calcBtn.click({ force: true });
  });

  test('Advanced filters panel toggles', async ({ page }) => {
    // Click filters button
    const filtersBtn = page.getByRole('button', { name: /^Filtros$/i }).first();
    await filtersBtn.click({ force: true });
    
    // Verify filter labels appear
    await expect(page.locator('.form-label').filter({ hasText: /^Sistema$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Parcela$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Estado$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Cultivo$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Desde/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Hasta/i }).first()).toBeVisible();
  });

  test('List view shows irrigation records table', async ({ page }) => {
    // Ensure we're in list mode
    const listaBtn = page.getByRole('button', { name: /^Lista$/i });
    await listaBtn.click({ force: true });
    
    // Verify table structure exists
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('thead')).toBeVisible();
    
    // Verify expected columns
    await expect(page.getByRole('columnheader', { name: /Fecha/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Sistema/i })).toBeVisible();
  });

  test('Create new irrigation form opens', async ({ page }) => {
    // Click "Nuevo Riego" button
    const newBtn = page.getByRole('button', { name: /Nuevo Riego/i });
    await newBtn.click({ force: true });
    
    // Verify form appears
    await expect(page.locator('.card-title').filter({ hasText: /Nuevo Riego/i })).toBeVisible();
    
    // Verify key form fields
    await expect(page.locator('.form-label').filter({ hasText: /^Parcela/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Sistema/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Fecha/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Duración/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Volumen/i })).toBeVisible();
    
    // Cancel form
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click({ force: true });
  });

  test('Excel export button is functional', async ({ page }) => {
    const excelBtn = page.getByRole('button', { name: /Excel/i });
    await expect(excelBtn).toBeVisible();
    
    // Test that the download triggers (we just verify no error)
    await excelBtn.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
  });
});
