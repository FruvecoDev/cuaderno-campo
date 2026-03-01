import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://agro-field-1.preview.emergentagent.com';

// Helper functions
async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Check if login page visible (login form)
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first();
  
  // If login form is not visible, we're likely already logged in
  if (await emailInput.isVisible({ timeout: 3000 })) {
    await emailInput.fill('admin@fruveco.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    
    // Click login button
    const loginBtn = page.locator('button:has-text("Iniciar"), button[type="submit"]').first();
    await loginBtn.click();
    
    // Wait for navigation or dashboard element
    await page.waitForLoadState('networkidle');
  }
  
  // Dismiss any modal that appears (Resumen Diario modal)
  await dismissOverlays(page);
}

async function navigateToRRHH(page: Page) {
  // First dismiss any overlays
  await dismissOverlays(page);
  
  // Navigate to RRHH using the sidebar or URL
  await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  
  // Wait for page title
  await expect(page.locator('.page-title:has-text("Recursos Humanos")')).toBeVisible({ timeout: 10000 });
  
  // Dismiss any overlays again
  await dismissOverlays(page);
}

async function dismissOverlays(page: Page) {
  // Remove Emergent badge if present
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
    
    // Remove webpack dev server overlay
    const iframe = document.getElementById('webpack-dev-server-client-overlay');
    if (iframe) iframe.remove();
  });
  
  // Try to dismiss ResumenDiario modal by clicking "Entendido"
  try {
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 2000 })) {
      await entendidoBtn.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Modal not present
  }
  
  // Click outside modal if still present
  try {
    const modal = page.locator('.modal-overlay');
    if (await modal.isVisible({ timeout: 500 })) {
      // Try clicking the X button
      const closeBtn = modal.locator('button').filter({ hasText: /×|X/i }).first();
      if (await closeBtn.isVisible({ timeout: 500 })) {
        await closeBtn.click({ force: true });
      }
    }
  } catch {
    // Modal not present
  }
}

test.describe('RRHH Module - Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display employee list and stats', async ({ page }) => {
    // Verify KPI cards are visible (use first() for disambiguation)
    await expect(page.getByText('Total Empleados').first()).toBeVisible();
    await expect(page.locator('.card').filter({ hasText: /Activos/ }).first()).toBeVisible();
    await expect(page.getByText('Bajas').first()).toBeVisible();
    
    // Verify employee table headers
    await expect(page.getByRole('columnheader', { name: /Código/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Nombre/i })).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: '/app/tests/e2e/rrhh-employees-list.jpeg', quality: 20 });
  });

  test('should open employee modal and verify form fields', async ({ page }) => {
    // Click "Nuevo Empleado" button
    await page.getByRole('button', { name: /Nuevo Empleado/i }).click();
    
    // Wait for modal
    await expect(page.locator('.modal-content h2').first()).toBeVisible({ timeout: 5000 });
    
    // Verify form fields are present
    await expect(page.locator('.modal-content').getByText('Nombre', { exact: true })).toBeVisible();
    await expect(page.locator('.modal-content').getByText('Apellidos', { exact: true })).toBeVisible();
    
    // Take screenshot of form
    await page.screenshot({ path: '/app/tests/e2e/rrhh-new-employee-form.jpeg', quality: 20 });
    
    // Close modal
    await page.locator('.modal-content').getByRole('button', { name: /Cancelar/i }).click();
  });

  test('should open and display QR code modal', async ({ page }) => {
    // Get first employee's QR button
    const qrButtons = page.locator('button[title="Ver QR"]');
    const qrCount = await qrButtons.count();
    
    if (qrCount === 0) {
      test.skip(true, 'No employees found to test QR');
      return;
    }
    
    // Click QR button
    await qrButtons.first().click();
    
    // Wait for QR modal
    await expect(page.locator('.modal-content').getByText('Código QR del Empleado')).toBeVisible({ timeout: 5000 });
    
    // Verify QR image is displayed
    const qrImage = page.locator('.modal-content img[alt="QR Code"]');
    await expect(qrImage).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-qr-modal.jpeg', quality: 20 });
    
    // Close modal
    await page.locator('.modal-header button').first().click();
  });

  test('should edit existing employee', async ({ page }) => {
    // Get first employee's edit button
    const editButtons = page.locator('button[title="Editar"]');
    const editCount = await editButtons.count();
    
    if (editCount === 0) {
      test.skip(true, 'No employees found to test edit');
      return;
    }
    
    await editButtons.first().click();
    
    // Wait for edit modal
    await expect(page.locator('.modal-content h2').first()).toBeVisible({ timeout: 5000 });
    
    // Verify form is populated
    const nombreInput = page.locator('.modal-content input[type="text"]').first();
    const value = await nombreInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
    
    // Close without saving
    await page.locator('.modal-content').getByRole('button', { name: /Cancelar/i }).click();
  });
});

