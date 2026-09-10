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

  test('should open the batch list before the selected batch detail', async ({ page }) => {
    const eventCard = page.getByRole('link', { name: /Marketing Webinar/ });
    await eventCard.click();

    await expect(page).toHaveURL(/\/events\/11111111-1111-1111-1111-111111111111\/batches$/);
    await expect(page.getByRole('heading', { name: 'Batch Aktif' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selesai' })).toBeVisible();
    await expect(page.getByText('Pilih periode kerja')).toHaveCount(0);

    await page.getByRole('link', { name: 'Buka detail Batch February' }).click();
    await expect(page).toHaveURL(/\/events\/11111111-1111-1111-1111-111111111111\?batch=44444444-4444-4444-4444-444444444444$/);
    await expect(page.locator('select')).toHaveValue('44444444-4444-4444-4444-444444444444');
  });

  test('should toggle event status via confirmation modal', async ({ page }) => {
    // Locate the event card for 'Marketing Webinar'
    const eventCard = page.locator('a', { hasText: 'Marketing Webinar' });
    const toggleButton = eventCard.getByRole('button', { name: /^(Deactivate|Activate) event$/ });
    
    await expect(toggleButton).toBeVisible();
    const originalAction = await toggleButton.getAttribute('aria-label');
    await toggleButton.click();

    // Verify modal elements are visible
    const modalHeader = page.locator('text=Konfirmasi Perubahan');
    await expect(modalHeader).toBeVisible();

    // Click Batal/Cancel button to keep the test parallel-safe and side-effect-free
    const cancelButton = page.locator('button', { hasText: 'Batal' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify modal is closed and the event status remains unchanged.
    await expect(modalHeader).not.toBeVisible();
    await expect(toggleButton).toHaveAttribute('aria-label', originalAction!);
  });
});
