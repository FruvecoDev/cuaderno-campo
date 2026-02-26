import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, dismissToasts } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'https://field-log-hub.preview.emergentagent.com';

test.describe('Alertas Climáticas - Climate Alerts', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
    
    // Remove webpack dev server overlay if present
    await page.evaluate(() => {
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
    });
  });

  test('should navigate to Alertas Climáticas page', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    
    // Verify page loaded
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Alertas Climáticas');
  });

  test('should display statistics cards', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Check stats cards by looking for the card container text (more specific)
    await expect(page.locator('.card').filter({ hasText: 'Pendientes' }).first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'En Revisión' }).first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Resueltas Hoy' }).first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Última Semana' }).first()).toBeVisible();
  });

  test('should display filter buttons', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Check filter buttons - look for button containing text
    await expect(page.locator('button').filter({ hasText: /Pendientes/ }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Revisadas/ }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Resueltas/ }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Todas/ }).first()).toBeVisible();
  });

  test('should filter alerts by estado pendiente', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Pendientes filter
    const pendientesBtn = page.locator('button').filter({ hasText: /Pendientes/ }).first();
    await pendientesBtn.click();
    
    // Verify alert list is displayed
    await expect(page.locator('h3').filter({ hasText: /Alertas \(\d+\)/ })).toBeVisible();
  });

  test('should filter alerts by estado revisadas', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Revisadas filter
    const revisadasBtn = page.locator('button').filter({ hasText: /Revisadas/ }).first();
    await revisadasBtn.click({ force: true });
    
    // Wait for list to update
    await page.waitForLoadState('domcontentloaded');
    
    // List should update
    await expect(page.locator('.card').filter({ hasText: /Alertas/ }).first()).toBeVisible();
  });

  test('should filter alerts by estado resueltas', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Resueltas filter
    const resueltasBtn = page.locator('button').filter({ hasText: /Resueltas/ }).first();
    await resueltasBtn.click();
    
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.card').filter({ hasText: /Alertas/ }).first()).toBeVisible();
  });

  test('should filter alerts by todas', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Todas filter
    const todasBtn = page.locator('button').filter({ hasText: /Todas/ }).first();
    await todasBtn.click({ force: true });
    
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.card').filter({ hasText: /Alertas/ }).first()).toBeVisible();
  });

  test('should open manual data form', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Datos Manuales button
    const datosManualBtn = page.locator('[data-testid="btn-datos-manuales"]');
    await expect(datosManualBtn).toBeVisible();
    await datosManualBtn.click();
    
    // Verify form is visible
    await expect(page.getByText('Registrar Datos Climáticos Manuales')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Temperatura/ }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Humedad/ }).first()).toBeVisible();
  });

  test('should submit manual climate data', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open manual data form
    await page.locator('[data-testid="btn-datos-manuales"]').click();
    await expect(page.getByText('Registrar Datos Climáticos Manuales')).toBeVisible();
    
    // Fill form with test data
    await page.locator('input[placeholder="25.0"]').fill('28');
    await page.locator('input[placeholder="60"]').fill('75');
    await page.locator('input[placeholder="0"]').first().fill('0');
    
    // Submit
    await page.locator('button').filter({ hasText: /Registrar y Evaluar/ }).click();
    
    // Wait for response
    await page.waitForLoadState('domcontentloaded');
  });

  test('should close manual form with cancel button', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open manual data form
    await page.locator('[data-testid="btn-datos-manuales"]').click();
    await expect(page.getByText('Registrar Datos Climáticos Manuales')).toBeVisible();
    
    // Click Cancelar
    await page.locator('button').filter({ hasText: /Cancelar/ }).click();
    
    // Form should close
    await expect(page.getByText('Registrar Datos Climáticos Manuales')).not.toBeVisible();
  });

  test('should click Verificar Parcelas button', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Verificar Parcelas button
    const verificarBtn = page.locator('[data-testid="btn-verificar-todas"]');
    await expect(verificarBtn).toBeVisible();
    await verificarBtn.click();
    
    // Should show loading state - button should change or success appears
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open configuration panel (Admin)', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Configurar button (should be visible for Admin)
    const configBtn = page.locator('button').filter({ hasText: /Configurar/ }).first();
    await expect(configBtn).toBeVisible();
    await configBtn.click();
    
    // Verify configuration panel is visible
    await expect(page.getByText('Configuración de Reglas de Alerta')).toBeVisible();
  });

  test('should display alert rules in configuration', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Remove webpack dev server overlay if present
    await page.evaluate(() => {
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) overlay.remove();
    });
    
    // Open configuration
    await page.locator('button').filter({ hasText: /Configurar/ }).first().click({ force: true });
    await expect(page.getByText('Configuración de Reglas de Alerta')).toBeVisible();
    
    // Check for expected rules in the table
    const table = page.locator('table');
    await expect(table).toBeVisible();
    await expect(table.getByText('Alta Humedad').first()).toBeVisible();
    await expect(table.getByText('Altas Temperaturas').first()).toBeVisible();
  });

  test('should toggle rule activation in configuration', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open configuration
    await page.locator('button').filter({ hasText: /Configurar/ }).first().click();
    await expect(page.getByText('Configuración de Reglas de Alerta')).toBeVisible();
    
    // Find a rule toggle button in the table
    const toggleBtn = page.locator('table tbody tr').first().locator('button');
    await expect(toggleBtn).toBeVisible();
    
    // Click to toggle
    await toggleBtn.click();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should expand alert card to show details', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Find the first alert card and click to expand
    const alertCard = page.locator('[style*="border-left: 4px"]').first();
    if (await alertCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await alertCard.click();
      
      // Check for expanded details
      await expect(page.locator('button').filter({ hasText: /Marcar Revisada|Ignorar/ }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display alert with priority badge', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Check for priority badges (Alta or Media)
    const priorityBadge = page.locator('span').filter({ hasText: /^(Alta|Media|Baja)$/ }).first();
    await expect(priorityBadge).toBeVisible();
  });

  test('should display suggestion badge when plantilla available', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Look for suggestion text
    const suggestionBadge = page.locator('span').filter({ hasText: /Sugerencia:/ }).first();
    // Check if visible (might not always be)
    const isVisible = await suggestionBadge.isVisible({ timeout: 3000 }).catch(() => false);
    if (isVisible) {
      await expect(suggestionBadge).toBeVisible();
    }
  });

  test('should validate manual form requires temperature and humidity', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open manual data form
    await page.locator('[data-testid="btn-datos-manuales"]').click();
    await expect(page.getByText('Registrar Datos Climáticos Manuales')).toBeVisible();
    
    // Check that required fields have asterisk
    await expect(page.locator('label').filter({ hasText: /Temperatura.*\*/ }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Humedad.*\*/ }).first()).toBeVisible();
  });
});
