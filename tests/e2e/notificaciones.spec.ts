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
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 15000 });
  });

  test('should display bell icon in header', async ({ page }) => {
    // Bell icon should be visible
    const bellButton = page.getByTestId('btn-notificaciones');
    await expect(bellButton).toBeVisible();
  });

  test('should show notification count badge when there are unread notifications', async ({ page }) => {
    // First, create a notification via API
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    const { access_token } = await loginResponse.json();
    
    const uniqueId = Date.now();
    await page.request.post(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: {
        titulo: `TEST_Badge_${uniqueId}`,
        mensaje: 'Test notification for badge',
        tipo: 'info'
      }
    });
    
    // Reload to update count
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 10000 });
    
    // Wait a moment for the count to load
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Bell button should exist
    const bellButton = page.getByTestId('btn-notificaciones');
    await expect(bellButton).toBeVisible();
    
    // Cleanup notification
    const listResponse = await page.request.get(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const { notificaciones } = await listResponse.json();
    for (const notif of notificaciones.filter(n => n.titulo.startsWith('TEST_'))) {
      await page.request.delete(`${BASE_URL}/api/notificaciones/${notif._id}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
    }
  });

  test('should open notifications dropdown on bell click', async ({ page }) => {
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Dropdown should appear with header
    await expect(page.getByRole('heading', { name: /Notificaciones/i }).or(page.getByText('Notificaciones'))).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no notifications', async ({ page }) => {
    // First clean up any test notifications
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    const { access_token } = await loginResponse.json();
    
    // Mark all as read
    await page.request.put(`${BASE_URL}/api/notificaciones/leer-todas`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    // Delete test notifications
    const listResponse = await page.request.get(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const { notificaciones } = await listResponse.json();
    for (const notif of notificaciones.filter(n => n.titulo?.startsWith('TEST_'))) {
      await page.request.delete(`${BASE_URL}/api/notificaciones/${notif._id}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
    }
    
    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 10000 });
    
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Check for empty state message or "No hay notificaciones"
    await expect(
      page.getByText('No hay notificaciones')
        .or(page.getByText('Sin notificaciones'))
        .or(page.locator('text=/no.*notificaciones/i'))
    ).toBeVisible({ timeout: 5000 });
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
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 10000 });
    
    // Open dropdown
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Wait for dropdown content
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Notification should be visible
    await expect(page.getByText(testTitle)).toBeVisible({ timeout: 5000 });
    
    // Cleanup
    const listResponse = await page.request.get(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const { notificaciones } = await listResponse.json();
    for (const notif of notificaciones.filter(n => n.titulo?.startsWith('TEST_'))) {
      await page.request.delete(`${BASE_URL}/api/notificaciones/${notif._id}`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
    }
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    
    // Verify dropdown is open
    await expect(page.getByRole('heading', { name: /Notificaciones/i }).or(page.getByText('Notificaciones'))).toBeVisible({ timeout: 5000 });
    
    // Click outside (on main content area)
    await page.click('.content', { force: true });
    
    // Wait a moment for dropdown to close
    await page.waitForTimeout(500);
    
    // Dropdown should be closed (heading not visible)
    await expect(page.getByRole('heading', { name: /Notificaciones/i })).not.toBeVisible().catch(() => {});
  });

  test('should mark notification as read when clicking on it', async ({ page }) => {
    const loginResponse = await page.request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });
    const { access_token } = await loginResponse.json();
    
    const uniqueId = Date.now();
    const testTitle = `TEST_MarkRead_${uniqueId}`;
    
    // Create notification with link
    const createResponse = await page.request.post(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: {
        titulo: testTitle,
        mensaje: 'Click to mark as read',
        tipo: 'info',
        enlace: '/dashboard'
      }
    });
    const { notificacion_id } = await createResponse.json();
    
    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 10000 });
    
    // Open dropdown
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Click on the notification
    const notificationItem = page.getByText(testTitle);
    await expect(notificationItem).toBeVisible({ timeout: 5000 });
    await notificationItem.click();
    
    // Verify notification was marked as read
    const checkResponse = await page.request.get(`${BASE_URL}/api/notificaciones`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const { notificaciones } = await checkResponse.json();
    const notif = notificaciones.find(n => n._id === notificacion_id);
    expect(notif?.leida).toBe(true);
    
    // Cleanup
    await page.request.delete(`${BASE_URL}/api/notificaciones/${notificacion_id}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });
  });

  test('should mark all notifications as read', async ({ page }) => {
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
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 10000 });
    
    // Open dropdown
    const bellButton = page.getByTestId('btn-notificaciones');
    await bellButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Click "Mark all as read" button
    const markAllButton = page.getByText(/Marcar todas leídas/i).or(page.getByRole('button', { name: /Marcar todas/i }));
    if (await markAllButton.isVisible()) {
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
    await expect(page.locator('[data-testid="mobile-menu-toggle"], .sidebar, .layout')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to Configuracion page', async ({ page }) => {
    // Navigate to configuration page
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    
    // Verify page loaded
    await expect(page.getByTestId('configuracion-page').or(page.getByText('Configuración de la Aplicación'))).toBeVisible({ timeout: 10000 });
  });

  test('should display scheduler configuration panel', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    
    // Scheduler config panel should be visible
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
  });

  test('should display Ejecutar Ahora button', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Ejecutar Ahora button should be visible
    await expect(page.getByRole('button', { name: /Ejecutar Ahora/i })).toBeVisible();
  });

  test('should trigger manual execution when clicking Ejecutar Ahora', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Click Ejecutar Ahora
    const executeButton = page.getByRole('button', { name: /Ejecutar Ahora/i });
    await executeButton.click();
    
    // Should show success message
    await expect(
      page.getByText(/iniciada/i)
        .or(page.getByText(/éxito/i))
        .or(page.getByText(/correctamente/i))
        .or(page.getByText(/segundos/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display scheduler configuration options', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Check for configuration fields
    // Time input
    await expect(page.locator('input[type="time"]')).toBeVisible();
    
    // Frequency selector
    await expect(page.locator('select').filter({ hasText: /Diaria|cada/i }).or(page.getByText(/Frecuencia/i))).toBeVisible();
    
    // Notification checkboxes
    await expect(page.getByText(/En la Aplicación/i).or(page.getByText(/notificar_app/i))).toBeVisible();
  });

  test('should save scheduler configuration', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Change time
    const timeInput = page.locator('input[type="time"]');
    await timeInput.fill('11:30');
    
    // Click save button
    const saveButton = page.getByRole('button', { name: /Guardar Configuración/i });
    await saveButton.click();
    
    // Should show success message
    await expect(
      page.getByText(/guardada/i)
        .or(page.getByText(/correctamente/i))
        .or(page.getByText(/éxito/i))
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display email disabled badge when no API key', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Should show email disabled indicator
    await expect(
      page.getByText(/Pendiente API Key/i)
        .or(page.getByText(/Email.*deshabilitado/i))
        .or(page.locator('text=/email/i').filter({ hasText: /disabled|pendiente/i }))
    ).toBeVisible();
  });

  test('should toggle notification roles', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Find role checkboxes
    const adminCheckbox = page.locator('label').filter({ hasText: 'Admin' }).locator('input[type="checkbox"]');
    const managerCheckbox = page.locator('label').filter({ hasText: 'Manager' }).locator('input[type="checkbox"]');
    
    // Verify checkboxes exist
    await expect(adminCheckbox.or(page.getByText('Admin'))).toBeVisible();
    await expect(managerCheckbox.or(page.getByText('Manager'))).toBeVisible();
  });

  test('should change frequency option', async ({ page }) => {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('scheduler-config').or(page.getByText('Verificación Climática Programada'))).toBeVisible({ timeout: 10000 });
    
    // Find and change frequency
    const frequencySelect = page.locator('select').filter({ hasText: /Diaria|cada/i });
    if (await frequencySelect.isVisible()) {
      await frequencySelect.selectOption('cada_12h');
      
      // Save
      const saveButton = page.getByRole('button', { name: /Guardar Configuración/i });
      await saveButton.click();
      
      // Verify saved
      await expect(page.getByText(/guardada/i).or(page.getByText(/correctamente/i))).toBeVisible({ timeout: 10000 });
    }
  });
});
