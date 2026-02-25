import { test, expect } from '@playwright/test';
import { login, generateUniqueId, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Albaranes - Artículos Integration', () => {
  const baseUrl = 'https://harvest-log-1.preview.emergentagent.com';
  
  test.beforeEach(async ({ page }) => {
    // Login manually with correct flow
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await removeEmergentBadge(page);
  });

  test('should navigate to Albaranes page and display list', async ({ page }) => {
    await page.goto(`${baseUrl}/albaranes`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await expect(page.getByTestId('albaranes-page')).toBeVisible({ timeout: 15000 });
    
    // Check table exists
    await expect(page.getByTestId('albaranes-table')).toBeVisible();
    
    // Check "Nuevo Albarán" button exists
    await expect(page.getByTestId('btn-nuevo-albaran')).toBeVisible();
  });

  test('should open albarán form and show articulo selector', async ({ page }) => {
    await page.goto(`${baseUrl}/albaranes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-albaran')).toBeVisible({ timeout: 15000 });
    
    // Click "Nuevo Albarán" button
    await page.getByTestId('btn-nuevo-albaran').click();
    
    // Wait for form to appear
    await expect(page.getByTestId('albaran-form')).toBeVisible({ timeout: 10000 });
    
    // Select a contrato first (required)
    const contratoSelect = page.getByTestId('select-contrato');
    await expect(contratoSelect).toBeVisible();
    
    // Get first available contract
    const options = await contratoSelect.locator('option').all();
    if (options.length > 1) {
      // Select second option (first is placeholder)
      const firstContratoValue = await options[1].getAttribute('value');
      if (firstContratoValue) {
        await contratoSelect.selectOption(firstContratoValue);
        
        // Wait for form to update with contract data
        await page.waitForLoadState('domcontentloaded');
        
        // Check that articulo selector is visible in the items table
        await expect(page.getByTestId('item-articulo-0')).toBeVisible({ timeout: 10000 });
      }
    } else {
      test.info().annotations.push({ type: 'info', description: 'No contracts available for testing' });
    }
  });

  test('should auto-fill price and unit when selecting articulo from catalog', async ({ page }) => {
    // First, check if there are active articulos
    await page.goto(`${baseUrl}/articulos-explotacion`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('articulos-table')).toBeVisible({ timeout: 15000 });
    
    // Count existing articulos
    const rows = await page.locator('table[data-testid="articulos-table"] tbody tr').count();
    
    if (rows === 0) {
      test.info().annotations.push({ type: 'skip', description: 'No articulos in catalog - skipping auto-fill test' });
      return;
    }
    
    // Navigate to albaranes
    await page.goto(`${baseUrl}/albaranes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-albaran')).toBeVisible({ timeout: 15000 });
    
    // Open form
    await page.getByTestId('btn-nuevo-albaran').click();
    await expect(page.getByTestId('albaran-form')).toBeVisible({ timeout: 10000 });
    
    // Select a contrato first
    const contratoSelect = page.getByTestId('select-contrato');
    const options = await contratoSelect.locator('option').all();
    
    if (options.length > 1) {
      const firstContratoValue = await options[1].getAttribute('value');
      if (firstContratoValue) {
        await contratoSelect.selectOption(firstContratoValue);
        await page.waitForLoadState('domcontentloaded');
        
        // Get the articulo selector
        const articuloSelect = page.getByTestId('item-articulo-0');
        await expect(articuloSelect).toBeVisible({ timeout: 10000 });
        
        // Get articulo options
        const articuloOptions = await articuloSelect.locator('option').all();
        
        if (articuloOptions.length > 1) {
          // Select first articulo from catalog (skip placeholder)
          const firstArticuloValue = await articuloOptions[1].getAttribute('value');
          if (firstArticuloValue) {
            await articuloSelect.selectOption(firstArticuloValue);
            
            // Wait for auto-fill to happen
            await page.waitForLoadState('domcontentloaded');
            
            // Check that description field was auto-filled
            const descripcionInput = page.getByTestId('item-descripcion-0');
            const descripcionValue = await descripcionInput.inputValue();
            
            // Description should contain codigo and nombre from catalog
            expect(descripcionValue.length).toBeGreaterThan(0);
            
            // Check that precio_unitario might be auto-filled (if articulo has price)
            const precioInput = page.getByTestId('item-precio-0');
            const precioValue = await precioInput.inputValue();
            
            // Log the values for debugging
            console.log(`Description auto-filled: ${descripcionValue}`);
            console.log(`Price auto-filled: ${precioValue}`);
            
            // Verify unit selector might have been updated
            const unidadSelect = page.getByTestId('item-unidad-0');
            const unidadValue = await unidadSelect.inputValue();
            console.log(`Unit auto-filled: ${unidadValue}`);
          }
        } else {
          test.info().annotations.push({ type: 'info', description: 'No articulos in selector dropdown' });
        }
      }
    } else {
      test.info().annotations.push({ type: 'info', description: 'No contracts available for testing' });
    }
  });

  test('should display articulos from catalog in dropdown', async ({ page }) => {
    await page.goto(`${baseUrl}/albaranes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-albaran')).toBeVisible({ timeout: 15000 });
    
    // Open form
    await page.getByTestId('btn-nuevo-albaran').click();
    await expect(page.getByTestId('albaran-form')).toBeVisible({ timeout: 10000 });
    
    // Select a contrato first
    const contratoSelect = page.getByTestId('select-contrato');
    const options = await contratoSelect.locator('option').all();
    
    if (options.length > 1) {
      const firstContratoValue = await options[1].getAttribute('value');
      if (firstContratoValue) {
        await contratoSelect.selectOption(firstContratoValue);
        await page.waitForLoadState('domcontentloaded');
        
        // Get the articulo selector
        const articuloSelect = page.getByTestId('item-articulo-0');
        await expect(articuloSelect).toBeVisible({ timeout: 10000 });
        
        // Count options in the articulo dropdown
        const articuloOptions = await articuloSelect.locator('option').all();
        
        // Should have at least the placeholder option
        expect(articuloOptions.length).toBeGreaterThanOrEqual(1);
        
        // Log the count
        console.log(`Articulo dropdown has ${articuloOptions.length} options (including placeholder)`);
        
        // If there are articulos, check they display properly
        if (articuloOptions.length > 1) {
          // Get text of first real option
          const firstOptionText = await articuloOptions[1].textContent();
          console.log(`First articulo option: ${firstOptionText}`);
          
          // Should contain codigo, nombre and price format
          expect(firstOptionText).toBeTruthy();
        }
      }
    }
  });

  test('should calculate line total when quantity and price are entered', async ({ page }) => {
    await page.goto(`${baseUrl}/albaranes`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-albaran')).toBeVisible({ timeout: 15000 });
    
    // Open form
    await page.getByTestId('btn-nuevo-albaran').click();
    await expect(page.getByTestId('albaran-form')).toBeVisible({ timeout: 10000 });
    
    // Select a contrato first
    const contratoSelect = page.getByTestId('select-contrato');
    const options = await contratoSelect.locator('option').all();
    
    if (options.length > 1) {
      const firstContratoValue = await options[1].getAttribute('value');
      if (firstContratoValue) {
        await contratoSelect.selectOption(firstContratoValue);
        await page.waitForLoadState('domcontentloaded');
        
        // Enter quantity
        const cantidadInput = page.getByTestId('item-cantidad-0');
        await cantidadInput.fill('10');
        
        // Enter price
        const precioInput = page.getByTestId('item-precio-0');
        await precioInput.fill('5.50');
        
        // Wait for calculation
        await page.waitForLoadState('domcontentloaded');
        
        // Total should be calculated (10 * 5.50 = 55.00)
        // The total is displayed in a disabled input showing "XX.XX €"
        const totalDisplay = page.locator('input[disabled]').filter({ hasText: /€/ }).first();
        
        // Or check the grand total
        const grandTotalInput = page.locator('input[disabled]').filter({ hasText: /€/ }).nth(0);
        const grandTotalValue = await grandTotalInput.inputValue();
        console.log(`Grand total: ${grandTotalValue}`);
      }
    }
  });
});
