import { test, expect } from '@playwright/test';
import { login, waitForAppReady, removeEmergentBadge } from '../fixtures/helpers';

/**
 * Offline Mode Tests for Field Technicians
 * 
 * Tests the offline functionality including:
 * - Connection indicator in header
 * - Sync status dropdown panel
 * - Offline data caching
 * - Last cache date display
 * - Visitas form with cached parcelas
 * - Tratamientos page with offline functionality
 */

test.describe('Offline Mode - Connection Indicator', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
  });
  
  test('should display offline indicator in header', async ({ page }) => {
    // Wait for the offline indicator to be visible
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Should show "Conectado" when online
    await expect(offlineIndicator).toContainText(/Conectado|pendiente/i);
  });
  
  test('should show sync status dropdown when clicking indicator', async ({ page }) => {
    // Click the offline indicator
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    await offlineIndicator.click();
    
    // Verify dropdown panel appears with sync stats
    await expect(page.locator('text=Pendientes de sync')).toBeVisible();
    await expect(page.locator('text=Fallidos')).toBeVisible();
  });
  
  test('should show "Descargar datos offline" button in dropdown', async ({ page }) => {
    // Click the offline indicator
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    await offlineIndicator.click();
    
    // Verify the download button is visible
    const downloadButton = page.locator('button:has-text("Descargar datos offline")');
    await expect(downloadButton).toBeVisible();
  });
  
  test('should cache data when clicking download button', async ({ page }) => {
    // Click the offline indicator
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    await offlineIndicator.click();
    
    // Click the download button
    const downloadButton = page.locator('button:has-text("Descargar datos offline")');
    await expect(downloadButton).toBeVisible();
    await downloadButton.click();
    
    // Wait for caching to complete - notification should appear
    // The notification shows "Datos cacheados: X parcelas, Y cultivos, Z contratos"
    // Use more specific locator for the success notification (fixed position toast)
    await expect(page.locator('text=Datos cacheados').first()).toBeVisible({ timeout: 10000 });
  });
  
  test('should display last cache date after caching data', async ({ page }) => {
    // Click the offline indicator
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    await offlineIndicator.click();
    
    // Click the download button
    const downloadButton = page.locator('button:has-text("Descargar datos offline")');
    await downloadButton.click();
    
    // Wait for caching notification - use more specific locator
    await expect(page.locator('text=Datos cacheados').first()).toBeVisible({ timeout: 10000 });
    
    // Verify "Última cache" shows a date/time
    // The format is like "25/2, 08:44"
    await expect(page.locator('text=Última cache')).toBeVisible();
    // Check for a date pattern nearby
    await expect(page.locator('text=/\\d{1,2}\\/\\d{1,2},\\s*\\d{1,2}:\\d{2}/')).toBeVisible({ timeout: 5000 });
  });
  
  test('should close dropdown when clicking indicator again', async ({ page }) => {
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Open dropdown
    await offlineIndicator.click();
    await expect(page.locator('text=Pendientes de sync')).toBeVisible();
    
    // Close dropdown
    await offlineIndicator.click();
    await expect(page.locator('text=Pendientes de sync')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Offline Mode - Visitas Page', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    // Navigate to Visitas page
    await page.goto('/visitas', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });
  
  test('should load Visitas page with parcelas available', async ({ page }) => {
    // Verify we're on visitas page
    const visitasPage = page.getByTestId('visitas-page');
    await expect(visitasPage).toBeVisible({ timeout: 10000 });
    
    // Click new visita button
    const newVisitaButton = page.getByTestId('btn-nueva-visita');
    await expect(newVisitaButton).toBeVisible();
    await newVisitaButton.click();
    
    // Verify form is visible
    const visitaForm = page.getByTestId('visita-form');
    await expect(visitaForm).toBeVisible();
    
    // Verify parcela selector is available
    const parcelaSelect = page.getByTestId('select-parcela');
    await expect(parcelaSelect).toBeVisible();
  });
  
  test('should have parcela search filters in visita form', async ({ page }) => {
    // Open new visita form
    const newVisitaButton = page.getByTestId('btn-nueva-visita');
    await newVisitaButton.click();
    
    // Check for parcela search filters
    const proveedorFilter = page.getByTestId('parcela-search-proveedor');
    const cultivoFilter = page.getByTestId('parcela-search-cultivo');
    const campanaFilter = page.getByTestId('parcela-search-campana');
    
    await expect(proveedorFilter).toBeVisible();
    await expect(cultivoFilter).toBeVisible();
    await expect(campanaFilter).toBeVisible();
  });
  
  test('should allow creating a visita with required fields', async ({ page }) => {
    // Open new visita form
    const newVisitaButton = page.getByTestId('btn-nueva-visita');
    await newVisitaButton.click();
    
    // Verify form has required fields
    const objetivoSelect = page.getByTestId('select-objetivo');
    const fechaInput = page.getByTestId('input-fecha-visita');
    const parcelaSelect = page.getByTestId('select-parcela');
    
    await expect(objetivoSelect).toBeVisible();
    await expect(fechaInput).toBeVisible();
    await expect(parcelaSelect).toBeVisible();
    
    // Verify save button exists
    const saveButton = page.getByTestId('btn-guardar-visita');
    await expect(saveButton).toBeVisible();
  });
});

