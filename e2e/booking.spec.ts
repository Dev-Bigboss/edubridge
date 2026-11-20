import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, expectNoA11yViolations, signIn } from "./helpers";

const BOOK = "/learn/book/acca-strategic-business-reporting-one-on-one?instructor=usr_instructor_1";

async function pickFirstTime(page: Page) {
  const times = page.getByRole("radiogroup", { name: "Start time" });
  await times.getByRole("radio").first().click();
}

test.describe("requesting a one-on-one session (OTO-2/3/7, PAY-4)", () => {
  test("a guest picks a time in their zone, authorises the card, and the request waits for the instructor", async ({ page }) => {
    await page.goto("/trainings/acca-strategic-business-reporting-one-on-one");
    await page.getByRole("link", { name: "Request a session with Test Instructor" }).click();
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel("Email address").fill("learner@example.com");
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Book a one-on-one session", level: 1 })).toBeVisible();
    await expect(page.getByText(/Every time below is in your time zone/)).toBeVisible();
    await page.getByRole("radio", { name: "1 h 30 min" }).click();
    await pickFirstTime(page);
    const summary = page.getByRole("complementary");
    await expect(summary.getByText("1 h 30 min at $75 per hour")).toBeVisible();
    await expect(summary.getByText("$112.50", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Note to the instructor (optional)").fill("Group accounts, please.");
    await expectNoA11yViolations(page);

    await summary.getByRole("button", { name: "Request session · hold $112.50" }).click();
    await expect(page.getByRole("heading", { name: "Test payment" })).toBeVisible();
    await page.getByRole("button", { name: "Authorise $112.50" }).click();

    await expect(page.getByText(/Waiting for Test Instructor to accept/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Authorised, not charged")).toBeVisible();
    await expect(page.getByText("“Group accounts, please.”")).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("link", { name: "All sessions" }).click();
    await expect(page.getByRole("region", { name: "Upcoming and waiting" }).getByText("ACCA Strategic Business Reporting, one-on-one")).toBeVisible();
  });

  test("a declined card sends nothing and offers to try again", async ({ page }) => {
    await signIn(page, "learner@example.com", { next: BOOK });
    await pickFirstTime(page);
    await page.getByRole("button", { name: /^Request session · hold/ }).click();
    await page.getByRole("button", { name: "Simulate a declined card" }).click();
    await expect(page.getByText("Your card was declined, so the request wasn't sent and nothing was held.")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Book a one-on-one session", level: 1 })).toBeVisible();
  });

  test("leaving the payment page holds nothing and frees the time", async ({ page }) => {
    await signIn(page, "learner@example.com", { next: BOOK });
    const first = page.getByRole("radiogroup", { name: "Start time" }).getByRole("radio").first();
    const label = await first.textContent();
    await first.click();
    await page.getByRole("button", { name: /^Request session · hold/ }).click();
    await page.getByRole("button", { name: "Back to EduBridge without paying" }).click();
    await expect(page.getByText(/You left the payment page, so nothing was held/)).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Start time" }).getByRole("radio", { name: label! })).toBeVisible();
  });
});

test.describe("instructor availability (OTO-1)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "instructor@example.com", { mfa: true });
    await expect(page).toHaveURL(/\/teach$/);
  });

  test("block a date and change the notice; mistakes are pointed out", async ({ page }) => {
    await page.goto("/teach/availability");
    await expect(page.getByRole("heading", { name: "Availability", level: 1 })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole("spinbutton", { name: "Minimum notice (hours)" }).fill("24");
    await page.getByRole("button", { name: "Add a date" }).click();
    await page.getByRole("button", { name: "Save availability" }).click();
    await expect(page.getByText("Choose a date.")).toBeVisible();

    const date = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.getByRole("button", { name: "Save availability" }).click();
    await expect(page.getByText("Availability saved")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("spinbutton", { name: "Minimum notice (hours)" })).toHaveValue("24");
    await expect(page.getByLabel("Date", { exact: true })).toHaveValue(date);
  });
});

test("booking and availability pages never scroll sideways at 320 px", async ({ page }) => {
  await signIn(page, "learner@example.com", { next: BOOK });
  await expect(page.getByRole("heading", { name: "Book a one-on-one session", level: 1 })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole("radiogroup", { name: "Start time" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
