import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers";

const NEW_PASSWORD = "a long passphrase";

async function register(page: Page, role: "Learn" | "Teach", email: string) {
  await page.goto("/register");
  await page.getByText(role, { exact: true }).click();
  await page.getByLabel("Full name").fill("Ada Obi");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("checkbox", { name: /I agree to the Terms of service/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  // Mock-only inbox stands in for the email.
  await page.getByRole("link", { name: "open the link" }).click();
}

test.describe("registration and onboarding", () => {
  test("register page passes axe and validates consent", async ({ page }) => {
    await page.goto("/register");
    await expectNoA11yViolations(page);
    await page.getByLabel("Full name").fill("Ada Obi");
    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await expect(page.getByText("Please accept the terms and privacy policy to continue.")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Ada Obi");
  });

  test("learner registers, verifies, onboards and lands on /learn", async ({ page }) => {
    await register(page, "Learn", "ada.learner@example.com");
    await expect(page).toHaveURL(/\/onboarding\/learner/);
    await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByLabel("Country").selectOption("NG");
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page.getByRole("heading", { name: "Your goals" })).toBeVisible();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByText("Pick at least one area.")).toBeVisible();
    await page.getByLabel("What do you want to achieve?").fill("Pass ICAN Skills level by May");
    await page.getByText("Professional Exam", { exact: true }).click();
    await page.getByLabel("Subjects or topics (optional)").fill("Taxation, Audit,");
    await expect(page.getByRole("button", { name: "Remove Taxation" })).toBeVisible();
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page.getByRole("heading", { name: "Your background" })).toBeVisible();
    await page.getByLabel("Highest level of education").selectOption("UNDERGRADUATE");
    await page.getByRole("button", { name: "Finish setup" }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("heading", { name: "Welcome back, Ada" })).toBeVisible();
  });

  test("learner can finish later and resume from the dashboard", async ({ page }) => {
    await register(page, "Learn", "ada.later@example.com");
    await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
    await page.getByRole("button", { name: "Finish later" }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await page.getByRole("link", { name: "Continue setup" }).click();
    await expect(page).toHaveURL(/\/onboarding\/learner/);
  });

  test("instructor completes onboarding and waits for approval", async ({ page }) => {
    await register(page, "Teach", "ada.instructor@example.com");
    await expect(page).toHaveURL(/\/onboarding\/instructor/);

    await page.getByLabel("Headline").fill("Chartered accountant teaching ICAN");
    await page.getByLabel("Bio").fill(
      "I have taught ICAN and ACCA candidates for eight years, in small groups and one-on-one, with a focus on exam technique.",
    );
    await page.getByLabel("Country").selectOption("NG");
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page.getByRole("heading", { name: "Expertise" })).toBeVisible();
    await page.getByText("Professional Exam", { exact: true }).click();
    await page.getByLabel("Subjects", { exact: true }).fill("Financial reporting,");
    await page.getByLabel("Qualification", { exact: true }).fill("ACA");
    await page.getByLabel("Awarded by").fill("ICAN");
    await page.getByLabel("Year").fill("2016");
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page.getByRole("heading", { name: "Verification" })).toBeVisible();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByText("Upload a government-issued photo ID.")).toBeVisible();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "passport.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 test") });
    await expect(page.getByText("passport.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page.getByRole("heading", { name: "Payouts" })).toBeVisible();
    await page.getByRole("button", { name: "Connect with Stripe" }).click();
    await expect(page.getByText("Your payout account is connected.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Availability" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page.getByRole("heading", { name: "Review and submit" })).toBeVisible();
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("heading", { name: "Thanks, we're reviewing your profile" })).toBeVisible();
    await page.getByRole("link", { name: "Go to dashboard" }).click();
    await expect(page.getByText("Your profile is being reviewed")).toBeVisible();
  });
});

test.describe("account recovery and consent", () => {
  test("forgot password, reset, then sign in with the new password", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill("learner@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If learner@example.com has an EduBridge account/)).toBeVisible();
    await page.getByRole("link", { name: "open the link" }).click();

    await page.getByLabel("New password", { exact: true }).fill("brand new passphrase");
    await page.getByLabel("Confirm new password").fill("brand new passphrase!");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("The passwords don't match.")).toBeVisible();
    await page.getByLabel("Confirm new password").fill("brand new passphrase");
    await page.getByRole("button", { name: "Save new password" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email address").fill("learner@example.com");
    await page.getByLabel("Password", { exact: true }).fill("brand new passphrase");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("an unverified account can ask for the link again", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Ada Obi");
    await page.getByLabel("Email address").fill("ada.unverified@example.com");
    await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("checkbox", { name: /I agree/ }).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email address").fill("ada.unverified@example.com");
    await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("link", { name: "Send the confirmation link again" }).click();
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  });

  test("Google sign-up asks for consent before onboarding", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Continue with Google" }).click();
    await expect(page.getByRole("heading", { name: "Before you continue" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await expect(page.getByText("Tick the box to continue.")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await expect(page).toHaveURL(/\/onboarding\/learner/);
  });

  test("legal pages render and pass axe", async ({ page }) => {
    await page.goto("/legal/terms");
    await expect(page.getByRole("heading", { level: 1, name: "Terms of service" })).toBeVisible();
    await expectNoA11yViolations(page);
    await page.goto("/legal/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  });
});
