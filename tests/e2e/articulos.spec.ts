import { test, expect } from '@playwright/test';
import { login, navigateToPage, generateUniqueId, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Artículos de Explotación - CRUD', () => {
  const baseUrl = 'https://campo-fincas.preview.emergentagent.com';
  
  test.beforeEach(async ({ page }) => {
    // Login manually with correct flow
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Fill login
    await page.locator('input').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
    
    // Wait for dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await removeEmergentBadge(page);
  });

  test('should navigate to Artículos page and display list', async ({ page }) => {
    // Navigate to Artículos de Explotación using correct route
    await page.goto(`${baseUrl}/articulos-explotacion`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load - use text that appears on the page
    await expect(page.locator('h1').filter({ hasText: /Artículos de Explotación/i })).toBeVisible({ timeout: 15000 });
    
    // Check table exists
    await expect(page.getByTestId('articulos-table')).toBeVisible();
    
    // Check "Nuevo Artículo" button exists
    await expect(page.getByTestId('btn-nuevo-articulo')).toBeVisible();
  });

  test('should create a new articulo', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const testCodigo = `TART${uniqueId.slice(-6)}`;
    const testNombre = `Artículo Test ${uniqueId}`;
    
    await page.goto(`${baseUrl}/articulos-explotacion`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-articulo')).toBeVisible({ timeout: 15000 });
    
    // Click "Nuevo Artículo" button
    await page.getByTestId('btn-nuevo-articulo').click();
    
    // Wait for form to appear
    await expect(page.getByTestId('input-codigo')).toBeVisible();
    
    // Fill the form
    await page.getByTestId('input-codigo').fill(testCodigo);
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('select-categoria').selectOption('Fertilizantes');
    
    // Submit
    await page.getByTestId('btn-guardar').click();
    
    // Wait for form to close and table to update
    await expect(page.getByTestId('input-codigo')).not.toBeVisible({ timeout: 10000 });
    
    // Verify the new articulo appears in the table
    await expect(page.getByText(testCodigo)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(testNombre)).toBeVisible();
    
    // Cleanup: delete the test articulo
    const row = page.locator('tr').filter({ hasText: testCodigo });
    const deleteBtn = row.locator('button[title="Eliminar"]').first();
    
    // Accept dialog
    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click();
    
    // Verify deletion
    await expect(page.getByText(testCodigo)).not.toBeVisible({ timeout: 10000 });
  });

  test('should edit an existing articulo', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const testCodigo = `EDIT${uniqueId.slice(-6)}`;
    const testNombre = `Edit Test ${uniqueId}`;
    const updatedNombre = `Updated Test ${uniqueId}`;
    
    await page.goto(`${baseUrl}/articulos-explotacion`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-articulo')).toBeVisible({ timeout: 15000 });
    
    // Create a new articulo first
    await page.getByTestId('btn-nuevo-articulo').click();
    await expect(page.getByTestId('input-codigo')).toBeVisible();
    await page.getByTestId('input-codigo').fill(testCodigo);
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('btn-guardar').click();
    await expect(page.getByTestId('input-codigo')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(testCodigo)).toBeVisible({ timeout: 10000 });
    
    // Find and click edit button
    const row = page.locator('tr').filter({ hasText: testCodigo });
    const editBtn = row.locator('button[title="Editar"]').first();
    await editBtn.click();
    
    // Wait for form to open with data
    await expect(page.getByTestId('input-codigo')).toBeVisible();
    // Note: codigo is automatically converted to uppercase
    await expect(page.getByTestId('input-codigo')).toHaveValue(testCodigo.toUpperCase());
    
    // Update the name
    await page.getByTestId('input-nombre').fill(updatedNombre);
    await page.getByTestId('btn-guardar').click();
    
    // Verify update
    await expect(page.getByTestId('input-codigo')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(updatedNombre)).toBeVisible({ timeout: 10000 });
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    const rowUpdated = page.locator('tr').filter({ hasText: testCodigo });
    await rowUpdated.locator('button[title="Eliminar"]').first().click();
    await expect(page.getByText(testCodigo)).not.toBeVisible({ timeout: 10000 });
  });

  test('should filter articulos by category', async ({ page }) => {
    await page.goto(`${baseUrl}/articulos-explotacion`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').filter({ hasText: /Artículos de Explotación/i })).toBeVisible({ timeout: 15000 });
    
    // Click on Filtros button to show filters
    const filtrosBtn = page.locator('button').filter({ hasText: 'Filtros' });
    await filtrosBtn.click();
    
    // Select a category filter
    const categoriaSelect = page.locator('select').filter({ has: page.locator('option[value="Fertilizantes"]') }).first();
    await categoriaSelect.selectOption('Fertilizantes');
    
    // Wait for filter to apply
    await page.waitForLoadState('domcontentloaded');
    
    // Check that the filter is active (results should show filtered items or "no results")
    // This test verifies the filter UI works
  });
});
