import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://agro-rrhh-app.preview.emergentagent.com';

// Helper functions
async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Check if already logged in
  const url = page.url();
  if (url.includes('/dashboard')) {
    return;
  }
  
  // Fill login form
  await page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="usuario"]').first().fill('admin@fruveco.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  
  // Click login button
  const loginBtn = page.locator('button:has-text("Iniciar"), button[type="submit"]').first();
  await loginBtn.click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

async function navigateToRRHH(page: Page) {
  // Click on RRHH in the sidebar
  const rrhhLink = page.locator('nav a, aside a, .sidebar a').filter({ hasText: /Recursos Humanos|RRHH/i }).first();
  if (await rrhhLink.isVisible()) {
    await rrhhLink.click();
  } else {
    // Try navigating directly
    await page.goto('/rrhh', { waitUntil: 'domcontentloaded' });
  }
  
  // Wait for the RRHH page to load
  await expect(page.getByText('Recursos Humanos')).toBeVisible({ timeout: 10000 });
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
  
  // Try to dismiss ResumenDiario modal if present
  try {
    const entendidoBtn = page.getByRole('button', { name: /Entendido/i });
    if (await entendidoBtn.isVisible({ timeout: 1000 })) {
      await entendidoBtn.click();
    }
  } catch {
    // Modal not present
  }
}

test.describe('RRHH Module - Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissOverlays(page);
    await navigateToRRHH(page);
    await dismissOverlays(page);
  });

  test('should display employee list and stats', async ({ page }) => {
    // Verify KPI cards are visible
    await expect(page.getByText('Total Empleados')).toBeVisible();
    await expect(page.getByText('Activos')).toBeVisible();
    await expect(page.getByText('Bajas')).toBeVisible();
    
    // Verify employee table headers
    await expect(page.getByRole('columnheader', { name: /Código/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Nombre/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /DNI/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Puesto/i })).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: '/app/tests/e2e/rrhh-employees-list.jpeg', quality: 20 });
  });

  test('should create new employee', async ({ page }) => {
    const timestamp = Date.now();
    const testName = `TestEmpleado${timestamp}`;
    
    // Click "Nuevo Empleado" button
    await page.getByRole('button', { name: /Nuevo Empleado/i }).click();
    
    // Wait for modal
    await expect(page.getByText('Nuevo Empleado')).toBeVisible();
    
    // Fill form
    await page.locator('input').filter({ hasText: '' }).locator('xpath=..').filter({ hasText: /Nombre/i }).locator('input').fill(testName);
    // Alternative: fill by input position
    const nombreInput = page.locator('.modal-content input[type="text"]').first();
    await nombreInput.fill(testName);
    
    // Fill apellidos
    const inputs = page.locator('.modal-content input[type="text"]');
    await inputs.nth(1).fill('Prueba García');
    
    // Fill DNI
    await inputs.nth(2).fill(`TEST${timestamp}`);
    
    // Take screenshot of form
    await page.screenshot({ path: '/app/tests/e2e/rrhh-new-employee-form.jpeg', quality: 20 });
    
    // Submit form
    await page.getByRole('button', { name: /Crear Empleado/i }).click();
    
    // Verify modal closes and employee appears in list
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 10000 });
    
    // Verify new employee appears in table (might need to search)
    await page.locator('input[placeholder*="Buscar"]').fill(testName);
    await expect(page.getByText(testName)).toBeVisible({ timeout: 5000 });
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
    await expect(page.getByText('Código QR del Empleado')).toBeVisible({ timeout: 5000 });
    
    // Verify QR image is displayed
    const qrImage = page.locator('img[alt="QR Code"]');
    await expect(qrImage).toBeVisible();
    
    // Verify download button exists
    await expect(page.getByRole('button', { name: /Descargar QR/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-qr-modal.jpeg', quality: 20 });
    
    // Close modal
    await page.locator('.modal-overlay button.btn-ghost').first().click();
    await expect(page.getByText('Código QR del Empleado')).not.toBeVisible();
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
    await expect(page.getByText('Editar Empleado')).toBeVisible({ timeout: 5000 });
    
    // Verify form is populated
    const nombreInput = page.locator('.modal-content input[type="text"]').first();
    const value = await nombreInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
    
    // Close without saving
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByText('Editar Empleado')).not.toBeVisible();
  });
});

