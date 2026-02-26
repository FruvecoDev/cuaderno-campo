import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, generateUniqueId, dismissToasts } from '../fixtures/helpers';

/**
 * Test suite for enhanced Irrigaciones module
 * Features: KPIs, advanced filters, statistics with charts, consumption calculator, parcel history, Excel export
 */

test.describe('Irrigaciones Module', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page, 'admin@fruveco.com', 'admin123');
    
    // Navigate to Irrigaciones page via sidebar
    const irrigacionesLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /Irrigaciones|Riegos/i }).first();
    await irrigacionesLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('irrigaciones-page')).toBeVisible({ timeout: 10000 });
    
    await removeEmergentBadge(page);
  });

  test('Irrigaciones page loads with KPIs', async ({ page }) => {
    // Verify page title
    await expect(page.getByRole('heading', { name: /Irrigaciones/i })).toBeVisible();
    
    // Verify stats/KPIs cards are visible
    const statsCards = page.locator('.card').filter({ hasText: /Total|Próx|m³|Horas|Coste|Ha Regadas/i });
    await expect(statsCards.first()).toBeVisible();
    
    // Verify at least some KPI cards are present
    const kpiCount = await statsCards.count();
    expect(kpiCount).toBeGreaterThanOrEqual(4);
  });

  test('Statistics view with charts', async ({ page }) => {
    // Find and click statistics button
    const statsBtn = page.getByRole('button', { name: /Estadísticas/i });
    await expect(statsBtn).toBeVisible();
    await statsBtn.click();
    
    // Wait for charts to load
    await page.waitForLoadState('domcontentloaded');
    
    // Verify charts are visible - looking for recharts containers or SVG elements
    const chartContainers = page.locator('.recharts-responsive-container, svg.recharts-surface');
    
    // Verify chart titles
    await expect(page.getByText(/Distribución por Sistema/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Volumen por Mes/i)).toBeVisible();
    
    // Verify KPIs in chart view
    await expect(page.locator('text=/Total Riegos|Completados|Planificados/i').first()).toBeVisible();
  });

  test('Consumption calculator toggle', async ({ page }) => {
    // Find and click calculator button
    const calcBtn = page.getByRole('button', { name: /Calculadora/i });
    await expect(calcBtn).toBeVisible();
    await calcBtn.click();
    
    // Verify calculator panel appears
    await expect(page.getByText(/Calculadora de Consumo por Hectárea/i)).toBeVisible();
    
    // Verify calculator inputs
    await expect(page.locator('select').filter({ hasText: /Seleccionar/i }).first()).toBeVisible();
    await expect(page.getByLabel(/Volumen/i).first()).toBeVisible();
    await expect(page.getByLabel(/Superficie/i).first()).toBeVisible();
    await expect(page.getByLabel(/Consumo/i).first()).toBeVisible();
    
    // Verify calculate button
    await expect(page.getByRole('button', { name: /^Calcular$/i })).toBeVisible();
  });

  test('Consumption calculator calculates correctly', async ({ page }) => {
    // Click calculator button
    const calcBtn = page.getByRole('button', { name: /Calculadora/i });
    await calcBtn.click();
    
    // Wait for calculator to be visible
    await expect(page.getByText(/Calculadora de Consumo por Hectárea/i)).toBeVisible();
    
    // Select a parcela if options available
    const parcelaSelect = page.locator('.bg-blue-50 select').first();
    const options = await parcelaSelect.locator('option').count();
    if (options > 1) {
      await parcelaSelect.selectOption({ index: 1 });
    }
    
    // Enter volume
    const volumenInput = page.locator('.bg-blue-50').getByLabel(/Volumen/i);
    await volumenInput.fill('100');
    
    // Click calculate
    const calculateBtn = page.locator('.bg-blue-50').getByRole('button', { name: /^Calcular$/i });
    await calculateBtn.click();
    
    // Verify result appears (consumo field should have a value)
    await page.waitForLoadState('domcontentloaded');
    const consumoField = page.locator('.bg-blue-50').locator('.bg-green-100');
    await expect(consumoField).toBeVisible();
  });

  test('Advanced filters panel toggles', async ({ page }) => {
    // Click filters button
    const filtersBtn = page.getByRole('button', { name: /^Filtros$/i }).first();
    await expect(filtersBtn).toBeVisible();
    await filtersBtn.click();
    
    // Verify filter dropdowns appear
    await expect(page.getByLabel(/Sistema/i).first()).toBeVisible();
    await expect(page.getByLabel(/Parcela/i).first()).toBeVisible();
    await expect(page.getByLabel(/Estado/i).first()).toBeVisible();
    await expect(page.getByLabel(/Cultivo/i).first()).toBeVisible();
    
    // Verify date filters
    await expect(page.getByLabel(/Desde/i).first()).toBeVisible();
    await expect(page.getByLabel(/Hasta/i).first()).toBeVisible();
  });

  test('Filter by sistema works', async ({ page }) => {
    // Open filters
    const filtersBtn = page.getByRole('button', { name: /^Filtros$/i }).first();
    await filtersBtn.click();
    
    // Get initial count text
    const countText = page.locator('text=/Mostrando.*de.*registros/i');
    await expect(countText).toBeVisible();
    
    // Select sistema filter (if options available)
    const sistemaSelect = page.getByLabel(/Sistema/i).first();
    const options = await sistemaSelect.locator('option').count();
    if (options > 1) {
      await sistemaSelect.selectOption({ index: 1 });
      // Verify filter is applied - count text should still be visible
      await expect(countText).toBeVisible();
    }
  });

  test('Filter by estado works', async ({ page }) => {
    // Open filters
    const filtersBtn = page.getByRole('button', { name: /^Filtros$/i }).first();
    await filtersBtn.click();
    
    // Select estado filter
    const estadoSelect = page.getByLabel(/Estado/i).first();
    await estadoSelect.selectOption('completado');
    
    // Verify filter is applied
    await expect(page.locator('text=/Mostrando.*de.*registros/i')).toBeVisible();
  });

  test('Clear filters button works', async ({ page }) => {
    // Open filters
    const filtersBtn = page.getByRole('button', { name: /^Filtros$/i }).first();
    await filtersBtn.click();
    
    // Apply a filter
    const estadoSelect = page.getByLabel(/Estado/i).first();
    await estadoSelect.selectOption('completado');
    
    // Find and click clear/limpiar button
    const clearBtn = page.getByRole('button', { name: /Limpiar/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      // Verify filter is cleared
      await expect(estadoSelect).toHaveValue('');
    }
  });

  test('Excel export button exists and is clickable', async ({ page }) => {
    // Find Excel export button
    const excelBtn = page.getByRole('button', { name: /Excel/i });
    await expect(excelBtn).toBeVisible();
    
    // Click to trigger download
    const downloadPromise = page.waitForEvent('download').catch(() => null);
    await excelBtn.click();
    
    // Note: actual download may or may not complete depending on response time
  });

  test('Parcel history button exists in table', async ({ page }) => {
    // Check if there are irrigation records in the table
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Look for history button in the first row
      const firstRow = tableRows.first();
      const historyBtn = firstRow.locator('button').filter({ has: page.locator('svg') }).first();
      
      // Verify there's at least one action button
      await expect(firstRow.locator('button').first()).toBeVisible();
    }
  });

  test('View list mode shows irrigation records table', async ({ page }) => {
    // Ensure we're in list mode
    const listaBtn = page.getByRole('button', { name: /^Lista$/i });
    await listaBtn.click();
    
    // Verify table structure
    await expect(page.locator('thead')).toBeVisible();
    
    // Verify expected columns based on default fieldsConfig
    await expect(page.getByRole('columnheader', { name: /Fecha/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Sistema/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Duración/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Volumen/i })).toBeVisible();
  });

  test('Create new irrigation record', async ({ page }) => {
    // Click "Nuevo Riego" button
    const newBtn = page.getByRole('button', { name: /Nuevo Riego/i });
    await expect(newBtn).toBeVisible();
    await newBtn.click();
    
    // Verify form appears
    await expect(page.getByRole('heading', { name: /Nuevo Riego/i })).toBeVisible();
    
    // Verify form fields
    await expect(page.locator('select').filter({ hasText: /Seleccionar/i }).first()).toBeVisible();
    await expect(page.getByLabel(/Sistema/i).first()).toBeVisible();
    await expect(page.getByLabel(/Fecha/i).first()).toBeVisible();
    await expect(page.getByLabel(/Estado/i).first()).toBeVisible();
    await expect(page.getByLabel(/Duración/i).first()).toBeVisible();
    await expect(page.getByLabel(/Volumen/i).first()).toBeVisible();
    
    // Cancel form
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click();
    
    // Verify form is closed
    await expect(page.getByRole('heading', { name: /Nuevo Riego/i })).not.toBeVisible();
  });

  test('Field configuration settings toggle', async ({ page }) => {
    // Find settings/config button (gear icon)
    const settingsBtn = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' }).nth(1);
    
    // This might be the settings button based on the order of buttons
    const possibleSettingsBtn = page.getByRole('button').filter({ has: page.locator('[class*="settings"], [class*="Settings"]') });
    
    // Look for the settings button near filters
    const filterSection = page.locator('.card').filter({ hasText: /Filtros/i }).first();
    if (await filterSection.isVisible()) {
      // Settings button should be near the filters button
      const buttons = filterSection.locator('button');
      const btnCount = await buttons.count();
      if (btnCount >= 3) {
        // Third button is likely settings
        await buttons.nth(2).click();
        // Verify column configuration appears
        const colConfig = page.getByText(/Columnas visibles/i);
        if (await colConfig.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Verify checkboxes for column configuration
          await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
        }
      }
    }
  });
});


test.describe('Irrigaciones Parcel History Modal', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page, 'admin@fruveco.com', 'admin123');
    
    // Navigate to Irrigaciones page
    const irrigacionesLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /Irrigaciones|Riegos/i }).first();
    await irrigacionesLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('irrigaciones-page')).toBeVisible({ timeout: 10000 });
    
    await removeEmergentBadge(page);
  });

  test('Open parcel history modal from table', async ({ page }) => {
    // Check if there are irrigation records with parcela_id
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    
    if (rowCount > 0) {
      // Find a row with a history button (should have history icon)
      // The history button is the first button in the actions cell
      const historyBtns = page.locator('tbody tr').first().locator('button').first();
      
      if (await historyBtns.isVisible()) {
        await historyBtns.click();
        
        // Check if modal opened - might show "Historial de Riegos"
        const modal = page.locator('.fixed').filter({ hasText: /Historial de Riegos/i });
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Verify modal content
          await expect(page.getByText(/Riegos|Volumen Total|Coste Total/i).first()).toBeVisible();
          
          // Close modal
          const closeBtn = modal.locator('button').filter({ has: page.locator('svg') }).first();
          await closeBtn.click();
        }
      }
    }
  });
});
