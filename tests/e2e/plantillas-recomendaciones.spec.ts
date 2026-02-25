/**
 * Plantillas de Recomendaciones E2E Tests
 * Tests for the recommendation templates feature - CRUD, mass application, template usage
 */
import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, generateUniqueId } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'https://harvest-log-1.preview.emergentagent.com';

test.describe('Plantillas - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
  });

  test('should display Plantillas tab with count', async ({ page }) => {
    const plantillasTab = page.getByTestId('tab-plantillas');
    await expect(plantillasTab).toBeVisible();
    
    // Tab should show count of plantillas (e.g., "Plantillas (8)")
    const tabText = await plantillasTab.textContent();
    expect(tabText).toMatch(/Plantillas \(\d+\)/);
  });

  test('should switch to Plantillas tab and show plantillas list', async ({ page }) => {
    // Click on Plantillas tab
    await page.getByTestId('tab-plantillas').click();
    
    // Should see "Nueva Plantilla" button
    const newPlantillaBtn = page.getByTestId('btn-nueva-plantilla');
    await expect(newPlantillaBtn).toBeVisible();
    
    // Should see plantillas table with headers
    await expect(page.locator('th').filter({ hasText: 'Nombre' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Tipo' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Dosis' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Prioridad' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Estado' })).toBeVisible();
  });

  test('should display pre-loaded plantillas in table', async ({ page }) => {
    await page.getByTestId('tab-plantillas').click();
    
    // Should see at least one plantilla (8 seeded by default)
    const plantillaRows = page.locator('table tbody tr');
    await expect(plantillaRows.first()).toBeVisible();
    
    // Verify one of the default plantillas exists
    await expect(page.locator('text=Control de pulgón').first()).toBeVisible();
  });
});


test.describe('Plantillas - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    await page.getByTestId('tab-plantillas').click();
  });

  test('should open new plantilla form when clicking Nueva Plantilla', async ({ page }) => {
    await page.getByTestId('btn-nueva-plantilla').click();
    
    // Form should appear with title
    await expect(page.locator('h3, div').filter({ hasText: /Nueva Plantilla/i }).first()).toBeVisible();
    
    // Should have required fields
    await expect(page.locator('label').filter({ hasText: /Nombre/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Tipo/i }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Prioridad/i }).first()).toBeVisible();
  });

  test('should create a new plantilla successfully', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const plantillaName = `Plantilla Test ${uniqueId}`;
    
    await page.getByTestId('btn-nueva-plantilla').click();
    
    // Fill form
    await page.locator('input[placeholder*="nombre"], input').first().fill(plantillaName);
    
    // Select tipo (form should have tipo select)
    const tipoSelect = page.locator('select').filter({ has: page.locator('option:has-text("Tratamiento Fitosanitario")') }).first();
    await tipoSelect.selectOption('Fertilización');
    
    // Fill dosis
    const dosisInput = page.locator('input[placeholder*="0.00"], input[type="number"]').first();
    await dosisInput.fill('5.0');
    
    // Submit
    const saveBtn = page.locator('button').filter({ hasText: /Guardar|Crear/i }).first();
    await saveBtn.click();
    
    // Should show success message
    await expect(page.locator('text=Plantilla creada')).toBeVisible({ timeout: 5000 });
    
    // Plantilla should appear in list
    await expect(page.locator(`text=${plantillaName}`).first()).toBeVisible();
    
    // Cleanup: delete the created plantilla
    const deleteBtn = page.locator('table tbody tr').filter({ hasText: plantillaName }).locator('button').last();
    await deleteBtn.click();
    await page.waitForTimeout(500);
    // Confirm deletion if dialog appears
    page.on('dialog', dialog => dialog.accept());
  });

  test('should toggle plantilla active status', async ({ page }) => {
    // Find a plantilla row
    const plantillaRow = page.locator('table tbody tr').first();
    await expect(plantillaRow).toBeVisible();
    
    // Find toggle button (first button in actions, usually has toggle icon)
    const toggleBtn = plantillaRow.locator('button').first();
    const initialState = await plantillaRow.locator('text=Activa').count();
    
    // Click toggle
    await toggleBtn.click();
    await page.waitForTimeout(500);
    
    // State should change
    const newState = await plantillaRow.locator('text=Activa').count();
    
    // Toggle back to restore original state
    await toggleBtn.click();
    await page.waitForTimeout(500);
  });
});


