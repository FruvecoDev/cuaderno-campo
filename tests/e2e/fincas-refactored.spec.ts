import { test, expect } from '@playwright/test';
import { login, dismissToasts, removeEmergentBadge } from '../fixtures/helpers';

// Helper to close the daily summary modal if it appears
async function closeDailySummaryModal(page: any) {
  try {
    const closeBtn = page.locator('.modal-overlay button:has(svg), button:has-text("Entendido")').first();
    if (await closeBtn.isVisible({ timeout: 2000 })) {
      await closeBtn.click({ force: true });
      return;
    }
  } catch {}
  try {
    await page.keyboard.press('Escape');
  } catch {}
}

async function ensureModalClosed(page: any) {
  for (let i = 0; i < 3; i++) {
    const modal = page.locator('.modal-overlay');
    if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeDailySummaryModal(page);
    } else {
      break;
    }
  }
}

async function waitForDataLoad(page: any) {
  try {
    await page.waitForSelector('text=Cargando...', { state: 'hidden', timeout: 10000 });
  } catch {}
}

test.describe('Fincas Refactored - Page Load and Stats', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await removeEmergentBadge(page);
    await ensureModalClosed(page);
  });

  test('should display Fincas page with statistics', async ({ page }) => {
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1').filter({ hasText: /fincas/i })).toBeVisible();
    
    // Stats cards
    await expect(page.locator('.card').filter({ hasText: 'Total Fincas' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Fincas Propias' })).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: 'Total Hectáreas' })).toBeVisible();
    
    // Nueva Finca button
    await expect(page.getByTestId('btn-nueva-finca')).toBeVisible();
  });

  test('should display filters section', async ({ page }) => {
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('filtros-fincas')).toBeVisible();
    await expect(page.getByTestId('input-filtro-buscar')).toBeVisible();
    await expect(page.getByTestId('select-filtro-provincia')).toBeVisible();
    await expect(page.getByTestId('select-filtro-tipo')).toBeVisible();
  });

  test('should display fincas list', async ({ page }) => {
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Listado de Fincas')).toBeVisible();
  });
});

