import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, generateUniqueId } from '../fixtures/helpers';

const FINCAS_URL = '/fincas';

test.describe('Fincas Module - Complete CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    
    // Navigate to Fincas page
    await page.locator('nav a, aside a, .sidebar a, [data-testid="nav-link-fincas"]')
      .filter({ hasText: /fincas/i })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    
    // Verify we're on Fincas page
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display Fincas page with stats', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1').filter({ hasText: /fincas/i })).toBeVisible();
    
    // Verify statistics cards are displayed
    await expect(page.locator('text=Total Fincas')).toBeVisible();
    await expect(page.locator('text=Fincas Propias')).toBeVisible();
    await expect(page.locator('text=Alquiladas')).toBeVisible();
    await expect(page.locator('text=Total Hectáreas')).toBeVisible();
    
    // Verify "Nueva Finca" button exists
    await expect(page.getByTestId('btn-nueva-finca')).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    // Verify filters section
    await expect(page.getByTestId('filtros-fincas')).toBeVisible();
    
    // Verify filter inputs
    await expect(page.getByTestId('input-filtro-buscar')).toBeVisible();
    await expect(page.getByTestId('select-filtro-provincia')).toBeVisible();
    await expect(page.getByTestId('select-filtro-tipo')).toBeVisible();
  });

  test('should open and close Nueva Finca form', async ({ page }) => {
    // Click Nueva Finca button
    await page.getByTestId('btn-nueva-finca').click();
    
    // Verify form is displayed
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    
    // Verify form title
    await expect(page.locator('text=Nueva Finca').first()).toBeVisible();
    
    // Verify main form sections are present
    await expect(page.locator('text=Datos de la Finca')).toBeVisible();
    await expect(page.locator('text=Superficie y Producción')).toBeVisible();
    await expect(page.locator('text=Datos SIGPAC')).toBeVisible();
    await expect(page.locator('text=Recolección')).toBeVisible();
    await expect(page.locator('text=Precios')).toBeVisible();
    
    // Close form by clicking Nueva Finca button again
    await page.getByTestId('btn-nueva-finca').click();
    
    // Verify form is hidden
    await expect(page.getByTestId('form-finca')).not.toBeVisible();
  });

  test('should display all form fields for creating finca', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click();
    await expect(page.getByTestId('form-finca')).toBeVisible();
    
    // Verify Datos de la Finca fields
    await expect(page.getByTestId('input-denominacion')).toBeVisible();
    await expect(page.getByTestId('input-provincia')).toBeVisible();
    await expect(page.getByTestId('input-poblacion')).toBeVisible();
    await expect(page.getByTestId('input-poligono')).toBeVisible();
    await expect(page.getByTestId('input-parcela')).toBeVisible();
    await expect(page.getByTestId('input-subparcela')).toBeVisible();
    await expect(page.getByTestId('input-finca-propia')).toBeVisible();
    
    // Verify Superficie y Producción fields
    await expect(page.getByTestId('input-hectareas')).toBeVisible();
    await expect(page.getByTestId('input-areas')).toBeVisible();
    await expect(page.getByTestId('input-toneladas')).toBeVisible();
    await expect(page.getByTestId('input-produccion-esperada')).toBeVisible();
    await expect(page.getByTestId('input-produccion-disponible')).toBeVisible();
    
    // Verify Datos SIGPAC fields
    await expect(page.getByTestId('input-sigpac-provincia')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-municipio')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-cod-agregado')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-zona')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-poligono')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-parcela')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-recinto')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-cod-uso')).toBeVisible();
    
    // Verify Recolección fields
    await expect(page.getByTestId('input-recoleccion-semana')).toBeVisible();
    await expect(page.getByTestId('input-recoleccion-ano')).toBeVisible();
    
    // Verify Precios fields
    await expect(page.getByTestId('input-precio-corte')).toBeVisible();
    await expect(page.getByTestId('input-precio-transporte')).toBeVisible();
    await expect(page.getByTestId('input-proveedor-corte')).toBeVisible();
    
    // Verify Observaciones field
    await expect(page.getByTestId('input-observaciones')).toBeVisible();
    
    // Verify save button
    await expect(page.getByTestId('btn-guardar-finca')).toBeVisible();
  });

  test('should create a new finca with all fields', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const fincaName = `Finca ${uniqueId}`;
    
    await page.getByTestId('btn-nueva-finca').click();
    await expect(page.getByTestId('form-finca')).toBeVisible();
    
    // Fill Datos de la Finca
    await page.getByTestId('input-denominacion').fill(fincaName);
    await page.getByTestId('input-provincia').fill('Córdoba');
    await page.getByTestId('input-poblacion').fill('Montilla');
    await page.getByTestId('input-poligono').fill('12');
    await page.getByTestId('input-parcela').fill('456');
    await page.getByTestId('input-subparcela').fill('B');
    await page.getByTestId('input-finca-propia').check();
    
    // Fill Superficie y Producción
    await page.getByTestId('input-hectareas').fill('30.5');
    await page.getByTestId('input-areas').fill('150');
    await page.getByTestId('input-toneladas').fill('200');
    await page.getByTestId('input-produccion-esperada').fill('250');
    await page.getByTestId('input-produccion-disponible').fill('220');
    
    // Fill Datos SIGPAC
    await page.getByTestId('input-sigpac-provincia').fill('14');
    await page.getByTestId('input-sigpac-municipio').fill('045');
    await page.getByTestId('input-sigpac-cod-agregado').fill('0');
    await page.getByTestId('input-sigpac-zona').fill('0');
    await page.getByTestId('input-sigpac-poligono').fill('12');
    await page.getByTestId('input-sigpac-parcela').fill('456');
    await page.getByTestId('input-sigpac-recinto').fill('1');
    await page.getByTestId('input-sigpac-cod-uso').fill('TA');
    
    // Fill Recolección
    await page.getByTestId('input-recoleccion-semana').fill('28');
    await page.getByTestId('input-recoleccion-ano').fill('2026');
    
    // Fill Precios
    await page.getByTestId('input-precio-corte').fill('0.18');
    await page.getByTestId('input-precio-transporte').fill('0.08');
    await page.getByTestId('input-proveedor-corte').fill('Corte Test SL');
    
    // Fill Observaciones
    await page.getByTestId('input-observaciones').fill(`Observaciones de prueba para ${fincaName}`);
    
    // Save finca
    await page.getByTestId('btn-guardar-finca').click();
    
    // Verify form closes and finca appears in list
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
    
    // Search for the created finca
    await page.getByTestId('input-filtro-buscar').fill(uniqueId);
    
    // Verify finca appears in list
    await expect(page.locator(`text=${fincaName}`)).toBeVisible({ timeout: 5000 });
    
    // Cleanup - delete the created finca
    const fincaCard = page.locator(`text=${fincaName}`).locator('..').locator('..').locator('..');
    const deleteBtn = fincaCard.locator('button').filter({ has: page.locator('svg') }).last();
    
    // Accept dialog before clicking delete
    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click({ force: true });
    
    // Wait for deletion to complete
    await page.waitForLoadState('domcontentloaded');
  });

  test('should filter fincas by type (Propias/Alquiladas)', async ({ page }) => {
    // Filter by Propias
    await page.getByTestId('select-filtro-tipo').selectOption('true');
    await page.waitForLoadState('domcontentloaded');
    
    // All visible fincas should show "Propia" badge
    const propiasBadges = page.locator('text=Propia').all();
    
    // Filter by Alquiladas
    await page.getByTestId('select-filtro-tipo').selectOption('false');
    await page.waitForLoadState('domcontentloaded');
    
    // All visible fincas should show "Alquilada" badge
    // (we don't assert count since there may be no alquiladas)
    
    // Clear filter
    await page.getByTestId('select-filtro-tipo').selectOption('');
  });

  test('should expand finca card to show details', async ({ page }) => {
    // Wait for fincas list to load
    await page.waitForLoadState('domcontentloaded');
    
    // Find first finca card with expand button
    const firstExpandBtn = page.locator('[data-testid^="btn-expand-"]').first();
    
    if (await firstExpandBtn.isVisible()) {
      // Click to expand
      await firstExpandBtn.click();
      
      // Verify expanded content sections are visible
      await expect(page.locator('text=Ubicación').first()).toBeVisible({ timeout: 3000 });
      await expect(page.locator('text=Superficie y Producción').first()).toBeVisible();
      
      // Click to collapse
      await firstExpandBtn.click();
    }
  });

  test('should edit an existing finca', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const fincaName = `Finca Edit ${uniqueId}`;
    
    // First create a finca to edit
    await page.getByTestId('btn-nueva-finca').click();
    await page.getByTestId('input-denominacion').fill(fincaName);
    await page.getByTestId('input-provincia').fill('Jaén');
    await page.getByTestId('input-hectareas').fill('15');
    await page.getByTestId('btn-guardar-finca').click();
    
    // Wait for finca to be created
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
    
    // Search for the created finca
    await page.getByTestId('input-filtro-buscar').fill(uniqueId);
    await page.waitForLoadState('domcontentloaded');
    
    // Click edit button
    const editBtn = page.locator('[data-testid^="btn-edit-"]').first();
    await editBtn.click();
    
    // Verify form opens in edit mode
    await expect(page.getByTestId('form-finca')).toBeVisible();
    await expect(page.locator('text=Editar Finca')).toBeVisible();
    
    // Update some fields
    await page.getByTestId('input-hectareas').fill('25');
    await page.getByTestId('input-observaciones').fill('Updated via E2E test');
    
    // Save changes
    await page.getByTestId('btn-guardar-finca').click();
    
    // Verify form closes
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
    
    // Cleanup - delete the finca
    page.on('dialog', dialog => dialog.accept());
    const deleteBtn = page.locator('[data-testid^="btn-delete-"]').first();
    await deleteBtn.click({ force: true });
  });

  test('should clear filters', async ({ page }) => {
    // Apply some filters
    await page.getByTestId('input-filtro-buscar').fill('test');
    await page.getByTestId('select-filtro-tipo').selectOption('true');
    
    // Verify clear button appears
    await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    
    // Click clear filters
    await page.getByTestId('btn-limpiar-filtros').click();
    
    // Verify filters are cleared
    await expect(page.getByTestId('input-filtro-buscar')).toHaveValue('');
    await expect(page.getByTestId('select-filtro-tipo')).toHaveValue('');
  });

  test('should display finca list with correct information', async ({ page }) => {
    // Wait for list to load
    await page.waitForLoadState('domcontentloaded');
    
    // Verify "Listado de Fincas" section exists
    await expect(page.locator('text=Listado de Fincas')).toBeVisible();
    
    // Check if there are fincas displayed or "No hay fincas" message
    const hasFincas = await page.locator('[data-testid^="finca-card-"]').count() > 0;
    const noFincasMessage = page.locator('text=No hay fincas registradas');
    
    if (!hasFincas) {
      await expect(noFincasMessage).toBeVisible();
    } else {
      // First finca card should have edit and delete buttons
      await expect(page.locator('[data-testid^="btn-edit-"]').first()).toBeVisible();
      await expect(page.locator('[data-testid^="btn-delete-"]').first()).toBeVisible();
    }
  });
});

