import { test, expect } from '@playwright/test';

/**
 * Tests for Recomendaciones page - specifically testing the horizontal counter layout
 */
test.describe('Recomendaciones Page Stats Layout', () => {
  
  // Helper to login and dismiss any modals
  async function loginAndNavigate(page: any, targetUrl: string) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Clear localStorage to avoid resumen diario modal
    await page.evaluate(() => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('resumen_diario_dismissed', today);
      localStorage.setItem('resumen_diario_shown', today);
    });
    
    // Fill login form - clear and fill properly
    const emailInput = page.locator('input').first();
    await emailInput.clear();
    await emailInput.fill('admin@fruveco.com');
    
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.clear();
    await passwordInput.fill('admin123');
    
    await page.locator('button:has-text("Iniciar Sesión")').click();
    
    // Wait for dashboard navigation
    await page.waitForURL(/\/(dashboard|parcelas)/, { timeout: 15000 });
    
    // Navigate to target page
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');
  }

  test('should navigate to Recomendaciones page', async ({ page }) => {
    await loginAndNavigate(page, '/recomendaciones');
    
    // Verify page loads by checking for the title
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('recomendaciones-page')).toBeVisible();
  });

  test('should display 4 stat counters in horizontal layout', async ({ page }) => {
    await loginAndNavigate(page, '/recomendaciones');
    
    // Wait for page content to load
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 10000 });
    
    // Check for the 4 stat counters - they should all be visible
    await expect(page.locator('text=Total').first()).toBeVisible();
    await expect(page.locator('text=Pendientes').first()).toBeVisible();
    await expect(page.locator('text=Programadas').first()).toBeVisible();
    await expect(page.locator('text=Aplicadas').first()).toBeVisible();
  });

  test('should have counters in a 4-column grid layout', async ({ page }) => {
    await loginAndNavigate(page, '/recomendaciones');
    
    // Wait for page content to load
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 10000 });
    
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
  });

  test('should show numeric values in stat counters', async ({ page }) => {
    await loginAndNavigate(page, '/recomendaciones');
    
    // Wait for stats to load
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 10000 });
    
    // Find the stat cards - they contain large numbers
    const totalCard = page.locator('.card').filter({ hasText: 'Total' }).first();
    await expect(totalCard).toBeVisible();
    
    // Look for the number element
    const numberElement = totalCard.locator('[style*="font-weight: 700"]').first();
    await expect(numberElement).toBeVisible();
    
    // Text content should be a number
    const text = await numberElement.textContent();
    expect(text).not.toBeNull();
    expect(parseInt(text || '0')).toBeGreaterThanOrEqual(0);
  });

  test('should display stats in horizontal row (not stacked)', async ({ page }) => {
    await loginAndNavigate(page, '/recomendaciones');
    
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 10000 });
    
    // Get positions of stat cards
    const totalCard = page.locator('.card').filter({ hasText: 'Total' }).first();
    const pendientesCard = page.locator('.card').filter({ hasText: 'Pendientes' }).first();
    const programadasCard = page.locator('.card').filter({ hasText: 'Programadas' }).first();
    const aplicadasCard = page.locator('.card').filter({ hasText: 'Aplicadas' }).first();
    
    // Wait for cards to be visible
    await expect(totalCard).toBeVisible();
    await expect(pendientesCard).toBeVisible();
    await expect(programadasCard).toBeVisible();
    await expect(aplicadasCard).toBeVisible();
    
    // Get bounding boxes
    const totalBox = await totalCard.boundingBox();
    const pendientesBox = await pendientesCard.boundingBox();
    const programadasBox = await programadasCard.boundingBox();
    const aplicadasBox = await aplicadasCard.boundingBox();
    
    expect(totalBox).not.toBeNull();
    expect(pendientesBox).not.toBeNull();
    expect(programadasBox).not.toBeNull();
    expect(aplicadasBox).not.toBeNull();
    
    // All cards should be on approximately the same Y position (horizontal layout)
    const tolerance = 15; // Allow small variation
    expect(Math.abs((totalBox?.y || 0) - (pendientesBox?.y || 0))).toBeLessThan(tolerance);
    expect(Math.abs((pendientesBox?.y || 0) - (programadasBox?.y || 0))).toBeLessThan(tolerance);
    expect(Math.abs((programadasBox?.y || 0) - (aplicadasBox?.y || 0))).toBeLessThan(tolerance);
    
    // Cards should be arranged from left to right
    expect((totalBox?.x || 0)).toBeLessThan(pendientesBox?.x || 0);
    expect((pendientesBox?.x || 0)).toBeLessThan(programadasBox?.x || 0);
    expect((programadasBox?.x || 0)).toBeLessThan(aplicadasBox?.x || 0);
  });

  test('should have colored borders for stat cards', async ({ page }) => {
    await loginAndNavigate(page, '/recomendaciones');
    
    await expect(page.locator('h1:has-text("Recomendaciones")')).toBeVisible({ timeout: 10000 });
    
    // Check that stat cards with borders exist (Pendientes has orange, Programadas has blue, Aplicadas has green)
    const pendientesCard = page.locator('.card[style*="border-left"]').filter({ hasText: 'Pendientes' });
    const programadasCard = page.locator('.card[style*="border-left"]').filter({ hasText: 'Programadas' });
    const aplicadasCard = page.locator('.card[style*="border-left"]').filter({ hasText: 'Aplicadas' });
    
    await expect(pendientesCard.first()).toBeVisible();
    await expect(programadasCard.first()).toBeVisible();
    await expect(aplicadasCard.first()).toBeVisible();
  });
});