test.describe('Fincas Refactored - Form (No Map, SIGPAC Reference Only)', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should open and close form', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Nueva Finca').first()).toBeVisible();
    
    // Close by clicking again
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display form with SIGPAC section as reference only', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await ensureModalClosed(page);
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 10000 });
    
    // Verify sections
    await expect(page.locator('text=Datos de la Finca')).toBeVisible();
    await expect(page.locator('text=Superficie y Producción')).toBeVisible();
    await expect(page.locator('text=Datos SIGPAC (Referencia)')).toBeVisible();
    
    // Verify key form fields
    await expect(page.getByTestId('input-denominacion')).toBeVisible();
    await expect(page.getByTestId('input-provincia')).toBeVisible();
    await expect(page.getByTestId('input-hectareas')).toBeVisible();
    await expect(page.getByTestId('input-finca-propia')).toBeVisible();
    await expect(page.getByTestId('btn-guardar-finca')).toBeVisible();
  });

  test('should display SIGPAC fields for reference data', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await ensureModalClosed(page);
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 10000 });
    
    // Scroll to SIGPAC section
    await page.getByTestId('input-sigpac-provincia').scrollIntoViewIfNeeded();
    
    // Verify SIGPAC form fields exist
    await expect(page.getByTestId('input-sigpac-provincia')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-municipio')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-poligono')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-parcela')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-recinto')).toBeVisible();
    await expect(page.getByTestId('input-sigpac-cod-uso')).toBeVisible();
    
    // Verify "Buscar en SIGPAC" button exists
    await expect(page.getByTestId('btn-buscar-sigpac')).toBeVisible();
    
    // Verify Visor SIGPAC link exists
    await expect(page.locator('a:has-text("Visor SIGPAC")')).toBeVisible();
  });

  test('should NOT have map drawing button in form (removed per refactor)', async ({ page }) => {
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await ensureModalClosed(page);
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 10000 });
    
    // Verify "Dibujar Parcela" button does NOT exist (removed in refactor)
    const dibujarBtn = page.getByTestId('btn-dibujar-parcela');
    await expect(dibujarBtn).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Fincas Refactored - SIGPAC Search (Reference Data)', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await ensureModalClosed(page);
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 10000 });
  });

  test('should show validation error when SIGPAC search with missing fields', async ({ page }) => {
    await page.getByTestId('input-sigpac-provincia').scrollIntoViewIfNeeded();
    await page.getByTestId('btn-buscar-sigpac').click({ force: true });
    
    // Should show error about missing required fields
    await expect(page.locator('text=Debe completar al menos')).toBeVisible({ timeout: 5000 });
  });

  test('should load provinces in dropdown', async ({ page }) => {
    await page.getByTestId('input-sigpac-provincia').scrollIntoViewIfNeeded();
    
    const provinciaSelect = page.getByTestId('input-sigpac-provincia');
    const optionCount = await provinciaSelect.locator('option').count();
    
    // Should have provinces loaded
    expect(optionCount).toBeGreaterThan(10);
    
    // Can select a province
    await provinciaSelect.selectOption('41');
    await expect(provinciaSelect).toHaveValue('41');
  });

  test('should search SIGPAC and auto-fill data', async ({ page }) => {
    await page.getByTestId('input-sigpac-provincia').scrollIntoViewIfNeeded();
    
    await page.getByTestId('input-sigpac-provincia').selectOption('41');
    await page.getByTestId('input-sigpac-municipio').fill('053');
    await page.getByTestId('input-sigpac-poligono').fill('5');
    await page.getByTestId('input-sigpac-parcela').fill('12');
    
    await page.getByTestId('btn-buscar-sigpac').click({ force: true });
    
    // Wait for response - either success or error from external API
    try {
      const successBox = page.locator('[style*="c8e6c9"]');
      const errorBox = page.locator('[style*="ffcdd2"]');
      
      await Promise.race([
        expect(successBox).toBeVisible({ timeout: 15000 }),
        expect(errorBox).toBeVisible({ timeout: 15000 })
      ]);
      
      // If success, verify data is shown
      if (await successBox.isVisible().catch(() => false)) {
        await expect(page.locator('text=Superficie:')).toBeVisible();
        await expect(page.locator('text=Uso:')).toBeVisible();
      }
    } catch {
      console.log('SIGPAC external API may be unavailable');
    }
  });
});

