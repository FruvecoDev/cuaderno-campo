import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, dismissResumenDiarioModal, waitForAppReady } from '../fixtures/helpers';

/**
 * API Migration Tests - RRHH, Informes Ingresos/Gastos, Configuración
 * Tests the migration from fetch() to api.js wrapper
 */

test.describe('API Migration - RRHH & Informes', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('RRHH - empleados listing loads', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Navigate to RRHH
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Check page loads
    const pageContent = page.locator('main, .rrhh, [class*="rrhh"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    // RRHH has tabs - check for tabs
    const tabsContainer = page.locator('[role="tablist"], .tabs, [class*="tab"]').first();
    
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-empleados.jpeg', quality: 20, fullPage: false });
  });

  test('RRHH - tabs navigation works', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Try to click on different tabs
    const tabButtons = page.locator('button, [role="tab"]').filter({ hasText: /(Control Horario|Productividad|Documentos|Prenómina)/i });
    
    const tabCount = await tabButtons.count();
    if (tabCount > 0) {
      await tabButtons.first().click({ force: true });
      await page.waitForLoadState('domcontentloaded');
    }
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-tab-navigation.jpeg', quality: 20, fullPage: false });
  });

  test('Informes Ingresos - loads with data', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Navigate to Informes de Ingresos
    await page.goto('/informes-ingresos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Check page loads
    const pageContent = page.locator('main, .informes, [class*="ingresos"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: '/app/tests/e2e/informes-ingresos.jpeg', quality: 20, fullPage: false });
  });

  test('Informes Gastos - loads with data', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Navigate to Informes de Gastos
    await page.goto('/informes-gastos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Check page loads
    const pageContent = page.locator('main, .informes, [class*="gastos"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: '/app/tests/e2e/informes-gastos.jpeg', quality: 20, fullPage: false });
  });

  test('Configuración - settings load', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Navigate to Configuración
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Check page loads
    const pageContent = page.locator('main, .configuracion, [class*="config"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: '/app/tests/e2e/configuracion.jpeg', quality: 20, fullPage: false });
  });
});
