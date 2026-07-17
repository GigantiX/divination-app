import { test, expect } from '@playwright/test';

test.describe('Event Details E2E', () => {
  const eventId = '11111111-1111-1111-1111-111111111111';

  test.beforeEach(async ({ page }) => {
    // Go directly to the seeded event detail page
    await page.goto(`/events/${eventId}`);
    
    // Wait for the chart section heading to be visible, ensuring the page has fully hydrated.
    // Increase timeout to 15s to allow for server compilation on first-load.
    await expect(page.locator('text=Trend Leads & Sales')).toBeVisible({ timeout: 15000 });
  });

  test('should render event metadata, tabs, and metrics correctly', async ({ page }) => {
    // Event title
    await expect(page.locator('h1', { hasText: 'Marketing Webinar' })).toBeVisible();

    // Default batch details (Batch February is selected by default as it is the latest)
    await expect(page.locator('select')).toHaveValue('44444444-4444-4444-4444-444444444444');
    await expect(page.locator('text=Rp 200.000')).toBeVisible();

    // Overview metrics
    await expect(page.locator('text=SPEND').first()).toBeVisible();
    await expect(page.locator('text=Closing Rate').first()).toBeVisible();
    await expect(page.locator('text=ROAS').first()).toBeVisible();
  });

  test('should allow switching between overview and reports tabs', async ({ page }) => {
    const reportsTab = page.locator('button', { hasText: 'Reports' });
    const overviewTab = page.locator('button', { hasText: 'Overview' });

    // Switch to Reports
    await reportsTab.click();
    await expect(reportsTab).toHaveClass(/text-primary/);

    // Switch back to Overview
    await overviewTab.click();
    await expect(overviewTab).toHaveClass(/text-primary/);
  });

  test('should trigger delete batch modal and close on cancel', async ({ page }) => {
    // Click "More options" vertical ellipsis button
    const optionsButton = page.locator('button[aria-label="More options"]');
    await expect(optionsButton).toBeVisible();
    await optionsButton.click();

    // Click "Hapus Batch" menu item
    const deleteButton = page.locator('button', { hasText: 'Hapus Batch' });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Verify modal is visible
    const modalHeader = page.locator('text=Hapus Batch?');
    await expect(modalHeader).toBeVisible();

    // Click Cancel/Batal button
    const cancelButton = page.locator('button', { hasText: 'Batal' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify modal is closed and we are still on the event details page with Batch February selected
    await expect(modalHeader).not.toBeVisible();
    await expect(page.locator('select')).toHaveValue('44444444-4444-4444-4444-444444444444');
  });
});
