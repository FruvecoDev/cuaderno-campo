/**
 * E2E test: Proveedores - tab "Agentes por Cultivo".
 * Verifies that the new tab renders and an association can be added.
 */
import { test, expect, Page } from '@playwright/test';

async function removeOverlays(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());
  });
}

async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await removeOverlays(page);
  await page.getByTestId('login-email').fill('admin@fruveco.com');
  await page.getByTestId('login-password').fill('admin123');
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 15000 }),
    page.getByTestId('login-submit').click(),
  ]);
  await page.waitForLoadState('networkidle');
}

test.describe('Proveedores - Agentes por Cultivo', () => {
  test('Tab visible and can add an association', async ({ page }) => {
    await login(page);
    await page.goto('/proveedores', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await removeOverlays(page);

    // Open first proveedor in edit mode
    const editBtn = page.locator('table button:has(svg.lucide-square-pen), table button:has(svg.lucide-pen)').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click({ force: true });
    await page.waitForTimeout(600);
    await removeOverlays(page);

    // Switch to "Agentes por Cultivo" tab
    const agentesTab = page.getByTestId('tab-agentes');
    await expect(agentesTab).toBeVisible({ timeout: 5000 });
    await agentesTab.click({ force: true });
    await page.waitForTimeout(400);

    // Add an association
    await page.getByTestId('add-agente-cultivo-btn').click({ force: true });
    await page.waitForTimeout(300);

    // The new row must exist with its select
    const cultivoSelect = page.getByTestId('agente-cultivo-select-0');
    await expect(cultivoSelect).toBeVisible({ timeout: 5000 });

    // Remove the row again
    await page.getByTestId('agente-cultivo-remove-0').click({ force: true });
    await expect(cultivoSelect).not.toBeVisible({ timeout: 3000 });
  });
});
