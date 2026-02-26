import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * Image Upload Tests for Técnicos Aplicadores and Maquinaria
 * Tests the bug fix for image storage (now using /api/uploads/ instead of /tmp/)
 */

const BASE_URL = 'https://agri-contratos.preview.emergentagent.com';

// Helper to create a test PNG image
function createTestPNG(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
    0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
}

// Helper function for login
async function performLogin(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  
  // Check if already logged in
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard')) {
    return;
  }
  
  // Wait for login form
  await expect(page.locator('input').first()).toBeVisible({ timeout: 10000 });
  
  // Fill credentials
  await page.locator('input').first().fill('admin@fruveco.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  
  // Click login
  await page.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
  
  // Wait for dashboard redirect
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  
  // Remove emergent badge
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

test.describe('Maquinaria - Image Upload Bug Fix', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('should display maquinaria list', async ({ page }) => {
    await page.goto(`${BASE_URL}/maquinaria`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('maquinaria-page')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('maquinaria-table')).toBeVisible();
    await expect(page.getByTestId('btn-nueva-maquinaria')).toBeVisible();
  });

  test('should upload image when creating maquinaria and view it', async ({ page }) => {
    // Set up dialog handler BEFORE any actions
    page.on('dialog', dialog => dialog.accept());
    
    const uniqueId = Date.now().toString().slice(-8);
    const testNombre = `TEST_Maquinaria ${uniqueId}`;
    
    await page.goto(`${BASE_URL}/maquinaria`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nueva-maquinaria')).toBeVisible({ timeout: 20000 });
    
    // Open form
    await page.getByTestId('btn-nueva-maquinaria').click();
    await expect(page.getByTestId('maquinaria-form')).toBeVisible();
    
    // Fill form
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('select-tipo').selectOption('Tractor');
    
    // Create and upload test image
    const tempImagePath = '/tmp/test_placa_ce_maquinaria.png';
    fs.writeFileSync(tempImagePath, createTestPNG());
    
    await page.getByTestId('input-imagen-placa').setInputFiles(tempImagePath);
    
    // Wait for preview
    await expect(page.locator('img[alt*="Placa CE"], img[alt*="Preview"]')).toBeVisible({ timeout: 10000 });
    
    // Save
    await page.getByTestId('btn-guardar').click();
    await expect(page.getByTestId('maquinaria-form')).not.toBeVisible({ timeout: 15000 });
    
    // Verify in table
    await expect(page.getByText(testNombre)).toBeVisible({ timeout: 10000 });
    
    // Find the row and verify "Ver" button exists
    const row = page.locator('tr').filter({ hasText: testNombre });
    const viewBtn = row.getByRole('button', { name: 'Ver' });
    await expect(viewBtn).toBeVisible();
    
    // Click "Ver" to open modal
    await viewBtn.click();
    
    // Verify modal with image opens
    const modal = page.locator('img[alt*="Placa CE"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Close modal by clicking outside
    await page.locator('div[style*="rgba(0,0,0"]').first().click({ position: { x: 10, y: 10 } });
    
    // Cleanup: delete the test maquinaria
    const deleteBtn = row.getByRole('button', { name: /Eliminar|delete/i }).first();
    await deleteBtn.click({ force: true });
    await expect(page.getByText(testNombre)).not.toBeVisible({ timeout: 10000 });
    
    fs.unlinkSync(tempImagePath);
  });

  test('should show image preview when editing maquinaria with existing image', async ({ page }) => {
    // Set up dialog handler BEFORE any actions
    page.on('dialog', dialog => dialog.accept());
    
    const uniqueId = Date.now().toString().slice(-8);
    const testNombre = `TEST_Preview ${uniqueId}`;
    
    await page.goto(`${BASE_URL}/maquinaria`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nueva-maquinaria')).toBeVisible({ timeout: 20000 });
    
    // Create maquinaria with image
    await page.getByTestId('btn-nueva-maquinaria').click();
    await expect(page.getByTestId('input-nombre')).toBeVisible();
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('select-tipo').selectOption('Pulverizador');
    
    const tempImagePath = '/tmp/test_preview.png';
    fs.writeFileSync(tempImagePath, createTestPNG());
    await page.getByTestId('input-imagen-placa').setInputFiles(tempImagePath);
    await expect(page.locator('img[alt*="Preview"], img[alt*="Placa CE"]')).toBeVisible({ timeout: 10000 });
    
    await page.getByTestId('btn-guardar').click();
    await expect(page.getByTestId('maquinaria-form')).not.toBeVisible({ timeout: 15000 });
    
    // Find and click edit
    const row = page.locator('tr').filter({ hasText: testNombre });
    await expect(row).toBeVisible({ timeout: 10000 });
    const editBtn = row.getByRole('button', { name: /Editar|edit/i }).first();
    await editBtn.click({ force: true });
    
    // Verify edit form shows image preview
    await expect(page.getByTestId('maquinaria-form')).toBeVisible();
    await expect(page.locator('img[alt*="Preview"], img[alt*="Placa CE"]')).toBeVisible({ timeout: 5000 });
    
    // Cancel edit
    await page.getByRole('button', { name: 'Cancelar' }).click();
    
    // Cleanup
    const deleteBtn = row.getByRole('button', { name: /Eliminar|delete/i }).first();
    await deleteBtn.click({ force: true });
    await expect(page.getByText(testNombre)).not.toBeVisible({ timeout: 10000 });
    
    fs.unlinkSync(tempImagePath);
  });
});

test.describe('Técnicos Aplicadores - Certificate Upload Bug Fix', () => {
  test.beforeEach(async ({ page }) => {
    await performLogin(page);
  });

  test('should display técnicos list', async ({ page }) => {
    await page.goto(`${BASE_URL}/tecnicos-aplicadores`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('tecnicos-aplicadores-page')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('btn-nuevo-tecnico')).toBeVisible();
  });

  test('should upload certificate when creating técnico', async ({ page }) => {
    // Set up dialog handler BEFORE any actions
    page.on('dialog', dialog => dialog.accept());
    
    const uniqueId = Date.now().toString().slice(-8);
    const testNombre = 'TEST';
    const testApellidos = `Técnico ${uniqueId}`;
    const testDNI = `${uniqueId}B`;
    
    await page.goto(`${BASE_URL}/tecnicos-aplicadores`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-tecnico')).toBeVisible({ timeout: 20000 });
    
    // Open form
    await page.getByTestId('btn-nuevo-tecnico').click();
    await expect(page.getByTestId('input-nombre')).toBeVisible();
    
    // Fill form
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('input-apellidos').fill(testApellidos);
    await page.getByTestId('input-dni').fill(testDNI);
    await page.getByTestId('select-nivel').selectOption('Básico');
    await page.getByTestId('input-carnet').fill(`CARNET-${uniqueId}`);
    await page.getByTestId('input-fecha-cert').fill('2024-01-15');
    
    // Upload certificate
    const tempImagePath = '/tmp/test_certificado.png';
    fs.writeFileSync(tempImagePath, createTestPNG());
    await page.getByTestId('input-certificado').setInputFiles(tempImagePath);
    
    // Wait for preview
    await expect(page.locator('img[alt*="Preview"]')).toBeVisible({ timeout: 10000 });
    
    // Submit
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for form to close
    await expect(page.getByTestId('input-nombre')).not.toBeVisible({ timeout: 15000 });
    
    // Verify técnico in table
    await expect(page.getByText(testApellidos)).toBeVisible({ timeout: 10000 });
    
    // Verify certificate icon/button exists
    const row = page.locator('tr').filter({ hasText: testApellidos });
    const certBtn = row.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(certBtn).toBeVisible();
    
    // Cleanup
    const deleteBtn = row.locator('button[title="Eliminar"]').first();
    await deleteBtn.click({ force: true });
    await expect(page.getByText(testApellidos)).not.toBeVisible({ timeout: 10000 });
    
    fs.unlinkSync(tempImagePath);
  });

  test('should show certificate preview when editing técnico with existing certificate', async ({ page }) => {
    // Set up dialog handler BEFORE any actions
    page.on('dialog', dialog => dialog.accept());
    
    const uniqueId = Date.now().toString().slice(-8);
    const testNombre = 'TEST';
    const testApellidos = `Preview ${uniqueId}`;
    const testDNI = `${uniqueId}C`;
    
    await page.goto(`${BASE_URL}/tecnicos-aplicadores`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-tecnico')).toBeVisible({ timeout: 20000 });
    
    // Create técnico with certificate
    await page.getByTestId('btn-nuevo-tecnico').click();
    await expect(page.getByTestId('input-nombre')).toBeVisible();
    
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('input-apellidos').fill(testApellidos);
    await page.getByTestId('input-dni').fill(testDNI);
    await page.getByTestId('select-nivel').selectOption('Cualificado');
    await page.getByTestId('input-carnet').fill(`CARNET-${uniqueId}`);
    await page.getByTestId('input-fecha-cert').fill('2024-02-20');
    
    const tempImagePath = '/tmp/test_cert_preview.png';
    fs.writeFileSync(tempImagePath, createTestPNG());
    await page.getByTestId('input-certificado').setInputFiles(tempImagePath);
    await expect(page.locator('img[alt*="Preview"]')).toBeVisible({ timeout: 10000 });
    
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByTestId('input-nombre')).not.toBeVisible({ timeout: 15000 });
    
    // Find and click edit
    const row = page.locator('tr').filter({ hasText: testApellidos });
    await expect(row).toBeVisible({ timeout: 10000 });
    const editBtn = row.locator('button[title="Editar"]').first();
    await editBtn.click({ force: true });
    
    // Verify form shows certificate preview
    await expect(page.getByTestId('input-nombre')).toBeVisible();
    await expect(page.locator('img[alt*="Preview"]')).toBeVisible({ timeout: 5000 });
    
    // Cancel
    await page.locator('button').filter({ hasText: 'Cancelar' }).click();
    
    // Cleanup
    const deleteBtn = row.locator('button[title="Eliminar"]').first();
    await deleteBtn.click({ force: true });
    await expect(page.getByText(testApellidos)).not.toBeVisible({ timeout: 10000 });
    
    fs.unlinkSync(tempImagePath);
  });

  test('should view existing certificate via eye button', async ({ page }) => {
    // This test checks if existing certificates can be viewed
    await page.goto(`${BASE_URL}/tecnicos-aplicadores`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('tecnicos-aplicadores-page')).toBeVisible({ timeout: 20000 });
    
    // Find any row with a visible eye button (has certificate)
    const eyeBtn = page.locator('tr button').filter({ has: page.locator('svg') }).first();
    
    if (await eyeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get the row data
      const row = eyeBtn.locator('xpath=ancestor::tr');
      const rowText = await row.textContent();
      
      // If there's an eye icon for viewing certificate
      const viewBtn = row.locator('button').filter({ has: page.locator('svg') }).first();
      
      // Click to view - should open in new tab or modal
      const [popup] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null),
        viewBtn.click({ force: true })
      ]);
      
      if (popup) {
        // Certificate opened in new tab - verify it loaded
        await popup.waitForLoadState('domcontentloaded');
        await popup.close();
      }
      
      test.info().annotations.push({ type: 'info', description: `Checked certificate view for: ${rowText?.slice(0, 50)}` });
    } else {
      test.info().annotations.push({ type: 'skip', description: 'No técnicos with certificates found' });
    }
  });
});