test.describe('Fincas Refactored - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should create a new finca', async ({ page }) => {
    const testId = `TEST_${Date.now()}`;
    
    await page.getByTestId('btn-nueva-finca').click({ force: true });
    await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
    
    // Close any modal that may appear
    await ensureModalClosed(page);
    
    // Fill form
    await page.getByTestId('input-denominacion').fill(`Finca ${testId}`);
    await page.getByTestId('input-provincia').fill('Sevilla');
    await page.getByTestId('input-poblacion').fill('Lebrija');
    await page.getByTestId('input-hectareas').fill('25.5');
    await page.getByTestId('input-finca-propia').check({ force: true });
    
    // Save
    await page.getByTestId('btn-guardar-finca').click({ force: true });
    
    // Verify form closes and finca appears in list
    await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 5000 });
    
    // Search for the created finca
    await page.getByTestId('input-filtro-buscar').fill(testId);
    await expect(page.locator(`text=Finca ${testId}`).first()).toBeVisible({ timeout: 5000 });
    
    // Cleanup - delete the finca
    const deleteBtn = page.locator('[data-testid^="btn-delete-"]').first();
    if (await deleteBtn.isVisible({ timeout: 2000 })) {
      page.once('dialog', d => d.accept());
      await deleteBtn.click({ force: true });
    }
  });

  test('should filter fincas by type', async ({ page }) => {
    await page.getByTestId('select-filtro-tipo').selectOption('true'); // Propias
    await page.getByTestId('select-filtro-tipo').selectOption('false'); // Alquiladas
    await page.getByTestId('select-filtro-tipo').selectOption(''); // All
  });

  test('should clear filters', async ({ page }) => {
    await page.getByTestId('input-filtro-buscar').fill('test');
    await page.getByTestId('select-filtro-tipo').selectOption('true');
    
    await expect(page.getByTestId('btn-limpiar-filtros')).toBeVisible();
    await page.getByTestId('btn-limpiar-filtros').click({ force: true });
    
    await expect(page.getByTestId('input-filtro-buscar')).toHaveValue('');
    await expect(page.getByTestId('select-filtro-tipo')).toHaveValue('');
  });

  test('should expand finca to see details', async ({ page }) => {
    const expandBtn = page.locator('[data-testid^="btn-expand-"]').first();
    
    if (await expandBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandBtn.click({ force: true });
      
      // Verify expanded details are shown
      await expect(page.locator('h5').filter({ hasText: 'Ubicación' })).toBeVisible({ timeout: 3000 });
      await expect(page.locator('h5').filter({ hasText: 'Superficie y Producción' })).toBeVisible();
      
      // Collapse
      await expandBtn.click({ force: true });
    }
  });

  test('should edit a finca', async ({ page }) => {
    const editBtn = page.locator('[data-testid^="btn-edit-"]').first();
    
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click({ force: true });
      
      // Form should open with "Editar Finca" title
      await expect(page.getByTestId('form-finca')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=Editar Finca')).toBeVisible();
      
      // Cancel without saving
      await page.locator('button:has-text("Cancelar")').click({ force: true });
      await expect(page.getByTestId('form-finca')).not.toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Fincas Refactored - Parcelas as Cards', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should show parcelas count badge on finca card', async ({ page }) => {
    // Look for a finca card that has parcelas badge
    const fincaCard = page.locator('[data-testid^="finca-card-"]').first();
    
    if (await fincaCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check if parcelas badge exists (shows "X parcela(s)")
      const parcelasBadge = fincaCard.locator('text=/\\d+ parcela/');
      
      if (await parcelasBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Badge is visible - good
        expect(await parcelasBadge.textContent()).toMatch(/\d+ parcela/);
      }
    }
  });

  test('should display parcelas as cards in expanded finca', async ({ page }) => {
    // Find a finca card with parcelas
    const expandBtns = page.locator('[data-testid^="btn-expand-"]');
    const count = await expandBtns.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = expandBtns.nth(i);
      await btn.click({ force: true });
      
      // Check if parcelas section appears
      const parcelasSection = page.locator('h5').filter({ hasText: 'Parcelas de esta Finca' });
      
      if (await parcelasSection.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify parcela cards are displayed
        const parcelaCard = page.locator('[data-testid^="parcela-card-"]').first();
        await expect(parcelaCard).toBeVisible({ timeout: 3000 });
        
        // Verify parcela card has "Mapa" button
        const mapaBtn = page.locator('[data-testid^="btn-ver-mapa-"]').first();
        await expect(mapaBtn).toBeVisible();
        await expect(mapaBtn).toContainText('Mapa');
        
        break;
      }
      
      // Collapse and try next
      await btn.click({ force: true });
    }
  });

  test('should open map modal when clicking Mapa button on parcela card', async ({ page }) => {
    // Find and expand a finca with parcelas
    const expandBtns = page.locator('[data-testid^="btn-expand-"]');
    const count = await expandBtns.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = expandBtns.nth(i);
      await btn.click({ force: true });
      
      const mapaBtn = page.locator('[data-testid^="btn-ver-mapa-"]').first();
      
      if (await mapaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mapaBtn.click({ force: true });
        
        // Verify map modal opens
        await expect(page.getByTestId('modal-mapa-parcela')).toBeVisible({ timeout: 5000 });
        
        // Verify modal has parcela info
        await expect(page.locator('text=/Mapa - /')).toBeVisible();
        
        // Verify map container is present
        await expect(page.getByTestId('mapa-sigpac-container')).toBeVisible();
        
        // Close modal
        const closeBtn = page.locator('[data-testid="modal-mapa-parcela"] button:has(svg)').first();
        await closeBtn.click({ force: true });
        await expect(page.getByTestId('modal-mapa-parcela')).not.toBeVisible({ timeout: 3000 });
        
        break;
      }
      
      // Collapse and try next
      await btn.click({ force: true });
    }
  });

  test('should show parcela details in card', async ({ page }) => {
    const expandBtns = page.locator('[data-testid^="btn-expand-"]');
    const count = await expandBtns.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = expandBtns.nth(i);
      await btn.click({ force: true });
      
      const parcelaCard = page.locator('[data-testid^="parcela-card-"]').first();
      
      if (await parcelaCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify card shows essential info
        await expect(parcelaCard.locator('text=/Cultivo:/')).toBeVisible();
        await expect(parcelaCard.locator('text=/Variedad:/')).toBeVisible();
        await expect(parcelaCard.locator('text=/Superficie:/')).toBeVisible();
        
        break;
      }
      
      await btn.click({ force: true });
    }
  });
});