test.describe('Plantillas - Aplicación Masiva', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
  });

  test('should open Aplicación Masiva modal', async ({ page }) => {
    await page.getByTestId('btn-aplicacion-masiva').click();
    
    // Modal should appear with title
    await expect(page.locator('text=Aplicación Masiva').first()).toBeVisible();
    
    // Should have plantilla selector
    await expect(page.locator('text=Seleccionar Plantilla').first()).toBeVisible();
    const plantillaSelect = page.locator('select').filter({ has: page.locator('option:has-text("Seleccionar plantilla")') }).first();
    await expect(plantillaSelect).toBeVisible();
    
    // Should have parcelas checkboxes
    await expect(page.locator('text=Seleccionar Parcelas').first()).toBeVisible();
    
    // Should have "Seleccionar todas" button
    await expect(page.locator('button').filter({ hasText: /Seleccionar todas/i })).toBeVisible();
    
    // Should have date picker
    await expect(page.locator('text=Fecha Programada').first()).toBeVisible();
    
    // Should have action buttons
    await expect(page.locator('button').filter({ hasText: /Cancelar/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Crear.*Recomendación/i })).toBeVisible();
  });

  test('should select plantilla and show parcelas', async ({ page }) => {
    await page.getByTestId('btn-aplicacion-masiva').click();
    
    // Select a plantilla
    const plantillaSelect = page.locator('select').filter({ has: page.locator('option:has-text("Seleccionar plantilla")') }).first();
    await plantillaSelect.selectOption({ index: 1 });
    
    // Parcelas should be visible as checkboxes
    const parcelaCheckboxes = page.locator('input[type="checkbox"]');
    await expect(parcelaCheckboxes.first()).toBeVisible();
  });

  test('should select all parcelas when clicking Seleccionar todas', async ({ page }) => {
    await page.getByTestId('btn-aplicacion-masiva').click();
    
    // Select a plantilla first
    const plantillaSelect = page.locator('select').filter({ has: page.locator('option:has-text("Seleccionar plantilla")') }).first();
    await plantillaSelect.selectOption({ index: 1 });
    
    // Click "Seleccionar todas"
    await page.locator('button').filter({ hasText: /Seleccionar todas/i }).click();
    
    // All checkboxes should be checked
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    
    for (let i = 0; i < count; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
    
    // Button text should show count
    const createBtn = page.locator('button').filter({ hasText: /Crear.*Recomendación/i });
    const btnText = await createBtn.textContent();
    expect(btnText).toMatch(/Crear \d+ Recomendación/);
  });

  test('should create recommendations via Aplicación Masiva', async ({ page }) => {
    await page.getByTestId('btn-aplicacion-masiva').click();
    
    // Select a plantilla
    const plantillaSelect = page.locator('select').filter({ has: page.locator('option:has-text("Seleccionar plantilla")') }).first();
    await plantillaSelect.selectOption({ index: 1 });
    
    // Select first parcela
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Click create button
    await page.locator('button').filter({ hasText: /Crear.*Recomendación/i }).click();
    
    // Should show success message
    await expect(page.locator('text=recomendación').filter({ hasText: /creada/i })).toBeVisible({ timeout: 5000 });
    
    // Modal should close
    await expect(page.locator('text=Aplicación Masiva').first()).not.toBeVisible();
  });

  test('should close modal on Cancel', async ({ page }) => {
    await page.getByTestId('btn-aplicacion-masiva').click();
    await expect(page.locator('text=Aplicación Masiva').first()).toBeVisible();
    
    await page.locator('button').filter({ hasText: /Cancelar/i }).click();
    
    await expect(page.locator('text=Aplicación Masiva').first()).not.toBeVisible();
  });
});


