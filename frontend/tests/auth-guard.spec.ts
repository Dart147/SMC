import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080";

const PROTECTED_ROUTES = [
  { path: "/", name: "Home (root)" },
  { path: "/disclaimer", name: "Disclaimer" },
  { path: "/interviewer", name: "Interviewer dashboard" },
  { path: "/submissions", name: "Submissions / Candidate list" },
  { path: "/problems", name: "Problem list" },
  { path: "/workspace/1", name: "Workspace (problem 1)" },
];

test.describe("Unauthenticated access guard", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored auth state
    await page.goto(BASE + "/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  for (const route of PROTECTED_ROUTES) {
    test(`${route.name} (${route.path}) redirects to /login`, async ({ page }) => {
      await page.goto(BASE + route.path, { waitUntil: "networkidle" });
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    });
  }

  test("/login is accessible without auth", async ({ page }) => {
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login/);
    // Login form should be visible
    await expect(page.locator("input[type='text'], input[type='username'], input[placeholder*='user' i], input[name='username']").first()).toBeVisible({ timeout: 5000 });
  });
});
