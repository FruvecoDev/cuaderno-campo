import { test, expect, Page } from '@playwright/test';

// Helper functions
async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  
  // Check if login page visible (login form)
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first();
  
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.click();
    await emailInput.clear();
    await emailInput.fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().clear();
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button:has-text("Iniciar"), button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle');
  }
  
  // Dismiss the ResumenDiario modal
  await dismissResumenDiario(page);
}

async function dismissResumenDiario(page: Page) {
  // Remove Emergent badge
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
  
  // Close the ResumenDiario modal by clicking "Entendido"
  try {
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 3000 })) {
      await entendidoBtn.click({ force: true });
      // Wait for modal to close
      await page.waitForTimeout(500);
    }
  } catch {}
  
  // Also try to remove any modal overlay
  await page.evaluate(() => {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(m => m.remove());
  });
}

async function navigateToRRHH(page: Page) {
  // Dismiss modal first
  await dismissResumenDiario(page);
  
  // Click on RRHH in sidebar using force click
  const rrhhLink = page.getByTestId('nav-recursos humanos');
  await rrhhLink.click({ force: true });
  
  // Wait for RRHH page to load
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1.page-title')).toContainText('Recursos Humanos', { timeout: 10000 });
  
  // Dismiss any modal again
  await dismissResumenDiario(page);
}

test.describe('RRHH Module - Core Features', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display employee list and stats', async ({ page }) => {
    // Verify KPI cards are visible
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
