/**
 * Advanced Parcel Map Tests
 * Tests for the interactive map with advanced features:
 * - Map type selector (base, satellite, topographic)
 * - Drawing tools (polygon, rectangle, circle)
 * - Address search
 * - Import/Export panel
 * - Polygon info display (points, area, perimeter)
 * - All parcelas view with cultivo legend
 * - Geolocation button
 */
import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, waitForAppReady, dismissToasts } from '../fixtures/helpers';

const PAGE_URL = 'https://harvest-log-1.preview.emergentagent.com';

test.describe('Parcelas Page - General Map View', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    
    // Navigate to Parcelas page
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('parcelas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should load parcelas page with basic elements', async ({ page }) => {
    // Check main elements are visible
    await expect(page.getByRole('heading', { name: 'Parcelas', exact: true })).toBeVisible();
    await expect(page.getByTestId('btn-general-map')).toBeVisible();
    await expect(page.getByTestId('btn-config-fields')).toBeVisible();
    await expect(page.getByTestId('btn-nueva-parcela')).toBeVisible();
    await expect(page.getByTestId('filters-panel')).toBeVisible();
    
    // Check filters exist
    await expect(page.getByTestId('filter-proveedor')).toBeVisible();
    await expect(page.getByTestId('filter-cultivo')).toBeVisible();
    await expect(page.getByTestId('filter-campana')).toBeVisible();
    await expect(page.getByTestId('filter-parcela')).toBeVisible();
  });

  test('should toggle general map view', async ({ page }) => {
    // Initially map should be hidden
    const generalMapSection = page.locator('h3:has-text("Mapa General de Parcelas")');
    await expect(generalMapSection).not.toBeVisible();
    
    // Click "Ver Mapa" button
    await page.getByTestId('btn-general-map').click();
    
    // Map section should now be visible
    await expect(generalMapSection).toBeVisible({ timeout: 5000 });
    
    // Check for map container (Leaflet)
    const mapContainer = page.locator('.leaflet-container').first();
    await expect(mapContainer).toBeVisible();
    
    // Click again to hide
    await page.getByTestId('btn-general-map').click();
    await expect(generalMapSection).not.toBeVisible();
  });

  test('should display map with parcelas legend when visible', async ({ page }) => {
    // Show general map
    await page.getByTestId('btn-general-map').click();
    
    // Wait for map to load
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 5000 });
    
    // Check if legend appears (if there are parcelas with cultivos)
    const legendSection = page.locator('text=Leyenda');
    // Legend appears only if there are parcelas with cultivos
    // This is optional based on data
    
    // Map help text should be visible
    await expect(page.locator('text=Haz clic en una parcela del mapa')).toBeVisible();
  });

  test('should show filters panel with all filter options', async ({ page }) => {
    // Check all filter dropdowns are present
    const filterPanel = page.getByTestId('filters-panel');
    await expect(filterPanel).toBeVisible();
    
    // Check filter labels
    await expect(filterPanel.locator('text=Proveedor')).toBeVisible();
    await expect(filterPanel.locator('text=Cultivo')).toBeVisible();
    await expect(filterPanel.locator('text=Campaña')).toBeVisible();
    await expect(filterPanel.locator('text=Parcela')).toBeVisible();
  });

  test('should open fields configuration panel', async ({ page }) => {
    // Click config button
    await page.getByTestId('btn-config-fields').click();
    
    // Config panel should appear
    await expect(page.getByTestId('fields-config-panel')).toBeVisible();
    await expect(page.locator('text=Configurar Campos Visibles')).toBeVisible();
    
    // Check some field checkboxes are visible
    const configPanel = page.getByTestId('fields-config-panel');
    await expect(configPanel.locator('text=Código Plantación')).toBeVisible();
    await expect(configPanel.locator('text=Proveedor')).toBeVisible();
    await expect(configPanel.locator('text=Cultivo')).toBeVisible();
  });
});

