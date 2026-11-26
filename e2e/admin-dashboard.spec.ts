import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
});

test("ADM-1: the admin home shows the figures, what needs attention and revenue over time", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Welcome back, Test" })).toBeVisible();
  await expect(page.getByText("Revenue", { exact: true })).toBeVisible();
  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention).toContainText("1 instructor application is waiting for review");
  await expect(attention).toContainText("1 reported message is waiting for review");
  await expectNoA11yViolations(page);

  await page.getByRole("group", { name: "Period" }).getByRole("button", { name: "90 days" }).click();
  await expect(page.getByRole("heading", { name: "Revenue per week" })).toBeVisible();
  await page.getByRole("button", { name: "Show as table" }).click();
  await expect(page.getByRole("region", { name: "Revenue by period" }).getByRole("row")).toHaveCount(14); // header + 13 weeks
  await expect(page.getByRole("region", { name: "Instructor response times" })).toContainText("No one-on-one requests reached instructors");
  await expectNoA11yViolations(page);

  await attention.getByRole("link", { name: "Review" }).first().click();
  await expect(page).toHaveURL(/\/admin\/users\?approval=PENDING/);
});

test("ADM-4: an admin downloads a report as CSV and the export is audited", async ({ page }) => {
  await page.goto("/admin/reports");
  await expect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();
  await page.getByLabel("From").fill("2020-01-01");
  await expectNoA11yViolations(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV: Revenue" }).click();
  expect((await download).suggestedFilename()).toMatch(/^revenue-2020-01-01-to-\d{4}-\d{2}-\d{2}\.csv$/);
  await expect(page.getByText(/Revenue downloaded \(2 rows\)/)).toBeVisible();

  await page.goto("/admin/audit-log");
  await expect(page.getByText(/Exported the revenue report/).first()).toBeVisible();
});
