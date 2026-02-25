import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

test.describe('Fincas Module - Page Load and Stats', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    
    // Navigate to Fincas page
    await page.locator('nav a, aside a, .sidebar a')
      .filter({ hasText: /fincas/i })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');
    await removeEmergentBadge(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display Fincas page with stats', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1').filter({ hasText: /fincas/i })).toBeVisible();
    
    // Verify statistics cards are displayed
    await expect(page.locator('text=Total Fincas')).toBeVisible();
    await expect(page.locator('text=Fincas Propias')).toBeVisible();
    await expect(page.locator('text=Alquiladas')).toBeVisible();
    await expect(page.locator('text=Total Hectáreas')).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    await expect(page.getByTestId('filtros-fincas')).toBeVisible();
    await expect(page.getByTestId('input-filtro-buscar')).toBeVisible();
    await expect(page.getByTestId('select-filtro-provincia')).toBeVisible();
    await expect(page.getByTestId('select-filtro-tipo')).toBeVisible();
  });

  test('should have Nueva Finca button', async ({ page }) => {
    await expect(page.getByTestId('btn-nueva-finca')).toBeVisible();
  });
});