test.describe('RRHH Module - Time Clock (Control Horario)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display time clock tab with stats', async ({ page }) => {
    // Click on "Control Horario" tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Verify stats cards (use first() for disambiguation)
    await expect(page.getByText('Fichados Hoy').first()).toBeVisible();
    await expect(page.getByText('Pendientes').first()).toBeVisible();
    await expect(page.getByText('Total Activos').first()).toBeVisible();
    
    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /Empleado/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-time-clock.jpeg', quality: 20 });
  });

  test('should open manual time registration modal', async ({ page }) => {
    // Go to Control Horario tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Click "Registrar Fichaje" button
    await page.getByRole('button', { name: /Registrar Fichaje/i }).first().click();
    
    // Verify modal opens
    await expect(page.locator('.modal-content h2').first()).toBeVisible({ timeout: 5000 });
    
    // Verify method selection buttons
    await expect(page.locator('.modal-content').getByText('Manual')).toBeVisible();
    await expect(page.locator('.modal-content').getByText('QR')).toBeVisible();
    await expect(page.locator('.modal-content').getByText('Facial')).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-fichaje-modal-manual.jpeg', quality: 20 });
  });

  test('should register manual time entry', async ({ page }) => {
    // Go to Control Horario tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Click "Registrar Fichaje" button
    await page.getByRole('button', { name: /Registrar Fichaje/i }).first().click();
    await expect(page.locator('.modal-content h2').first()).toBeVisible({ timeout: 5000 });
    
    // Select an employee (first active one)
    const employeeSelect = page.locator('.modal-content select').first();
    const options = employeeSelect.locator('option');
    const optionCount = await options.count();
    
    if (optionCount <= 1) {
      test.skip(true, 'No employees available for time registration');
      return;
    }
    
    // Select second option (first is placeholder)
    await employeeSelect.selectOption({ index: 1 });
    
    // Click "Registrar Fichaje" button in modal
    await page.locator('.modal-content button.btn-primary').filter({ hasText: /Registrar Fichaje/i }).click();
    
    // Wait for success message
    await expect(page.getByText('¡Fichaje Registrado!')).toBeVisible({ timeout: 10000 });
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-fichaje-success.jpeg', quality: 20 });
  });

  test('should display QR scanning option', async ({ page }) => {
    // Go to Control Horario tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Click "Registrar Fichaje" button
    await page.getByRole('button', { name: /Registrar Fichaje/i }).first().click();
    
    // Click QR method button
    await page.locator('.modal-content button').filter({ hasText: 'QR' }).first().click();
    
    // Verify QR scanning UI appears
    await expect(page.getByRole('button', { name: /Activar Cámara para Escanear QR/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-fichaje-qr-mode.jpeg', quality: 20 });
  });
});

test.describe('RRHH Module - Documents', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display documents tab', async ({ page }) => {
    // Click on "Documentos" tab
    await page.getByRole('button', { name: /Documentos/i }).click();
    
    // Verify KPI cards (use first() for disambiguation)
    await expect(page.getByText('Total Documentos').first()).toBeVisible();
    await expect(page.getByText('Pendientes de Firma').first()).toBeVisible();
    await expect(page.getByText('Firmados').first()).toBeVisible();
    
    // Verify new document button
    await expect(page.getByRole('button', { name: /Nuevo Documento/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-documents.jpeg', quality: 20 });
  });

  test('should create new document', async ({ page }) => {
    const timestamp = Date.now();
    const docName = `Test_Contrato_${timestamp}`;
    
    // Go to Documents tab
    await page.getByRole('button', { name: /Documentos/i }).click();
    
    // Select an employee first
    const employeeSelect = page.locator('select').filter({ hasText: /Todos los empleados/i });
    const options = employeeSelect.locator('option');
    const optionCount = await options.count();
    
    if (optionCount <= 1) {
      test.skip(true, 'No employees available for document creation');
      return;
    }
    
    await employeeSelect.selectOption({ index: 1 });
    
    // Click "Nuevo Documento" button
    await page.getByRole('button', { name: /Nuevo Documento/i }).click();
    
    // Verify modal opens
    await expect(page.locator('.modal-content h2').first()).toBeVisible({ timeout: 5000 });
    
    // Fill document name
    await page.locator('.modal-content input[type="text"]').fill(docName);
    
    // Take screenshot
    await page.screenshot({ path: '/app/tests/e2e/rrhh-new-document-modal.jpeg', quality: 20 });
    
    // Click "Crear Documento"
    await page.locator('.modal-content').getByRole('button', { name: /Crear Documento/i }).click();
    
    // Wait for page to reload
    await page.waitForLoadState('networkidle');
    
    // Verify document appears in table
    await expect(page.getByText(docName)).toBeVisible({ timeout: 5000 });
  });

  test('should open signature modal', async ({ page }) => {
    // Go to Documents tab
    await page.getByRole('button', { name: /Documentos/i }).click();
    
    // First select an employee to see documents
    const employeeSelect = page.locator('select').filter({ hasText: /Todos los empleados/i });
    const optionCount = await employeeSelect.locator('option').count();
    
    if (optionCount <= 1) {
      test.skip(true, 'No employees available');
      return;
    }
    
    await employeeSelect.selectOption({ index: 1 });
    await page.waitForLoadState('networkidle');
    
    // Create a document if needed
    let signButtons = page.locator('button[title="Firmar documento"]');
    let signCount = await signButtons.count();
    
    if (signCount === 0) {
      // Create a document first
      await page.getByRole('button', { name: /Nuevo Documento/i }).click();
      await page.locator('.modal-content input[type="text"]').fill(`Test_Firma_${Date.now()}`);
      await page.locator('.modal-content').getByRole('button', { name: /Crear Documento/i }).click();
      await page.waitForLoadState('networkidle');
      
      signButtons = page.locator('button[title="Firmar documento"]');
      signCount = await signButtons.count();
    }
    
    if (signCount === 0) {
      test.skip(true, 'Could not create document for signing');
      return;
    }
    
    // Click first sign button
    await signButtons.first().click();
    
    // Verify signature modal opens
    await expect(page.locator('.modal-content h2').first()).toBeVisible({ timeout: 5000 });
    
    // Verify signature canvas area
    await expect(page.getByText('Firme en el recuadro')).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-signature-modal.jpeg', quality: 20 });
  });
});

test.describe('RRHH Module - Productivity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display productivity stats', async ({ page }) => {
    // Click on "Productividad" tab
    await page.getByRole('button', { name: /Productividad/i }).click();
    
    // Wait for productivity tab content
    await page.waitForLoadState('networkidle');
    
    // Verify real-time section
    await expect(page.getByText('Productividad en Tiempo Real').first()).toBeVisible({ timeout: 10000 });
    
    // Verify KPI cards (use first())
    await expect(page.getByText('Kilos Hoy').first()).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-productivity.jpeg', quality: 20 });
  });
});

