import { test, expect, Page } from '@playwright/test';

async function setupPage(page: Page) {
  // Remove all overlays including webpack error overlay
  await page.evaluate(() => {
    // Remove webpack dev server overlay
    const iframe = document.getElementById('webpack-dev-server-client-overlay');
    if (iframe) iframe.remove();
    
    // Remove modal overlays
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(m => m.remove());
    
    // Remove emergent badge
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await setupPage(page);
  
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
  
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.click();
    await emailInput.clear();
    await emailInput.fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().clear();
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button:has-text("Iniciar")').first().click();
    await page.waitForLoadState('networkidle');
  }
  
  await setupPage(page);
}

async function navigateToRRHH(page: Page) {
  await setupPage(page);
  await page.getByTestId('nav-recursos humanos').click({ force: true });
  await page.waitForLoadState('networkidle');
  await setupPage(page);
  await expect(page.locator('h1.page-title')).toContainText('Recursos Humanos', { timeout: 10000 });
}

test.describe('RRHH Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('Employees tab - display stats', async ({ page }) => {
    await setupPage(page);
    await expect(page.getByText('Total Empleados').first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: /Activos/ }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Código/i })).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-employees.jpeg', quality: 20 });
  });

  test('Control Horario tab', async ({ page }) => {
    await setupPage(page);
    await page.getByRole('button', { name: /Control Horario/i }).click({ force: true });
    await setupPage(page);
    await expect(page.getByText('Fichados Hoy').first()).toBeVisible();
    await expect(page.getByText('Total Activos').first()).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-control-horario.jpeg', quality: 20 });
  });

  test('Documents tab', async ({ page }) => {
    await setupPage(page);
    await page.getByRole('button', { name: /Documentos/i }).click({ force: true });
    await setupPage(page);
    await expect(page.getByText('Total Documentos').first()).toBeVisible();
    await expect(page.getByText('Pendientes de Firma').first()).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-documents.jpeg', quality: 20 });
  });

  test('Productivity tab', async ({ page }) => {
    await setupPage(page);
    await page.getByRole('button', { name: /Productividad/i }).click({ force: true });
    await page.waitForLoadState('networkidle');
    await setupPage(page);
    await expect(page.getByText('Productividad en Tiempo Real').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: '/app/tests/e2e/rrhh-productivity.jpeg', quality: 20 });
  });

  test('Prenomina tab', async ({ page }) => {
    await setupPage(page);
    await page.getByRole('button', { name: /Prenómina/i }).click({ force: true });
    await setupPage(page);
    await expect(page.getByRole('button', { name: /Calcular Prenóminas/i })).toBeVisible();
    await expect(page.getByText('Total Bruto:')).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-prenomina.jpeg', quality: 20 });
  });
});
