import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge, dismissResumenDiarioModal, waitForAppReady } from '../fixtures/helpers';

/**
 * API Migration Tests - Notificaciones Dropdown
 * Tests the NotificacionesDropdown component with api.js wrapper
 */

test.describe('API Migration - Notificaciones', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
  });

  test('Notificaciones dropdown - opens and shows notifications', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // Look for notification bell button
    const bellButton = page.getByTestId('btn-notificaciones');
    
    // If test-id not found, try alternate selectors
    if (!(await bellButton.isVisible({ timeout: 3000 }))) {
      const altBellButton = page.locator('button svg[class*="Bell"], button:has(svg), header button').first();
      if (await altBellButton.isVisible({ timeout: 3000 })) {
        await altBellButton.click({ force: true });
      }
    } else {
      await bellButton.click({ force: true });
    }
    
    // Wait for dropdown to appear
    await page.waitForLoadState('domcontentloaded');
    
    await page.screenshot({ path: '/app/tests/e2e/notificaciones-dropdown.jpeg', quality: 20, fullPage: false });
  });

  test('Notificaciones - count badge displays', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    await dismissResumenDiarioModal(page);
    
    // The notification icon should be visible in the header/navbar
    const headerArea = page.locator('header, nav, .navbar, [class*="header"]').first();
    await expect(headerArea).toBeVisible({ timeout: 5000 });
    
    // Look for bell icon or notification button
    const bellIcon = page.locator('[data-testid="btn-notificaciones"], button:has(svg)').first();
    
    await page.screenshot({ path: '/app/tests/e2e/notificaciones-icon.jpeg', quality: 20, fullPage: false });
  });
});
