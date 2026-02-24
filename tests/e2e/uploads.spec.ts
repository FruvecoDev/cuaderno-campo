import { test, expect } from '@playwright/test';
import { login, generateUniqueId, removeEmergentBadge } from '../fixtures/helpers';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Maquinaria - Image Upload', () => {
  const baseUrl = 'https://agri-field-app.preview.emergentagent.com';
  
  test.beforeEach(async ({ page }) => {
    // Login manually with correct flow
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await removeEmergentBadge(page);
  });

  test('should navigate to Maquinaria page and display list', async ({ page }) => {
    await page.goto(`${baseUrl}/maquinaria`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await expect(page.getByTestId('maquinaria-page')).toBeVisible({ timeout: 15000 });
    
    // Check table exists
    await expect(page.getByTestId('maquinaria-table')).toBeVisible();
    
    // Check "Nueva Maquinaria" button exists
    await expect(page.getByTestId('btn-nueva-maquinaria')).toBeVisible();
  });

  test('should create maquinaria with image upload', async ({ page }) => {
    const uniqueId = generateUniqueId();
    const testNombre = `Tractor Test ${uniqueId.slice(-8)}`;
    
    await page.goto(`${baseUrl}/maquinaria`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nueva-maquinaria')).toBeVisible({ timeout: 15000 });
    
    // Click "Nueva Maquinaria" button
    await page.getByTestId('btn-nueva-maquinaria').click();
    
    // Wait for form to appear
    await expect(page.getByTestId('maquinaria-form')).toBeVisible();
    await expect(page.getByTestId('input-nombre')).toBeVisible();
    
    // Fill required fields
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('select-tipo').selectOption('Tractor');
    
    // Create a temporary test image file
    const tempImagePath = '/tmp/test_placa_ce.png';
    // Create a minimal PNG file
    const pngContent = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
      0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
      0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(tempImagePath, pngContent);
    
    // Upload image via file input
    const fileInput = page.getByTestId('input-imagen-placa');
    await fileInput.setInputFiles(tempImagePath);
    
    // Wait for image preview to appear
    await expect(page.locator('img[alt*="Placa CE"], img[alt*="Preview"]')).toBeVisible({ timeout: 10000 });
    
    // Submit form
    await page.getByTestId('btn-guardar').click();
    
    // Wait for form to close
    await expect(page.getByTestId('maquinaria-form')).not.toBeVisible({ timeout: 15000 });
    
    // Verify the new maquinaria appears in the table
    await expect(page.getByText(testNombre)).toBeVisible({ timeout: 10000 });
    
    // Check if image indicator exists in table (View button should be present)
    const row = page.locator('tr').filter({ hasText: testNombre });
    await expect(row.locator('button').filter({ hasText: 'Ver' })).toBeVisible();
    
    // Cleanup: delete the test maquinaria
    page.on('dialog', dialog => dialog.accept());
    const deleteBtn = row.locator('button[title="Eliminar"]').first();
    await deleteBtn.click({ force: true });
    
    // Verify deletion
    await expect(page.getByText(testNombre)).not.toBeVisible({ timeout: 10000 });
    
    // Clean up temp file
    fs.unlinkSync(tempImagePath);
  });

  test('should view uploaded image for maquinaria', async ({ page }) => {
    await page.goto(`${baseUrl}/maquinaria`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('maquinaria-table')).toBeVisible({ timeout: 15000 });
    
    // Find a row with "Ver" button (has uploaded image)
    const viewBtn = page.locator('button').filter({ hasText: 'Ver' }).first();
    
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      
      // Modal should appear with image
      await expect(page.locator('img[alt*="Placa CE"]')).toBeVisible({ timeout: 5000 });
      
      // Close modal
      const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      await closeBtn.click({ force: true });
    } else {
      // No images uploaded - skip test
      test.info().annotations.push({ type: 'info', description: 'No maquinaria with images found' });
    }
  });
});

test.describe('Técnicos Aplicadores - Certificate Upload', () => {
  const baseUrl = 'https://agri-field-app.preview.emergentagent.com';
  
  test.beforeEach(async ({ page }) => {
    // Login manually with correct flow
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    await page.locator('input').first().fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await removeEmergentBadge(page);
  });

  test('should navigate to Técnicos page and display list', async ({ page }) => {
    await page.goto(`${baseUrl}/tecnicos-aplicadores`, { waitUntil: 'domcontentloaded' });
    
    // Wait for page to load
    await expect(page.getByTestId('tecnicos-aplicadores-page')).toBeVisible({ timeout: 15000 });
    
    // Check "Nuevo Técnico" button exists
    await expect(page.getByTestId('btn-nuevo-tecnico')).toBeVisible();
  });

  test('should create técnico with certificate upload', async ({ page }) => {
    const uniqueId = Date.now().toString();
    const testNombre = 'Test';
    const testApellidos = `Técnico ${uniqueId.slice(-8)}`;
    const testDNI = `${uniqueId.slice(-8)}A`;
    
    await page.goto(`${baseUrl}/tecnicos-aplicadores`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-nuevo-tecnico')).toBeVisible({ timeout: 15000 });
    
    // Click "Nuevo Técnico" button
    await page.getByTestId('btn-nuevo-tecnico').click();
    
    // Wait for form to appear
    await expect(page.getByTestId('input-nombre')).toBeVisible();
    
    // Fill required fields
    await page.getByTestId('input-nombre').fill(testNombre);
    await page.getByTestId('input-apellidos').fill(testApellidos);
    await page.getByTestId('input-dni').fill(testDNI);
    await page.getByTestId('select-nivel').selectOption('Básico');
    await page.getByTestId('input-carnet').fill(`CARNET-${uniqueId.slice(-6)}`);
    await page.getByTestId('input-fecha-cert').fill('2024-01-15');
    
    // Create a temporary test image file for certificate
    const tempImagePath = '/tmp/test_certificado.png';
    const pngContent = Buffer.from([
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
    fs.writeFileSync(tempImagePath, pngContent);
    
    // Upload certificate
    const fileInput = page.getByTestId('input-certificado');
    await fileInput.setInputFiles(tempImagePath);
    
    // Wait for preview
    await expect(page.locator('img[alt*="Preview"], img[alt*="certificado"]')).toBeVisible({ timeout: 10000 });
    
    // Submit form
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for form to close and list to update
    await expect(page.getByTestId('input-nombre')).not.toBeVisible({ timeout: 15000 });
    
    // Verify the new técnico appears in the table
    await expect(page.getByText(testApellidos)).toBeVisible({ timeout: 10000 });
    
    // Cleanup: delete the test técnico
    page.on('dialog', dialog => dialog.accept());
    const row = page.locator('tr').filter({ hasText: testApellidos });
    const deleteBtn = row.locator('button[title="Eliminar"]').first();
    await deleteBtn.click({ force: true });
    
    // Verify deletion
    await expect(page.getByText(testApellidos)).not.toBeVisible({ timeout: 10000 });
    
    // Clean up temp file
    fs.unlinkSync(tempImagePath);
  });
});