test.describe('RRHH Module - Time Clock (Control Horario)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissOverlays(page);
    await navigateToRRHH(page);
    await dismissOverlays(page);
  });

  test('should display time clock tab with stats', async ({ page }) => {
    // Click on "Control Horario" tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Verify stats cards
    await expect(page.getByText('Fichados Hoy')).toBeVisible();
    await expect(page.getByText('Pendientes')).toBeVisible();
    await expect(page.getByText('Total Activos')).toBeVisible();
    
    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /Empleado/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Tipo/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Hora/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-time-clock.jpeg', quality: 20 });
  });

  test('should open manual time registration modal', async ({ page }) => {
    // Go to Control Horario tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Click "Registrar Fichaje" button
    await page.getByRole('button', { name: /Registrar Fichaje/i }).click();
    
    // Verify modal opens
    await expect(page.getByText('Registrar Fichaje')).toBeVisible({ timeout: 5000 });
    
    // Verify method selection buttons
    await expect(page.getByText('Manual')).toBeVisible();
    await expect(page.getByText('QR')).toBeVisible();
    await expect(page.getByText('NFC')).toBeVisible();
    await expect(page.getByText('Facial')).toBeVisible();
    
    // Manual should be selected by default - verify employee select is visible
    await expect(page.locator('select').filter({ hasText: /Seleccionar empleado/i })).toBeVisible();
    
    // Verify Entrada/Salida buttons
    await expect(page.getByRole('button', { name: /Entrada/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Salida/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-fichaje-modal-manual.jpeg', quality: 20 });
  });

  test('should register manual time entry', async ({ page }) => {
    // Go to Control Horario tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Get initial fichaje count
    const initialTable = page.locator('table.data-table tbody');
    
    // Click "Registrar Fichaje" button
    await page.getByRole('button', { name: /Registrar Fichaje/i }).click();
    await expect(page.getByText('Registrar Fichaje')).toBeVisible();
    
    // Select an employee (first active one)
    const employeeSelect = page.locator('select').filter({ hasText: /Seleccionar empleado/i });
    const options = employeeSelect.locator('option');
    const optionCount = await options.count();
    
    if (optionCount <= 1) {
      test.skip(true, 'No employees available for time registration');
      return;
    }
    
    // Select second option (first is placeholder)
    await employeeSelect.selectOption({ index: 1 });
    
    // Click "Registrar Fichaje" in modal
    await page.getByRole('button', { name: /Registrar Fichaje/i }).last().click();
    
    // Wait for success message or modal close
    await expect(page.getByText('¡Fichaje Registrado!')).toBeVisible({ timeout: 5000 });
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-fichaje-success.jpeg', quality: 20 });
  });

  test('should display QR scanning option', async ({ page }) => {
    // Go to Control Horario tab
    await page.getByRole('button', { name: /Control Horario/i }).click();
    
    // Click "Registrar Fichaje" button
    await page.getByRole('button', { name: /Registrar Fichaje/i }).click();
    
    // Click QR method button
    await page.locator('button').filter({ hasText: 'QR' }).click();
    
    // Verify QR scanning UI appears
    await expect(page.getByRole('button', { name: /Activar Cámara para Escanear QR/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-fichaje-qr-mode.jpeg', quality: 20 });
  });
});

test.describe('RRHH Module - Documents', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissOverlays(page);
    await navigateToRRHH(page);
    await dismissOverlays(page);
  });

  test('should display documents tab', async ({ page }) => {
    // Click on "Documentos" tab
    await page.getByRole('button', { name: /Documentos/i }).click();
    
    // Verify KPI cards
    await expect(page.getByText('Total Documentos')).toBeVisible();
    await expect(page.getByText('Pendientes de Firma')).toBeVisible();
    await expect(page.getByText('Firmados')).toBeVisible();
    
    // Verify employee filter select
    await expect(page.locator('select').filter({ hasText: /Todos los empleados/i })).toBeVisible();
    
    // Verify new document button (disabled when no employee selected)
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
    await expect(page.getByText('Nuevo Documento')).toBeVisible({ timeout: 5000 });
    
    // Fill document name
    await page.locator('.modal-content input[type="text"]').fill(docName);
    
    // Document type select should be visible
    const tipoSelect = page.locator('.modal-content select');
    await expect(tipoSelect).toBeVisible();
    
    // Verify checkbox for signature requirement
    await expect(page.getByText('Requiere firma del empleado')).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-new-document-modal.jpeg', quality: 20 });
    
    // Click "Crear Documento"
    await page.getByRole('button', { name: /Crear Documento/i }).click();
    
    // Verify document created (modal closes)
    await expect(page.locator('.modal-overlay').filter({ hasText: 'Nuevo Documento' })).not.toBeVisible({ timeout: 5000 });
    
    // Verify document appears in table
    await expect(page.getByText(docName)).toBeVisible({ timeout: 5000 });
  });

  test('should open signature modal for pending document', async ({ page }) => {
    // Go to Documents tab
    await page.getByRole('button', { name: /Documentos/i }).click();
    
    // Find a pending signature button (PenTool icon)
    const signButtons = page.locator('button[title="Firmar documento"]');
    const signCount = await signButtons.count();
    
    if (signCount === 0) {
      // Create a document first to have something to sign
      const employeeSelect = page.locator('select').filter({ hasText: /Todos los empleados/i });
      const options = employeeSelect.locator('option');
      const optionCount = await options.count();
      
      if (optionCount <= 1) {
        test.skip(true, 'No employees and no pending documents');
        return;
      }
      
      await employeeSelect.selectOption({ index: 1 });
      await page.getByRole('button', { name: /Nuevo Documento/i }).click();
      await page.locator('.modal-content input[type="text"]').fill(`Test_Firma_${Date.now()}`);
      await page.getByRole('button', { name: /Crear Documento/i }).click();
      await expect(page.locator('.modal-overlay').filter({ hasText: 'Nuevo Documento' })).not.toBeVisible({ timeout: 5000 });
      
      // Now find the sign button again
      await expect(page.locator('button[title="Firmar documento"]').first()).toBeVisible({ timeout: 5000 });
    }
    
    // Click first sign button
    await page.locator('button[title="Firmar documento"]').first().click();
    
    // Verify signature modal opens
    await expect(page.getByText('Firmar Documento')).toBeVisible({ timeout: 5000 });
    
    // Verify signature canvas area
    await expect(page.getByText('Firme en el recuadro a continuación')).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByRole('button', { name: /Limpiar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Capturar Firma/i })).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-signature-modal.jpeg', quality: 20 });
  });
});

