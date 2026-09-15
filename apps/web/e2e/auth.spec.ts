import { expect, test } from "@playwright/test";

const GATEWAY_URL = process.env.PLAYWRIGHT_GATEWAY_URL ?? "http://localhost:3000";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test("a visitor can register and land on the dashboard", async ({ page }) => {
  const email = uniqueEmail();

  await page.goto("/register");
  await page.getByPlaceholder("Full name").fill("Playwright User");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (min 8 characters)").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Your projects")).toBeVisible();
});

test("a registered user can log in and sign out", async ({ page, request }) => {
  const email = uniqueEmail();
  await request.post(`${GATEWAY_URL}/auth/register`, {
    data: { email, password: "password123", name: "Playwright User" },
  });

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("shows an error for a wrong password instead of navigating away", async ({ page, request }) => {
  const email = uniqueEmail();
  await request.post(`${GATEWAY_URL}/auth/register`, {
    data: { email, password: "password123", name: "Playwright User" },
  });

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
