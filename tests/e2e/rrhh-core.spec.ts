import { test, expect, Page } from '@playwright/test';

// Helper functions
async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Check if login page visible (login form)
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first();
  
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    const loginBtn = page.locator('button:has-text("Iniciar"), button[type="submit"]').first();
    await loginBtn.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Dismiss modal
  await dismissOverlays(page);
}

async function navigateToRRHH(page: Page) {
  await dismissOverlays(page);
  await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.page-title:has-text("Recursos Humanos")')).toBeVisible({ timeout: 10000 });
  await dismissOverlays(page);
}

async function dismissOverlays(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
  
  try {
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 2000 })) {
      await entendidoBtn.click();
    }
  } catch {}
}

test.describe('RRHH Module - Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display employee list and stats', async ({ page }) => {
    await expect(page.getByText('Total Empleados').first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: /Activos/ }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Código/i })).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-employees-list.jpeg', quality: 20 });
  });

  test('should display time clock tab with stats', async ({ page }) => {
    await page.getByRole('button', { name: /Control Horario/i }).click();
    await expect(page.getByText('Fichados Hoy').first()).toBeVisible();
    await expect(page.getByText('Total Activos').first()).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-time-clock.jpeg', quality: 20 });
  });

  test('should display documents tab', async ({ page }) => {
    await page.getByRole('button', { name: /Documentos/i }).click();
    await expect(page.getByText('Total Documentos').first()).toBeVisible();
    await expect(page.getByText('Pendientes de Firma').first()).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-documents.jpeg', quality: 20 });
  });

  test('should display productivity stats', async ({ page }) => {
    await page.getByRole('button', { name: /Productividad/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Productividad en Tiempo Real').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: '/app/tests/e2e/rrhh-productivity.jpeg', quality: 20 });
  });

  test('should display prenomina tab', async ({ page }) => {
    await page.getByRole('button', { name: /Prenómina/i }).click();
    await expect(page.getByRole('button', { name: /Calcular Prenóminas/i })).toBeVisible();
    await expect(page.getByText('Total Bruto:')).toBeVisible();
    await page.screenshot({ path: '/app/tests/e2e/rrhh-prenomina.jpeg', quality: 20 });
  });
});
