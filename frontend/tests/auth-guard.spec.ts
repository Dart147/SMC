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
    await expect(
      page
        .locator(
          "input[type='text'], input[type='username'], input[placeholder*='user' i], input[name='username']",
        )
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });
});

const CANDIDATE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiJ0ZXN0X2NhbmRpZGF0ZSIsInJvbGUiOiJjYW5kaWRhdGUiLCJleHAiOjk5OTk5OTk5OTksImV4YW1fZXhwaXJlc19hdCI6OTk5OTk5OTk5OX0" +
  ".sig";

const ADMIN_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiJ0ZXN0X2FkbWluIiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5LCJleGFtX2V4cGlyZXNfYXQiOjk5OTk5OTk5OTl9" +
  ".sig";

test.describe("Role-based access guard", () => {
  test("candidate is redirected away from /interviewer", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.evaluate((token) => localStorage.setItem("smc_token", token), CANDIDATE_TOKEN);
    await page.goto(BASE + "/interviewer", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/interviewer/, { timeout: 5000 });
  });

  test("candidate is redirected away from /submissions", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.evaluate((token) => localStorage.setItem("smc_token", token), CANDIDATE_TOKEN);
    await page.goto(BASE + "/submissions", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/\/submissions/, { timeout: 5000 });
  });

  test("admin can access /problems without redirect", async ({ page }) => {
    await page.goto(BASE + "/login");
    await page.evaluate((token) => localStorage.setItem("smc_token", token), ADMIN_TOKEN);
    await page.goto(BASE + "/problems", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/problems/, { timeout: 5000 });
  });
});
