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
    
    // Navigate to RRHH
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present - must wait for it to be visible
    try {
      const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
      await expect(entendidoBtn).toBeVisible({ timeout: 5000 });
      await entendidoBtn.click();
    } catch {
      // Modal not present
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check for visible RRHH table headers or employee data
    const visibleContent = page.locator('th, td, [class*="table"]').first();
    await expect(visibleContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-empleados.jpeg', quality: 20, fullPage: false });
  });

  test('RRHH - tabs navigation works', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Try to click on different tabs - look for tab buttons
    const tabButtons = page.locator('button').filter({ hasText: /(Control Horario|Productividad|Documentos|Prenómina)/i });
    
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
    
    // Navigate to Informes de Ingresos
    await page.goto('/informes-ingresos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check page loads
    const tableOrContent = page.locator('table, [class*="card"], [class*="report"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/informes-ingresos.jpeg', quality: 20, fullPage: false });
  });

  test('Informes Gastos - loads with data', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Informes de Gastos
    await page.goto('/informes-gastos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check page loads
    const tableOrContent = page.locator('table, [class*="card"], [class*="report"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/informes-gastos.jpeg', quality: 20, fullPage: false });
  });

  test('Configuración - settings load', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Configuración
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present - must wait for it to be visible
    try {
      const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
      await expect(entendidoBtn).toBeVisible({ timeout: 5000 });
      await entendidoBtn.click();
    } catch {
      // Modal not present
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check for visible configuration content - look for Logo section or theme options
    const visibleContent = page.locator('h2, h3, [class*="logo"], [class*="theme"]').first();
    await expect(visibleContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/configuracion.jpeg', quality: 20, fullPage: false });
  });
});
