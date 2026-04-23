/**
 * Visual smoke tests for Recharts charts.
 *
 * Why? Recharts silently ignores invalid props without throwing errors,
 * so a chart can fail to render while the page itself loads OK.
 * ESLint (no-undef) cannot catch this either once props reach Recharts.
 *
 * These tests log in and navigate to every page that renders charts,
 * then assert that at least one `.recharts-wrapper` with an inner `<svg>`
 * becomes visible. If Recharts fails to mount, the test will fail loudly.
 */

import { test, expect, Page } from '@playwright/test';

async function removeOverlays(page: Page) {
  await page.evaluate(() => {
    const iframe = document.getElementById('webpack-dev-server-client-overlay');
    if (iframe) iframe.remove();

    document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());

    const badge = document.querySelector(
      '[class*="emergent"], [id*="emergent-badge"]'
    );
    if (badge) badge.remove();
  });
}

async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await removeOverlays(page);

  const emailInput = page.getByTestId('login-email');

  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill('admin@fruveco.com');
    await page.getByTestId('login-password').fill('admin123');
    await Promise.all([
      page.waitForURL('**/dashboard', { timeout: 15000 }),
      page.getByTestId('login-submit').click(),
    ]);
    await page.waitForLoadState('networkidle');
  }

  await removeOverlays(page);
}

/**
 * Asserts that Recharts wrappers are rendered with non-empty inner <svg>,
 * OR that the page is intentionally in an empty state ("no data" message).
 *
 * This distinguishes between "chart should render but failed" (bug) and
 * "no data to chart" (fine, expected in empty DB).
 */
async function assertChartsRenderOrEmpty(page: Page, minCharts: number = 1) {
  // Give Recharts time to mount via ResponsiveContainer
  await page.waitForTimeout(1500);

  const wrapperCount = await page.locator('.recharts-wrapper').count();

  if (wrapperCount === 0) {
    // No chart rendered — check if empty state is shown
    const emptyState = page.getByText(/No hay datos|Sin datos|No data/i).first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasEmptyState) {
      test.info().annotations.push({
        type: 'skipped-chart-assertion',
        description: 'Page shows empty-state message; no chart to validate.',
      });
      return;
    }
    // Otherwise fail loudly
    expect(wrapperCount, 'Expected at least one .recharts-wrapper or an empty-state message').toBeGreaterThanOrEqual(minCharts);
  }

  // Charts present — validate they actually rendered
  const wrapper = page.locator('.recharts-wrapper').first();
  await expect(wrapper).toBeVisible({ timeout: 10000 });
  expect(wrapperCount).toBeGreaterThanOrEqual(minCharts);

  const svgCount = await page.locator('.recharts-wrapper svg').count();
  expect(svgCount).toBeGreaterThanOrEqual(minCharts);

  const firstBox = await page.locator('.recharts-wrapper svg').first().boundingBox();
  expect(firstBox).not.toBeNull();
  if (firstBox) {
    expect(firstBox.width).toBeGreaterThan(0);
    expect(firstBox.height).toBeGreaterThan(0);
  }
}

test.describe('Visual smoke tests - Recharts rendering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard renders at least one chart', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await removeOverlays(page);

    // Scroll to ensure charts (lower in the page) mount via ResponsiveContainer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(800);

    await assertChartsRenderOrEmpty(page, 1);
  });

  test('Informes de Gastos - chart view renders charts', async ({ page }) => {
    await page.goto('/informes-gastos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await removeOverlays(page);

    // Switch to chart view
    const chartBtn = page.getByTestId('btn-view-chart');
    await expect(chartBtn).toBeVisible({ timeout: 10000 });
    await chartBtn.click();
    await page.waitForTimeout(800);

    await assertChartsRenderOrEmpty(page, 1);
  });

  test('Informes de Ingresos - chart view renders charts', async ({ page }) => {
    await page.goto('/informes-ingresos', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await removeOverlays(page);

    // Switch to "Gráficos" view (button contains the text)
    const chartToggle = page.locator('button:has-text("Gráficos")').first();
    await expect(chartToggle).toBeVisible({ timeout: 10000 });
    await chartToggle.click();
    await page.waitForTimeout(800);

    await assertChartsRenderOrEmpty(page, 1);
  });

  test('No Recharts console errors across chart pages', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore noisy, unrelated 3rd-party console errors
        if (
          /recharts|is not defined|Cannot read|undefined is not/i.test(text)
        ) {
          errors.push(`console.error: ${text}`);
        }
      }
    });

    for (const path of ['/dashboard', '/informes-gastos', '/informes-ingresos']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await removeOverlays(page);

      // Activate chart view on reports pages
      if (path === '/informes-gastos') {
        await page.getByTestId('btn-view-chart').click().catch(() => {});
      } else if (path === '/informes-ingresos') {
        await page.locator('button:has-text("Gráficos")').first().click().catch(() => {});
      }

      await page.waitForTimeout(800);
    }

    if (errors.length > 0) {
      console.log('Chart-related errors captured:\n' + errors.join('\n'));
    }
    expect(errors, `Found chart-related JS errors:\n${errors.join('\n')}`).toHaveLength(0);
  });
});
