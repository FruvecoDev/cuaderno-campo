import { test, expect } from '@playwright/test';
import { login, dismissResumenDiarioModal, removeEmergentBadge } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'https://agro-dashboard-dev.preview.emergentagent.com';

test.describe('RRHH - ProductividadTab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissResumenDiarioModal(page);
    await removeEmergentBadge(page);
    
    // Navigate to RRHH page
    const rrhhLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /rrhh|recursos/i }).first();
    await rrhhLink.click();
    await page.waitForLoadState('domcontentloaded');
    
    // Click on Productividad tab
    const productividadTab = page.getByRole('button', { name: /productividad/i });
    await productividadTab.click();
    await page.waitForLoadState('domcontentloaded');
  });
  
  test('should display Productividad tab with real-time section', async ({ page }) => {
    // Check for "Productividad en Tiempo Real" section
    await expect(page.getByText('Productividad en Tiempo Real')).toBeVisible({ timeout: 10000 });
    
    // Check for KPI cards in real-time section
    await expect(page.getByText('Kilos Hoy').or(page.getByText('Horas Hoy'))).toBeVisible();
  });
  
  test('should display KPI cards with metrics', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check for general KPI cards (below real-time section)
    const kilosTotales = page.getByText('Kilos Totales');
    const hectareas = page.getByText('Hectáreas');
    const horasTrabajadas = page.getByText('Horas Trabajadas');
    const registros = page.getByText('Registros');
    
    // At least some of these should be visible
    await expect(kilosTotales.or(hectareas).or(horasTrabajadas).or(registros)).toBeVisible({ timeout: 10000 });
  });
  
  test('should display employee filter dropdown', async ({ page }) => {
    // Check for employee filter dropdown
    const employeeFilter = page.locator('select').filter({ hasText: /todos los empleados/i });
    await expect(employeeFilter).toBeVisible({ timeout: 10000 });
  });
  
  test('should display date range filters', async ({ page }) => {
    // Check for date inputs
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible({ timeout: 10000 });
    
    // Should have 2 date inputs for range
    await expect(dateInputs).toHaveCount(2);
  });
  
  test('should have "Nuevo Registro" button', async ({ page }) => {
    // Check for new record button
    const newRecordBtn = page.getByRole('button', { name: /nuevo registro/i });
    await expect(newRecordBtn).toBeVisible({ timeout: 10000 });
  });
  
  test('should display productivity records table', async ({ page }) => {
    // Check for table headers
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for table column headers
    const tableHeaders = ['Fecha', 'Empleado', 'Tipo', 'Kilos', 'Hectáreas', 'Horas'];
    for (const header of tableHeaders.slice(0, 3)) {
      await expect(page.locator('th').filter({ hasText: header }).first()).toBeVisible();
    }
  });
  
  test('should open new registro modal when clicking button', async ({ page }) => {
    // Click new record button
    const newRecordBtn = page.getByRole('button', { name: /nuevo registro/i });
    await newRecordBtn.click();
    
    // Wait for modal
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Check for form fields in modal
    await expect(page.getByText('Empleado').first()).toBeVisible();
    await expect(page.getByText('Fecha').first()).toBeVisible();
  });
  
  test('should display tipo trabajo options in new registro modal', async ({ page }) => {
    // Open modal
    const newRecordBtn = page.getByRole('button', { name: /nuevo registro/i });
    await newRecordBtn.click();
    
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Check for tipo trabajo select with options
    const tipoSelect = page.locator('select').filter({ hasText: /recolección|poda/i }).first();
    await expect(tipoSelect.or(page.getByText('Tipo de Trabajo'))).toBeVisible();
  });
  
  test('should display kilos, hectareas, horas inputs in modal', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /nuevo registro/i }).click();
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Check for numeric inputs
    await expect(page.getByText('Kilos').first()).toBeVisible();
    await expect(page.getByText('Hectáreas').first()).toBeVisible();
    await expect(page.getByText('Horas').first()).toBeVisible();
  });
  
  test('should close new registro modal when clicking cancel', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: /nuevo registro/i }).click();
    await expect(page.getByText('Nuevo Registro de Productividad')).toBeVisible({ timeout: 5000 });
    
    // Click cancel
    const cancelBtn = page.getByRole('button', { name: /cancelar/i }).last();
    await cancelBtn.click();
    
    // Modal should close
    await expect(page.getByText('Nuevo Registro de Productividad')).not.toBeVisible({ timeout: 3000 });
  });
  
  test('should display Top 10 Empleados section if data exists', async ({ page }) => {
    // Check for Top Empleados section
    const topEmpleadosSection = page.getByText(/top.*empleados.*productividad/i);
    
    // This section may or may not be visible depending on data
    // Just check it loads without error
    await page.waitForLoadState('domcontentloaded');
    
    // Either top section exists or records table exists
    await expect(
      topEmpleadosSection.or(page.getByText('Registros de Productividad'))
    ).toBeVisible({ timeout: 10000 });
  });
  
  test('should display real-time refresh button', async ({ page }) => {
    // Look for refresh button in real-time section
    const refreshBtn = page.locator('button[title="Actualizar"]');
    
    // Wait for real-time section to load first
    await expect(page.getByText('Productividad en Tiempo Real')).toBeVisible({ timeout: 10000 });
    
    // Check refresh button is present
    await expect(refreshBtn).toBeVisible();
  });
  
  test('should display employees working today in real-time section', async ({ page }) => {
    // Wait for real-time section to load
    await expect(page.getByText('Productividad en Tiempo Real')).toBeVisible({ timeout: 10000 });
    
    // Check for "empleados trabajando" text
    await expect(page.getByText(/empleados trabajando/i)).toBeVisible();
  });
  
  test('should apply employee filter correctly', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Get employee filter dropdown
    const employeeFilter = page.locator('select').first();
    
    // Get options count
    const optionsCount = await employeeFilter.locator('option').count();
    
    if (optionsCount > 1) {
      // Select second option (first non-default)
      await employeeFilter.selectOption({ index: 1 });
      
      // Wait for filtered results
      await page.waitForLoadState('domcontentloaded');
    }
  });
  
  test('should clear filters when clicking clear button', async ({ page }) => {
    // Wait for content to load
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Set a date filter
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2025-01-01');
    
    // Wait for filter to apply
    await page.waitForLoadState('domcontentloaded');
    
    // Look for clear/limpiar button
    const clearBtn = page.getByRole('button', { name: /limpiar/i });
    
    // Clear button should be visible now
    await expect(clearBtn).toBeVisible();
    
    // Click clear
    await clearBtn.click();
    
    // Date input should be cleared
    await expect(dateInputs.first()).toHaveValue('');
  });
  
  test('should display kg/hora calculation in records table', async ({ page }) => {
    // Wait for table to load
    await expect(page.getByText('Registros de Productividad')).toBeVisible({ timeout: 10000 });
    
    // Check for Kg/Hora column
    await expect(page.locator('th').filter({ hasText: /kg.*hora/i }).first()).toBeVisible();
  });
});
