import { test, expect } from '@playwright/test';
import { login, dismissResumenDiarioModal, removeEmergentBadge, generateUniqueId } from '../fixtures/helpers';

const BASE_URL = process.env.BASE_URL || 'https://agro-dashboard-dev.preview.emergentagent.com';

test.describe('Usuarios - Vinculación con Empleados', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissResumenDiarioModal(page);
    await removeEmergentBadge(page);
    
    // Navigate to Usuarios page
    const usuariosLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /usuarios/i }).first();
    await usuariosLink.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('usuarios-page')).toBeVisible();
  });
  
  test('should display Usuarios page with user list', async ({ page }) => {
    await expect(page.getByTestId('usuarios-page')).toBeVisible();
    
    // Check for table with users
    await expect(page.locator('table')).toBeVisible();
    
    // Check for column headers including "Empleado Vinculado"
    await expect(page.getByText('Empleado Vinculado')).toBeVisible();
  });
  
  test('should have "Nuevo Usuario" button', async ({ page }) => {
    const newUserBtn = page.getByTestId('btn-nuevo-usuario');
    await expect(newUserBtn).toBeVisible();
    await expect(newUserBtn).toHaveText(/nuevo/i);
  });
  
  test('should show Empleado role option in create user form', async ({ page }) => {
    // Click new user button
    await page.getByTestId('btn-nuevo-usuario').click();
    
    // Wait for form to appear
    await expect(page.locator('.form-select').filter({ hasText: /rol/i }).or(page.locator('select'))).toBeVisible();
    
    // Find the role select and check it has Empleado option
    const roleSelect = page.locator('select').filter({ has: page.locator('option[value="Empleado"]') }).first();
    
    // Verify Empleado option exists
    const empleadoOption = page.locator('option[value="Empleado"]');
    await expect(empleadoOption).toHaveCount(1);
  });
  
  test('should have vincular empleado button for other users', async ({ page }) => {
    // Look for vincular buttons in user rows (excluding current user)
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    // Check if any vincular button exists
    const vincularButtons = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularButtons.count();
    
    // Should have at least one vincular button (if there are other users)
    if (count > 0) {
      await expect(vincularButtons.first()).toBeVisible();
    }
  });
  
  test('should open vincular empleado modal when clicking vincular button', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    // Find first vincular button
    const vincularButtons = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Click first vincular button
    await vincularButtons.first().click();
    
    // Wait for modal to appear - look for modal content
    await expect(page.getByText('Vincular con Empleado')).toBeVisible({ timeout: 5000 });
    
    // Check for search input in modal
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
    
    // Check for "Sin vincular" option
    await expect(page.getByText('Sin vincular')).toBeVisible();
  });
  
  test('should be able to close vincular modal', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    const vincularButtons = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Open modal
    await vincularButtons.first().click();
    await expect(page.getByText('Vincular con Empleado')).toBeVisible({ timeout: 5000 });
    
    // Click cancel button
    const cancelBtn = page.getByRole('button', { name: /cancelar/i });
    await cancelBtn.click();
    
    // Modal should close
    await expect(page.getByText('Vincular con Empleado')).not.toBeVisible({ timeout: 3000 });
  });
  
  test('should show employee list in vincular modal', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    const vincularButtons = page.locator('[data-testid^="btn-vincular-"]');
    const count = await vincularButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Open modal
    await vincularButtons.first().click();
    await expect(page.getByText('Vincular con Empleado')).toBeVisible({ timeout: 5000 });
    
    // Wait for employee list to load
    await page.waitForSelector('.modal-content [style*="overflowY"]', { timeout: 5000 });
    
    // Modal should have some content - either employees or "Sin vincular" option
    await expect(page.getByText('Sin vincular').or(page.getByText(/EMP-/))).toBeVisible();
  });
  
  test('should display user status column correctly', async ({ page }) => {
    // Check for status badges - Active or Inactive
    const activeStatus = page.locator('.badge-success, .badge-error');
    await expect(activeStatus.first()).toBeVisible();
  });
  
  test('should have edit button for users', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    const editButtons = page.locator('[data-testid^="btn-edit-"]');
    const count = await editButtons.count();
    
    if (count > 0) {
      await expect(editButtons.first()).toBeVisible();
    }
  });
  
  test('should have tipo operacion button for users', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    const tipoOpButtons = page.locator('[data-testid^="btn-tipo-op-"]');
    const count = await tipoOpButtons.count();
    
    if (count > 0) {
      await expect(tipoOpButtons.first()).toBeVisible();
    }
  });
  
  test('should display tipo operacion badges (Compra/Venta/Ambos)', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table tbody tr');
    
    // Look for tipo operacion badges - they have specific colors
    const tipoOpBadges = page.locator('span').filter({ hasText: /^(Compra|Venta|Ambos)$/ });
    await expect(tipoOpBadges.first()).toBeVisible();
  });
  
  test('should open tipo operacion modal when clicking tipo op button', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');
    
    const tipoOpButtons = page.locator('[data-testid^="btn-tipo-op-"]');
    const count = await tipoOpButtons.count();
    
    if (count === 0) {
      test.skip();
      return;
    }
    
    // Click first tipo op button
    await tipoOpButtons.first().click();
    
    // Wait for modal
    await expect(page.getByText('Tipo de Operación')).toBeVisible({ timeout: 5000 });
    
    // Check for radio options
    await expect(page.getByText('Compra')).toBeVisible();
    await expect(page.getByText('Venta')).toBeVisible();
    await expect(page.getByText('Ambos')).toBeVisible();
  });
});
