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
    // Verify page title (use first() to avoid strict mode issue)
    await expect(page.locator('h1').filter({ hasText: /Tareas/i })).toBeVisible();
    
    // Wait for stats to load - the stats grid should appear
    // Since there are 0 tareas, the KPIs should still show with 0 values
    const statsGrid = page.locator('.grid').filter({ has: page.locator('.card') }).first();
    await expect(statsGrid).toBeVisible();
    
    // Verify buttons are visible
    await expect(page.getByRole('button', { name: /^Lista$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Calendario/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nueva Tarea/i })).toBeVisible();
  });

  test('Calendar view toggle works', async ({ page }) => {
    // Find and click calendar button
    const calendarBtn = page.getByRole('button', { name: /Calendario/i });
    await expect(calendarBtn).toBeVisible();
    await calendarBtn.click();
    
    // Verify calendar view is displayed - should show month name
    await expect(page.getByText(/Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i)).toBeVisible();
    
    // Should show day headers
    await expect(page.getByText(/^Dom$|^Lun$|^Mar$|^Mié$|^Jue$|^Vie$|^Sáb$/i).first()).toBeVisible();
    
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
    
    // Verify filter section expands with dropdowns
    // Look for form labels that appear in the filter panel
    await expect(page.locator('.form-label').filter({ hasText: /^Estado$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Prioridad$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Tipo$/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Asignado/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Desde/i }).first()).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /Hasta/i }).first()).toBeVisible();
  });

  test('Filter by estado and prioridad', async ({ page }) => {
    // Click filters button
    const filtersBtn = page.getByRole('button', { name: /Filtros/i }).first();
    await filtersBtn.click();
    
    // Find estado select
    const estadoFormGroup = page.locator('.form-group').filter({ hasText: /^Estado$/ }).first();
    const estadoSelect = estadoFormGroup.locator('select');
    await estadoSelect.selectOption('pendiente');
    
    // Find prioridad select
    const prioridadFormGroup = page.locator('.form-group').filter({ hasText: /^Prioridad$/ }).first();
    const prioridadSelect = prioridadFormGroup.locator('select');
    await prioridadSelect.selectOption('alta');
    
    // Verify filters are applied - check badge or count text
    await expect(page.locator('text=/Mostrando.*de.*tareas/i')).toBeVisible();
  });

  test('Excel export button exists', async ({ page }) => {
    // Find Excel export button
    const excelBtn = page.getByRole('button', { name: /Excel/i });
    await expect(excelBtn).toBeVisible();
  });

  test('Create new tarea form opens', async ({ page }) => {
    // Click "Nueva Tarea" button
    const newBtn = page.getByRole('button', { name: /Nueva Tarea/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    
    // Verify form appears with heading
    await expect(page.locator('.card-title').filter({ hasText: /Nueva Tarea/i })).toBeVisible();
    
    // Verify form fields
    await expect(page.locator('.form-label').filter({ hasText: /^Nombre/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Tipo$/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Prioridad$/i })).toBeVisible();
    await expect(page.locator('.form-label').filter({ hasText: /^Estado$/i })).toBeVisible();
    
    // Verify subtasks section
    await expect(page.getByText(/Subtareas|Checklist/i)).toBeVisible();
    
    // Cancel form
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click();
  });
});