test.describe('RRHH Module - Pre-payroll (Prenómina)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToRRHH(page);
  });

  test('should display prenomina tab with period selector', async ({ page }) => {
    // Click on "Prenómina" tab
    await page.getByRole('button', { name: /Prenómina/i }).click();
    
    // Verify "Calcular Prenóminas" button
    await expect(page.getByRole('button', { name: /Calcular Prenóminas/i })).toBeVisible();
    
    // Verify "Total Bruto" display
    await expect(page.getByText('Total Bruto:')).toBeVisible();
    
    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /Empleado/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-prenomina.jpeg', quality: 20 });
  });

  test('should calculate prenominas for all employees', async ({ page }) => {
    // Go to Prenómina tab
    await page.getByRole('button', { name: /Prenómina/i }).click();
    
    // Accept the confirmation dialog
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    // Click "Calcular Prenóminas" button
    await page.getByRole('button', { name: /Calcular Prenóminas/i }).click();
    
    // Wait for button to not be in "Calculando..." state
    await expect(page.getByRole('button', { name: /Calcular Prenóminas/i })).toBeEnabled({ timeout: 30000 });
    
    // Take screenshot
    await page.screenshot({ path: '/app/tests/e2e/rrhh-prenomina-calculated.jpeg', quality: 20 });
  });
});
