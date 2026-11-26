import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test("PAY-7: an instructor sees earnings after commission, pays out and sets a schedule", async ({ page }) => {
  await signIn(page, "instructor@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/teach$/);
  await page.goto("/teach/earnings");
  await expect(page.getByRole("heading", { name: "Earnings", level: 1 })).toBeVisible();
  const balance = page.getByRole("region", { name: "Your balance" });
  await expect(balance).toContainText("$120.00");
  await expect(balance).toContainText("$200.00");
  const ledger = page.getByRole("region", { name: "Earnings history" }).first();
  await expect(ledger.getByRole("row", { name: /Seat in Autumn cohort/ })).toContainText("$320.00");
  await expect(ledger.getByRole("row", { name: /Seat in Autumn cohort/ })).toContainText("20% commission");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Pay out $120.00" }).click();
  await expect(page.getByText("Payout of $120.00 requested.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Payouts" }).last()).toContainText("On its way");
  await expect(page.getByText(/already on its way/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay out $0.00" })).toBeDisabled();

  await page.getByText("Every Monday", { exact: true }).click();
  await expect(page.getByText("You'll be paid every Monday.")).toBeVisible();
  await expect(page.getByText(/Next automatic payout:/)).toBeVisible();
});

test("PAY-8: an admin reconciles a period, downloads the CSV and sees every payout", async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/payouts");
  await page.getByLabel("From").fill("2020-01-01");
  const totals = page.getByRole("region", { name: "Totals for the period" });
  await expect(totals.getByRole("row", { name: /Learners paid/ })).toContainText("$650.00");
  await expect(totals.getByRole("row", { name: /Platform commission/ })).toContainText("$130.00");
  await expect(page.getByRole("region", { name: "By instructor" }).getByRole("row", { name: /Test Instructor/ })).toContainText("$120.00");
  await expectNoA11yViolations(page);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^reconciliation-2020-01-01-to-\d{4}-\d{2}-\d{2}\.csv$/);

  const list = page.getByRole("region", { name: "Payouts" }).last();
  await expect(list.getByRole("row", { name: /Test Instructor/ })).toContainText("Paid");
  await expect(list).toContainText("tr_demo_1A2B3C");
});
