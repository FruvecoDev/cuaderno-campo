import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, dismissResumenDiarioModal, waitForAppReady } from '../fixtures/helpers';

/**
 * Core API Migration Tests
 * Tests the migration from fetch() to api.js wrapper
 * Covers: Login, Dashboard, Contratos, Parcelas, Tratamientos
 */

test.describe('API Migration - Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Login with admin credentials', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Check login page loads
    await expect(page.locator('text=Cuaderno de Campo')).toBeVisible();
    
    // Fill login form
    await page.locator('input[type="email"], input[placeholder*="email"]').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    
    // Click login
    await page.locator('button:has-text("Iniciar")').first().click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    
    // Verify dashboard loaded
    await expect(page).toHaveURL(/dashboard/);
  });

  test('Dashboard loads KPIs and metrics', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Dashboard should show after login
    await expect(page).toHaveURL(/dashboard/);
    
    // Wait for dashboard content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for KPI cards (they should exist regardless of exact values)
    // Look for common dashboard elements
    const dashboardContent = page.locator('main, .dashboard, [class*="dashboard"]').first();
    await expect(dashboardContent).toBeVisible({ timeout: 10000 });
    
    // Take screenshot for verification
    await page.screenshot({ path: '/app/tests/e2e/dashboard-loaded.jpeg', quality: 20, fullPage: false });
  });

  test('Contratos - listing loads correctly', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Contratos using sidebar
    await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    // Wait a moment for modal to close and page to render
    await page.waitForLoadState('domcontentloaded');
    
    // Check for table or data elements - the page content should be visible
    const tableOrContent = page.locator('table, [class*="card"], [class*="list"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/contratos-list.jpeg', quality: 20, fullPage: false });
  });

  test('Parcelas - listing loads correctly', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Parcelas
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check for table or data elements
    const tableOrContent = page.locator('table, [class*="card"], [class*="list"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/parcelas-list.jpeg', quality: 20, fullPage: false });
  });

  test('Tratamientos - listing loads correctly', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Navigate to Tratamientos
    await page.goto('/tratamientos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Check for table or data elements
    const tableOrContent = page.locator('table, [class*="card"], [class*="list"]').first();
    await expect(tableOrContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/tratamientos-list.jpeg', quality: 20, fullPage: false });
  });
});
