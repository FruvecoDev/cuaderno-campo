import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, generateUniqueId } from '../fixtures/helpers';

// Helper to close the daily summary modal if it appears
async function closeDailySummaryModal(page: any) {
  try {
    const modal = page.locator('[data-testid="resumen-diario-modal"], .modal-overlay');
    if (await modal.isVisible({ timeout: 3000 })) {
      // Click "Entendido" button to close
      const entendidoBtn = page.locator('button:has-text("Entendido")');
      if (await entendidoBtn.isVisible({ timeout: 1000 })) {
        await entendidoBtn.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
  } catch {
    // Modal not present, continue
  }
}

test.describe('Fincas Module - Page Load and Stats', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    
    // Close daily summary modal if present
    await closeDailySummaryModal(page);
    
    // Navigate to Fincas page
    await page.locator('nav a, aside a, .sidebar a')
      .filter({ hasText: /fincas/i })
      .first()
      .click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display Fincas page with stats', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1').filter({ hasText: /fincas/i })).toBeVisible();
    
    // Verify statistics cards are displayed (use more specific locators)
    await expect(page.locator('.card').filter({ hasText: 'Total Fincas' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Fincas Propias' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Total Hectáreas' })).toBeVisible();
    
    // Verify Nueva Finca button exists
    await expect(page.getByTestId('btn-nueva-finca')).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    await expect(page.getByTestId('filtros-fincas')).toBeVisible();
    await expect(page.getByTestId('input-filtro-buscar')).toBeVisible();
    await expect(page.getByTestId('select-filtro-provincia')).toBeVisible();
    await expect(page.getByTestId('select-filtro-tipo')).toBeVisible();
  });

  test('should open and close form', async ({ page }) => {
    // Click Nueva Finca button
    await page.getByTestId('btn-nueva-finca').click();
    
    // Verify form is displayed
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    
    // Close form
    await page.getByTestId('btn-nueva-finca').click();
    await expect(page.getByTestId('form-finca')).not.toBeVisible();
  });
});

test.describe('Fincas Module - Form Fields', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await closeDailySummaryModal(page);
    
    await page.locator('nav a, aside a, .sidebar a')
      .filter({ hasText: /fincas/i })
      .first()
      .click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display all form fields', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click();
    await expect(page.getByTestId('form-finca')).toBeVisible();
    
    // Datos de la Finca
    await expect(page.getByTestId('input-denominacion')).toBeVisible();
    await expect(page.getByTestId('input-provincia')).toBeVisible();
    await expect(page.getByTestId('input-poblacion')).toBeVisible();
    await expect(page.getByTestId('input-finca-propia')).toBeVisible();
    
    // Superficie y Producción
    await expect(page.getByTestId('input-hectareas')).toBeVisible();
    await expect(page.getByTestId('input-produccion-esperada')).toBeVisible();
    
    // SIGPAC
    await expect(page.getByTestId('input-sigpac-provincia')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-municipio')).toBeVisible();
    
    // Observaciones
    await expect(page.getByTestId('input-observaciones')).toBeVisible();
    await expect(page.getByTestId('btn-guardar-finca')).toBeVisible();
  });
});

test.describe('Fincas Module - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await closeDailySummaryModal(page);
    
    await page.locator('nav a, aside a, .sidebar a')
      .filter({ hasText: /fincas/i })
      .first()
      .click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new finca', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const fincaName = `Finca ${uniqueId}`;
    
    await page.getByTestId('btn-nueva-finca').click();
    await expect(page.getByTestId('form-finca')).toBeVisible();
    
    // Fill required fields
    await page.getByTestId('input-denominacion').fill(fincaName);
    await page.getByTestId('input-provincia').fill('Córdoba');
    await page.getByTestId('input-poblacion').fill('Montilla');
    await page.getByTestId('input-hectareas').fill('30.5');
    await page.getByTestId('input-finca-propia').check();
    
    // Fill SIGPAC
    await page.getByTestId('input-sigpac-provincia').fill('14');
    await page.getByTestId('input-sigpac-municipio').fill('045');
    
    // Save
    await page.getByTestId('btn-guardar-finca').click();
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
    
    // Search for created finca
    await page.getByTestId('input-filtro-buscar').fill(uniqueId);
    await expect(page.locator(`text=${fincaName}`)).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    const deleteBtn = page.locator('[data-testid^="btn-delete-"]').first();
    await deleteBtn.click({ force: true });
  });

  test('should filter fincas by type', async ({ page }) => {
    // Filter by Propias
    await page.getByTestId('select-filtro-tipo').selectOption('true');
    await page.waitForLoadState('domcontentloaded');
    
    // Filter by Alquiladas
    await page.getByTestId('select-filtro-tipo').selectOption('false');
    await page.waitForLoadState('domcontentloaded');
    
    // Clear filter
    await page.getByTestId('select-filtro-tipo').selectOption('');
  });

  test('should expand finca details', async ({ page }) => {
    const expandBtn = page.locator('[data-testid^="btn-expand-"]').first();
    
    if (await expandBtn.isVisible({ timeout: 3000 })) {
      await expandBtn.click();
      await expect(page.locator('h5').filter({ hasText: 'Ubicación' })).toBeVisible({ timeout: 3000 });
      await expandBtn.click();
    }
  });
});