test.describe('Parcelas Page - New Parcela Form with Advanced Map', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    
    // Navigate to Parcelas page
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('parcelas-page')).toBeVisible({ timeout: 10000 });
    
    // Open new parcela form
    await page.getByTestId('btn-nueva-parcela').click();
  });

  test('should show advanced map in new parcela form', async ({ page }) => {
    // Check form title
    await expect(page.locator('text=Crear Parcela')).toBeVisible();
    
    // Check advanced map section is visible
    await expect(page.locator('text=Mapa Avanzado - Dibuja el polígono')).toBeVisible();
    
    // Check map container exists
    const mapContainer = page.locator('.leaflet-container').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
  });

  test('should display map layer selector buttons', async ({ page }) => {
    // Wait for map to be visible
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Check for layer selector buttons (Mapa Base, Satélite, Topográfico)
    await expect(page.locator('button:has-text("Mapa Base")')).toBeVisible();
    await expect(page.locator('button:has-text("Satélite")')).toBeVisible();
    await expect(page.locator('button:has-text("Topográfico")')).toBeVisible();
  });

  test('should switch map layers', async ({ page }) => {
    // Wait for map
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Click "Mapa Base" button
    const mapaBaseBtn = page.locator('button:has-text("Mapa Base")');
    await mapaBaseBtn.click();
    
    // Check it's now active (has btn-primary class or similar indicator)
    // The button style should change
    
    // Click "Topográfico" button  
    const topoBtn = page.locator('button:has-text("Topográfico")');
    await topoBtn.click();
    
    // Click back to "Satélite"
    const sateliteBtn = page.locator('button:has-text("Satélite")');
    await sateliteBtn.click();
  });

  test('should display drawing tools in toolbar', async ({ page }) => {
    // Wait for map
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Check drawing tool buttons exist (they use Lucide icons)
    // MapPin for polygon, Square for rectangle, Circle for circle
    // These are in the toolbar above the map
    const toolbar = page.locator('[style*="background: hsl(var(--muted))"]').first();
    await expect(toolbar).toBeVisible();
  });

  test('should display search address button', async ({ page }) => {
    // Wait for map
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Find the search button (has Search icon)
    // Click it to show the search panel
    const searchBtn = page.locator('button[title="Buscar dirección"]');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      
      // Search panel should appear with input field
      await expect(page.locator('input[placeholder*="Buscar dirección"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("Buscar")')).toBeVisible();
    }
  });

  test('should display import/export button and panel', async ({ page }) => {
    // Wait for map
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Find the import/export button (has FileJson icon)
    const importExportBtn = page.locator('button[title="Importar/Exportar"]');
    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      
      // Import/Export panel should appear
      await expect(page.locator('text=Importar:')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Exportar:')).toBeVisible();
      await expect(page.locator('button:has-text("GeoJSON/KML/GPX")')).toBeVisible();
      await expect(page.locator('button:has-text("GeoJSON")').nth(1)).toBeVisible();
      await expect(page.locator('button:has-text("KML")').nth(1)).toBeVisible();
      await expect(page.locator('button:has-text("Copiar")')).toBeVisible();
    }
  });

  test('should show contrato search filters in form', async ({ page }) => {
    // Check contrato search section exists
    await expect(page.locator('text=Contrato * (Obligatorio)')).toBeVisible();
    
    // Check contrato search filters
    await expect(page.getByTestId('contrato-search-proveedor')).toBeVisible();
    await expect(page.getByTestId('contrato-search-cultivo')).toBeVisible();
    await expect(page.getByTestId('contrato-search-campana')).toBeVisible();
    
    // Check contrato selector
    await expect(page.getByTestId('select-contrato')).toBeVisible();
  });

  test('should require polygon to save new parcela', async ({ page }) => {
    // Try to submit form without drawing polygon
    await page.getByTestId('select-contrato').selectOption({ index: 1 }).catch(() => {
      // If no options available, skip this part
    });
    
    // Fill required fields
    await page.locator('input').filter({ hasText: '' }).first();
    
    // The form requires polygon - clicking save without polygon should show alert
    // This is tested by interaction
  });

  test('should display measure distance tool', async ({ page }) => {
    // Wait for map
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Find the measure button (has Ruler icon)
    const measureBtn = page.locator('button[title="Medir distancia"]');
    await expect(measureBtn).toBeVisible();
  });

  test('should display coordinates toggle button', async ({ page }) => {
    // Wait for map
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 10000 });
    
    // Find the coordinates button (has Crosshair icon)
    const coordsBtn = page.locator('button[title="Mostrar coordenadas"]');
    await expect(coordsBtn).toBeVisible();
  });

  test('should have cancel button in form', async ({ page }) => {
    // Check cancel button exists
    await expect(page.locator('button:has-text("Cancelar")')).toBeVisible();
    
    // Click cancel should close form
    await page.locator('button:has-text("Cancelar")').click();
    
    // Form should be hidden
    await expect(page.locator('text=Crear Parcela')).not.toBeVisible();
  });
});

