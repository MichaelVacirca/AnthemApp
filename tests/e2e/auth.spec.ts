import { test, expect } from "@playwright/test";
import { resetAuthAttempts, ensureManagerPin } from "./helpers";

const MANAGER_PIN = process.env.E2E_MANAGER_PIN ?? "9999";

test.describe("PIN auth", () => {
  test.beforeAll(async () => {
    await ensureManagerPin(MANAGER_PIN);
  });

  test.beforeEach(async () => {
    await resetAuthAttempts();
  });

  test("manager PIN signs in and lands on /admin", async ({ page }) => {
    await page.goto("/");
    for (const digit of MANAGER_PIN) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL("**/admin", { timeout: 10_000 });
    await expect(page.getByText(/anthem/i).first()).toBeVisible();
  });

  test("invalid PIN shows error and stays on home", async ({ page }) => {
    await page.goto("/");
    for (const digit of "0000") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("alert")).toContainText(/not recognized/i);
    await expect(page).toHaveURL("/");
  });

  test("rate limits after 5 failed attempts", async ({ request }) => {
    for (let i = 0; i < 5; i++) {
      const res = await request.post("/api/auth/pin", { data: { pin: "0000" } });
      expect(res.status()).toBe(401);
    }
    const blocked = await request.post("/api/auth/pin", { data: { pin: "0000" } });
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()["retry-after"]).toBeTruthy();
  });

  test("unauthenticated /admin redirects to / with error", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/\?error=manager_required/);
    await expect(page.getByText(/manager access required/i)).toBeVisible();
  });
});
