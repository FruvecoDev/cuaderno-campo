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
    await page.waitForTimeout(2000);
    await removeOverlays(page);
    await page.evaluate(() => {
      document.querySelectorAll('[id*="emergent-badge"]').forEach(m => m.remove());
    });

    // Open first proveedor in edit mode
    const editBtn = page.getByRole('button', { name: /editar proveedor/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click({ force: true });
    await expect(page.getByRole('heading', { name: /Editar Proveedor/i })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);
    await removeOverlays(page);

    // Switch to "Agentes por Cultivo" tab
    const agentesTab = page.getByTestId('tab-agentes');
    await expect(agentesTab).toBeVisible({ timeout: 5000 });
    await agentesTab.click({ force: true });
    await page.waitForTimeout(400);

    // Count rows before adding
    const beforeCount = await page.locator('[data-testid^="agente-cultivo-row-"]').count();

    // Add an association
    await page.getByTestId('add-agente-cultivo-btn').click({ force: true });
    await page.waitForTimeout(300);

    // There must now be one more row than before
    const afterAddCount = await page.locator('[data-testid^="agente-cultivo-row-"]').count();
    expect(afterAddCount).toBe(beforeCount + 1);

    // The new row's select must be visible
    const newSelect = page.getByTestId(`agente-cultivo-select-${afterAddCount - 1}`);
    await expect(newSelect).toBeVisible({ timeout: 5000 });

    // Remove the newly added row
    await page.getByTestId(`agente-cultivo-remove-${afterAddCount - 1}`).click({ force: true });
    await page.waitForTimeout(300);
    const afterRemoveCount = await page.locator('[data-testid^="agente-cultivo-row-"]').count();
    expect(afterRemoveCount).toBe(beforeCount);
  });
});