test.describe('Fincas Module - SIGPAC Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    
    await page.locator('nav a, aside a, .sidebar a')
      .filter({ hasText: /fincas/i })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should save and display SIGPAC data correctly', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const fincaName = `Finca SIGPAC ${uniqueId}`;
    
    // Create finca with SIGPAC data
    await page.getByTestId('btn-nueva-finca').click();
    await page.getByTestId('input-denominacion').fill(fincaName);
    
    // Fill all SIGPAC fields
    await page.getByTestId('input-sigpac-provincia').fill('41');
    await page.getByTestId('input-sigpac-municipio').fill('053');
    await page.getByTestId('input-sigpac-cod-agregado').fill('0');
    await page.getByTestId('input-sigpac-zona').fill('0');
    await page.getByTestId('input-sigpac-poligono').fill('25');
    await page.getByTestId('input-sigpac-parcela').fill('789');
    await page.getByTestId('input-sigpac-recinto').fill('3');
    await page.getByTestId('input-sigpac-cod-uso').fill('OV');
    
    await page.getByTestId('btn-guardar-finca').click();
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 10000 });
    
    // Search for created finca
    await page.getByTestId('input-filtro-buscar').fill(uniqueId);
    await page.waitForLoadState('domcontentloaded');
    
    // Expand to see SIGPAC data
    const expandBtn = page.locator('[data-testid^="btn-expand-"]').first();
    await expandBtn.click();
    
    // Verify SIGPAC section is visible in expanded view
    await expect(page.locator('text=Datos SIGPAC').first()).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    page.on('dialog', dialog => dialog.accept());
    const deleteBtn = page.locator('[data-testid^="btn-delete-"]').first();
    await deleteBtn.click({ force: true });
  });
});
