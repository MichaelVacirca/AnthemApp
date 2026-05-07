import { test, expect } from "@playwright/test";
import { ensureChecklist, ensureStaffPin, resetAuthAttempts } from "./helpers";

const STAFF_PIN = process.env.E2E_STAFF_PIN ?? "1234";

test.describe("Shift checklist golden path", () => {
  test.beforeAll(async () => {
    const { roleId } = await ensureStaffPin(STAFF_PIN, {
      roleName: "Bartender",
      name: "E2E Sam",
    });
    await ensureChecklist(roleId, "opening", [
      { label: "Stock garnishes", required: true },
      { label: "Refill ice wells", required: true },
      { label: "Polish glassware", required: false },
    ]);
  });

  test.beforeEach(async () => {
    await resetAuthAttempts();
  });

  test("staff completes opening checklist end-to-end", async ({ page }) => {
    await page.goto("/");
    for (const digit of STAFF_PIN) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: /continue/i }).click();

    await page.waitForURL("**/shift/new", { timeout: 10_000 });
    await page.getByRole("button", { name: /^opening$/i }).first().click();

    await page.waitForURL(/\/shift\/[0-9a-f-]+$/i, { timeout: 10_000 });

    const stock = page.getByRole("button", { name: /stock garnishes/i });
    const ice = page.getByRole("button", { name: /refill ice wells/i });

    const signOff = page.getByRole("button", { name: /sign off shift/i });
    await expect(signOff).toBeDisabled();

    await stock.click();
    await ice.click();

    await expect(signOff).toBeEnabled();
    await signOff.click();

    await expect(page.getByRole("button", { name: /sign off shift/i })).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test("optional items can be left unchecked", async ({ page }) => {
    await page.goto("/");
    for (const digit of STAFF_PIN) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL("**/shift/new");
    await page.getByRole("button", { name: /^opening$/i }).first().click();
    await page.waitForURL(/\/shift\/[0-9a-f-]+$/i);

    await page.getByRole("button", { name: /stock garnishes/i }).click();
    await page.getByRole("button", { name: /refill ice wells/i }).click();
    // skip the optional "polish glassware"

    await page.getByRole("button", { name: /sign off shift/i }).click();
    await expect(page.getByRole("button", { name: /sign off shift/i })).toHaveCount(0, {
      timeout: 10_000,
    });
  });
});
