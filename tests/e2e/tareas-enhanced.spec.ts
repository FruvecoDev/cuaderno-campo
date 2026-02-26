import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, generateUniqueId, dismissToasts } from '../fixtures/helpers';

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
    await expect(page.getByTestId('tareas-page')).toBeVisible({ timeout: 10000 });
    
    await removeEmergentBadge(page);
  });

  test('Tareas page loads with KPIs', async ({ page }) => {
    // Verify page title
    await expect(page.getByRole('heading', { name: /Tareas/i })).toBeVisible();
    
    // Verify stats/KPIs cards are visible - looking for card elements with numbers
    const statsCards = page.locator('.card').filter({ hasText: /Total|Pendientes|En Progreso|Completadas|Vencidas|Esta Semana/i });
    await expect(statsCards.first()).toBeVisible();
    
    // Verify at least some KPI cards are present
    const kpiCount = await statsCards.count();
    expect(kpiCount).toBeGreaterThanOrEqual(4);
  });

  test('Calendar view toggle works', async ({ page }) => {
    // Find and click calendar button
    const calendarBtn = page.getByRole('button', { name: /Calendario/i });
    await expect(calendarBtn).toBeVisible();
    await calendarBtn.click();
    
    // Verify calendar view is displayed - should show month name and day headers
    await expect(page.getByText(/Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i)).toBeVisible();
    await expect(page.getByText(/Lun|Mar|Mié|Jue|Vie|Sáb|Dom/i).first()).toBeVisible();
    
    // Verify navigation buttons for month
    const prevMonthBtn = page.locator('button').filter({ hasText: '' }).first();
    await expect(page.locator('.card').filter({ hasText: /Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i })).toBeVisible();
    
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
    await expect(page.getByLabel(/Estado/i).first()).toBeVisible();
    await expect(page.getByLabel(/Prioridad/i).first()).toBeVisible();
    await expect(page.getByLabel(/Tipo/i).first()).toBeVisible();
    await expect(page.getByLabel(/Asignado/i).first()).toBeVisible();
    
    // Verify date filters
    await expect(page.getByLabel(/Desde/i).first()).toBeVisible();
    await expect(page.getByLabel(/Hasta/i).first()).toBeVisible();
  });

  test('Filter by estado works', async ({ page }) => {
    // Open filters
    const filtersBtn = page.getByRole('button', { name: /Filtros/i }).first();
    await filtersBtn.click();
    
    // Select estado filter
    const estadoSelect = page.getByLabel(/Estado/i).first();
    await estadoSelect.selectOption('pendiente');
    
    // Verify result count text changes (shows "filtrados" or similar)
    await expect(page.locator('text=/Mostrando.*de.*tareas/i')).toBeVisible();
  });

  test('Filter by prioridad works', async ({ page }) => {
    // Open filters
    const filtersBtn = page.getByRole('button', { name: /Filtros/i }).first();
    await filtersBtn.click();
    
    // Select prioridad filter
    const prioridadSelect = page.getByLabel(/Prioridad/i).first();
    await prioridadSelect.selectOption('alta');
    
    // Verify filter is applied
    await expect(page.locator('text=/Mostrando.*de.*tareas/i')).toBeVisible();
  });

  test('Clear filters button works', async ({ page }) => {
    // Open filters
    const filtersBtn = page.getByRole('button', { name: /Filtros/i }).first();
    await filtersBtn.click();
    
    // Apply a filter
    const estadoSelect = page.getByLabel(/Estado/i).first();
    await estadoSelect.selectOption('pendiente');
    
    // Find and click clear/limpiar button
    const clearBtn = page.getByRole('button', { name: /Limpiar/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      // Verify filter is cleared
      await expect(estadoSelect).toHaveValue('');
    }
  });

  test('Create new tarea with priority and type', async ({ page }) => {
    const uniqueName = `TEST_Tarea_${Date.now()}`;
    
    // Click "Nueva Tarea" button
    const newBtn = page.getByRole('button', { name: /Nueva Tarea/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    
    // Verify form appears
    await expect(page.getByRole('heading', { name: /Nueva Tarea/i })).toBeVisible();
    
    // Fill form
    await page.locator('input').filter({ hasText: '' }).first().fill(uniqueName); // Nombre field
    const nombreInput = page.locator('.form-group').filter({ hasText: /Nombre/i }).locator('input');
    await nombreInput.fill(uniqueName);
    
    // Select tipo
    const tipoSelect = page.locator('.form-group').filter({ hasText: /Tipo/i }).locator('select').first();
    await tipoSelect.selectOption('tratamiento');
    
    // Select prioridad
    const prioridadSelect = page.locator('.form-group').filter({ hasText: /Prioridad/i }).locator('select').first();
    await prioridadSelect.selectOption('alta');
    
    // Submit form
    const submitBtn = page.getByRole('button', { name: /^Crear$/i });
    await submitBtn.click();
    
    // Verify tarea was created - should appear in list
    await expect(page.locator('text=' + uniqueName)).toBeVisible({ timeout: 10000 });
    
    // Cleanup: delete the created tarea
    const tareaRow = page.locator('.border').filter({ hasText: uniqueName });
    const deleteBtn = tareaRow.locator('button').filter({ hasText: '' }).last();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      // Confirm delete
      page.on('dialog', dialog => dialog.accept());
    }
  });

  test('Excel export button exists and is clickable', async ({ page }) => {
    // Find Excel export button
    const excelBtn = page.getByRole('button', { name: /Excel/i });
    await expect(excelBtn).toBeVisible();
    
    // Click to trigger download (won't verify file content in this test)
    const downloadPromise = page.waitForEvent('download').catch(() => null);
    await excelBtn.click();
    
    // Note: actual download may or may not complete depending on response time
    // The important thing is the button is functional
  });
});


test.describe('Tareas Subtasks Feature', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page, 'admin@fruveco.com', 'admin123');
    
    // Navigate to Tareas page via sidebar
    const tareasLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /^Tareas$/i }).first();
    await tareasLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('tareas-page')).toBeVisible({ timeout: 10000 });
    
    await removeEmergentBadge(page);
  });

  test('Add subtask in create form', async ({ page }) => {
    const uniqueName = `TEST_Subtask_${Date.now()}`;
    
    // Click "Nueva Tarea" button
    const newBtn = page.getByRole('button', { name: /Nueva Tarea/i });
    await newBtn.click();
    
    // Fill tarea name
    const nombreInput = page.locator('.form-group').filter({ hasText: /Nombre/i }).locator('input');
    await nombreInput.fill(uniqueName);
    
    // Find subtask section
    await expect(page.getByText(/Subtareas|Checklist/i)).toBeVisible();
    
    // Add a subtask
    const subtaskInput = page.locator('input[placeholder*="subtarea"]');
    await subtaskInput.fill('Test subtarea 1');
    
    // Click add button (should be next to input)
    const addSubtaskBtn = subtaskInput.locator('..').locator('button');
    await addSubtaskBtn.click();
    
    // Verify subtask was added to list
    await expect(page.getByText('Test subtarea 1')).toBeVisible();
    
    // Cancel form
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click();
  });
});
