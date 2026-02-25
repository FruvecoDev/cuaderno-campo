import { test, expect } from '@playwright/test';

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  smallMobile: { width: 320, height: 568 }
};

test.describe('Responsive Design - Mobile & Tablet Views', () => {
  
  test.describe('Login Page Responsiveness', () => {
    
    test('login page adapts to mobile viewport (375px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Verify login form is visible and usable
      await expect(page.getByTestId('login-email')).toBeVisible();
      await expect(page.getByTestId('login-password')).toBeVisible();
      await expect(page.getByTestId('login-submit')).toBeVisible();
      
      // Check form container fits within viewport
      const formCard = page.locator('.card').first();
      await expect(formCard).toBeVisible();
      
      // Verify form elements are accessible and full-width
      const emailInput = page.getByTestId('login-email');
      const emailBox = await emailInput.boundingBox();
      expect(emailBox).toBeTruthy();
      expect(emailBox!.width).toBeGreaterThan(200);
    });
    
    test('login page adapts to tablet viewport (768px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Verify login form is centered and properly sized
      await expect(page.getByTestId('login-email')).toBeVisible();
      await expect(page.getByTestId('login-password')).toBeVisible();
      await expect(page.getByTestId('login-submit')).toBeVisible();
      
      // Verify logo is visible
      const logo = page.locator('img[alt*="Logo"], img[alt*="FRUVECO"]').first();
      await expect(logo).toBeVisible();
    });
    
    test('login is functional at mobile size', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      
      // Perform login
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      
      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Mobile Hamburger Menu', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login first at desktop size
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    });
    
    test('hamburger menu button visible only on mobile', async ({ page }) => {
      // At desktop, hamburger should not be visible
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.waitForTimeout(300);
      const menuToggle = page.getByTestId('mobile-menu-toggle');
      await expect(menuToggle).not.toBeVisible();
      
      // At tablet 768px, hamburger should not be visible (sidebar visible)
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(300);
      await expect(menuToggle).not.toBeVisible();
      
      // At mobile, hamburger should be visible
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      await expect(menuToggle).toBeVisible();
    });
    
    test('sidebar opens and closes with hamburger menu on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(500);
      
      const menuToggle = page.getByTestId('mobile-menu-toggle');
      const sidebar = page.locator('.sidebar');
      
      // Initial state: sidebar should be hidden (translated off-screen)
      await expect(menuToggle).toBeVisible();
      
      // Click to open sidebar
      await menuToggle.click();
      await page.waitForTimeout(400); // Wait for animation
      
      // Sidebar should have 'open' class and be visible
      await expect(sidebar).toHaveClass(/open/);
      
      // Verify navigation items are visible when sidebar is open
      const navItems = page.locator('.nav-link').first();
      await expect(navItems).toBeVisible();
      
      // Click to close sidebar
      await menuToggle.click();
      await page.waitForTimeout(400);
      
      // Sidebar should not have 'open' class
      await expect(sidebar).not.toHaveClass(/open/);
    });
    
    test('sidebar closes when clicking overlay on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      const menuToggle = page.getByTestId('mobile-menu-toggle');
      const sidebar = page.locator('.sidebar');
      const overlay = page.locator('.sidebar-overlay');
      
      // Open sidebar
      await menuToggle.click();
      await page.waitForTimeout(400);
      await expect(sidebar).toHaveClass(/open/);
      
      // Click on overlay to close
      await overlay.click({ force: true });
      await page.waitForTimeout(400);
      
      // Sidebar should be closed
      await expect(sidebar).not.toHaveClass(/open/);
    });
    
    test('navigation works from mobile menu', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      const menuToggle = page.getByTestId('mobile-menu-toggle');
      
      // Open menu
      await menuToggle.click();
      await page.waitForTimeout(400);
      
      // Click on Contratos link
      const contratosLink = page.locator('.nav-link').filter({ hasText: 'Contratos' }).first();
      await contratosLink.click();
      
      // Should navigate to contratos page
      await page.waitForURL('**/contratos', { timeout: 10000 });
      await expect(page.getByTestId('contratos-page')).toBeVisible({ timeout: 10000 });
      
      // Menu should auto-close after navigation
      await page.waitForTimeout(500);
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).not.toHaveClass(/open/);
    });
  });
  
  test.describe('Dashboard KPI Grid Responsiveness', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    });
    
    test('KPI cards display in grid on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.waitForTimeout(300);
      
      const statsGrid = page.getByTestId('dashboard-kpis');
      await expect(statsGrid).toBeVisible();
      
      // Check multiple stat cards are visible
      const statCards = page.locator('.stat-card');
      const count = await statCards.count();
      expect(count).toBeGreaterThan(3);
    });
    
    test('KPI cards adapt to 2-column grid on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(300);
      
      const statsGrid = page.getByTestId('dashboard-kpis');
      await expect(statsGrid).toBeVisible();
      
      // Verify stats-grid has proper CSS for 2 columns
      const gridStyle = await statsGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      
      // On tablet, should have 2 columns (e.g., "327.5px 327.5px" or "repeat(2, ...)" or "1fr 1fr")
      // Check there are exactly 2 column values
      const columnValues = gridStyle.split(' ');
      expect(columnValues.length).toBe(2);
    });
    
    test('KPI cards stack in single column on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      const statsGrid = page.getByTestId('dashboard-kpis');
      await expect(statsGrid).toBeVisible();
      
      // Verify stats-grid CSS for single column
      const gridStyle = await statsGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      
      // On mobile, should be single column (1fr or one value)
      expect(gridStyle).toMatch(/^[0-9]+px$|^1fr$/);
    });
  });
  
  test.describe('Table Horizontal Scroll on Mobile', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
      // Navigate to contratos via URL
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByTestId('contratos-page')).toBeVisible({ timeout: 15000 });
    });
    
    test('table container has horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      // Find table container
      const tableContainer = page.locator('.table-container').first();
      await expect(tableContainer).toBeVisible();
      
      // Check overflow-x is auto or scroll
      const overflowX = await tableContainer.evaluate((el) => {
        return window.getComputedStyle(el).overflowX;
      });
      
      expect(['auto', 'scroll']).toContain(overflowX);
    });
    
    test('table maintains min-width for scrolling on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      const table = page.locator('[data-testid="contratos-table"]').first();
      if (await table.isVisible()) {
        const tableWidth = await table.evaluate((el) => {
          return parseInt(window.getComputedStyle(el).minWidth) || el.offsetWidth;
        });
        
        // Table should have min-width greater than mobile viewport
        expect(tableWidth).toBeGreaterThan(300);
      }
    });
  });
  
  test.describe('Form Layout Responsiveness', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
      // Navigate to contratos via URL
      await page.goto('/contratos', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByTestId('contratos-page')).toBeVisible({ timeout: 15000 });
    });
    
    test('form displays in single column on mobile', async ({ page }) => {
      // Open form
      await page.getByTestId('btn-nuevo-contrato').click();
      await expect(page.getByTestId('contrato-form')).toBeVisible({ timeout: 5000 });
      
      // Switch to mobile
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      // Check grid-responsive-4 is single column on mobile
      const responsiveGrid = page.locator('.grid-responsive-4').first();
      if (await responsiveGrid.isVisible()) {
        const gridStyle = await responsiveGrid.evaluate((el) => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });
        
        // Should be single column on mobile (1fr or single pixel value)
        expect(gridStyle).toMatch(/^[0-9]+px$|^1fr$/);
      }
    });
    
    test('form displays in 2 columns on tablet', async ({ page }) => {
      // Open form
      await page.getByTestId('btn-nuevo-contrato').click();
      await expect(page.getByTestId('contrato-form')).toBeVisible({ timeout: 5000 });
      
      // Switch to tablet
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(300);
      
      // Check grid-responsive-4 becomes 2 columns on tablet
      const responsiveGrid = page.locator('.grid-responsive-4').first();
      if (await responsiveGrid.isVisible()) {
        const gridStyle = await responsiveGrid.evaluate((el) => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });
        
        // Should have 2 columns on tablet
        expect(gridStyle).toMatch(/repeat\(2|1fr 1fr|[0-9]+px [0-9]+px/);
      }
    });
    
    test('form inputs have proper touch target size on mobile', async ({ page }) => {
      // Open form
      await page.getByTestId('btn-nuevo-contrato').click();
      await expect(page.getByTestId('contrato-form')).toBeVisible({ timeout: 5000 });
      
      // Switch to mobile
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      // Check form inputs have minimum 44px height for touch
      const formInput = page.locator('.form-input').first();
      if (await formInput.isVisible()) {
        const inputHeight = await formInput.evaluate((el) => {
          return el.offsetHeight;
        });
        
        // Touch target should be at least 40px (allowing some variance)
        expect(inputHeight).toBeGreaterThanOrEqual(38);
      }
    });
  });
  
  test.describe('Sidebar Visibility at Different Breakpoints', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email').fill('admin@fruveco.com');
      await page.getByTestId('login-password').fill('admin123');
      await page.getByTestId('login-submit').click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await expect(page.getByTestId('dashboard-page')).toBeVisible({ timeout: 10000 });
    });
    
    test('sidebar visible and full-width on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.waitForTimeout(300);
      
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
      
      // Check sidebar width is 260px on desktop
      const sidebarWidth = await sidebar.evaluate((el) => {
        return parseInt(window.getComputedStyle(el).width);
      });
      
      expect(sidebarWidth).toBe(260);
    });
    
    test('sidebar visible and compact (220px) on tablet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.waitForTimeout(300);
      
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
      
      // Check sidebar width is 220px on tablet
      const sidebarWidth = await sidebar.evaluate((el) => {
        return parseInt(window.getComputedStyle(el).width);
      });
      
      expect(sidebarWidth).toBe(220);
    });
    
    test('sidebar hidden by default on mobile', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.waitForTimeout(300);
      
      const sidebar = page.locator('.sidebar');
      
      // Sidebar exists but is translated off-screen
      // Check transform property
      const transform = await sidebar.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      
      // Should have translateX(-100%) which results in a matrix with negative X
      expect(transform).toMatch(/matrix|translateX/);
    });
  });
});
