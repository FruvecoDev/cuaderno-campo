/**
 * E2E test: NFC assignment UI in RRHH employee form.
 *
 * Verifies:
 *  - The NFC section is visible in "Datos Laborales" tab when editing.
 *  - Manual assign flow saves NFC ID and shows success message.
 *  - Remove flow clears the NFC ID.
 */

import { test, expect, Page } from '@playwright/test';

const TEST_NFC = `E2E-NFC-${Date.now()}`;

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

test.describe('RRHH - NFC assignment from employee form', () => {
  test('Assign and remove NFC on an employee', async ({ page }) => {
    // Accept the confirm() dialog that remove triggers
    page.on('dialog', (d) => d.accept());

    await login(page);
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await removeOverlays(page);

    // Open edit on first employee row
    const editBtns = page.locator('table button:has(svg)').filter({
      has: page.locator('.lucide-pen, .lucide-square-pen'),
    });
    await expect(editBtns.first()).toBeVisible({ timeout: 10000 });
    await editBtns.first().click({ force: true });
    await page.waitForTimeout(600);
    await removeOverlays(page);

    // Switch to "Datos Laborales" tab
    await page.getByRole('button', { name: /Datos Laborales/i }).click({ force: true });
    await page.waitForTimeout(400);

    // NFC section should be present
    const nfcInput = page.getByTestId('empleado-nfc-input');
    await expect(nfcInput).toBeVisible({ timeout: 5000 });
    await nfcInput.scrollIntoViewIfNeeded();

    // Type manual NFC ID and assign
    await nfcInput.fill(TEST_NFC);
    await page.getByTestId('empleado-nfc-assign').click({ force: true });

    // Success message should mention the NFC ID
    const msg = page.getByTestId('empleado-nfc-message');
    await expect(msg).toBeVisible({ timeout: 5000 });
    await expect(msg).toContainText(TEST_NFC);

    // Now remove the NFC
    await page.getByTestId('empleado-nfc-remove').click({ force: true });
    await expect(msg).toContainText(/eliminada/i, { timeout: 5000 });
    await expect(nfcInput).toHaveValue('');
  });
});
