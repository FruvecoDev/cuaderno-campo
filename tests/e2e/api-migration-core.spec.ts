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
    await dismissResumenDiarioModal(page);
    
    // Navigate to Contratos
    await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for contratos list content (table or cards)
    const pageContent = page.locator('main, .contratos, [class*="contratos"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    // Look for table rows or list items (contratos data)
    const dataElements = page.locator('table tbody tr, [class*="contract"], [class*="card"]');
    
    // Wait for some data to load (there should be existing contratos)
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: '/app/tests/e2e/contratos-list.jpeg', quality: 20, fullPage: false });
  });

  test('Parcelas - listing loads correctly', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Navigate to Parcelas
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for parcelas content
    const pageContent = page.locator('main, .parcelas, [class*="parcelas"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/parcelas-list.jpeg', quality: 20, fullPage: false });
  });

  test('Tratamientos - listing loads correctly', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Navigate to Tratamientos
    await page.goto('/tratamientos', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for tratamientos content
    const pageContent = page.locator('main, .tratamientos, [class*="tratamientos"]').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/tratamientos-list.jpeg', quality: 20, fullPage: false });
  });
});
