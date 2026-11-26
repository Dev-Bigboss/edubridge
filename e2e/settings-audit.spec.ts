import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
});

test("ADM-3: change the cancellation policy, preview it, and save a new version", async ({ page }) => {
  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Platform settings", level: 1 })).toBeVisible();
  await expect(page.getByText("These are starting values.")).toBeVisible();
  await expectNoA11yViolations(page);

  const commission = page.getByRole("spinbutton", { name: "Commission (%)" });
  await commission.fill("15");
  await expect(page.getByText("the platform keeps $67.50 and the instructor earns $382.50")).toBeVisible();

  const policy = page.getByRole("region", { name: "When a learner cancels" });
  await policy.getByRole("spinbutton", { name: "Try it: hours before" }).fill("30");
  await expect(policy.getByText("50% back", { exact: true })).toBeVisible();

  // An invalid rule is pointed out next to the field and nothing is saved.
  await policy.getByRole("spinbutton", { name: "Refund (%)" }).last().fill("80");
  await page.getByRole("button", { name: "Save as new version" }).click();
  await expect(policy.getByText("Cancelling later can't refund more than cancelling earlier.")).toBeVisible();
  await policy.getByRole("spinbutton", { name: "Refund (%)" }).last().fill("0");

  await page.getByRole("button", { name: "Save as new version" }).click();
  await expect(page.getByText("Settings saved as version 2")).toBeVisible();
  const versions = page.getByRole("complementary");
  await expect(versions.getByText("Version 2 is in force.")).toBeVisible();
  await expect(versions.getByText("Commission 20% → 15%")).toBeVisible();
  await expect(page.getByText("These are starting values.")).toHaveCount(0);

  // ADM-5: the change is in the audit log.
  await page.goto("/admin/audit-log");
  await expect(page.getByRole("cell", { name: /Commission 20% → 15%/ })).toBeVisible();
});

test("ADM-5: the audit log filters by type and text and links to what changed", async ({ page }) => {
  await page.goto("/admin/audit-log");
  await expect(page.getByRole("heading", { name: "Audit log", level: 1 })).toBeVisible();
  await expect(page.getByText("7 entries")).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("combobox", { name: "Type" }).selectOption({ label: "User" });
  await expect(page.getByText("2 entries")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search what changed" }).fill("chargebacks");
  await expect(page.getByText("1 entry")).toBeVisible();
  await page.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/usr_learner_suspended$/);
});

test("settings and audit pages never scroll sideways at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const [path, heading] of [
    ["/admin/settings", "Platform settings"],
    ["/admin/audit-log", "Audit log"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
