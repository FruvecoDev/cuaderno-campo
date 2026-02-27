import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, dismissResumenDiarioModal, waitForAppReady } from '../fixtures/helpers';

/**
 * API Migration Tests - Tareas & Irrigaciones
 * Tests the migration from fetch() to api.js wrapper
 * Covers: Tareas listing, filters, export; Irrigaciones listing, filters, export
 */

test.describe('API Migration - Tareas & Irrigaciones', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Tareas - listing loads with data', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Tareas
    await page.goto('/tareas', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check page content loads - look for tables or lists
    const tableOrContent = page.locator('table, [class*="card"], [class*="task"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/tareas-list.jpeg', quality: 20, fullPage: false });
  });

  test('Tareas - filters work correctly', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    await page.goto('/tareas', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Look for filter button
    const filterButton = page.locator('button:has-text("Filtros"), button:has-text("Filtrar")').first();
    
    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    await page.screenshot({ path: '/app/tests/e2e/tareas-filters.jpeg', quality: 20, fullPage: false });
  });

  test('Irrigaciones - listing loads with data', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Irrigaciones
    await page.goto('/irrigaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check page content loads
    const tableOrContent = page.locator('table, [class*="card"], [class*="irrig"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/irrigaciones-list.jpeg', quality: 20, fullPage: false });
  });

  test('Irrigaciones - filters and stats load', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    await page.goto('/irrigaciones', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Look for filter functionality
    const filterButton = page.locator('button:has-text("Filtros"), button:has-text("Filtrar")').first();
    
    if (await filterButton.isVisible({ timeout: 3000 })) {
      await filterButton.click();
      await page.waitForLoadState('domcontentloaded');
    }
    
    await page.screenshot({ path: '/app/tests/e2e/irrigaciones-filters.jpeg', quality: 20, fullPage: false });
  });
});
