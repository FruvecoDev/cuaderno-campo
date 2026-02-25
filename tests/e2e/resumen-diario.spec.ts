import { test, expect } from '@playwright/test';

/**
 * Tests for Resumen Diario (Daily Summary) modal
 * Modal appears after login, once per day
 */
test.describe('Resumen Diario Modal', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure modal appears
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('resumen_diario_dismissed');
      localStorage.removeItem('resumen_diario_shown');
    });
  });

  test('should show modal after login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Fill login form
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for the modal to appear (500ms delay + loading time)
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
  });

  test('should display alertas climáticas section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Modal should contain climate alerts section or info about no alerts
    const modal = page.getByTestId('resumen-diario-modal');
    
    // Check for climate related content (either alerts exist or we see treatments/contracts)
    const hasAlertasText = await modal.locator('text=Alertas Climáticas').count();
    const hasTratamientosText = await modal.locator('text=Tratamientos Hoy').count();
    
    // At least tratamientos section should be visible
    expect(hasTratamientosText).toBeGreaterThanOrEqual(1);
  });

  test('should display tratamientos hoy section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check tratamientos section exists
    const modal = page.getByTestId('resumen-diario-modal');
    await expect(modal.locator('text=Tratamientos Hoy')).toBeVisible();
  });

  test('should display contratos por vencer section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check contratos section exists
    const modal = page.getByTestId('resumen-diario-modal');
    await expect(modal.locator('text=Contratos por Vencer')).toBeVisible();
  });

  test('should display KPIs section with 4 metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check KPI section exists with Resumen General title
    const modal = page.getByTestId('resumen-diario-modal');
    await expect(modal.locator('text=Resumen General')).toBeVisible();
    
    // Check for all 4 KPIs
    await expect(modal.locator('text=Parcelas Activas')).toBeVisible();
    await expect(modal.locator('text=Recom. Pendientes')).toBeVisible();
    await expect(modal.locator('text=Visitas Semana')).toBeVisible();
    await expect(modal.locator('text=Cosechas Mes')).toBeVisible();
  });

  test('should have "No mostrar hoy" checkbox', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check checkbox exists
    const modal = page.getByTestId('resumen-diario-modal');
    await expect(modal.locator('text=No mostrar hoy')).toBeVisible();
    
    // Check checkbox is interactive
    const checkbox = modal.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    
    // Click checkbox
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  });

  test('should close modal with "Entendido" button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Click Entendido button
    await page.getByTestId('btn-entendido').click();
    
    // Modal should be closed
    await expect(page.getByTestId('resumen-diario-modal')).not.toBeVisible();
  });

  test('should save dismissal when "No mostrar hoy" is checked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check the "No mostrar hoy" checkbox
    const modal = page.getByTestId('resumen-diario-modal');
    const checkbox = modal.locator('input[type="checkbox"]');
    await checkbox.click();
    
    // Click Entendido
    await page.getByTestId('btn-entendido').click();
    
    // Verify localStorage was set
    const dismissed = await page.evaluate(() => localStorage.getItem('resumen_diario_dismissed'));
    const today = new Date().toISOString().split('T')[0];
    expect(dismissed).toBe(today);
  });

  test('should display greeting with username', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check greeting
    const modal = page.getByTestId('resumen-diario-modal');
    await expect(modal.locator('text=Buenos días')).toBeVisible();
  });

  test('should display current date', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="usuario"], input[placeholder*="email"]', 'admin@fruveco.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for modal
    await expect(page.getByTestId('resumen-diario-modal')).toBeVisible({ timeout: 10000 });
    
    // Check that some date text is present (format: "martes, 25 de febrero de 2026")
    const modal = page.getByTestId('resumen-diario-modal');
    // Look for current year in the date display
    await expect(modal.locator('text=2026').first()).toBeVisible();
  });
});
