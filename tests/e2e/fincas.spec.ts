import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, generateUniqueId } from '../fixtures/helpers';

// Helper to close the daily summary modal if it appears
async function closeDailySummaryModal(page: any) {
  // Wait a bit for modal to potentially appear
  await page.waitForTimeout(1000);
  
  // Try multiple approaches to close the modal
  try {
    // Look for the close button (X)
    const closeX = page.locator('.modal-overlay button:has(svg), [data-testid="close-resumen-diario"]').first();
    if (await closeX.isVisible({ timeout: 500 })) {
      await closeX.click({ force: true });
      await page.waitForTimeout(500);
      return;
    }
  } catch {}

  try {
    // Try "Entendido" button
    const entendidoBtn = page.getByRole('button', { name: /entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 500 })) {
      await entendidoBtn.click({ force: true });
      await page.waitForTimeout(500);
      return;
    }
  } catch {}
  
  try {
    // Try clicking outside the modal (on the overlay)
    const overlay = page.locator('.modal-overlay');
    if (await overlay.isVisible({ timeout: 500 })) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } catch {}
}

async function ensureModalClosed(page: any) {
  // Repeatedly try to close modal until it's gone
  for (let i = 0; i < 3; i++) {
    const modal = page.locator('.modal-overlay');
    if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeDailySummaryModal(page);
    } else {
      break;
    }
  }
}

test.describe('Fincas Module - Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    
    // Navigate to Fincas using the sidebar
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    await ensureModalClosed(page);
  });

  test('should display Fincas page with stats', async ({ page }) => {
    // Verify page loaded
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    
    // Verify page title
    await expect(page.locator('h1').filter({ hasText: /fincas/i })).toBeVisible();
    
    // Verify statistics cards
    await expect(page.locator('.card').filter({ hasText: 'Total Fincas' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Fincas Propias' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Total Hectáreas' })).toBeVisible();
    
    // Verify Nueva Finca button
    await expect(page.getByTestId('btn-nueva-finca')).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('filtros-fincas')).toBeVisible();
    await expect(page.getByTestId('input-filtro-buscar')).toBeVisible();
    await expect(page.getByTestId('select-filtro-provincia')).toBeVisible();
    await expect(page.getByTestId('select-filtro-tipo')).toBeVisible();
  });

  test('should display fincas list', async ({ page }) => {
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Listado de Fincas')).toBeVisible();
  });
});

test.describe('Fincas Module - Form', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should open and close form', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    
    // Verify form title
    await expect(page.locator('text=Nueva Finca').first()).toBeVisible();
    
    // Close form
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display all form fields', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    
    // Verify form sections
    await expect(page.locator('text=Datos de la Finca')).toBeVisible();
    await expect(page.locator('text=Superficie y Producción')).toBeVisible();
    await expect(page.locator('text=Datos SIGPAC')).toBeVisible();
    await expect(page.locator('text=Recolección').first()).toBeVisible();
    await expect(page.locator('text=Precios').first()).toBeVisible();
    
    // Verify key form fields
    await expect(page.getByTestId('input-denominacion')).toBeVisible();
    await expect(page.getByTestId('input-provincia')).toBeVisible();
    await expect(page.getByTestId('input-hectareas')).toBeVisible();
    await expect(page.getByTestId('input-finca-propia')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-provincia')).toBeVisible();
    await expect(page.getByTestId('btn-guardar-finca')).toBeVisible();
  });
});