test.describe('RRHH Module - Productivity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissOverlays(page);
    await navigateToRRHH(page);
    await dismissOverlays(page);
  });

  test('should display productivity stats', async ({ page }) => {
    // Click on "Productividad" tab
    await page.getByRole('button', { name: /Productividad/i }).click();
    
    // Wait for productivity tab content
    await page.waitForLoadState('domcontentloaded');
    
    // Verify real-time section
    await expect(page.getByText('Productividad en Tiempo Real').first()).toBeVisible({ timeout: 10000 });
    
    // Verify KPI cards
    await expect(page.getByText('Kilos Hoy').first()).toBeVisible();
    
    // Verify period stats
    await expect(page.getByText('Kilos Totales').first()).toBeVisible();
    await expect(page.getByText('Hectáreas').first()).toBeVisible();
    await expect(page.getByText('Horas Trabajadas').first()).toBeVisible();
    
    await page.screenshot({ path: '/app/tests/e2e/rrhh-productivity.jpeg', quality: 20 });
  });
});

test.describe('RRHH Module - Pre-payroll (Prenómina)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await dismissOverlays(page);
    await navigateToRRHH(page);
    await dismissOverlays(page);
  });

  test('should display prenomina tab with period selector', async ({ page }) => {
    // Click on "Prenómina" tab
    await page.getByRole('button', { name: /Prenómina/i }).click();
    
    // Verify month and year selectors
    const selects = page.locator('.form-select');
    await expect(selects.first()).toBeVisible(); // Month
    await expect(selects.nth(1)).toBeVisible(); // Year
    
    // Verify "Calcular Prenóminas" button
    await expect(page.getByRole('button', { name: /Calcular Prenóminas/i })).toBeVisible();
    
    // Verify "Total Bruto" display
    await expect(page.getByText('Total Bruto:')).toBeVisible();
    
    // Verify table headers
    await expect(page.getByRole('columnheader', { name: /Empleado/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /H. Normales/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Importe Bruto/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Estado/i })).toBeVisible();
    
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
    
    // Wait for calculation to complete
    await expect(page.getByRole('button', { name: /Calcular Prenóminas/i })).not.toHaveText('Calculando...', { timeout: 30000 });
    
    // Verify prenominas appear in table or message changes
    await page.screenshot({ path: '/app/tests/e2e/rrhh-prenomina-calculated.jpeg', quality: 20 });
  });
});
