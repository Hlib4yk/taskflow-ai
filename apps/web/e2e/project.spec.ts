import { expect, test } from "@playwright/test";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function registerAndLandOnDashboard(page: import("@playwright/test").Page) {
  await page.goto("/register");
  await page.getByPlaceholder("Full name").fill("Playwright User");
  await page.getByPlaceholder("Email").fill(uniqueEmail());
  await page.getByPlaceholder("Password (min 8 characters)").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("create a project, add a task, and see it appear on the board", async ({ page }) => {
  await registerAndLandOnDashboard(page);

  await page.getByPlaceholder("New project name").fill("Launch v2");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Launch v2")).toBeVisible();

  await page.getByText("Launch v2").click();
  await expect(page).toHaveURL(/\/projects\//);

  await page.getByPlaceholder("New task title").fill("Write the launch email");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByText("Write the launch email")).toBeVisible();

  await page.getByRole("button", { name: "Reindex" }).click();
  await expect(page.getByText(/Queued job/)).toBeVisible();
});

test("the AI assistant streams a reply from a stubbed chat endpoint", async ({ page }) => {
  await page.route("**/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'data: {"token":"Hello"}\n\ndata: {"token":" there"}\n\ndata: {"done":true,"sources":[]}\n\n',
    });
  });

  await registerAndLandOnDashboard(page);
  await page.getByPlaceholder("New project name").fill("Launch v2");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByText("Launch v2").click();
  await expect(page).toHaveURL(/\/projects\//);

  await page.getByPlaceholder("Ask the AI assistant...").fill("what's blocking us?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("AI: Hello there")).toBeVisible();
});