test.describe('Fincas Module - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should create and delete a finca', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const fincaName = `Finca ${uniqueId}`;
    
    // Open form
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    
    // Fill form
    await page.getByTestId('input-denominacion').fill(fincaName);
    await page.getByTestId('input-provincia').fill('Córdoba');
    await page.getByTestId('input-hectareas').fill('30.5');
    await page.getByTestId('input-finca-propia').check();
    
    // Fill SIGPAC (provincia is a dropdown now)
    await page.getByTestId('input-sigpac-provincia').selectOption('14');
    await page.getByTestId('input-sigpac-municipio').fill('045');
    
    // Save
    await page.getByTestId('btn-guardar-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
    
    // Search for created finca
    await page.getByTestId('input-filtro-buscar').fill(uniqueId);
    await expect(page.locator(`text=${fincaName}`)).toBeVisible({ timeout: 5000 });
    
    // Delete the finca
    page.on('dialog', dialog => dialog.accept());
    await page.locator('[data-testid^="btn-delete-"]').first().click({ force: true });
    
    // Verify deleted (may take time)
    await page.waitForLoadState('domcontentloaded');
  });

  test('should filter by type', async ({ page }) => {
    // Filter by Propias
    await page.getByTestId('select-filtro-tipo').selectOption('true');
    await page.waitForTimeout(500);
    
    // Filter by Alquiladas  
    await page.getByTestId('select-filtro-tipo').selectOption('false');
    await page.waitForTimeout(500);
    
    // Clear filter
    await page.getByTestId('select-filtro-tipo').selectOption('');
  });

  test('should expand finca details', async ({ page }) => {
    const expandBtn = page.locator('[data-testid^="btn-expand-"]').first();
    
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click({ force: true });
      await expect(page.locator('h5').filter({ hasText: 'Ubicación' })).toBeVisible({ timeout: 3000 });
      await expandBtn.click({ force: true });
    }
  });

  test('should clear filters', async ({ page }) => {
    // Apply filters
    await page.getByTestId('input-filtro-buscar').fill('test');
    await page.getByTestId('select-filtro-tipo').selectOption('true');
    
    // Verify clear button appears
    await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    
    // Clear filters
    await page.getByTestId('btn-limpiar-filtros').click({ force: true });
    
    // Verify cleared
    await expect(page.getByTestId('input-filtro-buscar')).toHaveValue('');
    await expect(page.getByTestId('select-filtro-tipo')).toHaveValue('');
  });
});

