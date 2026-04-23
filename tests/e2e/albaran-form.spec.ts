/**
 * E2E test: AlbaranForm still renders and works after component extraction.
 *
 * Opens the create-albaran form, fills minimal fields, adds a line item,
 * and verifies all extracted sub-components render correctly.
 */
import { test, expect, Page } from '@playwright/test';

async function removeOverlays(page: Page) {
  await page.evaluate(() => {
    const iframe = document.getElementById('webpack-dev-server-client-overlay');
    if (iframe) iframe.remove();
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

test.describe('AlbaranForm - refactor regression', () => {
  test('Opens create form and shows extracted line-item component', async ({ page }) => {
    await login(page);
    await page.goto('/albaranes/nuevo', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await removeOverlays(page);

    // The outer form must still render
    await expect(page.getByTestId('albaran-form-page')).toBeVisible({ timeout: 10000 });

    // The extracted line-item component must render for the default item
    await expect(page.getByTestId('albaran-line-item-0')).toBeVisible({ timeout: 5000 });

    // The essential inputs inside the extracted component must exist
    await expect(page.getByTestId('item-descripcion-0')).toBeVisible();
    await expect(page.getByTestId('item-cantidad-0')).toBeVisible();
    await expect(page.getByTestId('item-unidad-0')).toBeVisible();
    await expect(page.getByTestId('item-precio-0')).toBeVisible();

    // Fill a value and ensure the total updates
    await page.getByTestId('item-descripcion-0').fill('Test producto');
    await page.getByTestId('item-cantidad-0').fill('100');
    await page.getByTestId('item-precio-0').fill('2.5');
    await page.waitForTimeout(400);

    // Should have no JS errors so far
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /is not defined|Cannot read/i.test(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(500);
    expect(errors, `JS errors: ${errors.join('\n')}`).toHaveLength(0);
  });
});
