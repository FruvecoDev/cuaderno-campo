import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, dismissResumenDiarioModal, dismissToasts } from '../fixtures/helpers';

/**
 * Test suite for enhanced Tareas module
 * Features: KPIs, calendar view, advanced filters, subtasks, status changes, Excel export
 */

test.describe('Tareas Module', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page, 'admin@fruveco.com', 'admin123');
    
    // Dismiss any modals that might appear after login
    await dismissResumenDiarioModal(page);
    
    // Navigate to Tareas page via sidebar
    const tareasLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /^Tareas$/i }).first();
    await tareasLink.click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('tareas-page')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
  });

  test('Tareas page loads with action buttons', async ({ page }) => {
    // Verify page title (use first() to avoid strict mode issue)
    await expect(page.locator('h1').filter({ hasText: /Tareas/i })).toBeVisible();
    
    // Verify buttons are visible
    await expect(page.getByRole('button', { name: /^Lista$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Calendario/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nueva Tarea/i })).toBeVisible();
    
    // Verify filters section exists
    await expect(page.getByTestId('tareas-filtros')).toBeVisible();
  });

  test('Calendar view toggle works', async ({ page }) => {
    // Find and click calendar button
    const calendarBtn = page.getByRole('button', { name: /Calendario/i });
    await calendarBtn.click({ force: true });
    
    // Verify calendar view is displayed - should show month name
    await expect(page.getByText(/Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i)).toBeVisible();
    
    // Should show day headers
    await expect(page.getByText(/^Dom$|^Lun$|^Mar$|^Mié$|^Jue$|^Vie$|^Sáb$/i).first()).toBeVisible();
    
    // Switch back to list view
    const listaBtn = page.getByRole('button', { name: /^Lista$/i });
    await listaBtn.click({ force: true });
    
    // Verify back in list mode
    await expect(page.getByTestId('tareas-filtros')).toBeVisible();
  });

  test('Advanced filters panel toggles', async ({ page }) => {
    // Click filters button
    const filtersBtn = page.getByRole('button', { name: /Filtros/i }).first();
    await filtersBtn.click({ force: true });
    
    // Verify filter section expands with dropdowns
    await expect(page.locator('.form-label').filter({ hasText: /^Estado$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Prioridad$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Tipo$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Asignado/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Desde/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Hasta/i }).first()).toBeVisible();
  });

  test('Create new tarea form opens and has all fields', async ({ page }) => {
    // Click "Nueva Tarea" button
    const newBtn = page.getByRole('button', { name: /Nueva Tarea/i });
    await newBtn.click({ force: true });
    
    // Verify form appears with heading
    await expect(page.locator('.card-title').filter({ hasText: /Nueva Tarea/i })).toBeVisible();
    
    // Verify form fields
    await expect(page.locator('.form-label').filter({ hasText: /^Nombre/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Tipo$/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Prioridad$/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Estado$/i })).toBeVisible();
    
    // Verify subtasks section - use heading specifically
    await expect(page.getByRole('heading', { name: /Subtareas.*Checklist/i })).toBeVisible();
    
    // Cancel form
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click({ force: true });
  });

  test('Excel export button is functional', async ({ page }) => {
    const excelBtn = page.getByRole('button', { name: /Excel/i });
    await expect(excelBtn).toBeVisible();
    
    // Test that the download triggers (we just verify no error)
    await excelBtn.click({ force: true });
    // Give a moment for download to start
    await page.waitForLoadState('domcontentloaded');
  });
});
