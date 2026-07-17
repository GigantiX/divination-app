import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Go to dashboard page (uses global saved auth state)
    await page.goto('/dashboard');
  });

  test('should display sidebar and event list for admin', async ({ page }) => {
    // Sidebar elements using getByRole to avoid strict mode violations on duplicate text elements
    await expect(page.getByRole('link', { name: 'Beranda' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apps' })).toBeVisible();
    
    // Header title
    await expect(page.locator('h1').first()).toContainText('DIVINATION');

    // Seeded events
    await expect(page.locator('text=Marketing Webinar')).toBeVisible();
    await expect(page.locator('text=E-Course Launch')).toBeVisible();
  });

  test('should toggle event status via confirmation modal', async ({ page }) => {
    // Locate the event card for 'Marketing Webinar'
    const eventCard = page.locator('a', { hasText: 'Marketing Webinar' });
    const toggleButton = eventCard.locator('button[aria-label="Deactivate event"]');
    
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // Verify modal elements are visible
    const modalHeader = page.locator('text=Konfirmasi Perubahan');
    await expect(modalHeader).toBeVisible();

    // Click Batal/Cancel button to keep the test parallel-safe and side-effect-free
    const cancelButton = page.locator('button', { hasText: 'Batal' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify modal is closed and status remains active (Deactivate button still visible)
    await expect(modalHeader).not.toBeVisible();
    await expect(toggleButton).toBeVisible();
  });
});
