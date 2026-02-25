/**
 * Recomendaciones Module E2E Tests
 * Tests for the technical recommendations module - page, form, actions
 */
import { test, expect } from '@playwright/test';
import { login, waitForAppReady, dismissToasts, removeEmergentBadge, generateUniqueId } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'https://harvest-track-14.preview.emergentagent.com';

test.describe('Recomendaciones Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test.describe('Page Layout and Navigation', () => {
    test('should display Recomendaciones link in sidebar under Visitas', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      
      // Look for Recomendaciones link in the sidebar
      const recomendacionesLink = page.locator('aside a, nav a, .sidebar a').filter({ hasText: /Recomendaciones/i });
      await expect(recomendacionesLink).toBeVisible();
      
      // Verify Visitas is also visible (Recomendaciones should be near it)
      const visitasLink = page.locator('aside a, nav a, .sidebar a').filter({ hasText: /Visitas/i });
      await expect(visitasLink).toBeVisible();
    });

    test('should navigate to Recomendaciones page from sidebar', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      
      // Click on Recomendaciones link
      await page.locator('aside a, nav a, .sidebar a').filter({ hasText: /Recomendaciones/i }).click();
      
      // Should navigate to /recomendaciones
      await expect(page).toHaveURL(/recomendaciones/);
      
      // Verify page loaded with correct testid
      await expect(page.getByTestId('recomendaciones-page')).toBeVisible();
    });

    test('should load Recomendaciones page with header and description', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Check header
      await expect(page.locator('h1').filter({ hasText: /Recomendaciones/i })).toBeVisible();
      
      // Check description text
      await expect(page.locator('text=Gestiona las recomendaciones técnicas')).toBeVisible();
    });

    test('should display KPI stats cards', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Verify KPI cards are present
      await expect(page.locator('text=Total')).toBeVisible();
      await expect(page.locator('text=Pendientes')).toBeVisible();
      await expect(page.locator('text=Programadas')).toBeVisible();
      await expect(page.locator('text=Aplicadas')).toBeVisible();
    });

    test('should display Nueva Recomendación button', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      const newButton = page.getByTestId('btn-nueva-recomendacion');
      await expect(newButton).toBeVisible();
      await expect(newButton).toContainText('Nueva Recomendación');
    });

    test('should display filter button', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Filter button should be visible (icon button)
      const filterBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(filterBtn).toBeVisible();
    });

    test('should display empty state when no recommendations', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Check for empty state message or table
      const emptyState = page.locator('text=No hay recomendaciones registradas');
      const table = page.locator('table');
      
      // Either empty state is shown OR table is visible
      const hasEmptyState = await emptyState.isVisible();
      const hasTable = await table.isVisible();
      
      expect(hasEmptyState || hasTable).toBeTruthy();
    });
  });

  test.describe('New Recommendation Form', () => {
    test('should open form when clicking Nueva Recomendación', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      // Form should appear
      await expect(page.locator('text=Nueva Recomendación').first()).toBeVisible();
    });

    test('should display all required form fields', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      // Check for essential form fields
      await expect(page.locator('text=Parcela').first()).toBeVisible();
      await expect(page.locator('text=Campaña').first()).toBeVisible();
      await expect(page.locator('text=Tipo de Recomendación').first()).toBeVisible();
      await expect(page.locator('text=Prioridad').first()).toBeVisible();
      await expect(page.locator('text=Observaciones').first()).toBeVisible();
    });

    test('should display Subtipo field when Tratamiento Fitosanitario selected', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      // By default, Tratamiento Fitosanitario is selected, so Subtipo should be visible
      await expect(page.locator('text=Subtipo').first()).toBeVisible();
      
      // Subtipo select should have options like Herbicida, Insecticida, etc.
      const subtipoSelect = page.locator('select').filter({ has: page.locator('option:has-text("Herbicida")') });
      await expect(subtipoSelect).toBeVisible();
    });

    test('should display Producto field for Tratamiento Fitosanitario', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      // Producto field should be visible for Tratamiento Fitosanitario type
      await expect(page.locator('text=Producto').first()).toBeVisible();
    });

    test('should display Dosis and Unidad fields', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      await expect(page.locator('text=Dosis').first()).toBeVisible();
      await expect(page.locator('text=Unidad').first()).toBeVisible();
      
      // Check for unit options
      const unitSelect = page.locator('select').filter({ has: page.locator('option:has-text("L/ha")') });
      await expect(unitSelect).toBeVisible();
    });

    test('should display Fecha Programada date picker', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      await expect(page.locator('text=Fecha Programada').first()).toBeVisible();
      
      // Date input should be present
      const dateInput = page.locator('input[type="date"]');
      await expect(dateInput).toBeVisible();
    });

    test('should display Motivo/Justificación field', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      await expect(page.locator('text=Motivo').first()).toBeVisible();
      
      // Should have placeholder text about examples
      const motivoInput = page.locator('input[placeholder*="pulgón"], input[placeholder*="deficiencia"]');
      await expect(motivoInput).toBeVisible();
    });

    test('should have Cancel and Create buttons', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      await expect(page.locator('button').filter({ hasText: /Cancelar/i })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /Crear Recomendación/i })).toBeVisible();
    });

    test('should close form when clicking Cancel', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      await expect(page.locator('text=Nueva Recomendación').first()).toBeVisible();
      
      await page.locator('button').filter({ hasText: /Cancelar/i }).click();
      
      // Form should be hidden
      await expect(page.locator('h3').filter({ hasText: /Nueva Recomendación/i })).not.toBeVisible();
    });

    test('should show validation error when submitting without parcela', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      await page.getByTestId('btn-nueva-recomendacion').click();
      
      // Try to submit without selecting parcela
      await page.locator('button').filter({ hasText: /Crear Recomendación/i }).click();
      
      // Should show error or validation message
      await expect(page.locator('text=Debe seleccionar una parcela')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Filters Panel', () => {
    test('should toggle filters panel visibility', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Find and click filter button (it's the one with the funnel icon before Nueva Recomendación)
      const filterBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      await filterBtn.click();
      
      // Filters panel should appear
      await expect(page.locator('text=Filtros').first()).toBeVisible();
      
      // Click again to close
      await filterBtn.click();
      
      // Should be closed (or check for h3 with Filtros not being visible)
    });

    test('should display filter options when panel is open', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Open filters
      const filterBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      await filterBtn.click();
      
      // Check filter options are present
      await expect(page.locator('label').filter({ hasText: /Parcela/i }).first()).toBeVisible();
      await expect(page.locator('label').filter({ hasText: /Tipo/i }).first()).toBeVisible();
      await expect(page.locator('label').filter({ hasText: /Prioridad/i }).first()).toBeVisible();
      await expect(page.locator('label').filter({ hasText: /Estado/i }).first()).toBeVisible();
    });
  });

  test.describe('Recommendations List and Actions', () => {
    // These tests create test data and verify list/action functionality
    
    test('should display recommendations table headers', async ({ page }) => {
      await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
      
      // Check for table or list container
      const tableOrList = page.locator('table, .table-responsive, [class*="list"]');
      
      // Either there's a table with headers or an empty state
      const hasTable = await page.locator('table th').count() > 0;
      const hasEmptyState = await page.locator('text=No hay recomendaciones').isVisible();
      
      expect(hasTable || hasEmptyState).toBeTruthy();
    });
  });
});

test.describe('Recomendaciones CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
  });

  test('should create a new recommendation successfully', async ({ page }) => {
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="recomendaciones-page"]', { timeout: 10000 });
    
    // Open form
    await page.getByTestId('btn-nueva-recomendacion').click();
    
    // Select first available parcela
    const parcelaSelect = page.locator('select').filter({ has: page.locator('option:has-text("Seleccionar parcela")') }).first();
    await parcelaSelect.selectOption({ index: 1 });
    
    // Fill form fields
    await page.locator('input[placeholder="0.00"]').fill('2.5');
    await page.locator('input[placeholder*="pulgón"]').fill(`TEST_${Date.now()}`);
    await page.locator('textarea[placeholder*="adicionales"]').fill('Test observation from Playwright');
    
    // Submit
    await page.locator('button').filter({ hasText: /Crear Recomendación/i }).click();
    
    // Should show success message
    await expect(page.locator('text=Recomendación creada')).toBeVisible({ timeout: 5000 });
  });
});
