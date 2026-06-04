/**
 * Visual regression: Proveedores tab bar must fit (or scroll horizontally)
 * within the modal even when all 7 tabs are rendered.
 *
 * Asserts the "Historial" tab is reachable (either visible directly or via
 * horizontal scroll inside the tab bar).
 */
import { test, expect, Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.getByTestId('login-email').fill('admin@fruveco.com');
  await page.getByTestId('login-password').fill('admin123');
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 15000 }),
    page.getByTestId('login-submit').click(),
  ]);
  await page.waitForLoadState('networkidle');
}

test('Proveedores: tab "Historial" is reachable in the modal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await page.goto('/proveedores', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Dismiss any overlay that could block click
  await page.evaluate(() => {
    document.querySelectorAll('.modal-overlay, [id*="emergent-badge"]').forEach(m => m.remove());
  });

  // Open first proveedor (use accessible title)
  const editBtn = page.getByRole('button', { name: /editar proveedor/i }).first();
  await expect(editBtn).toBeVisible({ timeout: 10000 });
  await editBtn.click({ force: true });
  // Wait for modal to mount + data load
  await expect(page.getByRole('heading', { name: /Editar Proveedor/i })).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);

  const tab = page.getByTestId('tab-historial');
  await expect(tab).toBeAttached({ timeout: 5000 });

  // Scroll horizontally inside the tab bar if needed
  await tab.scrollIntoViewIfNeeded();
  await expect(tab).toBeVisible({ timeout: 3000 });
  await tab.click({ force: true });
});
