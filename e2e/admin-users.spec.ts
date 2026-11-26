import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, "admin@example.com", { mfa: true });
  await expect(page).toHaveURL(/\/admin$/);
});

test("ONB-3: review an applicant's submission and approve them", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page.getByText("1 instructor is waiting for approval.")).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Review applications" }).click();
  await expect(page).toHaveURL(/approval=PENDING/);
  await page.getByRole("link", { name: "Demo Applicant" }).click();

  await expect(page.getByRole("heading", { name: "Demo Applicant", level: 1 })).toBeVisible();
  await expect(page.getByText("MSc Statistics, University of Ibadan (2017)")).toBeVisible();
  await expect(page.getByText("national-id.pdf")).toBeVisible();
  await expect(page.getByText("Scanned, safe").first()).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve instructor" }).click();
  await expect(page.getByRole("main").getByText("Approved", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Approved instructor Demo Applicant")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
});

test("rejecting an application needs a reason", async ({ page }) => {
  await page.goto("/admin/users/usr_instructor_pending");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Reject Demo Applicant's application?" });
  await dialog.getByRole("button", { name: "Reject application" }).click();
  await expect(dialog.getByText("Say why, in a few words.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Please upload a clearer copy of your MSc certificate.");
  await dialog.getByRole("button", { name: "Reject application" }).click();
  await expect(page.getByRole("main").getByText("Not approved", { exact: true })).toBeVisible();
});

test("suspend and reactivate an account", async ({ page }) => {
  await page.goto("/admin/users/usr_learner_1");
  await page.getByRole("button", { name: "Suspend account" }).click();
  const dialog = page.getByRole("dialog", { name: "Suspend Test Learner?" });
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Chargeback under investigation.");
  await dialog.getByRole("button", { name: "Suspend account" }).click();
  await expect(page.getByRole("main").getByText("Suspended", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "View as this user" })).toHaveCount(0);

  await page.getByRole("button", { name: "Reactivate account" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reactivate account" }).click();
  await expect(page.getByRole("main").getByText("Active", { exact: true })).toBeVisible();
});

test("ADM-2: view as a learner read-only, then return to admin", async ({ page }) => {
  await page.goto("/admin/users/usr_learner_1");
  await page.getByRole("button", { name: "View as this user" }).click();
  const dialog = page.getByRole("dialog", { name: "View the app as Test Learner?" });
  await dialog.getByRole("textbox", { name: "Reason" }).fill("Learner says a receipt is missing.");
  await dialog.getByRole("button", { name: "Start viewing" }).click();

  await expect(page).toHaveURL(/\/learn$/);
  const banner = page.getByRole("region", { name: "Viewing as another user" });
  await expect(banner).toContainText("You're viewing as Test Learner");
  await page.goto("/learn/payments");
  await expect(page.getByRole("row")).toHaveCount(3);

  // Read-only: paying is refused by the server, and the reason is shown.
  await page.goto("/checkout/cohort/coh_mth_sem1");
  await page.getByRole("button", { name: "Pay $250 securely" }).click();
  await expect(page.getByText("You're viewing as this user, so changes are turned off.")).toBeVisible();

  await page.getByRole("button", { name: "Stop viewing and return" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/usr_learner_1$/);
  await expect(page.getByRole("region", { name: "Viewing as another user" })).toHaveCount(0);
  await expect(page.getByText("Started viewing as Test Learner")).toBeVisible();
});

test("user pages never scroll sideways at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const [path, heading] of [
    ["/admin/users", "Users"],
    ["/admin/users/usr_instructor_pending", "Demo Applicant"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} is wider than the screen`).toBeLessThanOrEqual(0);
  }
});
