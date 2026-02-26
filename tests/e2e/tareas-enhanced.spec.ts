import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, dismissToasts } from '../fixtures/helpers';

/**
 * Test suite for enhanced Tareas module
 * Features: KPIs, calendar view, advanced filters, subtasks, status changes, Excel export
 */

test.describe('Tareas Module', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page, 'admin@fruveco.com', 'admin123');
    
    // Navigate to Tareas page via sidebar
    const tareasLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /^Tareas$/i }).first();
    await tareasLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('tareas-page')).toBeVisible({ timeout: 15000 });
    
    await removeEmergentBadge(page);
  });

  test('Tareas page loads with KPIs', async ({ page }) => {
    // Verify page title
    await expect(page.getByRole('heading', { name: /Tareas/i })).toBeVisible();
    
    // Verify stats/KPIs cards are visible - looking for card elements with numbers
    const statsCards = page.locator('.card').filter({ hasText: /Total|Pendientes|En Progreso|Completadas|Vencidas|Esta Semana/i });
    await expect(statsCards.first()).toBeVisible();
  });

  test('Calendar view toggle works', async ({ page }) => {
    // Find and click calendar button
    const calendarBtn = page.getByRole('button', { name: /Calendario/i });
    await expect(calendarBtn).toBeVisible();
    await calendarBtn.click();
    
    // Verify calendar view is displayed - should show month name
    await expect(page.getByText(/Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i)).toBeVisible();
    
    // Switch back to list view
    const listaBtn = page.getByRole('button', { name: /^Lista$/i });
    await listaBtn.click();
    
    // Verify back in list mode
    await expect(page.getByTestId('tareas-filtros')).toBeVisible();
  });

  test('Advanced filters panel toggles', async ({ page }) => {
    // Click filters button
    const filtersBtn = page.getByRole('button', { name: /Filtros/i }).first();
    await expect(filtersBtn).toBeVisible();
    await filtersBtn.click();
    
    // Verify filter dropdowns appear
    await expect(page.locator('label').filter({ hasText: /^Estado$/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Prioridad$/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Tipo$/i }).first()).toBeVisible();
  });

  test('Excel export button exists', async ({ page }) => {
    // Find Excel export button
    const excelBtn = page.getByRole('button', { name: /Excel/i });
    await expect(excelBtn).toBeVisible();
  });
});
