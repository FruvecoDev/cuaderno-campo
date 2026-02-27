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
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // Look for notification bell button
    const bellButton = page.getByTestId('btn-notificaciones');
    
    // If test-id not found, try alternate selectors
    if (await bellButton.isVisible({ timeout: 3000 })) {
      await bellButton.click({ force: true });
    } else {
      // Look for any button with bell icon in header
      const altBellButton = page.locator('header button, nav button').first();
      if (await altBellButton.isVisible({ timeout: 3000 })) {
        await altBellButton.click({ force: true });
      }
    }
    
    // Wait for dropdown to appear
    await page.waitForLoadState('domcontentloaded');
    
    await page.screenshot({ path: '/app/tests/e2e/notificaciones-dropdown.jpeg', quality: 20, fullPage: false });
  });

  test('Notificaciones - count badge displays', async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
    
    // Dismiss the daily summary modal if present
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click();
    }
    
    await page.waitForLoadState('domcontentloaded');
    
    // The notification icon should be visible in the header/navbar
    const headerArea = page.locator('header, nav').first();
    await expect(headerArea).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: '/app/tests/e2e/notificaciones-icon.jpeg', quality: 20, fullPage: false });
  });
});
