import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
});

test("PAY-5: a partial refund, then a full one that frees the seat", async ({ page }) => {
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { name: "Payments and refunds", level: 1 })).toBeVisible();
  await expect(page.getByText("$650")).toBeVisible(); // taken across both demo payments
  await expectNoA11yViolations(page);

  // Partial: no option to cancel the enrolment, and the amount is checked.
  await page.getByRole("button", { name: /^Refund Test Learner: ICAN Audit/ }).click();
  let dialog = page.getByRole("dialog", { name: "Refund Test Learner" });
  await dialog.getByRole("textbox", { name: "Amount to refund" }).fill("500");
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Testing the limit.");
  await dialog.getByRole("button", { name: "Refund" }).click();
  await expect(dialog.getByText("You can refund up to $400.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Amount to refund" }).fill("100");
  await expect(dialog.getByRole("checkbox", { name: /Also cancel their enrolment/ })).toBeDisabled();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Two classes moved to a time they couldn't make.");
  await dialog.getByRole("button", { name: "Refund $100" }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: /ICAN Audit/ });
  await expect(row.getByText("Partly refunded")).toBeVisible();
  await expect(row.getByText("$100 refunded")).toBeVisible();

  // Full refund of the rest, cancelling the enrolment.
  await row.getByRole("button", { name: /^Refund/ }).click();
  dialog = page.getByRole("dialog", { name: "Refund Test Learner" });
  await expect(dialog.getByRole("textbox", { name: "Amount to refund" })).toHaveValue("300");
  await expect(dialog.getByRole("checkbox", { name: /Also cancel their enrolment/ })).toBeChecked();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Moving abroad, agreed with support.");
  await dialog.getByRole("button", { name: "Refund $300" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByText("Refunded", { exact: true })).toBeVisible();
  await expect(row.getByText("Enrolment no longer active")).toBeVisible();
  await expect(row.getByRole("button", { name: /^Refund/ })).toHaveCount(0);

  await page.goto("/admin/audit-log");
  await expect(page.getByRole("cell", { name: /Refunded \$300 .* and cancelled the enrolment/ })).toBeVisible();
});

test("payments page never scrolls sideways at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { name: "Payments and refunds", level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