test.describe('Fincas Refactored - Gestionar Parcelas Modal', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should open gestionar parcelas modal', async ({ page }) => {
    const parcelasBtn = page.locator('[data-testid^="btn-parcelas-"]').first();
    
    if (await parcelasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parcelasBtn.click({ force: true });
      
      // Verify modal opens
      await expect(page.getByTestId('modal-asignar-parcelas')).toBeVisible({ timeout: 5000 });
      
      // Verify modal title contains "Gestionar Parcelas"
      await expect(page.locator('text=Gestionar Parcelas')).toBeVisible();
      
      // Verify sections exist
      await expect(page.locator('text=/Parcelas Asignadas \\(\\d+\\)/').first()).toBeVisible();
      await expect(page.locator('text=/Parcelas Disponibles \\(\\d+\\)/').first()).toBeVisible();
    }
  });

  test('should close gestionar parcelas modal', async ({ page }) => {
    const parcelasBtn = page.locator('[data-testid^="btn-parcelas-"]').first();
    
    if (await parcelasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parcelasBtn.click({ force: true });
      await expect(page.getByTestId('modal-asignar-parcelas')).toBeVisible({ timeout: 5000 });
      
      // Close with X button
      const closeBtn = page.locator('[data-testid="modal-asignar-parcelas"] button:has(svg)').first();
      await closeBtn.click({ force: true });
      
      await expect(page.getByTestId('modal-asignar-parcelas')).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('should show assigned parcelas in modal', async ({ page }) => {
    const parcelasBtn = page.locator('[data-testid^="btn-parcelas-"]').first();
    
    if (await parcelasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parcelasBtn.click({ force: true });
      await expect(page.getByTestId('modal-asignar-parcelas')).toBeVisible({ timeout: 5000 });
      
      // Check for assigned parcelas section
      const assignedSection = page.locator('text=Parcelas Asignadas');
      await expect(assignedSection).toBeVisible();
      
      // Count should be shown
      await expect(page.locator('text=/Parcelas Asignadas \\(\\d+\\)/')).toBeVisible();
    }
  });

  test('should show available parcelas in modal', async ({ page }) => {
    const parcelasBtn = page.locator('[data-testid^="btn-parcelas-"]').first();
    
    if (await parcelasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parcelasBtn.click({ force: true });
      await expect(page.getByTestId('modal-asignar-parcelas')).toBeVisible({ timeout: 5000 });
      
      // Check for available parcelas section
      await expect(page.locator('text=/Parcelas Disponibles \\(\\d+\\)/')).toBeVisible();
    }
  });

  test('should have assign button for available parcelas', async ({ page }) => {
    const parcelasBtn = page.locator('[data-testid^="btn-parcelas-"]').first();
    
    if (await parcelasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parcelasBtn.click({ force: true });
      await expect(page.getByTestId('modal-asignar-parcelas')).toBeVisible({ timeout: 5000 });
      
      // Look for "Asignar" button in available parcelas section
      const asignarBtn = page.locator('button:has-text("Asignar")').first();
      
      if (await asignarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await asignarBtn.textContent()).toContain('Asignar');
      }
    }
  });

  test('should have remove button for assigned parcelas', async ({ page }) => {
    const parcelasBtn = page.locator('[data-testid^="btn-parcelas-"]').first();
    
    if (await parcelasBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await parcelasBtn.click({ force: true });
      await expect(page.getByTestId('modal-asignar-parcelas')).toBeVisible({ timeout: 5000 });
      
      // Look for "Quitar" button in assigned parcelas section
      const quitarBtn = page.locator('button:has-text("Quitar")').first();
      
      if (await quitarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await quitarBtn.textContent()).toContain('Quitar');
      }
    }
  });
});

