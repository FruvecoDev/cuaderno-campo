import { Page, expect } from '@playwright/test';

const BACKEND_URL = process.env.BASE_URL || 'https://field-log-hub.preview.emergentagent.com';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
    async () => {
      const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
      await close.first().click({ timeout: 2000 }).catch(() => {});
    },
    { times: 10, noWaitAfter: true }
  );
}

export async function login(page: Page, email: string = 'admin@fruveco.com', password: string = 'admin123') {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  
  // Check if already logged in (redirected to dashboard)
  const url = page.url();
  if (url.includes('/dashboard')) {
    return;
  }
  
  // Fill login form
  await page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  
  // Click login button (could be type="submit" or just a button with "Iniciar" text)
  const loginBtn = page.locator('button:has-text("Iniciar"), button[type="submit"]').first();
  await loginBtn.click();
  
  // Wait for redirect to dashboard or authenticated area with longer timeout
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

export async function navigateToPage(page: Page, pageName: string) {
  // Ensure we're logged in
  const url = page.url();
  if (url.includes('/login') || url === '/') {
    await login(page);
  }
  
  // Click on sidebar link - look for the nav item by text
  const navLink = page.locator(`nav a, aside a, .sidebar a`).filter({ hasText: new RegExp(pageName, 'i') }).first();
  
  if (await navLink.isVisible()) {
    await navLink.click();
    await page.waitForLoadState('domcontentloaded');
  }
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

export async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

export async function dismissResumenDiarioModal(page: Page) {
  // Try to close the ResumenDiario modal if present
  try {
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 2000 })) {
      await entendidoBtn.click();
    }
  } catch {
    // Modal not present, continue
  }
  
  // Also remove webpack dev server overlay
  await page.evaluate(() => {
    const iframe = document.getElementById('webpack-dev-server-client-overlay');
    if (iframe) iframe.remove();
    
    // Remove any modal overlay that might be blocking
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
      if (overlay) overlay.remove();
    });
  });
}

export function generateUniqueId(): string {
  return `TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