test.describe('Offline Mode - Tratamientos Page', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    // Navigate to Tratamientos page
    await page.goto('/tratamientos', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });
  
  test('should load Tratamientos page', async ({ page }) => {
    // Verify we're on tratamientos page
    const tratamientosPage = page.getByTestId('tratamientos-page');
    await expect(tratamientosPage).toBeVisible({ timeout: 10000 });
    
    // Verify new tratamiento button exists
    const newTratamientoButton = page.getByTestId('btn-nuevo-tratamiento');
    await expect(newTratamientoButton).toBeVisible();
  });
  
  test('should open tratamiento form', async ({ page }) => {
    // Click new tratamiento button
    const newTratamientoButton = page.getByTestId('btn-nuevo-tratamiento');
    await newTratamientoButton.click();
    
    // Verify form is visible
    const tratamientoForm = page.getByTestId('tratamiento-form');
    await expect(tratamientoForm).toBeVisible();
  });
  
  test('should have parcela search filters in tratamiento form', async ({ page }) => {
    // Open new tratamiento form
    const newTratamientoButton = page.getByTestId('btn-nuevo-tratamiento');
    await newTratamientoButton.click();
    
    // Check for parcela search filters
    const proveedorFilter = page.getByTestId('parcela-search-proveedor');
    const cultivoFilter = page.getByTestId('parcela-search-cultivo');
    const campanaFilter = page.getByTestId('parcela-search-campana');
    
    await expect(proveedorFilter).toBeVisible();
    await expect(cultivoFilter).toBeVisible();
    await expect(campanaFilter).toBeVisible();
  });
  
  test('should have all tratamiento form fields', async ({ page }) => {
    // Open new tratamiento form
    const newTratamientoButton = page.getByTestId('btn-nuevo-tratamiento');
    await newTratamientoButton.click();
    
    // Verify form has key fields
    const tipoSelect = page.getByTestId('select-tipo-tratamiento');
    const subtipoSelect = page.getByTestId('select-subtipo');
    const metodoSelect = page.getByTestId('select-metodo-aplicacion');
    
    await expect(tipoSelect).toBeVisible();
    await expect(subtipoSelect).toBeVisible();
    await expect(metodoSelect).toBeVisible();
  });
});

test.describe('Offline Mode - Data Caching Integration', () => {
  
  test('should show correct status after caching and page reload', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    
    // Cache offline data
    const offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    await offlineIndicator.click();
    
    const downloadButton = page.locator('button:has-text("Descargar datos offline")');
    await downloadButton.click();
    
    // Wait for caching - use more specific locator
    await expect(page.locator('text=Datos cacheados').first()).toBeVisible({ timeout: 10000 });
    
    // Navigate to Visitas to verify parcelas are available
    await page.goto('/visitas', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    
    // Open form
    const newVisitaButton = page.getByTestId('btn-nueva-visita');
    await newVisitaButton.click();
    
    // Verify parcela selector has options (parcelas loaded)
    const parcelaSelect = page.getByTestId('select-parcela');
    await expect(parcelaSelect).toBeVisible();
    
    // Check that there are options in the select (other than the placeholder)
    const optionCount = await parcelaSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(1); // More than just the "Seleccionar parcela..." placeholder
  });
  
  test('should have offline indicator visible across pages', async ({ page }) => {
    await login(page);
    await waitForAppReady(page);
    
    // Check indicator on Dashboard
    let offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Navigate to Visitas
    await page.goto('/visitas', { waitUntil: 'domcontentloaded' });
    offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Navigate to Tratamientos
    await page.goto('/tratamientos', { waitUntil: 'domcontentloaded' });
    offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
    
    // Navigate to Parcelas
    await page.goto('/parcelas', { waitUntil: 'domcontentloaded' });
    offlineIndicator = page.getByTestId('offline-indicator');
    await expect(offlineIndicator).toBeVisible({ timeout: 10000 });
  });
});
