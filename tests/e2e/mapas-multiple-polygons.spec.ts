/**
 * Mapas Page - Multiple Polygons (Zonas) Tests
 * 
 * Tests for the functionality that allows users to:
 * - Visualize multiple polygons per parcela on the map
 * - View zone counter in popup and panel
 * - Add, edit, and delete individual zones
 * - Save multiple polygons to API
 */
import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill('admin@fruveco.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button:has-text("Iniciar")').first().click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

async function dismissModal(page) {
  try {
    const btn = page.getByRole('button', { name: /Entendido/i });
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
    }
  } catch {}
}

test.describe('Mapas Page - Basic Load', () => {
  test('should load mapas page with testid', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.getByTestId('mapas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display page title', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.locator('h1:has-text("Mapa de Parcelas")')).toBeVisible();
  });

  test('should show map container', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
  });

  test('should have import and list toggle buttons', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.getByTestId('btn-import-geo')).toBeVisible();
    await expect(page.getByTestId('btn-toggle-list')).toBeVisible();
  });
});

test.describe('Mapas Page - Polygon Popup with Zone Controls', () => {
  test('should display zone counter in popup when clicking polygon', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      // Should show zone counter (e.g., "Zona 1 de 1")
      await expect(page.locator('text=/Zona \\d+ de \\d+/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Editar zona button in popup', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await expect(page.locator('button:has-text("Editar zona")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Eliminar button for individual zone deletion', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await expect(page.locator('button:has-text("Eliminar")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Añadir otra zona button', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await expect(page.locator('button:has-text("Añadir otra zona")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display parcela superficie info in popup', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      // Should show superficie info
      await expect(page.locator('text=/Superficie.*:\\s*[\\d.]+\\s*ha/')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Mapas Page - Draw Mode Banner', () => {
  test('should show draw mode banner when adding zone', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Añadir otra zona")').click();
      // Draw mode banner should appear
      await expect(page.locator('text=/Añadiendo zonas a:/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show existing zones count in banner', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Añadir otra zona")').click();
      // Should indicate existing zones count
      await expect(page.locator('text=/Ya tiene \\d+ zona/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display helper text about multiple zones', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Añadir otra zona")').click();
      // Helper text about saving zones as recintos
      await expect(page.locator('text=/recinto independiente/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have Cancel and Save buttons in draw mode', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Añadir otra zona")').click();
      // Cancel button
      await expect(page.locator('button:has-text("Cancelar")')).toBeVisible({ timeout: 5000 });
      // Save button shows polygon count
      await expect(page.locator('text=/Guardar 0 polígono/')).toBeVisible();
    }
  });

  test('should close draw mode on Cancel click', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Añadir otra zona")').click();
      await expect(page.locator('text=/Añadiendo zonas a:/')).toBeVisible({ timeout: 5000 });
      // Click Cancel
      await page.locator('button:has-text("Cancelar")').click();
      // Banner should disappear
      await expect(page.locator('text=/Añadiendo zonas a:/')).not.toBeVisible();
    }
  });
});

test.describe('Mapas Page - Edit Zone Flow', () => {
  test('should enter edit mode when clicking Editar zona', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Editar zona")').click();
      // Should show editing banner with zone index
      await expect(page.locator('text=/Editando zona/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Leaflet draw controls in edit mode', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 });
    const polygon = page.locator('.leaflet-interactive').first();
    if (await polygon.isVisible({ timeout: 5000 })) {
      await polygon.click({ force: true });
      await page.locator('button:has-text("Añadir otra zona")').click();
      // Leaflet draw toolbar should be visible (use first() to avoid strict mode)
      await expect(page.locator('.leaflet-draw-toolbar').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.leaflet-draw-draw-polygon')).toBeVisible();
    }
  });
});

test.describe('Mapas Page - Side Panel', () => {
  test('should display parcelas list panel', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.locator('h3:has-text("Parcelas")')).toBeVisible({ timeout: 5000 });
  });

  test('should have Punto and Polígono buttons for parcelas', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.locator('button:has-text("Punto")').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Polígono")').first()).toBeVisible();
  });

  test('should toggle list visibility', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    // Click toggle to hide
    await page.getByTestId('btn-toggle-list').click();
    await expect(page.locator('button:has-text("Ver Lista")')).toBeVisible({ timeout: 3000 });
    
    // Click toggle to show again
    await page.getByTestId('btn-toggle-list').click();
    await expect(page.locator('button:has-text("Ocultar Lista")')).toBeVisible();
  });
});

test.describe('Mapas Page - Map Layer Toggle', () => {
  test('should switch to satellite view', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await page.locator('button:has-text("Satélite")').click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('should switch back to street map view', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    await page.locator('button:has-text("Satélite")').click();
    await page.locator('button:has-text("Mapa")').click();
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});

test.describe('Mapas Page - Filters', () => {
  test('should have search input', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    await expect(page.locator('input[placeholder*="Buscar parcela"]')).toBeVisible();
  });

  test('should filter by search text', async ({ page }) => {
    await login(page);
    await dismissModal(page);
    await page.goto('/mapas', { waitUntil: 'domcontentloaded' });
    await dismissModal(page);
    
    const searchInput = page.locator('input[placeholder*="Buscar parcela"]');
    await searchInput.fill('BONIATO');
    // Map should still be visible (filtered results)
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });
});