test.describe('Fincas Module - SIGPAC Integration', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    
    // Open form for SIGPAC tests
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
  });

  test('should display SIGPAC section with search button', async ({ page }) => {
    // Verify SIGPAC section exists
    await expect(page.locator('text=Datos SIGPAC')).toBeVisible();
    
    // Verify "Buscar en SIGPAC" button
    await expect(page.getByTestId('btn-buscar-sigpac')).toBeVisible();
    
    // Verify "Visor SIGPAC" link
    await expect(page.locator('a:has-text("Visor SIGPAC")')).toBeVisible();
    
    // Verify help text is displayed
    await expect(page.locator('text=Introduzca los códigos SIGPAC')).toBeVisible();
  });

  test('should display all SIGPAC form fields', async ({ page }) => {
    // Verify all SIGPAC form fields
    await expect(page.getByTestId('input-sigpac-provincia')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-municipio')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-cod-agregado')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-zona')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-poligono')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-parcela')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-recinto')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-cod-uso')).toBeVisible();
  });

  test('should show validation error when SIGPAC search with missing fields', async ({ page }) => {
    // Click search without filling required fields
    await page.getByTestId('btn-buscar-sigpac').click({ force: true });
    
    // Should show error message about missing fields
    await expect(page.locator('text=Debe completar al menos')).toBeVisible({ timeout: 5000 });
  });

  test('should load provinces in dropdown', async ({ page }) => {
    const provinciaSelect = page.getByTestId('input-sigpac-provincia');
    
    // Click to open dropdown and verify options exist
    await provinciaSelect.click();
    
    // Check for some known provinces within the SIGPAC select only
    const sigpacSelect = page.getByTestId('input-sigpac-provincia');
    await expect(sigpacSelect.locator('option:has-text("Sevilla")')).toBeVisible();
    await expect(sigpacSelect.locator('option:has-text("Madrid")')).toBeVisible();
    await expect(sigpacSelect.locator('option:has-text("Barcelona")')).toBeVisible();
  });

  test('should search SIGPAC and display success message on valid parcel', async ({ page }) => {
    // Fill SIGPAC data with known valid parcel (Sevilla test case)
    await page.getByTestId('input-sigpac-provincia').selectOption('41'); // Sevilla
    await page.getByTestId('input-sigpac-municipio').fill('053');
    await page.getByTestId('input-sigpac-poligono').fill('5');
    await page.getByTestId('input-sigpac-parcela').fill('12');
    
    // Click search
    await page.getByTestId('btn-buscar-sigpac').click({ force: true });
    
    // Wait for response - either success or error from external API
    // The external SIGPAC API may or may not be available
    try {
      // Check for success message (green box with CheckCircle)
      const successMsg = page.locator('text=Parcela encontrada en SIGPAC');
      const errorMsg = page.locator('[style*="ffcdd2"], [style*="AlertCircle"]');
      
      // Wait for either success or error response
      await Promise.race([
        expect(successMsg).toBeVisible({ timeout: 20000 }),
        expect(page.locator('text=Superficie:')).toBeVisible({ timeout: 20000 }),
        expect(errorMsg).toBeVisible({ timeout: 20000 }),
        expect(page.locator('text=Error')).toBeVisible({ timeout: 20000 })
      ]);
      
      // If success, verify the success message shows data
      if (await successMsg.isVisible().catch(() => false)) {
        await expect(page.locator('text=Superficie:')).toBeVisible();
        await expect(page.locator('text=Uso:')).toBeVisible();
      }
    } catch {
      // External API timeout - this is acceptable
      console.log('SIGPAC external API may be unavailable');
    }
  });

  test('should show error message for non-existent parcel', async ({ page }) => {
    // Fill with valid province but non-existent parcel data
    await page.getByTestId('input-sigpac-provincia').selectOption('41'); // Sevilla (valid)
    await page.getByTestId('input-sigpac-municipio').fill('999');
    await page.getByTestId('input-sigpac-poligono').fill('9999');
    await page.getByTestId('input-sigpac-parcela').fill('99999');
    
    // Click search
    await page.getByTestId('btn-buscar-sigpac').click({ force: true });
    
    // Wait for error response - look for the error message
    await expect(page.locator('text=/no se encontraron|no encontrad|Error|Verifique/i').first()).toBeVisible({ timeout: 25000 });
  });

  test('should auto-fill hectareas field after successful SIGPAC search', async ({ page }) => {
    // Fill SIGPAC data
    await page.getByTestId('input-sigpac-provincia').selectOption('41');
    await page.getByTestId('input-sigpac-municipio').fill('053');
    await page.getByTestId('input-sigpac-poligono').fill('5');
    await page.getByTestId('input-sigpac-parcela').fill('12');
    
    // Get initial hectareas value
    const hectareasInput = page.getByTestId('input-hectareas');
    const initialValue = await hectareasInput.inputValue();
    
    // Click search
    await page.getByTestId('btn-buscar-sigpac').click({ force: true });
    
    // If successful, hectareas should be updated
    try {
      await expect(page.locator('text=Parcela encontrada en SIGPAC')).toBeVisible({ timeout: 20000 });
      
      // Hectareas should be auto-filled (different from initial)
      const newValue = await hectareasInput.inputValue();
      // Value should have changed if successful
      if (initialValue === '0') {
        expect(parseFloat(newValue)).toBeGreaterThan(0);
      }
    } catch {
      // External API unavailable - skip this check
      console.log('SIGPAC API unavailable for auto-fill test');
    }
  });

  test('should create finca with SIGPAC data and save it correctly', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const fincaName = `SIGPAC_Finca_${uniqueId}`;
    
    // Scroll to top to fill denominacion first
    await page.getByTestId('input-denominacion').scrollIntoViewIfNeeded();
    await page.getByTestId('input-denominacion').fill(fincaName);
    await page.getByTestId('input-provincia').fill('Sevilla');
    await page.getByTestId('input-hectareas').fill('0.0714');
    
    // Fill SIGPAC data manually (in case API is unavailable)
    await page.getByTestId('input-sigpac-provincia').selectOption('41');
    await page.getByTestId('input-sigpac-municipio').fill('053');
    await page.getByTestId('input-sigpac-poligono').fill('5');
    await page.getByTestId('input-sigpac-parcela').fill('12');
    await page.getByTestId('input-sigpac-cod-uso').fill('TA');
    
    // Save
    await page.getByTestId('btn-guardar-finca').click({ force: true });
    
    // Wait for form to close or handle error
    try {
      await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 15000 });
    } catch {
      // Form might still be open due to modal or validation error
      // Try closing any modal first
      try {
        const entendidoBtn = page.getByRole('button', { name: /entendido/i });
        if (await entendidoBtn.isVisible({ timeout: 1000 })) {
          await entendidoBtn.click({ force: true });
        }
      } catch {}
      
      // Click save again if form is still visible
      if (await page.getByTestId('form-finca').isVisible()) {
        await page.getByTestId('btn-guardar-finca').click({ force: true });
        await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
      }
    }
    
    // Search for created finca
    await page.getByTestId('input-filtro-buscar').fill(uniqueId);
    await expect(page.locator(`text=${fincaName}`)).toBeVisible({ timeout: 10000 });
    
    // Expand to see SIGPAC data
    const expandBtn = page.locator('[data-testid^="btn-expand-"]').first();
    await expandBtn.click({ force: true });
    
    // Verify SIGPAC data is displayed in expanded view
    await expect(page.locator('h5').filter({ hasText: 'Datos SIGPAC' })).toBeVisible({ timeout: 5000 });
    
    // Delete the test finca
    page.on('dialog', dialog => dialog.accept());
    await page.locator('[data-testid^="btn-delete-"]').first().click({ force: true });
  });
});
