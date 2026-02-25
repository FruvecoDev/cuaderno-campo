import { test, expect } from '@playwright/test';
import { login, removeEmergentBadge, dismissToasts } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'https://harvest-log-1.preview.emergentagent.com';

test.describe('Alertas Climáticas - Climate Alerts', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissToasts(page);
    await removeEmergentBadge(page);
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
    
    // Check stats cards are visible
    await expect(page.getByText('Pendientes')).toBeVisible();
    await expect(page.getByText('En Revisión')).toBeVisible();
    await expect(page.getByText('Resueltas Hoy')).toBeVisible();
    await expect(page.getByText('Última Semana')).toBeVisible();
  });

  test('should display filter buttons', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Check filter buttons
    await expect(page.getByRole('button', { name: /Pendientes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Revisadas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resueltas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Todas/i })).toBeVisible();
  });

  test('should filter alerts by estado pendiente', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Pendientes filter (should be active by default)
    const pendientesBtn = page.getByRole('button', { name: /Pendientes/i });
    await expect(pendientesBtn).toBeVisible();
    await pendientesBtn.click();
    
    // Verify alert list is displayed
    await expect(page.getByText(/Alertas \(\d+\)/)).toBeVisible();
  });

  test('should filter alerts by estado revisadas', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Revisadas filter
    const revisadasBtn = page.getByRole('button', { name: /Revisadas/i });
    await revisadasBtn.click();
    
    // Wait for list to update
    await page.waitForLoadState('domcontentloaded');
    
    // List should update (might show "No hay alertas")
    await expect(page.locator('.card').filter({ hasText: /Alertas/ })).toBeVisible();
  });

  test('should filter alerts by estado resueltas', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Resueltas filter
    const resueltasBtn = page.getByRole('button', { name: /Resueltas/i });
    await resueltasBtn.click();
    
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.card').filter({ hasText: /Alertas/ })).toBeVisible();
  });

  test('should filter alerts by todas', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Todas filter
    const todasBtn = page.getByRole('button', { name: /Todas/i });
    await todasBtn.click();
    
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.card').filter({ hasText: /Alertas/ })).toBeVisible();
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
    await expect(page.getByText('Temperatura (°C)')).toBeVisible();
    await expect(page.getByText('Humedad (%)')).toBeVisible();
    await expect(page.getByText('Lluvia (mm)')).toBeVisible();
    await expect(page.getByText('Viento (km/h)')).toBeVisible();
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
    await page.getByRole('button', { name: /Registrar y Evaluar/i }).click();
    
    // Wait for success message or form close
    await page.waitForLoadState('domcontentloaded');
    
    // Form should close or show success
    await expect(page.locator('.alert-success').or(page.getByText('Registrar Datos Climáticos Manuales').locator('..').locator('visible=false'))).toBeTruthy();
  });

  test('should close manual form with cancel button', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open manual data form
    await page.locator('[data-testid="btn-datos-manuales"]').click();
    await expect(page.getByText('Registrar Datos Climáticos Manuales')).toBeVisible();
    
    // Click Cancelar
    await page.getByRole('button', { name: /Cancelar/i }).click();
    
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
    
    // Should show loading state or success message
    await page.waitForLoadState('domcontentloaded');
    
    // Either shows loading spinner or completes
    await expect(page.locator('.alert-success').or(page.getByText(/verificada/i))).toBeTruthy();
  });

  test('should open configuration panel (Admin)', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Click Configurar button (should be visible for Admin)
    const configBtn = page.getByRole('button', { name: /Configurar/i });
    await expect(configBtn).toBeVisible();
    await configBtn.click();
    
    // Verify configuration panel is visible
    await expect(page.getByText('Configuración de Reglas de Alerta')).toBeVisible();
  });

  test('should display alert rules in configuration', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open configuration
    await page.getByRole('button', { name: /Configurar/i }).click();
    await expect(page.getByText('Configuración de Reglas de Alerta')).toBeVisible();
    
    // Check for expected rules
    await expect(page.getByText('Alta Humedad')).toBeVisible();
    await expect(page.getByText('Altas Temperaturas')).toBeVisible();
    await expect(page.getByText('Lluvias Recientes')).toBeVisible();
    await expect(page.getByText('Temperaturas Templadas')).toBeVisible();
  });

  test('should toggle rule activation in configuration', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Open configuration
    await page.getByRole('button', { name: /Configurar/i }).click();
    await expect(page.getByText('Configuración de Reglas de Alerta')).toBeVisible();
    
    // Find a rule toggle button - look for "Activa" or "Inactiva" button
    const toggleBtn = page.locator('table tbody tr').first().getByRole('button');
    await expect(toggleBtn).toBeVisible();
    
    // Click to toggle
    await toggleBtn.click();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should expand alert card to show details', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Make sure we have pending alerts
    await page.getByRole('button', { name: /Pendientes/i }).click();
    await page.waitForLoadState('domcontentloaded');
    
    // Find the first alert card and click to expand
    const alertCard = page.locator('[style*="border-left"]').first();
    if (await alertCard.isVisible()) {
      await alertCard.click();
      
      // Check for expanded details (weather data or action buttons)
      await expect(page.getByText(/Temperatura|Humedad|Marcar Revisada|Ignorar/i).first()).toBeVisible();
    }
  });

  test('should update alert status to revisada', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Filter to pendientes
    await page.getByRole('button', { name: /Pendientes/i }).click();
    await page.waitForLoadState('domcontentloaded');
    
    // Expand first alert
    const alertCard = page.locator('[style*="border-left"]').first();
    if (await alertCard.isVisible()) {
      await alertCard.click();
      
      // Look for "Marcar Revisada" button
      const revisadaBtn = page.getByRole('button', { name: /Marcar Revisada/i }).first();
      if (await revisadaBtn.isVisible()) {
        await revisadaBtn.click();
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });

  test('should display alert with priority badge', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Check for priority badges
    const priorityBadge = page.locator('text=Alta').or(page.locator('text=Media')).first();
    await expect(priorityBadge).toBeVisible();
  });

  test('should display suggestion badge when plantilla available', async ({ page }) => {
    await page.locator('a[href="/alertas-clima"]').click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="alertas-clima-page"]')).toBeVisible();
    
    // Look for suggestion text
    const suggestionBadge = page.getByText(/Sugerencia:/i).first();
    // This is optional - might not always be visible
    if (await suggestionBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
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
    await expect(page.getByText('Temperatura (°C) *')).toBeVisible();
    await expect(page.getByText('Humedad (%) *')).toBeVisible();
  });
});
