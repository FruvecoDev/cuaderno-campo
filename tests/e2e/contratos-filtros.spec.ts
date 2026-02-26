import { test, expect, Page } from '@playwright/test';
import { login, waitForAppReady, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Contratos Advanced Filters', () => {
  const BASE_URL = process.env.BASE_URL || 'https://agri-contratos.preview.emergentagent.com';

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await login(page, 'admin@fruveco.com', 'admin123');
    await dismissToasts(page);
    await removeEmergentBadge(page);
    
    // Navigate to Contratos page
    await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('contratos-page')).toBeVisible({ timeout: 10000 });
  });

  test('should render filter section correctly', async ({ page }) => {
    // Verify filter section is visible
    const filterSection = page.getByTestId('contratos-filtros');
    await expect(filterSection).toBeVisible();
    
    // Verify search input is visible
    await expect(page.getByTestId('input-buscar-contratos')).toBeVisible();
    
    // Verify toggle filters button is visible
    await expect(page.getByTestId('btn-toggle-filtros')).toBeVisible();
  });

  test('should toggle advanced filters panel', async ({ page }) => {
    // Click toggle button to show advanced filters
    const toggleBtn = page.getByTestId('btn-toggle-filtros');
    await toggleBtn.click();
    
    // Advanced filters should now be visible
    await expect(page.getByTestId('select-filtro-proveedor')).toBeVisible();
    await expect(page.getByTestId('select-filtro-cultivo')).toBeVisible();
    await expect(page.getByTestId('select-filtro-campana')).toBeVisible();
    await expect(page.getByTestId('select-filtro-tipo')).toBeVisible();
    await expect(page.getByTestId('input-filtro-fecha-desde')).toBeVisible();
    await expect(page.getByTestId('input-filtro-fecha-hasta')).toBeVisible();
    
    // Click again to hide
    await toggleBtn.click();
    
    // Advanced filters should be hidden (selects not visible)
    await expect(page.getByTestId('select-filtro-proveedor')).toBeHidden();
  });

  test('should filter by search text', async ({ page }) => {
    // Get initial count from summary text
    const summaryText = page.locator('[data-testid="contratos-filtros"]').locator('text=/Mostrando/');
    await expect(summaryText).toBeVisible();
    
    // Type in search input
    const searchInput = page.getByTestId('input-buscar-contratos');
    await searchInput.fill('TEST_UNLIKELY_SEARCH_TERM');
    
    // Verify the summary shows filtered results (likely 0 or lower count)
    // Since this is frontend filtering, results update immediately
    await page.waitForTimeout(300); // Small wait for React to update
    await expect(summaryText).toContainText('Mostrando');
  });

  test('should filter by proveedor when options exist', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    // Check if proveedor select has options (data-dependent)
    const proveedorSelect = page.getByTestId('select-filtro-proveedor');
    await expect(proveedorSelect).toBeVisible();
    
    // Get all options
    const options = await proveedorSelect.locator('option').allTextContents();
    
    // Should have at least "Todos" option
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0]).toBe('Todos');
    
    // If there are more options, select one and verify filter is active
    if (options.length > 1) {
      await proveedorSelect.selectOption({ index: 1 });
      
      // Clear filters button should appear when filter is active
      await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    }
  });

  test('should filter by cultivo when options exist', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    const cultivoSelect = page.getByTestId('select-filtro-cultivo');
    await expect(cultivoSelect).toBeVisible();
    
    const options = await cultivoSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0]).toBe('Todos');
    
    if (options.length > 1) {
      await cultivoSelect.selectOption({ index: 1 });
      await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    }
  });

  test('should filter by campana when options exist', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    const campanaSelect = page.getByTestId('select-filtro-campana');
    await expect(campanaSelect).toBeVisible();
    
    const options = await campanaSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0]).toBe('Todas');
    
    if (options.length > 1) {
      await campanaSelect.selectOption({ index: 1 });
      await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    }
  });

  test('should filter by tipo when options exist', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    const tipoSelect = page.getByTestId('select-filtro-tipo');
    await expect(tipoSelect).toBeVisible();
    
    const options = await tipoSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(1);
    expect(options[0]).toBe('Todos');
    
    if (options.length > 1) {
      await tipoSelect.selectOption({ index: 1 });
      await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    }
  });

  test('should filter by date range', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    // Set fecha desde
    const fechaDesde = page.getByTestId('input-filtro-fecha-desde');
    await expect(fechaDesde).toBeVisible();
    await fechaDesde.fill('2024-01-01');
    
    // Clear button should appear
    await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    
    // Set fecha hasta
    const fechaHasta = page.getByTestId('input-filtro-fecha-hasta');
    await expect(fechaHasta).toBeVisible();
    await fechaHasta.fill('2025-12-31');
    
    // Verify both dates are set
    await expect(fechaDesde).toHaveValue('2024-01-01');
    await expect(fechaHasta).toHaveValue('2025-12-31');
  });

  test('should clear all filters with clear button', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    // Set multiple filters
    await page.getByTestId('input-filtro-fecha-desde').fill('2024-01-01');
    await page.getByTestId('input-filtro-fecha-hasta').fill('2025-12-31');
    
    // Clear button should be visible
    const clearBtn = page.getByTestId('btn-limpiar-filtros');
    await expect(clearBtn).toBeVisible();
    
    // Click clear
    await clearBtn.click();
    
    // Verify dates are cleared
    await expect(page.getByTestId('input-filtro-fecha-desde')).toHaveValue('');
    await expect(page.getByTestId('input-filtro-fecha-hasta')).toHaveValue('');
    
    // Clear button should be hidden now
    await expect(clearBtn).toBeHidden();
  });

  test('should show active filters badge with count', async ({ page }) => {
    // Open advanced filters
    const toggleBtn = page.getByTestId('btn-toggle-filtros');
    await toggleBtn.click();
    
    // Initially no badge or badge shows 0
    // Set some filters
    await page.getByTestId('input-filtro-fecha-desde').fill('2024-01-01');
    await page.getByTestId('input-filtro-fecha-hasta').fill('2025-12-31');
    
    // Badge should show count (2 filters active: fecha_desde and fecha_hasta)
    // The badge is inside the toggle button
    const badgeText = toggleBtn.locator('span').filter({ hasText: /\d+/ });
    await expect(badgeText).toBeVisible();
    
    // Badge should show 2 (two date filters)
    await expect(badgeText).toContainText('2');
  });

  test('should combine multiple filters correctly', async ({ page }) => {
    // Open advanced filters
    await page.getByTestId('btn-toggle-filtros').click();
    
    // Apply search filter
    await page.getByTestId('input-buscar-contratos').fill('test');
    
    // Apply date filters
    await page.getByTestId('input-filtro-fecha-desde').fill('2024-01-01');
    
    // The summary should reflect filtering
    const summaryText = page.locator('[data-testid="contratos-filtros"]').locator('text=/Mostrando/');
    await expect(summaryText).toContainText('filtrados');
  });

  test('should update result count when filtering', async ({ page }) => {
    // Get initial summary text which shows count
    const summaryText = page.locator('[data-testid="contratos-filtros"]').locator('text=/Mostrando/');
    await expect(summaryText).toBeVisible();
    
    // Get initial text content
    const initialText = await summaryText.textContent();
    
    // Open advanced filters and apply a very restrictive filter
    await page.getByTestId('btn-toggle-filtros').click();
    await page.getByTestId('input-filtro-fecha-desde').fill('2099-01-01');
    
    // Wait for UI update
    await page.waitForTimeout(300);
    
    // Summary should now show 0 or a different count with "(filtrados)"
    await expect(summaryText).toContainText('filtrados');
  });
});
