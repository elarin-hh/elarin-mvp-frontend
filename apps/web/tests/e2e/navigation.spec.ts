import { test, expect } from '@playwright/test';

test.describe('Navigation Flow', () => {
  test('can navigate from login to dashboard', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
  });

  test('can navigate through training flow', async ({ page }) => {
    // Start from dashboard
    await page.goto('/');
    
    // Navigate to exercise selection
    await page.goto('/train/select');
    await expect(page.locator('h1')).toContainText('Select');
    
    // Navigate to intro
    await page.goto('/train/intro');
    await expect(page.locator('h2')).toContainText('Before We Start');
    
    // Navigate to training page
    await page.goto('/train/squat');
    await expect(page.locator('h1')).toContainText('Training');
    
    // Navigate to summary
    await page.goto('/train/squat/summary');
    await expect(page.locator('h1')).toContainText('Complete');
  });

  test('dashboard shows empty state', async ({ page }) => {
    await page.goto('/');
    
    // Should show no sessions message
    await expect(page.locator('text=No training sessions yet')).toBeVisible();
  });
});

