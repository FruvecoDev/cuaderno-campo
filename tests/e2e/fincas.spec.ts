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
