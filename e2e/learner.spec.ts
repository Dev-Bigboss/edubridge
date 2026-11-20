import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "learner@example.com");
  await expect(page).toHaveURL(/\/learn$/);
});

test("the dashboard shows the next class", async ({ page }) => {
  const next = page.getByRole("region", { name: "Your next classes" });
  await expect(next.getByText("ICAN Audit and Assurance (2025 syllabus)")).toBeVisible();
  await expect(next.getByRole("link", { name: "See all my trainings" })).toBeVisible();
});

test("TRN-7: My trainings groups enrolments and keeps an archived training", async ({ page }) => {
  await page.goto("/learn/trainings");
  const running = page.getByRole("region", { name: /In progress/ });
  const card = running.getByRole("article", { name: "ICAN Audit and Assurance (2025 syllabus)" });
  await expect(card.getByText("No longer in the catalogue, still yours")).toBeVisible();
  await expect(card.getByText("Next class")).toBeVisible();
  await expect(page.getByRole("region", { name: /Finished/ }).getByText("MTH 101: Elementary Mathematics I")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("PAY-6: payment history links to a printable receipt", async ({ page }) => {
  await page.goto("/learn/payments");
  await expect(page.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(3); // header + 2 payments
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: /^Receipt for MTH 101/ }).click();
  const receipt = page.getByRole("article", { name: "Receipt" });
  await expect(receipt.getByText(/^EB-\d{4}-\d{5}$/)).toBeVisible();
  await expect(receipt.getByText("Test Learner")).toBeVisible();
  await expect(receipt.getByText("Visa ending 4242")).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("a new enrolment shows up in My trainings and Payments", async ({ page }) => {
  await page.goto("/checkout/cohort/coh_mth_sem1");
  await page.getByRole("button", { name: "Pay $250 securely" }).click();
  await page.getByRole("button", { name: "Pay $250" }).click();
  await expect(page.getByRole("heading", { name: "You're enrolled" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "Go to my trainings" }).click();
  await expect(page.getByRole("region", { name: /Starting soon/ }).getByRole("article", { name: "MTH 101: Elementary Mathematics I" })).toBeVisible();
  await page.goto("/learn/payments");
  await expect(page.getByRole("row")).toHaveCount(4);
});

test("learner pages never scroll sideways at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const [path, heading] of [
    ["/learn/trainings", "My trainings"],
    ["/learn/payments", "Payments"],
    ["/receipts/pay_seed_1", "Receipt"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
