import { test, expect } from '@playwright/test';

// Override global storage state to start completely unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page components correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('DIVINATION');
    await expect(page.locator('h3')).toContainText('Masuk');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should show error when signing in with incorrect credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for error toast or alert banner
    const errorMessage = page.locator('text=Email atau password salah');
    await expect(errorMessage).toBeVisible();
  });

  test('should toggle password visibility on clicking eye icon', async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.getByRole('button', { name: 'Toggle password visibility' });

    await passwordInput.fill('secretpwd');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should log in successfully with correct credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1').first()).toContainText('DIVINATION');
  });
});