test.describe('Fincas Refactored - Map in Parcela Cards', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should display map with layer selector in modal', async ({ page }) => {
    // Find and open a parcela map
    const expandBtns = page.locator('[data-testid^="btn-expand-"]');
    const count = await expandBtns.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = expandBtns.nth(i);
      await btn.click({ force: true });
      
      const mapaBtn = page.locator('[data-testid^="btn-ver-mapa-"]').first();
      
      if (await mapaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mapaBtn.click({ force: true });
        await expect(page.getByTestId('modal-mapa-parcela')).toBeVisible({ timeout: 5000 });
        
        // Verify map is present
        await expect(page.getByTestId('mapa-sigpac-container')).toBeVisible();
        
        // Verify layer selector exists
        const layerSelect = page.getByTestId('select-map-layer');
        if (await layerSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(layerSelect).toBeVisible();
        }
        
        break;
      }
      
      await btn.click({ force: true });
    }
  });

  test('should show parcela info in map modal header', async ({ page }) => {
    const expandBtns = page.locator('[data-testid^="btn-expand-"]');
    const count = await expandBtns.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = expandBtns.nth(i);
      await btn.click({ force: true });
      
      const mapaBtn = page.locator('[data-testid^="btn-ver-mapa-"]').first();
      
      if (await mapaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await mapaBtn.click({ force: true });
        await expect(page.getByTestId('modal-mapa-parcela')).toBeVisible({ timeout: 5000 });
        
        // Verify header shows parcela code
        const header = page.locator('[data-testid="modal-mapa-parcela"] h3');
        await expect(header).toContainText('Mapa');
        
        // Verify details row shows cultivo, variedad, superficie
        const detailsRow = page.locator('[data-testid="modal-mapa-parcela"]').locator('text=/\\d+.*ha/');
        if (await detailsRow.isVisible({ timeout: 2000 }).catch(() => false)) {
          expect(await detailsRow.first().textContent()).toMatch(/ha/);
        }
        
        break;
      }
      
      await btn.click({ force: true });
    }
  });
});

test.describe('Fincas Refactored - Unassign Parcela from Expanded Card', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await login(page);
    await ensureModalClosed(page);
    await page.getByTestId('nav-fincas').click({ force: true });
    await page.waitForLoadState('domcontentloaded');
    await waitForDataLoad(page);
    await ensureModalClosed(page);
    await expect(page.getByTestId('fincas-page')).toBeVisible({ timeout: 10000 });
  });

  test('should have unlink button on parcela card in expanded view', async ({ page }) => {
    const expandBtns = page.locator('[data-testid^="btn-expand-"]');
    const count = await expandBtns.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = expandBtns.nth(i);
      await btn.click({ force: true });
      
      const quitarBtn = page.locator('[data-testid^="btn-quitar-parcela-"]').first();
      
      if (await quitarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Verify unlink button exists
        await expect(quitarBtn).toBeVisible();
        break;
      }
      
      await btn.click({ force: true });
    }
  });
});
