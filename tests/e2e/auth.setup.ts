import { test as setup, expect } from '@playwright/test';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate as admin', async ({ page }) => {
  // Go to login page
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password123');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify redirection to dashboard by waiting for header/text
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('h1').first()).toContainText('DIVINATION');

  // Save authentication storage state to share across tests
  await page.context().storageState({ path: STORAGE_STATE });
});
