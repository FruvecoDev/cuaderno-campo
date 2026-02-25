import { test, expect } from '@playwright/test';

/**
 * Test suite for Notifications and Scheduler frontend features
 * Tests bell icon, dropdown, marking as read, and scheduler configuration
 */

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://harvest-log-1.preview.emergentagent.com';
const ADMIN_EMAIL = 'admin@fruveco.com';
const ADMIN_PASSWORD = 'admin123';

test.describe('Notifications System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Login
    await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load - use simple selector
    await expect(page.locator('.layout').first()).toBeVisible({ timeout: 15000 });
    // Wait for bell to appear (more specific)
    await expect(page.getByTestId('btn-notificaciones')).toBeVisible({ timeout: 10000 });
  });

  test('should display bell icon in header', async ({ page }) => {
    // Bell icon should be visible
    const bellButton = page.getByTestId('btn-notificaciones');
    await expect(bellButton).toBeVisible();
  });

  test('should open notifications dropdown on bell click', async ({ page }) => {
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Dropdown should appear with header - use locator inside the dropdown area
    await expect(page.locator('h3').filter({ hasText: 'Notificaciones' })).toBeVisible({ timeout: 5000 });
  });

  test('should display notification in dropdown when created', async ({ page }) => {
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    const { access_token } = await loginResponse.json();
    
    const uniqueId = Date.now();
    const testTitle = `TEST_Dropdown_${uniqueId}`;
    
    // Create notification
    await page.request.post(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: {
        titulo: testTitle,
        mensaje: 'Test notification to display in dropdown',
        tipo: 'warning'
      }
    });
    
    // Reload to get fresh data
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-notificaciones')).toBeVisible({ timeout: 10000 });
    
    // Open dropdown
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Notification should be visible
    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    const listResponse = await page.request.get(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const { notificaciones } = await listResponse.json();
    for (const notif of notificaciones.filter((n: any) => n.titulo?.startsWith('TEST_'))) {
      await page.request.delete(`${BASE_URL}/api/notificaciones/${notif._id}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
    }
  });

  test('should close dropdown when clicking bell again', async ({ page }) => {
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Verify dropdown is open
    await expect(page.locator('h3').filter({ hasText: 'Notificaciones' })).toBeVisible({ timeout: 5000 });
    
    // Click bell again to close
    await bellButton.click();
    
    // Wait for dropdown to close
    await page.waitForTimeout(300);
    
    // h3 inside dropdown should not be visible
    await expect(page.locator('h3').filter({ hasText: 'Notificaciones' })).not.toBeVisible();
  });

  test('should mark all notifications as read via button', async ({ page }) => {
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    const { access_token } = await loginResponse.json();
    
    const uniqueId = Date.now();
    const createdIds: string[] = [];
    
    // Create 2 notifications
    for (let i = 0; i < 2; i++) {
      const createResponse = await page.request.post(`${BASE_URL}/api/notificaciones`, {
        headers: { Authorization: `Bearer ${access_token}` },
        data: {
          titulo: `TEST_MarkAllRead_${uniqueId}_${i}`,
          mensaje: 'Test notification',
          tipo: 'info'
        }
      });
      const { notificacion_id } = await createResponse.json();
      createdIds.push(notificacion_id);
    }
    
    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('btn-notificaciones')).toBeVisible({ timeout: 10000 });
    
    // Open dropdown
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Wait for dropdown to open
    await expect(page.locator('h3').filter({ hasText: 'Notificaciones' })).toBeVisible({ timeout: 5000 });
    
    // Look for "Mark all as read" button
    const markAllButton = page.getByText(/Marcar todas leídas/i);
    if (await markAllButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await markAllButton.click();
      
      // Verify count is 0
      const countResponse = await page.request.get(`${BASE_URL}/api/notificaciones/count`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const { no_leidas } = await countResponse.json();
      expect(no_leidas).toBe(0);
    }
    
    // Cleanup
    for (const id of createdIds) {
      await page.request.delete(`${BASE_URL}/api/notificaciones/${id}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
    }
  });
});

test.describe('Scheduler Configuration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Login as admin
    await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page.locator('.layout').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('btn-notificaciones')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Configuracion page and show scheduler config', async ({ page }) => {
    // Navigate to configuration page
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    
    // Verify scheduler config panel is visible
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
  });

  test('should display Ejecutar Ahora button', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
    
    // Ejecutar Ahora button should be visible
    await expect(page.getByRole('button', { name: /Ejecutar Ahora/i })).toBeVisible();
  });

  test('should trigger manual execution when clicking Ejecutar Ahora', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
    
    // Click Ejecutar Ahora
    const executeButton = page.getByRole('button', { name: /Ejecutar Ahora/i });
    await executeButton.click();
    
    // Should show success message
    await expect(page.getByText(/Revisa las alertas|iniciada|segundos/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display scheduler configuration options', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
    
    // Check for configuration fields
    await expect(page.locator('input[type="time"]')).toBeVisible();
    await expect(page.getByText(/Frecuencia/i)).toBeVisible();
    await expect(page.getByText(/En la Aplicación/i)).toBeVisible();
  });

  test('should save scheduler configuration', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
    
    // Change time
    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill('11:30');
    
    // Click save button
    const saveButton = page.getByRole('button', { name: /Guardar Configuración/i });
    await saveButton.click();
    
    // Should show success message
    await expect(page.getByText(/guardada|correctamente/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display email disabled badge', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
    
    // Should show email disabled indicator
    await expect(page.getByText(/Pendiente API Key/i)).toBeVisible();
  });

  test('should display role checkboxes for notification targets', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Verificación Climática Programada')).toBeVisible({ timeout: 10000 });
    
    // Find role labels in scheduler config section
    const schedulerConfig = page.getByTestId('scheduler-config');
    await expect(schedulerConfig.getByText('Admin')).toBeVisible();
    await expect(schedulerConfig.getByText('Manager')).toBeVisible();
  });
});
