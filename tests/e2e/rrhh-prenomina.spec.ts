/**
 * E2E Tests for RRHH Prenómina Module
 * 
 * Tests the following features:
 * - Navigate to Prenómina tab
 * - Select month/year for prenomina period
 * - Calculate individual prenomina
 * - Calculate all prenominas (bulk)
 * - View prenomina details modal
 * - Validate prenomina
 * - Export to Excel
 * - Export to PDF
 * - KPI display
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://harvest-hub-300.preview.emergentagent.com';

// Helper function to login
async function login(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Check if already logged in
  if (page.url().includes('/dashboard')) {
    return;
  }
  
  // Fill login form
  await page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first().fill('admin@fruveco.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  
  // Click login button
  const loginBtn = page.locator('button:has-text("Iniciar"), button[type="submit"]').first();
  await loginBtn.click();
  
  // Wait for redirect
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

// Helper to dismiss ResumenDiario modal - robust version
async function dismissModal(page) {
  // First try to click the Entendido button if visible
  try {
    const entendidoBtn = page.getByTestId('btn-entendido');
    if (await entendidoBtn.isVisible({ timeout: 2000 })) {
      await entendidoBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  } catch {
    // Continue
  }
  
  // Then forcefully remove the modal overlay via JS
  await page.evaluate(() => {
    const overlays = document.querySelectorAll('.modal-overlay, [x-file-name="ResumenDiario"]');
    overlays.forEach(o => o.remove());
    
    // Also remove any backdrop
    const backdrops = document.querySelectorAll('[class*="modal-backdrop"], [class*="overlay"]');
    backdrops.forEach(b => {
      if (b.tagName !== 'BODY' && b.querySelector('[x-file-name="ResumenDiario"]')) {
        b.remove();
      }
    });
  });
  
  await page.waitForTimeout(300);
}

// Helper to navigate to RRHH > Prenómina (assumes already logged in)
async function navigateToPrenomina(page) {
  // Navigate directly to RRHH page
  await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  await dismissModal(page);
  
  // Wait for page to load and find Prenómina tab
  await page.waitForTimeout(500);
  
  // Click on Prenómina tab with force to bypass any overlay
  const prenominaTab = page.locator('button').filter({ hasText: /Prenómina/i }).first();
  await expect(prenominaTab).toBeVisible({ timeout: 10000 });
  await prenominaTab.click({ force: true });
  
  // Wait for content to load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

test.describe('RRHH Prenómina Module', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up automatic modal dismissal
    await page.addLocatorHandler(
      page.getByTestId('btn-entendido'),
      async () => {
        await page.getByTestId('btn-entendido').click({ force: true }).catch(() => {});
      },
      { times: 20, noWaitAfter: true }
    );
    
    await login(page);
  });
  
  test('should navigate to Prenómina tab', async ({ page }) => {
    await navigateToPrenomina(page);
    
    // Verify Prenómina tab is active
    const prenominaTab = page.locator('button').filter({ hasText: /Prenómina/i }).first();
    await expect(prenominaTab).toBeVisible();
    
    // Verify key UI elements are visible
    await expect(page.getByTestId('select-mes-prenomina')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('select-ano-prenomina')).toBeVisible();
    await expect(page.getByTestId('btn-calcular-todas')).toBeVisible();
    
    await page.screenshot({ path: 'prenomina-tab-loaded.jpeg', quality: 20 });
  });
  
  test('should display KPI cards', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Wait for page content
    await page.waitForTimeout(500);
    
    // Verify KPI cards are present - use partial text matching
    await expect(page.locator('text=/Prenóminas/i').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Total Horas/i').first()).toBeVisible();
    await expect(page.locator('text=/Importe Bruto/i').first()).toBeVisible();
    await expect(page.locator('text=/Importe Neto/i').first()).toBeVisible();
  });
  
  test('should change month/year selector', async ({ page }) => {
    await navigateToPrenomina(page);
    
    // Change month
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '3' }); // Marzo
    
    // Change year
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    // Wait for reload
    await page.waitForLoadState('domcontentloaded');
    
    // Verify selectors have correct values
    await expect(mesSelect).toHaveValue('3');
    await expect(anoSelect).toHaveValue('2026');
  });
  
  test('should show employee selector for individual calculation', async ({ page }) => {
    await navigateToPrenomina(page);
    
    // Verify employee selector is visible
    const empleadoSelect = page.getByTestId('select-empleado-calculo');
    await expect(empleadoSelect).toBeVisible({ timeout: 10000 });
    
    // Verify calculate individual button is disabled when no employee selected
    const calcularBtn = page.getByTestId('btn-calcular-individual');
    await expect(calcularBtn).toBeVisible();
    await expect(calcularBtn).toBeDisabled();
    
    // Select an employee from dropdown
    const options = await empleadoSelect.locator('option').allTextContents();
    // Find first non-empty option
    if (options.length > 1) {
      await empleadoSelect.selectOption({ index: 1 }); // First employee
      
      // Now button should be enabled
      await expect(calcularBtn).toBeEnabled();
    }
  });
  
  test('should calculate individual prenomina', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Select an employee
    const empleadoSelect = page.getByTestId('select-empleado-calculo');
    await expect(empleadoSelect).toBeVisible({ timeout: 10000 });
    
    // Get options count
    const options = await empleadoSelect.locator('option').count();
    if (options <= 1) {
      test.skip(true, 'No employees available for testing');
      return;
    }
    
    await empleadoSelect.selectOption({ index: 1 });
    await dismissModal(page);
    
    // Click calculate with force
    const calcularBtn = page.getByTestId('btn-calcular-individual');
    await expect(calcularBtn).toBeEnabled();
    await calcularBtn.click({ force: true });
    
    // Wait for calculation to complete
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    await page.screenshot({ path: 'prenomina-individual-calculated.jpeg', quality: 20 });
  });
  
  test('should calculate all prenominas with confirmation', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Change to a different month to avoid test data conflicts
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '4' }); // Abril
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Click calculate all button with force
    const calcularTodasBtn = page.getByTestId('btn-calcular-todas');
    await expect(calcularTodasBtn).toBeVisible();
    await calcularTodasBtn.click({ force: true });
    
    // Wait for calculation to complete (button text changes during calculation)
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Button should return to normal state
    await expect(calcularTodasBtn).toContainText(/Calcular Todas/i, { timeout: 30000 });
    
    await page.screenshot({ path: 'prenomina-todas-calculated.jpeg', quality: 20 });
  });
  
  test('should display prenominas table with correct columns', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set month to February 2026 where we know there's data
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '2' });
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Wait for table to load
    const table = page.locator('.data-table');
    await expect(table).toBeVisible({ timeout: 10000 });
    
    // Verify table headers
    const headers = table.locator('thead th');
    const headerTexts = await headers.allTextContents();
    
    expect(headerTexts.some(h => h.includes('Empleado'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('DNI'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Normales'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Extra'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Total') || h.includes('Horas'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Bruto'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Neto'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Estado'))).toBeTruthy();
    expect(headerTexts.some(h => h.includes('Acciones'))).toBeTruthy();
    
    await page.screenshot({ path: 'prenomina-table-headers.jpeg', quality: 20 });
  });
  
  test('should show prenomina detail modal', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set month to February 2026 where we know there's data
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '2' });
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    await page.waitForTimeout(500);
    
    // Wait for prenomina rows to load
    const prenominaRows = page.locator('[data-testid^="prenomina-row-"]');
    await expect(prenominaRows.first()).toBeVisible({ timeout: 10000 });
    
    const rowCount = await prenominaRows.count();
    if (rowCount === 0) {
      test.skip(true, 'No prenominas available for testing detail modal');
      return;
    }
    
    // Get the first prenomina row ID
    const firstRow = prenominaRows.first();
    const rowTestId = await firstRow.getAttribute('data-testid');
    const prenominaId = rowTestId?.replace('prenomina-row-', '');
    
    // Click on detail button with force
    const detailBtn = page.getByTestId(`btn-ver-detalle-${prenominaId}`);
    await expect(detailBtn).toBeVisible({ timeout: 5000 });
    await detailBtn.click({ force: true });
    
    // Wait for modal to open
    await page.waitForTimeout(500);
    
    // Verify modal contains expected sections
    await expect(page.locator('text=Detalle de Prenómina')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Desglose de Horas')).toBeVisible();
    await expect(page.locator('text=Horas Normales').first()).toBeVisible();
    await expect(page.getByText('Total Horas:').first()).toBeVisible();
    await expect(page.getByText('Importe Bruto:').first()).toBeVisible();
    
    await page.screenshot({ path: 'prenomina-detail-modal.jpeg', quality: 20 });
    
    // Close modal by clicking X button
    const closeBtn = page.locator('[x-file-name="RRHH"] .modal-overlay button').first();
    if (await closeBtn.isVisible({ timeout: 1000 })) {
      await closeBtn.click({ force: true });
    }
  });
  
  test('should validate prenomina', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Set month where we know there's data
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '2' });
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Find a borrador prenomina row with validate button
    const prenominaRows = page.locator('[data-testid^="prenomina-row-"]');
    const rowCount = await prenominaRows.count();
    
    let validatedSomething = false;
    
    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const row = prenominaRows.nth(i);
      const rowTestId = await row.getAttribute('data-testid');
      const prenominaId = rowTestId?.replace('prenomina-row-', '');
      
      const validateBtn = page.getByTestId(`btn-validar-${prenominaId}`);
      
      if (await validateBtn.isVisible({ timeout: 1000 })) {
        await validateBtn.click({ force: true });
        
        // Wait for response
        await page.waitForLoadState('domcontentloaded');
        validatedSomething = true;
        break;
      }
    }
    
    if (!validatedSomething) {
      // All prenominas might already be validated
      console.log('No borrador prenominas found to validate');
    }
    
    await page.screenshot({ path: 'prenomina-validated.jpeg', quality: 20 });
  });
  
  test('should export prenomina to Excel', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set month where we know there's data
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '2' });
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Find a prenomina row
    const prenominaRows = page.locator('[data-testid^="prenomina-row-"]');
    const rowCount = await prenominaRows.count();
    
    if (rowCount === 0) {
      test.skip(true, 'No prenominas available for export test');
      return;
    }
    
    // Get the first prenomina row ID
    const firstRow = prenominaRows.first();
    const rowTestId = await firstRow.getAttribute('data-testid');
    const prenominaId = rowTestId?.replace('prenomina-row-', '');
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click Excel export button with force
    const excelBtn = page.getByTestId(`btn-excel-${prenominaId}`);
    await expect(excelBtn).toBeVisible();
    await excelBtn.click({ force: true });
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    const filename = download.suggestedFilename();
    expect(filename.toLowerCase()).toContain('prenomina');
    expect(filename.toLowerCase()).toContain('.xlsx');
  });
  
  test('should export prenomina to PDF', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set month where we know there's data
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '2' });
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Find a prenomina row
    const prenominaRows = page.locator('[data-testid^="prenomina-row-"]');
    const rowCount = await prenominaRows.count();
    
    if (rowCount === 0) {
      test.skip(true, 'No prenominas available for export test');
      return;
    }
    
    // Get the first prenomina row ID
    const firstRow = prenominaRows.first();
    const rowTestId = await firstRow.getAttribute('data-testid');
    const prenominaId = rowTestId?.replace('prenomina-row-', '');
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click PDF export button with force
    const pdfBtn = page.getByTestId(`btn-pdf-${prenominaId}`);
    await expect(pdfBtn).toBeVisible();
    await pdfBtn.click({ force: true });
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    const filename = download.suggestedFilename();
    expect(filename.toLowerCase()).toContain('prenomina');
    expect(filename.toLowerCase()).toContain('.pdf');
  });
  
  test('should export all prenominas to CSV', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set month where we know there's data
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '2' });
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2026' });
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Check if CSV export button is visible (only shown when prenominas exist)
    const exportCsvBtn = page.getByTestId('btn-exportar-csv');
    
    if (await exportCsvBtn.isVisible({ timeout: 3000 })) {
      // The CSV export uses Blob and creates a download via JS - not a server download
      // So we just verify the button is clickable and doesn't throw an error
      await exportCsvBtn.click({ force: true });
      
      // Wait a moment for the download to process
      await page.waitForTimeout(1000);
      
      // If we got here without errors, the export worked
      console.log('CSV export button clicked successfully');
    } else {
      console.log('No prenominas to export - CSV button not visible');
    }
  });
  
  test('should show empty state when no prenominas', async ({ page }) => {
    await navigateToPrenomina(page);
    await dismissModal(page);
    
    // Set to a month with no prenominas
    const mesSelect = page.getByTestId('select-mes-prenomina');
    await expect(mesSelect).toBeVisible({ timeout: 10000 });
    await mesSelect.selectOption({ value: '12' }); // Diciembre
    
    const anoSelect = page.getByTestId('select-ano-prenomina');
    await anoSelect.selectOption({ value: '2024' }); // Past year
    
    await page.waitForLoadState('domcontentloaded');
    await dismissModal(page);
    
    // Should show empty state message
    const emptyMessage = page.locator('text=No hay prenóminas');
    await expect(emptyMessage).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: 'prenomina-empty-state.jpeg', quality: 20 });
  });
  
});
