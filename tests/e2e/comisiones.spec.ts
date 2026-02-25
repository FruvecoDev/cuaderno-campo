import { test, expect, Page } from '@playwright/test';

// Helper functions
async function login(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  
  // Check if already logged in
  if (page.url().includes('/dashboard')) {
    return;
  }
  
  // Fill login form
  await page.locator('input[type="email"], input[placeholder*="email"]').first().fill('admin@fruveco.com');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  
  // Wait for redirect
  await expect(page).not.toHaveURL(/login/i, { timeout: 10000 });
}

async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) (badge as HTMLElement).remove();
  });
}

test.describe('Commission System Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await removeEmergentBadge(page);
  });

  test.describe('Liquidación Comisiones Page', () => {
    
    test('should load Liquidación Comisiones page with KPIs', async ({ page }) => {
      await page.goto('/liquidacion-comisiones', { waitUntil: 'domcontentloaded' });
      
      // Check page title
      await expect(page.getByText('Liquidación de Comisiones')).toBeVisible();
      
      // Check KPI cards are present
      const kpis = page.getByTestId('comisiones-kpis');
      await expect(kpis).toBeVisible();
      
      // Check specific KPI labels
      await expect(page.getByText('Comisiones Compra')).toBeVisible();
      await expect(page.getByText('Comisiones Venta')).toBeVisible();
      await expect(page.getByText('Total General')).toBeVisible();
      await expect(page.getByText('Agentes con Comisión')).toBeVisible();
    });
    
    test('should display filters section', async ({ page }) => {
      await page.goto('/liquidacion-comisiones', { waitUntil: 'domcontentloaded' });
      
      // Check filters are present
      await expect(page.getByText('Filtros')).toBeVisible();
      await expect(page.getByTestId('filter-campana')).toBeVisible();
      await expect(page.getByTestId('filter-tipo-agente')).toBeVisible();
      await expect(page.getByTestId('filter-agente')).toBeVisible();
    });
    
    test('should filter by campaign', async ({ page }) => {
      await page.goto('/liquidacion-comisiones', { waitUntil: 'domcontentloaded' });
      
      // Select a campaign
      const campaignFilter = page.getByTestId('filter-campana');
      await campaignFilter.selectOption('2025/26');
      
      // Wait for data to refresh
      await page.waitForLoadState('networkidle');
      
      // Check that data is filtered (no error shown)
      await expect(page.locator('.error')).not.toBeVisible();
    });
    
    test('should filter by agent type', async ({ page }) => {
      await page.goto('/liquidacion-comisiones', { waitUntil: 'domcontentloaded' });
      
      // Select "Agentes de Compra"
      const tipoFilter = page.getByTestId('filter-tipo-agente');
      await tipoFilter.selectOption('compra');
      
      // Wait for data to refresh
      await page.waitForLoadState('networkidle');
      
      // If there are agents with commissions, check they are all "compra" type
      const agentCards = page.locator('[data-testid^="agente-card-"]');
      const count = await agentCards.count();
      
      if (count > 0) {
        // All visible agents should be "Agente de Compra"
        for (let i = 0; i < count; i++) {
          const card = agentCards.nth(i);
          await expect(card.getByText('Agente de Compra')).toBeVisible();
        }
      }
    });
    
    test('should show agent details with contracts table', async ({ page }) => {
      await page.goto('/liquidacion-comisiones', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      // Check if there are agent cards
      const agentCards = page.locator('[data-testid^="agente-card-"]');
      const count = await agentCards.count();
      
      if (count > 0) {
        const firstCard = agentCards.first();
        
        // Check agent card has expected elements
        await expect(firstCard.getByText('Total Comisión')).toBeVisible();
        await expect(firstCard.locator('button').filter({ hasText: 'PDF' })).toBeVisible();
        
        // Check summary metrics - use exact match to avoid ambiguity
        await expect(firstCard.getByText('Contratos', { exact: true })).toBeVisible();
        await expect(firstCard.getByText('Total Kg')).toBeVisible();
        await expect(firstCard.getByText('Importe Contratos')).toBeVisible();
        
        // Check table has content
        await expect(firstCard.locator('table')).toBeVisible();
      }
    });
    
    test('should have PDF download button for each agent', async ({ page }) => {
      await page.goto('/liquidacion-comisiones', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      const agentCards = page.locator('[data-testid^="agente-card-"]');
      const count = await agentCards.count();
      
      if (count > 0) {
        // Each agent card should have a PDF download button
        const pdfButtons = page.locator('[data-testid^="download-pdf-"]');
        expect(await pdfButtons.count()).toBeGreaterThanOrEqual(count);
      }
    });
  });

  test.describe('Contract Commission Fields', () => {
    
    test('should show contract form when clicking new contract button', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      
      // Click "Nuevo Contrato" button
      await page.getByTestId('btn-nuevo-contrato').click();
      
      // Check form is visible
      await expect(page.getByTestId('contrato-form')).toBeVisible();
    });
    
    test('should show agent field based on contract type', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('btn-nuevo-contrato').click();
      
      // For "Compra" type, should show "Agente de Compra"
      await page.getByTestId('select-tipo-contrato').selectOption('Compra');
      await expect(page.getByTestId('select-agente-compra')).toBeVisible();
      
      // Check that commission fields are NOT visible until agent is selected
      const comisionTipo = page.getByTestId('select-comision-compra-tipo');
      await expect(comisionTipo).not.toBeVisible();
    });
    
    test('should show commission fields when purchase agent is selected', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('btn-nuevo-contrato').click();
      
      // Ensure type is "Compra"
      await page.getByTestId('select-tipo-contrato').selectOption('Compra');
      
      // Wait for agents to load
      await page.waitForLoadState('networkidle');
      
      // Select an agent
      const agenteSelect = page.getByTestId('select-agente-compra');
      const options = await agenteSelect.locator('option').allTextContents();
      
      // Find a non-empty option
      const agentOption = options.find(opt => opt !== 'Sin agente' && opt.trim() !== '');
      
      if (agentOption) {
        await agenteSelect.selectOption({ label: agentOption });
        
        // Now commission fields should be visible
        await expect(page.getByTestId('select-comision-compra-tipo')).toBeVisible();
        await expect(page.getByTestId('input-comision-compra-valor')).toBeVisible();
      }
    });
    
    test('should have percentage and euro/kilo options in commission type', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('btn-nuevo-contrato').click();
      
      await page.getByTestId('select-tipo-contrato').selectOption('Compra');
      await page.waitForLoadState('networkidle');
      
      // Select an agent
      const agenteSelect = page.getByTestId('select-agente-compra');
      const options = await agenteSelect.locator('option').allTextContents();
      const agentOption = options.find(opt => opt !== 'Sin agente' && opt.trim() !== '');
      
      if (agentOption) {
        await agenteSelect.selectOption({ label: agentOption });
        
        // Check commission type options
        const comisionTipo = page.getByTestId('select-comision-compra-tipo');
        await expect(comisionTipo).toBeVisible();
        
        const tipoOptions = await comisionTipo.locator('option').allTextContents();
        expect(tipoOptions.some(opt => opt.includes('Porcentaje'))).toBe(true);
        expect(tipoOptions.some(opt => opt.includes('€ por Kilo'))).toBe(true);
      }
    });
    
    test('should show sale agent fields for Venta type contract', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('btn-nuevo-contrato').click();
      
      // Change to "Venta" type
      await page.getByTestId('select-tipo-contrato').selectOption('Venta');
      await page.waitForLoadState('networkidle');
      
      // Should show "Agente de Venta" selector
      await expect(page.getByTestId('select-agente-venta')).toBeVisible();
      
      // Select a sale agent
      const agenteSelect = page.getByTestId('select-agente-venta');
      const options = await agenteSelect.locator('option').allTextContents();
      const agentOption = options.find(opt => opt !== 'Sin agente' && opt.trim() !== '');
      
      if (agentOption) {
        await agenteSelect.selectOption({ label: agentOption });
        
        // Commission fields for sale should be visible
        await expect(page.getByTestId('select-comision-venta-tipo')).toBeVisible();
        await expect(page.getByTestId('input-comision-venta-valor')).toBeVisible();
      }
    });
    
    test('should hide commission fields when agent is cleared', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('btn-nuevo-contrato').click();
      
      await page.getByTestId('select-tipo-contrato').selectOption('Compra');
      await page.waitForLoadState('networkidle');
      
      const agenteSelect = page.getByTestId('select-agente-compra');
      const options = await agenteSelect.locator('option').allTextContents();
      const agentOption = options.find(opt => opt !== 'Sin agente' && opt.trim() !== '');
      
      if (agentOption) {
        // Select agent
        await agenteSelect.selectOption({ label: agentOption });
        await expect(page.getByTestId('select-comision-compra-tipo')).toBeVisible();
        
        // Clear agent
        await agenteSelect.selectOption({ label: 'Sin agente' });
        
        // Commission fields should be hidden
        await expect(page.getByTestId('select-comision-compra-tipo')).not.toBeVisible();
      }
    });
  });

  test.describe('Contracts Table Display', () => {
    
    test('should display contracts table with type column', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      
      // Check table is present
      await expect(page.getByTestId('contratos-table')).toBeVisible();
      
      // Check "Tipo" column header exists
      const headers = await page.locator('[data-testid="contratos-table"] thead th').allTextContents();
      expect(headers.some(h => h.includes('Tipo'))).toBe(true);
    });
    
    test('should show Compra/Venta badges in contracts list', async ({ page }) => {
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      
      // Check for contract type badges
      const compraVentaBadges = page.locator('[data-testid="contratos-table"] tbody tr td:nth-child(2) span');
      const count = await compraVentaBadges.count();
      
      if (count > 0) {
        // Each badge should be either "Compra" or "Venta"
        for (let i = 0; i < Math.min(count, 3); i++) {
          const text = await compraVentaBadges.nth(i).textContent();
          expect(text === 'Compra' || text === 'Venta').toBe(true);
        }
      }
    });
  });
});