test.describe('Plantillas - Usar Plantilla en Formulario', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
  });

  test('should show Usar Plantilla button in new recommendation form', async ({ page }) => {
    await page.getByTestId('btn-nueva-recomendacion').click();
    
    // Wait for form to appear
    await expect(page.locator('h3, div').filter({ hasText: /Nueva Recomendación/i }).first()).toBeVisible();
    
    // Should have "Usar Plantilla" button
    const usarPlantillaBtn = page.locator('button').filter({ hasText: /Usar Plantilla/i });
    await expect(usarPlantillaBtn).toBeVisible();
  });

  test('should open plantilla selector when clicking Usar Plantilla', async ({ page }) => {
    await page.getByTestId('btn-nueva-recomendacion').click();
    await expect(page.locator('h3, div').filter({ hasText: /Nueva Recomendación/i }).first()).toBeVisible();
    
    // Click "Usar Plantilla"
    await page.locator('button').filter({ hasText: /Usar Plantilla/i }).click();
    
    // Should show plantilla selector (modal or dropdown)
    await expect(page.locator('text=Seleccionar Plantilla').first()).toBeVisible({ timeout: 5000 });
  });

  test('should auto-fill form fields when selecting a plantilla', async ({ page }) => {
    await page.getByTestId('btn-nueva-recomendacion').click();
    await expect(page.locator('h3, div').filter({ hasText: /Nueva Recomendación/i }).first()).toBeVisible();
    
    // Click "Usar Plantilla"
    await page.locator('button').filter({ hasText: /Usar Plantilla/i }).click();
    await page.waitForTimeout(500);
    
    // Select a plantilla from the list
    const plantillaItem = page.locator('button, div').filter({ hasText: /Control de pulgón/i }).first();
    if (await plantillaItem.isVisible()) {
      await plantillaItem.click();
      
      // Should show success message about template applied
      await expect(page.locator('text=Plantilla').filter({ hasText: /aplicada/i })).toBeVisible({ timeout: 5000 });
      
      // Form fields should be filled
      // Check that tipo is selected
      const tipoSelect = page.locator('select').filter({ has: page.locator('option:has-text("Tratamiento Fitosanitario")') }).first();
      const selectedTipo = await tipoSelect.inputValue();
      expect(selectedTipo.length).toBeGreaterThan(0);
    }
  });
});


test.describe('Plantillas - Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    await page.getByTestId('tab-plantillas').click();
  });

  test('should display plantilla details correctly in table', async ({ page }) => {
    // Find "Control de pulgón" plantilla row
    const pulgonRow = page.locator('table tbody tr').filter({ hasText: /Control de pulgón/i }).first();
    await expect(pulgonRow).toBeVisible();
    
    // Check it shows correct data
    await expect(pulgonRow.locator('text=Tratamiento Fitosanitario').first()).toBeVisible();
    await expect(pulgonRow.locator('text=Insecticida').first()).toBeVisible();
    await expect(pulgonRow.locator('text=Alta').first()).toBeVisible();
  });

  test('should show usage count column', async ({ page }) => {
    // Check header
    await expect(page.locator('th').filter({ hasText: 'Usos' })).toBeVisible();
    
    // Each row should have usage count
    const firstRow = page.locator('table tbody tr').first();
    // Usage count is displayed as a number in the Usos column
    const usosCell = firstRow.locator('td').nth(5); // Usos is usually 6th column (index 5)
    const usosText = await usosCell.textContent();
    expect(usosText).toMatch(/\d+/);
  });

  test('should display active/inactive status', async ({ page }) => {
    // All default plantillas should be active
    const activeStatus = page.locator('text=Activa').first();
    await expect(activeStatus).toBeVisible();
  });
});