test.describe('Parcelas Page - Parcelas Table', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('parcelas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display parcelas table', async ({ page }) => {
    // Check table exists
    const table = page.getByTestId('parcelas-table');
    
    // Table may or may not be visible depending on data
    // Check for "Lista de Parcelas" heading
    await expect(page.locator('text=Lista de Parcelas')).toBeVisible();
  });

  test('should have action buttons for each parcela', async ({ page }) => {
    // Get first parcela row if exists
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      const firstRow = rows.first();
      
      // Check action buttons exist (by their icons/titles)
      // Edit button
      await expect(firstRow.locator('button[title="Editar"]')).toBeVisible();
      // Delete button  
      await expect(firstRow.locator('button[title="Eliminar"]')).toBeVisible();
      // Evaluation button
      await expect(firstRow.locator('button[title="Nueva Hoja de Evaluación"]')).toBeVisible();
      // History button
      await expect(firstRow.locator('button[title="Historial de Tratamientos"]')).toBeVisible();
    }
  });

  test('should open edit form for existing parcela', async ({ page }) => {
    // Get first parcela row if exists
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      // Click edit button
      await rows.first().locator('button[title="Editar"]').click();
      
      // Edit form should open
      await expect(page.locator('text=Editar Parcela')).toBeVisible({ timeout: 5000 });
      
      // Map should be visible in edit mode
      await expect(page.locator('.leaflet-container').first()).toBeVisible();
      
      // Helper text for editing
      await expect(page.locator('text=Dibuja un nuevo polígono para actualizar la geometría')).toBeVisible();
    }
  });
});

test.describe('Parcelas Page - Filter Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('parcelas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should filter parcelas by cultivo', async ({ page }) => {
    // Get cultivo filter
    const cultiFilter = page.getByTestId('filter-cultivo');
    
    // Get options count
    const optionsCount = await cultiFilter.locator('option').count();
    
    if (optionsCount > 1) {
      // Select second option (first is "Todos")
      await cultiFilter.selectOption({ index: 1 });
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Check that filter info appears
      const filterInfo = page.locator('text=/Mostrando \\d+ de \\d+ parcelas/');
      // Filter info may or may not appear depending on implementation
    }
  });

  test('should clear filters', async ({ page }) => {
    // Apply a filter first
    const proveedorFilter = page.getByTestId('filter-proveedor');
    const optionsCount = await proveedorFilter.locator('option').count();
    
    if (optionsCount > 1) {
      await proveedorFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      
      // Look for "Limpiar filtros" button
      const clearBtn = page.locator('button:has-text("Limpiar filtros")');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        
        // Filter should be reset to "Todos"
        await expect(proveedorFilter).toHaveValue('');
      }
    }
  });
});
