import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, signIn } from "./helpers";

test.describe("sign in and role areas", () => {
  test("learner signs in and lands on /learn", async ({ page }) => {
    await signIn(page, "learner@example.com");
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page.getByRole("heading", { name: "Welcome back, Test" })).toBeVisible();
  });

  test("sidebar marks the current page (desktop) and opens as a drawer (mobile)", async ({ page, isMobile }) => {
    await signIn(page, "learner@example.com");
    await expect(page).toHaveURL(/\/learn$/);
    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      const drawer = page.getByRole("dialog");
      await expect(drawer.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    } else {
      await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    }
  });

  test("instructor must pass MFA, then lands on /teach", async ({ page }) => {
    await signIn(page, "instructor@example.com");
    await expect(page.getByRole("heading", { name: "Check your authenticator app" })).toBeVisible();
    await page.getByLabel("Verification code").fill("000000");
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(page.getByText("That code is incorrect or has expired")).toBeVisible();
    await expect(page.getByLabel("Verification code")).toHaveValue("000000");

    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(page).toHaveURL(/\/teach$/);
  });

  test("admin signs in with MFA and lands on /admin", async ({ page }) => {
    await signIn(page, "admin@example.com", { mfa: true });
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("wrong password keeps the email and explains the problem", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("learner@example.com");
    await page.getByLabel("Password", { exact: true }).fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "don't match an account" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveValue("learner@example.com");
  });

  test("inline validation marks invalid fields", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  });

  test("signed-out visitors are sent to sign in, then back to where they were going", async ({ page }) => {
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login\?next=%2Flearn/);
    await page.getByLabel("Email address").fill("learner@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Password123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("a learner can't open the admin area", async ({ page }) => {
    await signIn(page, "learner@example.com");
    await expect(page).toHaveURL(/\/learn$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/learn$/);
  });

  test("sign out clears the session", async ({ page }) => {
    await signIn(page, "learner@example.com");
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("login and dashboard pass axe WCAG 2.2 AA", async ({ page }) => {
    await page.goto("/login");
    await expectNoA11yViolations(page);
    await signIn(page, "learner@example.com");
    await expect(page).toHaveURL(/\/learn$/);
    await expectNoA11yViolations(page);
  });
});
