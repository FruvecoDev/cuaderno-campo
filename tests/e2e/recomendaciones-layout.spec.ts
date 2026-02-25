import { test, expect } from '@playwright/test';

/**
 * Tests for Recomendaciones page - specifically testing the horizontal counter layout
 * These tests use a more robust login approach
 */
test.describe('Recomendaciones Page Stats Layout', () => {
  
  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    // Dismiss resumen diario for future navigation
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('resumen_diario_dismissed', today);
      localStorage.setItem('resumen_diario_shown', today);
    });
    
    // Login directly - use triple click to select all text first
    const emailInput = page.locator('input').first();
    await emailInput.click({ clickCount: 3 });
    await emailInput.fill('admin@fruveco.com');
    
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.fill('admin123');
    
    // Click login button and wait for response
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login') && resp.status() === 200),
      page.locator('button:has-text("Iniciar Sesión")').click()
    ]);
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|recomendaciones|parcelas)/, { timeout: 15000 });
    
    // Navigate to recomendaciones
    await page.goto('/recomendaciones', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to stabilize
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 15000 });
  });

  test('should display page title and data-testid', async ({ page }) => {
    await expect(page.getByTestId('recomendaciones-page')).toBeVisible();
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible();
  });

  test('should display 4 stat counters', async ({ page }) => {
    // Check for the 4 stat counters - they should all be visible
    await expect(page.locator('.card').filter({ hasText: 'Total' }).first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Pendientes' }).first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Programadas' }).first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Aplicadas' }).first()).toBeVisible();
  });

  test('should have counters in horizontal 4-column grid layout', async ({ page }) => {
    // Find the stats container - it should use grid with 4 columns
    const statsContainer = page.locator('[style*="grid-template-columns: repeat(4"]');
    await expect(statsContainer.first()).toBeVisible();
    
    // Get the computed style to verify 4 columns
    const gridStyle = await statsContainer.first().evaluate((el: HTMLElement) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });
    
    // Should have 4 columns (format: "XXpx XXpx XXpx XXpx" or similar)
    const columnCount = gridStyle.split(' ').length;
    expect(columnCount).toBe(4);
    
    // Verify cards are in same row (horizontal layout)
    const totalCard = page.locator('.card').filter({ hasText: 'Total' }).first();
    const pendientesCard = page.locator('.card').filter({ hasText: 'Pendientes' }).first();
    
    const totalBox = await totalCard.boundingBox();
    const pendientesBox = await pendientesCard.boundingBox();
    
    expect(totalBox).not.toBeNull();
    expect(pendientesBox).not.toBeNull();
    
    // Y positions should be similar (same row)
    expect(Math.abs((totalBox?.y || 0) - (pendientesBox?.y || 0))).toBeLessThan(20);
    
    // Total should be to the left of Pendientes
    expect((totalBox?.x || 0)).toBeLessThan(pendientesBox?.x || 0);
  });

  test('should have colored borders for Pendientes, Programadas, Aplicadas', async ({ page }) => {
    // Cards should have colored left borders - look at all cards with border-left
    const pendientesCard = page.locator('.card[style*="border-left"]').filter({ hasText: 'Pendientes' }).first();
    const programadasCard = page.locator('.card[style*="border-left"]').filter({ hasText: 'Programadas' }).first();
    const aplicadasCard = page.locator('.card[style*="border-left"]').filter({ hasText: 'Aplicadas' }).first();
    
    await expect(pendientesCard).toBeVisible();
    await expect(programadasCard).toBeVisible();
    await expect(aplicadasCard).toBeVisible();
    
    // Take screenshot to verify visual appearance
    await page.screenshot({ path: 'recomendaciones-stats.jpeg', quality: 20, fullPage: false });
  });
});
