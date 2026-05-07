import { test, expect } from "@playwright/test";
import { clearAdminActions, ensureManagerPin, resetAuthAttempts } from "./helpers";

const MANAGER_PIN = process.env.E2E_MANAGER_PIN ?? "9999";

async function signInAsManager(page: import("@playwright/test").Page) {
  await page.goto("/");
  for (const digit of MANAGER_PIN) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL("**/admin", { timeout: 10_000 });
}

test.describe("Admin audit log", () => {
  test.beforeAll(async () => {
    await ensureManagerPin(MANAGER_PIN);
  });
  test.beforeEach(async () => {
    await resetAuthAttempts();
    await clearAdminActions();
  });

  test("creating a role appears in the audit log", async ({ page }) => {
    await signInAsManager(page);

    const roleName = `e2e-${Date.now()}`;
    await page.goto("/admin/roles");
    await page.getByLabel(/role name|name/i).first().fill(roleName);
    await page.getByRole("button", { name: /add role|create/i }).first().click();

    await page.goto("/admin/audit");
    await expect(page.getByText("role.create")).toBeVisible();
    await expect(page.getByText(roleName)).toBeVisible();
  });
});

test.describe("Health endpoint", () => {
  test("returns ok when DB is reachable", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; db: string };
    expect(body.ok).toBe(true);
    expect(body.db).toBe("up");
  });
});
