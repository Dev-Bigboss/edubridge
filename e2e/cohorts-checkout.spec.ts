import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, expectNoA11yViolations, signIn } from "./helpers";

async function signInHere(page: Page, email: string) {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("cohort checkout (COH-2, PRC-7, PAY-1/2)", () => {
  test("a guest enrols: sign in, see the breakdown, pay, and the seat is confirmed after the webhook", async ({ page }) => {
    await page.goto("/trainings/ican-skills-financial-reporting");
    const cohort = page.getByRole("article", { name: "Evening cohort" });
    await expect(cohort.getByText("6 of 20 seats left")).toBeVisible();
    await cohort.getByRole("link", { name: "Enrol" }).click();

    // Guests sign in and come straight back to the same checkout.
    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout%2Fcohort%2Fcoh_sfr_jan/);
    await signInHere(page, "learner@example.com");
    await expect(page.getByRole("heading", { name: "Confirm your seat", level: 1 })).toBeVisible();

    const order = page.getByRole("region", { name: "Order summary" });
    await expect(order.getByText("1 seat")).toBeVisible();
    await expect(order.getByText("Tax")).toBeVisible();
    await expect(order.getByText("Total")).toBeVisible();
    await expectNoA11yViolations(page);

    await order.getByRole("button", { name: "Pay $450 securely" }).click();
    await expect(page.getByRole("heading", { name: "Test payment" })).toBeVisible();
    await page.getByRole("button", { name: "Pay $450" }).click();

    // Coming back proves nothing; the page waits for the backend to confirm.
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You're enrolled" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Paid with Visa ending 4242")).toBeVisible();
    await expectNoA11yViolations(page);

    // The seat is taken and the learner can't pay twice.
    await page.goto("/trainings/ican-skills-financial-reporting");
    await expect(page.getByRole("article", { name: "Evening cohort" }).getByText("5 of 20 seats left")).toBeVisible();
    await page.goto("/checkout/cohort/coh_sfr_jan");
    await expect(page.getByText("You're already enrolled in this cohort.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Pay/ })).toHaveCount(0);
  });

  test("a declined card charges nothing and offers a retry", async ({ page }) => {
    await signIn(page, "learner@example.com", { next: "/checkout/cohort/coh_mth_sem1" });
    await page.getByRole("button", { name: "Pay $250 securely" }).click();
    await page.getByRole("button", { name: "Simulate a declined card" }).click();
    await expect(page.getByRole("heading", { name: "Payment didn't go through" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Your card was declined. Nothing was charged.")).toBeVisible();
    await page.getByRole("link", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: "Pay $250 securely" })).toBeVisible();
  });

  test("leaving the payment page says nothing was charged", async ({ page }) => {
    await signIn(page, "learner@example.com", { next: "/checkout/cohort/coh_mth_sem1" });
    await page.getByRole("button", { name: "Pay $250 securely" }).click();
    await page.getByRole("button", { name: "Back to EduBridge without paying" }).click();
    await expect(page.getByText("Payment cancelled. Nothing was charged")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay $250 securely" })).toBeVisible();
  });

  test("a full cohort can't be bought", async ({ page }) => {
    await signIn(page, "learner@example.com", { next: "/checkout/cohort/coh_sfr_weekend" });
    await expect(page.getByText("This cohort is full. Another cohort may still have seats.")).toBeVisible();
    await expect(page.getByRole("link", { name: "See other cohorts" })).toHaveAttribute("href", "/trainings/ican-skills-financial-reporting#cohorts");
  });
});

test.describe("admin cohorts (COH-1/3/5)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "admin@example.com", { mfa: true });
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("create a draft cohort, open it, and learners can see it", async ({ page }) => {
    await page.goto("/admin/cohorts");
    await expect(page.getByRole("heading", { name: "Cohorts", level: 1 })).toBeVisible();
    await expect(page.getByRole("row", { name: /^Evening cohort/ })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "New cohort" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New cohort" });
    await dialog.getByRole("button", { name: "Create draft cohort" }).click();
    await expect(dialog.getByText("Choose a training.")).toBeVisible();
    await expect(dialog.getByText("Pick at least one day.")).toBeVisible();

    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    await dialog.getByRole("combobox", { name: "Training" }).selectOption({ label: "MTH 101: Elementary Mathematics I" });
    await dialog.getByRole("combobox", { name: "Instructor" }).selectOption({ label: "Demo Instructor Two" });
    await dialog.getByRole("textbox", { name: "Cohort name" }).fill("Second semester cohort");
    await dialog.getByLabel("Start date").fill(day(40));
    await dialog.getByLabel("End date").fill(day(40 + 27));
    for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri"]) await dialog.getByText(d, { exact: true }).click();
    await dialog.getByLabel("Last day to enrol").fill(day(35));
    await expect(dialog.getByRole("status")).toContainText("20 classes");
    await dialog.getByRole("button", { name: "Create draft cohort" }).click();
    await expect(dialog).toBeHidden();

    const row = page.getByRole("row", { name: /Second semester cohort/ });
    await expect(row.getByText("Draft")).toBeVisible();
    await row.getByRole("button", { name: "Manage Second semester cohort" }).click();
    await page.getByRole("menuitem", { name: "Open for enrolment" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Open for enrolment" }).click();
    await expect(row.getByText("Open for enrolment")).toBeVisible();

    // It now shows on the public training page. (Same browser: the demo API's data lives in each browser.)
    await page.goto("/trainings/mth-101-elementary-mathematics-i");
    await expect(page.getByRole("article", { name: "Second semester cohort" }).getByRole("link", { name: "Enrol" })).toBeVisible();
  });

  test("cancelling asks for a reason and explains the refunds", async ({ page }) => {
    await page.goto("/admin/cohorts");
    await page.getByRole("button", { name: "Manage Evening cohort" }).click();
    await page.getByRole("menuitem", { name: "Cancel cohort" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancel Evening cohort?" });
    await expect(dialog.getByText("All 14 enrolled learners are refunded in full and emailed.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel cohort and refund" }).click();
    await expect(dialog.getByText("Say why, in a few words.")).toBeVisible();
    await dialog.getByRole("textbox", { name: "Reason" }).fill("The instructor is unavailable on these dates.");
    await dialog.getByRole("button", { name: "Cancel cohort and refund" }).click();
    await expect(dialog).toBeHidden();
    const row = page.getByRole("row", { name: /^Evening cohort/ });
    await expect(row.getByText("Cancelled")).toBeVisible();
    await expect(row.getByText("No changes")).toBeVisible();
  });

  test("cohort pages never scroll sideways at 320 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/admin/cohorts");
    await expect(page.getByRole("heading", { name: "Cohorts", level: 1 })).toBeVisible();
    await expect(page.getByRole("row", { name: /^Evening cohort/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("COH-5: an admin sees which cohorts are short of their minimum and by when", async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
  // Open the draft spring cohort (0 of 20, minimum 6) so the warning applies.
  await page.goto("/admin/cohorts");
  await page.getByRole("button", { name: "Manage Spring evening cohort" }).click();
  await page.getByRole("menuitem", { name: "Open for enrolment" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Open for enrolment" }).click();
  const row = page.getByRole("row", { name: /^Spring evening cohort/ });
  await expect(row.getByText(/Needs 6 more by .+, or it's cancelled automatically and everyone refunded/)).toBeVisible();
});
