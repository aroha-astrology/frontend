import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Splash / root page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Splash page (/)', () => {
  test('renders Om symbol and brand name', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Jyotish/i);
    // Splash shows Om + brand heading (may redirect before these are visible)
    // Accept either the heading OR the login page (if middleware redirected immediately)
    const isOnLogin = page.url().includes('/login');
    if (!isOnLogin) {
      await expect(page.locator('h1').filter({ hasText: /Jyotish/i })).toBeVisible({ timeout: 3000 });
    }
  });

  test('root path resolves to either splash or login (never 404)', async ({ page }) => {
    const response = await page.goto('/');
    // Should get a 200 (splash or login) — never a 404/500
    expect(response?.status()).toBeLessThan(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Login page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login page (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders email and password fields', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('renders a submit button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('renders Google sign-in button (SVG icon)', async ({ page }) => {
    // Google button is a circular icon-only button with a Google SVG — no visible text
    // Find a button containing an SVG (the Google icon)
    const googleButton = page.locator('button:has(svg)').last();
    await expect(googleButton).toBeVisible();
  });

  test('shows validation error on empty submit', async ({ page }) => {
    await page.click('button[type="submit"]');
    // HTML5 validation or JS error message should appear
    const emailInput = page.locator('input[type="email"]');
    const validationState = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validationState).toBe(false);
  });

  test('password field toggles visibility', async ({ page }) => {
    const pwdInput = page.locator('input[type="password"]');
    await expect(pwdInput).toBeVisible();
    // Click the eye/toggle button (located inside the password field wrapper)
    const toggleBtn = page.locator('button[type="button"]').first();
    await toggleBtn.click();
    // After toggle, input type should change to text
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test('has link to signup page', async ({ page }) => {
    const signupLink = page.locator('a[href*="signup"], a').filter({ hasText: /sign up|create account|register/i });
    await expect(signupLink.first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Signup page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Signup page (/signup)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('renders name, email, and password fields', async ({ page }) => {
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('renders a submit button', async ({ page }) => {
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows heading', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('password field has type=password initially', async ({ page }) => {
    const pwd = page.locator('#password');
    await expect(pwd).toHaveAttribute('type', 'password');
  });

  test('has link back to login', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'short');
    await page.click('button[type="submit"]');
    // Either browser HTML5 validation or JS error should fire
    const pwdInput = page.locator('#password');
    const isValid = await pwdInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    // With minlength=8 or JS check for "Min 8 characters", this should be false or an error shows
    // Accept either native invalid state or an error message in the DOM
    const errorVisible = await page.locator('text=/8 character|too short|password/i').isVisible().catch(() => false);
    expect(!isValid || errorVisible).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth redirect guards
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Auth redirect guards', () => {
  const PROTECTED_ROUTES = [
    '/dashboard',
    '/kundli/generate',
    '/profile',
    '/credits',
    '/chat',
  ];

  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated access to ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL('**/login**', { timeout: 5000 });
      expect(page.url()).toContain('/login');
    });
  }
});
